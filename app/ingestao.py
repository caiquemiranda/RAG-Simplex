"""Ingestão: quebra o guia em blocos autocontidos e vetoriza no ChromaDB.

Estratégia de fragmentação (PRD §4.2): **Markdown Header-Based Chunking**
direcionado ao nível 3 (``###``). Cada bloco ``###`` é uma *unidade de falha
autocontida* (nome no display + explicação + causas + solução). Seções de nível
2 (``##``) que tenham conteúdo próprio relevante e nenhum filho ``###`` também
viram blocos, para não perder a orientação operacional.

Cada chunk recebe metadados estáticos para filtragem híbrida (PRD §4.2):
``{ "sistema", "severidade", "idioma_erro", "termo_en", "header", "fonte" }``.

Uso:
    python -m app.ingestao            # (re)indexa o guia padrão
    python -m app.ingestao --reset    # apaga e recria a coleção
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from app.config import settings

# --- Regex de cabeçalhos Markdown ---
_HEADER_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
# Termo em inglês: tudo entre "Falha:" e o primeiro parêntese de tradução.
_TERMO_EN_RE = re.compile(r"Falha:\s*(.+?)\s*\(", re.IGNORECASE)

# Palavras que elevam a severidade do bloco (risco elétrico / sistêmico).
_CRITICO_KW = ("crash", "cpu", "reinicializ", "watchdog")
_ALTO_KW = (
    "terra", "earth", "curto", "short", "fonte", "alimenta", "bateria",
    "battery", "ac fail", "carregador", "fiação", "tensão", "ground",
    "supressão", "evacuação", "evac", "alarme real",
)


@dataclass
class Chunk:
    """Um bloco autocontido pronto para vetorização."""

    id: str
    texto: str
    metadados: dict = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Parsing do Markdown                                                          #
# --------------------------------------------------------------------------- #
def _classificar_sistema(titulo_secao: str) -> str:
    """Mapeia o título da SEÇÃO para o sistema (PRD §4.2)."""
    t = titulo_secao.upper()
    if "F3200" in t:
        return "F3200"
    if "QE90" in t:
        return "QE90"
    if "REDE" in t or "IMS" in t or "TRUESITE" in t:
        return "REDE"
    if "4100" in t or "CRASH" in t:
        return "4100"
    return "GERAL"


def _classificar_severidade(titulo: str, corpo: str) -> str:
    """Heurística de severidade a partir de palavras-chave (enum do PRD)."""
    texto = f"{titulo}\n{corpo}".lower()
    if any(kw in texto for kw in _CRITICO_KW):
        return "Crítica"
    if any(kw in texto for kw in _ALTO_KW):
        return "Alta"
    return "Média"


def _extrair_termo_en(titulo: str) -> str:
    """Extrai o termo exibido no display (inglês) do título do bloco."""
    m = _TERMO_EN_RE.search(titulo)
    return m.group(1).strip() if m else ""


def parse_markdown(caminho: Path) -> list[Chunk]:
    """Lê o guia e devolve a lista de blocos autocontidos com metadados."""
    linhas = caminho.read_text(encoding="utf-8").splitlines()

    # Estado dos cabeçalhos correntes (por nível).
    secao = ""        # nível 1 (# SEÇÃO ...)
    h2 = ""           # nível 2 (## ...)
    h2_tem_filho = False

    # Buffer do segmento atual (cabeçalho mais recente + seu corpo direto).
    seg_nivel = 0
    seg_titulo = ""
    seg_secao = ""
    seg_h2 = ""
    seg_corpo: list[str] = []

    chunks: list[Chunk] = []
    contador = 0

    def emitir():
        """Fecha o segmento atual e o transforma em Chunk, se relevante."""
        nonlocal contador
        corpo = "\n".join(seg_corpo).strip()
        # Nível 1 = divisória de seção; não vira bloco.
        # Nível 2 só vira bloco se for "folha" (sem filhos ###) e tiver corpo.
        if seg_nivel == 3 or (
            seg_nivel == 2 and not h2_tem_filho and len(corpo) > 40
        ):
            contador += 1
            header_path = " > ".join(
                p for p in (seg_secao, seg_h2 if seg_h2 != seg_titulo else "",
                            seg_titulo) if p
            )
            # Prepende o caminho do cabeçalho para preservar coerência semântica
            # quando o bloco é isolado pelo fatiador.
            texto = f"[{header_path}]\n\n{seg_titulo}\n{corpo}".strip()
            chunks.append(
                Chunk(
                    id=f"chunk-{contador:03d}",
                    texto=texto,
                    metadados={
                        "sistema": _classificar_sistema(seg_secao),
                        "severidade": _classificar_severidade(seg_titulo, corpo),
                        "idioma_erro": "EN-US",
                        "termo_en": _extrair_termo_en(seg_titulo),
                        "header": seg_titulo,
                        "header_path": header_path,
                        "fonte": caminho.name,
                    },
                )
            )

    for linha in linhas:
        m = _HEADER_RE.match(linha)
        if not m:
            seg_corpo.append(linha)
            continue

        # Novo cabeçalho encontrado: fecha o segmento anterior.
        nivel = len(m.group(1))
        titulo = m.group(2).strip()

        # Marca se a seção ## corrente passou a ter um filho ### antes de emitir.
        if nivel == 3 and seg_nivel == 2:
            h2_tem_filho = True

        emitir()

        # Atualiza o estado hierárquico.
        if nivel == 1:
            secao = titulo
            h2 = ""
            h2_tem_filho = False
        elif nivel == 2:
            h2 = titulo
            h2_tem_filho = False
        elif nivel == 3:
            h2_tem_filho = True

        # Inicia novo segmento.
        seg_nivel = nivel
        seg_titulo = titulo
        seg_secao = secao
        seg_h2 = h2
        seg_corpo = []

    emitir()  # último segmento
    return chunks


# --------------------------------------------------------------------------- #
# Embeddings                                                                   #
# --------------------------------------------------------------------------- #
@lru_cache(maxsize=1)
def get_embedder():
    """Carrega (uma vez) o modelo local de embeddings multilíngue."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.embedding_model)


def embed_textos(textos: list[str]) -> list[list[float]]:
    """Gera embeddings normalizados (para distância de cosseno)."""
    modelo = get_embedder()
    vetores = modelo.encode(
        textos,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return vetores.tolist()


# --------------------------------------------------------------------------- #
# ChromaDB                                                                     #
# --------------------------------------------------------------------------- #
def get_client():
    """Cliente ChromaDB persistente (import preguiçoso para parsing sem o banco)."""
    import chromadb

    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(settings.chroma_dir))


def get_collection(reset: bool = False):
    """Obtém (ou recria) a coleção configurada para distância de cosseno."""
    client = get_client()
    if reset:
        try:
            client.delete_collection(settings.collection_name)
        except Exception:
            pass
    return client.get_or_create_collection(
        name=settings.collection_name,
        metadata={"hnsw:space": "cosine"},  # PRD §6.1: cosseno
    )


def indexar(caminho: Path | None = None, reset: bool = True) -> int:
    """Pipeline completo: parse → embeddings → upsert no ChromaDB.

    Retorna o número de blocos indexados.
    """
    caminho = caminho or settings.knowledge_base
    if not caminho.exists():
        raise FileNotFoundError(f"Base de conhecimento não encontrada: {caminho}")

    chunks = parse_markdown(caminho)
    if not chunks:
        raise ValueError("Nenhum bloco foi extraído do documento.")

    colecao = get_collection(reset=reset)
    embeddings = embed_textos([c.texto for c in chunks])

    colecao.upsert(
        ids=[c.id for c in chunks],
        documents=[c.texto for c in chunks],
        embeddings=embeddings,
        metadatas=[c.metadados for c in chunks],
    )
    return len(chunks)


def _main() -> None:
    parser = argparse.ArgumentParser(description="Indexa o guia Simplex no ChromaDB.")
    parser.add_argument(
        "--arquivo", type=Path, default=None,
        help="Caminho do .md a indexar (padrão: docs/guia_falhas_simplex_ptbr.md).",
    )
    parser.add_argument(
        "--reset", action="store_true",
        help="Apaga a coleção antes de indexar (recomendado em reindexação).",
    )
    args = parser.parse_args()

    print(f"Indexando: {args.arquivo or settings.knowledge_base}")
    total = indexar(caminho=args.arquivo, reset=args.reset or True)
    print(f"OK — {total} blocos indexados na coleção '{settings.collection_name}'.")


if __name__ == "__main__":
    _main()

"""Recuperação: busca semântica no banco vetorial (ChromaDB).

Implementa a recuperação com **distância de cosseno** e o limiar mínimo de
similaridade de ``0.78`` (PRD §6.1). Quando nenhum bloco atinge o limiar, o
chamador deve acionar o *fallback gracioso* (a flag ``acima_do_limiar`` indica
isso). Suporta filtragem híbrida por metadados (ex.: ``sistema="4100"``).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from app.config import settings
from app.ingestao import embed_consulta, get_collection

# Palavras genéricas ignoradas no casamento léxico (não identificam a falha).
_STOPWORDS = {
    "falha", "de", "da", "do", "no", "na", "em", "para", "com", "que", "uma",
    "um", "os", "as", "the", "of", "and", "ou", "por", "ao",
}


@dataclass
class Resultado:
    """Um bloco recuperado com seu score (vetorial + bônus léxico)."""

    id: str
    texto: str
    metadados: dict
    similaridade: float  # 0..1; score final usado para ranking/limiar.
    sim_vetorial: float | None = None  # cosseno puro (transparência/diagnóstico)
    sim_lexical: float | None = None   # cobertura léxica 0..1


def _normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFD", (texto or "").lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def _tokens(texto: str) -> set[str]:
    return {
        t for t in re.findall(r"[a-z0-9]+", _normalizar(texto))
        if len(t) > 2 and t not in _STOPWORDS
    }


def _score_lexical(consulta: str, meta: dict) -> float:
    """Fração dos termos da consulta cobertos pelo termo do display do bloco."""
    q = _tokens(consulta)
    if not q:
        return 0.0
    alvo = _tokens(f"{meta.get('termo_en', '')} {meta.get('header', '')} "
                   f"{meta.get('sistema', '')}")
    if not alvo:
        return 0.0
    return len(q & alvo) / len(q)


@dataclass
class Recuperacao:
    """Resultado completo de uma consulta ao RAG."""

    consulta: str
    resultados: list[Resultado]
    acima_do_limiar: bool  # True se ao menos 1 bloco passou no threshold

    @property
    def relevantes(self) -> list[Resultado]:
        """Apenas os blocos que atingiram o limiar de similaridade."""
        return [r for r in self.resultados if r.similaridade >= settings.similarity_threshold]


def _filtro_metadados(sistema: str | None, severidade: str | None) -> dict | None:
    """Monta o filtro ``where`` do Chroma a partir dos metadados opcionais."""
    clausulas = []
    if sistema:
        clausulas.append({"sistema": sistema})
    if severidade:
        clausulas.append({"severidade": severidade})
    if not clausulas:
        return None
    return clausulas[0] if len(clausulas) == 1 else {"$and": clausulas}


def buscar(
    consulta: str,
    top_k: int | None = None,
    sistema: str | None = None,
    severidade: str | None = None,
) -> Recuperacao:
    """Recupera os blocos mais semanticamente próximos da consulta.

    Args:
        consulta: termo em PT técnico, linguagem de campo ou código em inglês.
        top_k: número de blocos a retornar (padrão: ``settings.top_k``).
        sistema: filtro opcional de metadados (4100|QE90|F3200|REDE).
        severidade: filtro opcional de metadados (Alta|Média|Crítica).
    """
    consulta = (consulta or "").strip()
    if not consulta:
        return Recuperacao(consulta=consulta, resultados=[], acima_do_limiar=False)

    top_k = top_k or settings.top_k
    colecao = get_collection(reset=False)

    if colecao.count() == 0:
        raise RuntimeError(
            "Coleção vazia. Rode a ingestão primeiro: python -m app.ingestao --reset"
        )

    # Recupera um POOL maior por vetor e reordena com o bônus léxico (D-015).
    pool = max(top_k, settings.rerank_pool)
    consulta_emb = embed_consulta(consulta)
    resposta = colecao.query(
        query_embeddings=[consulta_emb],
        n_results=pool,
        where=_filtro_metadados(sistema, severidade),
        include=["documents", "metadatas", "distances"],
    )

    resultados: list[Resultado] = []
    for _id, doc, meta, dist in zip(
        resposta["ids"][0], resposta["documents"][0],
        resposta["metadatas"][0], resposta["distances"][0],
    ):
        meta = meta or {}
        sim_vec = 1.0 - float(dist)  # Chroma: distância de cosseno = 1 - similaridade
        lex = _score_lexical(consulta, meta)
        # Bônus aditivo: mantém o caso coloquial (lex=0) e promove o termo exato.
        final = min(1.0, sim_vec + settings.lexical_boost * lex)
        resultados.append(Resultado(
            id=_id, texto=doc, metadados=meta, similaridade=final,
            sim_vetorial=sim_vec, sim_lexical=lex,
        ))

    # Reordena pelo score final e mantém os top_k.
    resultados.sort(key=lambda r: r.similaridade, reverse=True)
    resultados = resultados[:top_k]

    acima = any(r.similaridade >= settings.similarity_threshold for r in resultados)
    return Recuperacao(consulta=consulta, resultados=resultados, acima_do_limiar=acima)


# Consultas que DEVEM achar um bloco (código em EN, PT técnico, PT coloquial).
_CONSULTAS_NA_BASE = [
    "HEAD MISSING no loop do 4100",
    "cabeçote ausente",
    "No Answer sem resposta do dispositivo",
    "Short Circuit curto-circuito no loop",
    "como fazer warm start reinício de CPU",
    "Bad Answer endereço duplicado",
]

# Consultas FORA da base (outra marca / fora de domínio) — devem cair em fallback.
_CONSULTAS_FORA_DA_BASE = [
    "como trocar o pneu do carro",
    "receita de bolo de chocolate",
    "previsão do tempo para amanhã",
    "como resetar um painel Notifier",   # outra marca: não pode "casar" com Simplex
    "preço do bitcoin hoje",
]


def _imprimir(rec: Recuperacao) -> None:
    limiar = settings.similarity_threshold
    print(f"  acima do limiar ({limiar}): {rec.acima_do_limiar}")
    for r in rec.resultados:
        marca = "✓" if r.similaridade >= limiar else "·"
        print(f"   {marca} [{r.similaridade:.3f}] {r.metadados.get('header', r.id)}"
              f"  (sistema={r.metadados.get('sistema')})")


def _rodar_grupo(titulo: str, consultas: list[str]) -> list[float]:
    print(f"\n===== {titulo} =====")
    topos = []
    for consulta in consultas:
        rec = buscar(consulta, top_k=3)
        print(f">>> {consulta!r}")
        _imprimir(rec)
        if rec.resultados:
            topos.append(rec.resultados[0].similaridade)
    return topos


def _diagnostico() -> None:
    """Roda positivos e negativos e RECOMENDA um limiar com base nos scores."""
    print(f"Modelo de embeddings: {settings.embedding_model}")
    print(f"Limiar atual: {settings.similarity_threshold}")

    pos = _rodar_grupo("NA BASE (esperado: encontrar)", _CONSULTAS_NA_BASE)
    neg = _rodar_grupo("FORA DA BASE (esperado: fallback)", _CONSULTAS_FORA_DA_BASE)

    print("\n===== RESUMO / RECOMENDAÇÃO =====")
    if pos:
        print(f"Positivos (top-1) — mín: {min(pos):.3f} | média: {sum(pos)/len(pos):.3f}")
    if neg:
        print(f"Negativos (top-1) — máx: {max(neg):.3f} | média: {sum(neg)/len(neg):.3f}")
    if pos and neg:
        min_pos, max_neg = min(pos), max(neg)
        if min_pos > max_neg:
            rec = round((min_pos + max_neg) / 2, 2)
            print(f"\n✅ Há separação (gap = {min_pos - max_neg:.3f}).")
            print(f"   Limiar recomendado: RAG_SIMILARITY_THRESHOLD={rec}")
            print(f"   (acima do maior negativo {max_neg:.3f}, abaixo do menor positivo {min_pos:.3f})")
        else:
            print(f"\n⚠️ Sobreposição: menor positivo ({min_pos:.3f}) ≤ maior negativo "
                  f"({max_neg:.3f}). Um limiar simples não separa — considerar reranker "
                  "(cross-encoder) ou filtro híbrido por termo. Discutir antes de cravar.")


def _main() -> None:
    import sys

    args = sys.argv[1:]
    if args and args[0] == "--diagnostico":
        _diagnostico()
        return
    consulta = " ".join(args) or "painel apitando luz vermelha piscando"
    print(f"Consulta: {consulta!r}")
    _imprimir(buscar(consulta))


if __name__ == "__main__":
    _main()

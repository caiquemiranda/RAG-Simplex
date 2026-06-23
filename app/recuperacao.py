"""Recuperação: busca semântica no banco vetorial (ChromaDB).

Implementa a recuperação com **distância de cosseno** e o limiar mínimo de
similaridade de ``0.78`` (PRD §6.1). Quando nenhum bloco atinge o limiar, o
chamador deve acionar o *fallback gracioso* (a flag ``acima_do_limiar`` indica
isso). Suporta filtragem híbrida por metadados (ex.: ``sistema="4100"``).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.ingestao import embed_consulta, get_collection


@dataclass
class Resultado:
    """Um bloco recuperado com seu score de similaridade."""

    id: str
    texto: str
    metadados: dict
    similaridade: float  # 0..1 (cosseno). Quanto maior, mais relevante.


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

    consulta_emb = embed_consulta(consulta)
    resposta = colecao.query(
        query_embeddings=[consulta_emb],
        n_results=top_k,
        where=_filtro_metadados(sistema, severidade),
        include=["documents", "metadatas", "distances"],
    )

    resultados: list[Resultado] = []
    ids = resposta["ids"][0]
    docs = resposta["documents"][0]
    metas = resposta["metadatas"][0]
    dists = resposta["distances"][0]
    for _id, doc, meta, dist in zip(ids, docs, metas, dists):
        # Chroma devolve distância de cosseno = 1 - similaridade.
        similaridade = 1.0 - float(dist)
        resultados.append(
            Resultado(id=_id, texto=doc, metadados=meta or {}, similaridade=similaridade)
        )

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

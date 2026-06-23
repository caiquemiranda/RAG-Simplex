"""Recuperação: busca semântica no banco vetorial (ChromaDB).

Implementa a recuperação com **distância de cosseno** e o limiar mínimo de
similaridade de ``0.78`` (PRD §6.1). Quando nenhum bloco atinge o limiar, o
chamador deve acionar o *fallback gracioso* (a flag ``acima_do_limiar`` indica
isso). Suporta filtragem híbrida por metadados (ex.: ``sistema="4100"``).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.ingestao import embed_textos, get_collection


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

    consulta_emb = embed_textos([consulta])[0]
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


def _main() -> None:
    import sys

    consulta = " ".join(sys.argv[1:]) or "painel apitando luz vermelha piscando"
    rec = buscar(consulta)
    print(f"Consulta: {consulta!r}")
    print(f"Acima do limiar ({settings.similarity_threshold}): {rec.acima_do_limiar}\n")
    for r in rec.resultados:
        marca = "✓" if r.similaridade >= settings.similarity_threshold else "·"
        print(f" {marca} [{r.similaridade:.3f}] {r.metadados.get('header', r.id)}"
              f"  (sistema={r.metadados.get('sistema')})")


if __name__ == "__main__":
    _main()

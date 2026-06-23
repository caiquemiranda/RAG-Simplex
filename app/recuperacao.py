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


# Bateria de consultas representativas (código em EN, PT técnico, PT coloquial)
# usada para calibrar o limiar de similaridade com o modelo de embeddings atual.
_BATERIA_DIAGNOSTICO = [
    "HEAD MISSING no loop do 4100",
    "HEAD MISSING",
    "cabeçote ausente",
    "No Answer sem resposta do dispositivo",
    "Short Circuit curto-circuito no loop",
    "Earth Fault falha de aterramento",
    "painel apitando luz vermelha piscando",
    "como fazer warm start reinício de CPU",
]


def _imprimir(rec: Recuperacao) -> None:
    limiar = settings.similarity_threshold
    print(f"  acima do limiar ({limiar}): {rec.acima_do_limiar}")
    for r in rec.resultados:
        marca = "✓" if r.similaridade >= limiar else "·"
        print(f"   {marca} [{r.similaridade:.3f}] {r.metadados.get('header', r.id)}"
              f"  (sistema={r.metadados.get('sistema')})")


def _diagnostico() -> None:
    """Roda a bateria e ajuda a escolher o limiar com base nos scores reais."""
    print(f"Modelo de embeddings: {settings.embedding_model}")
    print(f"Limiar atual: {settings.similarity_threshold}\n")
    topos = []
    for consulta in _BATERIA_DIAGNOSTICO:
        rec = buscar(consulta, top_k=3)
        print(f">>> {consulta!r}")
        _imprimir(rec)
        if rec.resultados:
            topos.append(rec.resultados[0].similaridade)
        print()
    if topos:
        print(f"Melhor score por consulta — mín: {min(topos):.3f} | "
              f"média: {sum(topos)/len(topos):.3f} | máx: {max(topos):.3f}")
        print("Dica: defina RAG_SIMILARITY_THRESHOLD um pouco ABAIXO do menor score "
              "de um match correto, mas ACIMA dos falsos positivos.")


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

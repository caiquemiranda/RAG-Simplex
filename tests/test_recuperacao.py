"""Testes da lógica de recuperação que não exigem rede/modelo."""

from __future__ import annotations

from app.recuperacao import Recuperacao, Resultado, _filtro_metadados
from app.config import settings


def test_filtro_metadados():
    assert _filtro_metadados(None, None) is None
    assert _filtro_metadados("4100", None) == {"sistema": "4100"}
    assert _filtro_metadados(None, "Alta") == {"severidade": "Alta"}
    assert _filtro_metadados("QE90", "Crítica") == {
        "$and": [{"sistema": "QE90"}, {"severidade": "Crítica"}]
    }


def _res(sim: float) -> Resultado:
    return Resultado(id="x", texto="t", metadados={}, similaridade=sim)


def test_relevantes_aplica_limiar():
    rec = Recuperacao(
        consulta="q",
        resultados=[_res(0.90), _res(0.80), _res(0.50)],
        acima_do_limiar=True,
    )
    relevantes = rec.relevantes
    assert len(relevantes) == 2
    assert all(r.similaridade >= settings.similarity_threshold for r in relevantes)


def test_acima_do_limiar_falso_quando_todos_abaixo():
    rec = Recuperacao(
        consulta="q",
        resultados=[_res(0.40), _res(0.10)],
        acima_do_limiar=False,
    )
    assert rec.relevantes == []

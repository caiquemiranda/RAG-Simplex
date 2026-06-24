"""Testes da lógica de recuperação que não exigem rede/modelo."""

from __future__ import annotations

from app.recuperacao import (
    Recuperacao,
    Resultado,
    _filtro_metadados,
    _score_lexical,
    _tokens,
)
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


def test_tokens_remove_stopwords_e_acentos():
    # "falha" é stopword; acentos normalizados; tokens de até 2 chars descartados.
    assert _tokens("Falha: Cabeçote Ausente") == {"cabecote", "ausente"}


def test_score_lexical_premia_termo_do_display():
    head = {"termo_en": "Head Missing", "header": "Falha: Head Missing (Cabeçote Ausente)"}
    node = {"termo_en": "", "header": "Node Missing/Failed (Nó Ausente/Falhou)"}
    # Consulta cobre 100% do termo do display do bloco correto…
    assert _score_lexical("falha head missing", head) == 1.0
    # …e só parcialmente o do bloco semanticamente parecido (só "missing").
    assert _score_lexical("falha head missing", node) == 0.5
    # Consulta sem termos do display (coloquial) → 0 (não atrapalha o vetorial).
    assert _score_lexical("painel apitando luz vermelha", head) == 0.0


def test_boost_lexical_reordena_blocos_parecidos():
    """O bônus aditivo promove o bloco com o termo exato sobre o vizinho vetorial."""
    boost = settings.lexical_boost
    head_final = min(1.0, 0.868 + boost * _score_lexical("falha head missing",
                     {"termo_en": "Head Missing", "header": "Falha: Head Missing"}))
    node_final = min(1.0, 0.882 + boost * _score_lexical("falha head missing",
                     {"header": "Node Missing/Failed"}))
    assert head_final > node_final  # Head Missing passa à frente apesar do vetor menor


def test_acima_do_limiar_falso_quando_todos_abaixo():
    rec = Recuperacao(
        consulta="q",
        resultados=[_res(0.40), _res(0.10)],
        acima_do_limiar=False,
    )
    assert rec.relevantes == []

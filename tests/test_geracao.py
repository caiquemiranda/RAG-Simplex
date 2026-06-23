"""Testes da geração que não exigem a API do Claude (caminho de fallback)."""

from __future__ import annotations

from app.geracao import (
    FALLBACK_MSG,
    Resposta,
    _formatar_contexto,
    _fontes,
    gerar_resposta,
)
from app.recuperacao import Recuperacao, Resultado


def test_fallback_sem_chamar_llm():
    """Quando nada atinge o limiar, retorna o fallback sem tocar na API."""
    rec = Recuperacao(consulta="xyz", resultados=[Resultado("a", "t", {}, 0.3)],
                      acima_do_limiar=False)
    resp = gerar_resposta("xyz", recuperacao=rec)
    assert isinstance(resp, Resposta)
    assert resp.fallback is True
    assert resp.fontes == []
    assert resp.texto == FALLBACK_MSG


def test_formatar_contexto_inclui_metadados():
    blocos = [Resultado("c1", "corpo do bloco", {"sistema": "4100", "severidade": "Alta"}, 0.91)]
    ctx = _formatar_contexto(blocos)
    assert "BLOCO 1" in ctx
    assert "sistema=4100" in ctx
    assert "0.910" in ctx
    assert "corpo do bloco" in ctx


def test_fontes_resumo():
    blocos = [
        Resultado("c1", "t", {"header": "Falha: Head Missing", "sistema": "4100",
                              "severidade": "Alta"}, 0.912345)
    ]
    fontes = _fontes(blocos)
    assert fontes[0]["header"] == "Falha: Head Missing"
    assert fontes[0]["similaridade"] == 0.912  # arredondado a 3 casas

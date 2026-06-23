"""Testes do orquestrador de geração (sem a API do Claude)."""

from __future__ import annotations

from app.geracao import (
    FALLBACK_MSG,
    Resposta,
    _formatar_contexto,
    _montar_mensagem,
    gerar_resposta,
)
from app.recuperacao import Recuperacao, Resultado


def test_fallback_sem_chamar_llm():
    """Abaixo do limiar → fallback, sem tocar em nenhuma API (estratégia local)."""
    rec = Recuperacao(consulta="xyz", resultados=[Resultado("a", "t", {}, 0.3)],
                      acima_do_limiar=False)
    resp = gerar_resposta("xyz", recuperacao=rec)
    assert isinstance(resp, Resposta)
    assert resp.fallback is True
    assert resp.fontes == []
    assert resp.texto == FALLBACK_MSG
    assert resp.estrategia == "local_extrativa"


def test_formatar_contexto_inclui_metadados():
    blocos = [Resultado("c1", "corpo do bloco", {"sistema": "4100", "severidade": "Alta"}, 0.91)]
    ctx = _formatar_contexto(blocos)
    assert "BLOCO 1" in ctx
    assert "sistema=4100" in ctx
    assert "0.910" in ctx
    assert "corpo do bloco" in ctx


def test_montar_mensagem_inclui_persona_e_pergunta():
    blocos = [Resultado("c1", "corpo", {}, 0.9)]
    msg = _montar_mensagem("HEAD MISSING", blocos, "operador não-técnico")
    assert "HEAD MISSING" in msg
    assert "operador não-técnico" in msg
    assert "BLOCO 1" in msg

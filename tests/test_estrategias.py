"""Testes da estratégia LOCAL_EXTRATIVO (todos offline, sem rede/modelo)."""

from __future__ import annotations

import pytest

from app.estrategias import (
    AVISO_SEGURANCA,
    FALLBACK_MSG,
    LocalExtrativa,
    _formatar_fontes,
    obter_estrategia,
)
from app.recuperacao import Recuperacao, Resultado

# Bloco realista no formato gerado pela ingestão: "[header_path]\n\n{titulo}\n{corpo}".
_TEXTO_HEAD_MISSING = (
    "[SEÇÃO 1 — PAINÉIS SÉRIE 4100 > 1.6 Falhas de Dispositivos Endereçáveis > "
    "Falha: Head Missing (Cabeçote Ausente)]\n\n"
    "Falha: Head Missing (Cabeçote Ausente)\n"
    "**Explicação simples.** O painel enxerga a base, mas não enxerga o cabeçote.\n\n"
    "**Causas possíveis:**\n- Cabeçote não instalado.\n- Cabeçote defeituoso.\n\n"
    "**Passos de solução (lógica de decisão):**\n"
    "1. Verifique: o LED da base está piscando?\n"
    "   - Se SIM → substitua o cabeçote.\n"
)

_META_HEAD_MISSING = {
    "sistema": "4100", "severidade": "Média", "header": "Falha: Head Missing (Cabeçote Ausente)",
    "fonte": "guia_falhas_simplex_ptbr.md",
}


def _recuperacao(texto: str, meta: dict, sim: float = 0.91) -> Recuperacao:
    res = Resultado(id="c1", texto=texto, metadados=meta, similaridade=sim)
    return Recuperacao(consulta="q", resultados=[res], acima_do_limiar=sim >= 0.78)


def test_extrativo_renderiza_dupla_camada():
    resp = LocalExtrativa().gerar("HEAD MISSING", _recuperacao(_TEXTO_HEAD_MISSING, _META_HEAD_MISSING))
    assert resp.fallback is False
    assert resp.estrategia == "local_extrativa"
    assert resp.custo_estimado == 0.0
    # Dupla camada presente, na ordem correta.
    assert "🟢 Em linguagem simples" in resp.texto
    assert "🔧 Resolução técnica" in resp.texto
    assert resp.texto.index("🟢") < resp.texto.index("🔧")
    # Camada simples traz a explicação; a técnica traz causas/passos.
    assert "não enxerga o cabeçote" in resp.texto
    assert "Passos de solução" in resp.texto
    # Sem aviso de segurança para severidade Média sem termos de risco.
    assert "AVISO DE SEGURANÇA" not in resp.texto


def test_aviso_seguranca_por_severidade():
    meta = {**_META_HEAD_MISSING, "severidade": "Alta"}
    resp = LocalExtrativa().gerar("x", _recuperacao(_TEXTO_HEAD_MISSING, meta))
    assert AVISO_SEGURANCA in resp.texto


def test_aviso_seguranca_por_palavra_chave():
    texto = _TEXTO_HEAD_MISSING + "\nMeça a tensão de aterramento nos terminais."
    resp = LocalExtrativa().gerar("x", _recuperacao(texto, _META_HEAD_MISSING))
    assert "AVISO DE SEGURANÇA" in resp.texto


def test_fallback_quando_abaixo_do_limiar():
    rec = Recuperacao(consulta="q", resultados=[Resultado("c1", "t", {}, 0.40)],
                      acima_do_limiar=False)
    resp = LocalExtrativa().gerar("q", rec)
    assert resp.fallback is True
    assert resp.texto == FALLBACK_MSG
    assert resp.fontes == []


def test_blocos_relacionados_listados():
    principal = Resultado("c1", _TEXTO_HEAD_MISSING, _META_HEAD_MISSING, 0.91)
    outro = Resultado("c2", _TEXTO_HEAD_MISSING,
                      {**_META_HEAD_MISSING, "header": "Falha: No Answer"}, 0.83)
    rec = Recuperacao(consulta="q", resultados=[principal, outro], acima_do_limiar=True)
    resp = LocalExtrativa().gerar("q", rec)
    assert "Blocos relacionados" in resp.texto
    assert "No Answer" in resp.texto


def test_obter_estrategia_padrao_e_invalida():
    assert obter_estrategia().nome == "local_extrativa"
    assert obter_estrategia("local_extrativa").nome == "local_extrativa"
    with pytest.raises(ValueError):
        obter_estrategia("inexistente")


def test_formatar_fontes():
    blocos = [Resultado("c1", "t", _META_HEAD_MISSING, 0.912345)]
    fontes = _formatar_fontes(blocos)
    assert fontes[0]["header"] == "Falha: Head Missing (Cabeçote Ausente)"
    assert fontes[0]["similaridade"] == 0.912
    assert fontes[0]["sistema"] == "4100"

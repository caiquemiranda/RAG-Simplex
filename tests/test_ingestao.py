"""Testes do parsing e dos metadados da ingestão (não exigem rede)."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.config import settings
from app.ingestao import (
    _classificar_severidade,
    _classificar_sistema,
    _extrair_termo_en,
    parse_markdown,
)


def test_classificar_sistema():
    assert _classificar_sistema("SEÇÃO 1 — PAINÉIS SÉRIE 4100 (4100U)") == "4100"
    assert _classificar_sistema("SEÇÃO 2 — CÓDIGOS DE CRASH DA FAMÍLIA 4100") == "4100"
    assert _classificar_sistema("SEÇÃO 3 — FALHAS NA REDE E NO IMS / TrueSite") == "REDE"
    assert _classificar_sistema("SEÇÃO 4 — PAINÉIS F3200") == "F3200"
    assert _classificar_sistema("SEÇÃO 5 — PAINÉIS QE90 (EVAC)") == "QE90"


def test_classificar_severidade():
    assert _classificar_severidade("System Crash 0x10", "watchdog reinicializou") == "Crítica"
    assert _classificar_severidade("Earth Fault", "tensão de terra detectada") == "Alta"
    assert _classificar_severidade("Algum aviso", "rotina normal de operação") == "Média"


def test_extrair_termo_en():
    assert _extrair_termo_en("Falha: Head Missing (Cabeçote Ausente)") == "Head Missing"
    assert _extrair_termo_en("Falha: Wrong Device (Dispositivo Errado)") == "Wrong Device"
    assert _extrair_termo_en("Operação básica do painel") == ""


@pytest.mark.skipif(
    not settings.knowledge_base.exists(), reason="Base de conhecimento ausente"
)
def test_parse_markdown_extrai_blocos():
    chunks = parse_markdown(settings.knowledge_base)
    # O guia tem dezenas de blocos de falha (### ) + seções operacionais (##).
    assert len(chunks) > 40

    # IDs únicos.
    ids = [c.id for c in chunks]
    assert len(ids) == len(set(ids))

    # Todo chunk tem texto e os metadados obrigatórios do PRD §4.2.
    for c in chunks:
        assert c.texto.strip()
        for chave in ("sistema", "severidade", "idioma_erro", "header", "fonte"):
            assert chave in c.metadados
        assert c.metadados["sistema"] in {"4100", "QE90", "F3200", "REDE", "GERAL"}
        assert c.metadados["severidade"] in {"Alta", "Média", "Crítica"}


@pytest.mark.skipif(
    not settings.knowledge_base.exists(), reason="Base de conhecimento ausente"
)
def test_bloco_head_missing_presente():
    chunks = parse_markdown(settings.knowledge_base)
    headers = [c.metadados["header"] for c in chunks]
    assert any("Head Missing" in h for h in headers)

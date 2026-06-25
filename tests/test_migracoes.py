"""Testes das migrações Alembic (D-022).

Garantem que: (1) o grafo de migrações tem **uma única head** (sem branches
acidentais ao adicionar migrações) e (2) aplicar `upgrade head` num banco vazio
produz exatamente as tabelas declaradas nos modelos (baseline sem drift).

Skippado de forma clara se o Alembic não estiver instalado (regra de codificação:
testes não exigem rede; deps locais ausentes → skip explícito).
"""

from __future__ import annotations

import pytest

pytest.importorskip("alembic")

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

from app.config import BASE_DIR, settings
from app.modelos import Base


def _config() -> Config:
    return Config(str(BASE_DIR / "alembic.ini"))


def test_migracao_tem_unica_head():
    heads = ScriptDirectory.from_config(_config()).get_heads()
    assert len(heads) == 1, f"esperava 1 head no grafo de migrações, achei {heads}"


def test_upgrade_cria_schema_igual_aos_modelos(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migra.db').as_posix()}"
    # env.py do Alembic lê settings.database_url — apontamos para um banco temporário.
    monkeypatch.setattr(settings, "database_url", url)

    command.upgrade(_config(), "head")

    tabelas = set(inspect(create_engine(url)).get_table_names()) - {"alembic_version"}
    esperadas = set(Base.metadata.tables.keys())
    assert tabelas == esperadas, f"drift: faltam {esperadas - tabelas}; sobram {tabelas - esperadas}"

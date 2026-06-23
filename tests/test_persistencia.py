"""Testes da camada de persistência (Fase 3) — SQLite em memória, sem rede."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import cripto
from app.config import settings
from app.modelos import Base, ConfigEstrategia, Papel, Usuario
from app.preferencias import resolver_config, resolver_estrategia
from app.seed import PAPEIS, semear_padroes


@pytest.fixture()
def sessao():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


# --------------------------------------------------------------------------- #
# Seed / RBAC                                                                  #
# --------------------------------------------------------------------------- #
def test_semear_padroes(sessao):
    resumo = semear_padroes(sessao)
    sessao.commit()
    assert resumo["papeis"] == 4
    assert resumo["config_global"] == 1

    admin = sessao.query(Papel).filter_by(nome="Admin").one()
    operador = sessao.query(Papel).filter_by(nome="Operador").one()
    # Admin tem todas as permissões; Operador só "consultar".
    assert admin.tem_permissao("gerir_usuarios")
    assert operador.tem_permissao("consultar")
    assert not operador.tem_permissao("gerir_usuarios")
    assert len(operador.permissoes) == len(PAPEIS["Operador"])


def test_semear_padroes_idempotente(sessao):
    semear_padroes(sessao)
    sessao.commit()
    semear_padroes(sessao)  # segunda vez não duplica
    sessao.commit()
    assert len(sessao.query(Papel).all()) == 4
    assert len(sessao.query(ConfigEstrategia).filter_by(escopo="global").all()) == 1


# --------------------------------------------------------------------------- #
# Resolução hierárquica da estratégia                                         #
# --------------------------------------------------------------------------- #
def test_resolucao_precedencia(sessao):
    semear_padroes(sessao)  # global = local_extrativa
    sessao.add(ConfigEstrategia(escopo="papel", alvo="Tecnico", estrategia="claude_nuvem"))
    sessao.add(ConfigEstrategia(escopo="usuario", alvo="7", estrategia="local_extrativa"))
    sessao.commit()

    # Usuário tem config própria → ganha de tudo.
    assert resolver_estrategia(sessao, usuario_id=7, papel_nome="Tecnico") == "local_extrativa"
    # Sem config de usuário, cai no papel.
    assert resolver_estrategia(sessao, usuario_id=99, papel_nome="Tecnico") == "claude_nuvem"
    # Sem usuário nem papel conhecido, cai no global.
    assert resolver_estrategia(sessao, usuario_id=99, papel_nome="Operador") == "local_extrativa"
    # Override (modo avaliação) tem prioridade máxima.
    assert resolver_estrategia(sessao, usuario_id=7, override="claude_nuvem") == "claude_nuvem"


def test_resolucao_sem_config_usa_settings(sessao):
    # Banco vazio (sem global) → cai no padrão do settings.
    assert resolver_config(sessao) is None
    assert resolver_estrategia(sessao) == settings.estrategia_geracao


# --------------------------------------------------------------------------- #
# Cifragem das chaves de provedor                                             #
# --------------------------------------------------------------------------- #
def test_cifrar_decifrar_roundtrip():
    chave_original = settings.secret_key
    settings.secret_key = cripto.gerar_chave_secreta()
    try:
        segredo = "sk-ant-exemplo-1234567890"
        token = cripto.cifrar(segredo)
        assert token != segredo
        assert cripto.decifrar(token) == segredo
    finally:
        settings.secret_key = chave_original


def test_mascarar():
    assert cripto.mascarar("sk-ant-abcd1234") == "…1234"
    assert cripto.mascarar("ab") == "…"
    assert cripto.mascarar("") == ""


def test_cifrar_sem_chave_erro_claro():
    chave_original = settings.secret_key
    settings.secret_key = ""
    try:
        with pytest.raises(RuntimeError, match="RAG_SECRET_KEY"):
            cripto.cifrar("x")
    finally:
        settings.secret_key = chave_original

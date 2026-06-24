"""Testes dos endpoints /documentos (Fase 8 — citações). Sem rede."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.modelos import Base, Papel, Usuario
from app.seed import semear_padroes

GUIA = "guia_falhas_simplex_ptbr.md"


def _criar_usuario(sessao, email, senha, papel_nome):
    papel = sessao.scalar(select(Papel).where(Papel.nome == papel_nome))
    u = Usuario(email=email, nome=papel_nome, ativo=True, hash_senha=auth.hash_senha(senha))
    sessao.add(u)
    u.papel = papel
    sessao.flush()
    return u


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    with TestSession() as s:
        semear_padroes(s)
        _criar_usuario(s, "admin@x.com", "senha", "Admin")
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    settings.jwt_secret = "segredo-de-teste"
    # Evita depender do ChromaDB real: finge que só o guia está indexado.
    monkeypatch.setattr("app.main.documentos_indexados", lambda: [GUIA])
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(client):
    r = client.post("/auth/login", json={"email": "admin@x.com", "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_exige_autenticacao(client):
    assert client.get("/documentos").status_code == 401


def test_lista_documentos_indexados(client):
    r = client.get("/documentos", headers=_auth(client))
    assert r.status_code == 200
    assert r.json() == [GUIA]


def test_obtem_conteudo_do_guia(client):
    r = client.get(f"/documentos/{GUIA}", headers=_auth(client))
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["nome"] == GUIA
    assert "Simplex" in corpo["conteudo"]
    assert len(corpo["conteudo"]) > 1000


def test_rejeita_nome_invalido(client):
    # Não termina em .md → 400 (antes mesmo de checar a base).
    assert client.get("/documentos/evil.txt", headers=_auth(client)).status_code == 400


def test_documento_nao_indexado_404(client):
    assert client.get("/documentos/outro.md", headers=_auth(client)).status_code == 404

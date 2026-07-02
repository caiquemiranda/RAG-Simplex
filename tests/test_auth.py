"""Testes de autenticação (Fase 4) — hash, JWT e fluxo de API. Sem rede."""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.modelos import Base
from app.seed import semear_padroes


@pytest.fixture(autouse=True)
def _jwt_secret():
    original = settings.jwt_secret
    settings.jwt_secret = "segredo-de-teste-123"
    yield
    settings.jwt_secret = original


# --------------------------------------------------------------------------- #
# Senhas (argon2)                                                              #
# --------------------------------------------------------------------------- #
def test_hash_e_verifica_senha():
    h = auth.hash_senha("minhaSenha!")
    assert h != "minhaSenha!"
    assert auth.verificar_senha("minhaSenha!", h) is True
    assert auth.verificar_senha("errada", h) is False
    assert auth.verificar_senha("x", None) is False


# --------------------------------------------------------------------------- #
# Tokens JWT                                                                   #
# --------------------------------------------------------------------------- #
def test_access_token_roundtrip():
    tok = auth.criar_access_token(42, papel="Admin")
    payload = auth.decodificar_token(tok)
    assert payload["sub"] == "42"
    assert payload["tipo"] == "access"
    assert payload["papel"] == "Admin"


def test_token_expirado_rejeitado():
    tok = auth._criar_token(1, "access", timedelta(seconds=-1))
    with pytest.raises(auth.TokenInvalido):
        auth.decodificar_token(tok)


def test_token_malformado_rejeitado():
    with pytest.raises(auth.TokenInvalido):
        auth.decodificar_token("isto.nao.eh.um.jwt")


# --------------------------------------------------------------------------- #
# Fluxo de API                                                                 #
# --------------------------------------------------------------------------- #
@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    with TestSession() as s:
        semear_padroes(s)
        auth.criar_ou_atualizar_admin(s, "admin@x.com", "senha123")
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_login_ok_e_me(client):
    r = client.post("/auth/login", json={"email": "admin@x.com", "senha": "senha123"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    corpo = me.json()
    assert corpo["email"] == "admin@x.com"
    assert corpo["papel"] == "Admin"
    assert "gerir_usuarios" in corpo["permissoes"]


def test_login_senha_errada(client):
    r = client.post("/auth/login", json={"email": "admin@x.com", "senha": "errada"})
    assert r.status_code == 401


def test_rate_limit_login(client):
    """#SEC-LOGIN: após 5 falhas na mesma conta, o login responde 429 (brute-force barrado)."""
    cred = {"email": "bruteforce@x.com", "senha": "errada"}
    for _ in range(5):
        assert client.post("/auth/login", json=cred).status_code == 401
    r = client.post("/auth/login", json=cred)
    assert r.status_code == 429


def test_headers_seguranca(client):
    """#SEC-HEADERS: respostas trazem os cabeçalhos de segurança."""
    r = client.get("/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert "Referrer-Policy" in r.headers


def test_rotas_protegidas_sem_token(client):
    assert client.get("/auth/me").status_code == 401
    # /query é protegida: 401 antes de tocar no RAG.
    assert client.post("/query", json={"pergunta": "x"}).status_code == 401


def test_refresh_emite_novo_access(client):
    r = client.post("/auth/login", json={"email": "admin@x.com", "senha": "senha123"})
    refresh = r.json()["refresh_token"]

    r2 = client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    assert r2.json()["access_token"]

    # Um refresh token não vale como access token.
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert me.status_code == 401

"""Testes do chat interno (#CHAT) — TestClient + SQLite em memória."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.modelos import Base, Papel, Usuario
from app.seed import semear_padroes


def _criar(sessao, email, papel_nome):
    papel = sessao.scalar(select(Papel).where(Papel.nome == papel_nome))
    u = Usuario(email=email, nome=papel_nome, ativo=True, hash_senha=auth.hash_senha("senha"))
    sessao.add(u)
    u.papel = papel
    sessao.flush()
    return u


@pytest.fixture()
def ctx():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    ids = {}
    with TestSession() as s:
        semear_padroes(s)
        ids["ana"] = _criar(s, "ana@x.com", "Admin").id
        ids["bob"] = _criar(s, "bob@x.com", "Tecnico").id
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    settings.jwt_secret = "segredo-de-teste"
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app), ids
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_chat_fluxo_completo(ctx):
    client, ids = ctx
    ana = _login(client, "ana@x.com")
    bob = _login(client, "bob@x.com")

    # Contatos da Ana = só o Bob (ela mesma não aparece).
    contatos = client.get("/conversas", headers=ana).json()
    assert [c["email"] for c in contatos] == ["bob@x.com"] and contatos[0]["nao_lidas"] == 0

    # Ana envia 2 mensagens ao Bob.
    assert client.post(f"/conversas/{ids['bob']}", headers=ana, json={"texto": "Oi Bob"}).status_code == 201
    client.post(f"/conversas/{ids['bob']}", headers=ana, json={"texto": "Tudo bem?"})

    # Bob vê 2 não lidas (contato + total) e recebeu 1 notificação (dedupe: só a 1ª).
    assert next(c for c in client.get("/conversas", headers=bob).json() if c["id"] == ids["ana"])["nao_lidas"] == 2
    assert client.get("/conversas/nao-lidas", headers=bob).json()["total"] == 2
    assert any(n["tipo"] == "chat" for n in client.get("/notificacoes", headers=bob).json())

    # Bob abre a conversa → histórico com as 2 (meu=False p/ ele) e marca lidas.
    hist = client.get(f"/conversas/{ids['ana']}", headers=bob).json()
    assert [m["texto"] for m in hist] == ["Oi Bob", "Tudo bem?"] and all(m["meu"] is False for m in hist)
    assert client.get("/conversas/nao-lidas", headers=bob).json()["total"] == 0

    # Bob responde; Ana passa a ter 1 não lida.
    client.post(f"/conversas/{ids['ana']}", headers=bob, json={"texto": "Tudo!"})
    assert client.get("/conversas/nao-lidas", headers=ana).json()["total"] == 1

    # Consigo mesmo → 400; vazio → 400; usuário inexistente → 404.
    assert client.post(f"/conversas/{ids['ana']}", headers=ana, json={"texto": "eu"}).status_code == 400
    assert client.post(f"/conversas/{ids['bob']}", headers=ana, json={"texto": "  "}).status_code == 400
    assert client.get("/conversas/99999", headers=ana).status_code == 404

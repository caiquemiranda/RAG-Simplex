"""Testes de /query (log_id), /query/stream (NDJSON) e /feedback. Sem rede."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.estrategias import Resposta
from app.modelos import Base, Papel, Usuario
from app.recuperacao import Recuperacao
from app.seed import semear_padroes


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
        _criar_usuario(s, "op@x.com", "senha", "Operador")
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    settings.jwt_secret = "segredo-de-teste"
    fake = Resposta(
        texto="completo", fontes=[{"id": "c1", "header": "Falha X", "sistema": "4100",
                                   "severidade": "Alta", "similaridade": 0.9,
                                   "fonte": "g.md", "trecho": "trecho"}],
        fallback=False, estrategia="local_extrativa",
        camadas={"titulo": "**Falha X**", "simples": "## 🟢 simples", "tecnica": "## 🔧 tecnica"},
    )
    monkeypatch.setattr("app.main.buscar", lambda *a, **k: Recuperacao("q", [], True))
    monkeypatch.setattr("app.main.gerar_resposta", lambda *a, **k: fake)
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_query_retorna_log_id(client):
    r = client.post("/query", json={"pergunta": "x"}, headers=_login(client, "admin@x.com"))
    assert r.status_code == 200
    assert isinstance(r.json()["log_id"], int)


def test_feedback_registra_voto(client):
    admin = _login(client, "admin@x.com")
    log_id = client.post("/query", json={"pergunta": "x"}, headers=admin).json()["log_id"]

    ok = client.post("/feedback", json={"log_id": log_id, "voto": 1}, headers=admin)
    assert ok.status_code == 200 and ok.json()["ok"] is True

    # Voto inválido → 400.
    assert client.post("/feedback", json={"log_id": log_id, "voto": 0}, headers=admin).status_code == 400
    # Log de outro usuário (ou inexistente) → 404.
    assert client.post("/feedback", json={"log_id": 99999, "voto": 1}, headers=admin).status_code == 404


def test_feedback_so_no_proprio_log(client):
    admin = _login(client, "admin@x.com")
    log_id = client.post("/query", json={"pergunta": "x"}, headers=admin).json()["log_id"]
    # Operador tem 'consultar', mas o log é do admin → 404.
    r = client.post("/feedback", json={"log_id": log_id, "voto": -1}, headers=_login(client, "op@x.com"))
    assert r.status_code == 404


def test_stream_ndjson_meta_e_deltas(client):
    # Admin tem 'consultar_stream'.
    r = client.post("/query/stream", json={"pergunta": "x"}, headers=_login(client, "admin@x.com"))
    assert r.status_code == 200
    linhas = [json.loads(l) for l in r.text.splitlines() if l.strip()]
    assert linhas[0]["tipo"] == "meta"
    assert isinstance(linhas[0]["log_id"], int)
    assert linhas[0]["fontes"][0]["header"] == "Falha X"
    texto = "".join(d["texto"] for d in linhas[1:] if d["tipo"] == "delta")
    assert "🟢" in texto and "🔧" in texto


def test_stream_negado_sem_permissao(client):
    # Operador não tem 'consultar_stream'.
    r = client.post("/query/stream", json={"pergunta": "x"}, headers=_login(client, "op@x.com"))
    assert r.status_code == 403

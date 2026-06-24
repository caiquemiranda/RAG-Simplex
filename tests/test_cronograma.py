"""Testes do cronograma (visitas) — TestClient + SQLite em memória, sem rede."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.modelos import Base, Cliente, Papel, Usuario
from app.seed import semear_padroes


def _criar_usuario(sessao, email, papel_nome):
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
        ids["admin"] = _criar_usuario(s, "admin@x.com", "Admin").id
        ids["tec"] = _criar_usuario(s, "tec@x.com", "Tecnico").id
        ids["tec2"] = _criar_usuario(s, "tec2@x.com", "Tecnico").id
        c = Cliente(nome="Shopping X", unidade="SP")
        s.add(c)
        s.flush()
        ids["cliente"] = c.id
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


def test_admin_cria_e_filtra_por_intervalo(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    r = client.post("/cronograma", headers=admin, json={
        "usuario_id": ids["tec"], "cliente_id": ids["cliente"],
        "data": "2026-07-10", "titulo": "Manutenção 4100",
    })
    assert r.status_code == 201
    assert r.json()["tecnico_nome"] == "Tecnico" and r.json()["cliente_nome"] == "Shopping X"

    # Dentro do intervalo aparece; fora, não.
    r = client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=admin)
    assert len(r.json()) == 1
    r = client.get("/cronograma?de=2026-08-01&ate=2026-08-31", headers=admin)
    assert r.json() == []


def test_tecnico_ve_apenas_as_proprias(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    client.post("/cronograma", headers=admin, json={"usuario_id": ids["tec"], "data": "2026-07-10", "titulo": "A"})
    client.post("/cronograma", headers=admin, json={"usuario_id": ids["tec2"], "data": "2026-07-10", "titulo": "B"})

    visiveis = client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=_login(client, "tec@x.com")).json()
    assert [v["titulo"] for v in visiveis] == ["A"]


def test_tecnico_nao_cria(ctx):
    client, ids = ctx
    r = client.post("/cronograma", headers=_login(client, "tec@x.com"),
                    json={"usuario_id": ids["tec"], "data": "2026-07-10", "titulo": "X"})
    assert r.status_code == 403


def test_remover_visita(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    vid = client.post("/cronograma", headers=admin, json={"usuario_id": ids["tec"], "data": "2026-07-10", "titulo": "X"}).json()["id"]
    assert client.delete(f"/cronograma/{vid}", headers=admin).status_code == 204
    assert client.delete(f"/cronograma/{vid}", headers=admin).status_code == 404


def test_feriado_crud(ctx):
    client, _ = ctx
    admin = _login(client, "admin@x.com")
    r = client.post("/cronograma/feriados", headers=admin, json={"data": "2026-07-09", "descricao": "Revolução"})
    assert r.status_code == 201
    fid = r.json()["id"]
    assert client.post("/cronograma/feriados", headers=admin, json={"data": "2026-07-09", "descricao": "x"}).status_code == 409
    vis = client.get("/cronograma/feriados/intervalo?de=2026-07-01&ate=2026-07-31", headers=admin).json()
    assert any(f["id"] == fid for f in vis)
    assert client.delete(f"/cronograma/feriados/{fid}", headers=admin).status_code == 204


def test_notificacao_ao_criar_atividade(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    client.post("/cronograma", headers=admin, json={"usuario_id": ids["tec"], "data": "2026-07-10", "titulo": "Manutenção"})

    # O técnico recebe a notificação; o outro técnico não.
    tec = _login(client, "tec@x.com")
    notifs = client.get("/notificacoes", headers=tec).json()
    assert len(notifs) == 1 and "Manutenção" in notifs[0]["titulo"] and notifs[0]["lida"] is False
    assert client.get("/notificacoes", headers=_login(client, "tec2@x.com")).json() == []

    # Marcar como lida.
    nid = notifs[0]["id"]
    assert client.post(f"/notificacoes/{nid}/lida", headers=tec).json()["lida"] is True
    assert client.get("/notificacoes?apenas_nao_lidas=true", headers=tec).json() == []

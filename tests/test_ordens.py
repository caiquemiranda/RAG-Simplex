"""Testes de Ordem de Serviço (#OS) — CRUD, conclusão atualiza manutenção, histórico."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth, cripto
from app.config import settings
from app.modelos import Base, Cliente, Equipamento, Papel, Usuario
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
        c = Cliente(nome="Aeroporto")
        s.add(c)
        s.flush()
        ids["cliente"] = c.id
        eq = Equipamento(cliente_id=c.id, tag="N2-L23-DF-003", type="Sensor de Fumaça")
        s.add(eq)
        s.flush()
        ids["equip"] = eq.id
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    settings.jwt_secret = "segredo-de-teste"
    settings.secret_key = cripto.gerar_chave_secreta()
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app), ids
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_os_crud_conclusao_atualiza_manutencao(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")

    # Cria O.S. aberta para o equipamento.
    r = client.post("/admin/ordens", headers=admin, json={
        "cliente_id": ids["cliente"], "equipamento_id": ids["equip"], "usuario_id": ids["tec"],
        "data": "2024-10-13", "tipo": "preventiva", "descricao": "Manutenção preventiva"})
    assert r.status_code == 201
    oid = r.json()["id"]
    assert r.json()["equipamento_tag"] == "N2-L23-DF-003" and r.json()["tecnico_nome"] == "Tecnico"

    # Tipo/status inválidos → 400.
    assert client.post("/admin/ordens", headers=admin, json={"cliente_id": ids["cliente"], "data": "2024-10-13", "tipo": "xpto"}).status_code == 400

    # Conclui com data → atualiza ultima_manutencao do equipamento.
    r = client.patch(f"/admin/ordens/{oid}", headers=admin, json={"status": "concluida", "solucao": "ok"})
    assert r.status_code == 200 and r.json()["status"] == "concluida"
    eq = client.get(f"/admin/clientes/{ids['cliente']}/equipamentos", headers=admin).json()[0]
    assert eq["ultima_manutencao"] == "2024-10-13"

    # Histórico do equipamento (visível) lista a O.S.
    hist = client.get(f"/equipamentos/{ids['equip']}/ordens", headers=admin).json()
    assert len(hist) == 1 and hist[0]["id"] == oid

    # Remove.
    assert client.delete(f"/admin/ordens/{oid}", headers=admin).status_code == 204


def test_os_rbac(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    oid = client.post("/admin/ordens", headers=admin, json={
        "cliente_id": ids["cliente"], "equipamento_id": ids["equip"], "data": "2024-10-13", "descricao": "x"}).json()["id"]

    # Técnico não-admin não gerencia O.S. (403 ao listar /admin/ordens).
    tec = _login(client, "tec@x.com")
    assert client.get("/admin/ordens", headers=tec).status_code == 403
    # Técnico sem vínculo ao cliente → 403 no histórico do equipamento.
    assert client.get(f"/equipamentos/{ids['equip']}/ordens", headers=tec).status_code == 403
    # Após vincular, vê o histórico.
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_ids": [ids["cliente"]]})
    assert len(client.get(f"/equipamentos/{ids['equip']}/ordens", headers=_login(client, "tec@x.com")).json()) == 1
    assert oid > 0

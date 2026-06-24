"""Testes da biblioteca de documentos (#DOC1) — upload, ocultar, RBAC. Sem rede."""

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


def _criar_usuario(sessao, email, papel_nome):
    papel = sessao.scalar(select(Papel).where(Papel.nome == papel_nome))
    u = Usuario(email=email, nome=papel_nome, ativo=True, hash_senha=auth.hash_senha("senha"))
    sessao.add(u)
    u.papel = papel
    sessao.flush()
    return u


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "arquivos_dir", tmp_path)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    with TestSession() as s:
        semear_padroes(s)
        _criar_usuario(s, "admin@x.com", "Admin")
        _criar_usuario(s, "op@x.com", "Operador")
        s.commit()

    def _get_session():
        with TestSession() as s:
            yield s

    from app.db import get_session
    from app.main import app

    settings.jwt_secret = "segredo-de-teste"
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _upar(client, headers, categoria, marca="", nome=""):
    return client.post(
        "/biblioteca", headers=headers,
        files={"arquivo": ("manual.pdf", b"%PDF-1.4", "application/pdf")},
        data={"categoria": categoria, "marca": marca, "nome": nome},
    )


def test_upload_listar_renomear_ocultar_excluir(client):
    admin = _login(client, "admin@x.com")
    r = _upar(client, admin, "marca", marca="Simplex", nome="Manual 4100")
    assert r.status_code == 201
    did = r.json()["id"]
    assert r.json()["marca"] == "Simplex" and r.json()["url"].startswith("/arquivos/biblioteca/marca/")

    # Renomear + ocultar.
    assert client.patch(f"/biblioteca/{did}", headers=admin, json={"nome": "Manual 4100 v2"}).json()["nome"] == "Manual 4100 v2"
    client.patch(f"/biblioteca/{did}", headers=admin, json={"oculto": True})

    # Admin vê oculto; operador não.
    assert any(d["id"] == did for d in client.get("/biblioteca?categoria=marca", headers=admin).json())
    assert client.get("/biblioteca", headers=_login(client, "op@x.com")).json() == []

    # Excluir.
    assert client.delete(f"/biblioteca/{did}", headers=admin).status_code == 204


def test_empresa_default_marca_ibsystems(client):
    admin = _login(client, "admin@x.com")
    r = _upar(client, admin, "empresa")
    assert r.status_code == 201 and r.json()["marca"] == "IBSystems"


def test_categoria_invalida_e_op_nao_sobe(client):
    admin = _login(client, "admin@x.com")
    assert _upar(client, admin, "outra").status_code == 400
    assert _upar(client, _login(client, "op@x.com"), "marca").status_code == 403

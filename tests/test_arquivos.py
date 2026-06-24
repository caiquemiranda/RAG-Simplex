"""Testes da infra de arquivos (#FILES) — upload + remoção, sem rede."""

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
    yield TestClient(app), tmp_path
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_upload_salva_e_devolve_url(client):
    c, tmp_path = client
    r = c.post(
        "/upload",
        headers=_login(c, "admin@x.com"),
        files={"arquivo": ("logo cliente.png", b"conteudo", "image/png")},
        data={"subpasta": "clientes"},
    )
    assert r.status_code == 201
    url = r.json()["url"]
    assert url.startswith("/arquivos/clientes/") and url.endswith(".png")
    # O arquivo existe em disco (na pasta temporária do teste).
    assert any((tmp_path / "clientes").iterdir())


def test_upload_exige_admin(client):
    c, _ = client
    r = c.post("/upload", headers=_login(c, "op@x.com"),
               files={"arquivo": ("x.txt", b"x", "text/plain")})
    assert r.status_code == 403


def test_remover_arquivo(client):
    from app.arquivos import remover_arquivo
    c, tmp_path = client
    url = c.post("/upload", headers=_login(c, "admin@x.com"),
                 files={"arquivo": ("x.txt", b"x", "text/plain")}).json()["url"]
    remover_arquivo(url)
    rel = url[len("/arquivos/"):]
    assert not (tmp_path / rel).exists()
    # URL fora da pasta não é removida (segurança).
    remover_arquivo("/arquivos/../segredo")  # não lança

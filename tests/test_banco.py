"""Testes do card ADM "Banco de dados" — status e backup (TestClient + SQLite memória)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth, cripto
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
def ctx():
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
    settings.secret_key = cripto.gerar_chave_secreta()
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_status_banco(ctx):
    client = ctx
    admin = _login(client, "admin@x.com")
    r = client.get("/admin/banco", headers=admin)
    assert r.status_code == 200
    dados = r.json()
    # Tabelas com contagem: usuario deve aparecer (3 semeados/criados) e não 'alembic_version'.
    nomes = {t["nome"]: t["linhas"] for t in dados["tabelas"]}
    assert "usuario" in nomes and nomes["usuario"] >= 2
    assert "alembic_version" not in nomes
    assert "migracao" in dados and "revisao_head" in dados["migracao"]


def test_backup_indisponivel_sem_arquivo(ctx, monkeypatch):
    client = ctx
    # Backend sem arquivo (memória) → backup indisponível (400, mensagem clara).
    monkeypatch.setattr(settings, "database_url", "sqlite://")
    admin = _login(client, "admin@x.com")
    r = client.post("/admin/banco/backup", headers=admin)
    assert r.status_code == 400 and "SQLite em arquivo" in r.json()["detail"]


def test_backup_copia_arquivo(ctx, monkeypatch, tmp_path):
    client = ctx
    db = tmp_path / "ragsimplex.db"
    db.write_bytes(b"conteudo de teste")
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{db.as_posix()}")
    admin = _login(client, "admin@x.com")
    r = client.post("/admin/banco/backup", headers=admin)
    assert r.status_code == 201
    nome = r.json()["arquivo"]
    assert nome.startswith("ragsimplex-") and nome.endswith(".db")
    assert (tmp_path / "backups" / nome).exists()


def test_banco_exige_admin(ctx):
    client = ctx
    op = _login(client, "op@x.com")
    assert client.get("/admin/banco", headers=op).status_code == 403
    assert client.post("/admin/banco/backup", headers=op).status_code == 403

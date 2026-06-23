"""Testes de autorização / RBAC (Fase 5) — sem rede; RAG mockado nos endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.estrategias import Resposta, montar_texto
from app.modelos import Base, Permissao, Papel, Usuario
from app.preferencias import resolver_camadas
from app.recuperacao import Recuperacao
from app.seed import semear_padroes


def _criar_usuario(sessao, email, senha, papel_nome, extra=None):
    papel = sessao.scalar(select(Papel).where(Papel.nome == papel_nome))
    extras = [
        sessao.scalar(select(Permissao).where(Permissao.chave == c)) for c in (extra or [])
    ]
    u = Usuario(email=email, nome=papel_nome, ativo=True, hash_senha=auth.hash_senha(senha))
    sessao.add(u)
    u.papel = papel
    u.permissoes_extra = extras
    sessao.flush()
    return u


# --------------------------------------------------------------------------- #
# Unidades (sem API)                                                           #
# --------------------------------------------------------------------------- #
@pytest.fixture()
def sessao():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        semear_padroes(s)
        s.commit()
        yield s


def test_permissao_efetiva_papel_e_extra(sessao):
    operador = _criar_usuario(sessao, "op@x.com", "s", "Operador")
    assert operador.tem_permissao("consultar") is True
    assert operador.tem_permissao("ingerir") is False
    # Permissão EXTRA concede acesso sem trocar de papel.
    operador2 = _criar_usuario(sessao, "op2@x.com", "s", "Operador", extra=["ingerir"])
    assert operador2.tem_permissao("ingerir") is True
    assert operador2.papel.nome == "Operador"


def test_resolver_camadas_por_papel(sessao):
    assert resolver_camadas(sessao, papel_nome="Operador") == {"simples"}
    assert resolver_camadas(sessao, papel_nome="Tecnico") == {"simples", "tecnica"}
    assert resolver_camadas(sessao, papel_nome="Analista") == {"simples", "tecnica"}


def test_montar_texto_filtra_camadas():
    camadas = {
        "aviso": "> ⚠️ AVISO", "titulo": "**Falha**",
        "simples": "## 🟢 Em linguagem simples\n\nx",
        "tecnica": "## 🔧 Resolução técnica\n\ny",
        "trecho": "## 📄 Sugestão do fabricante\n\nz",
        "relacionados": "## 📎 Blocos relacionados\n\nw",
    }
    so_simples = montar_texto(camadas, {"simples"})
    assert "🟢" in so_simples and "AVISO" in so_simples and "**Falha**" in so_simples
    assert "🔧" not in so_simples and "📄" not in so_simples and "📎" not in so_simples

    completo = montar_texto(camadas, {"simples", "tecnica"})
    assert all(s in completo for s in ("🟢", "🔧", "📄", "📎"))


# --------------------------------------------------------------------------- #
# Endpoints (TestClient + RAG mockado)                                         #
# --------------------------------------------------------------------------- #
@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    with TestSession() as s:
        semear_padroes(s)
        _criar_usuario(s, "op@x.com", "senha", "Operador")
        _criar_usuario(s, "tec@x.com", "senha", "Tecnico")
        _criar_usuario(s, "ana@x.com", "senha", "Analista")
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


def _login(client, email, senha="senha"):
    r = client.post("/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200
    return r.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_operador_bloqueado_em_ingest(client):
    token = _login(client, "op@x.com")
    assert client.post("/ingest", headers=_auth(token)).status_code == 403


def test_analista_pode_ingerir(client, monkeypatch):
    monkeypatch.setattr("app.main.indexar", lambda reset=True: 42)
    token = _login(client, "ana@x.com")
    r = client.post("/ingest", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["blocos_indexados"] == 42


def test_camadas_filtradas_por_papel(client, monkeypatch):
    secoes = {
        "titulo": "**Falha X**",
        "simples": "## 🟢 Em linguagem simples\n\npara operador",
        "tecnica": "## 🔧 Resolução técnica\n\npara técnico",
        "trecho": "## 📄 Sugestão do fabricante\n\noriginal",
    }
    fake = Resposta(texto="completo", fontes=[], fallback=False,
                    estrategia="local_extrativa", camadas=secoes)
    monkeypatch.setattr("app.main.buscar", lambda *a, **k: Recuperacao("q", [], True))
    monkeypatch.setattr("app.main.gerar_resposta", lambda *a, **k: fake)

    # Operador → só a camada simples.
    op = client.post("/query", json={"pergunta": "x"}, headers=_auth(_login(client, "op@x.com")))
    assert op.status_code == 200
    corpo = op.json()
    assert "🟢" in corpo["resposta"]
    assert "🔧" not in corpo["resposta"] and "📄" not in corpo["resposta"]
    assert corpo["camadas_exibidas"] == ["simples"]

    # Técnico → simples + técnica + trecho.
    tec = client.post("/query", json={"pergunta": "x"}, headers=_auth(_login(client, "tec@x.com")))
    c2 = tec.json()
    assert "🔧" in c2["resposta"] and "📄" in c2["resposta"]
    assert set(c2["camadas_exibidas"]) == {"simples", "tecnica"}

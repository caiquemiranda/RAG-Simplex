"""Testes do painel ADM (Fase 6) — TestClient + SQLite em memória, RAG mockado."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth, cripto
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
def ctx():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    ids = {}
    with TestSession() as s:
        semear_padroes(s)
        ids["admin"] = _criar_usuario(s, "admin@x.com", "senha", "Admin").id
        ids["op"] = _criar_usuario(s, "op@x.com", "senha", "Operador").id
        ids["tec"] = _criar_usuario(s, "tec@x.com", "senha", "Tecnico").id
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


def _login(client, email, senha="senha"):
    r = client.post("/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# --------------------------------------------------------------------------- #
def test_nao_admin_barrado(ctx):
    client, _ = ctx
    r = client.get("/admin/usuarios", headers=_login(client, "op@x.com"))
    assert r.status_code == 403


def test_admin_lista_e_cria_usuario(ctx):
    client, _ = ctx
    admin = _login(client, "admin@x.com")

    r = client.get("/admin/usuarios", headers=admin)
    assert r.status_code == 200
    assert len(r.json()) == 3

    novo = client.post("/admin/usuarios", headers=admin, json={
        "email": "novo@x.com", "senha": "senha123", "nome": "Novo", "papel": "Operador"})
    assert novo.status_code == 201
    assert novo.json()["papel"] == "Operador"
    assert len(client.get("/admin/usuarios", headers=admin).json()) == 4


def test_admin_troca_estrategia_vale_na_consulta(ctx, monkeypatch):
    client, ids = ctx
    admin = _login(client, "admin@x.com")

    # Admin define a estratégia do técnico.
    r = client.put(f"/admin/usuarios/{ids['tec']}/estrategia", headers=admin,
                   json={"estrategia": "claude_nuvem"})
    assert r.status_code == 200
    assert r.json()["estrategia"] == "claude_nuvem"

    # Na próxima consulta do técnico, a estratégia resolvida deve ser a nova.
    capturado = {}

    def _fake_gerar(consulta, recuperacao=None, persona=None, estrategia=None):
        capturado["estrategia"] = estrategia
        return Resposta(texto="ok", fontes=[], fallback=False,
                        estrategia=estrategia or "?", camadas={"titulo": "T", "simples": "## 🟢 s"})

    monkeypatch.setattr("app.main.buscar", lambda *a, **k: Recuperacao("q", [], True))
    monkeypatch.setattr("app.main.gerar_resposta", _fake_gerar)

    q = client.post("/query", json={"pergunta": "x"}, headers=_login(client, "tec@x.com"))
    assert q.status_code == 200
    assert capturado["estrategia"] == "claude_nuvem"


def test_estrategia_por_usuario_get_e_put(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")

    # Sem config própria → null.
    r0 = client.get(f"/admin/usuarios/{ids['tec']}/estrategia", headers=admin)
    assert r0.status_code == 200 and r0.json() is None

    # Define estratégia + persona + camadas.
    r1 = client.put(f"/admin/usuarios/{ids['tec']}/estrategia", headers=admin,
                    json={"estrategia": "local_extrativa", "persona": "técnico de campo",
                          "camadas": ["simples", "tecnica"]})
    assert r1.status_code == 200

    # Agora o GET retorna o que foi salvo.
    r2 = client.get(f"/admin/usuarios/{ids['tec']}/estrategia", headers=admin)
    assert r2.json()["estrategia"] == "local_extrativa"
    assert r2.json()["persona"] == "técnico de campo"
    assert r2.json()["camadas"] == "simples,tecnica"


def test_perfil_e_documentos_do_usuario(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    uid = ids["tec"]

    # Atualiza campos de perfil/acesso.
    r = client.patch(f"/admin/usuarios/{uid}", headers=admin,
                     json={"unidade": "Matriz SP", "telefone": "11999",
                           "clientes": "Shopping X", "acesso_expira_em": "2027-01-01"})
    assert r.status_code == 200
    assert r.json()["unidade"] == "Matriz SP"
    assert r.json()["acesso_expira_em"] == "2027-01-01"

    # Adiciona um documento com validade.
    r = client.post(f"/admin/usuarios/{uid}/documentos", headers=admin,
                    json={"nome": "NR-10", "validade": "2030-05-10"})
    assert r.status_code == 201
    docs = r.json()["documentos"]
    assert len(docs) == 1 and docs[0]["nome"] == "NR-10"
    doc_id = docs[0]["id"]

    # GET reflete o documento.
    r = client.get(f"/admin/usuarios/{uid}", headers=admin)
    assert any(d["id"] == doc_id for d in r.json()["documentos"])

    # Remove o documento.
    r = client.delete(f"/admin/usuarios/{uid}/documentos/{doc_id}", headers=admin)
    assert r.status_code == 200 and r.json()["documentos"] == []

    # Documento inexistente → 404.
    assert client.delete(f"/admin/usuarios/{uid}/documentos/9999", headers=admin).status_code == 404


def test_lista_marca_documento_vencendo(ctx):
    from datetime import date, timedelta

    client, ids = ctx
    admin = _login(client, "admin@x.com")
    venc = (date.today() + timedelta(days=10)).isoformat()
    client.post(f"/admin/usuarios/{ids['tec']}/documentos", headers=admin, json={"nome": "NR-10", "validade": venc})
    lst = client.get("/admin/usuarios", headers=admin).json()
    tec = next(u for u in lst if u["id"] == ids["tec"])
    assert tec["docs_alerta"] == 1


def test_clientes_crud_e_associacao(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")

    # Cria cliente.
    r = client.post("/admin/clientes", headers=admin, json={"nome": "Shopping X", "unidade": "SP"})
    assert r.status_code == 201
    cid = r.json()["id"]
    # Nome duplicado → 409.
    assert client.post("/admin/clientes", headers=admin, json={"nome": "Shopping X"}).status_code == 409

    # Lista contém o cliente.
    r = client.get("/admin/clientes", headers=admin)
    assert any(c["id"] == cid for c in r.json())

    # Associa ao técnico via cliente_ids e confere no detalhe do usuário.
    r = client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_ids": [cid]})
    assert r.status_code == 200
    assert [c["id"] for c in r.json()["clientes"]] == [cid]

    # Atualiza e remove o cliente.
    assert client.patch(f"/admin/clientes/{cid}", headers=admin, json={"ativo": False}).json()["ativo"] is False
    assert client.delete(f"/admin/clientes/{cid}", headers=admin).status_code == 204
    assert client.delete(f"/admin/clientes/{cid}", headers=admin).status_code == 404


def test_auditoria_registra_consulta(ctx, monkeypatch):
    client, _ = ctx
    monkeypatch.setattr("app.main.buscar", lambda *a, **k: Recuperacao("q", [], True))
    monkeypatch.setattr("app.main.gerar_resposta", lambda *a, **k: Resposta(
        texto="ok", fontes=[], fallback=False, estrategia="local_extrativa",
        camadas={"titulo": "T", "simples": "## 🟢 s"}))

    client.post("/query", json={"pergunta": "painel apitando"}, headers=_login(client, "tec@x.com"))

    r = client.get("/admin/auditoria", headers=_login(client, "admin@x.com"))
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert r.json()[0]["pergunta"] == "painel apitando"


def test_catalogos_papeis_e_permissoes(ctx):
    client, _ = ctx
    admin = _login(client, "admin@x.com")

    papeis = client.get("/admin/papeis", headers=admin)
    assert papeis.status_code == 200
    nomes = {p["nome"] for p in papeis.json()}
    assert {"Operador", "Tecnico", "Analista", "Admin"} <= nomes
    admin_papel = next(p for p in papeis.json() if p["nome"] == "Admin")
    assert "gerir_usuarios" in admin_papel["permissoes"]

    perms = client.get("/admin/permissoes", headers=admin)
    assert perms.status_code == 200
    chaves = {p["chave"] for p in perms.json()}
    assert "consultar" in chaves and "gerir_chaves" in chaves

    # Não-admin é barrado.
    assert client.get("/admin/papeis", headers=_login(client, "op@x.com")).status_code == 403


def test_provedor_chave_nunca_em_claro(ctx):
    client, _ = ctx
    admin = _login(client, "admin@x.com")
    segredo = "sk-ant-super-secreta-9999"

    r = client.put("/admin/provedores/claude_nuvem", headers=admin,
                   json={"api_key": segredo, "ativo": True})
    assert r.status_code == 200
    assert segredo not in r.text
    assert r.json()["tem_chave"] is True
    assert r.json()["chave_mascarada"].startswith("…")

    lista = client.get("/admin/provedores", headers=admin)
    assert segredo not in lista.text
    assert lista.json()[0]["chave_mascarada"].endswith("9999")

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


def test_email_case_insensitive(ctx):
    """#FIX-EMAIL: e-mail é normalizado (minúsculo) no cadastro e no login."""
    client, _ = ctx
    admin = _login(client, "admin@x.com")

    # Cadastro com maiúsculas/espaço → armazenado em minúsculo.
    r = client.post("/admin/usuarios", headers=admin, json={
        "email": "  Joao.Silva@X.COM ", "senha": "senha123", "nome": "João"})
    assert r.status_code == 201 and r.json()["email"] == "joao.silva@x.com"

    # Duplicado só muda a caixa → 409.
    dup = client.post("/admin/usuarios", headers=admin, json={
        "email": "JOAO.SILVA@x.com", "senha": "outra123", "nome": "Outro"})
    assert dup.status_code == 409

    # Login com caixa diferente funciona.
    ok = client.post("/auth/login", json={"email": "JOAO.silva@X.com", "senha": "senha123"})
    assert ok.status_code == 200 and ok.json().get("access_token")
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

    # Atualiza campos de perfil/acesso. A foto é gravada como URL de arquivo
    # (caminho /arquivos/...), não como data URL pesado no banco.
    r = client.patch(f"/admin/usuarios/{uid}", headers=admin,
                     json={"unidade": "Matriz SP", "telefone": "11999",
                           "clientes": "Shopping X", "acesso_expira_em": "2027-01-01",
                           "foto_url": "/arquivos/usuarios/joao.jpg"})
    assert r.status_code == 200
    assert r.json()["unidade"] == "Matriz SP"
    assert r.json()["acesso_expira_em"] == "2027-01-01"
    assert r.json()["foto_url"] == "/arquivos/usuarios/joao.jpg"

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


def test_me_documentos(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    client.post(f"/admin/usuarios/{ids['tec']}/documentos", headers=admin, json={"nome": "ASO", "validade": "2030-01-01"})
    # O técnico vê os próprios documentos; o admin vê os dele (nenhum).
    docs = client.get("/me/documentos", headers=_login(client, "tec@x.com")).json()
    assert len(docs) == 1 and docs[0]["nome"] == "ASO"
    assert client.get("/me/documentos", headers=admin).json() == []


def test_equipamentos_import_csv(ctx):
    """#EQP-1: importa equipamentos por CSV (vírgula e ponto-e-vírgula), substitui, remove."""
    client, _ = ctx
    admin = _login(client, "admin@x.com")
    cid = client.post("/admin/clientes", headers=admin, json={"nome": "Prédio A"}).json()["id"]

    csv1 = "painel,loop,add,type,model\n4100,1,12,smoke,4098-9714\n4100,1,13,heat,4098-9733\n"
    r = client.post(f"/admin/clientes/{cid}/equipamentos/importar", headers=admin,
                    files={"arquivo": ("eq.csv", csv1.encode(), "text/csv")})
    assert r.status_code == 201 and r.json()["importados"] == 2
    lista = client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()
    assert len(lista) == 2 and lista[0]["model"] == "4098-9714" and lista[0]["add"] == "12"

    # Ponto-e-vírgula + substituir → troca a lista.
    csv2 = "painel;loop;add;type;model\nF3200;2;5;mcp;ABC\n"
    r = client.post(f"/admin/clientes/{cid}/equipamentos/importar?substituir=true", headers=admin,
                    files={"arquivo": ("eq2.csv", csv2.encode(), "text/csv")})
    assert r.status_code == 201 and r.json()["total"] == 1
    lista = client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()
    assert len(lista) == 1 and lista[0]["type"] == "mcp"

    # Remover um equipamento; não-admin barrado.
    assert client.delete(f"/admin/equipamentos/{lista[0]['id']}", headers=admin).status_code == 204
    assert client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json() == []
    assert client.get(f"/admin/clientes/{cid}/equipamentos", headers=_login(client, "op@x.com")).status_code == 403


def test_equipamentos_visiveis_por_papel(ctx):
    """#EQP-2: GET /clientes/{id}/equipamentos — admin vê; técnico só dos seus clientes."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = client.post("/admin/clientes", headers=admin, json={"nome": "Cli E"}).json()["id"]
    client.post(f"/admin/clientes/{cid}/equipamentos/importar", headers=admin,
                files={"arquivo": ("e.csv", b"painel,loop,add,type,model\n4100,1,1,smoke,X\n", "text/csv")})

    assert len(client.get(f"/clientes/{cid}/equipamentos", headers=admin).json()) == 1
    # Técnico sem vínculo → 403.
    assert client.get(f"/clientes/{cid}/equipamentos", headers=_login(client, "tec@x.com")).status_code == 403
    # Vinculado → vê.
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_ids": [cid]})
    assert len(client.get(f"/clientes/{cid}/equipamentos", headers=_login(client, "tec@x.com")).json()) == 1


def test_equipamento_criar_avulso_e_tag_composta(ctx):
    """Item 5: cria equipamento manual; tag vazia compõe de painel+loop+add+type."""
    client, _ = ctx
    admin = _login(client, "admin@x.com")
    cid = client.post("/admin/clientes", headers=admin, json={"nome": "Cli F"}).json()["id"]

    # Tag explícita é mantida.
    r = client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin,
                    json={"tag": "N2-L23-DF-003", "type": "Sensor"})
    assert r.status_code == 201 and r.json()["tag"] == "N2-L23-DF-003"

    # Tag vazia → composta de painel+loop+add+type.
    r = client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin,
                    json={"painel": "N2", "loop": "L23", "add": "DF", "type": "006"})
    assert r.status_code == 201 and r.json()["tag"] == "N2-L23-DF-006"
    assert len(client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()) == 2


def test_cliente_detalhe_e_campos(ctx):
    """#CLI-PG: cadastro completo do cliente (endereço/contatos) + detalhe com equipamentos."""
    client, _ = ctx
    admin = _login(client, "admin@x.com")
    cid = client.post("/admin/clientes", headers=admin, json={
        "nome": "Prédio B", "endereco": "Rua 1, 100", "contato": "João", "telefone": "11 99999", "email": "a@b.com"}).json()["id"]

    det = client.get(f"/admin/clientes/{cid}", headers=admin).json()
    assert det["endereco"] == "Rua 1, 100" and det["contato"] == "João" and det["email"] == "a@b.com"
    assert det["equipamentos"] == []

    r = client.patch(f"/admin/clientes/{cid}", headers=admin, json={"observacoes": "tem 2 painéis"})
    assert r.status_code == 200 and r.json()["observacoes"] == "tem 2 painéis"
    assert client.get("/admin/clientes/99999", headers=admin).status_code == 404


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

    # Cria cliente (com identidade visual #CLIV).
    r = client.post("/admin/clientes", headers=admin, json={"nome": "Shopping X", "unidade": "SP", "cor": "#16C0CC"})
    assert r.status_code == 201
    cid = r.json()["id"]
    assert r.json()["cor"] == "#16C0CC"
    # Atualiza o logo (URL vinda do /upload).
    assert client.patch(f"/admin/clientes/{cid}", headers=admin, json={"logo_url": "/arquivos/clientes/x.png"}).json()["logo_url"] == "/arquivos/clientes/x.png"
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

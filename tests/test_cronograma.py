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
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"],
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
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "A"})
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec2"]], "data": "2026-07-10", "titulo": "B"})

    visiveis = client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=_login(client, "tec@x.com")).json()
    assert [v["titulo"] for v in visiveis] == ["A"]


def test_tecnico_nao_cria(ctx):
    client, ids = ctx
    r = client.post("/cronograma", headers=_login(client, "tec@x.com"),
                    json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "X"})
    assert r.status_code == 403


def test_remover_visita(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    vid = client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "X"}).json()["id"]
    assert client.delete(f"/cronograma/{vid}", headers=admin).status_code == 204
    assert client.delete(f"/cronograma/{vid}", headers=admin).status_code == 404


def test_clientes_visiveis_por_papel(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    # Vincula o cliente "Shopping X" (criado no fixture) ao tec.
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_ids": [ids["cliente"]]})

    # Admin vê todos os clientes ativos; o técnico vê só os seus.
    assert any(c["id"] == ids["cliente"] for c in client.get("/clientes", headers=admin).json())
    vis_tec = client.get("/clientes", headers=_login(client, "tec@x.com")).json()
    assert [c["id"] for c in vis_tec] == [ids["cliente"]]
    # tec2 não tem clientes vinculados.
    assert client.get("/clientes", headers=_login(client, "tec2@x.com")).json() == []


def test_tecnico_fecha_propria_visita(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    vid = client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "X"}).json()["id"]
    tec = _login(client, "tec@x.com")

    # Status "pendente" é válido (novo status).
    assert client.patch(f"/cronograma/{vid}", headers=tec, json={"status": "pendente"}).json()["status"] == "pendente"
    # Técnico fecha a própria visita (status + observações).
    r = client.patch(f"/cronograma/{vid}", headers=tec, json={"status": "concluida", "observacoes": "feito"})
    assert r.status_code == 200 and r.json()["status"] == "concluida"
    # Técnico não pode alterar título.
    assert client.patch(f"/cronograma/{vid}", headers=tec, json={"titulo": "Y"}).status_code == 403
    # Status inválido → 400.
    assert client.patch(f"/cronograma/{vid}", headers=tec, json={"status": "xpto"}).status_code == 400
    # Visita de outro técnico → 403.
    vid2 = client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec2"]], "data": "2026-07-10", "titulo": "Z"}).json()["id"]
    assert client.patch(f"/cronograma/{vid2}", headers=tec, json={"status": "concluida"}).status_code == 403


def test_multiplos_tecnicos_por_atividade(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    r = client.post("/cronograma", headers=admin,
                    json={"usuario_ids": [ids["tec"], ids["tec2"]], "data": "2026-07-10", "titulo": "Dupla"})
    assert r.status_code == 201
    assert {t["id"] for t in r.json()["tecnicos"]} == {ids["tec"], ids["tec2"]}
    vid = r.json()["id"]

    # Ambos veem a atividade e ambos foram notificados.
    assert client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=_login(client, "tec@x.com")).json()
    assert client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=_login(client, "tec2@x.com")).json()
    assert client.get("/notificacoes", headers=_login(client, "tec2@x.com")).json()

    # Qualquer técnico atribuído fecha a atividade.
    assert client.patch(f"/cronograma/{vid}", headers=_login(client, "tec2@x.com"),
                        json={"status": "concluida"}).status_code == 200


def test_cliente_fixo_alocacao(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    # Define o cliente fixo do tec.
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_padrao_id": ids["cliente"]})

    # Sem visita explícita: aparece como fixo no cliente (para o próprio técnico).
    tec = _login(client, "tec@x.com")
    vis = client.get("/cronograma?de=2026-07-10&ate=2026-07-10", headers=tec).json()
    assert len(vis) == 1 and vis[0]["fixo"] is True and vis[0]["cliente_id"] == ids["cliente"]

    # Com visita explícita naquele dia: sobrescreve (sem fixo duplicado).
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "Relocado"})
    vis = client.get("/cronograma?de=2026-07-10&ate=2026-07-10", headers=tec).json()
    assert len(vis) == 1 and vis[0]["fixo"] is False and vis[0]["titulo"] == "Relocado"


def test_filtros_equipe_clientes_e_aloc_dias_uteis(ctx):
    """Filtros multi (Equipe/Clientes) + alocação fixa (#ALOC) só de segunda a sexta."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    c2 = client.post("/admin/clientes", headers=admin, json={"nome": "Hospital Z"}).json()["id"]
    # Sexta 2026-07-10: uma visita em cada cliente (técnicos diferentes).
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": "2026-07-10", "titulo": "A"})
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec2"]], "cliente_id": c2, "data": "2026-07-10", "titulo": "B"})

    base = "/cronograma?de=2026-07-10&ate=2026-07-10"
    # Filtro por Clientes (multi com 1 valor).
    vis = client.get(f"{base}&cliente_ids={ids['cliente']}", headers=admin).json()
    assert {v["titulo"] for v in vis} == {"A"}
    # Filtro por Equipe (tecnico_ids).
    vis = client.get(f"{base}&tecnico_ids={ids['tec2']}", headers=admin).json()
    assert {v["titulo"] for v in vis} == {"B"}
    # Multi: os dois clientes.
    vis = client.get(f"{base}&cliente_ids={ids['cliente']}&cliente_ids={c2}", headers=admin).json()
    assert {v["titulo"] for v in vis} == {"A", "B"}

    # #ALOC só dias úteis: tec fixo no cliente.
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_padrao_id": ids["cliente"]})
    # Sábado 2026-07-11 → nenhum fixo.
    assert client.get("/cronograma?de=2026-07-11&ate=2026-07-11", headers=admin).json() == []
    # Segunda 2026-07-13 (dia útil, sem visita) → aparece o fixo.
    seg = client.get("/cronograma?de=2026-07-13&ate=2026-07-13", headers=admin).json()
    assert any(v["fixo"] for v in seg)


def test_unidade_crud_e_visao_por_unidade(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")

    # Cria a unidade e vincula o cliente existente (Shopping X) a ela.
    r = client.post("/admin/unidades", headers=admin, json={"nome": "Filial SP", "cidade": "São Paulo"})
    assert r.status_code == 201
    uid = r.json()["id"]
    # Nome duplicado → 409.
    assert client.post("/admin/unidades", headers=admin, json={"nome": "Filial SP"}).status_code == 409
    r = client.patch(f"/admin/clientes/{ids['cliente']}", headers=admin, json={"unidade_id": uid})
    assert r.status_code == 200 and r.json()["unidade_nome"] == "Filial SP"

    # Segundo cliente SEM unidade + uma visita nele.
    cid2 = client.post("/admin/clientes", headers=admin, json={"nome": "Hospital Y"}).json()["id"]
    client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": "2026-07-10", "titulo": "Na filial"})
    client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec2"]], "cliente_id": cid2, "data": "2026-07-10", "titulo": "Fora"})

    # Visão por unidade: só a visita do cliente da unidade aparece.
    vis = client.get(f"/cronograma?de=2026-07-10&ate=2026-07-10&unidade_id={uid}", headers=admin).json()
    assert len(vis) == 1 and vis[0]["titulo"] == "Na filial" and vis[0]["unidade_id"] == uid

    # Seletor público lista a unidade ativa.
    unidades = client.get("/unidades", headers=admin).json()
    assert any(u["id"] == uid and u["nome"] == "Filial SP" for u in unidades)

    # Remoção bloqueada enquanto há cliente vinculado (409); liberada após desvincular.
    assert client.delete(f"/admin/unidades/{uid}", headers=admin).status_code == 409
    client.patch(f"/admin/clientes/{ids['cliente']}", headers=admin, json={"unidade_id": None})
    assert client.delete(f"/admin/unidades/{uid}", headers=admin).status_code == 204


def test_atividade_detalhe_e_comentario(ctx):
    """#ATV-1: detalhe e comentário só para técnico atribuído ou admin."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    vid = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": "2026-08-01", "titulo": "Inspeção"}).json()["id"]

    # Atribuído vê o detalhe; não-atribuído (tec2) → 403.
    assert client.get(f"/cronograma/{vid}", headers=_login(client, "tec@x.com")).status_code == 200
    assert client.get(f"/cronograma/{vid}", headers=_login(client, "tec2@x.com")).status_code == 403

    # Comentário do atribuído aparece; vazio → 400; não-atribuído → 403.
    r = client.post(f"/cronograma/{vid}/comentarios", headers=_login(client, "tec@x.com"), json={"texto": "Cheguei ao local"})
    assert r.status_code == 201 and r.json()["comentarios"][0]["texto"] == "Cheguei ao local"
    assert r.json()["comentarios"][0]["autor_nome"] == "Tecnico"
    assert client.post(f"/cronograma/{vid}/comentarios", headers=admin, json={"texto": "  "}).status_code == 400
    assert client.post(f"/cronograma/{vid}/comentarios", headers=_login(client, "tec2@x.com"), json={"texto": "x"}).status_code == 403


def test_atividade_anexo_imagem(ctx, monkeypatch, tmp_path):
    """#ATV-1: anexar imagem na atividade e remover (técnico atribuído)."""
    from app.config import settings
    monkeypatch.setattr(settings, "arquivos_dir", tmp_path)
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    vid = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": "2026-08-02", "titulo": "Foto"}).json()["id"]
    tec = _login(client, "tec@x.com")

    # Não-imagem → 400.
    assert client.post(f"/cronograma/{vid}/anexos", headers=tec,
                       files={"arquivo": ("nota.txt", b"x", "text/plain")}).status_code == 400
    # Imagem → 201 e aparece nos anexos.
    r = client.post(f"/cronograma/{vid}/anexos", headers=tec,
                    files={"arquivo": ("foto.png", b"\x89PNG\r\n", "image/png")})
    assert r.status_code == 201 and len(r.json()["anexos"]) == 1
    anexo = r.json()["anexos"][0]
    assert anexo["url"].startswith("/arquivos/atividades/")

    # Remover anexo.
    r = client.delete(f"/cronograma/{vid}/anexos/{anexo['id']}", headers=tec)
    assert r.status_code == 200 and r.json()["anexos"] == []


def test_lista_atividades(ctx):
    """Tela 'Atividades' (sidebar): admin vê todas; técnico só as suas."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-09-01", "titulo": "X"})
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec2"]], "data": "2026-09-02", "titulo": "Y"})

    assert len(client.get("/cronograma/atividades", headers=admin).json()) >= 2
    tec = client.get("/cronograma/atividades", headers=_login(client, "tec@x.com")).json()
    assert {v["titulo"] for v in tec} == {"X"}


def test_os_unificada_falha_equipamento_manutencao(ctx):
    """#OS (D-025): O.S. = visita com tipo/equipamento/falha; concluir grava manutenção;
    histórico por equipamento; técnicos default = fixos do cliente."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = ids["cliente"]

    # Catálogo de falha + equipamento.
    fid = client.post("/admin/falhas", headers=admin, json={"nome": "Head Missing", "termo_en": "HEAD MISSING"}).json()["id"]
    assert client.post("/admin/falhas", headers=admin, json={"nome": "Head Missing"}).status_code == 409  # duplicado
    eid = client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin, json={"tag": "N1-L03-136"}).json()["id"]

    # Cria a O.S. (corretiva, concluída) com falha/equipamento e campos do documento.
    r = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": cid, "data": "2026-08-01", "titulo": "Checagem no dispositivo",
        "tipo": "corretiva", "equipamento_id": eid, "falha_id": fid, "status": "concluida",
        "requisitante": "Renan", "prioridade": "4", "acao_aplicada": "Reposicionado"})
    assert r.status_code == 201
    j = r.json()
    assert j["tipo"] == "corretiva" and j["equipamento_tag"] == "N1-L03-136" and j["falha_nome"] == "Head Missing"
    assert j["requisitante"] == "Renan" and j["acao_aplicada"] == "Reposicionado"

    # Concluir gravou a última manutenção do equipamento.
    eq = client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()[0]
    assert eq["ultima_manutencao"] == "2026-08-01"

    # Histórico de O.S. do equipamento.
    hist = client.get(f"/cronograma/equipamento/{eid}", headers=admin).json()
    assert len(hist) == 1 and hist[0]["id"] == j["id"]

    # Tipo inválido → 400 (inclui "avulsa", removida no #OS-SEM-AVULSA).
    assert client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-08-02", "titulo": "x", "tipo": "xpto"}).status_code == 400
    assert client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-08-02", "titulo": "x", "tipo": "avulsa"}).status_code == 400

    # #PREV-OS: O.S. preventiva referencia uma lista de equipamentos (para o documento).
    lid = client.post(f"/admin/clientes/{cid}/listas", headers=admin, json={"nome": "Prev", "equipamento_ids": [eid]}).json()["id"]
    r = client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "cliente_id": cid, "data": "2026-08-05", "titulo": "Rota", "tipo": "preventiva", "lista_id": lid})
    assert r.status_code == 201 and r.json()["lista_id"] == lid and r.json()["lista_nome"] == "Prev"
    assert client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-08-06", "titulo": "x", "lista_id": 99999}).status_code == 404

    # Item 5: sem técnicos → usa os fixos do cliente.
    client.patch(f"/admin/usuarios/{ids['tec2']}", headers=admin, json={"cliente_padrao_id": cid})
    r = client.post("/cronograma", headers=admin, json={"cliente_id": cid, "data": "2026-08-03", "titulo": "Preventiva", "tipo": "preventiva"})
    assert r.status_code == 201 and any(t["id"] == ids["tec2"] for t in r.json()["tecnicos"])


def test_os_editar_deletar_falha_e_rbac(ctx):
    """#OS (D-025): editar O.S. (item 4), DELETE de falha, e RBAC do catálogo e do histórico."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    tec = _login(client, "tec@x.com")
    tec2 = _login(client, "tec2@x.com")
    cid = ids["cliente"]

    fid = client.post("/admin/falhas", headers=admin, json={"nome": "No Answer"}).json()["id"]
    eid = client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin, json={"tag": "N2-L01-007"}).json()["id"]

    # T4 — RBAC do catálogo: técnico não cria nem remove falha.
    assert client.post("/admin/falhas", headers=tec, json={"nome": "Dirty"}).status_code == 403
    assert client.delete(f"/admin/falhas/{fid}", headers=tec).status_code == 403

    # Cria O.S. preventiva/agendada sem equipamento/falha.
    osid = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": cid, "data": "2026-09-05",
        "titulo": "Abertura", "tipo": "preventiva"}).json()["id"]

    # T1 — editar a O.S. (item 4): muda tipo, vincula equipamento/falha e preenche campo-doc.
    r = client.patch(f"/cronograma/{osid}", headers=admin, json={
        "tipo": "corretiva", "equipamento_id": eid, "falha_id": fid, "requisitante": "Ana"})
    assert r.status_code == 200
    j = r.json()
    assert j["tipo"] == "corretiva" and j["equipamento_tag"] == "N2-L01-007"
    assert j["falha_nome"] == "No Answer" and j["requisitante"] == "Ana"
    # Concluir via PATCH grava a última manutenção.
    client.patch(f"/cronograma/{osid}", headers=admin, json={"status": "concluida"})
    assert client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()[0]["ultima_manutencao"] == "2026-09-05"
    # Tipo inválido no PATCH → 400.
    assert client.patch(f"/cronograma/{osid}", headers=admin, json={"tipo": "zzz"}).status_code == 400

    # T3 — RBAC do histórico: técnico sem o cliente → 403; com o cliente → 200.
    assert client.get(f"/cronograma/equipamento/{eid}", headers=tec2).status_code == 403
    client.patch(f"/admin/usuarios/{ids['tec']}", headers=admin, json={"cliente_ids": [cid]})
    assert client.get(f"/cronograma/equipamento/{eid}", headers=tec).status_code == 200

    # T2 — DELETE de falha (não referenciada) some do catálogo.
    fid2 = client.post("/admin/falhas", headers=admin, json={"nome": "Warm Start"}).json()["id"]
    assert client.delete(f"/admin/falhas/{fid2}", headers=admin).status_code == 204
    nomes = [f["nome"] for f in client.get("/admin/falhas", headers=admin).json()]
    assert "Warm Start" not in nomes and "No Answer" in nomes


def test_relatorios_resumo(ctx):
    """#R2-CARDS: resumo por cliente = disponibilidade dos equipamentos + contagem de O.S."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = ids["cliente"]
    fid = client.post("/admin/falhas", headers=admin, json={"nome": "Dirty"}).json()["id"]
    e1 = client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin, json={"tag": "A"}).json()["id"]
    client.post(f"/admin/clientes/{cid}/equipamentos", headers=admin, json={"tag": "B"})  # Operando
    client.patch(f"/admin/equipamentos/{e1}", headers=admin, json={"status": "Em falha", "falha_id": fid})
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "cliente_id": cid, "data": "2026-08-01", "titulo": "P", "tipo": "preventiva"})
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "cliente_id": cid, "data": "2026-08-02", "titulo": "C", "tipo": "corretiva", "status": "concluida"})

    r = client.get("/relatorios/resumo", headers=admin)
    assert r.status_code == 200
    res = next(x for x in r.json() if x["cliente_id"] == cid)
    assert res["equip_total"] == 2 and res["equip_operando"] == 1 and res["equip_falha"] == 1
    assert res["os_preventiva"] == 1 and res["os_corretiva"] == 1
    assert res["os_abertas"] == 1 and res["os_concluidas"] == 1

    # Técnico sem clientes vinculados → resumo vazio.
    assert client.get("/relatorios/resumo", headers=_login(client, "tec2@x.com")).json() == []


def test_os_multidata_intervalo(ctx):
    """#OS-MULTIDATA (D-028): O.S. com data_fim aparece nos dias do intervalo; valida fim>=início."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    r = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"],
        "data": "2026-07-28", "data_fim": "2026-08-03", "titulo": "Preventiva longa"})
    assert r.status_code == 201 and r.json()["data_fim"] == "2026-08-03"

    # A O.S. começa em julho e termina em agosto → aparece nas duas janelas mensais (overlap).
    assert any(v["titulo"] == "Preventiva longa" for v in client.get("/cronograma?de=2026-07-01&ate=2026-07-31", headers=admin).json())
    assert any(v["titulo"] == "Preventiva longa" for v in client.get("/cronograma?de=2026-08-01&ate=2026-08-31", headers=admin).json())

    # data_fim antes da inicial → 400 (na criação e no PATCH).
    assert client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "data_fim": "2026-07-05", "titulo": "x"}).status_code == 400
    vid = r.json()["id"]
    assert client.patch(f"/cronograma/{vid}", headers=admin, json={"data_fim": "2026-07-01"}).status_code == 400


def test_preventiva_datas_mensal(ctx):
    """#OS-PREV-DATAS (D-029): a preventiva do mês é única por cliente+mês; marcar mais dias
    adiciona datas à MESMA O.S.; outro mês cria outra."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = ids["cliente"]
    lid = client.post(f"/admin/clientes/{cid}/listas", headers=admin, json={"nome": "Prev"}).json()["id"]

    # 1ª marcação: dias 2 e 3 de agosto.
    r = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": cid, "titulo": "MANUTENÇÃO PREVENTIVA — AGOSTO/2026",
        "tipo": "preventiva", "lista_id": lid, "data": "2026-08-02", "datas": ["2026-08-02", "2026-08-03"]})
    assert r.status_code == 201
    osid = r.json()["id"]
    assert r.json()["datas"] == ["2026-08-02", "2026-08-03"]

    # 2ª marcação no mesmo mês: dias 15, 16, 20 → mesma O.S., datas mescladas.
    r2 = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": cid, "titulo": "x",
        "tipo": "preventiva", "data": "2026-08-15", "datas": ["2026-08-15", "2026-08-16", "2026-08-20", "2026-08-02"]})
    assert r2.json()["id"] == osid   # mesma O.S.
    assert r2.json()["datas"] == ["2026-08-02", "2026-08-03", "2026-08-15", "2026-08-16", "2026-08-20"]
    assert r2.json()["data"] == "2026-08-02" and r2.json()["data_fim"] == "2026-08-20"  # bounding do mês

    # Setembro → O.S. diferente.
    r3 = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": cid, "titulo": "set", "tipo": "preventiva",
        "data": "2026-09-01", "datas": ["2026-09-01"]})
    assert r3.json()["id"] != osid

    # Documento único da preventiva (a partir da O.S.) traz as datas marcadas + cliente + equipamentos.
    doc = client.get(f"/cronograma/{osid}/documento-preventiva", headers=admin)
    assert doc.status_code == 200
    assert doc.json()["datas"] == ["2026-08-02", "2026-08-03", "2026-08-15", "2026-08-16", "2026-08-20"]
    assert doc.json()["cliente"]["nome"] == "Shopping X"
    # Corretiva → 400 no documento de preventiva.
    corr = client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-08-01", "titulo": "c", "tipo": "corretiva"}).json()["id"]
    assert client.get(f"/cronograma/{corr}/documento-preventiva", headers=admin).status_code == 400

    # PATCH substitui o conjunto de datas.
    r4 = client.patch(f"/cronograma/{osid}", headers=admin, json={"datas": ["2026-08-10"]})
    assert r4.json()["datas"] == ["2026-08-10"] and r4.json()["data"] == "2026-08-10"


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


def test_feriado_suprime_atividades_e_notifica(ctx):
    """#FER-1: no feriado o dia fica sem atividades nem alocações fixas; técnicos avisados."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    dia = "2026-07-15"

    # Atividade marcada + um técnico fixo (cliente padrão) no mesmo cliente.
    client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": dia, "titulo": "Manut"})
    client.patch(f"/admin/usuarios/{ids['tec2']}", headers=admin, json={"cliente_padrao_id": ids["cliente"]})

    # Antes do feriado: aparece a atividade real e o fixo virtual.
    antes = client.get(f"/cronograma?de={dia}&ate={dia}", headers=admin).json()
    assert len(antes) >= 2 and any(v["fixo"] for v in antes)

    # Marca feriado nesse dia.
    assert client.post("/cronograma/feriados", headers=admin, json={"data": dia, "descricao": "Festa"}).status_code == 201

    # O dia fica sem atividades nem fixos.
    depois = client.get(f"/cronograma?de={dia}&ate={dia}", headers=admin).json()
    assert depois == []

    # O técnico da atividade foi notificado do feriado (tipo 'feriado' → link p/ o calendário).
    notifs = client.get("/notificacoes", headers=_login(client, "tec@x.com")).json()
    assert any(n["tipo"] == "feriado" and "Feriado" in n["titulo"] for n in notifs)

    # Não se agenda nova atividade num dia de feriado.
    bloq = client.post("/cronograma", headers=admin, json={
        "usuario_ids": [ids["tec"]], "cliente_id": ids["cliente"], "data": dia, "titulo": "Nova"})
    assert bloq.status_code == 400 and "feriado" in bloq.json()["detail"].lower()


def test_notificacao_ao_criar_atividade(ctx):
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    client.post("/cronograma", headers=admin, json={"usuario_ids": [ids["tec"]], "data": "2026-07-10", "titulo": "Manutenção"})

    # O técnico recebe a notificação; o outro técnico não.
    tec = _login(client, "tec@x.com")
    notifs = client.get("/notificacoes", headers=tec).json()
    assert len(notifs) == 1 and "Manutenção" in notifs[0]["titulo"] and notifs[0]["lida"] is False
    assert client.get("/notificacoes", headers=_login(client, "tec2@x.com")).json() == []

    # Marcar como lida.
    nid = notifs[0]["id"]
    assert client.post(f"/notificacoes/{nid}/lida", headers=tec).json()["lida"] is True
    assert client.get("/notificacoes?apenas_nao_lidas=true", headers=tec).json() == []

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

    # O técnico da atividade foi notificado do feriado.
    notifs = client.get("/notificacoes", headers=_login(client, "tec@x.com")).json()
    assert any("Feriado" in n["titulo"] for n in notifs)

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

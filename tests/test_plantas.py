"""Testes do mapa de dispositivos (#MAP): plantas (PDF→PNG), posição e busca."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

pytest.importorskip("pymupdf")
import pymupdf  # noqa: E402

from app import auth, cripto  # noqa: E402
from app.config import settings  # noqa: E402
from app.modelos import Base, Cliente, Papel, Usuario  # noqa: E402
from app.seed import semear_padroes  # noqa: E402


def _criar_usuario(sessao, email, papel_nome):
    papel = sessao.scalar(select(Papel).where(Papel.nome == papel_nome))
    u = Usuario(email=email, nome=papel_nome, ativo=True, hash_senha=auth.hash_senha("senha"))
    sessao.add(u)
    u.papel = papel
    sessao.flush()
    return u


@pytest.fixture()
def ctx(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "arquivos_dir", tmp_path)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    ids = {}
    with TestSession() as s:
        semear_padroes(s)
        _criar_usuario(s, "admin@x.com", "Admin")
        _criar_usuario(s, "op@x.com", "Operador")
        c = Cliente(nome="Aeroporto")
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
    settings.secret_key = cripto.gerar_chave_secreta()
    app.dependency_overrides[get_session] = _get_session
    yield TestClient(app), ids
    app.dependency_overrides.clear()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": "senha"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _pdf_de(n_paginas: int) -> bytes:
    doc = pymupdf.open()
    for _ in range(n_paginas):
        doc.new_page(width=400, height=300)
    return doc.tobytes()


def test_upload_pdf_gera_plantas_e_remove(ctx):
    """#MAP: PDF de 2 páginas → 2 plantas (PNG) com dimensões; depois remove uma."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = ids["cliente"]

    r = client.post(f"/admin/clientes/{cid}/plantas", headers=admin,
                    files={"arquivo": ("predio.pdf", _pdf_de(2), "application/pdf")})
    assert r.status_code == 201
    plantas = r.json()
    assert len(plantas) == 2
    assert plantas[0]["largura"] > 0 and plantas[0]["altura"] > 0
    assert plantas[0]["imagem_url"].startswith("/arquivos/plantas/")
    assert "pág. 1" in plantas[0]["nome"]

    # Lista (admin e visível) retornam as 2.
    assert len(client.get(f"/admin/clientes/{cid}/plantas", headers=admin).json()) == 2
    assert len(client.get(f"/clientes/{cid}/plantas", headers=admin).json()) == 2

    # Remove uma.
    assert client.delete(f"/admin/plantas/{plantas[0]['id']}", headers=admin).status_code == 204
    assert len(client.get(f"/admin/clientes/{cid}/plantas", headers=admin).json()) == 1

    # Não-PDF → 400; não-admin → 403.
    assert client.post(f"/admin/clientes/{cid}/plantas", headers=admin,
                       files={"arquivo": ("x.txt", b"abc", "text/plain")}).status_code == 400
    assert client.post(f"/admin/clientes/{cid}/plantas", headers=_login(client, "op@x.com"),
                       files={"arquivo": ("p.pdf", _pdf_de(1), "application/pdf")}).status_code == 403


def test_equipamento_tag_posicao_e_busca(ctx):
    """#MAP: importa com tag/status/data, posiciona numa planta e busca por tag."""
    client, ids = ctx
    admin = _login(client, "admin@x.com")
    cid = ids["cliente"]

    # CSV com tag, status e última manutenção (BR e ISO).
    csv = "tag,type,status,ultima_manutencao\nN2-L23-DF-003,Sensor de Fumaça,Em operação,13/10/2024\nN2-L23-AM-006,Acionador Manual,Alerta,2024-10-13\n"
    r = client.post(f"/admin/clientes/{cid}/equipamentos/importar", headers=admin,
                    files={"arquivo": ("eq.csv", csv.encode(), "text/csv")})
    assert r.status_code == 201 and r.json()["importados"] == 2
    eqs = client.get(f"/admin/clientes/{cid}/equipamentos", headers=admin).json()
    df = next(e for e in eqs if e["tag"] == "N2-L23-DF-003")
    assert df["status"] == "Em operação" and df["ultima_manutencao"] == "2024-10-13"

    # Cria uma planta e posiciona o equipamento (editor de mapa).
    pl = client.post(f"/admin/clientes/{cid}/plantas", headers=admin,
                     files={"arquivo": ("p.pdf", _pdf_de(1), "application/pdf")}).json()[0]
    r = client.patch(f"/admin/equipamentos/{df['id']}", headers=admin,
                     json={"planta_id": pl["id"], "pos_x": 371, "pos_y": 386, "status": "Em manutenção"})
    assert r.status_code == 200 and r.json()["planta_id"] == pl["id"] and r.json()["pos_x"] == 371
    assert r.json()["status"] == "Em manutenção"

    # Busca visível por tag (Buscar equipamento).
    achados = client.get(f"/clientes/{cid}/equipamentos?busca=DF-003", headers=admin).json()
    assert len(achados) == 1 and achados[0]["tag"] == "N2-L23-DF-003" and achados[0]["pos_x"] == 371

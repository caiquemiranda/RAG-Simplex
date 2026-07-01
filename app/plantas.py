"""Plantas baixas dos clientes (#MAP) — upload de PDF, conversão para PNG e CRUD.

Fluxo: o admin sobe o **PDF** da planta; o servidor converte **cada página** em um PNG
(PyMuPDF, DPI de `settings.planta_dpi`) e cria uma `Planta` por página. As imagens vão
para `/arquivos/plantas/{cliente_id}/` (via #FILES). Equipamentos são posicionados sobre
a planta por `pos_x`/`pos_y` (ver `app/admin.py`/`app/main.py`).
"""

from __future__ import annotations

import pymupdf
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.arquivos import remover_arquivo, salvar_bytes
from app.auth import requer
from app.config import settings
from app.db import get_session
from app.modelos import Cliente, Equipamento, Planta, Usuario

router = APIRouter(prefix="/admin", tags=["admin"])


class PlantaResumo(BaseModel):
    id: int
    nome: str
    imagem_url: str
    largura: int
    altura: int
    ordem: int


def _resumo_planta(p: Planta) -> PlantaResumo:
    return PlantaResumo(id=p.id, nome=p.nome, imagem_url=p.imagem_url,
                        largura=p.largura, altura=p.altura, ordem=p.ordem)


def pdf_para_pngs(pdf_bytes: bytes, dpi: int) -> list[tuple[bytes, int, int]]:
    """Converte cada página do PDF num PNG. Devolve [(png_bytes, largura, altura), …]."""
    paginas: list[tuple[bytes, int, int]] = []
    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            pix = page.get_pixmap(dpi=dpi)
            paginas.append((pix.tobytes("png"), pix.width, pix.height))
    return paginas


@router.get("/clientes/{cliente_id}/plantas", response_model=list[PlantaResumo])
def listar_plantas(cliente_id: int,
                   _: Usuario = Depends(requer("gerir_usuarios")),
                   sessao: Session = Depends(get_session)) -> list[PlantaResumo]:
    plantas = sessao.scalars(
        select(Planta).where(Planta.cliente_id == cliente_id).order_by(Planta.ordem, Planta.id)
    ).all()
    return [_resumo_planta(p) for p in plantas]


@router.post("/clientes/{cliente_id}/plantas", response_model=list[PlantaResumo],
             status_code=status.HTTP_201_CREATED)
async def upload_planta(cliente_id: int,
                        arquivo: UploadFile = File(...),
                        _: Usuario = Depends(requer("gerir_usuarios")),
                        sessao: Session = Depends(get_session)) -> list[PlantaResumo]:
    """Sobe um **PDF** (1+ páginas) → gera uma `Planta` (PNG) por página."""
    cliente = sessao.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    if (arquivo.content_type or "") not in ("application/pdf", "application/octet-stream") \
            and not (arquivo.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Envie um PDF da planta.")

    bruto = await arquivo.read()
    try:
        paginas = pdf_para_pngs(bruto, settings.planta_dpi)
    except Exception as e:  # noqa: BLE001 — PDF inválido/corrompido
        raise HTTPException(status_code=400, detail=f"PDF inválido: {e}") from e
    if not paginas:
        raise HTTPException(status_code=400, detail="PDF sem páginas.")

    base = (arquivo.filename or "planta").rsplit(".", 1)[0]
    inicio = (sessao.scalar(
        select(Planta).where(Planta.cliente_id == cliente_id).order_by(Planta.ordem.desc())
    ) or Planta(ordem=-1)).ordem + 1

    criadas: list[Planta] = []
    for i, (png, larg, alt) in enumerate(paginas):
        url = salvar_bytes(png, f"{base}_p{i + 1}.png", f"plantas/{cliente_id}")
        nome = base if len(paginas) == 1 else f"{base} — pág. {i + 1}"
        p = Planta(cliente_id=cliente_id, nome=nome, imagem_url=url,
                   largura=larg, altura=alt, ordem=inicio + i)
        sessao.add(p)
        criadas.append(p)
    sessao.commit()
    for p in criadas:
        sessao.refresh(p)
    return [_resumo_planta(p) for p in criadas]


@router.delete("/plantas/{planta_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_planta(planta_id: int,
                   _: Usuario = Depends(requer("gerir_usuarios")),
                   sessao: Session = Depends(get_session)):
    p = sessao.get(Planta, planta_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Planta não encontrada.")
    # Desvincula os equipamentos posicionados nela (SQLite não força o ON DELETE).
    for eq in sessao.scalars(select(Equipamento).where(Equipamento.planta_id == planta_id)):
        eq.planta_id = None
        eq.pos_x = None
        eq.pos_y = None
    remover_arquivo(p.imagem_url)
    sessao.delete(p)
    sessao.commit()

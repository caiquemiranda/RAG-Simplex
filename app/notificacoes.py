"""Notificações do usuário (sino + tela). Cada usuário vê apenas as próprias."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.db import get_session
from app.modelos import Notificacao, Usuario

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


class NotificacaoResumo(BaseModel):
    id: int
    tipo: str
    titulo: str
    texto: str | None = None
    ref_id: int | None = None
    lida: bool
    criado_em: datetime


@router.get("", response_model=list[NotificacaoResumo])
def listar(
    apenas_nao_lidas: bool = Query(False),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[NotificacaoResumo]:
    consulta = select(Notificacao).where(Notificacao.usuario_id == usuario.id)
    if apenas_nao_lidas:
        consulta = consulta.where(Notificacao.lida.is_(False))
    rows = sessao.scalars(consulta.order_by(Notificacao.criado_em.desc())).all()
    return [NotificacaoResumo.model_validate(n, from_attributes=True) for n in rows]


@router.post("/{notif_id}/lida", response_model=NotificacaoResumo)
def marcar_lida(notif_id: int,
                usuario: Usuario = Depends(usuario_atual),
                sessao: Session = Depends(get_session)) -> NotificacaoResumo:
    n = sessao.get(Notificacao, notif_id)
    if n is None or n.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    n.lida = True
    sessao.commit()
    sessao.refresh(n)
    return NotificacaoResumo.model_validate(n, from_attributes=True)


@router.post("/lidas")
def marcar_todas_lidas(usuario: Usuario = Depends(usuario_atual),
                       sessao: Session = Depends(get_session)) -> dict:
    sessao.execute(
        update(Notificacao)
        .where(Notificacao.usuario_id == usuario.id, Notificacao.lida.is_(False))
        .values(lida=True)
    )
    sessao.commit()
    return {"ok": True}

"""Chat interno 1-a-1 entre usuários (#CHAT).

A "conversa" entre A e B é o conjunto de `Mensagem` com {remetente, destinatario} = {A, B}.
Sem WebSocket — o frontend faz **polling** (D-028). Enviar cria uma `Notificacao` para o
destinatário **apenas na primeira mensagem não lida** da conversa (evita inundar o sino).
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.db import get_session
from app.modelos import Mensagem, Notificacao, Usuario

router = APIRouter(prefix="/conversas", tags=["conversas"])


class ContatoResumo(BaseModel):
    id: int
    nome: str
    email: str
    foto: str | None = None
    nao_lidas: int = 0


class MensagemResumo(BaseModel):
    id: int
    remetente_id: int
    texto: str
    meu: bool                 # a mensagem é do próprio usuário?
    criado_em: datetime


class MensagemIn(BaseModel):
    texto: str


@router.get("", response_model=list[ContatoResumo])
def contatos(usuario: Usuario = Depends(usuario_atual),
             sessao: Session = Depends(get_session)) -> list[ContatoResumo]:
    """Todos os usuários ativos (menos eu) como contatos, com nº de mensagens não lidas."""
    naolidas = dict(sessao.execute(
        select(Mensagem.remetente_id, func.count())
        .where(Mensagem.destinatario_id == usuario.id, Mensagem.lida.is_(False))
        .group_by(Mensagem.remetente_id)
    ).all())
    outros = sessao.scalars(
        select(Usuario).where(Usuario.ativo.is_(True), Usuario.id != usuario.id).order_by(Usuario.nome)
    ).all()
    contatos = [
        ContatoResumo(id=u.id, nome=u.nome or u.email, email=u.email, foto=u.foto_url,
                      nao_lidas=int(naolidas.get(u.id, 0)))
        for u in outros
    ]
    # Não lidas primeiro; depois por nome.
    contatos.sort(key=lambda c: (-c.nao_lidas, c.nome.lower()))
    return contatos


@router.get("/nao-lidas", response_model=dict)
def total_nao_lidas(usuario: Usuario = Depends(usuario_atual),
                    sessao: Session = Depends(get_session)) -> dict:
    total = sessao.scalar(
        select(func.count()).select_from(Mensagem)
        .where(Mensagem.destinatario_id == usuario.id, Mensagem.lida.is_(False))
    )
    return {"total": int(total or 0)}


def _outro_ou_404(sessao: Session, outro_id: int) -> Usuario:
    u = sessao.get(Usuario, outro_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return u


@router.get("/{outro_id}", response_model=list[MensagemResumo])
def historico(outro_id: int,
              usuario: Usuario = Depends(usuario_atual),
              sessao: Session = Depends(get_session)) -> list[MensagemResumo]:
    """Histórico da conversa com `outro_id`. Ao abrir, marca as recebidas como lidas."""
    _outro_ou_404(sessao, outro_id)
    msgs = sessao.scalars(
        select(Mensagem).where(
            or_(
                (Mensagem.remetente_id == usuario.id) & (Mensagem.destinatario_id == outro_id),
                (Mensagem.remetente_id == outro_id) & (Mensagem.destinatario_id == usuario.id),
            )
        ).order_by(Mensagem.criado_em)
    ).all()
    # Marca como lidas as que EU recebi deste contato.
    for m in msgs:
        if m.destinatario_id == usuario.id and not m.lida:
            m.lida = True
    sessao.commit()
    return [
        MensagemResumo(id=m.id, remetente_id=m.remetente_id, texto=m.texto,
                       meu=(m.remetente_id == usuario.id), criado_em=m.criado_em)
        for m in msgs
    ]


@router.post("/{outro_id}", response_model=MensagemResumo, status_code=status.HTTP_201_CREATED)
def enviar(outro_id: int, dados: MensagemIn,
           usuario: Usuario = Depends(usuario_atual),
           sessao: Session = Depends(get_session)) -> MensagemResumo:
    outro = _outro_ou_404(sessao, outro_id)
    if outro.id == usuario.id:
        raise HTTPException(status_code=400, detail="Não é possível conversar consigo mesmo.")
    texto = dados.texto.strip()
    if not texto:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")
    # #CHAT: só notifica se o destinatário ainda não tinha mensagem não lida minha (dedupe).
    ja_pendente = sessao.scalar(
        select(Mensagem.id).where(
            Mensagem.remetente_id == usuario.id, Mensagem.destinatario_id == outro.id,
            Mensagem.lida.is_(False),
        ).limit(1)
    )
    m = Mensagem(remetente_id=usuario.id, destinatario_id=outro.id, texto=texto)
    sessao.add(m)
    if ja_pendente is None:
        sessao.add(Notificacao(
            usuario_id=outro.id, tipo="chat",
            titulo=f"Nova mensagem de {usuario.nome or usuario.email}",
            texto=texto[:120], ref_id=usuario.id,
        ))
    sessao.commit()
    sessao.refresh(m)
    return MensagemResumo(id=m.id, remetente_id=m.remetente_id, texto=m.texto, meu=True, criado_em=m.criado_em)

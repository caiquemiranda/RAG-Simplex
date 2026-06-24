"""Cronograma dos técnicos — visitas/atividades por dia e cliente/local.

Router montado em `/cronograma`. Visão por papel:
- Técnico vê **as próprias** visitas; admin (`gerir_usuarios`) vê **todas** e pode
  filtrar por técnico. Criação/edição/remoção exigem `gerir_usuarios`.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import requer, usuario_atual
from app.db import get_session
from app.modelos import Cliente, Feriado, Notificacao, Usuario, Visita

router = APIRouter(prefix="/cronograma", tags=["cronograma"])


class FeriadoIn(BaseModel):
    data: date
    descricao: str


class FeriadoResumo(BaseModel):
    id: int
    data: date
    descricao: str


class VisitaIn(BaseModel):
    usuario_id: int
    cliente_id: int | None = None
    data: date
    titulo: str
    status: str = "agendada"
    observacoes: str | None = None


class VisitaAtualizar(BaseModel):
    cliente_id: int | None = None
    data: date | None = None
    titulo: str | None = None
    status: str | None = None
    observacoes: str | None = None


class VisitaResumo(BaseModel):
    id: int
    usuario_id: int
    tecnico_nome: str
    tecnico_foto: str | None = None
    cliente_id: int | None = None
    cliente_nome: str | None = None
    unidade: str | None = None
    data: date
    titulo: str
    status: str
    observacoes: str | None = None


def _resumo(v: Visita) -> VisitaResumo:
    return VisitaResumo(
        id=v.id, usuario_id=v.usuario_id,
        tecnico_nome=v.usuario.nome or v.usuario.email,
        tecnico_foto=v.usuario.foto_url,
        cliente_id=v.cliente_id,
        cliente_nome=v.cliente.nome if v.cliente else None,
        unidade=v.cliente.unidade if v.cliente else None,
        data=v.data, titulo=v.titulo, status=v.status, observacoes=v.observacoes,
    )


@router.get("", response_model=list[VisitaResumo])
def listar(
    de: date = Query(..., description="data inicial (YYYY-MM-DD)"),
    ate: date = Query(..., description="data final (YYYY-MM-DD)"),
    tecnico_id: int | None = Query(None),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[VisitaResumo]:
    consulta = select(Visita).where(Visita.data >= de, Visita.data <= ate)
    # Técnico (sem gestão) só enxerga as próprias visitas.
    if not usuario.tem_permissao("gerir_usuarios"):
        consulta = consulta.where(Visita.usuario_id == usuario.id)
    elif tecnico_id is not None:
        consulta = consulta.where(Visita.usuario_id == tecnico_id)
    return [_resumo(v) for v in sessao.scalars(consulta.order_by(Visita.data))]


def _buscar_cliente(sessao: Session, cliente_id: int | None) -> int | None:
    if cliente_id is not None and sessao.get(Cliente, cliente_id) is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente_id


@router.post("", response_model=VisitaResumo, status_code=status.HTTP_201_CREATED)
def criar(dados: VisitaIn,
          _: Usuario = Depends(requer("gerir_usuarios")),
          sessao: Session = Depends(get_session)) -> VisitaResumo:
    if sessao.get(Usuario, dados.usuario_id) is None:
        raise HTTPException(status_code=404, detail="Técnico não encontrado.")
    _buscar_cliente(sessao, dados.cliente_id)
    v = Visita(
        usuario_id=dados.usuario_id, cliente_id=dados.cliente_id, data=dados.data,
        titulo=dados.titulo.strip(), status=dados.status, observacoes=dados.observacoes,
    )
    sessao.add(v)
    sessao.flush()
    # #CR4: notifica o técnico vinculado à atividade.
    local = f" — {v.cliente.nome}" if v.cliente else ""
    sessao.add(Notificacao(
        usuario_id=v.usuario_id, tipo="cronograma",
        titulo=f"Nova atividade: {v.titulo}",
        texto=f"{v.data.isoformat()}{local}", ref_id=v.id,
    ))
    sessao.commit()
    sessao.refresh(v)
    return _resumo(v)


_STATUS_VALIDOS = {"agendada", "concluida", "cancelada"}


@router.patch("/{visita_id}", response_model=VisitaResumo)
def atualizar(visita_id: int, dados: VisitaAtualizar,
              usuario: Usuario = Depends(usuario_atual),
              sessao: Session = Depends(get_session)) -> VisitaResumo:
    """Atualiza uma visita. Admin (`gerir_usuarios`) edita tudo; o técnico **fecha a
    própria** visita (apenas `status` + `observacoes`)."""
    v = sessao.get(Visita, visita_id)
    if v is None:
        raise HTTPException(status_code=404, detail="Visita não encontrada.")
    admin = usuario.tem_permissao("gerir_usuarios")
    if not admin:
        if v.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="Sem acesso a esta visita.")
        if dados.cliente_id is not None or dados.data is not None or dados.titulo is not None:
            raise HTTPException(status_code=403, detail="Técnico só altera status e observações.")
    if dados.status is not None and dados.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="status inválido.")

    if admin and dados.cliente_id is not None:
        _buscar_cliente(sessao, dados.cliente_id)
        v.cliente_id = dados.cliente_id
    if admin and dados.data is not None:
        v.data = dados.data
    if admin and dados.titulo is not None:
        v.titulo = dados.titulo.strip()
    if dados.status is not None:
        v.status = dados.status
    if dados.observacoes is not None:
        v.observacoes = dados.observacoes or None
    sessao.commit()
    sessao.refresh(v)
    return _resumo(v)


@router.delete("/{visita_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(visita_id: int,
            _: Usuario = Depends(requer("gerir_usuarios")),
            sessao: Session = Depends(get_session)):
    v = sessao.get(Visita, visita_id)
    if v is None:
        raise HTTPException(status_code=404, detail="Visita não encontrada.")
    sessao.delete(v)
    sessao.commit()


# --------------------------------------------------------------------------- #
# Feriados (globais) — #CR3                                                    #
# --------------------------------------------------------------------------- #
@router.get("/feriados/intervalo", response_model=list[FeriadoResumo])
def listar_feriados(
    de: date = Query(...), ate: date = Query(...),
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[FeriadoResumo]:
    rows = sessao.scalars(
        select(Feriado).where(Feriado.data >= de, Feriado.data <= ate).order_by(Feriado.data)
    )
    return [FeriadoResumo(id=f.id, data=f.data, descricao=f.descricao) for f in rows]


@router.post("/feriados", response_model=FeriadoResumo, status_code=status.HTTP_201_CREATED)
def criar_feriado(dados: FeriadoIn,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> FeriadoResumo:
    if sessao.scalar(select(Feriado).where(Feriado.data == dados.data)):
        raise HTTPException(status_code=409, detail="Já existe um feriado nessa data.")
    f = Feriado(data=dados.data, descricao=dados.descricao.strip() or "Feriado")
    sessao.add(f)
    sessao.commit()
    sessao.refresh(f)
    return FeriadoResumo(id=f.id, data=f.data, descricao=f.descricao)


@router.delete("/feriados/{feriado_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_feriado(feriado_id: int,
                    _: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)):
    f = sessao.get(Feriado, feriado_id)
    if f is None:
        raise HTTPException(status_code=404, detail="Feriado não encontrado.")
    sessao.delete(f)
    sessao.commit()

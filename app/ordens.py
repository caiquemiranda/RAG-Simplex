"""Ordens de Serviço (O.S., #OS) — registro de manutenção, separado do cronograma.

Uma O.S. pertence a um **cliente** e pode referenciar um **equipamento** (alimenta o
histórico de manutenção do dispositivo, #MAP-4). **Concluir** uma O.S. com data grava
`equipamento.ultima_manutencao`. Gestão por `gerir_usuarios`; o histórico por equipamento
é **visível** ao técnico dos seus clientes.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import requer, usuario_atual
from app.db import get_session
from app.modelos import Cliente, Equipamento, OrdemServico, Usuario

router = APIRouter(tags=["ordens"])

_TIPOS = {"corretiva", "preventiva", "planejada"}
_STATUS = {"aberta", "em_andamento", "concluida", "cancelada"}


class OrdemIn(BaseModel):
    cliente_id: int
    equipamento_id: int | None = None
    usuario_id: int | None = None
    data: date
    tipo: str = "corretiva"
    status: str = "aberta"
    descricao: str = ""
    solucao: str | None = None


class OrdemAtualizar(BaseModel):
    equipamento_id: int | None = None
    usuario_id: int | None = None
    data: date | None = None
    tipo: str | None = None
    status: str | None = None
    descricao: str | None = None
    solucao: str | None = None


class OrdemResumo(BaseModel):
    id: int
    cliente_id: int
    cliente_nome: str | None = None
    equipamento_id: int | None = None
    equipamento_tag: str | None = None
    usuario_id: int | None = None
    tecnico_nome: str | None = None
    data: date
    tipo: str
    status: str
    descricao: str
    solucao: str | None = None


def _resumo(o: OrdemServico) -> OrdemResumo:
    return OrdemResumo(
        id=o.id, cliente_id=o.cliente_id, cliente_nome=o.cliente.nome if o.cliente else None,
        equipamento_id=o.equipamento_id,
        equipamento_tag=(o.equipamento.tag or o.equipamento.add) if o.equipamento else None,
        usuario_id=o.usuario_id, tecnico_nome=(o.usuario.nome or o.usuario.email) if o.usuario else None,
        data=o.data, tipo=o.tipo, status=o.status, descricao=o.descricao, solucao=o.solucao,
    )


def _validar(tipo: str | None, status_: str | None) -> None:
    if tipo is not None and tipo not in _TIPOS:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {tipo}.")
    if status_ is not None and status_ not in _STATUS:
        raise HTTPException(status_code=400, detail=f"Status inválido: {status_}.")


def _aplicar_manutencao(sessao: Session, o: OrdemServico) -> None:
    """O.S. concluída com data → grava `ultima_manutencao` no equipamento (#MAP-4)."""
    if o.status == "concluida" and o.equipamento_id is not None:
        eq = sessao.get(Equipamento, o.equipamento_id)
        if eq is not None:
            eq.ultima_manutencao = o.data


@router.get("/admin/ordens", response_model=list[OrdemResumo])
def listar_ordens(cliente_id: int | None = Query(None),
                  equipamento_id: int | None = Query(None),
                  status_: str | None = Query(None, alias="status"),
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> list[OrdemResumo]:
    consulta = select(OrdemServico).order_by(OrdemServico.data.desc(), OrdemServico.id.desc())
    if cliente_id is not None:
        consulta = consulta.where(OrdemServico.cliente_id == cliente_id)
    if equipamento_id is not None:
        consulta = consulta.where(OrdemServico.equipamento_id == equipamento_id)
    if status_ is not None:
        consulta = consulta.where(OrdemServico.status == status_)
    return [_resumo(o) for o in sessao.scalars(consulta)]


@router.post("/admin/ordens", response_model=OrdemResumo, status_code=status.HTTP_201_CREATED)
def criar_ordem(dados: OrdemIn,
                _: Usuario = Depends(requer("gerir_usuarios")),
                sessao: Session = Depends(get_session)) -> OrdemResumo:
    if sessao.get(Cliente, dados.cliente_id) is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    _validar(dados.tipo, dados.status)
    if dados.equipamento_id is not None and sessao.get(Equipamento, dados.equipamento_id) is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    o = OrdemServico(
        cliente_id=dados.cliente_id, equipamento_id=dados.equipamento_id, usuario_id=dados.usuario_id,
        data=dados.data, tipo=dados.tipo, status=dados.status,
        descricao=dados.descricao.strip(), solucao=(dados.solucao or None),
    )
    sessao.add(o)
    sessao.flush()
    _aplicar_manutencao(sessao, o)
    sessao.commit()
    sessao.refresh(o)
    return _resumo(o)


@router.patch("/admin/ordens/{ordem_id}", response_model=OrdemResumo)
def atualizar_ordem(ordem_id: int, dados: OrdemAtualizar,
                    _: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)) -> OrdemResumo:
    o = sessao.get(OrdemServico, ordem_id)
    if o is None:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    _validar(dados.tipo, dados.status)
    if "equipamento_id" in dados.model_fields_set:
        if dados.equipamento_id is not None and sessao.get(Equipamento, dados.equipamento_id) is None:
            raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
        o.equipamento_id = dados.equipamento_id
    for campo in ("usuario_id", "data", "tipo", "status", "descricao", "solucao"):
        if campo in dados.model_fields_set:
            setattr(o, campo, getattr(dados, campo))
    sessao.flush()
    _aplicar_manutencao(sessao, o)
    sessao.commit()
    sessao.refresh(o)
    return _resumo(o)


@router.delete("/admin/ordens/{ordem_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_ordem(ordem_id: int,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)):
    o = sessao.get(OrdemServico, ordem_id)
    if o is None:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    sessao.delete(o)
    sessao.commit()


@router.get("/equipamentos/{equipamento_id}/ordens", response_model=list[OrdemResumo])
def ordens_do_equipamento(equipamento_id: int,
                          usuario: Usuario = Depends(usuario_atual),
                          sessao: Session = Depends(get_session)) -> list[OrdemResumo]:
    """Histórico de manutenção (O.S.) de um equipamento (#MAP-4). RBAC pelo cliente do equipamento."""
    eq = sessao.get(Equipamento, equipamento_id)
    if eq is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    if not usuario.tem_permissao("gerir_usuarios") and eq.cliente not in usuario.clientes_rel:
        raise HTTPException(status_code=403, detail="Sem acesso a este equipamento.")
    ordens = sessao.scalars(
        select(OrdemServico).where(OrdemServico.equipamento_id == equipamento_id)
        .order_by(OrdemServico.data.desc(), OrdemServico.id.desc())
    ).all()
    return [_resumo(o) for o in ordens]

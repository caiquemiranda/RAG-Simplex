"""Cronograma dos técnicos — visitas/atividades por dia e cliente/local.

Router montado em `/cronograma`. Visão por papel:
- Técnico vê **as próprias** visitas; admin (`gerir_usuarios`) vê **todas** e pode
  filtrar por técnico. Criação/edição/remoção exigem `gerir_usuarios`.
"""

from __future__ import annotations

from datetime import date, timedelta

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
    usuario_ids: list[int]            # técnicos atribuídos (1+); o 1º é o responsável
    cliente_id: int | None = None
    data: date
    titulo: str
    status: str = "agendada"
    observacoes: str | None = None


class VisitaAtualizar(BaseModel):
    usuario_ids: list[int] | None = None
    cliente_id: int | None = None
    data: date | None = None
    titulo: str | None = None
    status: str | None = None
    observacoes: str | None = None


class TecnicoMini(BaseModel):
    id: int
    nome: str
    foto: str | None = None


class VisitaResumo(BaseModel):
    id: int
    usuario_id: int                   # responsável (1º técnico) — compat
    tecnico_nome: str                 # responsável — compat (dashboard)
    tecnico_foto: str | None = None
    tecnicos: list[TecnicoMini] = []  # todos os atribuídos (#CR8)
    cliente_id: int | None = None
    cliente_nome: str | None = None
    cliente_cor: str | None = None
    cliente_logo: str | None = None
    unidade: str | None = None        # nome da unidade (entidade) ou texto legado
    unidade_id: int | None = None     # base do cliente (D-021) — para a visão por unidade
    data: date
    titulo: str
    status: str
    observacoes: str | None = None
    fixo: bool = False                # alocação fixa virtual (#ALOC), não é uma visita real


def _nome_unidade(cli: Cliente | None) -> str | None:
    """Nome da unidade do cliente: prioriza a entidade (D-021), cai para o texto legado."""
    if cli is None:
        return None
    return cli.unidade_rel.nome if cli.unidade_rel else cli.unidade


def _resumo(v: Visita) -> VisitaResumo:
    return VisitaResumo(
        id=v.id, usuario_id=v.usuario_id,
        tecnico_nome=v.usuario.nome or v.usuario.email,
        tecnico_foto=v.usuario.foto_url,
        tecnicos=[TecnicoMini(id=t.id, nome=t.nome or t.email, foto=t.foto_url) for t in v.tecnicos],
        cliente_id=v.cliente_id,
        cliente_nome=v.cliente.nome if v.cliente else None,
        cliente_cor=v.cliente.cor if v.cliente else None,
        cliente_logo=v.cliente.logo_url if v.cliente else None,
        unidade=_nome_unidade(v.cliente),
        unidade_id=v.cliente.unidade_id if v.cliente else None,
        data=v.data, titulo=v.titulo, status=v.status, observacoes=v.observacoes,
    )


def _carregar_tecnicos(sessao: Session, ids: list[int]) -> list[Usuario]:
    vistos: dict[int, Usuario] = {}
    for uid in ids:
        if uid in vistos:
            continue
        u = sessao.get(Usuario, uid)
        if u is None:
            raise HTTPException(status_code=404, detail=f"Técnico {uid} não encontrado.")
        vistos[uid] = u
    return list(vistos.values())


@router.get("", response_model=list[VisitaResumo])
def listar(
    de: date = Query(..., description="data inicial (YYYY-MM-DD)"),
    ate: date = Query(..., description="data final (YYYY-MM-DD)"),
    tecnico_id: int | None = Query(None),
    unidade_id: int | None = Query(None, description="filtra pela unidade do cliente (D-021)"),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[VisitaResumo]:
    admin = usuario.tem_permissao("gerir_usuarios")
    consulta = select(Visita).where(Visita.data >= de, Visita.data <= ate)
    # Técnico (sem gestão) só vê visitas em que está atribuído.
    if not admin:
        consulta = consulta.where(Visita.tecnicos.any(id=usuario.id))
    elif tecnico_id is not None:
        consulta = consulta.where(Visita.tecnicos.any(id=tecnico_id))
    # Visão por unidade: só visitas cujo cliente pertence à unidade (D-021).
    if unidade_id is not None:
        consulta = consulta.where(Visita.cliente.has(Cliente.unidade_id == unidade_id))
    reais = list(sessao.scalars(consulta.order_by(Visita.data)))

    # #ALOC: técnicos com cliente fixo aparecem no cliente nos dias SEM visita explícita.
    if admin:
        q_fix = select(Usuario).where(Usuario.cliente_padrao_id.is_not(None))
        if tecnico_id is not None:
            q_fix = q_fix.where(Usuario.id == tecnico_id)
        fixos = list(sessao.scalars(q_fix))
    else:
        fixos = [usuario] if usuario.cliente_padrao_id else []

    ocupado = {(v.data, t.id) for v in reais for t in v.tecnicos}
    virtuais: list[VisitaResumo] = []
    for tec in fixos:
        cli = tec.cliente_padrao
        if cli is None:
            continue
        # Visão por unidade: ignora o fixo cujo cliente não é da unidade filtrada.
        if unidade_id is not None and cli.unidade_id != unidade_id:
            continue
        dia = de
        while dia <= ate:
            if (dia, tec.id) not in ocupado:
                mini = TecnicoMini(id=tec.id, nome=tec.nome or tec.email, foto=tec.foto_url)
                virtuais.append(VisitaResumo(
                    id=0, usuario_id=tec.id, tecnico_nome=mini.nome, tecnico_foto=mini.foto,
                    tecnicos=[mini], cliente_id=cli.id, cliente_nome=cli.nome,
                    cliente_cor=cli.cor, cliente_logo=cli.logo_url,
                    unidade=_nome_unidade(cli), unidade_id=cli.unidade_id,
                    data=dia, titulo="(fixo)", status="fixo", fixo=True,
                ))
            dia += timedelta(days=1)

    return [_resumo(v) for v in reais] + virtuais


def _buscar_cliente(sessao: Session, cliente_id: int | None) -> int | None:
    if cliente_id is not None and sessao.get(Cliente, cliente_id) is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente_id


@router.post("", response_model=VisitaResumo, status_code=status.HTTP_201_CREATED)
def criar(dados: VisitaIn,
          _: Usuario = Depends(requer("gerir_usuarios")),
          sessao: Session = Depends(get_session)) -> VisitaResumo:
    if not dados.usuario_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um técnico.")
    tecnicos = _carregar_tecnicos(sessao, dados.usuario_ids)
    _buscar_cliente(sessao, dados.cliente_id)
    v = Visita(
        usuario_id=tecnicos[0].id, cliente_id=dados.cliente_id, data=dados.data,
        titulo=dados.titulo.strip(), status=dados.status, observacoes=dados.observacoes,
    )
    v.tecnicos = tecnicos
    sessao.add(v)
    sessao.flush()
    # #CR4/#CR8: notifica TODOS os técnicos atribuídos à atividade.
    local = f" — {v.cliente.nome}" if v.cliente else ""
    for t in tecnicos:
        sessao.add(Notificacao(
            usuario_id=t.id, tipo="cronograma",
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
        if not any(t.id == usuario.id for t in v.tecnicos):
            raise HTTPException(status_code=403, detail="Sem acesso a esta visita.")
        if (dados.cliente_id is not None or dados.data is not None
                or dados.titulo is not None or dados.usuario_ids is not None):
            raise HTTPException(status_code=403, detail="Técnico só altera status e observações.")
    if dados.status is not None and dados.status not in _STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="status inválido.")

    if admin and dados.usuario_ids is not None:
        if not dados.usuario_ids:
            raise HTTPException(status_code=400, detail="Informe ao menos um técnico.")
        tecnicos = _carregar_tecnicos(sessao, dados.usuario_ids)
        v.tecnicos = tecnicos
        v.usuario_id = tecnicos[0].id
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

"""Cronograma dos técnicos — visitas/atividades por dia e cliente/local.

Router montado em `/cronograma`. Visão por papel:
- Técnico vê **as próprias** visitas; admin (`gerir_usuarios`) vê **todas** e pode
  filtrar por técnico. Criação/edição/remoção exigem `gerir_usuarios`.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.arquivos import remover_arquivo, salvar_upload
from app.auth import requer, usuario_atual
from app.db import get_session
from app.modelos import (
    AnexoVisita,
    Cliente,
    ComentarioVisita,
    Equipamento,
    Falha,
    Feriado,
    Notificacao,
    Usuario,
    Visita,
)

router = APIRouter(prefix="/cronograma", tags=["cronograma"])


class FeriadoIn(BaseModel):
    data: date
    descricao: str


class FeriadoResumo(BaseModel):
    id: int
    data: date
    descricao: str


# Campos do documento de O.S. corretiva (todos opcionais) — item 12.
class _OSDoc(BaseModel):
    tipo: str | None = None           # preventiva|corretiva (#OS-SEM-AVULSA)
    equipamento_id: int | None = None
    falha_id: int | None = None
    especialidade: str | None = None
    requisitante: str | None = None
    data_solicitacao: date | None = None
    centro_custo: str | None = None
    numero_os: str | None = None
    reserva_material: str | None = None
    material_utilizado: str | None = None
    endereco: str | None = None
    setor: str | None = None
    prioridade: str | None = None
    data_execucao: date | None = None
    acao_aplicada: str | None = None


_OS_CAMPOS = (
    "especialidade", "requisitante", "data_solicitacao", "centro_custo", "numero_os",
    "reserva_material", "material_utilizado", "endereco", "setor", "prioridade",
    "data_execucao", "acao_aplicada",
)


class VisitaIn(_OSDoc):
    usuario_ids: list[int] = []       # técnicos (1+); vazio → fixos do cliente (item 5)
    cliente_id: int | None = None
    data: date
    titulo: str
    status: str = "agendada"
    observacoes: str | None = None


class VisitaAtualizar(_OSDoc):
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
    # --- Ordem de Serviço (#OS, D-025) ---
    tipo: str = "corretiva"
    equipamento_id: int | None = None
    equipamento_tag: str | None = None
    falha_id: int | None = None
    falha_nome: str | None = None
    especialidade: str | None = None
    requisitante: str | None = None
    data_solicitacao: date | None = None
    centro_custo: str | None = None
    numero_os: str | None = None
    reserva_material: str | None = None
    material_utilizado: str | None = None
    endereco: str | None = None
    setor: str | None = None
    prioridade: str | None = None
    data_execucao: date | None = None
    acao_aplicada: str | None = None


# --- Página da atividade (#ATV-1) ---
class ComentarioOut(BaseModel):
    id: int
    autor_id: int | None = None
    autor_nome: str | None = None
    texto: str
    criado_em: datetime


class AnexoOut(BaseModel):
    id: int
    url: str
    nome: str
    autor_id: int | None = None
    criado_em: datetime


class ComentarioIn(BaseModel):
    texto: str


class VisitaDetalhe(VisitaResumo):
    comentarios: list[ComentarioOut] = []
    anexos: list[AnexoOut] = []


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
        tipo=v.tipo, equipamento_id=v.equipamento_id,
        equipamento_tag=(v.equipamento.tag or v.equipamento.add) if v.equipamento else None,
        falha_id=v.falha_id, falha_nome=v.falha.nome if v.falha else None,
        especialidade=v.especialidade, requisitante=v.requisitante, data_solicitacao=v.data_solicitacao,
        centro_custo=v.centro_custo, numero_os=v.numero_os, reserva_material=v.reserva_material,
        material_utilizado=v.material_utilizado, endereco=v.endereco, setor=v.setor,
        prioridade=v.prioridade, data_execucao=v.data_execucao, acao_aplicada=v.acao_aplicada,
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
    tecnico_ids: list[int] = Query(default_factory=list, description="filtra por Equipe (1+ técnicos)"),
    cliente_ids: list[int] = Query(default_factory=list, description="filtra por Clientes (1+)"),
    unidade_id: int | None = Query(None, description="filtra pela unidade do cliente (D-021)"),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[VisitaResumo]:
    admin = usuario.tem_permissao("gerir_usuarios")
    consulta = select(Visita).where(Visita.data >= de, Visita.data <= ate)
    # Técnico (sem gestão) só vê visitas em que está atribuído.
    if not admin:
        consulta = consulta.where(Visita.tecnicos.any(id=usuario.id))
    elif tecnico_ids:
        consulta = consulta.where(Visita.tecnicos.any(Usuario.id.in_(tecnico_ids)))
    # Filtro de Clientes (multi): só visitas desses clientes.
    if cliente_ids:
        consulta = consulta.where(Visita.cliente_id.in_(cliente_ids))
    # Visão por unidade: só visitas cujo cliente pertence à unidade (D-021).
    if unidade_id is not None:
        consulta = consulta.where(Visita.cliente.has(Cliente.unidade_id == unidade_id))
    reais = list(sessao.scalars(consulta.order_by(Visita.data)))

    # #FER-1: dia de feriado não tem atividades nem alocações fixas (aparece só "Feriado").
    feriados = set(sessao.scalars(
        select(Feriado.data).where(Feriado.data >= de, Feriado.data <= ate)
    ))
    if feriados:
        reais = [v for v in reais if v.data not in feriados]

    # #ALOC: técnicos com cliente fixo aparecem no cliente nos dias SEM visita explícita.
    if admin:
        q_fix = select(Usuario).where(Usuario.cliente_padrao_id.is_not(None))
        if tecnico_ids:
            q_fix = q_fix.where(Usuario.id.in_(tecnico_ids))
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
        # Filtro de Clientes: ignora o fixo cujo cliente não está selecionado.
        if cliente_ids and cli.id not in cliente_ids:
            continue
        dia = de
        while dia <= ate:
            # #FER-1: feriado não tem alocação fixa · seg–sex apenas (sem fim de semana).
            if dia in feriados or dia.weekday() >= 5:
                dia += timedelta(days=1)
                continue
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


@router.get("/atividades", response_model=list[VisitaResumo])
def atividades(usuario: Usuario = Depends(usuario_atual),
               sessao: Session = Depends(get_session)) -> list[VisitaResumo]:
    """Todas as atividades (visitas reais) do usuário — para a tela 'Atividades' da sidebar.

    Técnico vê as próprias; admin vê todas. Ordenadas por data (mais antigas primeiro);
    o frontend calcula 'faltam N dias' / 'atrasada há N dias' a partir de `data`/`status`.
    """
    consulta = select(Visita).order_by(Visita.data)
    if not usuario.tem_permissao("gerir_usuarios"):
        consulta = consulta.where(Visita.tecnicos.any(id=usuario.id))
    return [_resumo(v) for v in sessao.scalars(consulta)]


def _buscar_cliente(sessao: Session, cliente_id: int | None) -> int | None:
    if cliente_id is not None and sessao.get(Cliente, cliente_id) is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente_id


_TIPOS_OS = {"preventiva", "corretiva"}   # "avulsa" removida (#OS-SEM-AVULSA)


def _fixos_do_cliente(sessao: Session, cliente_id: int) -> list[Usuario]:
    """Técnicos fixos (cliente_padrao) do cliente — default da O.S. (item 5, #ALOC)."""
    return list(sessao.scalars(select(Usuario).where(Usuario.cliente_padrao_id == cliente_id)))


def _aplicar_os(sessao: Session, v: Visita, dados: _OSDoc) -> None:
    """Aplica os campos de O.S. (tipo/equipamento/falha + doc) e a regra de manutenção."""
    if dados.tipo is not None:
        if dados.tipo not in _TIPOS_OS:
            raise HTTPException(status_code=400, detail=f"Tipo de O.S. inválido: {dados.tipo}.")
        v.tipo = dados.tipo
    if "equipamento_id" in dados.model_fields_set:
        if dados.equipamento_id is not None and sessao.get(Equipamento, dados.equipamento_id) is None:
            raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
        v.equipamento_id = dados.equipamento_id
    if "falha_id" in dados.model_fields_set:
        if dados.falha_id is not None and sessao.get(Falha, dados.falha_id) is None:
            raise HTTPException(status_code=404, detail="Falha não encontrada.")
        v.falha_id = dados.falha_id
    for campo in _OS_CAMPOS:
        if campo in dados.model_fields_set:
            setattr(v, campo, getattr(dados, campo))
    # O.S. concluída com data → grava ultima_manutencao do equipamento (#MAP-4).
    if v.status == "concluida" and v.equipamento_id is not None:
        eq = sessao.get(Equipamento, v.equipamento_id)
        if eq is not None:
            eq.ultima_manutencao = v.data


@router.post("", response_model=VisitaResumo, status_code=status.HTTP_201_CREATED)
def criar(dados: VisitaIn,
          _: Usuario = Depends(requer("gerir_usuarios")),
          sessao: Session = Depends(get_session)) -> VisitaResumo:
    # #FER-1: não se agenda O.S. em dia de feriado.
    if sessao.scalar(select(Feriado).where(Feriado.data == dados.data)):
        raise HTTPException(status_code=400, detail="Dia é feriado — sem atividades.")
    _buscar_cliente(sessao, dados.cliente_id)
    # Item 5: sem técnicos informados → usa os fixos do cliente.
    ids = dados.usuario_ids or ([t.id for t in _fixos_do_cliente(sessao, dados.cliente_id)] if dados.cliente_id else [])
    if not ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um técnico (ou defina fixos do cliente).")
    tecnicos = _carregar_tecnicos(sessao, ids)
    v = Visita(
        usuario_id=tecnicos[0].id, cliente_id=dados.cliente_id, data=dados.data,
        titulo=dados.titulo.strip(), status=dados.status, observacoes=dados.observacoes,
    )
    v.tecnicos = tecnicos
    _aplicar_os(sessao, v, dados)
    sessao.add(v)
    sessao.flush()
    # #CR4/#CR8: notifica TODOS os técnicos atribuídos à atividade.
    local = f" — {v.cliente.nome}" if v.cliente else ""
    for t in tecnicos:
        sessao.add(Notificacao(
            usuario_id=t.id, tipo="cronograma",
            titulo=f"Nova O.S.: {v.titulo}",
            texto=f"{v.data.isoformat()}{local}", ref_id=v.id,
        ))
    sessao.commit()
    sessao.refresh(v)
    return _resumo(v)


_STATUS_VALIDOS = {"agendada", "pendente", "concluida", "cancelada"}


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
    if admin:
        _aplicar_os(sessao, v, dados)   # tipo/equipamento/falha + campos do documento (#OS)
    elif v.status == "concluida" and v.equipamento_id is not None:
        # técnico fechou a O.S. → atualiza a última manutenção do equipamento.
        eq = sessao.get(Equipamento, v.equipamento_id)
        if eq is not None:
            eq.ultima_manutencao = v.data
    sessao.commit()
    sessao.refresh(v)
    return _resumo(v)


@router.get("/equipamento/{equipamento_id}", response_model=list[VisitaResumo])
def ordens_do_equipamento(equipamento_id: int,
                          usuario: Usuario = Depends(usuario_atual),
                          sessao: Session = Depends(get_session)) -> list[VisitaResumo]:
    """Histórico de O.S. de um equipamento (#MAP-4). RBAC pelo cliente do equipamento."""
    eq = sessao.get(Equipamento, equipamento_id)
    if eq is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    if not usuario.tem_permissao("gerir_usuarios") and eq.cliente not in usuario.clientes_rel:
        raise HTTPException(status_code=403, detail="Sem acesso a este equipamento.")
    ordens = sessao.scalars(
        select(Visita).where(Visita.equipamento_id == equipamento_id).order_by(Visita.data.desc())
    ).all()
    return [_resumo(v) for v in ordens]


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
# Página da atividade (#ATV-1) — detalhe, comentários e anexos de imagem       #
# --------------------------------------------------------------------------- #
def _carregar_visita(sessao: Session, visita_id: int) -> Visita:
    v = sessao.get(Visita, visita_id)
    if v is None:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    return v


def _pode_gerir_visita(usuario: Usuario, v: Visita) -> bool:
    """Técnico atribuído (em visita_tecnico) ou admin (gerir_usuarios)."""
    return usuario.tem_permissao("gerir_usuarios") or any(t.id == usuario.id for t in v.tecnicos)


def _detalhe(v: Visita) -> VisitaDetalhe:
    return VisitaDetalhe(
        **_resumo(v).model_dump(),
        comentarios=[
            ComentarioOut(id=c.id, autor_id=c.autor_id,
                          autor_nome=(c.autor.nome or c.autor.email) if c.autor else None,
                          texto=c.texto, criado_em=c.criado_em)
            for c in v.comentarios
        ],
        anexos=[
            AnexoOut(id=a.id, url=a.url, nome=a.nome, autor_id=a.autor_id, criado_em=a.criado_em)
            for a in v.anexos
        ],
    )


@router.get("/{visita_id}", response_model=VisitaDetalhe)
def detalhe(visita_id: int,
            usuario: Usuario = Depends(usuario_atual),
            sessao: Session = Depends(get_session)) -> VisitaDetalhe:
    v = _carregar_visita(sessao, visita_id)
    if not _pode_gerir_visita(usuario, v):
        raise HTTPException(status_code=403, detail="Sem acesso a esta atividade.")
    return _detalhe(v)


@router.post("/{visita_id}/comentarios", response_model=VisitaDetalhe,
             status_code=status.HTTP_201_CREATED)
def comentar(visita_id: int, dados: ComentarioIn,
             usuario: Usuario = Depends(usuario_atual),
             sessao: Session = Depends(get_session)) -> VisitaDetalhe:
    v = _carregar_visita(sessao, visita_id)
    if not _pode_gerir_visita(usuario, v):
        raise HTTPException(status_code=403, detail="Sem acesso a esta atividade.")
    if not dados.texto.strip():
        raise HTTPException(status_code=400, detail="Comentário vazio.")
    v.comentarios.append(ComentarioVisita(autor_id=usuario.id, texto=dados.texto.strip()))
    sessao.commit()
    sessao.refresh(v)
    return _detalhe(v)


@router.post("/{visita_id}/anexos", response_model=VisitaDetalhe,
             status_code=status.HTTP_201_CREATED)
def anexar(visita_id: int,
           arquivo: UploadFile = File(...),
           usuario: Usuario = Depends(usuario_atual),
           sessao: Session = Depends(get_session)) -> VisitaDetalhe:
    v = _carregar_visita(sessao, visita_id)
    if not _pode_gerir_visita(usuario, v):
        raise HTTPException(status_code=403, detail="Sem acesso a esta atividade.")
    if not (arquivo.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Anexo deve ser uma imagem.")
    url = salvar_upload(arquivo, "atividades")
    v.anexos.append(AnexoVisita(autor_id=usuario.id, url=url, nome=arquivo.filename or "imagem"))
    sessao.commit()
    sessao.refresh(v)
    return _detalhe(v)


@router.delete("/{visita_id}/anexos/{anexo_id}", response_model=VisitaDetalhe)
def remover_anexo(visita_id: int, anexo_id: int,
                  usuario: Usuario = Depends(usuario_atual),
                  sessao: Session = Depends(get_session)) -> VisitaDetalhe:
    v = _carregar_visita(sessao, visita_id)
    if not _pode_gerir_visita(usuario, v):
        raise HTTPException(status_code=403, detail="Sem acesso a esta atividade.")
    anexo = sessao.get(AnexoVisita, anexo_id)
    if anexo is None or anexo.visita_id != visita_id:
        raise HTTPException(status_code=404, detail="Anexo não encontrado.")
    remover_arquivo(anexo.url)
    sessao.delete(anexo)
    sessao.commit()
    sessao.refresh(v)
    return _detalhe(v)


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
    sessao.flush()

    # #FER-1: o dia fica sem atividades — avisa os técnicos que tinham algo marcado.
    visitas_no_dia = sessao.scalars(select(Visita).where(Visita.data == dados.data)).all()
    tecnicos = {t.id: t for v in visitas_no_dia for t in v.tecnicos}
    for t in tecnicos.values():
        sessao.add(Notificacao(
            usuario_id=t.id, tipo="feriado",
            titulo=f"Feriado em {dados.data.isoformat()}: atividades suspensas",
            texto=f"{f.descricao} — o dia ficará sem atividades.", ref_id=f.id,
        ))

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

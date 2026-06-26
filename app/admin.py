"""Painel ADM (API) — gestão de usuários, estratégias, auditoria e provedores.

Router montado em `/admin`, todo protegido por permissões (RBAC, Fase 5). Permite
ao administrador (Fase 6) configurar a plataforma em runtime:

- Usuários: listar, criar, atualizar (papel/ativo/senha), permissões extra.
- Estratégia/persona/camadas por usuário e config global.
- Auditoria das consultas (`LogConsulta`).
- Provedores de LLM: chave **cifrada** (uso na Fase 10); nunca retornada em claro.
"""

from __future__ import annotations

from datetime import date, datetime

import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import cripto
from app.auth import hash_senha, normalizar_email, requer
from app.db import get_session
from app.estrategias import ESTRATEGIAS
from app.modelos import (
    Cliente,
    ConfigEstrategia,
    DocumentoTecnico,
    Equipamento,
    LogConsulta,
    Papel,
    Permissao,
    Planta,
    Provedor,
    Unidade,
    Usuario,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# --------------------------------------------------------------------------- #
# Schemas                                                                      #
# --------------------------------------------------------------------------- #
class UsuarioCriar(BaseModel):
    email: str
    senha: str = Field(..., min_length=4)
    nome: str = ""
    papel: str | None = None


class UnidadeIn(BaseModel):
    nome: str
    cidade: str | None = None
    ativo: bool = True


class UnidadeAtualizar(BaseModel):
    nome: str | None = None
    cidade: str | None = None
    ativo: bool | None = None


class UnidadeResumo(BaseModel):
    id: int
    nome: str
    cidade: str | None = None
    ativo: bool


class ClienteIn(BaseModel):
    nome: str
    unidade: str | None = None
    unidade_id: int | None = None
    ativo: bool = True
    cor: str | None = None
    logo_url: str | None = None
    # Cadastro completo (#CLI-PG)
    endereco: str | None = None
    contato: str | None = None
    telefone: str | None = None
    email: str | None = None
    observacoes: str | None = None


class ClienteAtualizar(BaseModel):
    nome: str | None = None
    unidade: str | None = None
    unidade_id: int | None = None
    ativo: bool | None = None
    cor: str | None = None
    logo_url: str | None = None
    endereco: str | None = None
    contato: str | None = None
    telefone: str | None = None
    email: str | None = None
    observacoes: str | None = None


class ClienteResumo(BaseModel):
    id: int
    nome: str
    unidade: str | None = None
    unidade_id: int | None = None
    unidade_nome: str | None = None
    ativo: bool
    cor: str | None = None
    logo_url: str | None = None
    endereco: str | None = None
    contato: str | None = None
    telefone: str | None = None
    email: str | None = None
    observacoes: str | None = None


class EquipamentoResumo(BaseModel):
    id: int
    tag: str
    painel: str
    loop: str
    add: str
    type: str
    model: str
    status: str
    ultima_manutencao: date | None = None
    ultimo_teste: date | None = None
    planta_id: int | None = None
    pos_x: float | None = None
    pos_y: float | None = None


class EquipamentoAtualizar(BaseModel):
    tag: str | None = None
    painel: str | None = None
    loop: str | None = None
    add: str | None = None
    type: str | None = None
    model: str | None = None
    status: str | None = None
    ultima_manutencao: date | None = None
    ultimo_teste: date | None = None
    # Posição na planta (editor de mapa #MAP)
    planta_id: int | None = None
    pos_x: float | None = None
    pos_y: float | None = None


class ClienteDetalhe(ClienteResumo):
    equipamentos: list[EquipamentoResumo] = []


class UsuarioAtualizar(BaseModel):
    nome: str | None = None
    ativo: bool | None = None
    papel: str | None = None
    senha: str | None = Field(None, min_length=4)
    # Perfil / gestão de acesso (campos opcionais).
    foto_url: str | None = None
    telefone: str | None = None
    cargo: str | None = None
    unidade: str | None = None
    unidade_id: int | None = None          # base do técnico (entidade Unidade, D-021)
    cliente_ids: list[int] | None = None   # clientes atendidos (substitui o CSV)
    cliente_padrao_id: int | None = None   # cliente fixo (#ALOC)
    observacoes: str | None = None
    acesso_expira_em: date | None = None


class UsuarioResumo(BaseModel):
    id: int
    email: str
    nome: str
    ativo: bool
    papel: str | None = None
    cargo: str | None = None
    foto_url: str | None = None
    docs_alerta: int = 0   # documentos vencidos ou vencendo em ≤ 30 dias
    permissoes_extra: list[str] = []


class DocumentoIn(BaseModel):
    nome: str
    validade: date | None = None


class DocumentoResumo(BaseModel):
    id: int
    nome: str
    validade: date | None = None


class UsuarioDetalhe(UsuarioResumo):
    """Resumo + perfil/acesso + documentos (retornado no GET de um usuário)."""

    foto_url: str | None = None
    telefone: str | None = None
    cargo: str | None = None
    unidade: str | None = None
    unidade_id: int | None = None          # base do técnico (entidade Unidade, D-021)
    unidade_nome: str | None = None
    clientes: list[ClienteResumo] = []     # clientes atendidos (relação)
    cliente_padrao_id: int | None = None   # cliente fixo (#ALOC)
    cliente_padrao_nome: str | None = None
    observacoes: str | None = None
    acesso_expira_em: date | None = None
    documentos: list[DocumentoResumo] = []


class PermissoesExtraIn(BaseModel):
    permissoes: list[str]


class PapelResumo(BaseModel):
    nome: str
    permissoes: list[str]


class PermissaoResumo(BaseModel):
    chave: str
    descricao: str


class ConfigIn(BaseModel):
    estrategia: str | None = None
    persona: str | None = None
    camadas: list[str] | None = None  # ex.: ["simples"] ou ["simples","tecnica"]


class ConfigResumo(BaseModel):
    escopo: str
    alvo: str | None = None
    estrategia: str
    persona: str | None = None
    camadas: str | None = None


class AuditoriaItem(BaseModel):
    id: int
    usuario_id: int | None = None
    pergunta: str
    estrategia: str
    latencia_ms: float | None = None
    fallback: bool
    feedback: int | None = None
    criado_em: datetime


class ProvedorIn(BaseModel):
    api_key: str
    ativo: bool = True


class ProvedorResumo(BaseModel):
    nome: str
    ativo: bool
    tem_chave: bool
    chave_mascarada: str | None = None  # NUNCA a chave em claro


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #
def _resumo_usuario(u: Usuario) -> UsuarioResumo:
    hoje = date.today()
    docs_alerta = sum(
        1 for d in u.documentos if d.validade and (d.validade - hoje).days <= 30
    )
    return UsuarioResumo(
        id=u.id, email=u.email, nome=u.nome, ativo=u.ativo,
        papel=u.papel.nome if u.papel else None,
        cargo=u.cargo, foto_url=u.foto_url, docs_alerta=docs_alerta,
        permissoes_extra=[p.chave for p in u.permissoes_extra],
    )


def _detalhe_usuario(u: Usuario) -> UsuarioDetalhe:
    return UsuarioDetalhe(
        id=u.id, email=u.email, nome=u.nome, ativo=u.ativo,
        papel=u.papel.nome if u.papel else None,
        permissoes_extra=[p.chave for p in u.permissoes_extra],
        foto_url=u.foto_url, telefone=u.telefone, cargo=u.cargo, unidade=u.unidade,
        unidade_id=u.unidade_id,
        unidade_nome=u.unidade_rel.nome if u.unidade_rel else None,
        observacoes=u.observacoes, acesso_expira_em=u.acesso_expira_em,
        clientes=[_resumo_cliente(c) for c in u.clientes_rel],
        cliente_padrao_id=u.cliente_padrao_id,
        cliente_padrao_nome=u.cliente_padrao.nome if u.cliente_padrao else None,
        documentos=[
            DocumentoResumo(id=d.id, nome=d.nome, validade=d.validade) for d in u.documentos
        ],
    )


def _buscar_usuario(sessao: Session, usuario_id: int) -> Usuario:
    u = sessao.get(Usuario, usuario_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return u


def _papel_por_nome(sessao: Session, nome: str) -> Papel:
    papel = sessao.scalar(select(Papel).where(Papel.nome == nome))
    if papel is None:
        raise HTTPException(status_code=400, detail=f"Papel inexistente: {nome}.")
    return papel


def _upsert_config(sessao: Session, escopo: str, alvo: str | None, dados: ConfigIn) -> ConfigEstrategia:
    cfg = sessao.scalar(
        select(ConfigEstrategia).where(
            ConfigEstrategia.escopo == escopo, ConfigEstrategia.alvo == alvo
        )
    )
    if cfg is None:
        cfg = ConfigEstrategia(escopo=escopo, alvo=alvo,
                               estrategia=dados.estrategia or "local_extrativa")
        sessao.add(cfg)
    if dados.estrategia is not None:
        if dados.estrategia not in ESTRATEGIAS:
            raise HTTPException(status_code=400,
                                detail=f"Estratégia inválida: {dados.estrategia}.")
        cfg.estrategia = dados.estrategia
    if dados.persona is not None:
        cfg.persona = dados.persona or None
    if dados.camadas is not None:
        cfg.camadas = ",".join(dados.camadas) or None
    sessao.commit()
    sessao.refresh(cfg)
    return cfg


# --------------------------------------------------------------------------- #
# Usuários                                                                     #
# --------------------------------------------------------------------------- #
@router.get("/usuarios", response_model=list[UsuarioResumo])
def listar_usuarios(_: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)) -> list[UsuarioResumo]:
    return [_resumo_usuario(u) for u in sessao.scalars(select(Usuario)).all()]


@router.post("/usuarios", response_model=UsuarioResumo, status_code=status.HTTP_201_CREATED)
def criar_usuario(dados: UsuarioCriar,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> UsuarioResumo:
    email = normalizar_email(dados.email)
    if not email:
        raise HTTPException(status_code=400, detail="E-mail é obrigatório.")
    if sessao.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado.")
    usuario = Usuario(email=email, nome=dados.nome, ativo=True,
                      hash_senha=hash_senha(dados.senha))
    if dados.papel:
        usuario.papel = _papel_por_nome(sessao, dados.papel)
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return _resumo_usuario(usuario)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioDetalhe)
def obter_usuario(usuario_id: int,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> UsuarioDetalhe:
    return _detalhe_usuario(_buscar_usuario(sessao, usuario_id))


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioDetalhe)
def atualizar_usuario(usuario_id: int, dados: UsuarioAtualizar,
                      _: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> UsuarioDetalhe:
    usuario = _buscar_usuario(sessao, usuario_id)
    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.ativo is not None:
        usuario.ativo = dados.ativo
    if dados.papel is not None:
        usuario.papel = _papel_por_nome(sessao, dados.papel)
    if dados.senha is not None:
        usuario.hash_senha = hash_senha(dados.senha)
    # Campos de perfil/acesso (atualizados quando enviados; "" limpa o campo).
    for campo in ("foto_url", "telefone", "cargo", "unidade", "observacoes"):
        valor = getattr(dados, campo)
        if valor is not None:
            setattr(usuario, campo, valor or None)
    if dados.acesso_expira_em is not None:
        usuario.acesso_expira_em = dados.acesso_expira_em
    if dados.cliente_ids is not None:
        usuario.clientes_rel = [
            c for c in sessao.scalars(select(Cliente).where(Cliente.id.in_(dados.cliente_ids)))
        ]
    if "cliente_padrao_id" in dados.model_fields_set:
        cid = dados.cliente_padrao_id
        if cid is not None and sessao.get(Cliente, cid) is None:
            raise HTTPException(status_code=404, detail="Cliente fixo não encontrado.")
        usuario.cliente_padrao_id = cid
    if "unidade_id" in dados.model_fields_set:
        uid = dados.unidade_id
        if uid is not None and sessao.get(Unidade, uid) is None:
            raise HTTPException(status_code=404, detail="Unidade não encontrada.")
        usuario.unidade_id = uid
    sessao.commit()
    sessao.refresh(usuario)
    return _detalhe_usuario(usuario)


# --------------------------------------------------------------------------- #
# Unidades (D-021) — base/regional para a "visão por unidade" do cronograma     #
# --------------------------------------------------------------------------- #
def _resumo_unidade(u: Unidade) -> UnidadeResumo:
    return UnidadeResumo(id=u.id, nome=u.nome, cidade=u.cidade, ativo=u.ativo)


@router.get("/unidades", response_model=list[UnidadeResumo])
def listar_unidades(_: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)) -> list[UnidadeResumo]:
    return [_resumo_unidade(u) for u in sessao.scalars(select(Unidade).order_by(Unidade.nome))]


@router.post("/unidades", response_model=UnidadeResumo, status_code=status.HTTP_201_CREATED)
def criar_unidade(dados: UnidadeIn,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> UnidadeResumo:
    if not dados.nome.strip():
        raise HTTPException(status_code=400, detail="Nome da unidade é obrigatório.")
    if sessao.scalar(select(Unidade).where(Unidade.nome == dados.nome.strip())):
        raise HTTPException(status_code=409, detail="Já existe uma unidade com esse nome.")
    u = Unidade(nome=dados.nome.strip(), cidade=dados.cidade or None, ativo=dados.ativo)
    sessao.add(u)
    sessao.commit()
    sessao.refresh(u)
    return _resumo_unidade(u)


@router.patch("/unidades/{unidade_id}", response_model=UnidadeResumo)
def atualizar_unidade(unidade_id: int, dados: UnidadeAtualizar,
                      _: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> UnidadeResumo:
    u = sessao.get(Unidade, unidade_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    if dados.nome is not None:
        u.nome = dados.nome.strip()
    if dados.cidade is not None:
        u.cidade = dados.cidade or None
    if dados.ativo is not None:
        u.ativo = dados.ativo
    sessao.commit()
    sessao.refresh(u)
    return _resumo_unidade(u)


@router.delete("/unidades/{unidade_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_unidade(unidade_id: int,
                    _: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)):
    u = sessao.get(Unidade, unidade_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    # Bloqueia remoção se ainda houver técnicos ou clientes vinculados (evita órfãos).
    em_uso = sessao.scalar(select(Cliente).where(Cliente.unidade_id == unidade_id)) or \
        sessao.scalar(select(Usuario).where(Usuario.unidade_id == unidade_id))
    if em_uso is not None:
        raise HTTPException(status_code=409,
                            detail="Unidade em uso por técnicos/clientes; desvincule antes de remover.")
    sessao.delete(u)
    sessao.commit()


# --------------------------------------------------------------------------- #
# Clientes                                                                     #
# --------------------------------------------------------------------------- #
def _resumo_cliente(c: Cliente) -> ClienteResumo:
    return ClienteResumo(id=c.id, nome=c.nome, unidade=c.unidade,
                         unidade_id=c.unidade_id,
                         unidade_nome=c.unidade_rel.nome if c.unidade_rel else None,
                         ativo=c.ativo, cor=c.cor, logo_url=c.logo_url,
                         endereco=c.endereco, contato=c.contato, telefone=c.telefone,
                         email=c.email, observacoes=c.observacoes)


@router.get("/clientes", response_model=list[ClienteResumo])
def listar_clientes(_: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)) -> list[ClienteResumo]:
    return [_resumo_cliente(c) for c in sessao.scalars(select(Cliente).order_by(Cliente.nome))]


@router.post("/clientes", response_model=ClienteResumo, status_code=status.HTTP_201_CREATED)
def criar_cliente(dados: ClienteIn,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> ClienteResumo:
    if not dados.nome.strip():
        raise HTTPException(status_code=400, detail="Nome do cliente é obrigatório.")
    if sessao.scalar(select(Cliente).where(Cliente.nome == dados.nome.strip())):
        raise HTTPException(status_code=409, detail="Já existe um cliente com esse nome.")
    if dados.unidade_id is not None and sessao.get(Unidade, dados.unidade_id) is None:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    c = Cliente(nome=dados.nome.strip(), unidade=dados.unidade or None,
                unidade_id=dados.unidade_id, ativo=dados.ativo,
                cor=dados.cor or None, logo_url=dados.logo_url or None,
                endereco=dados.endereco or None, contato=dados.contato or None,
                telefone=dados.telefone or None, email=dados.email or None,
                observacoes=dados.observacoes or None)
    sessao.add(c)
    sessao.commit()
    sessao.refresh(c)
    return _resumo_cliente(c)


@router.patch("/clientes/{cliente_id}", response_model=ClienteResumo)
def atualizar_cliente(cliente_id: int, dados: ClienteAtualizar,
                      _: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> ClienteResumo:
    c = sessao.get(Cliente, cliente_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    if dados.nome is not None:
        c.nome = dados.nome.strip()
    if dados.unidade is not None:
        c.unidade = dados.unidade or None
    if "unidade_id" in dados.model_fields_set:
        if dados.unidade_id is not None and sessao.get(Unidade, dados.unidade_id) is None:
            raise HTTPException(status_code=404, detail="Unidade não encontrada.")
        c.unidade_id = dados.unidade_id
    if dados.ativo is not None:
        c.ativo = dados.ativo
    if dados.cor is not None:
        c.cor = dados.cor or None
    if dados.logo_url is not None:
        c.logo_url = dados.logo_url or None
    for campo in ("endereco", "contato", "telefone", "email", "observacoes"):
        valor = getattr(dados, campo)
        if valor is not None:
            setattr(c, campo, valor or None)
    sessao.commit()
    sessao.refresh(c)
    return _resumo_cliente(c)


@router.get("/clientes/{cliente_id}", response_model=ClienteDetalhe)
def detalhe_cliente(cliente_id: int,
                    _: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)) -> ClienteDetalhe:
    c = sessao.get(Cliente, cliente_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    base = _resumo_cliente(c).model_dump()
    return ClienteDetalhe(**base, equipamentos=[_resumo_equip(e) for e in c.equipamentos])


@router.delete("/clientes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_cliente(cliente_id: int,
                    _: Usuario = Depends(requer("gerir_usuarios")),
                    sessao: Session = Depends(get_session)):
    c = sessao.get(Cliente, cliente_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    sessao.delete(c)
    sessao.commit()


# --------------------------------------------------------------------------- #
# Equipamentos do cliente (#EQP-1 + #MAP)                                       #
# --------------------------------------------------------------------------- #
_EQP_COLUNAS = ("tag", "painel", "loop", "add", "type", "model", "status")


class ImportEquipOut(BaseModel):
    importados: int
    total: int


def _resumo_equip(e: Equipamento) -> EquipamentoResumo:
    return EquipamentoResumo(
        id=e.id, tag=e.tag, painel=e.painel, loop=e.loop, add=e.add, type=e.type,
        model=e.model, status=e.status, ultima_manutencao=e.ultima_manutencao,
        ultimo_teste=e.ultimo_teste, planta_id=e.planta_id, pos_x=e.pos_x, pos_y=e.pos_y,
    )


def _parse_data(valor: str) -> date | None:
    """Aceita ISO (AAAA-MM-DD) ou BR (DD/MM/AAAA). Vazio/ inválido → None."""
    valor = (valor or "").strip()
    if not valor:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(valor, fmt).date()
        except ValueError:
            continue
    return None


def _cliente_ou_404(sessao: Session, cliente_id: int) -> Cliente:
    c = sessao.get(Cliente, cliente_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return c


@router.get("/clientes/{cliente_id}/equipamentos", response_model=list[EquipamentoResumo])
def listar_equipamentos(cliente_id: int,
                        _: Usuario = Depends(requer("gerir_usuarios")),
                        sessao: Session = Depends(get_session)) -> list[EquipamentoResumo]:
    c = _cliente_ou_404(sessao, cliente_id)
    return [_resumo_equip(e) for e in c.equipamentos]


@router.post("/clientes/{cliente_id}/equipamentos/importar", response_model=ImportEquipOut,
             status_code=status.HTTP_201_CREATED)
async def importar_equipamentos(cliente_id: int,
                                arquivo: UploadFile = File(...),
                                substituir: bool = False,
                                _: Usuario = Depends(requer("gerir_usuarios")),
                                sessao: Session = Depends(get_session)) -> ImportEquipOut:
    c = _cliente_ou_404(sessao, cliente_id)
    bruto = (await arquivo.read()).decode("utf-8-sig", errors="replace")
    if not bruto.strip():
        raise HTTPException(status_code=400, detail="CSV vazio.")
    # Delimitador automático (vírgula ou ponto-e-vírgula).
    try:
        dialeto = csv.Sniffer().sniff(bruto.splitlines()[0], delimiters=",;")
        leitor = csv.DictReader(io.StringIO(bruto), dialect=dialeto)
    except csv.Error:
        leitor = csv.DictReader(io.StringIO(bruto))
    if not leitor.fieldnames:
        raise HTTPException(status_code=400, detail="CSV sem cabeçalho.")
    mapa = {(nome or "").strip().lower(): nome for nome in leitor.fieldnames}

    if substituir:
        c.equipamentos.clear()
        sessao.flush()

    def _col(linha: dict, *nomes: str) -> str:
        for n in nomes:
            if n in mapa:
                return (linha.get(mapa[n], "") or "").strip()
        return ""

    importados = 0
    for linha in leitor:
        valores = {col: (linha.get(mapa.get(col, ""), "") or "").strip() for col in _EQP_COLUNAS}
        u_manut = _parse_data(_col(linha, "ultima_manutencao", "ultima manutencao", "última manutenção"))
        u_teste = _parse_data(_col(linha, "ultimo_teste", "ultimo teste", "último teste"))
        if not any(valores.values()) and not u_manut and not u_teste:
            continue  # ignora linha vazia
        c.equipamentos.append(Equipamento(**valores, ultima_manutencao=u_manut, ultimo_teste=u_teste))
        importados += 1
    sessao.commit()
    return ImportEquipOut(importados=importados, total=len(c.equipamentos))


@router.patch("/equipamentos/{equipamento_id}", response_model=EquipamentoResumo)
def atualizar_equipamento(equipamento_id: int, dados: EquipamentoAtualizar,
                          _: Usuario = Depends(requer("gerir_usuarios")),
                          sessao: Session = Depends(get_session)) -> EquipamentoResumo:
    """Edita um equipamento (campos + **posição na planta** — usado pelo editor de mapa)."""
    e = sessao.get(Equipamento, equipamento_id)
    if e is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    if "planta_id" in dados.model_fields_set:
        if dados.planta_id is not None and sessao.get(Planta, dados.planta_id) is None:
            raise HTTPException(status_code=404, detail="Planta não encontrada.")
        e.planta_id = dados.planta_id
    for campo in ("tag", "painel", "loop", "add", "type", "model", "status"):
        v = getattr(dados, campo)
        if v is not None:
            setattr(e, campo, v)
    for campo in ("ultima_manutencao", "ultimo_teste", "pos_x", "pos_y"):
        if campo in dados.model_fields_set:
            setattr(e, campo, getattr(dados, campo))
    sessao.commit()
    sessao.refresh(e)
    return _resumo_equip(e)


@router.delete("/equipamentos/{equipamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_equipamento(equipamento_id: int,
                        _: Usuario = Depends(requer("gerir_usuarios")),
                        sessao: Session = Depends(get_session)):
    e = sessao.get(Equipamento, equipamento_id)
    if e is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    sessao.delete(e)
    sessao.commit()


@router.post("/usuarios/{usuario_id}/documentos", response_model=UsuarioDetalhe,
             status_code=status.HTTP_201_CREATED)
def adicionar_documento(usuario_id: int, dados: DocumentoIn,
                        _: Usuario = Depends(requer("gerir_usuarios")),
                        sessao: Session = Depends(get_session)) -> UsuarioDetalhe:
    usuario = _buscar_usuario(sessao, usuario_id)
    if not dados.nome.strip():
        raise HTTPException(status_code=400, detail="Nome do documento é obrigatório.")
    usuario.documentos.append(DocumentoTecnico(nome=dados.nome.strip(), validade=dados.validade))
    sessao.commit()
    sessao.refresh(usuario)
    return _detalhe_usuario(usuario)


@router.delete("/usuarios/{usuario_id}/documentos/{doc_id}", response_model=UsuarioDetalhe)
def remover_documento(usuario_id: int, doc_id: int,
                      _: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> UsuarioDetalhe:
    usuario = _buscar_usuario(sessao, usuario_id)
    doc = sessao.get(DocumentoTecnico, doc_id)
    if doc is None or doc.usuario_id != usuario_id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    sessao.delete(doc)
    sessao.commit()
    sessao.refresh(usuario)
    return _detalhe_usuario(usuario)


@router.put("/usuarios/{usuario_id}/permissoes-extra", response_model=UsuarioResumo)
def definir_permissoes_extra(usuario_id: int, dados: PermissoesExtraIn,
                             _: Usuario = Depends(requer("gerir_usuarios")),
                             sessao: Session = Depends(get_session)) -> UsuarioResumo:
    usuario = _buscar_usuario(sessao, usuario_id)
    perms = []
    for chave in dados.permissoes:
        p = sessao.scalar(select(Permissao).where(Permissao.chave == chave))
        if p is None:
            raise HTTPException(status_code=400, detail=f"Permissão inexistente: {chave}.")
        perms.append(p)
    usuario.permissoes_extra = perms
    sessao.commit()
    sessao.refresh(usuario)
    return _resumo_usuario(usuario)


# --------------------------------------------------------------------------- #
# Catálogos (papéis e permissões) — para os seletores do painel ADM            #
# --------------------------------------------------------------------------- #
@router.get("/papeis", response_model=list[PapelResumo])
def listar_papeis(_: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> list[PapelResumo]:
    return [
        PapelResumo(nome=p.nome, permissoes=[perm.chave for perm in p.permissoes])
        for p in sessao.scalars(select(Papel)).all()
    ]


@router.get("/permissoes", response_model=list[PermissaoResumo])
def listar_permissoes(_: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> list[PermissaoResumo]:
    return [
        PermissaoResumo(chave=p.chave, descricao=p.descricao)
        for p in sessao.scalars(select(Permissao)).all()
    ]


# --------------------------------------------------------------------------- #
# Estratégias / configuração                                                   #
# --------------------------------------------------------------------------- #
@router.get("/estrategias", response_model=list[str])
def listar_estrategias(_: Usuario = Depends(requer("gerir_estrategias"))) -> list[str]:
    return sorted(ESTRATEGIAS)


@router.get("/usuarios/{usuario_id}/estrategia", response_model=ConfigResumo | None)
def obter_estrategia_usuario(usuario_id: int,
                             _: Usuario = Depends(requer("gerir_estrategias")),
                             sessao: Session = Depends(get_session)) -> ConfigResumo | None:
    _buscar_usuario(sessao, usuario_id)
    cfg = sessao.scalar(
        select(ConfigEstrategia).where(
            ConfigEstrategia.escopo == "usuario", ConfigEstrategia.alvo == str(usuario_id)
        )
    )
    return ConfigResumo.model_validate(cfg, from_attributes=True) if cfg else None


@router.put("/usuarios/{usuario_id}/estrategia", response_model=ConfigResumo)
def definir_estrategia_usuario(usuario_id: int, dados: ConfigIn,
                               _: Usuario = Depends(requer("gerir_estrategias")),
                               sessao: Session = Depends(get_session)) -> ConfigResumo:
    _buscar_usuario(sessao, usuario_id)  # valida existência
    cfg = _upsert_config(sessao, "usuario", str(usuario_id), dados)
    return ConfigResumo.model_validate(cfg, from_attributes=True)


@router.put("/config-global", response_model=ConfigResumo)
def definir_config_global(dados: ConfigIn,
                          _: Usuario = Depends(requer("gerir_estrategias")),
                          sessao: Session = Depends(get_session)) -> ConfigResumo:
    cfg = _upsert_config(sessao, "global", None, dados)
    return ConfigResumo.model_validate(cfg, from_attributes=True)


# --------------------------------------------------------------------------- #
# Auditoria                                                                    #
# --------------------------------------------------------------------------- #
@router.get("/auditoria", response_model=list[AuditoriaItem])
def listar_auditoria(limite: int = 50, offset: int = 0,
                     _: Usuario = Depends(requer("ver_auditoria")),
                     sessao: Session = Depends(get_session)) -> list[AuditoriaItem]:
    limite = max(1, min(limite, 500))
    rows = sessao.scalars(
        select(LogConsulta).order_by(LogConsulta.id.desc()).limit(limite).offset(offset)
    ).all()
    return [AuditoriaItem.model_validate(r, from_attributes=True) for r in rows]


# --------------------------------------------------------------------------- #
# Provedores (chave cifrada — uso na Fase 10)                                  #
# --------------------------------------------------------------------------- #
def _resumo_provedor(p: Provedor) -> ProvedorResumo:
    mascarada = None
    if p.api_key_cifrada:
        try:
            mascarada = cripto.mascarar(cripto.decifrar(p.api_key_cifrada))
        except RuntimeError:
            mascarada = "…"
    return ProvedorResumo(nome=p.nome, ativo=p.ativo,
                          tem_chave=bool(p.api_key_cifrada), chave_mascarada=mascarada)


@router.get("/provedores", response_model=list[ProvedorResumo])
def listar_provedores(_: Usuario = Depends(requer("gerir_chaves")),
                      sessao: Session = Depends(get_session)) -> list[ProvedorResumo]:
    return [_resumo_provedor(p) for p in sessao.scalars(select(Provedor)).all()]


@router.put("/provedores/{nome}", response_model=ProvedorResumo)
def definir_provedor(nome: str, dados: ProvedorIn,
                     _: Usuario = Depends(requer("gerir_chaves")),
                     sessao: Session = Depends(get_session)) -> ProvedorResumo:
    """Cadastra/atualiza a chave de um provedor (armazenada **cifrada**)."""
    provedor = sessao.scalar(select(Provedor).where(Provedor.nome == nome))
    if provedor is None:
        provedor = Provedor(nome=nome)
        sessao.add(provedor)
    provedor.api_key_cifrada = cripto.cifrar(dados.api_key)
    provedor.ativo = dados.ativo
    sessao.commit()
    sessao.refresh(provedor)
    return _resumo_provedor(provedor)

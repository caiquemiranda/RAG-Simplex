"""Painel ADM (API) — gestão de usuários, estratégias, auditoria e provedores.

Router montado em `/admin`, todo protegido por permissões (RBAC, Fase 5). Permite
ao administrador (Fase 6) configurar a plataforma em runtime:

- Usuários: listar, criar, atualizar (papel/ativo/senha), permissões extra.
- Estratégia/persona/camadas por usuário e config global.
- Auditoria das consultas (`LogConsulta`).
- Provedores de LLM: chave **cifrada** (uso na Fase 10); nunca retornada em claro.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import cripto
from app.auth import hash_senha, requer
from app.db import get_session
from app.estrategias import ESTRATEGIAS
from app.modelos import (
    ConfigEstrategia,
    LogConsulta,
    Papel,
    Permissao,
    Provedor,
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


class UsuarioAtualizar(BaseModel):
    nome: str | None = None
    ativo: bool | None = None
    papel: str | None = None
    senha: str | None = Field(None, min_length=4)


class UsuarioResumo(BaseModel):
    id: int
    email: str
    nome: str
    ativo: bool
    papel: str | None = None
    permissoes_extra: list[str] = []


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
    return UsuarioResumo(
        id=u.id, email=u.email, nome=u.nome, ativo=u.ativo,
        papel=u.papel.nome if u.papel else None,
        permissoes_extra=[p.chave for p in u.permissoes_extra],
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
    if sessao.scalar(select(Usuario).where(Usuario.email == dados.email)):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado.")
    usuario = Usuario(email=dados.email, nome=dados.nome, ativo=True,
                      hash_senha=hash_senha(dados.senha))
    if dados.papel:
        usuario.papel = _papel_por_nome(sessao, dados.papel)
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return _resumo_usuario(usuario)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioResumo)
def obter_usuario(usuario_id: int,
                  _: Usuario = Depends(requer("gerir_usuarios")),
                  sessao: Session = Depends(get_session)) -> UsuarioResumo:
    return _resumo_usuario(_buscar_usuario(sessao, usuario_id))


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioResumo)
def atualizar_usuario(usuario_id: int, dados: UsuarioAtualizar,
                      _: Usuario = Depends(requer("gerir_usuarios")),
                      sessao: Session = Depends(get_session)) -> UsuarioResumo:
    usuario = _buscar_usuario(sessao, usuario_id)
    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.ativo is not None:
        usuario.ativo = dados.ativo
    if dados.papel is not None:
        usuario.papel = _papel_por_nome(sessao, dados.papel)
    if dados.senha is not None:
        usuario.hash_senha = hash_senha(dados.senha)
    sessao.commit()
    sessao.refresh(usuario)
    return _resumo_usuario(usuario)


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

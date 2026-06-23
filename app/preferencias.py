"""Resolução hierárquica da estratégia de geração por usuário/papel.

Precedência (mais específico ganha):
    override da requisição → config do usuário → config do papel → config global
    → fallback para `settings.estrategia_geracao`.

Isso permite ao admin (Fase 7) definir a estratégia por técnico, mantendo um
padrão global seguro (extrativo, sem API key).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.modelos import ConfigEstrategia


def resolver_config(
    sessao: Session,
    usuario_id: int | None = None,
    papel_nome: str | None = None,
) -> ConfigEstrategia | None:
    """Retorna a `ConfigEstrategia` aplicável seguindo a precedência."""
    if usuario_id is not None:
        cfg = sessao.scalar(
            select(ConfigEstrategia).where(
                ConfigEstrategia.escopo == "usuario",
                ConfigEstrategia.alvo == str(usuario_id),
            )
        )
        if cfg is not None:
            return cfg

    if papel_nome:
        cfg = sessao.scalar(
            select(ConfigEstrategia).where(
                ConfigEstrategia.escopo == "papel",
                ConfigEstrategia.alvo == papel_nome,
            )
        )
        if cfg is not None:
            return cfg

    return sessao.scalar(
        select(ConfigEstrategia).where(ConfigEstrategia.escopo == "global")
    )


def resolver_estrategia(
    sessao: Session,
    usuario_id: int | None = None,
    papel_nome: str | None = None,
    override: str | None = None,
) -> str:
    """Nome da estratégia a usar. `override` (modo avaliação) tem prioridade máxima."""
    if override:
        return override
    cfg = resolver_config(sessao, usuario_id=usuario_id, papel_nome=papel_nome)
    return cfg.estrategia if cfg else settings.estrategia_geracao

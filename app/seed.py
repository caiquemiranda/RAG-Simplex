"""Semeadura de papéis, permissões e configuração padrão.

Papéis seguem as personas do PRD §3. A matriz papel×permissão é aplicada de fato
na Fase 5 (RBAC); aqui apenas registramos os dados.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.modelos import ConfigEstrategia, Papel, Permissao

# Permissões granulares do sistema.
PERMISSOES: dict[str, str] = {
    "consultar": "Fazer consultas ao assistente (/query).",
    "consultar_stream": "Consultar em streaming (/query/stream).",
    "ingerir": "Reindexar a base de conhecimento (/ingest).",
    "ver_avaliacao": "Usar o modo avaliação/arena (Fase 10).",
    "gerir_estrategias": "Ligar/desligar e definir estratégias padrão.",
    "gerir_usuarios": "Criar/editar usuários e papéis.",
    "gerir_chaves": "Cadastrar/rotacionar chaves de provedores.",
    "ver_auditoria": "Consultar o log de auditoria.",
}

# Papel → permissões (personas do PRD §3).
PAPEIS: dict[str, list[str]] = {
    "Operador": ["consultar"],
    "Tecnico": ["consultar", "consultar_stream"],
    "Analista": ["consultar", "consultar_stream", "ingerir", "ver_avaliacao"],
    "Admin": list(PERMISSOES),  # todas
}


def semear_padroes(sessao: Session) -> dict[str, int]:
    """Cria permissões, papéis e a config global padrão (idempotente).

    Retorna um resumo com a contagem de cada entidade existente ao final.
    """
    # Permissões.
    perms: dict[str, Permissao] = {}
    for chave, descricao in PERMISSOES.items():
        p = sessao.scalar(select(Permissao).where(Permissao.chave == chave))
        if p is None:
            p = Permissao(chave=chave, descricao=descricao)
            sessao.add(p)
        perms[chave] = p
    sessao.flush()

    # Papéis + vínculo com permissões.
    for nome, chaves in PAPEIS.items():
        papel = sessao.scalar(select(Papel).where(Papel.nome == nome))
        if papel is None:
            papel = Papel(nome=nome)
            sessao.add(papel)
        papel.permissoes = [perms[c] for c in chaves]
    sessao.flush()

    # Config global padrão: estratégia local (sem API key).
    global_cfg = sessao.scalar(
        select(ConfigEstrategia).where(ConfigEstrategia.escopo == "global")
    )
    if global_cfg is None:
        sessao.add(
            ConfigEstrategia(
                escopo="global",
                alvo=None,
                estrategia=settings.estrategia_geracao,
                camadas="simples,tecnica",
            )
        )
    sessao.flush()

    return {
        "permissoes": len(sessao.scalars(select(Permissao)).all()),
        "papeis": len(sessao.scalars(select(Papel)).all()),
        "config_global": len(
            sessao.scalars(
                select(ConfigEstrategia).where(ConfigEstrategia.escopo == "global")
            ).all()
        ),
    }

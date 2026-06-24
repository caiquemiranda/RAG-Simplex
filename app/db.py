"""Banco relacional: engine, sessão e criação de tabelas (SQLAlchemy 2.0).

Padrão de uso na API (Fase 4+):
    from app.db import get_session
    def endpoint(session = Depends(get_session)): ...

Inicialização (cria tabelas + semeia papéis/permissões/config padrão):
    python -m app.db --init
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.modelos import Base

_conecta_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine: Engine = create_engine(settings.database_url, echo=False, connect_args=_conecta_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def _migrar_colunas(eng: Engine) -> list[str]:
    """Adiciona colunas que existem no modelo mas faltam na tabela.

    Micro-migração para evoluções **simples** de schema sem recriar o banco
    (ex.: a coluna ``feedback`` da Fase 8). Cobre apenas colunas **nullable** e
    sem PK/unique — mudanças complexas continuam exigindo migração dedicada.
    Retorna a lista de colunas adicionadas (ex.: ``["log_consulta.feedback"]``).
    """
    insp = inspect(eng)
    tabelas_db = set(insp.get_table_names())
    adicionadas: list[str] = []
    for tabela in Base.metadata.sorted_tables:
        if tabela.name not in tabelas_db:
            continue  # create_all já cuidou de tabelas novas
        existentes = {c["name"] for c in insp.get_columns(tabela.name)}
        for coluna in tabela.columns:
            if coluna.name in existentes or coluna.primary_key or coluna.unique or not coluna.nullable:
                continue
            tipo = coluna.type.compile(eng.dialect)
            with eng.begin() as conn:
                conn.execute(text(f'ALTER TABLE "{tabela.name}" ADD COLUMN "{coluna.name}" {tipo}'))
            adicionadas.append(f"{tabela.name}.{coluna.name}")
    return adicionadas


def _backfill_visita_tecnicos(eng: Engine) -> None:
    """Backfill #CR8: garante que cada visita tenha o técnico responsável em `visita_tecnico`."""
    insp = inspect(eng)
    if {"visita", "visita_tecnico"} <= set(insp.get_table_names()):
        with eng.begin() as conn:
            conn.execute(text(
                "INSERT INTO visita_tecnico (visita_id, usuario_id) "
                "SELECT v.id, v.usuario_id FROM visita v "
                "WHERE v.usuario_id IS NOT NULL AND NOT EXISTS "
                "(SELECT 1 FROM visita_tecnico vt WHERE vt.visita_id = v.id AND vt.usuario_id = v.usuario_id)"
            ))


def criar_tabelas(eng: Engine | None = None) -> list[str]:
    """Cria tabelas faltantes e adiciona colunas novas (idempotente).

    Retorna as colunas migradas (pode ser lista vazia).
    """
    alvo = eng or engine
    Base.metadata.create_all(alvo)
    migradas = _migrar_colunas(alvo)
    _backfill_visita_tecnicos(alvo)
    return migradas


def get_session() -> Iterator[Session]:
    """Dependency/contexto que abre e fecha uma sessão."""
    with SessionLocal() as sessao:
        yield sessao


def _main() -> None:
    import argparse

    from app.seed import semear_padroes

    parser = argparse.ArgumentParser(description="Inicializa o banco relacional.")
    parser.add_argument("--init", action="store_true", help="Cria tabelas e semeia padrões.")
    args = parser.parse_args()

    migradas = criar_tabelas()
    print(f"Tabelas criadas em: {settings.database_url}")
    if migradas:
        print(f"Colunas migradas: {', '.join(migradas)}")
    if args.init:
        with SessionLocal() as sessao:
            criados = semear_padroes(sessao)
            sessao.commit()
        print(f"Padrões semeados: {criados}")


if __name__ == "__main__":
    _main()

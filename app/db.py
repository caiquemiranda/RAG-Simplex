"""Banco relacional: engine, sessão e criação de tabelas (SQLAlchemy 2.0).

Padrão de uso na API (Fase 4+):
    from app.db import get_session
    def endpoint(session = Depends(get_session)): ...

Inicialização (cria tabelas + semeia papéis/permissões/config padrão):
    python -m app.db --init
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.modelos import Base

_conecta_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine: Engine = create_engine(settings.database_url, echo=False, connect_args=_conecta_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def criar_tabelas(eng: Engine | None = None) -> None:
    """Cria todas as tabelas (idempotente)."""
    Base.metadata.create_all(eng or engine)


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

    criar_tabelas()
    print(f"Tabelas criadas em: {settings.database_url}")
    if args.init:
        with SessionLocal() as sessao:
            criados = semear_padroes(sessao)
            sessao.commit()
        print(f"Padrões semeados: {criados}")


if __name__ == "__main__":
    _main()

"""Ambiente do Alembic — migrações versionadas do banco relacional.

Conecta o Alembic ao projeto: usa a `Base.metadata` dos modelos (autogenerate) e a
`settings.database_url` (mesma URL do app), em vez de hardcode no `alembic.ini`. Assim
não há divergência entre o que a aplicação usa e o que as migrações enxergam.

Comandos típicos (rodar como módulo, a partir da raiz):
    python -m alembic revision --autogenerate -m "descricao"   # cria migração
    python -m alembic upgrade head                              # aplica
    python -m alembic stamp head                                # marca sem rodar (DB legado)
"""

from __future__ import annotations

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Metadados e URL vêm do próprio app (fonte única de verdade).
from app.config import settings
from app.modelos import Base

config = context.config

# Sobrescreve a URL do alembic.ini com a do app (suporta .env com prefixo RAG_).
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alvo do autogenerate: o esquema declarado nos modelos ORM.
target_metadata = Base.metadata

# SQLite não altera coluna por padrão (sem ALTER ... ALTER COLUMN); o batch mode
# recria a tabela quando preciso. Ligamos quando o backend for SQLite.
_render_as_batch = settings.database_url.startswith("sqlite")


def run_migrations_offline() -> None:
    """Modo offline: gera o SQL a partir só da URL (sem DBAPI)."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_render_as_batch,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: cria a engine e aplica as migrações na conexão."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=_render_as_batch,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

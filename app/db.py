"""Banco relacional: engine, sessão e schema (SQLAlchemy 2.0 + Alembic).

Padrão de uso na API (Fase 4+):
    from app.db import get_session
    def endpoint(session = Depends(get_session)): ...

Inicialização (aplica migrações + semeia papéis/permissões/config padrão):
    python -m app.db --init

**Schema (D-022):** o banco **real/persistente** é gerido por **Alembic** (migrações
versionadas em `alembic/versions/`). `aplicar_migracoes()` roda `upgrade head`. A
`criar_tabelas()` (create_all + micro-migração ad-hoc) fica para os **testes**
(SQLite em memória) e como **fallback** quando o Alembic não está disponível.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import BASE_DIR, settings
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

    Usada pelos **testes** (SQLite em memória) e como **fallback** do bootstrap
    quando o Alembic não está instalado. Para o banco real, prefira
    `aplicar_migracoes()` (Alembic). Retorna as colunas migradas (pode ser vazia).
    """
    alvo = eng or engine
    Base.metadata.create_all(alvo)
    migradas = _migrar_colunas(alvo)
    _backfill_visita_tecnicos(alvo)
    return migradas


def aplicar_migracoes() -> bool:
    """Aplica as migrações Alembic (`upgrade head`) no banco configurado (D-022).

    Fonte de verdade do schema do banco **real**: para um banco novo cria tudo a
    partir da baseline; para um existente aplica as migrações pendentes. O `env.py`
    do Alembic usa `settings.database_url` (mesma URL do app).

    Retorna `True` se aplicou via Alembic; `False` se o Alembic não está disponível
    (cabe ao chamador cair para `criar_tabelas`).
    """
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        return False
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    command.upgrade(cfg, "head")
    return True


def get_session() -> Iterator[Session]:
    """Dependency/contexto que abre e fecha uma sessão."""
    with SessionLocal() as sessao:
        yield sessao


def _main() -> None:
    import argparse

    from app.seed import semear_padroes

    parser = argparse.ArgumentParser(description="Inicializa o banco relacional.")
    parser.add_argument("--init", action="store_true", help="Aplica migrações e semeia padrões.")
    args = parser.parse_args()

    # Schema: Alembic (real) com fallback para create_all (Alembic ausente).
    if aplicar_migracoes():
        print(f"Schema via Alembic (upgrade head) em: {settings.database_url}")
        _backfill_visita_tecnicos(engine)
    else:
        migradas = criar_tabelas()
        print(f"Schema via create_all (Alembic ausente) em: {settings.database_url}")
        if migradas:
            print(f"Colunas migradas: {', '.join(migradas)}")
    if args.init:
        with SessionLocal() as sessao:
            criados = semear_padroes(sessao)
            sessao.commit()
        print(f"Padrões semeados: {criados}")


if __name__ == "__main__":
    _main()

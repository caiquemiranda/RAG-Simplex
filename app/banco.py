"""Painel ADM — card "Banco de dados": status e backup do banco relacional.

Router `/admin/banco` (perm. `gerir_usuarios`). Leitura do estado (arquivo, tamanho,
revisão de migração Alembic, contagem por tabela, blocos indexados no Chroma) e um
**backup** seguro (cópia do arquivo SQLite para `data/processed/backups/`).
Reindexação do guia continua em `POST /ingest` (perm. `ingerir`) — não duplicada aqui.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.auth import requer
from app.config import BASE_DIR, settings
from app.db import engine, get_session
from app.modelos import Usuario

router = APIRouter(prefix="/admin/banco", tags=["admin"])


class TabelaInfo(BaseModel):
    nome: str
    linhas: int


class MigracaoInfo(BaseModel):
    revisao_atual: str | None = None   # versão gravada no banco (alembic_version)
    revisao_head: str | None = None    # head das migrações no repositório
    em_dia: bool = False               # banco == head


class BancoStatus(BaseModel):
    backend: str                       # "sqlite" | "outro"
    caminho: str | None = None
    tamanho_bytes: int | None = None
    tabelas: list[TabelaInfo] = []
    migracao: MigracaoInfo
    blocos_indexados: int = 0          # Chroma (base vetorial)


class BackupOut(BaseModel):
    arquivo: str
    tamanho_bytes: int


def _caminho_sqlite() -> Path | None:
    """Caminho do arquivo SQLite, se o backend for SQLite em arquivo; senão None."""
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return Path(url.replace("sqlite:///", "", 1))
    return None


def _migracao() -> MigracaoInfo:
    """Revisão atual (no banco) vs head (no repo). Degrada para None se o Alembic faltar."""
    head: str | None = None
    atual: str | None = None
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory

        head = ScriptDirectory.from_config(Config(str(BASE_DIR / "alembic.ini"))).get_current_head()
    except Exception:
        head = None
    try:
        with engine.connect() as conn:
            linha = conn.execute(text("SELECT version_num FROM alembic_version")).first()
            atual = linha[0] if linha else None
    except Exception:
        atual = None
    return MigracaoInfo(revisao_atual=atual, revisao_head=head,
                        em_dia=atual is not None and atual == head)


@router.get("", response_model=BancoStatus)
def status_banco(_: Usuario = Depends(requer("gerir_usuarios")),
                 sessao: Session = Depends(get_session)) -> BancoStatus:
    insp = inspect(sessao.get_bind())
    tabelas: list[TabelaInfo] = []
    for nome in sorted(insp.get_table_names()):
        if nome == "alembic_version":
            continue
        try:
            n = sessao.execute(text(f'SELECT COUNT(*) FROM "{nome}"')).scalar() or 0
        except Exception:
            n = 0
        tabelas.append(TabelaInfo(nome=nome, linhas=int(n)))

    caminho = _caminho_sqlite()
    tamanho = caminho.stat().st_size if caminho and caminho.exists() else None

    try:
        from app.ingestao import get_collection
        blocos = get_collection(reset=False).count()
    except Exception:
        blocos = 0

    return BancoStatus(
        backend="sqlite" if caminho else "outro",
        caminho=str(caminho) if caminho else None,
        tamanho_bytes=tamanho,
        tabelas=tabelas,
        migracao=_migracao(),
        blocos_indexados=blocos,
    )


@router.post("/backup", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
def backup_banco(_: Usuario = Depends(requer("gerir_usuarios"))) -> BackupOut:
    caminho = _caminho_sqlite()
    if caminho is None or not caminho.exists():
        raise HTTPException(status_code=400,
                            detail="Backup disponível apenas para banco SQLite em arquivo.")
    destino_dir = caminho.parent / "backups"
    destino_dir.mkdir(parents=True, exist_ok=True)
    carimbo = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    destino = destino_dir / f"{caminho.stem}-{carimbo}.db"
    shutil.copy2(caminho, destino)
    return BackupOut(arquivo=destino.name, tamanho_bytes=destino.stat().st_size)

# Spec — D-022: Migrações Alembic + card "Banco de dados"

**Status:** ✅ Implementado · **Data:** 2026-06-25 · **Decisão:** [D-022](../DECISOES.md)

Adota **Alembic** como fonte de verdade do schema do **banco real** e implementa o card
**"Banco de dados"** do painel ADM (status + backup). Fecha a dívida de migração: a
micro-migração caseira (`_migrar_colunas`, só ALTER ADD de coluna nullable) não cobre
renomear/remover/constraint nem tem histórico auditável.

## Alembic
- **Estrutura:** `alembic.ini` + `alembic/env.py` + `alembic/versions/`.
- **`env.py`** usa `settings.database_url` (URL única do app) e `target_metadata =
  Base.metadata` (autogenerate). `render_as_batch=True` no SQLite (recria tabela quando
  preciso, já que o SQLite não faz `ALTER ... ALTER COLUMN`).
- **Baseline** `2bd03ef0fccf` = schema completo atual (17 tabelas). Banco real existente
  foi **`alembic stamp head`** (já tinha o schema via `create_all`).
- **`app/db.py`:** `aplicar_migracoes()` roda `upgrade head` (banco novo → cria da baseline;
  existente → aplica pendentes). `criar_tabelas()`/`create_all` permanece para **testes**
  (SQLite em memória) e **fallback** se o Alembic faltar. `python -m app.db --init` e
  `scripts/backend.ps1` aplicam via Alembic.
- **Fluxo de evolução:** `python -m alembic revision --autogenerate -m "..."` → revisar o
  arquivo gerado → `python -m alembic upgrade head`.

## Card "Banco de dados" (`app/banco.py`, `/admin/banco`)
- **`GET /admin/banco`** — `backend`, `caminho`, `tamanho_bytes`, `migracao`
  (`revisao_atual` × `revisao_head` + `em_dia`), `tabelas[]` (nome → linhas), `blocos_indexados`
  (Chroma). Perm. `gerir_usuarios`.
- **`POST /admin/banco/backup`** — copia o arquivo SQLite para `data/processed/backups/
  ragsimplex-AAAAMMDD-HHMMSS.db`; 400 se o backend não for SQLite em arquivo. Perm. `gerir_usuarios`.
- Reindexação do guia **não** é duplicada — continua em `POST /ingest` (perm. `ingerir`).

## Frontend
- `lib/api.ts`: tipos `BancoStatus`/`BancoBackup`; `api.admin.banco()` / `bancoBackup()`.
- `pages/Admin.tsx`: card **Banco de dados** carrega o status sob demanda; mostra migração
  (badge **em dia**/**pendente**), tamanho, tabelas com contagem e botão **Fazer backup**.

## Testes
- `tests/test_migracoes.py` (2): head única; `upgrade head` num banco vazio = tabelas dos
  modelos (sem drift). *Skip se Alembic ausente.*
- `tests/test_banco.py` (4): status (contagem por tabela, sem `alembic_version`); backup
  indisponível sem arquivo (400); backup copia o SQLite (201); RBAC (operador 403).
- Suíte: **88 passed**.

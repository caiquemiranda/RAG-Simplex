#!/bin/sh
# Prepara o backend e sobe a API: segredo → banco → admin → ingestão → uvicorn.
set -e

DATA_DIR=/app/data/processed
mkdir -p "$DATA_DIR"

# 1) Segredo (JWT + cifra). Usa o do ambiente ou gera e persiste no volume.
if [ -z "$RAG_SECRET_KEY" ]; then
  if [ -f "$DATA_DIR/secret.key" ]; then
    RAG_SECRET_KEY=$(cat "$DATA_DIR/secret.key")
  else
    RAG_SECRET_KEY=$(python -m app.cripto)
    echo "$RAG_SECRET_KEY" > "$DATA_DIR/secret.key"
    echo "[entrypoint] RAG_SECRET_KEY gerada e salva em $DATA_DIR/secret.key"
  fi
  export RAG_SECRET_KEY
fi

# 2) Banco relacional + papéis/permissões (idempotente).
python -m app.db --init

# 3) Admin inicial, se as variáveis estiverem definidas (idempotente).
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_SENHA" ]; then
  python -m app.auth --criar-admin "$ADMIN_EMAIL" "$ADMIN_SENHA" || true
fi

# 4) Indexa o guia se a coleção estiver vazia.
python - <<'PYEOF'
from app.ingestao import get_collection, indexar
try:
    total = get_collection(reset=False).count()
except Exception:
    total = 0
if total == 0:
    print("[entrypoint] Indexando a base de conhecimento…")
    print(f"[entrypoint] {indexar(reset=True)} blocos indexados.")
else:
    print(f"[entrypoint] Coleção já indexada ({total} blocos).")
PYEOF

# 5) Sobe a API.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

# Spec — Fase 4: Autenticação (JWT)

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Só técnicos cadastrados acessam o sistema. Login por e-mail/senha, tokens JWT
(access + refresh), dependency que protege rotas e auditoria das consultas.

## Componentes

### `app/auth.py`
- **Senhas (argon2):** `hash_senha` / `verificar_senha` (argon2-cffi; `verificar`
  nunca levanta — retorna `False` em falha).
- **JWT (PyJWT, HS256):** `criar_access_token(sub, papel)` (curto) e
  `criar_refresh_token(sub)` (longo); `decodificar_token` valida e levanta
  `TokenInvalido` (expirado/malformado). Segredo: `settings.jwt_secret` ou
  `settings.secret_key` como fallback.
- **Dependency `usuario_atual`:** lê o `Bearer` token, valida que é de **acesso**,
  carrega o `Usuario` ativo. 401 acionável em cada falha.
- **`criar_ou_atualizar_admin`** + CLI `python -m app.auth --criar-admin EMAIL SENHA`.

### `app/main.py` — endpoints e proteção
- `POST /auth/login` (JSON `{email, senha}`) → `{access_token, refresh_token}`.
  Usa corpo JSON (não OAuth2 form) para **não** exigir `python-multipart`.
- `POST /auth/refresh` (refresh → novo access). `GET /auth/me` (usuário + permissões).
- **Protegidas** com `usuario_atual`: `/ingest`, `/query`, `/query/stream`.
- **Integra a Fase 3:** em `/query`, a estratégia é resolvida por usuário/papel
  (`resolver_estrategia`) e cada consulta vira um **`LogConsulta`** (auditoria, PRD §6.2).

### `app/config.py`
- `jwt_secret`, `jwt_algorithm` (HS256), `access_token_expira_min` (60),
  `refresh_token_expira_dias` (7).

## Decisões (D-018)
- **argon2** para senha (recomendado), **PyJWT** para tokens, **login via JSON**
  (evita `python-multipart`).
- Acrescentado **`email-validator`** ao `requirements.txt`: o FastAPI carrega
  modelos OpenAPI (`Contact.email = EmailStr`) ao importar `fastapi.security`, e o
  pacote é obrigatório para a API subir.

## Testes (rodados — 33 passed total) — `tests/test_auth.py`
- Hash argon2: roundtrip; senha errada/`None` → False.
- Token: roundtrip (sub/tipo/papel); expirado e malformado → `TokenInvalido`.
- API (TestClient + SQLite em memória): login OK + `/auth/me`; senha errada → 401;
  rotas protegidas sem token → 401 (inclui `/query`); refresh emite novo access e
  refresh **não** vale como access.

## Ainda NÃO feito (Fase 5)
- RBAC: aplicar permissões por endpoint (`requer(...)`) e **filtrar camadas por papel**
  (operador → só 🟢). Hoje qualquer usuário autenticado acessa as rotas protegidas.

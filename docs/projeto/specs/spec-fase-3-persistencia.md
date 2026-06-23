# Spec — Fase 3: Persistência (SQLite) & configuração hierárquica

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Tirar a configuração do `.env` e dar base para o painel ADM: usuários, papéis,
permissões, provedores (chave cifrada), configuração de estratégia por escopo e
auditoria. Tudo **sem API key e sem custo** (SQLite local).

## Decisão-chave (D-016)

Usar **SQLAlchemy 2.0 diretamente** (não SQLModel): já vinha instalado com o Chroma
(zero dependência nova para baixar) e permite **rodar os testes offline** (SQLite em
memória). `cryptography` (Fernet) também já estava presente.

## Componentes

### `app/modelos.py` — ORM (SQLAlchemy 2.0 tipado)
- `Permissao` (chave única) e `Papel` (nome único) com N:N via `papel_permissao`.
  `Papel.tem_permissao(chave)` para checagem rápida.
- `Usuario` (email único, `hash_senha` nulo até a Fase 4, `ativo`, FK `papel`).
- `Provedor` (nome único; `api_key_cifrada` — **nunca** em texto claro; `ativo`).
- `ConfigEstrategia` (`escopo` global|papel|usuario, `alvo`, `estrategia`, `persona`,
  `camadas`, `provedor_id`; única por `(escopo, alvo)`).
- `LogConsulta` (auditoria: usuário, pergunta, estratégia, latência, custo, fallback, ts).

### `app/db.py` — engine, sessão, init
- `engine`/`SessionLocal` a partir de `settings.database_url`
  (padrão `sqlite:///data/processed/ragsimplex.db`).
- `criar_tabelas()` (idempotente) e `get_session()` (dependency p/ FastAPI na Fase 4).
- CLI: `python -m app.db --init` cria tabelas e semeia padrões.

### `app/seed.py` — padrões
- `PERMISSOES` (8): `consultar`, `consultar_stream`, `ingerir`, `ver_avaliacao`,
  `gerir_estrategias`, `gerir_usuarios`, `gerir_chaves`, `ver_auditoria`.
- `PAPEIS` (personas PRD §3): `Operador` (consultar), `Tecnico` (+stream),
  `Analista` (+ingerir, +ver_avaliacao), `Admin` (todas).
- Config global padrão = `local_extrativa`. `semear_padroes()` é **idempotente**.

### `app/cripto.py` — cifragem das chaves (Fernet)
- `gerar_chave_secreta()` (CLI `python -m app.cripto`), `cifrar`/`decifrar`,
  `mascarar` (exibe só os últimos 4 chars). Lê `settings.secret_key` (`RAG_SECRET_KEY`);
  erro acionável se ausente. Uso real das chaves só na Fase 10.

### `app/preferencias.py` — resolução hierárquica
- `resolver_estrategia(sessao, usuario_id, papel_nome, override)` com precedência
  **override → usuário → papel → global → `settings.estrategia_geracao`**.

## Config (`app/config.py`)
- `database_url` (SQLite por padrão) e `secret_key` (Fernet, vazio por padrão).

## Testes (rodados offline) — `tests/test_persistencia.py`
- Seed cria 4 papéis e a config global; Admin tem todas as permissões, Operador só
  `consultar`; seed **idempotente** (não duplica).
- Resolução respeita a precedência (usuário > papel > global; override vence tudo;
  banco vazio cai no `settings`).
- Cifragem: round-trip `cifrar`/`decifrar`; `mascarar`; erro claro sem `RAG_SECRET_KEY`.

**Validação executada:** `pytest` = **25 passed**; `python -m app.db --init` criou
8 permissões, 4 papéis, 1 config global. `.db` adicionado ao `.gitignore`.

## Ainda NÃO feito (próximas fases)
- Endpoints usando `get_session` + `usuario_atual` (Fase 4, auth).
- Aplicar RBAC nos endpoints e filtrar camadas por papel (Fase 5).
- Painel ADM para editar tudo isso (Fase 6/7).
- Gravar `LogConsulta` a cada `/query` (junto da auth, Fase 4/5).

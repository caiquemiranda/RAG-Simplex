# Spec — Fase 5: Autorização / RBAC

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Controlar **quem acessa o quê** e **adaptar a profundidade da resposta ao papel**:
operador (não-técnico) recebe só a linguagem simples; técnico/analista recebem
também a resolução técnica (PRD §3 e §5.2).

## Componentes

### Permissão efetiva (papel + extra) — `app/modelos.py`
- Nova tabela `usuario_permissao` (N:N) → permissões **extra** por usuário.
- `Usuario.tem_permissao(chave)` = permissões do **papel** ∪ permissões **extra**.
  Permite conceder acesso pontual **sem trocar o papel**.

### Dependency `requer(permissao)` — `app/auth.py`
- Fábrica de dependency do FastAPI: exige uma permissão; **403** se faltar.
- Aplicada nos endpoints:
  - `/ingest` → `requer("ingerir")` (Analista/Admin).
  - `/query` → `requer("consultar")`.
  - `/query/stream` → `requer("consultar_stream")`.

### Camadas por papel (resposta adaptativa)
- `app/estrategias.py`: a `Resposta` agora carrega `camadas` (dict ordenado:
  `aviso`, `titulo`, `simples`, `tecnica`, `trecho`, `relacionados`).
  `montar_texto(camadas, incluir)` remonta o markdown só com as camadas permitidas
  (aviso e título entram **sempre** — segurança).
- `app/preferencias.py`: `resolver_camadas(...)` → config explícita (`ConfigEstrategia.
  camadas`) **ou** padrão por papel (`Operador → {simples}`; demais → `{simples, tecnica}`).
- `app/main.py`: `/query` e `/query/stream` filtram o texto pelas camadas do papel e
  devolvem `camadas_exibidas`. O mapeamento: `tecnica` inclui também `trecho` e
  `relacionados`.

### Seed (`app/seed.py`)
- Config global agora **não** fixa `camadas` (fica `None`) → o padrão por papel vale
  (senão o global sobreporia o operador).

## Decisões (D-019)
- Permissões **extra por usuário** (além do papel) via `usuario_permissao`.
- Camadas por papel: **operador → só 🟢**; técnico/analista → 🟢 + 🔧 (+ trecho).
- `/query/stream` passou a **gerar a resposta e transmitir o texto já filtrado**
  (o streaming token a token de nuvem fica para a Fase 10).

## Testes (rodados — 39 passed) — `tests/test_rbac.py`
- `tem_permissao`: papel + **extra** (acesso sem trocar papel).
- `resolver_camadas` por papel (operador `{simples}`; técnico/analista ambos).
- `montar_texto` filtra corretamente (só simples vs completo).
- Endpoints (TestClient, RAG mockado): operador **bloqueado** em `/ingest` (403);
  analista **pode** ingerir (200); `/query` entrega **só 🟢 ao operador** e
  **🟢+🔧+📄 ao técnico**.

## Migração
A tabela `usuario_permissao` é nova: rode `python -m app.db --init` (idempotente) para
criá-la em bancos existentes.

## Ainda NÃO feito (Fase 6/7)
- Painel ADM (API) para gerir usuários, papéis, estratégia/camadas por usuário e
  permissões extra. Hoje isso é feito por seed/CLI/banco.

# ROADMAP — RAG-Simplex

Plano de evolução do RAG-Simplex de um MVP de backend para uma **plataforma
configurável com frontend React, múltiplas estratégias de geração, painel
administrativo e controle de acesso por usuário**.

> **Ordem revisada (D-012):** toda a parte que **depende de API key de LLM** foi
> empurrada para o **final** (Fase 10). Construímos primeiro a RAG **100% local e
> grátis** (estratégia extrativa) e só depois plugamos os provedores de nuvem.

**Legenda de status:** ⬜ Não iniciado · 🔄 Em andamento · ✅ Concluído · ⏸️ Pausado

| Fase | Tema | Depende de API? | Status |
| --- | --- | --- | --- |
| 0 | MVP RAG backend (pipeline + FastAPI) | — | ✅ |
| 1 | Sistema de documentação & planejamento | — | ✅ |
| 2 | Estratégia `LOCAL_EXTRATIVO` + interface plugável | ❌ Não | ✅ |
| 3 | Persistência (SQLite) & configuração hierárquica | ❌ Não | ✅ |
| 4 | Autenticação (JWT) | ❌ Não | ✅ |
| 5 | Autorização / RBAC (papéis e permissões) | ❌ Não | ⬜ |
| 6 | Painel ADM (API) | ❌ Não | ⬜ |
| 7 | Frontend React — base + autenticação + **Docker** (compose) | ❌ Não | ⬜ |
| 8 | Frontend — chat do técnico (dupla camada + streaming) | ❌ Não | ⬜ |
| 9 | Frontend — painel ADM | ❌ Não | ⬜ |
| 10 | **Estratégias de nuvem (Claude/Gemini/Groq) + Híbrido + Arena** | ✅ **Sim** | ⬜ |
| 11 | Avaliação de qualidade (RAGAS-lite) & hardening | parcial | ⬜ |

> Tudo até a Fase 9 roda no note fraco, **sem chave de API e sem custo**. A Fase 10
> é onde se adiciona a API key (guia em [`docs/CONFIGURAR_APIKEYS.md`](../CONFIGURAR_APIKEYS.md)).

---

## Fase 0 — MVP RAG backend ✅

**Objetivo:** pipeline RAG funcional ancorado no guia Simplex.

- [x] `app/config.py` — configuração central (threshold 0.78, modelos, paths)
- [x] `app/ingestao.py` — chunking por header `###` + metadados → ChromaDB (cosseno)
- [x] `app/recuperacao.py` — busca semântica com limiar e filtro de metadados
- [x] `app/geracao.py` — geração + dupla camada + fallback gracioso
- [x] `app/main.py` — FastAPI (`/health`, `/ingest`, `/query`, `/query/stream`)
- [x] Testes de parsing/filtros/fallback sem rede
- [x] Parser validado (73 blocos extraídos do guia)

📄 Spec: [`specs/spec-fase-0-backend-rag.md`](specs/spec-fase-0-backend-rag.md)

---

## Fase 1 — Sistema de documentação & planejamento ✅

**Objetivo:** retomar o projeto em janela nova sem carregar contexto.

- [x] `docs/projeto/{README,ROADMAP,ESTADO_ATUAL,LOG,DECISOES}.md`
- [x] `.claude/CLAUDE.md` com o protocolo de retomada
- [x] Validar: janela nova retoma lendo ≤ 3 arquivos (confirmado nas Fases 2–4)

📄 Spec: [`specs/spec-fase-1-documentacao.md`](specs/spec-fase-1-documentacao.md)

---

## Fase 2 — Estratégia `LOCAL_EXTRATIVO` + interface plugável ✅

**Objetivo:** RAG respondendo **sem LLM e sem custo** — renderiza o bloco
recuperado em template de dupla camada. Deixa a porta aberta para as estratégias
de nuvem entrarem na Fase 10 sem reescrever nada.

- [x] `app/estrategias.py` — interface `EstrategiaGeracao` (entrada: recuperação → saída: `Resposta` + métricas)
- [x] `LocalExtrativa` — separa 🟢 simples / 🔧 técnica a partir dos marcadores do bloco; aviso de segurança automático; sem rede
- [x] Registro/seleção de estratégia (`obter_estrategia`) + `settings.estrategia_geracao` (padrão = `local_extrativa`)
- [x] `app/geracao.py` vira **orquestrador** (resolve a estratégia e delega); API mantida para `main.py`
- [x] Métricas na `Resposta`: `estrategia`, `latencia_ms`, `custo_estimado` (=0 no local), `fontes`, `fallback`

**Testes (todos offline):**
- [x] `LocalExtrativa` renderiza dupla camada a partir de um bloco mock
- [x] Aviso de segurança aparece quando severidade Alta/Crítica ou termos de risco
- [x] Fallback gracioso quando nada atinge o limiar
- [x] `obter_estrategia` respeita o padrão do config e erra claro em nome inválido

> Validação offline executada (render real do bloco `Head Missing`, ~1 ms, custo 0).
> A execução end-to-end (`python -m app.geracao "HEAD MISSING"`) depende de
> `pip install -r requirements.txt` + `python -m app.ingestao --reset` (passo do usuário).

**DoD:** ✅ lógica implementada e validada offline; resposta em dupla camada sem API key.

📄 Spec: [`specs/spec-fase-2-local-extrativo.md`](specs/spec-fase-2-local-extrativo.md)

---

## Fase 3 — Persistência (SQLite) & configuração hierárquica ✅

**Objetivo:** tirar config/usuários do `.env`; permitir edição em runtime.

- [x] SQLite + modelos **SQLAlchemy 2.0** (sem SQLModel — D-016)
- [x] Entidades: `Usuario`, `Papel`, `Permissao`, `Provedor` (key cifrada), `ConfigEstrategia`, `LogConsulta`
- [x] Resolução hierárquica: override → usuário → papel → global (`preferencias.py`)
- [x] Chaves de API **cifradas em repouso** (`cripto.py`, Fernet; uso só na Fase 10)
- [x] Seed de papéis/permissões/config global (`seed.py`); CLI `python -m app.db --init`

**Testes (rodados — 25 passed):**
- [x] Precedência de resolução de estratégia correta
- [x] Cifra/decifra de chave ida e volta + máscara + erro sem chave
- [x] Seed cria o schema/dados e é idempotente

**DoD:** ✅ estratégia por usuário resolvida a partir do banco.

📄 Spec: [`specs/spec-fase-3-persistencia.md`](specs/spec-fase-3-persistencia.md)

---

## Fase 4 — Autenticação (JWT) ✅

- [x] Login usuário/senha com hash **argon2** (`auth.py`)
- [x] Emissão/validação de JWT (access + refresh, PyJWT HS256)
- [x] Dependency `usuario_atual`; seed de admin (`--criar-admin`)
- [x] `/auth/login`, `/auth/refresh`, `/auth/me`; `/query`,`/query/stream`,`/ingest` protegidos
- [x] Integra Fase 3: estratégia por usuário + `LogConsulta` em `/query`

**Testes (rodados — 33 passed):**
- [x] senha certa/errada (argon2)
- [x] endpoint protegido nega sem token; aceita com token válido
- [x] token expirado/malformado rejeitado; refresh ≠ access

**DoD:** ✅ `/query` exige login.

📄 Spec: [`specs/spec-fase-4-auth.md`](specs/spec-fase-4-auth.md)

---

## Fase 5 — Autorização / RBAC ⬜

- [ ] Papéis: `Operador`, `Tecnico`, `Analista`, `Admin` (personas PRD §3)
- [ ] Permissões granulares + dependency `requer(permissao)`
- [ ] Camadas filtradas por papel (operador → só 🟢 linguagem simples)

**Testes:** [ ] operador bloqueado em endpoint admin · [ ] operador não recebe camada técnica · [ ] permissão extra sem trocar papel

**DoD:** matriz papel×permissão aplicada em todos os endpoints.

---

## Fase 6 — Painel ADM (API) ⬜

- [ ] CRUD de usuários e atribuição de papel
- [ ] Atribuir estratégia/persona/camadas por usuário
- [ ] Ligar/desligar estratégias; definir padrão global
- [ ] Consulta de auditoria (`LogConsulta`)
- [ ] (Cadastro de provedores/chaves — campo pronto, ativado na Fase 10)

**Testes:** [ ] admin troca estratégia de um técnico e vale na próxima consulta · [ ] não-admin barrado · [ ] chave nunca retorna em claro

**DoD:** plataforma administrável via API.

---

## Fase 7 — Frontend React: base + autenticação + **containerização** ⬜

- [ ] Scaffold Vite + React + TypeScript + Tailwind (D-010)
- [ ] Cliente HTTP + token; login; rotas protegidas; logout
- [ ] Layout base (navegação por papel)

**Docker (D-017) — orquestrar backend + frontend juntos:**
- [ ] `Dockerfile` do backend (FastAPI + Chroma embarcado + SQLite + e5); **modelo e5
      pré-cacheado** na imagem (evita download em runtime/SSL)
- [ ] `Dockerfile` do frontend (build + nginx servindo estático)
- [ ] `docker-compose.yml`: serviços `backend` e `frontend`; **volumes** para cache do
      modelo e `data/` (Chroma + SQLite persistentes)
- [ ] `.dockerignore`; `docker compose up` sobe tudo de uma vez
- [ ] Chroma/SQLite seguem **embarcados** (não viram serviço próprio agora)

**Testes:** [ ] build sem erros · [ ] login redireciona · [ ] rota protegida bloqueia sem token · [ ] `docker compose up` sobe backend+frontend e o login funciona

**DoD:** login real contra a API; `docker compose up` levanta o app completo.

---

## Fase 8 — Frontend: chat do técnico ⬜

- [ ] Tela de consulta; render da **dupla camada** com destaque do aviso de segurança
- [ ] **Streaming** na UI; exibição das fontes (similaridade)
- [ ] Camadas conforme papel; feedback 👍/👎

**Testes:** [ ] dupla camada renderiza · [ ] aviso aparece quando presente · [ ] fallback claro

**DoD:** técnico pergunta e recebe resposta formatada com fontes (usando o extrativo).

---

## Fase 9 — Frontend: painel ADM ⬜

- [ ] Gestão de usuários/papéis; atribuição de estratégia/persona por usuário
- [ ] Visualização da auditoria
- [ ] (Arena e gestão de chaves entram quando a Fase 10 existir)

**Testes:** [ ] admin troca estratégia pela UI e reflete no backend · [ ] telas ADM invisíveis a não-admin

**DoD:** administração de usuários/estratégias pela interface.

---

## Fase 10 — Estratégias de nuvem + Híbrido + Arena ⬜ (requer API key)

**Objetivo:** plugar os LLMs de nuvem. **Aqui** se adiciona a API key — ver
[`docs/CONFIGURAR_APIKEYS.md`](../CONFIGURAR_APIKEYS.md).

- [ ] Abstração de provedor (`Claude`, `Gemini`, `Groq`) atrás de uma interface
- [ ] `LLM_NUVEM` (provedor configurável) plugando na interface da Fase 2
- [ ] `HIBRIDO_A_C` (extrativo por padrão; escala p/ LLM quando precisa sintetizar)
- [ ] Gestão de chaves no painel ADM (cifradas) + seleção por usuário
- [ ] **Modo Avaliação / Arena**: `POST /avaliacao` roda várias estratégias na mesma
      pergunta e retorna **separadas** + métricas (latência, custo, fontes)
- [ ] Frontend: tela de arena (lado a lado) + gestão de chaves

**Testes:** [ ] provedor mockado valida prompt · [ ] arena retorna N resultados separados · [ ] erro claro se estratégia de nuvem sem chave

**DoD:** as 3 estratégias coexistem; arena compara lado a lado.

---

## Fase 11 — Avaliação de qualidade & hardening ⬜

- [ ] Conjunto de avaliação (perguntas de especialistas — PRD §7)
- [ ] Métricas de *faithfulness*/recall (RAGAS-lite ou LLM-as-judge)
- [ ] Agregação do feedback 👍/👎 por estratégia
- [ ] Hardening: TLS, rate limit, auditoria revisada, rotação de chaves
- [ ] Documentação final de operação

**Testes:** [ ] pipeline de avaliação gera placar por estratégia · [ ] faithfulness do `LOCAL_EXTRATIVO` ≈ 100%

**DoD:** placar de qualidade + checklist de hardening cumprido.

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
| 5 | Autorização / RBAC (papéis e permissões) | ❌ Não | ✅ |
| 6 | Painel ADM (API) | ❌ Não | ✅ |
| 7 | Frontend React — base + autenticação + **Docker** (compose) | ❌ Não | 🔄 |
| 8 | Frontend — chat do técnico (dupla camada + streaming) | ❌ Não | 🔄 |
| 9 | Frontend — painel ADM | ❌ Não | 🔄 |
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

## Fase 5 — Autorização / RBAC ✅

- [x] Papéis: `Operador`, `Tecnico`, `Analista`, `Admin` (personas PRD §3; seed da Fase 3)
- [x] Permissões granulares + dependency `requer(permissao)` nos endpoints
- [x] Permissão **extra por usuário** (sem trocar papel) — `usuario_permissao`
- [x] Camadas filtradas por papel (operador → só 🟢 linguagem simples)

**Testes (rodados — 39 passed):**
- [x] operador bloqueado em endpoint privilegiado (`/ingest` 403); analista pode (200)
- [x] operador não recebe camada técnica (`/query` só 🟢)
- [x] permissão extra concede acesso sem trocar papel

**DoD:** ✅ matriz papel×permissão aplicada nos endpoints; resposta adaptada ao papel.

📄 Spec: [`specs/spec-fase-5-rbac.md`](specs/spec-fase-5-rbac.md)

---

## Fase 6 — Painel ADM (API) ✅

- [x] CRUD de usuários e atribuição de papel (`/admin/usuarios`)
- [x] Atribuir estratégia/persona/camadas por usuário (`/admin/usuarios/{id}/estrategia`)
- [x] Listar estratégias; definir padrão global (`/admin/config-global`)
- [x] Permissões extra por usuário (`/admin/usuarios/{id}/permissoes-extra`)
- [x] Consulta de auditoria (`/admin/auditoria`)
- [x] Cadastro de provedores/chaves **cifradas** (`/admin/provedores`, uso na Fase 10)

**Testes (rodados — 44 passed):**
- [x] admin troca estratégia de um técnico e vale na próxima consulta dele
- [x] não-admin barrado (403)
- [x] chave nunca retorna em claro (só máscara)

**DoD:** ✅ plataforma administrável via API.

📄 Spec: [`specs/spec-fase-6-admin.md`](specs/spec-fase-6-admin.md)

---

## Fase 7 — Frontend React: base + autenticação + **containerização** 🔄

- [x] Scaffold Vite + React + TypeScript + Tailwind (D-010), pronto p/ shadcn/ui
- [x] Cliente HTTP + token; login; rotas protegidas; logout
- [x] Layout base (navegação por papel); CORS no backend
- [ ] Validar build na máquina do dev (`npm install && npm run dev`) — npm bloqueado aqui

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

## Fase 8 — Frontend: chat do técnico 🔄

- [x] Interface de **chat** (histórico rolável + input fixo, estilo ChatGPT/Claude)
- [x] Render de **markdown** da dupla camada (`react-markdown` + typography)
- [x] **Aviso de segurança em destaque** (caixa vermelha via blockquote customizado)
- [x] Exibição das fontes (similaridade) e das camadas exibidas
- [x] **Citações clicáveis + split-screen**: clicar numa fonte abre o guia ao lado,
      rolado e destacado no trecho exato (endpoints `/documentos`; multi-documento)
- [ ] **Streaming** (`/query/stream`) na UI
- [ ] Feedback 👍/👎 (precisa de endpoint no backend)

**Testes (na máquina do dev — npm bloqueado aqui):** [ ] dupla camada renderiza · [ ] aviso em destaque · [ ] fallback claro

**DoD:** técnico pergunta e recebe resposta formatada (markdown), com fontes.

---

## Fase 9 — Frontend: painel ADM 🔄

- [x] **CRUD de usuários** (criar/editar, papel, ativo, reset de senha) — página `/admin`
- [x] **Gestão de permissões**: papel + permissões **extra** por usuário (checkboxes)
- [x] Catálogos no backend (`/admin/papeis`, `/admin/permissoes`) p/ os seletores
- [x] Link "Admin" e página visíveis só com `gerir_usuarios`
- [ ] Atribuição de estratégia/persona por usuário pela UI
- [ ] Visualização da auditoria
- [ ] (Arena e gestão de chaves entram quando a Fase 10 existir)

**Testes:** backend `/admin/papeis|permissoes` (50 passed); UI não testada aqui (npm bloqueado).

**DoD:** administração de usuários/permissões pela interface (estratégia/auditoria pendentes).

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

- [ ] **Cross-encoder reranker** p/ discriminar fora-da-base × válido (D-020)
- [ ] Conjunto de avaliação (perguntas de especialistas — PRD §7)
- [ ] Métricas de *faithfulness*/recall (RAGAS-lite ou LLM-as-judge)
- [ ] Agregação do feedback 👍/👎 por estratégia
- [ ] Hardening: TLS, rate limit, auditoria revisada, rotação de chaves
- [ ] Documentação final de operação

**Testes:** [ ] pipeline de avaliação gera placar por estratégia · [ ] faithfulness do `LOCAL_EXTRATIVO` ≈ 100%

**DoD:** placar de qualidade + checklist de hardening cumprido.

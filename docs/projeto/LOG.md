# Log do Projeto — RAG-Simplex

Histórico **append-only** do que foi feito. Entrada mais recente no topo. Não
reescrever entradas antigas — apenas adicionar. Para o "onde estou agora", use
[`ESTADO_ATUAL.md`](ESTADO_ATUAL.md).

Formato de cada entrada:
`## AAAA-MM-DD — Fase N — título` · o que foi feito · decisões · arquivos.

---

## 2026-06-23 — D-015 — Busca híbrida (bônus léxico) p/ otimizar respostas

**Branch:** `feat/fase-7-frontend`.

**Problema (medido na base real):** "falha head missing" trazia "Node Missing/Failed"
em #1 (0.882) e "Head Missing" só em #3 (0.868) — e5 confunde termos parecidos.

**Feito:**
- `recuperacao.py`: busca **híbrida**. Recupera um pool (`rerank_pool=10`) por vetor,
  soma **bônus aditivo** `lexical_boost*cobertura` dos termos do display
  (`termo_en`/`header`) e reordena. `Resultado` agora expõe `sim_vetorial`/`sim_lexical`.
- `config.py`: `lexical_boost=0.12`, `rerank_pool=10`.
- Testes: `_tokens`/`_score_lexical` + reordenação (3 novos) → `pytest` = **53 passed**.

**Resultado (medido):** bloco correto vira #1 com folga — "head missing" (0.943 vs
0.881), "cabeçote ausente" (0.995), "no answer" (0.973), "warm start" (1.000).

**Limiar:** mantido **0.78** (o `--diagnostico` sugeriu 0.94, mas seus positivos
tinham o termo do display; coloquial ~0.88 seria rejeitado). Discriminar
fora-da-base × válido exige reranker → **D-020 (Fase 11)**.

**Arquivos:** `app/{recuperacao,config}.py`, `tests/test_recuperacao.py`,
`docs/projeto/DECISOES.md`.

---

## 2026-06-23 — Fase 9 (parte 1) — Painel ADM: CRUD de usuários + permissões

**Branch:** `feat/fase-7-frontend`.

**Pedido:** como admin, gerenciar usuários (CRUD) e setar suas permissões.

**Feito (backend, testado):**
- `admin.py`: `GET /admin/papeis` (com permissões de cada papel) e `GET /admin/permissoes`
  (catálogo) — `requer("gerir_usuarios")`, para alimentar os seletores da UI.
- `tests/test_admin.py`: catálogos + bloqueio de não-admin → `pytest` = **50 passed**.

**Feito (frontend, não testado aqui):**
- `pages/Admin.tsx`: lista de usuários (tabela), criar usuário, editar (nome, papel,
  ativo, reset de senha) e **gerir permissões** — checkboxes; as do papel vêm
  marcadas/“(papel)” e as demais são **extra** (PUT `/permissoes-extra`).
- `lib/api.ts`: bloco `admin` (usuarios/criar/atualizar/permissoes-extra/papeis/permissoes).
- Rota `/admin` + link "Admin" no `Layout` (só com `gerir_usuarios`); guarda na página.

**Próximo:** validar UI no browser; atribuição de estratégia/persona e auditoria
pela UI (resto da Fase 9). Depois: streaming/feedback (Fase 8), D-015, Docker.

**Arquivos:** `app/admin.py`, `tests/test_admin.py`,
`frontend/src/{pages/Admin,lib/api,App,components/Layout}.tsx`.

---

## 2026-06-23 — Fase 8 (parte 2) — Citações clicáveis + split-screen

**Branch:** `feat/fase-7-frontend`.

**Pedido:** links no texto que, ao clicar, abrem o **documento ao lado** (metade
chat, metade guia), rolado e **destacado** no trecho exato; pronto p/ multi-documento.

**Feito (backend, testado):**
- `ingestao.documentos_indexados()` — fontes distintas na coleção (docs que o
  assistente pesquisa), sem usar o modelo.
- `main`: `GET /documentos` (lista) e `GET /documentos/{nome}` (markdown do guia),
  ambos `requer("consultar")`, com guarda contra path traversal (só `.md` indexado).
- `tests/test_documentos.py` (5 casos) → `pytest` = **49 passed**.

**Feito (frontend, não testado aqui):**
- `lib/api.ts`: `documentos()` / `documento(nome)`.
- `components/DocumentoPanel.tsx`: carrega o guia, divide em seções por cabeçalho,
  rola e **destaca** (amarelo) a seção cujo slug casa com a fonte clicada.
- `pages/Consulta.tsx`: layout **split** (chat 1/2 + documento 1/2); fontes viram
  **chips clicáveis** que abrem o documento no trecho.

**Matching fonte↔seção:** `slug(header)` aplicado igualmente nos dois lados
(consistente; acentos viram '-' — sem regex de combinantes).

**Próximo:** validar no browser; depois streaming/feedback (resto da Fase 8); D-015.

**Arquivos:** `app/{main,ingestao}.py`, `tests/test_documentos.py`,
`frontend/src/{lib/api,components/DocumentoPanel,pages/Consulta}.tsx`.

---

## 2026-06-23 — Fase 8 (parte 1) — Chat + markdown na resposta

**Branch:** `feat/fase-7-frontend` (continuação).

**Contexto:** frontend já subiu e funciona (login + consulta). Usuário pediu layout
de **chat** (estilo ChatGPT/Claude) e **renderização do markdown**.

**Feito:**
- `Consulta.tsx` reescrita como **chat**: histórico rolável (bolhas usuário/assistente)
  + input fixo no rodapé + auto-scroll + estado "Consultando…".
- `components/Markdown.tsx`: `react-markdown` + `remark-gfm` + tipografia Tailwind;
  blockquote com **AVISO DE SEGURANÇA** vira caixa de alerta vermelha em destaque.
- `Layout.tsx` em altura cheia (`h-screen` flex-col) p/ o input fixar embaixo;
  `Home.tsx` ajustado p/ rolagem própria.
- Deps: `react-markdown`, `remark-gfm`, `@tailwindcss/typography` (plugin no tailwind).

**Validação:** **não testado aqui** (npm bloqueado). Requer `npm install` (deps novas)
+ `npm run dev`. Revisão por leitura.

**Observação:** a busca trouxe "Node Missing" como #1 para "head missing" — é a
calibração de recuperação (**D-015**, pendente), independente do layout.

**Próximo:** validar build; depois streaming + feedback (resto da Fase 8) e Docker.

**Arquivos:** `frontend/src/{pages/Consulta,pages/Home,components/Layout,components/Markdown}.tsx`,
`frontend/package.json`, `frontend/tailwind.config.js`.

---

## 2026-06-23 — Fase 7 (parte 1) — Frontend React: base + auth

**Branch:** `feat/fase-7-frontend`.

**Feito:**
- Scaffold `frontend/` — Vite + React + TS + Tailwind, pronto p/ shadcn/ui (alias
  `@/`, `cn()`, variáveis CSS de tema). Componentes UI base: button/input/label/card.
- Auth: `AuthContext` (entrar/sair, valida sessão via `/auth/me`, token no
  localStorage), `ProtectedRoute`, `Layout` com navegação por papel.
- Páginas: `Login`, `Home` (usuário/permissões), `Consulta` (consulta básica a `/query`).
- Cliente HTTP `lib/api.ts` com tipos da API.
- Backend: **CORS** (`CORSMiddleware`) + `settings.cors_origins` (`RAG_CORS_ORIGINS`).
- `.gitignore` raiz ignora `frontend/node_modules` e `frontend/dist`.

**Decisões aplicadas:** D-010 (Vite+React+TS+Tailwind+shadcn).

**Validação:** backend `pytest` = **44 passed** (com CORS). Frontend **não testado
aqui** (npm bloqueado por SSL corporativo) — revisão por leitura; build roda na
máquina do dev.

**Próximo:** validar build do frontend; depois Docker (D-017); Fase 8 (chat).

**Arquivos:** `frontend/**`, `app/{main,config}.py`, `.gitignore`,
`docs/projeto/specs/spec-fase-7-frontend.md`.

---

## 2026-06-23 — Fase 6 — Painel ADM (API)

**Branch:** `feat/fase-6-admin` (sobre a 5).

**Feito:**
- `app/admin.py`: router `/admin` (incluído no `main`). Endpoints (todos com
  `requer(...)`):
  - Usuários: listar/criar/obter/atualizar + permissões extra (`gerir_usuarios`).
  - Estratégia: listar disponíveis, definir por usuário e global (`gerir_estrategias`).
  - Auditoria: `LogConsulta` recentes (`ver_auditoria`).
  - Provedores: gravar chave **cifrada** + listar **mascarada** (`gerir_chaves`).
- `main.py`: `app.include_router(admin_router)`.

**Validação (rodada aqui):** `pytest` = **44 passed** (5 novos). Confirma: não-admin
barrado; troca de estratégia vale na próxima consulta; auditoria registra; chave
nunca em claro.

**Próximo:** Fase 7 — Frontend React (base + auth) + Docker (D-017). Confirmar D-010.

**Arquivos:** `app/admin.py`, `app/main.py`, `tests/test_admin.py`,
`docs/projeto/specs/spec-fase-6-admin.md`.

---

## 2026-06-23 — Fase 5 — Autorização / RBAC

**Branch:** `feat/fase-5-rbac` (sobre a 4).

**Feito:**
- `modelos.py`: tabela `usuario_permissao` + `Usuario.permissoes_extra` +
  `Usuario.tem_permissao` (papel ∪ extra).
- `auth.py`: dependency `requer(permissao)` (403 se faltar).
- `estrategias.py`: `Resposta.camadas` (dict ordenado) + `montar_texto(camadas, incluir)`;
  `LocalExtrativa` agora monta seções e o texto via elas.
- `preferencias.py`: `resolver_camadas` (config explícita ou padrão por papel;
  operador → só `simples`).
- `main.py`: `/ingest`→`requer("ingerir")`, `/query`→`consultar`,
  `/query/stream`→`consultar_stream`; filtra camadas por papel e devolve
  `camadas_exibidas`. `/query/stream` agora transmite o texto já filtrado.
- `seed.py`: global sem `camadas` fixo (deixa o padrão por papel valer).

**Decisão:** D-019 (permissão extra por usuário + camadas por papel).

**Validação (rodada aqui):** `pytest` = **39 passed** (6 novos de RBAC, RAG mockado
nos endpoints). Sem warnings.

**Próximo:** Fase 6 — Painel ADM (API). Schema novo → `python -m app.db --init`.

**Arquivos:** `app/{modelos,auth,estrategias,preferencias,main,seed}.py`,
`tests/test_rbac.py`, `docs/projeto/specs/spec-fase-5-rbac.md`.

---

## 2026-06-23 — Fase 4 — Autenticação (JWT)

**Branch:** `feat/fase-4-auth` (sobre a 3).

**Feito:**
- `app/auth.py`: hash **argon2**, tokens **PyJWT HS256** (access+refresh),
  `usuario_atual`, `criar_ou_atualizar_admin` + CLI `--criar-admin`.
- `main.py`: `/auth/login` (JSON), `/auth/refresh`, `/auth/me`; `/query`,
  `/query/stream`, `/ingest` protegidos. Em `/query`, estratégia resolvida por
  usuário (Fase 3) + gravação de `LogConsulta` (auditoria).
- `config.py`: `jwt_secret`, `jwt_algorithm`, expirações.
- `requirements.txt`: +PyJWT, +argon2-cffi, **+email-validator** (D-018: FastAPI
  carrega `Contact.email=EmailStr` ao importar `fastapi.security`).

**Decisão:** D-018 (argon2 + PyJWT + login JSON; email-validator obrigatório).

**Validação (rodada aqui):** `pytest` = **33 passed** (8 novos, inclui TestClient
com SQLite em memória); `python -m app.auth --criar-admin` criou admin id=1.
`email-validator` instalado no ambiente (pip funcionou; só HF/GitHub tinham SSL).

**Próximo:** Fase 5 — Autorização / RBAC.

**Arquivos:** `app/{auth,main,config}.py`, `tests/test_auth.py`, `requirements.txt`,
`docs/projeto/specs/spec-fase-4-auth.md`.

---

## 2026-06-23 — Fase 3 — Persistência (SQLite) & config hierárquica

**Branch:** `feat/fase-3-persistencia`.

**Feito:**
- Decisão D-016: usar **SQLAlchemy 2.0 direto** (já instalado; sem SQLModel) → testes
  rodam offline.
- `app/modelos.py`: `Usuario`, `Papel`, `Permissao` (N:N), `Provedor` (key cifrada),
  `ConfigEstrategia` (escopo global/papel/usuario), `LogConsulta` (auditoria).
- `app/db.py`: engine/sessão SQLite + `criar_tabelas` + `get_session` + CLI `--init`.
- `app/seed.py`: 8 permissões, 4 papéis (personas PRD §3), config global = local; idempotente.
- `app/cripto.py`: Fernet (`cifrar`/`decifrar`/`mascarar`/`gerar_chave_secreta`).
- `app/preferencias.py`: resolução override→usuário→papel→global→settings.
- `config.py`: `database_url`, `secret_key`. `requirements.txt`: +SQLAlchemy +cryptography.
- `.gitignore`: ignora `data/processed/*.db`.

**Validação (rodada aqui):** `pytest` = **25 passed** (7 novos de persistência);
`python -m app.db --init` → 8 permissões, 4 papéis, 1 config global.

**Também nesta sessão (Fase 2 +):** trecho do guia na íntegra na resposta e em
`fontes[].trecho` (commit `773af51`).

**Próximo:** Fase 4 — Autenticação (JWT). Pendência aberta: calibrar limiar (D-015).

**Arquivos:** `app/{modelos,db,seed,cripto,preferencias,config}.py`,
`tests/test_persistencia.py`, `requirements.txt`, `.gitignore`,
`docs/projeto/specs/spec-fase-3-persistencia.md`.

---

## 2026-06-23 — Fase 2 (calibração) — e5 confirmado; calibrando o limiar

**Resultado do e5 (reingestão do usuário):** ranking **corrigido** — bloco certo é
o #1 em todas as consultas reais (Head Missing 0.893; Warm Start 0.915; Short
Circuit 0.900; No Answer/Bad Answer cluster 0.88–0.90). Positivos top-1: mín 0.848,
média 0.887.

**Novo achado:** o e5 comprime os scores no alto (tudo 0.84–0.92), inclusive blocos
fracos → 0.78 ficou **baixo demais** como porteiro de "fora da base".

**Feito:**
- `--diagnostico` reescrito: grupos `_CONSULTAS_NA_BASE` (positivos) e
  `_CONSULTAS_FORA_DA_BASE` (negativos: outra marca, fora de domínio); calcula
  min(pos)/max(neg) e **recomenda** o limiar (ou avisa sobreposição).
- Telemetria do Chroma: env vars `ANONYMIZED_TELEMETRY`/`CHROMA_TELEMETRY_IMPL`
  setadas antes do import (tentativa de silenciar os erros de protobuf/posthog).

**Pendente:** usuário roda `--diagnostico` (sem reingerir) → cravar o limiar (D-015).

**Arquivos:** `app/recuperacao.py`, `app/ingestao.py`.

---

## 2026-06-23 — Fase 2 (ajuste) — Troca do modelo de embeddings (recuperação)

**Contexto:** ao rodar de verdade (deps instaladas), a ingestão funcionou (73
blocos, 18/18 testes), mas consultas óbvias caíam em fallback.

**Diagnóstico (scores reais com MiniLM):** `"cabeçote ausente"` → bloco correto só
0.390; `"HEAD MISSING no loop do 4100"` → bloco errado (No Answer 0.536) acima do
correto (Head Missing 0.515). Logo: problema é o **modelo**, não o limiar.

**Feito:**
- Trocado o embedding para **`intfloat/multilingual-e5-small`** com prefixos
  `query:`/`passage:` (`embed_documentos`/`embed_consulta` em `ingestao.py`; `config`).
- `recuperacao.py` usa `embed_consulta`; adicionado `--diagnostico` (bateria de
  consultas + estatísticas para calibrar o limiar).
- Telemetria do Chroma desligada (`anonymized_telemetry=False`) → fim dos erros de
  protobuf/telemetry.
- Decisão D-014 registrada; D-002 (MiniLM) marcada como substituída.

**Validação:** sintaxe OK; 18/18 testes offline passam. Scores do e5 **pendentes**
(meu ambiente não baixa modelos por SSL) → usuário reingere e roda `--diagnostico`.

**Próximo:** calibrar o limiar com os números do e5; depois Fase 3.

**Arquivos:** `app/{config,ingestao,recuperacao}.py`.

---

## 2026-06-23 — Fase 2 — Estratégia LOCAL_EXTRATIVO + interface plugável

**Feito:**
- `app/estrategias.py` (novo): interface `EstrategiaGeracao`, `Resposta` (com
  métricas), `LocalExtrativa` (dupla camada sem LLM, aviso de segurança automático,
  blocos relacionados), registro `ESTRATEGIAS` + `obter_estrategia`.
- `app/geracao.py` refatorado para **orquestrador**; API pública mantida para
  `main.py`; `ClaudeNuvem` movida para cá, registrada porém **inerte** até a Fase 10.
- `app/config.py`: `estrategia_geracao` (padrão `local_extrativa`) + `extrativo_max_relacionados`.
- Testes: `tests/test_estrategias.py` (7 casos offline) e `test_geracao.py` atualizado.
- Docs: `docs/CONFIGURAR_APIKEYS.md` (guia para a Fase 10) e specs
  `docs/projeto/specs/spec-fase-0-backend-rag.md` e `spec-fase-2-local-extrativo.md`.
- ROADMAP **reordenado**: tudo que depende de API key → Fase 10.

**Decisões:** D-012 (API no final), D-013 (separação de camadas por marcadores).

**Validação:** render real do bloco `Head Missing` (dupla camada correta, ~1 ms,
custo 0); aviso por severidade; fallback OK — tudo **sem rede/API** (stub de config).

**Próximo:** Fase 3 — Persistência (SQLite) & config hierárquica.

**Arquivos:** `app/{estrategias,geracao,config}.py`, `tests/test_{estrategias,geracao}.py`,
`docs/CONFIGURAR_APIKEYS.md`, `docs/projeto/specs/*`.

---

## 2026-06-23 — Fase 1 — Sistema de documentação & planejamento

**Feito:**
- Criada a pasta `docs/projeto/` com o sistema de governança do projeto.
- `README.md` define o protocolo de retomada (sessão nova lê ≤ 3 arquivos).
- `ROADMAP.md` com 12 fases (0–11), objetivos, testes e status por fase.
- `ESTADO_ATUAL.md` como ponteiro "você está aqui".
- `LOG.md` (este) e `DECISOES.md` (D-001 a D-011) iniciados.
- `.claude/CLAUDE.md` atualizado com o protocolo de retomada (carregado em toda sessão).
- Fase 1 marcada como ✅ no ROADMAP.

**Decisões:** ver `DECISOES.md` (D-001 a D-011).

**Próximo:** iniciar Fase 2 — Estratégias de geração (`LOCAL_EXTRATIVO` primeiro).

**Arquivos:** `docs/projeto/{README,ROADMAP,ESTADO_ATUAL,LOG,DECISOES}.md`,
`docs/projeto/fases/.gitkeep`, `.claude/CLAUDE.md`.

---

## 2026-06-23 — Fase 0 — MVP RAG backend

**Feito:**
- Estrutura do projeto e pipeline RAG completo:
  `config`, `ingestao` (chunking por header `###` → ChromaDB cosseno),
  `recuperacao` (threshold 0.78 + filtros), `geracao` (Claude `claude-opus-4-8`,
  dupla camada, fallback gracioso), `main` (FastAPI).
- Testes de parsing, classificação de metadados, filtros e fallback (sem rede).
- `.claude/` (CLAUDE.md, settings.json, rules), `requirements.txt`, `.env.example`,
  `.gitignore`, README.
- Parser validado contra o guia real: **73 blocos**, IDs únicos, distribuição por
  sistema coerente (4100=27, QE90=31, REDE=10, F3200=3).

**Decisões:** ChromaDB + sentence-transformers (local, multilíngue) + Claude + FastAPI.

**Arquivos:** `app/*`, `tests/*`, `.claude/*`, `requirements.txt`, `README.md`.

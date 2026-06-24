# Log do Projeto — RAG-Simplex

Histórico **append-only** do que foi feito. Entrada mais recente no topo. Não
reescrever entradas antigas — apenas adicionar. Para o "onde estou agora", use
[`ESTADO_ATUAL.md`](ESTADO_ATUAL.md).

Formato de cada entrada:
`## AAAA-MM-DD — Fase N — título` · o que foi feito · decisões · arquivos.

---

## 2026-06-24 — Etapa 3 — Cronograma (visitas) + card do dia (#C1); fix do logo

**Branch:** `feat/fase-7-frontend`.

- **Fix logo:** fallback “IBSystems” estava invisível (`text-transparent` sem o
  gradiente do Tailwind antes do rebuild). Agora o gradiente vem por **CSS var inline**
  no `Logo.tsx` (funciona sem rebuild). O `logo.png` ainda não existe → some que mostra
  o fallback; colocar em `frontend/public/logo.png`.
- **Modelo:** `Visita` (técnico, cliente, data, título, status, observações). Tabela
  nova via micro-migração.
- **API:** novo router `/cronograma` (GET por papel via `usuario_atual`; POST/PATCH/
  DELETE com `gerir_usuarios`). `cronograma.py` registrado no `main.py`.
- **Frontend:** `Cronograma.tsx` com dados reais + **card do dia** (modal): ADM vê
  todos os técnicos e gerencia (add/remove, filtro por técnico); técnico vê os próprios.
- **Testes:** `test_cronograma.py` (4) → **66 passed**. `tsc` OK.
- Docs: spec [`spec-etapa3-cronograma.md`](specs/spec-etapa3-cronograma.md),
  `MODELO_DADOS`/`ARQUITETURA`/`TESTES`/`BACKLOG`/`PLANEJAMENTO`/`INDICE`.

**Arquivos:** `app/{modelos,cronograma,main}.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,pages/Cronograma.tsx,components/Logo.tsx}`, `docs/**`.

---

## 2026-06-24 — Etapa 1 — Entidade Cliente (fundação) + índice de docs

**Branch:** `feat/fase-7-frontend`.

- **Índice mestre:** novo [`docs/INDICE.md`](../INDICE.md) — links de toda a
  documentação + roteiro para recriar em outra linguagem.
- **Modelo:** `Cliente` (nome único, unidade, ativo) + N:N `usuario_cliente`
  (`Usuario.clientes_rel`). Coluna legada `Usuario.clientes` (CSV) aposentada.
  Micro-migração cria a tabela nova no banco existente.
- **API:** CRUD `/admin/clientes`; `UsuarioDetalhe.clientes` vira lista; update por
  `cliente_ids`. (Fix: DELETE 204 sem `-> None` p/ não inferir response_model.)
- **Frontend:** card **Clientes** com CRUD; edição de usuário com **clientes em
  checkbox** (puxados do banco) → fecha o #U2. `tsc` OK.
- **Testes:** `test_clientes_crud_e_associacao` → **62 passed**.
- Docs: spec [`spec-etapa1-clientes.md`](specs/spec-etapa1-clientes.md), `MODELO_DADOS`,
  `ARQUITETURA` (endpoints), `TESTES`, `BACKLOG`/`PLANEJAMENTO` atualizados.

**Arquivos:** `app/{modelos,admin}.py`, `tests/test_admin.py`,
`frontend/src/{lib/api.ts,pages/Admin.tsx}`, `docs/**`.

---

## 2026-06-24 — #D1/#D2 — Identidade visual IBSystems + tema claro/escuro

**Branch:** `feat/fase-7-frontend`.

- **#D1:** paleta da marca (ciano `--brand` → teal `--brand-2`; `--primary` teal) nos
  tokens (`index.css` + `tailwind.config`). Logo IBSystems no topo da sidebar, header
  mobile e login via `components/Logo.tsx` (usa `/logo.png`, **fallback** texto gradiente
  se faltar). Falta só o usuário colocar `frontend/public/logo.png`.
- **#D2:** `theme/ThemeContext.tsx` (classe `dark` no `<html>` + persistência `rag-tema`,
  respeita `prefers-color-scheme`, aplicado antes do render p/ evitar flash). Toggle no
  menu do usuário. Bloco `.dark` no `index.css`. `tsc` OK.
- Doc: novo [`docs/DESIGN.md`](../DESIGN.md). Backlog #D1/#D2 = ✅.

**Arquivos:** `frontend/src/{index.css,main.tsx,theme/ThemeContext,components/{Logo,
Sidebar,Layout},pages/Login}.tsx`, `frontend/tailwind.config.js`, `frontend/public/README.md`,
`docs/DESIGN.md`.

---

## 2026-06-24 — Documentação de portabilidade + backlog/planejamento

**Branch:** `feat/fase-7-frontend`.

A pedido do usuário (documentação exaustiva p/ recriar em outra linguagem):
- **`docs/projeto/BACKLOG.md`**: tarefas pendentes (checklist) + **plano sequenciado
  sem retrabalho** (fundação `Cliente` antes das telas dependentes) + DoD.
- **`docs/MODELO_DADOS.md`**: ER (Mermaid) + entidades/campos/invariantes.
- **`docs/FLUXOS.md`**: diagramas de sequência (auth, /query, streaming, feedback,
  ingestão) + flowchart de precedência de estratégia/camadas.
- **`docs/TECNOLOGIAS.md`**: stack, **parâmetros exatos** (0.78, e5, JWT…) e
  **equivalentes** por ecossistema (Node/Java/.NET/Go) para portar.
- Interligado em `ARQUITETURA.md` e `README.md`. Memória do projeto registrada
  (documentação exaustiva como diretriz permanente).

---

## 2026-06-24 — Fase 8 (parte 9) — #2 Card de usuário: perfil + documentos com validade

**Branch:** `feat/fase-7-frontend`.

- **Modelo:** `Usuario` ganhou `foto_url, telefone, cargo, unidade, clientes,
  observacoes, acesso_expira_em`; nova tabela `documento_tecnico` (nome + validade).
  A micro-migração adicionou as colunas/tabela ao banco existente sem recriar.
- **API ADM:** `GET/PATCH /usuarios/{id}` agora retornam `UsuarioDetalhe` (perfil +
  documentos); novos `POST/DELETE /usuarios/{id}/documentos[/{doc_id}]`.
- **Frontend:** card de edição com **foto** (upload → data URL), telefone, cargo,
  **unidade** (local de trabalho), **clientes**, **validade de acesso**, observações;
  seção de **documentos com validade** + badge de status (válido/vence em Nd/vencido)
  e alerta "⚠️ N vencendo/vencido". 61 testes.

**Pendente:** alerta global de vencimento na lista de usuários; #1 "exatidão/docs".

**Arquivos:** `app/{modelos,admin}.py`, `tests/test_admin.py`,
`frontend/src/{lib/api.ts,pages/Admin.tsx}`.

---

## 2026-06-24 — Fase 8 (parte 8) — Painel ADM em cards + aba Cronograma; fixes

**Branch:** `feat/fase-7-frontend`.

- **Fix #4 (Failed to fetch):** backend caíra + banco antigo sem coluna `feedback`.
  `db.criar_tabelas` aplica **micro-migração** (ALTER ADD para colunas nullable
  faltantes); `backend.ps1` roda `db --init` sempre. Teste novo (60 no total).
- **Fix #1:** sidebar `bg-muted/30` (transparente) vazava no drawer → `bg-muted`.
- **#5 Painel ADM em cards:** hub com cards **Gerenciar usuários** (real),
  **API keys**, **Banco de dados**, **Clientes** (placeholders) e **Auditoria**
  (real). Voltar com `← Voltar`.
- **#3 Cronograma:** nova aba lateral + página com **calendário mensal** (navegação
  de mês, "Hoje", seletor de técnico/local, eventos de exemplo). Placeholder p/
  integração futura.

**Pendente:** #2 (mais campos no card de edição de usuário — aguardando definição
dos campos) e #1 "exatidão/modelagem" dos docs.

**Arquivos:** `app/db.py`, `scripts/backend.ps1`, `tests/test_persistencia.py`,
`frontend/src/pages/{Admin,Cronograma}.tsx`, `frontend/src/components/Sidebar.tsx`,
`frontend/src/App.tsx`.

---

## 2026-06-24 — Fase 8 (parte 7) — Sidebar responsiva + specs (frontend/arquitetura)

**Branch:** `feat/fase-7-frontend`.

- **Responsivo:** `hooks/useMediaQuery.ts`; `Layout` vira drawer sobreposto (com ☰
  no topo + backdrop) abaixo de 768px e barra fixa (full/rail) acima. `Sidebar`
  refatorada para receber `variant`/callbacks (estado de aberta sobe p/ o Layout);
  drawer fecha ao navegar. `tsc` OK.
- **Specs:** novo `spec-fase-8-frontend-chat.md` (chat + layout responsivo) e
  `spec-arquitetura.md` (contratos/invariantes); notas de evolução em fase-7 e fase-9.

**Arquivos:** `frontend/src/{hooks/useMediaQuery.ts,components/{Layout,Sidebar}.tsx}`,
`docs/projeto/specs/{spec-fase-8-frontend-chat,spec-arquitetura,spec-fase-7-frontend,
spec-fase-9-painel-adm-frontend}.md`.

---

## 2026-06-24 — Fase 8 (parte 6) — Sidebar em grupos + abas novas; fix do menu

**Branch:** `feat/fase-7-frontend`.

- **Fix:** menu do usuário usava `bg-popover` (token inexistente no tema) → sem
  fundo, "quebrado". Trocado por `bg-card` + overlay de clique-fora.
- **Sidebar em grupos** (estilo plataforma de cursos): **Consulta** vira grupo
  colapsável com sub-itens **Nova consulta** / **Buscar consulta** + a lista de
  **Consultas recentes**. Novas abas de topo: **Relatórios**, **Buscar Equipamento**,
  **Documentos** (placeholders `components/Placeholder.tsx`).
- Rotas `/relatorios`, `/equipamentos`, `/documentos`; rail recolhido com os ícones.
- `tsc --noEmit` OK.

**Arquivos:** `frontend/src/components/{Sidebar,Placeholder}.tsx`,
`frontend/src/pages/{Relatorios,Equipamentos,Documentos}.tsx`, `App.tsx`.

---

## 2026-06-24 — Fase 8 (parte 5) — Layout estilo ChatGPT (sidebar + multi-consulta)

**Branch:** `feat/fase-7-frontend`.

**Feito (frontend, typecheck OK):**
- `ChatContext`: passa de **uma** conversa para **várias** (`Conversa[]` com título/
  timestamps). `novaConsulta`, `selecionar`, `excluir`; streaming endereçado por id
  da conversa (trocar de consulta no meio não embaralha). Persiste `rag-consultas-<id>`.
- `components/Sidebar.tsx` (novo): barra colapsável (rail de ícones). Topo: **Nova
  consulta** e **Buscar consulta** (filtra por título/conteúdo). Lista **Consultas
  recentes** (clicar abre; lixeira exclui). Rodapé: usuário com menu (Início, Painel
  ADM, Sair). Ícones SVG inline (sem libs).
- `Layout`: vira sidebar + outlet (sem header). `App`: `/` e `*` → `/consulta`;
  Home movido p/ `/inicio`.
- `Consulta`: usa o ativo; estado vazio “Qual falha vamos diagnosticar?”.

**Arquivos:** `frontend/src/{chat/ChatContext,components/Sidebar,components/Layout,
pages/Consulta,App}.tsx`.

---

## 2026-06-24 — Fase 8 (parte 4) — Histórico persistente + buscas fora da página

**Branch:** `feat/fase-7-frontend`.

**Problema:** o histórico do chat vivia no estado local de `Consulta`; ao trocar de
aba a página era desmontada e o histórico (e uma busca em andamento) se perdia.

**Feito (frontend, não testado aqui além de typecheck):**
- `chat/ChatContext.tsx` (novo): `ChatProvider` acima das rotas guarda `mensagens`
  e roda `enviar`/`votar` (streaming incluso). Como não é desmontado ao navegar, o
  histórico persiste e a busca **continua rodando em outra aba**. Persistência em
  `localStorage` por usuário (`rag-historico-<id>`) → sobrevive a reload.
- `main.tsx`: `<ChatProvider>` dentro de `<AuthProvider>`, em volta de `<App>`.
- `pages/Consulta.tsx`: vira apresentacional (consome `useChat`); botão **Limpar**.
- `tsc --noEmit` = OK.

**Arquivos:** `frontend/src/{chat/ChatContext,pages/Consulta,main}.tsx`.

---

## 2026-06-24 — Fase 9 (parte 2) — Estratégia por usuário + auditoria na UI

**Branch:** `feat/fase-7-frontend`.

**Feito (backend, testado):**
- `admin.py`: `GET /admin/usuarios/{id}/estrategia` (config do usuário ou null);
  `feedback` exposto em `AuditoriaItem`. (`PUT estrategia`, `/auditoria`,
  `/estrategias` já existiam.)
- `tests/test_admin.py`: GET/PUT da estratégia por usuário → `pytest` = **59 passed**.

**Feito (frontend, não testado aqui):**
- `pages/Admin.tsx`: **abas Usuários/Auditoria**. No editar usuário, nova seção
  **Estratégia/persona/camadas** (carrega config atual, select de estratégias,
  checkboxes de camadas → PUT). 
- `components/AuditoriaView.tsx`: tabela das consultas (quando, usuário→email,
  pergunta, estratégia, fallback, feedback 👍/👎).
- `lib/api.ts`: `estrategias`, `estrategiaUsuario`, `definirEstrategiaUsuario`, `auditoria`.

**Fase 9 ✅ concluída.** Próximo: Fase 11 (reranker D-020 / hardening) — Fase 10
(nuvem) depende de API key, fica para o fim.

**Arquivos:** `app/admin.py`, `tests/test_admin.py`,
`frontend/src/{pages/Admin,components/AuditoriaView,lib/api}.tsx`.

---

## 2026-06-24 — Fase 8 (parte 3) — Streaming (NDJSON) + feedback 👍/👎

**Branch:** `feat/fase-7-frontend`.

**Feito (backend, testado):**
- `modelos.py`: coluna `LogConsulta.feedback` (1/-1/None).
- `main.py`: `_executar_consulta()` (helper compartilhado, devolve `log_id`);
  `/query` agora retorna `log_id`; `/query/stream` reescrito como **NDJSON**
  (`{tipo:meta,...}` + `{tipo:delta,texto}`); novo `POST /feedback` (só no próprio log).
- `tests/test_consulta.py` (6 casos: log_id, feedback ok/400/404, stream NDJSON,
  stream negado sem permissão) → `pytest` = **58 passed**.

**Feito (frontend, não testado aqui):**
- `lib/api.ts`: `queryStream()` (lê NDJSON via ReadableStream), `api.feedback()`.
- `pages/Consulta.tsx`: usa streaming (efeito de digitação) p/ quem tem
  `consultar_stream` (operador cai p/ `/query`); botões **👍/👎** por resposta.

**⚠️ Schema:** coluna nova em `log_consulta`. Em banco existente, recriar
(`rm data/processed/ragsimplex.db && python -m app.db --init`); no Docker o volume é novo.

**Próximo:** resto da Fase 9 (estratégia/auditoria na UI), Fase 11 (reranker D-020).

**Arquivos:** `app/{main,modelos}.py`, `tests/test_consulta.py`,
`frontend/src/{lib/api,pages/Consulta}.tsx`.

---

## 2026-06-23 — Fase 7 (parte 2 / D-017) — Docker: subir tudo com um comando

**Branch:** `feat/fase-7-frontend`.

**Feito:**
- `Dockerfile` (backend): Python 3.11, deps, **e5 pré-cacheado** na imagem, depois
  `HF_HUB_OFFLINE=1`. `docker/entrypoint.sh` inicializa segredo (gera/persiste),
  banco+seed, admin (env) e ingestão (se vazia), then `uvicorn`.
- `frontend/Dockerfile`: build Vite (multi-stage) → **nginx**; `docker/nginx.conf`
  serve o SPA e faz **proxy** das rotas de API p/ `backend` (origem única, sem CORS;
  `VITE_API_URL=""`).
- `docker-compose.yml`: `backend` (8000) + `frontend` (8080) + volume `ragdata`.
- `.dockerignore`, `.gitattributes` (LF p/ `*.sh`), `docs/DOCKER.md`.

**Validação:** `docker compose config` OK; `pytest` = **53 passed**. **Build completo
não rodado aqui** (sem rede p/ torch/modelo) — instruções e troubleshooting de SSL
em `docs/DOCKER.md`.

**Uso:** `docker compose up --build` → front http://localhost:8080, API :8000/docs;
admin padrão admin@simplex.local / admin123.

**Próximo:** validar o build na máquina do dev; resto da Fase 9 (estratégia/auditoria
na UI), Fase 8 (streaming/feedback), Fase 11 (reranker D-020).

**Arquivos:** `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`,
`docker/{entrypoint.sh,nginx.conf}`, `.dockerignore`, `.gitattributes`, `docs/DOCKER.md`.

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

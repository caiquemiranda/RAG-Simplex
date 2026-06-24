# Backlog & Planejamento — RAG-Simplex

Lista viva de atividades **pendentes** e o **plano sequenciado** para executá-las
sem retrabalho. Atualize ao iniciar/terminar cada item. Para o status por fase, ver
[`ROADMAP.md`](ROADMAP.md); para o que já existe, [`../ARQUITETURA.md`](../ARQUITETURA.md).

> Convenção: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
> Cada item tem **dep:** (depende de) quando há ordem a respeitar.

---

## 1. Backlog (o que falta)

### A. Frontend / UX
- [ ] **#1 — Alinhamento fino ao ChatGPT + "exatidão dos documentos"**: confirmar com o
      usuário se é (a) só ajuste visual, (b) atualizar docs/specs, (c) modelagem de dados.
- [x] **Alerta global de vencimento de documentos** na lista "Gerenciar usuários":
      `docs_alerta` (vencidos/≤30d) no `UsuarioResumo` → badge **⚠️ N doc.** na linha.
- [x] **Input centralizado** no estado vazio da consulta (estilo "O que tem na agenda"):
      quando não há mensagens, o título + campo de envio ficam **centralizados**.
- [ ] **Foto do técnico**: hoje é data URL no banco. Migrar para upload de arquivo
      + endpoint de mídia quando houver muitos usuários. dep: decisão de storage.

### B. Painel ADM — cards hoje placeholder
- [x] **Clientes** (entidade + CRUD): cadastrar clientes; técnicos associados via
      `cliente_ids` na edição do usuário. ⚑ *Fundação* — spec [`specs/spec-etapa1-clientes.md`](specs/spec-etapa1-clientes.md).
- [x] **Gerenciar API keys**: UI no card ADM (lista provedores + cadastrar/rotacionar
      chave). Backend `/admin/provedores` (perm. `gerir_chaves`, chave **cifrada**/mascarada).
- [ ] **Banco de dados**: status/backup/reindexação (definir escopo real).

### C. Cronograma
- [x] **Backend de cronograma**: modelo `Visita` (técnico, cliente, data, título, status)
      + endpoints CRUD (`/cronograma`). Spec [`specs/spec-etapa3-cronograma.md`](specs/spec-etapa3-cronograma.md).
- [x] Calendário com **dados reais** + **card do dia** (#C1): ADM vê todos os técnicos
      e gerencia; técnico vê os próprios.
- [x] **Fechamento de visita**: no card do dia, **status** editável (agendada/concluída/
      cancelada) + **observações**. Técnico **fecha a própria** visita; admin edita todas.
      `PATCH /cronograma/{id}` com RBAC (técnico: só status/observações da própria).
- [ ] **Visão por unidade/local** — dep: **entidade `Unidade`** (decisão **D-021**:
      vira cadastro). Criar `Unidade` antes do filtro para não retrabalhar.

#### Otimizações do cronograma (2026-06-24)
- [x] **#CR1 — Grade só do mês vigente**: renderiza apenas as semanas com dias do mês;
      dias de outros meses ficam **vazios** (sem número). *Frontend.*
- [x] **#CR2 — Miniatura do dia**: cada dia mostra prévia compacta (avatar do técnico +
      atividade, cor por status). *Frontend.*
- [x] **#CR3 — Feriados + fim de semana**: sábado/domingo em verde da logo +
      **feriado global** (tabela `feriado`; marcar/remover no card do dia; destaque no
      calendário). Decisão: **global**.
- [x] **#CR4 — Notificações**: criar atividade → **notificação só para o técnico** +
      **sino com badge** (Sidebar) + **tela `/notificacoes`** (marcar lida/todas).
      Tabela `notificacao` + router `/notificacoes` + `NotificacoesProvider`.
- [x] **#CR5 — "Onde cada um está" + avatar**: avatar do técnico (foto `foto_url` ou
      **iniciais** — Caíque Miranda → CM) no calendário e no card do dia; mostra o
      **cliente/local**. Componente **`Avatar`** reutilizável extraído (usado também na Sidebar).

> **Ordem sugerida (sem retrabalho):** primeiro o **`Avatar`** reutilizável (destrava
> #CR2 e #CR5); depois os puramente visuais **#CR1** e **#CR3 (fim de semana)**; em
> seguida **#CR3 (feriado)** e **#CR4 (notificações)**, que precisam de backend novo.
> #CR4 é uma **fundação de notificações** — modelar genérico para reuso futuro.

### D. Modelo de dados (consolidação — evita retrabalho)
- [x] Trocar `Usuario.clientes` (CSV placeholder) por **relação N:N `usuario↔cliente`**
      (`usuario_cliente`). Coluna CSV permanece como legado sem uso na API.
- [ ] (Opcional) Entidade **Unidade/Local** se "local de trabalho" virar cadastro.

### E. Núcleo RAG / fases pendentes
- [ ] **Fase 10** — estratégias de nuvem (Claude) + arena. dep: API key.
- [ ] **Fase 11** — reranker cross-encoder (D-020); avaliação RAGAS-lite.
- [ ] **Migrações Alembic** — substituir a micro-migração caseira por migrações
      versionadas (a atual só cobre adição de coluna nullable).

### F. Documentação contínua (sempre junto da feature)
- [ ] Manter `ARQUITETURA.md`, `MODELO_DADOS.md`, `FLUXOS.md`, `TECNOLOGIAS.md`,
      `TESTES.md` e os **specs** atualizados a cada entrega.
- [x] Spec de cada novo módulo: Clientes (etapa1), Cronograma (etapa3), **Etapa 0**
      (API keys/perfil). Falta: spec de **Banco de dados** (quando existir).

### G. Design, tema e telas (solicitações 2026-06-24)
- [x] **#D1 — Identidade visual (IBSystems)**: paleta ciano→teal nos tokens (`index.css` +
      `tailwind.config`); logo no topo/login com fallback gradiente. Falta só o usuário
      colocar `frontend/public/logo.png`. Doc: [`../DESIGN.md`](../DESIGN.md).
- [x] **#D2 — Tema claro/escuro**: `ThemeProvider` + toggle no menu do usuário +
      persistência (`rag-tema`); variáveis do tema escuro no `index.css`.
- [x] **#D3 — Logo natural (SVG, sem fundo, maior)**: `Logo.tsx` virou **SVG embutido**
      (wordmark gradiente, **fundo transparente**, escalável, maior). Prefere `/logo.svg`
      se o usuário colocar o **logo oficial** (SVG transparente).
- [x] **#HOME — Home/Dashboard ao clicar no logo**: logo **clicável** → `/inicio`.
      Dashboard com **atividades de hoje** (técnico: as próprias + “onde estará”; ADM:
      todas), **notificações** não lidas e **atalhos**. Reusa cronograma/notificações.
      Documentos do próprio técnico no dashboard via `GET /me/documentos` ✅.
- [x] **#U1 — Lista "Gerenciar usuários" moderna**: linha com **avatar** (foto/iniciais)
      + **email · nome · Cargo** (no lugar de "Papel"); inativo sinalizado. `UsuarioResumo`
      ganhou `cargo`/`foto_url`.
- [x] **#U2 — Edição de usuário como TELA própria** (substitui a lista; “← Voltar”),
      seções **1) Perfil e gestão de acesso · 2) Documentos exigidos · 3) Permissões ·
      4) Estratégia e camadas**. Em *Perfil*: nome, papel, cargo, **nova senha com 👁
      mostrar/ocultar**, **ativo**, **clientes em checkbox**, foto, telefone, unidade,
      validade, observações.
- [x] **#C1 — Cronograma: card do dia**: clicar num dia abre card central — ADM vê
      todos os técnicos (onde estão + atividade) e gerencia; técnico vê os próprios. ✅

---

### H. Novas solicitações (2026-06-24) — clientes visuais, documentos, calendário

> ⚑ = fundação (fazer antes do que depende dela).

- [x] **#FILES ⚑ — Infra de upload/arquivos** (pasta `arquivos/` na raiz): `POST /upload`
      (multipart, só admin) + estáticos em `/arquivos`; `salvar_upload`/`remover_arquivo`
      (sanitização, 10 MB, guarda de path traversal). Dep nova: `python-multipart`. Spec
      [`specs/spec-files-arquivos.md`](specs/spec-files-arquivos.md). **Keystone pronto.**
- [x] **#CLIV ⚑ — Cor + logo por cliente** (item 4): `Cliente.cor` + `Cliente.logo_url`;
      card Clientes com **seletor de cor** e **upload de logo** (via `/upload`). `Avatar`
      ganhou prop `cor`. **Fundação pronta** para #R1 e #CR6.
- [x] **#R1 — Relatórios = cards de clientes + sidebar** (item 1): `GET /clientes`
      (visível por papel); página Relatórios com **cards** (avatar cor/logo) → `/relatorios/:id`
      (shell do relatório); sidebar com **grupo "Relatórios"** colapsável listando os clientes.
- [ ] **#CR6 — Calendário: atividade + cliente na célula** (item 3): mostrar **atividade
      e cliente** no dia; se **2+ técnicos** no mesmo cliente, **agrupar num único card
      miniatura**. **Editar** atividade agendada (admin: título/cliente/data/técnico).
      dep: Cliente ✅ + **#CLIV** (cor/logo no card).
- [ ] **#CR7 — Layout do calendário (estilo referência, img-1)** (item 5): **número do dia
      grande** no canto superior; célula no estilo da referência. *Fazer junto do #CR6
      (mesma célula) p/ não mexer duas vezes.*
- [ ] **#DOC1 — Documentos: cards Empresa + Marcas** (item 2): card **Empresa (IBSystems,
      com logo)** e card **Marcas** (Simplex, Notifier…) com docs dos equipamentos
      (manuais, datasheets). **CRUD por card**: upload, download, **editar nome**, **ocultar**,
      excluir. Só **admin** sobe; arquivos numa **pasta na raiz**. dep: **#FILES**.

---

## 2. Plano sequenciado das PENDENTES (sem retrabalho)

> A fundação (entidade Cliente) e a trilha Design já estão concluídas. Abaixo, só o
> que **falta**, em ordem que evita retrabalho. Doc contínua (seção F) é transversal.

```
Ordem recomendada (pendentes)
═════════════════════════════
Etapa 0 — Independentes  ✅ CONCLUÍDA (API keys, alerta docs, input centralizado, /me/documentos)

Etapa 1 — Cronograma
  1a ✅ Fechar visita (status + observações; técnico fecha a própria)
  1b ✅ DECISÃO D-021: "local de trabalho" vira entidade Unidade
  1c • Criar entidade Unidade (modelo + CRUD + vínculo usuário/cliente)  ⚑
  1d • Visão por unidade/local no cronograma            dep: 1c

Etapa F — FUNDAÇÕES das novas solicitações (fazer ANTES das telas)  ◀ PRÓXIMA
  Fa • #FILES — infra de upload/arquivos (pasta na raiz)  ⚑ keystone
       → reusado por #DOC1, logo do cliente (#CLIV) e foto-por-arquivo (2b)
  Fb • #CLIV — cor + logo por cliente (Cliente.cor/logo_url)  dep: Fa (logo)
       → fundação de #R1 e #CR6

Etapa N — Telas que usam as fundações
  Na • #R1  — Relatórios = cards de clientes + grupo na sidebar     dep: Fb
  Nb • #CR6 + #CR7 — calendário: atividade+cliente, agrupar por cliente,
       editar atividade, layout (número grande)                    dep: Fb
  Nc • #DOC1 — Documentos: cards Empresa + Marcas (CRUD de arquivos) dep: Fa

Etapa 2 — Robustez/escala (depois que o schema acima estabilizar)
  2a • Alembic (migrações versionadas) — substitui a micro-migração caseira
  2b • Upload de foto via arquivo (substitui o data URL)            dep: Fa
  2c • Card "Banco de dados": status/backup/reindexação

Etapa 3 — Inteligência
  3a • Fase 11 — reranker cross-encoder (D-020) + RAGAS-lite  (sem API key)
  3b • Fase 10 — nuvem + arena  (requer API key + decisão D-006 do provedor)
```

**Por que esta ordem evita retrabalho**
- **API keys (0a) antes da Fase 10 (3b):** a Fase 10 consome as chaves cadastradas.
- **Alembic (2a) depois** de fechar as mudanças de schema da Etapa 1 (senão migrações
  nascem e morrem).
- **Decidir Unidade (1b) antes** da "visão por unidade" (1c) — senão constrói o filtro
  no campo livre e refaz com a entidade.
- **GET /me/documentos (0d)** habilita o bloco de documentos do #HOME sem tocar o resto.
- **Fase 11 (3a)** é independente (núcleo RAG) — pode entrar a qualquer momento.
- **#FILES (Fa) é keystone:** uma infra de arquivos única serve documentos (#DOC1),
  logo do cliente (#CLIV) e foto-por-arquivo (2b) — construir 3× seria retrabalho.
- **#CLIV (cor/logo do cliente) antes de #R1 e #CR6:** os cards de cliente (Relatórios)
  e o card-miniatura do calendário já nascem usando a cor/logo — não refaz a UI depois.
- **Editar atividade (#CR6)** reusa o `PATCH /cronograma/{id}` já existente (admin).

---

## 3. Definição de pronto (DoD) por item

Todo item só é `[x]` quando tem: código + **testes** (backend) / `tsc` ok (frontend)
+ **spec** (se módulo novo) + **docs atualizadas** (`ARQUITETURA`/`MODELO_DADOS`/
`FLUXOS` conforme o caso) + entrada no `LOG.md`. (Diretriz de documentação exaustiva.)

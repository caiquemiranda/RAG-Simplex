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
- [ ] **Alerta global de vencimento de documentos** na lista "Gerenciar usuários"
      (⚠️ ao lado de quem tem documento vencido/vencendo). dep: card de usuário (✅).
- [ ] **Input centralizado** no estado vazio da consulta (estilo "O que tem na agenda").
- [ ] **Foto do técnico**: hoje é data URL no banco. Migrar para upload de arquivo
      + endpoint de mídia quando houver muitos usuários. dep: decisão de storage.

### B. Painel ADM — cards hoje placeholder
- [x] **Clientes** (entidade + CRUD): cadastrar clientes; técnicos associados via
      `cliente_ids` na edição do usuário. ⚑ *Fundação* — spec [`specs/spec-etapa1-clientes.md`](specs/spec-etapa1-clientes.md).
- [ ] **Gerenciar API keys**: UI sobre `/admin/provedores` (backend já cifra a chave).
- [ ] **Banco de dados**: status/backup/reindexação (definir escopo real).

### C. Cronograma
- [x] **Backend de cronograma**: modelo `Visita` (técnico, cliente, data, título, status)
      + endpoints CRUD (`/cronograma`). Spec [`specs/spec-etapa3-cronograma.md`](specs/spec-etapa3-cronograma.md).
- [x] Calendário com **dados reais** + **card do dia** (#C1): ADM vê todos os técnicos
      e gerencia; técnico vê os próprios.
- [ ] Visão por **unidade/local** (além de por técnico) e fechamento com histórico.

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
- [ ] Spec de cada novo módulo (Clientes, Cronograma, API keys).

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
      *Futuro:* documentos vencendo do próprio técnico (precisa de `GET /me/documentos`).
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

## 2. Plano sequenciado (sem retrabalho)

A regra de ouro: **construir as fundações de dados compartilhadas antes das telas
que dependem delas.** Várias features (card Clientes, `Usuario.clientes`, Cronograma
por cliente/local, documentos exigidos por cliente) dependem de uma entidade
**Cliente**. Fazer as telas antes obrigaria a refazer quando a entidade existir.

```
Ordem recomendada
═════════════════
Trilha DESIGN (paralela — não depende de dados)
  D1 • Identidade visual da empresa (#D1) ✅
  D2 • Tema claro/escuro (#D2) ✅
  D3 • Logo natural SVG/sem fundo/maior (#D3)  ⛔ aguarda asset SVG transparente
  D4 • Home/Dashboard ao clicar no logo (#HOME)  — atividades do dia/cliente/infos
  D5 • Lista de usuários moderna: foto+email+nome+cargo (#U1)
  D6 • Edição de usuário como tela própria + seções (#U2, parte sem clientes)

Etapa 0 — Higiene rápida (independente, baixo custo)
  • Alerta global de vencimento de documentos na lista de usuários
  • Input centralizado no estado vazio do chat
  • Gerenciar API keys (UI sobre /admin/provedores — backend pronto)

Etapa 1 — FUNDAÇÃO: entidade Cliente  ⚑ destrava o resto
  • Modelo Cliente (+ relação N:N usuario↔cliente)
  • Endpoints /admin/clientes (CRUD) + associação técnico↔cliente
  • Migrar Usuario.clientes (CSV) → relação
  • Specs + testes + MODELO_DADOS atualizado

Etapa 2 — Card "Clientes" (UI)            dep: Etapa 1
  • Listar/criar/editar clientes; atribuir técnicos
  • Completa o #U2: clientes como CHECKBOX (puxados do banco)

Etapa 3 — Cronograma (backend + real)     dep: Etapa 1
  • Modelo Visita (técnico, cliente/local, data, status) + endpoints
  • Calendário consome dados reais; visão por técnico/local
  • Completa o #C1: card do dia com dados reais (ADM completo / técnico)

Etapa 4 — Documentos exigidos POR cliente dep: Etapa 1
  • Relacionar DocumentoTecnico ao cliente que o exige (opcional)

Etapa 5 — Robustez/escala
  • Alembic (migrações versionadas)
  • Upload de foto via arquivo (em vez de data URL)
  • Banco de dados (card): status/backup/reindexação

Paralelo / quando houver API key
  • Fase 10 (nuvem + arena) · Fase 11 (reranker, RAGAS-lite)
```

> **Cuidado de não-retrabalho:** o **#U2** e o **#C1** têm uma parte que entra agora
> (tela/seções, card do dia com dados de exemplo) e uma parte que **só fecha depois da
> Etapa 1/3** (clientes em checkbox; dados reais do dia). Construir já prevendo esses
> encaixes (componentes que recebem a lista de clientes / eventos por props).

**Por que esta ordem evita retrabalho**
- A entidade **Cliente** é dependência de 4 frentes; criá-la primeiro evita refazer
  UI e migrar dados duas vezes.
- **API keys** e **alertas** são independentes → cabem na Etapa 0 sem bloquear nada.
- **Alembic** entra depois que o schema estabilizar (senão migrações nascem e morrem).

---

## 3. Definição de pronto (DoD) por item

Todo item só é `[x]` quando tem: código + **testes** (backend) / `tsc` ok (frontend)
+ **spec** (se módulo novo) + **docs atualizadas** (`ARQUITETURA`/`MODELO_DADOS`/
`FLUXOS` conforme o caso) + entrada no `LOG.md`. (Diretriz de documentação exaustiva.)

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
- [ ] **Clientes** (entidade + CRUD): cadastrar clientes e quais técnicos acessam cada um.
      ⚑ *Fundação* — ver plano §2.
- [ ] **Gerenciar API keys**: UI sobre `/admin/provedores` (backend já cifra a chave).
- [ ] **Banco de dados**: status/backup/reindexação (definir escopo real).

### C. Cronograma
- [ ] **Backend de cronograma**: modelo de **visita/evento** (técnico, cliente/local,
      data, status) + endpoints CRUD. dep: entidade Cliente/Unidade.
- [ ] Substituir os **eventos de exemplo** do calendário por dados reais.
- [ ] **Visão por técnico/local** real (filtra pelo `unidade`/clientes do técnico).

### D. Modelo de dados (consolidação — evita retrabalho)
- [ ] Trocar `Usuario.clientes` (CSV placeholder) por **relação N:N `usuario↔cliente`**.
      dep: entidade Cliente. ⚠️ fazer ANTES de muita UI usar o CSV.
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
- [ ] **#D1 — Identidade visual da empresa**: aplicar **paleta/cores e logo** da empresa
      nos tokens do tema (`index.css` + `tailwind.config`). ⛔ *Bloqueado:* aguardando a
      paleta/branding (cores em hex, logo). Tokens já são variáveis CSS → troca centralizada.
- [ ] **#D2 — Tema claro/escuro** em todo o sistema: toggle + persistência (`darkMode:'class'`
      já habilitado no Tailwind; faltam as variáveis do tema escuro e o switch na UI).
- [ ] **#U1 — Lista "Gerenciar usuários" moderna**: linha/card com **foto do técnico** como
      1º item, depois **email · nome · Cargo** (no lugar de "Papel"). Visual moderno. dep: #D2 (estética).
- [ ] **#U2 — Edição de usuário como TELA própria** (não card inline), seções de cima p/ baixo:
      **1) Perfil e gestão de acesso · 2) Documentos exigidos (validade) · 3) Permissões ·
      4) Estratégia e camadas**. Em *Perfil e gestão*: nome, **papel/cargo**, **nova senha com
      mostrar/ocultar (👁)**, **ativo (checkbox)** e **clientes como checkbox** (puxados do banco).
      dep: parte de **clientes** → entidade Cliente (Etapa 1); o resto é independente.
- [ ] **#C1 — Cronograma: card do dia**: clicar num dia abre **card central** com as informações
      do dia. **ADM/visão completa:** onde cada técnico está + atividade/histórico do dia.
      **Técnico:** onde estará + atividade do dia. dep: Cronograma backend (Etapa 3) p/ dados reais
      (shell de UI pode vir antes; visão por papel já é suportada pelo RBAC).

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
  D1 • Identidade visual da empresa (#D1)  ⛔ aguarda paleta/logo
  D2 • Tema claro/escuro (#D2)
  D3 • Lista de usuários moderna: foto+email+nome+cargo (#U1)
  D4 • Edição de usuário como tela própria + seções (#U2, parte sem clientes)

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

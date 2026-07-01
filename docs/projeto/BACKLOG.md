# Backlog & Planejamento — RAG-Simplex

Lista viva de atividades **pendentes** e o **plano sequenciado** para executá-las
sem retrabalho. Atualize ao iniciar/terminar cada item. Para o status por fase, ver
[`ROADMAP.md`](ROADMAP.md); para o que já existe, [`../ARQUITETURA.md`](../ARQUITETURA.md).

> Convenção: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
> Cada item tem **dep:** (depende de) quando há ordem a respeitar.

---

## 1. Backlog (o que falta)

### H. #MAP — Buscar equipamento / Mapa de dispositivos (épico, D-023)
Integra o projeto legado `sistema-manutencao-3` (planta + busca de dispositivos), moderno.
Spec [`specs/spec-map-mapa-dispositivos.md`](specs/spec-map-mapa-dispositivos.md).
- [x] **#MAP-1 (backend):** entidade `Planta`; `Equipamento` + `tag/status/datas/posição`;
      migração `ec6397a8beb8`; **conversor PDF→PNG** (PyMuPDF) + CRUD de plantas; PATCH de
      posição; busca visível por `tag`; endpoints de plantas. Testes `test_plantas`.
      *(fecha a "fase B" do #EQP-1: última manutenção/teste.)*
- [x] **#MAP-2 (frontend): visualizador + Buscar equipamento** (`/equipamentos`): componente
      custom `VisualizadorPlanta` (zoom/pan por scroll+arraste, marcadores por coordenadas,
      popup, foco/zoom no marcador); página de busca: cliente → tag → abre a planta → marca o
      ponto → popup (tipo/status/última manutenção) + **detalhes** do equipamento + "Localizar
      no mapa". Reusa endpoints visíveis (#MAP-1). Substitui o placeholder de Equipamentos.
- [x] **#MAP-3 (editor, admin):** na página do cliente — card **Plantas** (subir PDF → N
      plantas, remover) + card **Posicionar no mapa** (escolhe planta + equipamento, clica na
      planta p/ gravar `pos_x/pos_y/planta_id`; "tirar do mapa"). Reusa `VisualizadorPlanta`
      com `onClicarPlanta`. dep: #MAP-1/#MAP-2.
- [x] **#MAP-4:** **histórico de manutenção** (O.S.) no detalhe do equipamento (Buscar
      equipamento) — seção lista as O.S. do equipamento (data/tipo/status/descrição/técnico).

**Melhorias do cadastro/editor de equipamentos (#MAP-5):**
- [x] **Scroll só no mapa**: `VisualizadorPlanta` usa listener `wheel` **nativo não-passivo**
      (a página não rola quando o cursor está sobre o mapa).
- [x] **Posicionar em 2 passos**: clicar na planta abre uma **caixa** com os dados (painel/
      loop/add/type/model + coordenadas) e botão **Salvar** (antes salvava no clique).
- [x] **Autocomplete por tag** no seletor do editor + alerta **"sem registro"** se a tag
      digitada não existir.
- [x] **"Ver todos"**: lista os equipamentos **posicionados** na planta (clique para focar).
- [x] **Cadastro completo**: `POST /admin/clientes/{id}/equipamentos` (criar avulso);
      **tag** composta de painel+loop+add+type quando vazia; tabela mostra **Tag** (1ª coluna),
      **Coordenadas** e **Última manutenção**. Teste `test_equipamento_criar_avulso_e_tag_composta`.

### I. #OS — Ordem de Serviço unifica a atividade do cronograma (D-025, reverte D-024)
A **O.S. = atividade do cronograma** (entidade `Visita`); `OrdemServico` foi removida. Spec
[`specs/spec-os-ordem-servico.md`](specs/spec-os-ordem-servico.md).
- [x] **Backend (D-025):** `Visita` ganhou `tipo` (preventiva/corretiva/avulsa), `equipamento_id`,
      `falha_id` + 12 campos do documento de corretiva; entidade `Falha` (catálogo `/admin/falhas`);
      sem técnicos → **fixos do cliente**; **concluir grava `ultima_manutencao`**; histórico
      `/cronograma/equipamento/{id}`; notificação "Nova O.S.". Migração `34b255a20aa8`. Teste
      `test_os_unificada_falha_equipamento_manutencao`. **`OrdemServico`/`app/ordens.py` removidos.**
- [x] **Frontend (Fase 2):** **Atividades → "Ordens de Serviço"** (grupo Cronograma; filtro +
      gráfico por tipo); form no calendário com `tipo`/equipamento/falha/campos-doc + técnicos
      default fixos (editor inline com tipo/falha); **admin "Catálogo de falhas"** (CRUD);
      **removidos** `pages/Ordens.tsx` + link + `api.admin.ordens*`; histórico do equipamento
      repontado para `/cronograma/equipamento/{id}`.

### J. Lote 6 — O.S. completa + equipamentos avançados (2026-06-30)
Sete solicitações do usuário. Giram em torno de dois eixos: **(a)** tornar a página de
**Ordem de Serviço** um CRUD completo pelo ADM e **(b)** transformar a **lista de equipamentos**
numa ferramenta tipo planilha (ordenar/filtrar por coluna, página por dispositivo, listas
salvas que alimentam documentos de manutenção preventiva).

- [ ] **#EQP-STATUS — status padrão "Operando" + estados** (item 2). Todo equipamento nasce com
      `status = "Operando"`. Estados: **Operando** (padrão), **Desabilitado**, **Desativado**, ou
      **em falha**. **Decidido (D-026):** "em falha" guarda **`falha_id`** (FK ao catálogo `Falha`,
      SET NULL) no `Equipamento` — a falha atual do dispositivo; a UI mostra o **nome da falha**
      como status. Aplicar default no cadastro avulso e no import CSV; cor do marcador no mapa por
      estado. *Backend:* coluna `falha_id` em `Equipamento` + migração + seletor no editor. dep: nenhuma (fundação).

- [ ] **#TAB-ORDEM — ordenação por coluna tipo Excel** (item 5). Clicar no cabeçalho da coluna
      ordena **crescente/decrescente** (3º clique limpa). Componente de **tabela reutilizável**
      (`components/TabelaOrdenavel`), pois será usado na lista de equipamentos e alhures.
      *Só frontend.* dep: nenhuma (fundação de UI).

- [ ] **#EQP-FILTROS+ — filtros por mais colunas** (item 7). Além de tag/tipo, filtrar por
      **painel, loop, add, model, status, planta** e datas (últ. manutenção/teste). Integra com
      `#TAB-ORDEM` (mesma tabela). *Frontend* (o endpoint `equipamentosCliente` já devolve tudo;
      avaliar filtros server-side se a lista crescer). dep: #TAB-ORDEM.

- [ ] **#EQP-PAGINA — página por dispositivo** (item 4). Na lista de equipamentos do cliente, cada
      dispositivo abre uma **página própria** (`/equipamentos/:clienteId/:eqpId`) com: **todos os
      dados** do equipamento, **O.S. associadas** (reusa `/cronograma/equipamento/{id}`) e
      **documentos associados**. **Decidido (D-026):** os documentos associados são **manuais/
      datasheets** que o usuário sobe na **biblioteca → Marcas** (#DOC-MARCAS já existe); a página
      do equipamento só exibe um **link** para o(s) documento(s) da biblioteca — **sem** relação de
      upload nova por equipamento. **A resolver na implementação:** como casar o equipamento ao
      documento da marca (por `model`/marca? seleção manual de um `documento_id`?). dep: #EQP-STATUS
      (exibe estado), #OS-HIST-FILTRO (seção de O.S.).

- [ ] **#OS-HIST-FILTRO — histórico de O.S. com filtros** (item 1). No histórico de O.S. (página do
      dispositivo e/ou Buscar equipamento), adicionar **busca** (por título/técnico/data) e
      **filtro por falha** (e por tipo/status). *Frontend* sobre a lista já retornada; se necessário,
      querystring no `/cronograma/equipamento/{id}`. dep: #EQP-PAGINA (onde vive), #OS-PAGINA (link p/ editar).

- [ ] **#OS-PAGINA — criar/editar O.S. na página "Ordens de Serviço"** (item 3). Hoje só dá para
      **criar no calendário**; a página de Ordens de Serviço **não** cria nem edita e **não mostra
      todos os campos**. Objetivo: botão **"Nova O.S."** + **editar** (ADM) com **todos os campos**
      exibidos e editáveis — `tipo`, cliente, **equipamento**, **falha**, **técnicos** (default
      fixos), data, status, observações e os **12 campos do documento** (corretiva). **Extrair um
      componente `FormOS` reutilizável** (hoje o form vive embutido em `Cronograma.tsx`) para não
      duplicar. Resolve também a pendência já registrada de editar campos-doc no #ATV-1.
      *Backend já suporta (PATCH/POST em `/cronograma`).* dep: refatorar o form do calendário em `FormOS`.

- [ ] **#EQP-LISTAS — listas de equipamentos (base do doc de preventiva)** (item 6). Criar **listas
      nomeadas** de equipamentos: botão **"Criar lista"** abre uma janela para **marcar** os
      equipamentos → **Salvar** → a lista aparece **no topo**. Clicar numa lista **filtra** a tabela
      para mostrar só os equipamentos dela. Uso futuro: **gerar um documento de Manutenção
      Preventiva** a partir da lista (os equipamentos entram no documento automaticamente).
      *Backend novo:* entidade `EquipamentoLista` (nome, cliente, N:N com `Equipamento`) + CRUD.
      *Frontend:* seleção/salvar/filtrar + chip das listas no topo. dep: #TAB-ORDEM/#EQP-FILTROS+;
      a **geração do documento** de preventiva é um item futuro à parte (ligado ao `tipo=preventiva`
      da O.S.).

**Plano sugerido (sem retrabalho):** `#EQP-STATUS` → `#TAB-ORDEM` → `#EQP-FILTROS+` →
`#OS-PAGINA` (extrai `FormOS`) → `#EQP-PAGINA` → `#OS-HIST-FILTRO` → `#EQP-LISTAS` →
(*futuro*) gerador de documento de Manutenção Preventiva.
**Decisões confirmadas:** ver [D-026](DECISOES.md) — `Equipamento.falha_id` para o estado "em
falha"; documentos do equipamento = link para a **biblioteca (Marcas)**, sem upload por equipamento.

### G. Lote 4 — novas solicitações (2026-06-25)

**Correções rápidas (independentes, baixo risco):**
- [x] **#FIX-TOKEN — token de acesso dura 1 dia** (item 4): `access_token_expira_min`
      60 → **1440**.
- [x] **#FIX-EMAIL — login/cadastro de e-mail case-insensitive** (item 2): helper
      `normalizar_email` (`strip().lower()`) no **login** e na **criação** (API + CLI admin);
      **backfill** dos existentes via migração Alembic `5c77258e6fc6`. Teste
      `test_email_case_insensitive`.

**Melhorias do Lote 5 (UI/UX):**
- [x] **#CR-DIA2 — modal do dia: scroll único + cards-resumo + editar (admin)**: o modal
      virou header fixo + **corpo com um único scroll** (não esconde mais topo/rodapé);
      cards de atividade são **resumo** [cliente · título · técnicos · status] que **abre a
      página da atividade** ao clicar; **admin** tem botão **editar** (form inline:
      título/cliente/técnicos/status/obs/remover).
- [x] **#HOME-FIRST — login cai na #home + grupos recolhidos**: rota `/` → `/inicio`;
      todos os grupos da sidebar começam **recolhidos** (Consulta deixou de abrir por padrão).
- [x] **#NOTIF-LINK — notificações direcionam à atividade**: notificação `cronograma`
      (com `ref_id`) vira **link** para `/cronograma/atividade/{ref_id}`; feriado (`tipo=feriado`)
      leva ao calendário.
- [x] **#MOBILE — app responsivo**: `<main>` rola; split-screen da Consulta vira tela cheia
      no mobile (chat oculto, doc full); modal do dia com `max-h-[90vh]` e 1 coluna no mobile;
      calendário com células compactas em telas pequenas; tabelas com scroll horizontal.
- [x] **#ATV-FILTROS — filtros + gráfico na tela Atividades**:
- [x] **#ATV-FILTROS — filtros + gráfico na tela Atividades**: filtros multi **Status**
      (agendada/pendente/concluída/cancelada), **Clientes** e **Técnicos** (opções derivadas
      das atividades) + **gráfico de barras por status** (`MultiFiltro` agora componente
      compartilhado e genérico).
- [x] **#ATV-STATUS — status "pendente"** + **lightbox** da imagem: novo status `pendente`
      (válido no backend, cor âmbar); na página da atividade, a imagem **amplia na própria
      página** (overlay) com **X** para fechar (antes abria em nova aba).
- [x] **#SB-ESPACO — espaçamento simétrico da sidebar**: grupos de abas em `space-y-0.5`
      uniforme (removido o `pt-2` que criava distância desigual).
- [x] **#SB-QUEBRA — sidebar quebrando em algumas páginas**: `<main>` ganhou
      `overflow-y-auto` (conteúdo rola dentro do main; não empurra mais a sidebar).
- [x] **#CR-DIA — modal do dia em 2 colunas**: ao abrir o dia, **esquerda** = equipe e onde
      cada um está; **direita** = **cards das atividades** (avatares dos técnicos, status,
      editar, abrir). Modal alargado (`max-w-4xl`).
- [x] **#CR-ATV — sidebar Cronograma → Atividades**: grupo "Cronograma" (Calendário/Atividades);
      tela **Atividades** lista todas com resumo + **faltam N dias** / **atrasada há N**;
      abre a página da atividade. Endpoint `GET /cronograma/atividades`.
- [x] **#FIX-AUDIT — auditoria com colunas cortadas**: tabela em `overflow-x-auto`
      (`min-w`) — não corta mais as últimas colunas (Estratégia/Fallback/Feedback).
- [x] **#CR-FILTROS — filtros Equipe + Clientes (multi) + #ALOC só dias úteis** (Lote 5):
      `listar` aceita `tecnico_ids`/`cliente_ids` (multi); a alocação fixa virtual (#ALOC) só
      aparece **seg–sex** (fim de semana só com agendamento explícito). Frontend: dropdowns
      multi-seleção **Equipe** e **Clientes**. Teste `test_filtros_equipe_clientes_e_aloc_dias_uteis`.
- [x] **#FER-1 — feriado sem atividades** (item 1): `listar` suprime visitas reais +
      virtuais (#ALOC) em datas de feriado (dia mostra só "Feriado"); `criar_feriado`
      **notifica** os técnicos com atividade no dia; `criar` **bloqueia** (400) agendar em
      feriado. Teste `test_feriado_suprime_atividades_e_notifica`.
- [x] **#ATV-1 — card/página de atividade** (item 3): página `/cronograma/atividade/:id`
      (cascata Cronograma → Cliente → Atividade) com `status`, técnicos, **galeria de imagens**
      e **comentários**. Entidades `ComentarioVisita` + `AnexoVisita` (migração Alembic
      `7330e27f4c89`); acesso = atribuído ou admin. Spec
      [`specs/spec-atv1-pagina-atividade.md`](specs/spec-atv1-pagina-atividade.md).

**Equipamentos & cliente (fundação Equipamento primeiro):**
- [x] **#EQP-1 — entidade `Equipamento` + import CSV por cliente** (item 6, núcleo): entidade
      `Equipamento` (`cliente_id`; **painel, loop, add, type, model**); endpoints
      `GET/POST /admin/clientes/{id}/equipamentos[/importar]` (CSV, delimitador auto,
      `substituir`) + DELETE. Migração `2681a9da4b28`. Spec
      [`specs/spec-eqp1-equipamento-csv.md`](specs/spec-eqp1-equipamento-csv.md). **Fases seguintes
      adiadas:** (b) colunas última manutenção/teste; (c) histórico do painel. UI no #CLI-PG.
- [x] **#CLI-PG — página do cliente (como a do usuário)** (item 6): `Cliente` ganhou
      `endereco/contato/telefone/email/observacoes` (migração `84ff7bfcb358`); `GET
      /admin/clientes/{id}` (detalhe + equipamentos); página `pages/ClienteAdmin.tsx`
      (`/admin/cliente/:id`) com dados, logo, **import CSV** e lista de equipamentos.
      Teste `test_cliente_detalhe_e_campos`.
- [x] **#EQP-2 — sidebar "Equipamentos" (grupo)** (item 5): grupo colapsável **Equipamentos**
      com sub-abas **Buscar · Sobre · Lista**; em *Lista*, **card por cliente** → lista daquele
      cliente (`/equipamentos/lista[/:id]`, página `EquipamentosLista.tsx`). Endpoint visível
      `GET /clientes/{id}/equipamentos` (RBAC). Teste `test_equipamentos_visiveis_por_papel`.

> **Sequência sem retrabalho:** (1) #FIX-TOKEN + #FIX-EMAIL → (2) #FER-1 → (3) #ATV-1 →
> (4) **#EQP-1** (fundação) → #CLI-PG → #EQP-2. Equipamento vem **antes** das telas que o
> consomem (página do cliente e grupo da sidebar).

### A. Frontend / UX
- [ ] **#1 — Alinhamento fino ao ChatGPT + "exatidão dos documentos"**: confirmar com o
      usuário se é (a) só ajuste visual, (b) atualizar docs/specs, (c) modelagem de dados.
- [x] **Alerta global de vencimento de documentos** na lista "Gerenciar usuários":
      `docs_alerta` (vencidos/≤30d) no `UsuarioResumo` → badge **⚠️ N doc.** na linha.
- [x] **Input centralizado** no estado vazio da consulta (estilo "O que tem na agenda"):
      quando não há mensagens, o título + campo de envio ficam **centralizados**.
- [x] **Foto do técnico por arquivo**: upload via `/upload` (subpasta `usuarios`) grava a
      **URL** em `foto_url` (tira o data URL pesado do banco). Reusa #FILES; data URL legado tolerado.

### B. Painel ADM — cards hoje placeholder
- [x] **Clientes** (entidade + CRUD): cadastrar clientes; técnicos associados via
      `cliente_ids` na edição do usuário. ⚑ *Fundação* — spec [`specs/spec-etapa1-clientes.md`](specs/spec-etapa1-clientes.md).
- [x] **Gerenciar API keys**: UI no card ADM (lista provedores + cadastrar/rotacionar
      chave). Backend `/admin/provedores` (perm. `gerir_chaves`, chave **cifrada**/mascarada).
- [x] **Banco de dados** (D-022): card ADM com **status** (tamanho, revisão Alembic,
      contagem por tabela, blocos Chroma) + **backup** do SQLite (`/admin/banco[/backup]`).
      Reindexação fica em `POST /ingest` (não duplicada).

### C. Cronograma
- [x] **Backend de cronograma**: modelo `Visita` (técnico, cliente, data, título, status)
      + endpoints CRUD (`/cronograma`). Spec [`specs/spec-etapa3-cronograma.md`](specs/spec-etapa3-cronograma.md).
- [x] Calendário com **dados reais** + **card do dia** (#C1): ADM vê todos os técnicos
      e gerencia; técnico vê os próprios.
- [x] **Fechamento de visita**: no card do dia, **status** editável (agendada/concluída/
      cancelada) + **observações**. Técnico **fecha a própria** visita; admin edita todas.
      `PATCH /cronograma/{id}` com RBAC (técnico: só status/observações da própria).
- [x] **Visão por unidade/local** (D-021): entidade **`Unidade`** (nome/cidade/ativo) +
      `Usuario.unidade_id`/`Cliente.unidade_id`; CRUD `/admin/unidades`; `GET /unidades`;
      filtro **`/cronograma?unidade_id=`** (pela unidade do cliente; inclui virtuais #ALOC).
      Frontend: gestão no card "Clientes e unidades", seletor por cliente/técnico, dropdown
      de unidade no cronograma. Spec [`specs/spec-unidade.md`](specs/spec-unidade.md).

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
- [x] Entidade **Unidade** (D-021): "local de trabalho" virou cadastro + visão por unidade.
      Spec [`specs/spec-unidade.md`](specs/spec-unidade.md).

### E. Núcleo RAG / fases pendentes
- [ ] **Fase 10** — estratégias de nuvem (Claude) + arena. dep: API key.
- [ ] **Fase 11** — reranker cross-encoder (D-020); avaliação RAGAS-lite.
- [x] **Migrações Alembic** (D-022) — banco real gerido por Alembic (baseline +
      `aplicar_migracoes`); micro-migração caseira fica para testes/fallback. Spec
      [`specs/spec-d022-alembic-banco.md`](specs/spec-d022-alembic-banco.md).

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
      (visível por papel); página Relatórios com **cards** (avatar cor/logo) → `/relatorios/:id`;
      sidebar com **grupo "Relatórios"** colapsável listando os clientes.
- [x] **#R2 — Página de relatório do cliente** (`/relatorios/:id`): deixou de ser placeholder.
      Indicadores (atividades/concluídas/atrasadas/equipamentos), **técnicos que atendem**,
      **atividades recentes** (link p/ a atividade), **equipamentos** (#EQP-2) e **documentos**
      do cliente (#DOC3). Só endpoints visíveis (sem mudança de backend).
- [x] **#CR6 — Calendário: atividade + cliente na célula** (item 3): célula agrupa por
      **cliente** (card-miniatura com **cor/logo** do cliente + avatares dos técnicos
      empilhados; 2+ técnicos → um card). **Editar** atividade no card do dia (admin:
      título/técnico/cliente). `VisitaResumo` ganhou `cliente_cor`/`cliente_logo`.
- [x] **#CR7 — Layout do calendário**: **número do dia grande** no canto superior; hoje
      em destaque; fim de semana/feriado coloridos.
- [x] **#DOC1 — Documentos: cards Empresa + Marcas** (item 2): `DocumentoEquipamento` +
      router `/biblioteca`; página com card **Empresa (logo)** e **Marcas** (agrupado);
      **CRUD** (upload/download/renomear/ocultar/excluir), só admin sobe; arquivos em
      `/arquivos/biblioteca/...`. Spec [`specs/spec-doc1-biblioteca.md`](specs/spec-doc1-biblioteca.md).

### I. Novas solicitações (2026-06-24, lote 2)
- [x] **#CR8 — Múltiplos técnicos por atividade** (item 1): N:N `visita_tecnico`
      (`Visita.tecnicos`; `usuario_id` = responsável). Criar com **vários técnicos**
      (checkbox), célula/card do dia mostram todos, **notifica todos**, **GET** filtra por
      atribuição, **qualquer atribuído fecha**. Backfill na migração. Spec spec-etapa3.
- [x] **#ALOC — Cliente fixo (padrão) por técnico** (item 2): `Usuario.cliente_padrao_id`
      (editável em Perfil); `GET /cronograma` injeta **alocações virtuais** (`fixo`) nos
      dias sem visita explícita; visita real **sobrescreve** (relocação); card do dia
      mostra fixos read-only. Spec spec-etapa3.

### J. Documentos — evolução (2026-06-24, lote 3)
- [x] **#DOC2 — Documentos: grupo na sidebar + cards** (item 3): sidebar com **grupo
      "Documentos"** (Todos/Empresa/Clientes/Marcas via `?cat=`); página com seções e
      **card por cliente** (avatar cor/logo), como Relatórios.
- [x] **#DOC3 — Documentos de cliente** (item 2): categoria **`cliente`** +
      `DocumentoEquipamento.cliente_id`; upload com seletor de cliente; card por cliente.
- [x] **#DOC4 — Busca nos documentos** (item 3): backend `GET /biblioteca?busca=` (ilike)
      + campo de busca na página (filtro por nome).

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

Etapa F — FUNDAÇÕES  ✅ (#FILES infra de arquivos · #CLIV cor/logo por cliente)
Etapa N — Telas      ✅ (#R1 relatórios · #CR6/#CR7 calendário · #DOC1 documentos)

Etapa L2 — Novas solicitações (lote 2)  ◀ PRÓXIMA
  L2a • #CR8 ⚑ — múltiplos técnicos por atividade (Visita → N:N visita_tecnico)
        → refactor do core; afeta notificações/fechamento/GET. Fazer antes de #ALOC.
  L2b • #ALOC — alocação fixa de técnicos a clientes (decidir: visual × recorrente)
        dep: #CR8 recomendado
  L2c • #DOC2 — Documentos como grupo na sidebar (sub-abas)  dep: #DOC1 ✅ (independente)

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

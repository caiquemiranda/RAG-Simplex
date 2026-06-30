# Log do Projeto — RAG-Simplex

Histórico **append-only** do que foi feito. Entrada mais recente no topo. Não
reescrever entradas antigas — apenas adicionar. Para o "onde estou agora", use
[`ESTADO_ATUAL.md`](ESTADO_ATUAL.md).

## 2026-06-26 — #MAP-3: editor de mapa na página do cliente (plantas + posicionar)

**Branch:** `feat/buscar-equipamento`. Frontend-only (reusa endpoints do #MAP-1).

- `ClienteAdmin.tsx` ganhou: card **Plantas** (subir **PDF** → N plantas via
  `uploadPlanta`; remover) e card **Posicionar no mapa** (seletor de planta + de equipamento;
  `VisualizadorPlanta` com `onClicarPlanta` grava `pos_x/pos_y/planta_id` via
  `atualizarEquipamento`; marcador clicável seleciona p/ mover; "tirar do mapa").
- `api.ts`: `api.admin.{plantas,uploadPlanta,removerPlanta,atualizarEquipamento}`.
- **Feature #MAP completa de ponta a ponta** (cadastra planta → posiciona → busca/localiza).
  Falta só #MAP-4 (página de detalhes do equipamento com histórico, via futura O.S.). `tsc` OK.

**Arquivos:** `frontend/src/{pages/ClienteAdmin.tsx,lib/api.ts}`, `docs/**`.

---

## 2026-06-26 — #MAP-2: visualizador custom + Buscar equipamento (frontend)

**Branch:** `feat/buscar-equipamento`. Frontend-only (backend segue em 99 testes).

- **`components/VisualizadorPlanta.tsx`** (zero dependência): imagem com **zoom** (scroll, zoom
  no cursor) e **pan** (arraste), **marcadores** posicionados por coordenadas (contra-escalados
  p/ tamanho constante), **popup** do marcador ativo (coords de tela), **foco** (zoom+centro)
  num marcador, e `onClicarPlanta(x,y)` para o editor (#MAP-3). Controles +/−/ajustar.
- **`pages/Equipamentos.tsx`** (substitui o placeholder): cliente → busca por **tag** (dropdown
  de resultados) → abre a planta certa → **localiza** o equipamento (marcador + popup com
  tipo/status/última manutenção) → card de **detalhes** completo + "Localizar no mapa".
  Cor do marcador por status (verde/âmbar/vermelho). Seletor de planta (multipágina).
- `api.ts`: tipo `Equipamento` estendido + `Planta`; `equipamentosCliente(cid, busca?)` +
  `plantasCliente(cid)`. `tsc` OK.

**Arquivos:** `frontend/src/{components/VisualizadorPlanta.tsx,pages/Equipamentos.tsx,lib/api.ts}`, `docs/**`.

---

## 2026-06-26 — #MAP-1: backend do "Buscar equipamento" (plantas + posição + manutenção)

**Branch:** `feat/buscar-equipamento` (do `main`). Decisão **D-023**. Spec
[`specs/spec-map-mapa-dispositivos.md`](specs/spec-map-mapa-dispositivos.md).

- Olhei o projeto legado (`automation-reports-maintenance/SAAS/sistema-manutencao-3`): React
  CRA + Leaflet (imagem-base + X/Y em `Dispositivos.js`). Decidido (D-023): trazer nativo,
  **visualizador custom** (sem npm), **PDF→PNG no servidor** (PyMuPDF), **`tag`** como chave,
  recadastro de coordenadas.
- **Modelo:** `Planta` (cliente_id/nome/imagem_url/largura/altura/ordem); `Equipamento` +
  `tag/status/ultima_manutencao/ultimo_teste/planta_id/pos_x/pos_y`. Migração `ec6397a8beb8`.
- **Backend:** `app/plantas.py` (conversor `pdf_para_pngs` + CRUD de plantas, upload PDF→N PNGs
  via `arquivos.salvar_bytes`); `admin.py` (CSV ganhou tag/status/datas; `PATCH /admin/
  equipamentos/{id}` p/ posição); `main.py` (`?busca=` por tag + `GET /clientes/{id}/plantas`).
  `pymupdf==1.24.10` no requirements; `config.planta_dpi=150`.
- **Fecha a "fase B"** do #EQP-1 (última manutenção/teste). **99 passed**; testes `test_plantas` (2).

**Arquivos:** `app/{modelos,plantas,admin,main,config,arquivos}.py`,
`alembic/versions/ec6397a8beb8_*.py`, `requirements.txt`, `tests/test_plantas.py`, `docs/**`.

---

## 2026-06-25 — Lote 5 (9): modal do dia — scroll único, cards-resumo, editar (admin)

**Branch:** `feat/lote5-fixes`.

- **#CR-DIA2:** modal do dia reestruturado em **header fixo (shrink-0) + corpo `flex-1
  overflow-y-auto`** (um único scroll; removido o `max-h-[62vh]` aninhado do painel direito
  que escondia topo/rodapé — img do usuário).
- **Cards = resumo** [cliente · título · avatares dos técnicos · status]; clicar abre
  `/cronograma/atividade/{id}`. **Admin** ganha botão **editar** → form inline
  (título/cliente/status/técnicos/observações/remover), via estado `editandoId`.
- Técnico vê o resumo e edita status/comentários na **página da atividade**.
- **97 passed**; `tsc` OK.

**Arquivos:** `frontend/src/pages/Cronograma.tsx`, `docs/**`.

---

## 2026-06-25 — Lote 5 (8): home-first, notificações com link, responsivo mobile

**Branch:** `feat/lote5-fixes`.

- **#HOME-FIRST:** rota `/` e `*` → **`/inicio`** (login cai na #home); sidebar com **todos os
  grupos recolhidos** por padrão (grupo Consulta deixou de iniciar aberto).
- **#NOTIF-LINK:** notificação de atividade (`tipo=cronograma`, `ref_id`=visita) vira **link**
  para `/cronograma/atividade/{ref_id}`; feriado passou a `tipo=feriado` → link p/ o calendário.
  Página `Notificacoes.tsx` renderiza `Link`/`button` conforme o destino.
- **#MOBILE:** `<main>` rola (já corrigido em (6)); split-screen da Consulta vira **tela cheia**
  no mobile (`hidden md:flex` no chat; `DocumentoPanel` `w-full md:w-1/2`); modal do dia
  `max-h-[90vh] overflow-y-auto` e 1 coluna no mobile; calendário com células compactas
  (`min-h-[64px] sm:min-h-[100px]`).
- **Teste:** `tipo=feriado` coberto em `test_feriado_suprime_atividades_e_notifica`. **97 passed**; `tsc` OK.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`,
`frontend/src/{App.tsx,components/{Sidebar,DocumentoPanel}.tsx,pages/{Notificacoes,Consulta,Cronograma}.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (7): filtros+gráfico em Atividades, status pendente, lightbox, sidebar

**Branch:** `feat/lote5-fixes`.

- **#ATV-FILTROS:** tela Atividades com filtros multi **Status/Clientes/Técnicos** (opções
  derivadas das atividades) + **gráfico de barras por status**. `MultiFiltro` extraído para
  `components/MultiFiltro.tsx` (genérico `string|number`); Cronograma reusa.
- **#ATV-STATUS:** novo status **`pendente`** (`_STATUS_VALIDOS`, cor âmbar em `format.ts`,
  selects do Cronograma e da Atividade). **Lightbox**: imagem da atividade amplia na própria
  página (overlay com X) em vez de abrir nova aba.
- **#SB-ESPACO:** sidebar — abas em `space-y-0.5` uniforme (removido `pt-2`).
- **#SB-QUEBRA:** `<main>` (Layout) ganhou `overflow-y-auto` → conteúdo rola dentro do main,
  não empurra/quebra mais a sidebar (corrige as páginas novas sem wrapper `h-full`).
- **Teste:** status `pendente` coberto em `test_tecnico_fecha_propria_visita`. **97 passed**; `tsc` OK.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`,
`frontend/src/{components/{Layout,Sidebar,MultiFiltro,AuditoriaView}.tsx,lib/format.ts,pages/{Atividades,Atividade,Cronograma}.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (6): melhorias UI — modal do dia, Atividades, fix auditoria

**Branch:** `feat/lote5-fixes`.

- **#CR-DIA:** modal do dia reescrito em **2 colunas** (`max-w-4xl`): esquerda = **equipe
  do dia** (`equipeDia`, dedup, onde cada um está); direita = **cards das atividades**
  (linha de avatares de todos os técnicos, status, editar, abrir). Fixos só à esquerda.
- **#CR-ATV:** sidebar "Cronograma" vira **grupo** (Calendário/Atividades). Nova tela
  `pages/Atividades.tsx` (`/cronograma/atividades`): resumo + **faltam N / atrasada há N**
  (calculado de `data`/`status`), abre a página da atividade. Backend `GET
  /cronograma/atividades` (técnico as suas; admin todas). `api.cronograma.atividades()`.
- **#FIX-AUDIT:** `AuditoriaView` — tabela em `overflow-x-auto` + `min-w-[760px]` (não corta
  mais as últimas colunas).
- **Testes** `test_lista_atividades`. **97 passed**; `tsc` OK.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,components/Sidebar.tsx,components/AuditoriaView.tsx,pages/Cronograma.tsx,pages/Atividades.tsx,App.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (5): #EQP-2 — sidebar "Equipamentos" + lista por cliente

**Branch:** `feat/lote5-fixes`. Spec: [`specs/spec-eqp2-cli-pg.md`](specs/spec-eqp2-cli-pg.md).

- **API visível:** `GET /clientes/{id}/equipamentos` (`EquipamentoPublico`) — admin todos;
  técnico só dos seus clientes (403 caso contrário).
- **Sidebar:** "Buscar Equipamento" → **grupo "Equipamentos"** (Buscar/Sobre/Lista).
- **Frontend:** `pages/EquipamentosLista.tsx` (`/equipamentos/lista[/:id]`) — cards de
  clientes → tabela de equipamentos do cliente; `/equipamentos/sobre` placeholder.
  `api.equipamentosCliente(id)`.
- **Teste** `test_equipamentos_visiveis_por_papel`. **96 passed**; `tsc` OK. **Lote 5 completo.**

**Arquivos:** `app/main.py`, `tests/test_admin.py`,
`frontend/src/{App.tsx,lib/api.ts,components/Sidebar.tsx,pages/EquipamentosLista.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (4): #CLI-PG — página do cliente (endereço/contatos + equipamentos)

**Branch:** `feat/lote5-fixes`.

- **Modelo:** `Cliente` ganhou `endereco/contato/telefone/email/observacoes` (migração Alembic
  `84ff7bfcb358`, batch add_column; ruído de FK removido).
- **API (`admin.py`):** `ClienteIn/Atualizar/Resumo` com os campos; `ClienteDetalhe`
  (resumo + `equipamentos[]`); novo `GET /admin/clientes/{id}` (detalhe).
- **Frontend:** página `pages/ClienteAdmin.tsx` (rota `/admin/cliente/:id`) — dados do
  cliente, logo, endereço/contatos, e seção **Equipamentos** (import CSV com `substituir`,
  tabela, remover). Nome do cliente na lista do painel vira **link** para a página.
  `api.ts`: `AdminCliente` estendido + `ClienteDetalhe` + `api.admin.cliente(id)`.
- **Teste** `test_cliente_detalhe_e_campos`. **95 passed**; `tsc` OK.

**Arquivos:** `app/{modelos,admin}.py`, `alembic/versions/84ff7bfcb358_*.py`,
`tests/test_admin.py`, `frontend/src/{App.tsx,lib/api.ts,pages/ClienteAdmin.tsx,pages/Admin.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (3): #EQP-1 — entidade Equipamento + import CSV (backend)

**Branch:** `feat/lote5-fixes`. Spec: [`specs/spec-eqp1-equipamento-csv.md`](specs/spec-eqp1-equipamento-csv.md).

- **Modelo:** `Equipamento` (cliente_id cascade; `painel, loop, add, type, model`, `criado_em`);
  `Cliente.equipamentos`. Migração Alembic `2681a9da4b28` (limpei o ruído de FK do SQLite).
- **API (`admin.py`):** `GET /admin/clientes/{id}/equipamentos`, `POST .../importar`
  (CSV multipart; delimitador `,`/`;` via Sniffer; cabeçalho case-insensitive; `substituir`),
  `DELETE /admin/equipamentos/{id}`. Perm. `gerir_usuarios`.
- **api.ts:** tipos `Equipamento`/`ImportEquipResultado` + `equipamentos/importarEquipamentos/
  removerEquipamento`. (UI fica no #CLI-PG.)
- **Teste** `test_equipamentos_import_csv`. **94 passed**; `tsc` OK.

**Arquivos:** `app/{modelos,admin}.py`, `alembic/versions/2681a9da4b28_*.py`,
`tests/test_admin.py`, `frontend/src/lib/api.ts`, `docs/**`.

---

## 2026-06-25 — Lote 5 (2): #CR-FILTROS — Equipe/Clientes (multi) + #ALOC só dias úteis

**Branch:** `feat/lote5-fixes`.

- **Backend (`cronograma.listar`):** `tecnico_id` (single) → **`tecnico_ids`** (multi, filtro
  "Equipe") + novo **`cliente_ids`** (multi, filtro "Clientes"); ambos aplicados a visitas
  reais e às alocações fixas (#ALOC). **#ALOC só seg–sex** (`dia.weekday() < 5`) — fim de
  semana só com agendamento explícito.
- **Frontend (`Cronograma.tsx`):** componente reutilizável **`MultiFiltro`** (botão + dropdown
  de checkboxes); filtros **Equipe** (técnicos) e **Clientes** (via `clientesVisiveis`).
  `api.cronograma.listar(de, ate, {tecnicoIds, clienteIds, unidadeId})`.
- **Teste** `test_filtros_equipe_clientes_e_aloc_dias_uteis`. **93 passed**; `tsc` OK.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,pages/Cronograma.tsx}`, `docs/**`.

---

## 2026-06-25 — Lote 5 (1): #ATV-1 página de atividade (comentários + anexos)

**Branch:** `feat/lote5-fixes` (do `main` após o merge do Lote 4, PR #7).
Spec: [`specs/spec-atv1-pagina-atividade.md`](specs/spec-atv1-pagina-atividade.md).

- **Modelo:** entidades `ComentarioVisita` e `AnexoVisita` (cascade em `Visita`); migração
  Alembic `7330e27f4c89` (limpei o ruído de FK do autogenerate no SQLite — só as 2 tabelas).
- **API (`cronograma.py`):** `GET /cronograma/{id}` (detalhe), `POST .../comentarios`,
  `POST/DELETE .../anexos` (imagem via #FILES → `/arquivos/atividades/`). RBAC: técnico
  **atribuído** ou **admin** (`_pode_gerir_visita`).
- **Frontend:** página `pages/Atividade.tsx` (rota `/cronograma/atividade/:id`) — breadcrumb
  Cronograma→Cliente→Atividade, status, técnicos, galeria de imagens (anexar/remover),
  thread de comentários. Card do dia ganhou link **"abrir ↗"** (só visitas reais).
  `api.ts`: tipos + métodos `obter/comentar/anexar/removerAnexo` + helper `uploadMultipart`.
- **Higiene:** recuperei (cherry-pick) o doc backfill do Lote 4 que ficou fora do PR #7.
- **Testes:** `test_atividade_detalhe_e_comentario`, `test_atividade_anexo_imagem`. **92 passed**; `tsc` OK.

**Arquivos:** `app/{modelos,cronograma}.py`, `alembic/versions/7330e27f4c89_*.py`,
`tests/test_cronograma.py`, `frontend/src/{App.tsx,lib/api.ts,pages/Atividade.tsx,pages/Cronograma.tsx}`,
`docs/**`.

---

## 2026-06-25 — Lote 4 (2): #FER-1 feriado sem atividades

**Branch:** `feat/lote4-fixes`.

- `cronograma.listar`: carrega os feriados do intervalo e **suprime** visitas reais +
  alocações fixas (#ALOC) nos dias de feriado (dia mostra só "Feriado").
- `criar_feriado`: ao marcar feriado num dia com atividades, **notifica** os técnicos
  envolvidos ("atividades suspensas").
- `criar`: **bloqueia** (400) agendar atividade em dia de feriado.
- Frontend já exibia o feriado na célula; sem mudança. Teste
  `test_feriado_suprime_atividades_e_notifica`. **90 passed**.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`, `docs/**`.

---

## 2026-06-25 — Lote 4 (1/3): correções rápidas #FIX-TOKEN + #FIX-EMAIL

**Branch:** `feat/lote4-fixes` (criada do `main` após o merge do PR #6).

- **#FIX-TOKEN:** `access_token_expira_min` 60 → **1440** (token dura 1 dia).
- **#FIX-EMAIL:** e-mail **case-insensitive** — helper `auth.normalizar_email`
  (`strip().lower()`) no **login** (`main.py`), na **criação** (`admin.py`) e no CLI admin
  (`auth.py`). Backfill dos existentes via migração Alembic **`5c77258e6fc6`** (lowercase,
  pulando colisões). Teste `test_email_case_insensitive`. **89 passed**.

**Arquivos:** `app/{config,auth,main,admin}.py`, `alembic/versions/5c77258e6fc6_*.py`,
`tests/test_admin.py`, `docs/**`.

---

## 2026-06-25 — Robustez: Alembic + card "Banco de dados" (D-022)

**Branch:** `feat/robustez-alembic-banco` (criada de `main` após o merge do PR #5).
Spec: [`specs/spec-d022-alembic-banco.md`](specs/spec-d022-alembic-banco.md).

- **Contexto:** PR #5 (`feat/fase-7-frontend`) foi mergeado em `main` (`aece962`); `main`
  local estava defasado e foi sincronizado (fast-forward). Nada perdido.
- **Alembic (D-022):** scaffold (`alembic.ini`, `env.py` usando `settings.database_url` +
  `Base.metadata`, `render_as_batch` no SQLite); baseline `2bd03ef0fccf` (17 tabelas);
  banco real **stampado**. `db.py`: `aplicar_migracoes()` (upgrade head) é a fonte de
  verdade do banco real; `criar_tabelas`/create_all fica p/ testes e fallback. `alembic==1.13.1`
  no requirements; `backend.ps1` e `app.db --init` aplicam via Alembic.
- **Card "Banco de dados":** `app/banco.py` (`/admin/banco` status + `/backup`); frontend
  no `Admin.tsx` (migração em dia/pendente, tamanho, tabelas com contagem, botão backup).
- **Testes:** `test_migracoes` (2) + `test_banco` (4). **88 passed**; `tsc` OK.

**Arquivos:** `alembic/**`, `alembic.ini`, `app/{db,banco,main}.py`, `requirements.txt`,
`scripts/backend.ps1`, `tests/test_{migracoes,banco}.py`,
`frontend/src/{lib/api.ts,pages/Admin.tsx}`, `docs/**`.

---

## 2026-06-25 — Entidade Unidade + "visão por unidade" no cronograma (D-021)

**Branch:** `feat/fase-7-frontend`. Spec: [`specs/spec-unidade.md`](specs/spec-unidade.md).

- **Modelo:** `Unidade` (nome único/cidade/ativo); `Usuario.unidade_id` e
  `Cliente.unidade_id` (+ `unidade_rel`). Texto legado mantido como fallback. Micro-migração
  genérica criou a tabela + colunas (banco real migrado).
- **API:** CRUD `/admin/unidades` (DELETE 409 se em uso; nome duplicado 409); `GET /unidades`
  (ativas); `unidade_id` em criar/atualizar cliente e usuário (valida → 404); `ClienteResumo`/
  `UsuarioDetalhe` com `unidade_id`/`unidade_nome`. Cronograma: filtro `?unidade_id=` (pela
  unidade do cliente; respeita virtuais #ALOC); `VisitaResumo.unidade_id`.
- **Frontend:** tipos/métodos em `api.ts`; Admin card "Clientes e unidades" (gestão de
  unidades + seletor por cliente/linha/perfil de usuário); dropdown de unidade no Cronograma.
- **Teste** `test_unidade_crud_e_visao_por_unidade`. **82 passed**; `tsc` OK.

**Arquivos:** `app/{modelos,admin,main,cronograma}.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,pages/Admin.tsx,pages/Cronograma.tsx}`, `docs/**`,
`specs/spec-unidade.md`.

---

## 2026-06-25 — Foto do usuário por arquivo (tira data URL do banco)

**Branch:** `feat/fase-7-frontend`.

- Frontend Admin: `onFoto` deixa de usar `FileReader`/data URL e passa a fazer
  **upload real** via `uploadArquivo(file, "usuarios")` (#FILES) → grava a **URL**
  (`/arquivos/usuarios/...`) em `foto_url`. Banco fica leve; `Avatar` já resolve o path.
- Backend já aceitava `foto_url` string (sem mudança de schema). Comentário do modelo
  atualizado; data URL legado continua tolerado na exibição.
- Teste `test_perfil_e_documentos_do_usuario` agora afirma `foto_url=/arquivos/...`. **81 passed**; `tsc` OK.

**Arquivos:** `frontend/src/pages/Admin.tsx`, `app/modelos.py`, `tests/test_admin.py`.

Formato de cada entrada:
`## AAAA-MM-DD — Fase N — título` · o que foi feito · decisões · arquivos.

---

## 2026-06-24 — Etapa 0d: GET /me/documentos + bloco no dashboard

**Branch:** `feat/fase-7-frontend`. Fecha a **Etapa 0**.

- **Backend:** `GET /me/documentos` (documentos do próprio usuário; `usuario_atual`).
  Teste `test_me_documentos`. **70 testes**.
- **Frontend:** dashboard (#HOME) ganhou card **"Seus documentos"** com status de
  validade (válido/vence em Nd/vencido); `api.meusDocumentos()`.

**Arquivos:** `app/main.py`, `tests/test_admin.py`, `frontend/src/{lib/api.ts,pages/Home}.tsx`.

---

## 2026-06-24 — Etapa 0b/0c: alerta de documentos + input centralizado

**Branch:** `feat/fase-7-frontend`.

- **0b:** `UsuarioResumo.docs_alerta` (documentos vencidos/≤30 dias) → **badge
  ⚠️ N doc.** na lista de "Gerenciar usuários". Teste `test_lista_marca_documento_vencendo`.
- **0c:** estado vazio do chat com **título + campo centralizados** (estilo "O que
  tem na agenda"); campo de envio reaproveitado (`campoEnvio`). `tsc` OK; **69 testes**.

**Arquivos:** `app/admin.py`, `tests/test_admin.py`, `frontend/src/{lib/api.ts,
pages/{Admin,Consulta}.tsx}`.

---

## 2026-06-24 — Lote 3 Documentos: cliente (#DOC3) + cards/sidebar (#DOC2) + busca (#DOC4)

**Branch:** `feat/fase-7-frontend`.

- **#DOC3:** `DocumentoEquipamento.cliente_id` + categoria `cliente`; upload exige
  `cliente_id`; `_resumo` traz `cliente_nome`. Migração automática.
- **#DOC4:** `GET /biblioteca?busca=` (ilike) + filtros `categoria`/`cliente_id`; campo
  de busca na página (filtro por nome).
- **#DOC2:** página Documentos reescrita — seções **Empresa/Clientes/Marcas**, **card por
  cliente** (avatar cor/logo) como Relatórios; sidebar com **grupo "Documentos"**
  (`?cat=`). `api.biblioteca` atualizado (listar com params; criar com opts/cliente_id).
- **81 passed**; `tsc` OK. Docs: MODELO_DADOS, ARQUITETURA, TESTES, spec-doc1, BACKLOG.

**Arquivos:** `app/{modelos,biblioteca}.py`, `tests/test_biblioteca.py`,
`frontend/src/{lib/api.ts,pages/Documentos.tsx,components/Sidebar.tsx}`, `docs/**`.

---

## 2026-06-24 — #ALOC: cliente fixo por técnico + #DOC2/3/4 no backlog

**Branch:** `feat/fase-7-frontend`.

- **#ALOC:** `Usuario.cliente_padrao_id` (cliente fixo). `GET /cronograma` injeta
  **alocações virtuais** (`fixo=true`, id=0) para técnicos fixos nos dias **sem** visita;
  visita real **sobrescreve**. Editável em *Perfil e gestão*; card do dia mostra fixos
  read-only com aviso de relocação. Migração automática. Teste `test_cliente_fixo_alocacao`.
- **Backlog (lote 3 §J):** **#DOC2** (Documentos como grupo na sidebar + cards),
  **#DOC3** (documentos de cliente), **#DOC4** (busca em documentos).
- **80 passed**; `tsc` OK. Docs: MODELO_DADOS, spec-etapa3, TESTES, BACKLOG.

**Arquivos:** `app/{modelos,admin,cronograma}.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,pages/{Cronograma,Admin}.tsx}`, `docs/**`.

---

## 2026-06-24 — #CR8: múltiplos técnicos por atividade (Visita N:N)

**Branch:** `feat/fase-7-frontend`.

- **Modelo:** N:N `visita_tecnico` + `Visita.tecnicos`; `usuario_id` vira o responsável
  (1º). Backfill em `db.criar_tabelas` (`_backfill_visita_tecnicos`).
- **API:** `VisitaIn.usuario_ids` (1+); `VisitaResumo.tecnicos[]` (mantém `tecnico_nome/
  foto` do 1º p/ o dashboard). `GET` filtra por **atribuição**; criar **notifica todos**;
  **qualquer atribuído** fecha; admin reatribui via `usuario_ids`.
- **Frontend:** criar atividade com **checkbox** de técnicos; célula agrupa por cliente
  mostrando **todos** os técnicos (dedup); card do dia edita técnicos por checkbox.
- **Testes:** `test_multiplos_tecnicos_por_atividade` → **79 passed**. `tsc` OK.
  Docs: MODELO_DADOS, spec-etapa3, TESTES, BACKLOG (#CR8 ✅).

**Arquivos:** `app/{modelos,cronograma,db}.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,pages/Cronograma.tsx}`, `docs/**`.

---

## 2026-06-24 — Backlog lote 2 + auditoria de docs

- **Backlog §I (lote 2):** **#CR8** múltiplos técnicos por atividade (Visita → N:N;
  refactor core, fazer antes de #ALOC) · **#ALOC** alocação fixa de técnicos a clientes
  (decidir visual × recorrente) · **#DOC2** Documentos como grupo na sidebar (sub-abas).
  Sequência: #CR8 → #ALOC; #DOC2 independente.
- **Auditoria:** `ESTADO_ATUAL` e `PLANEJAMENTO` estavam em "70 testes" e com próximos
  passos já feitos → atualizados para o estado real (**78 testes**; #FILES/#CLIV/#R1/
  #DOC1/#CR6-7 marcados). Snapshot do PLANEJAMENTO completado.

---

## 2026-06-24 — #DOC1: biblioteca de documentos (empresa + marcas)

**Branch:** `feat/fase-7-frontend`.

- **Modelo:** `DocumentoEquipamento` (categoria empresa|marca, marca, nome, url,
  oculto, criado_em). Migração automática.
- **API:** router `/biblioteca` (GET leitura por papel — oculto só admin; POST multipart
  upload, PATCH renomear/ocultar, DELETE remove registro+arquivo). Reusa `salvar_upload`
  com **subpastas aninhadas** (corrigido o sanitizador para preservar `biblioteca/marca`).
- **Frontend:** `pages/Documentos.tsx` com card **Empresa** (logo) + **Marcas** (agrupado);
  upload/renomear/ocultar/excluir (admin) e download (link). `api.biblioteca.*` + `urlArquivo`.
- **Testes:** `test_biblioteca.py` (3) → **78 passed**. Spec
  [`spec-doc1-biblioteca.md`](specs/spec-doc1-biblioteca.md); ARQUITETURA/MODELO_DADOS/TESTES/INDICE.

**Arquivos:** `app/{modelos,biblioteca,main,arquivos}.py`, `tests/test_biblioteca.py`,
`frontend/src/{lib/api.ts,pages/Documentos.tsx}`, `docs/**`.

---

## 2026-06-24 — #CR6/#CR7: calendário por cliente + editar atividade + layout

**Branch:** `feat/fase-7-frontend`.

- **Backend:** `VisitaResumo` ganhou `cliente_cor`/`cliente_logo` (do `Cliente`).
- **#CR6:** a célula do calendário **agrupa por cliente** — card-miniatura com cor/logo
  do cliente + **avatares dos técnicos empilhados** (2+ técnicos no mesmo cliente = um
  card). No **card do dia**, admin **edita** a atividade (título, técnico, cliente) além
  de status/observações; técnico segue só fechando a própria.
- **#CR7:** **número do dia grande** no topo da célula; hoje em destaque; fds/feriado
  coloridos.
- `tsc` OK; **75 passed**. Docs: BACKLOG #CR6/#CR7 ✅.

**Arquivos:** `app/cronograma.py`, `frontend/src/{lib/api.ts,pages/Cronograma.tsx}`, `docs/**`.

---

## 2026-06-24 — #R1: Relatórios = cards de clientes + grupo na sidebar

**Branch:** `feat/fase-7-frontend`.

- **Backend:** `GET /clientes` (autenticado) — admin vê todos os ativos; técnico vê só
  os seus (`clientes_rel`). `ClientePublico` (id, nome, unidade, cor, logo_url).
- **Frontend:** `pages/Relatorios.tsx` (grid de **cards** com avatar cor/logo) →
  `pages/RelatorioCliente.tsx` (`/relatorios/:id`, shell do relatório). **Sidebar**:
  "Relatórios" vira **grupo colapsável** listando os clientes (avatar) + "Visão geral".
  `api.clientesVisiveis`.
- **Testes:** `test_clientes_visiveis_por_papel` → **75 passed**. `tsc` OK.

**Arquivos:** `app/main.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,components/Sidebar.tsx,pages/{Relatorios,RelatorioCliente}.tsx,App.tsx}`,
`docs/**`.

---

## 2026-06-24 — #CLIV: cor + logo por cliente (fundação visual)

**Branch:** `feat/fase-7-frontend`.

- **Modelo:** `Cliente` ganha `cor` (hex) e `logo_url` (`/arquivos/...`). Migração
  automática. API ADM (`ClienteIn/Atualizar/Resumo` + `_resumo_cliente`) expõe/aceita.
- **Frontend:** card Clientes com **seletor de cor** (`<input type=color>`) e **upload
  de logo** (via `uploadArquivo` → `/upload`); lista mostra **avatar** (logo ou iniciais
  na cor do cliente). `Avatar` ganhou prop `cor`. `api.ts`: `uploadArquivo` + tipos.
- **Reuso:** fundação de **#R1** (cards de cliente) e **#CR6** (miniatura no calendário).
- `tsc` OK; **74 passed** (test_clientes cobre cor/logo).

**Arquivos:** `app/{modelos,admin}.py`, `tests/test_admin.py`,
`frontend/src/{lib/api.ts,components/Avatar.tsx,pages/Admin.tsx}`, `docs/**`.

---

## 2026-06-24 — #FILES: infra de upload/arquivos (keystone)

**Branch:** `feat/fase-7-frontend`.

- **`app/arquivos.py`:** `salvar_upload`/`remover_arquivo` (nome único+sanitizado,
  10 MB, guarda de path traversal) + `POST /upload` (multipart, perm. `gerir_usuarios`).
  `main.py`: monta `StaticFiles` em `/arquivos`; cria a pasta no startup.
- **Config:** `settings.arquivos_dir = BASE_DIR/'arquivos'` (gitignorada). Dep nova
  `python-multipart==0.0.20` (requirements + instalada).
- **Reuso:** destrava logo do cliente (#CLIV), documentos (#DOC1) e foto-por-arquivo.
- **Testes:** `test_arquivos.py` (3) → **74 passed**. Spec
  [`spec-files-arquivos.md`](specs/spec-files-arquivos.md); ARQUITETURA/TESTES/INDICE/BACKLOG.

**Arquivos:** `app/{arquivos,main,config}.py`, `requirements.txt`, `.gitignore`,
`tests/test_arquivos.py`, `docs/**`.

---

## 2026-06-24 — Backlog: novas solicitações (clientes visuais, documentos, calendário)

Adicionadas ao [`BACKLOG.md`](BACKLOG.md) §H + sequência §2 (foco em não-retrabalho):
- **#FILES** ⚑ infra de upload/arquivos (pasta na raiz) — keystone de #DOC1 / logo do
  cliente / foto-por-arquivo.
- **#CLIV** ⚑ cor + logo por cliente (`Cliente.cor/logo_url`) — fundação de #R1 e #CR6.
- **#R1** Relatórios = cards de clientes + grupo na sidebar.
- **#CR6+#CR7** calendário: atividade+cliente na célula, agrupar 2+ técnicos por
  cliente num card, **editar** atividade, layout (número grande, estilo referência).
- **#DOC1** Documentos: cards Empresa (logo) + Marcas, CRUD de arquivos (upload/download/
  renomear/ocultar/excluir), só admin.

Ordem sem retrabalho: **#FILES → #CLIV → (#R1, #CR6/#CR7, #DOC1)**.

---

## 2026-06-24 — Etapa 1: fechamento de visita + decisão Unidade (D-021)

**Branch:** `feat/fase-7-frontend`. **Decisão:** Unidade vira **entidade** (D-021).

- **Backend:** `PATCH /cronograma/{id}` agora via `usuario_atual` com RBAC — admin
  edita tudo; **técnico fecha a PRÓPRIA** visita (só `status`/`observacoes`); status
  validado. Teste `test_tecnico_fecha_propria_visita`.
- **Frontend:** card do dia com **status editável** (select) + **observações**
  (textarea, salva no blur) por visita.
- **Decisão D-021:** "local de trabalho" → entidade `Unidade` (criar antes da "visão
  por unidade"). Registrada em `DECISOES.md`.
- `tsc` OK; **71 passed**. Docs: BACKLOG, spec-etapa3, TESTES.

**Arquivos:** `app/cronograma.py`, `tests/test_cronograma.py`,
`frontend/src/pages/Cronograma.tsx`, `docs/projeto/{DECISOES,BACKLOG,specs/spec-etapa3,LOG}.md`, `docs/TESTES.md`.

---

## 2026-06-24 — Refino 2: cores theme-aware + Avatar na edição

**Branch:** `feat/fase-7-frontend`.

- **Dark mode consistente:** badges de status (visita/documento) em `lib/format.ts` e
  os alertas/mensagens âmbar/verde do Admin ganharam variantes `dark:` (legíveis no
  tema escuro). Nenhuma cor de status fixa sem `dark:` restou.
- **DRY:** a foto na edição de usuário passou a usar o componente **`Avatar`**
  (foto ou iniciais) em vez de `<img>` + fallback manual.
- `tsc` OK.

**Arquivos:** `frontend/src/{lib/format.ts,pages/Admin.tsx}`.

---

## 2026-06-24 — Refino: helpers DRY + spec da Etapa 0

**Branch:** `feat/fase-7-frontend`.

- **DRY:** helpers de UI duplicados (cores de status, validade de documento, data ISO)
  centralizados em `frontend/src/lib/format.ts` (`isoData`, `STATUS_VISITA`, `statusDoc`);
  `Cronograma`, `Home` e `Admin` passam a importar (sem duplicação/drift).
- **Doc:** novo [`spec-etapa0-apikeys-perfil.md`](specs/spec-etapa0-apikeys-perfil.md)
  (API keys, alerta `docs_alerta`, `/me/documentos`, input centralizado) + INDICE.
  Backlog §F: specs de módulos novos = ✅ (falta só Banco de dados).
- `tsc` OK; **70 passed**.

**Arquivos:** `frontend/src/{lib/format.ts,pages/{Admin,Cronograma,Home}.tsx}`,
`docs/projeto/specs/spec-etapa0-apikeys-perfil.md`, `docs/INDICE.md`.

---

## 2026-06-24 — Plano das pendentes + Etapa 0a: UI de API keys

**Branch:** `feat/fase-7-frontend`.

- **Plano:** `BACKLOG.md §2` reescrito só com as **pendentes**, em ordem sem
  retrabalho (Etapa 0 independentes → 1 cronograma/Unidade → 2 robustez/Alembic →
  3 inteligência). PLANEJAMENTO alinhado.
- **0a — API keys (UI):** card ADM "Gerenciar API keys" agora lista provedores
  (chave **mascarada**, ativo) e permite **cadastrar/rotacionar** a chave
  (`PUT /admin/provedores/{nome}`, perm. `gerir_chaves`, cifrada). Gated por
  `gerir_chaves`. `api.ts`: `AdminProvedor` + `provedores`/`salvarProvedor`.
- `tsc` OK (backend já testado: `test_provedor_chave_nunca_em_claro`).

**Arquivos:** `frontend/src/{lib/api.ts,pages/Admin.tsx}`, `docs/projeto/{BACKLOG,PLANEJAMENTO,LOG}.md`.

---

## 2026-06-24 — #U1 lista de usuários moderna + #U2 edição como tela

**Branch:** `feat/fase-7-frontend`.

- **#U1:** `UsuarioResumo` ganhou `cargo`/`foto_url`; a lista de "Gerenciar usuários"
  virou linhas com **avatar** (foto/iniciais) + **email · nome · Cargo** (no lugar de
  Papel), com sinal de inativo.
- **#U2:** edição vira **tela própria** (substitui a lista, com "← Voltar"), em 4
  seções: **1) Perfil e gestão de acesso** (nome, papel, cargo, **senha com 👁**,
  **ativo**, **clientes em checkbox**, foto, telefone, unidade, validade, observações)
  · **2) Documentos** · **3) Permissões** · **4) Estratégia e camadas**.
- `tsc` OK; **68 testes** (UsuarioResumo com campos novos).
- Docs: BACKLOG #U1/#U2 ✅, PLANEJAMENTO, spec-fase-9 (evolução).

**Arquivos:** `app/admin.py`, `frontend/src/{lib/api.ts,pages/Admin.tsx}`, `docs/**`.

---

## 2026-06-24 — #D3 logo SVG (sem fundo) + #HOME dashboard

**Branch:** `feat/fase-7-frontend`.

- **#D3:** `Logo.tsx` virou **SVG embutido** (wordmark "IBSystems" no gradiente da
  marca, **fundo transparente**, maior, escalável). Prefere `/logo.svg` se houver o
  logo oficial transparente. Resolve o "fundo cinza ao redor".
- **#HOME:** logo **clicável** (Sidebar + header mobile) → `/inicio`. `Home.tsx`
  reescrita como **dashboard**: saudação, **atividades de hoje** (técnico: as próprias
  + "onde estará"; ADM: todas), **notificações** não lidas e **atalhos**. `tsc` OK.
- Docs: BACKLOG #D3/#HOME ✅, PLANEJAMENTO, `frontend/public/README.md`.

**Arquivos:** `frontend/src/{components/{Logo,Sidebar,Layout},pages/Home}.tsx`,
`frontend/public/README.md`, `docs/projeto/**`.

---

## 2026-06-24 — Backlog: logo natural (#D3) + Home ao clicar no logo (#HOME)

Adicionados ao [`BACKLOG.md`](BACKLOG.md) §G e ao plano:
- **#D3** — logo em **SVG sem fundo** (PNG atual tem fundo cinza) e **maior**;
  depende do **asset** transparente do usuário.
- **#HOME** — clicar no **logo** abre **Home personalizada**: técnico vê **atividades
  do dia**, **cliente** onde estará e infos relevantes; ADM vê resumo do dia.
  Sem dependência nova (reusa cronograma/perfil/notificações).

---

## 2026-06-24 — Cronograma: #CR3 feriados (global) + #CR4 notificações

**Branch:** `feat/fase-7-frontend`. **Decisões:** feriado **global**; notificar **só o técnico**.

- **Modelo:** `Feriado` (data única, descrição) + `Notificacao` (usuario_id, tipo,
  título, texto, ref_id, lida, criado_em). Tabelas novas via micro-migração.
- **API:** feriados em `/cronograma/feriados[...]` (GET autenticado; POST/DELETE
  `gerir_usuarios`); criar visita **gera notificação para o técnico**. Novo router
  `/notificacoes` (GET próprias; marcar lida/todas). Registrados no `main.py`.
- **Frontend:** `NotificacoesProvider` (badge + poll 60s); **sino** na Sidebar
  (header + rail) com badge; página `/notificacoes`. Cronograma: feriado destaca o
  dia (vermelho) + marcar/remover no card; fim de semana já em verde.
- **Testes:** +2 (`test_feriado_crud`, `test_notificacao_ao_criar_atividade`) →
  **68 passed**. `tsc` OK.

**Arquivos:** `app/{modelos,cronograma,notificacoes,main}.py`, `tests/test_cronograma.py`,
`frontend/src/{lib/api.ts,notificacoes/NotificacoesContext,pages/{Cronograma,Notificacoes},
components/Sidebar,main,App}.tsx`, `docs/**`.

---

## 2026-06-24 — Cronograma: #CR1/#CR2/#CR5 + fim de semana (#CR3 parcial)

**Branch:** `feat/fase-7-frontend`.

- **`components/Avatar.tsx`** (novo): foto (`foto_url`) ou **iniciais** (Caíque
  Miranda → CM). Sidebar refatorada para usá-lo (DRY).
- **#CR1:** calendário renderiza só as semanas do mês vigente; dias de outros meses
  ficam vazios (sem número).
- **#CR2/#CR5:** cada dia mostra **avatar do técnico** + atividade (cor por status);
  card do dia mostra avatar + “onde está” (cliente/unidade). Backend: `VisitaResumo`
  ganhou `tecnico_foto`.
- **#CR3 (parcial):** sábado/domingo com tom verde da logo (`--brand-2`, via CSS var
  inline). Falta o **feriado** (tabela) — e o **#CR4 notificações** (próximo).
- `tsc` OK; cronograma 4 testes ok.

**Arquivos:** `app/cronograma.py`, `frontend/src/{components/{Avatar,Sidebar}.tsx,
pages/Cronograma.tsx,lib/api.ts}`.

---

## 2026-06-24 — Backlog: otimizações do cronograma (#CR1–#CR5)

Registradas no [`BACKLOG.md`](BACKLOG.md) §C como atividades em andamento:
- **#CR1** grade só do mês vigente (sem dias do mês seguinte);
- **#CR2** miniatura do dia (avatares/atividade);
- **#CR3** feriados + sábado/domingo com cor da logo;
- **#CR4** notificações (cria atividade → notificação + sino + tela) — fundação genérica;
- **#CR5** "onde cada um está" + avatar (foto/iniciais, ex.: Caíque Miranda → CM).

Ordem sem retrabalho: `Avatar` reutilizável → #CR2/#CR5 → #CR1/#CR3 (visual) →
#CR3 feriado/#CR4 (backend). PLANEJAMENTO atualizado.

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

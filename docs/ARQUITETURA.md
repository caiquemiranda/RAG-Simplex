# Arquitetura — RAG-Simplex

Visão consolidada de **tudo que foi construído** até aqui (Fases 0–9). Para
governança por fase ver [`projeto/ROADMAP.md`](projeto/ROADMAP.md),
[`projeto/LOG.md`](projeto/LOG.md) e os specs em [`projeto/specs/`](projeto/specs/).
Requisitos de produto: [`prd_sistema_rag_simplex.md`](prd_sistema_rag_simplex.md).

> **Documentação para reconstruir o projeto (qualquer linguagem):**
> [`MODELO_DADOS.md`](MODELO_DADOS.md) (ER + entidades) ·
> [`FLUXOS.md`](FLUXOS.md) (diagramas de sequência) ·
> [`TECNOLOGIAS.md`](TECNOLOGIAS.md) (stack, parâmetros exatos, equivalentes) ·
> [`DESIGN.md`](DESIGN.md) (identidade visual + tema) ·
> [`TESTES.md`](TESTES.md) · [`projeto/BACKLOG.md`](projeto/BACKLOG.md) (tarefas + plano).

## 1. O que é

Assistente RAG para auxílio técnico a painéis de detecção e alarme de incêndio
**Simplex** (séries 4100, F3200, QE90 e redes IMS/TrueSite). Sistema de
**segurança de vida**: prioriza não induzir o técnico a erro — ancoragem total na
base, sem alucinação, com fallback gracioso quando a falha não consta.

## 2. Pipeline RAG

```
docs/guia_falhas_simplex_ptbr.md                 (base de conhecimento, Markdown)
        │  app/ingestao.py   → chunking por header ###, metadados, embeddings (e5)
        ▼
ChromaDB (data/processed/chroma/)                (banco vetorial, cosseno)
        │  app/recuperacao.py → busca semântica + bônus léxico (D-015), limiar 0.78
        ▼
app/estrategias.py → LocalExtrativa (dupla camada, sem LLM)   ← padrão, grátis
app/geracao.py     → orquestra a estratégia; ClaudeNuvem (Fase 10, requer API key)
        ▼
app/main.py        → FastAPI (/query, /query/stream NDJSON, /feedback, ...)
        ▼
frontend (React)   → chat estilo ChatGPT + painel ADM
```

## 3. Backend (FastAPI + SQLAlchemy)

### Módulos (`app/`)

| Módulo | Responsabilidade |
| --- | --- |
| `config.py` | Configuração central (paths, modelos, threshold, estratégia). `.env` com prefixo `RAG_`. |
| `ingestao.py` | Markdown → blocos por `###` → metadados → embeddings → ChromaDB. |
| `recuperacao.py` | Busca vetorial (cosseno) + **bônus léxico** (D-015); limiar 0.78; filtro de metadados. |
| `estrategias.py` | `EstrategiaGeracao` + `LocalExtrativa` (dupla camada, gatilho de segurança); registro/seleção. |
| `geracao.py` | Orquestra a estratégia; `ClaudeNuvem` (inerte até Fase 10); fallback gracioso. |
| `modelos.py` | ORM: `Usuario`, `Papel`, `Permissao`, `ConfigEstrategia`, `LogConsulta`, `ProvedorChave`. |
| `auth.py` | Hash de senha (bcrypt), JWT (access/refresh), dependência `requer(permissao)`. |
| `seed.py` | Semeia permissões e papéis padrão (idempotente). |
| `admin.py` | Router `/admin`: usuários, perfil, documentos, clientes, estratégias, auditoria, provedores. |
| `cronograma.py` | Router `/cronograma`: **O.S./visitas** (RBAC por papel) — `tipo`/equipamento/falha/campos-doc (#OS, D-025), técnicos default = fixos, concluir grava `ultima_manutencao`, histórico por equipamento + feriados (**dia de feriado fica sem atividades/#ALOC + notifica**, #FER-1) + **filtro por unidade** (D-021). |
| `notificacoes.py` | Router `/notificacoes`: notificações do próprio usuário (sino). |
| `arquivos.py` | Infra de **upload/arquivos** (`salvar_upload`/`remover_arquivo`) + `POST /upload`; estáticos em `/arquivos`. |
| `biblioteca.py` | Router `/biblioteca`: documentos de **empresa/marcas** (CRUD; leitura por papel, upload admin). |
| `banco.py` | Router `/admin/banco`: **status** do banco (tamanho, migração Alembic, contagem por tabela, blocos Chroma) + **backup** do SQLite. |
| `plantas.py` | Router `/admin/.../plantas`: **upload de PDF → PNG** (PyMuPDF, 1 página = 1 planta) + CRUD das plantas do cliente (#MAP). |
| `cripto.py` | Cifragem das chaves de provedor (nunca em claro) + mascaramento. |
| `db.py` | Engine/Session; **`aplicar_migracoes`** (Alembic `upgrade head`, banco real, D-022); `criar_tabelas` (create_all + micro-migração — testes/fallback); `python -m app.db --init`. |
| `main.py` | App FastAPI: monta routers, CORS, endpoints de RAG + `/me/documentos`. |

### Endpoints

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/login` | pública | Login → access + refresh token. |
| POST | `/auth/refresh` | pública | Renova o access token. |
| GET | `/auth/me` | autenticado | Dados + permissões efetivas do usuário. |
| GET | `/health` | pública | Liveness. |
| POST | `/ingest` | `ingerir` | Reindexa a base. |
| POST | `/query` | `consultar` | Consulta (resposta completa) + `log_id`. |
| POST | `/query/stream` | `consultar_stream` | Consulta em **NDJSON** (meta + deltas). |
| POST | `/feedback` | `consultar` | Registra 👍/👎 numa consulta própria. |
| GET | `/documentos` | autenticado | Lista guias indexados. |
| GET | `/documentos/{nome}` | autenticado | Conteúdo do guia (split-screen das citações). |
| GET/POST | `/admin/usuarios` | `gerir_usuarios` | Lista/cria usuários. |
| PUT | `/admin/usuarios/{id}/permissoes-extra` | `gerir_usuarios` | Permissões extra do usuário. |
| GET/PUT | `/admin/usuarios/{id}/estrategia` | `gerir_estrategias` | Estratégia/persona/camadas por usuário. |
| POST/DELETE | `/admin/usuarios/{id}/documentos[/{doc_id}]` | `gerir_usuarios` | Documentos do técnico (validade). |
| GET/POST/PATCH/DELETE | `/admin/clientes[/{id}]` | `gerir_usuarios` | CRUD de clientes (técnicos via `cliente_ids` no usuário; `unidade_id` D-021). `GET /{id}` traz **detalhe** (endereço/contatos + equipamentos, #CLI-PG). |
| GET/POST/PATCH/DELETE | `/admin/unidades[/{id}]` | `gerir_usuarios` | CRUD de **unidades** (base/regional, D-021); DELETE bloqueia se em uso (409). |
| GET/POST | `/admin/clientes/{id}/equipamentos[/importar]` · DELETE `/admin/equipamentos/{id}` | `gerir_usuarios` | **Equipamentos** do cliente (#EQP-1): listar + **import CSV** (`painel,loop,add,type,model`; `substituir`). |
| GET | `/admin/banco` · POST `/admin/banco/backup` | `gerir_usuarios` | Status do banco (migração/tabelas/tamanho) + **backup** do SQLite (D-022). |
| GET | `/clientes` | autenticado | Clientes visíveis (admin: todos ativos; técnico: os seus) — Relatórios/sidebar. |
| GET | `/clientes/{id}/equipamentos?busca=` | autenticado | **Equipamentos do cliente** (#EQP-2/#MAP): admin todos; técnico só dos seus (403). `busca` filtra por **tag/add**. Traz status/posição. |
| GET | `/clientes/{id}/plantas` | autenticado | **Plantas** (projetos) do cliente — visualizador #MAP (RBAC igual). |
| GET/POST/DELETE | `/admin/clientes/{id}/plantas` · `/admin/plantas/{id}` | `gerir_usuarios` | Plantas: **upload PDF→PNG** (1 pág=1 planta), listar, remover (#MAP). |
| PATCH | `/admin/equipamentos/{id}` | `gerir_usuarios` | Edita equipamento + **posição na planta** (`planta_id`/`pos_x`/`pos_y`) — editor de mapa. |
| GET/POST/DELETE | `/admin/falhas[/{id}]` | `gerir_usuarios` | **Catálogo de falhas** (#OS): nome+termo_en (409 se duplicado). |
| GET | `/cronograma/equipamento/{id}` | autenticado | **Histórico de O.S.** do equipamento (#MAP-4); RBAC pelo cliente. |
| GET | `/unidades` | autenticado | Unidades ativas (seletor da "visão por unidade"). |
| GET | `/cronograma?de=&ate=&tecnico_ids=&cliente_ids=&unidade_id=` | autenticado | Visitas (técnico vê as próprias; admin vê todas). Filtros **Equipe** (`tecnico_ids`, multi) e **Clientes** (`cliente_ids`, multi) + **unidade**. #ALOC só seg–sex. |
| POST/PATCH/DELETE | `/cronograma[/{id}]` | `gerir_usuarios` | Gerencia **O.S./visitas** (#OS, D-025): `tipo` (preventiva/corretiva/avulsa), equipamento, falha, campos-doc; sem técnicos → fixos do cliente; concluir grava `ultima_manutencao`. |
| GET | `/cronograma/atividades` | autenticado | **Lista de atividades** (sidebar Cronograma→Atividades): técnico as suas; admin todas. |
| GET | `/cronograma/{id}` | atribuído ou admin | **Detalhe da atividade** (#ATV-1): comentários + anexos. |
| POST | `/cronograma/{id}/comentarios` | atribuído ou admin | Comenta na atividade. |
| POST/DELETE | `/cronograma/{id}/anexos[/{anexo_id}]` | atribuído ou admin | Anexa/remove **imagem** (`/arquivos/atividades/`). |
| GET/POST/DELETE | `/cronograma/feriados[...]` | GET autenticado · escrita `gerir_usuarios` | Feriados globais. |
| GET | `/notificacoes` · POST `/notificacoes/{id}/lida` · `/lidas` | autenticado | Notificações do próprio usuário (sino). `tipo`=`cronograma` (link→atividade `ref_id`) / `feriado` (link→calendário). |
| POST | `/upload` · GET estáticos em `/arquivos/*` | upload: `gerir_usuarios` | Infra de arquivos (logos, documentos…) na pasta raiz `arquivos/`. |
| GET/POST/PATCH/DELETE | `/biblioteca[/{id}]` | leitura autenticado · escrita `gerir_usuarios` | Documentos **empresa/marca/cliente** (`?categoria=&cliente_id=&busca=`); `oculto` só p/ admin. |
| GET | `/admin/{papeis,permissoes,estrategias}` | gestão | Catálogos para os seletores. |
| PUT | `/admin/config-global` | `gerir_estrategias` | Estratégia padrão global. |
| GET | `/admin/auditoria` | `gerir_usuarios` | Log de consultas (com feedback). |
| GET/PUT | `/admin/provedores[/{nome}]` | `gerir_chaves` | Chaves de provedor (cifradas). |

### RBAC — papéis e permissões

Permissões: `consultar`, `consultar_stream`, `ingerir`, `ver_avaliacao`,
`gerir_estrategias`, `gerir_usuarios`, `gerir_chaves`.

| Papel | Permissões |
| --- | --- |
| Operador | `consultar` |
| Tecnico | `consultar`, `consultar_stream` |
| Analista | `consultar`, `consultar_stream`, `ingerir`, `ver_avaliacao` |
| Admin | todas |

Cada usuário pode receber **permissões extra** além do papel. As **camadas** da
resposta são filtradas por papel: operador recebe só "🟢 linguagem simples";
técnico/analista recebem também "🔧 resolução técnica".

## 4. Frontend (React + Vite + Tailwind)

### Estrutura (`frontend/src/`)

| Caminho | Papel |
| --- | --- |
| `auth/AuthContext.tsx` | Sessão (login, `me`, logout); token no localStorage. |
| `auth/ProtectedRoute.tsx` | Bloqueia rotas sem sessão. |
| `chat/ChatContext.tsx` | **Histórico de consultas** (várias conversas) + execução das buscas (streaming) **acima das rotas**; persiste por usuário. |
| `components/Sidebar.tsx` | Barra estilo ChatGPT: grupo **Consulta** (Nova/Buscar + recentes) e abas Relatórios, Buscar Equipamento, Documentos; usuário no rodapé. |
| `components/Layout.tsx` | Casca: sidebar + área de conteúdo. |
| `components/Markdown.tsx` | Render da dupla camada; aviso de segurança em destaque. |
| `components/DocumentoPanel.tsx` | Split-screen: abre o guia no trecho citado. |
| `components/AuditoriaView.tsx` | Tabela de auditoria (painel ADM). |
| `components/Placeholder.tsx` | Páginas "em construção". |
| `lib/api.ts` | Cliente HTTP (inclui `queryStream` NDJSON e `feedback`). Tipos de domínio (ex.: `Visita` = O.S. com `tipo`/`equipamento`/`falha`/campos-doc; `Falha`). |
| `lib/format.ts` | Helpers de UI: `isoData`, `STATUS_VISITA`, e para O.S. `TIPOS_OS`/`TIPO_OS_LABEL`/`TIPO_OS_COR`/`CAMPOS_DOC_OS` (#OS, D-025). |
| `pages/` | `Login`, `Consulta`, `Admin` (inclui **Catálogo de falhas**), `Home`, `Relatorios`/`RelatorioCliente`, `Equipamentos`/`EquipamentosLista` (**histórico de O.S.**), `ClienteAdmin`, `Documentos`, `Cronograma` (calendário + form de O.S.), `Atividades` (**"Ordens de Serviço"**: lista/filtros/gráfico por tipo), `Atividade` (detalhe #ATV-1), `Notificacoes`. |

### Funcionalidades da UI

- **Chat** com dupla camada (markdown), **streaming** (efeito de digitação),
  **citações clicáveis** (split-screen no trecho exato) e **feedback 👍/👎**.
- **Histórico persistente**: várias consultas por usuário; navegar entre abas não
  perde o histórico nem aborta uma busca em andamento (sobrevive a reload).
- **Painel ADM**: CRUD de usuários, permissões (papel + extra), estratégia por
  usuário e **auditoria**.

## 5. Decisões técnicas (confirmadas)

- **Vetorial:** ChromaDB persistente, distância de cosseno.
- **Embeddings:** `intfloat/multilingual-e5-small` (local, PT/EN; prefixos
  `query:`/`passage:`). Sem chave externa.
- **Threshold 0.78** (PRD §6.1) → abaixo, fallback gracioso (nunca improvisar).
- **Busca híbrida (D-015):** bônus léxico para casar termos do display (`HEAD MISSING`).
- **Geração padrão:** `local_extrativa` (sem LLM, grátis). Nuvem (`claude-opus-4-8`)
  só na Fase 10. Ver [`CONFIGURAR_APIKEYS.md`](CONFIGURAR_APIKEYS.md).
- **Segurança:** senhas com bcrypt; JWT; chaves de provedor cifradas (nunca em claro).

## 6. Como rodar

**Nativo (recomendado nesta máquina):** scripts em [`../scripts/`](../scripts/) —
`run.ps1` (tudo), `backend.ps1`, `frontend.ps1`. Caches em `.cache/`.

**Docker:** `docker compose up --build` (backend :8000, frontend :8080) — ver
[`DOCKER.md`](DOCKER.md).

- Frontend: http://localhost:5173 (nativo) · API: http://127.0.0.1:8000/docs
- Login criado na 1ª execução do `backend.ps1`: **admin@local / admin123**.

## 7. Testes

**97 testes** (pytest), sem rede nem download de modelo. Detalhe em
[`TESTES.md`](TESTES.md).

## 8. Status por fase

| Fase | Tema | Status |
| --- | --- | --- |
| 0–2 | Pipeline RAG, extrativo, dupla camada | ✅ |
| 3 | Persistência (ORM, seed) | ✅ |
| 4 | Autenticação (JWT) | ✅ |
| 5 | RBAC (papéis/permissões/camadas) | ✅ |
| 6 | Painel ADM (backend) | ✅ |
| 7 | Frontend base + Docker | ✅ |
| 8 | Chat (streaming, citações, feedback, histórico, layout ChatGPT) | ✅ |
| 9 | Painel ADM (frontend) | ✅ |
| 10 | Estratégias de nuvem + arena | ⬜ requer API key |
| 11 | Hardening (reranker D-020, RAGAS-lite, migrações) | ⬜ |

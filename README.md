# RAG-Simplex

Assistente **RAG (Retrieval-Augmented Generation)** de auxílio técnico para
painéis de detecção e alarme de incêndio **Simplex** (séries 4100, F3200, QE90 e
redes IMS/TrueSite). Recebe a mensagem de falha exibida no painel — em português
de campo, linguagem coloquial ("painel apitando, luz vermelha piscando") ou o
código bruto em inglês ("HEAD MISSING") — e responde com um procedimento de
correção **ancorado na documentação oficial**, em duas camadas: linguagem simples
para operadores e resolução técnica para campo/engenharia.

> **Por dentro:** [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) (módulos, endpoints,
> RBAC, frontend) · [`docs/MODELO_DADOS.md`](docs/MODELO_DADOS.md) (ER) ·
> [`docs/FLUXOS.md`](docs/FLUXOS.md) (diagramas) · [`docs/TECNOLOGIAS.md`](docs/TECNOLOGIAS.md)
> (stack + equivalentes p/ portar) · [`docs/TESTES.md`](docs/TESTES.md) ·
> [`docs/projeto/BACKLOG.md`](docs/projeto/BACKLOG.md) (tarefas + plano) ·
> [`docs/prd_sistema_rag_simplex.md`](docs/prd_sistema_rag_simplex.md) (requisitos) ·
> [`docs/projeto/`](docs/projeto/) (governança por fase).

## Destaques

- **Funciona sem API key e sem custo:** a estratégia padrão `local_extrativa` monta
  a resposta de forma **extrativa** (sem LLM). Estratégias de nuvem (Claude) são
  opcionais e só entram na Fase 10.
- **Chat estilo ChatGPT** (frontend React): streaming, citações clicáveis com
  split-screen no trecho exato, feedback 👍/👎, histórico de consultas persistente.
- **Autenticação + RBAC:** JWT, papéis (Operador/Técnico/Analista/Admin) e camadas
  de resposta filtradas por papel.
- **Painel ADM:** usuários, permissões, estratégia por usuário e auditoria.

## Arquitetura (resumo)

```
docs/guia_falhas_simplex_ptbr.md      base de conhecimento (Markdown)
        │  ingestao.py    chunking por header ###  +  metadados  +  embeddings (e5)
        ▼
   ChromaDB (cosseno)     data/processed/chroma/
        │  recuperacao.py  busca semântica + bônus léxico  +  limiar 0.78
        ▼
   estrategias.py         LocalExtrativa (dupla camada, sem LLM)   ← padrão
        ▼
   main.py                FastAPI: /query  /query/stream  /feedback  /admin/*  ...
        ▼
   frontend (React)       chat + painel ADM
```

Detalhe completo em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Pré-requisitos

- **Python 3.10+** e **Node.js 18+** (frontend).
- Nenhuma chave de API é necessária para o funcionamento padrão. (Chave da
  Anthropic só para as estratégias de nuvem da Fase 10 — ver
  [`docs/CONFIGURAR_APIKEYS.md`](docs/CONFIGURAR_APIKEYS.md).)

## Como rodar

### Nativo (Windows / PowerShell) — recomendado

Scripts em [`scripts/`](scripts/) sobem tudo, com caches em `.cache/`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run.ps1        # backend + frontend
# ou separados:
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1
powershell -ExecutionPolicy Bypass -File scripts\frontend.ps1
```

- Frontend: <http://localhost:5173> · API (Swagger): <http://127.0.0.1:8000/docs>
- Login criado na 1ª execução: **admin@local / admin123**.

### Docker

```bash
docker compose up --build      # backend :8000 · frontend :8080
```

Ver [`docs/DOCKER.md`](docs/DOCKER.md).

### Manual (sem scripts)

```bash
pip install -r requirements.txt
python -m app.db --init                       # tabelas + papéis/permissões
python -m app.auth --criar-admin admin@local "admin123"
python -m app.ingestao --reset                # indexa o guia (baixa o modelo e5)
uvicorn app.main:app --reload                 # API
# frontend:  cd frontend && npm install && npm run dev
```

## Endpoints (principais)

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/login` · `/auth/refresh` · `GET /auth/me` | Sessão (JWT). |
| `GET`  | `/health` | Saúde + nº de blocos indexados. |
| `POST` | `/ingest` | (Re)indexa o guia (perm. `ingerir`). |
| `POST` | `/query` | Pergunta → dupla camada + fontes + `log_id`. |
| `POST` | `/query/stream` | Mesma resposta em **NDJSON** (streaming). |
| `POST` | `/feedback` | Registra 👍/👎 numa consulta. |
| `GET`  | `/documentos[/{nome}]` | Guias indexados (split-screen). |
| `*`    | `/admin/*` | Usuários, permissões, estratégias, auditoria. |

Tabela completa em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md#endpoints).

## Garantias do sistema (do PRD)

- **Limiar de similaridade 0.78** (§6.1): abaixo disso, *fallback gracioso* —
  informa que a falha não consta na base, **sem improvisar** (segurança de vida).
- **Ancoragem total** (§2.2): responde só com os blocos recuperados; zero
  alucinação; nunca mistura outras marcas.
- **Resposta em dupla camada** (§5.2) + **gatilho de segurança** no topo quando há
  risco elétrico, bypass de supressão ou manipulação de fonte primária.
- **Latência < 3s** (§2.2).

## Testes

```bash
pytest          # 59 testes; sem rede nem download de modelo
```

Inventário e cobertura em [`docs/TESTES.md`](docs/TESTES.md). O frontend é validado
por `tsc --noEmit` (typecheck estrito).

## Estrutura

```
RAG-simplex/
├── .claude/            memória/regras do projeto (CLAUDE.md, rules/)
├── app/                backend FastAPI (config, ingestao, recuperacao,
│                       estrategias, geracao, auth, admin, modelos, db, seed, ...)
├── frontend/           SPA React (Vite + Tailwind): chat + painel ADM
├── scripts/            runners nativos (run/backend/frontend .ps1)
├── data/processed/     ChromaDB + SQLite (gerados)
├── docs/               ARQUITETURA, TESTES, PRD, base de conhecimento, projeto/
├── tests/              suíte pytest (59)
├── docker-compose.yml · Dockerfile
└── requirements.txt
```

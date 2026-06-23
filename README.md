# RAG-Simplex

Assistente **RAG (Retrieval-Augmented Generation)** de auxílio técnico para
painéis de detecção e alarme de incêndio **Simplex** (séries 4100, F3200, QE90 e
redes IMS/TrueSite). Recebe a mensagem de falha exibida no painel — em português
de campo, linguagem coloquial ("painel apitando, luz vermelha piscando") ou o
código bruto em inglês ("HEAD MISSING") — e responde com um procedimento de
correção **ancorado na documentação oficial**, em duas camadas: linguagem simples
para operadores e resolução técnica para campo/engenharia.

> Documento de requisitos: [`docs/prd_sistema_rag_simplex.md`](docs/prd_sistema_rag_simplex.md).
> Base de conhecimento: [`docs/guia_falhas_simplex_ptbr.md`](docs/guia_falhas_simplex_ptbr.md).

## Arquitetura

```
docs/guia_falhas_simplex_ptbr.md      base de conhecimento (Markdown)
        │  ingestao.py    chunking por header ###  +  metadados  +  embeddings
        ▼
   ChromaDB (cosseno)     data/processed/chroma/
        │  recuperacao.py  busca semântica  +  limiar 0.78  +  filtro de metadados
        ▼
   geracao.py             API Claude (claude-opus-4-8) → resposta em dupla camada
        │
        ▼
   main.py                FastAPI: /health  /ingest  /query  /query/stream
```

**Stack:** ChromaDB (vetorial, distância de cosseno) · `sentence-transformers`
(embeddings multilíngues PT/EN, locais) · Anthropic SDK / Claude `claude-opus-4-8`
(geração) · FastAPI (API).

## Pré-requisitos

- Python 3.10+
- Uma chave de API da Anthropic ([console.anthropic.com](https://console.anthropic.com/))

## Instalação

```bash
pip install -r requirements.txt

cp .env.example .env          # Windows: copy .env.example .env
# edite .env e preencha ANTHROPIC_API_KEY
```

A primeira execução baixa o modelo de embeddings (~120 MB) automaticamente.

## Uso

### 1. Indexar a base de conhecimento

```bash
python -m app.ingestao --reset
```

Quebra o guia em blocos autocontidos (um por falha, header `###`), anexa os
metadados `{sistema, severidade, idioma_erro, termo_en, ...}` e grava os vetores
no ChromaDB.

### 2. Subir a API

```bash
uvicorn app.main:app --reload
```

Documentação interativa em <http://127.0.0.1:8000/docs>.

### Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET`  | `/health` | Saúde + nº de blocos indexados + config. |
| `POST` | `/ingest` | (Re)indexa o guia padrão. |
| `POST` | `/query` | Pergunta → resposta em dupla camada + fontes. |
| `POST` | `/query/stream` | Mesma resposta, em streaming. |

Exemplo:

```bash
curl -X POST http://127.0.0.1:8000/query \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "HEAD MISSING no loop do 4100", "persona": "técnico de campo"}'
```

### Uso por linha de comando (sem API)

```bash
python -m app.recuperacao "painel apitando luz vermelha piscando"   # só recuperação
python -m app.geracao "HEAD MISSING no loop do 4100"                # pipeline completo
```

## Garantias do sistema (do PRD)

- **Limiar de similaridade 0.78** (§6.1): abaixo disso, *fallback gracioso* —
  o assistente informa que a falha não consta na base e direciona ao suporte,
  **sem improvisar** procedimento (sistema de segurança de vida).
- **Ancoragem total** (§2.2): responde apenas com os blocos recuperados; zero
  alucinação; nunca mistura outras marcas.
- **Resposta em dupla camada** (§5.2) + **gatilho de segurança** no topo quando há
  risco elétrico, bypass de supressão ou manipulação de fonte primária.
- **Latência < 3s** (§2.2): geração sem extended thinking.

## Testes

```bash
pytest
```

Os testes de parsing, classificação de metadados, filtros e fallback rodam sem
chave de API nem rede. Testes que dependem do guia são pulados se ele não existir.

## Estrutura

```
RAG-simplex/
├── .claude/            memória/regras do projeto (CLAUDE.md, settings.json, rules/)
├── app/
│   ├── config.py       configuração central
│   ├── ingestao.py     chunking + vetorização
│   ├── recuperacao.py  busca semântica
│   ├── geracao.py      geração via Claude
│   └── main.py         API FastAPI
├── data/
│   ├── raw/            documentos originais (PDF/TXT)
│   └── processed/      ChromaDB persistido (gerado)
├── docs/               PRD + base de conhecimento + originais
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```

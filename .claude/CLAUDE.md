# RAG-Simplex — Contexto do Projeto

Assistente RAG (Retrieval-Augmented Generation) para **auxílio técnico a painéis
de detecção e alarme de incêndio Simplex** (séries 4100, F3200, QE90 e redes
IMS/TrueSite). Guia técnicos de campo, analistas de engenharia e operadores não
técnicos na triagem, diagnóstico e correção de falhas. Documento de referência:
[`docs/prd_sistema_rag_simplex.md`](../docs/prd_sistema_rag_simplex.md).

## 🔁 Protocolo de retomada (LEIA PRIMEIRO em sessão nova)

O projeto é desenvolvido por fases com governança em [`docs/projeto/`](../docs/projeto/).
Para retomar sem carregar contexto antigo:

1. Ler [`docs/projeto/ESTADO_ATUAL.md`](../docs/projeto/ESTADO_ATUAL.md) → fase e próximo passo.
2. Ler a seção da fase em [`docs/projeto/ROADMAP.md`](../docs/projeto/ROADMAP.md) → objetivos e testes.
3. Se existir, ler `docs/projeto/fases/fase-N-*.md` → detalhe só daquela fase.
4. **Não** reler `LOG.md` inteiro nem fases concluídas.
5. Ao terminar: atualizar `ESTADO_ATUAL.md`, marcar checkboxes no `ROADMAP.md` e
   **adicionar** entrada no `LOG.md`. Decisões novas vão em `DECISOES.md`.

## Arquitetura (pipeline RAG)

```
docs/guia_falhas_simplex_ptbr.md            (base de conhecimento, Markdown)
        │  app/ingestao.py   → chunking por header ###, metadados, embeddings
        ▼
ChromaDB (data/processed/chroma/)           (banco vetorial, cosseno)
        │  app/recuperacao.py → busca semântica, threshold 0.78
        ▼
app/estrategias.py → estratégia de resposta (padrão: LocalExtrativa, sem LLM)
app/geracao.py     → orquestra a estratégia; ClaudeNuvem (Fase 10, requer API key)
        │           → resposta em dupla camada / fallback gracioso
        ▼
app/main.py     → FastAPI (/health, /ingest, /query, /query/stream)
```

| Módulo | Responsabilidade |
| --- | --- |
| `app/config.py` | Configuração central (paths, modelos, threshold, estratégia). Não espalhar constantes. |
| `app/ingestao.py` | Parse Markdown → blocos autocontidos → embeddings → ChromaDB. |
| `app/recuperacao.py` | Busca vetorial (cosseno) com limiar e filtro de metadados. |
| `app/estrategias.py` | Interface `EstrategiaGeracao` + `LocalExtrativa` (extrativo, sem LLM); registro/seleção. |
| `app/geracao.py` | Orquestra a estratégia selecionada; `ClaudeNuvem` (nuvem, Fase 10); fallback. |
| `app/main.py` | API HTTP FastAPI. |

**Estratégia padrão:** `local_extrativa` (sem LLM, grátis). Estratégias de nuvem
(API key) só na Fase 10 — ver [`docs/CONFIGURAR_APIKEYS.md`](../docs/CONFIGURAR_APIKEYS.md)
e o roadmap em [`docs/projeto/`](../docs/projeto/).

## Decisões técnicas (confirmadas)

- **Banco vetorial:** ChromaDB persistente, distância de **cosseno** (`hnsw:space`).
- **Embeddings:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  (local, multilíngue PT/EN — exigência de busca bilíngue do PRD §5.1). Sem chave externa.
- **Geração:** API do Claude, modelo `claude-opus-4-8` (Anthropic SDK oficial).
- **Interface:** FastAPI.

## Convenções

- Código e comentários em **português**. Termos de display de falha permanecem em
  **inglês** (ex.: `HEAD MISSING`) — são o que aparece no painel.
- Constantes e parâmetros ajustáveis vivem em `app/config.py` (sobrescrevíveis por
  `.env` com prefixo `RAG_`). A chave fica em `ANTHROPIC_API_KEY`.
- Imports do pacote sempre absolutos (`from app.config import settings`).
- Rode módulos como `python -m app.ingestao`.

## Requisitos críticos do PRD (não violar)

- **Threshold de similaridade = 0.78** (§6.1). Abaixo disso → fallback gracioso,
  nunca improvisar procedimento (sistema de segurança de vida).
- **Resposta em dupla camada** (§5.2): linguagem simples + resolução técnica.
- **Gatilho de segurança** no topo quando houver risco elétrico, bypass de
  supressão ou manipulação de fonte primária (§5.2).
- **Ancoragem total** (§2.2): zero alucinação; responder só com o contexto recuperado.
- **Latência < 3s** fim-a-fim (§2.2) → extended thinking desligado na geração.

## Comandos

```bash
pip install -r requirements.txt
python -m app.ingestao --reset      # indexa o guia
uvicorn app.main:app --reload       # sobe a API em http://127.0.0.1:8000/docs
pytest                              # testes (parsing, filtros, fallback — sem API key)
```

Regras modulares adicionais em [`.claude/rules/`](rules/).

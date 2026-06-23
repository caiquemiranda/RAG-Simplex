# Spec — Fase 0: Backend RAG (MVP)

**Status:** ✅ Implementado · **Data:** 2026-06-23

Documenta **o que** foi implementado e **como**, para servir de referência sem
precisar reler o código.

## Objetivo

Pipeline RAG funcional que responde sobre falhas de painéis Simplex **ancorado**
no guia oficial (`docs/guia_falhas_simplex_ptbr.md`), com fallback gracioso e
resposta em dupla camada.

## Componentes e como funcionam

### `app/config.py` — configuração central
- `Settings` (pydantic-settings) lê do ambiente/`.env` com prefixo `RAG_`.
- Centraliza: modelos, `similarity_threshold=0.78`, `top_k=5`, paths do ChromaDB,
  nome da coleção, caminho do guia. **Sem números mágicos espalhados.**
- `ANTHROPIC_API_KEY` é lida sem o prefixo `RAG_` (convenção do SDK).

### `app/ingestao.py` — chunking + vetorização
- **Estratégia de chunk:** *Markdown Header-Based Chunking* (PRD §4.2). Um state
  machine percorre os cabeçalhos e emite um bloco por `###` (unidade de falha
  autocontida). Seções `##` "folha" (com corpo e sem filhos `###`) também viram
  blocos, para não perder orientação operacional.
- **Coerência semântica:** o caminho do cabeçalho (`SEÇÃO > h2 > h3`) é prependido
  ao texto do chunk, para o bloco fazer sentido isolado.
- **Metadados por chunk (PRD §4.2):** `sistema` (4100/QE90/F3200/REDE/GERAL, inferido
  da SEÇÃO), `severidade` (Alta/Média/Crítica, heurística por palavras-chave de
  risco), `idioma_erro` (EN-US), `termo_en` (extraído do título), `header`,
  `header_path`, `fonte`.
- **Embeddings:** `sentence-transformers` multilíngue, normalizados (cosseno).
  Import preguiçoso — parsing roda sem baixar o modelo.
- **ChromaDB:** coleção persistente com `hnsw:space=cosine`. Import preguiçoso.
- **CLI:** `python -m app.ingestao --reset`.

### `app/recuperacao.py` — busca semântica
- `buscar(consulta, top_k, sistema, severidade)` → `Recuperacao`.
- Gera o embedding da consulta, consulta o Chroma, converte distância de cosseno
  em similaridade (`1 - dist`).
- **Limiar 0.78 (PRD §6.1):** `Recuperacao.acima_do_limiar` e `.relevantes` aplicam
  o threshold. Filtro híbrido opcional por metadados (`where`).

### `app/geracao.py` — geração (na Fase 0)
- Montava o prompt de dupla camada e chamava o Claude; fallback gracioso abaixo do
  limiar. **Refatorado na Fase 2** para orquestrar estratégias (ver a spec da Fase 2).

### `app/main.py` — API FastAPI
- `GET /health`, `POST /ingest`, `POST /query`, `POST /query/stream`.
- Schemas Pydantic de entrada/saída; tratamento de erro nas bordas (coleção vazia,
  arquivo ausente, sem API key) com HTTP status acionáveis.

## Decisões aplicadas
D-001 (ChromaDB cosseno) · D-002 (embeddings multilíngues locais) · D-003 (Claude) ·
D-004 (FastAPI). Ver [`../DECISOES.md`](../DECISOES.md).

## Testes (sem rede)
- `tests/test_ingestao.py` — classificação de sistema/severidade/termo_en; parsing
  do guia real (73 blocos, IDs únicos, metadados obrigatórios).
- `tests/test_recuperacao.py` — filtro de metadados; aplicação do limiar.

## Validação executada
Parser rodado contra o guia real: **73 blocos**; distribuição 4100=27, QE90=31,
REDE=10, F3200=3, GERAL=2; nenhum chunk vazio; bloco `Head Missing` correto.

## Como estender
- Novo metadado → adicionar no `parse_markdown` e propagar no `upsert`.
- Outro guia → `python -m app.ingestao --arquivo <caminho>`.

# Rodar com Docker (um comando)

Sobe **backend + frontend** prontos para uso, com o banco inicializado, o guia
indexado, um admin criado e o modelo de embeddings já embutido na imagem.

## Subir tudo
```bash
docker compose up --build
```
- **Frontend:** http://localhost:8080
- **API / Swagger:** http://localhost:8000/docs

Login inicial (padrão, troque em produção): **admin@simplex.local** / **admin123**.

Parar: `Ctrl+C` e `docker compose down` (use `-v` para apagar também os dados).

## O que o `up` faz sozinho (entrypoint do backend)
1. Garante um `RAG_SECRET_KEY` (usa o do ambiente ou gera e persiste no volume).
2. Cria as tabelas + papéis/permissões (`app.db --init`).
3. Cria o admin (`ADMIN_EMAIL`/`ADMIN_SENHA`).
4. Indexa o guia se a coleção estiver vazia.
5. Sobe o `uvicorn`.

## Arquitetura dos containers
- **backend**: FastAPI + ChromaDB embarcado + SQLite + e5 (modelo **pré-cacheado na
  imagem** → sem download em runtime). **PyTorch CPU-only** (sem libs CUDA ~2 GB —
  app roda em CPU; mesmos resultados, imagem menor/build rápido). Dados em volume `ragdata`.
- **frontend**: build Vite servido por **nginx**, que faz **proxy** de `/auth`,
  `/query`, `/admin`, `/documentos`, `/ingest`, `/health` para o `backend`. Origem
  única → **sem CORS**. Por isso a API base do front é relativa (`VITE_API_URL=""`).

## Configuração (opcional) — arquivo `.env` na raiz
```dotenv
ADMIN_EMAIL=voce@empresa.com
ADMIN_SENHA=trocar-isto
RAG_SECRET_KEY=        # vazio → gerado e salvo no volume
```

## Persistência
SQLite (`ragsimplex.db`), ChromaDB e a chave ficam no volume **`ragdata`**
(`/app/data/processed`). Sobrevivem a `up`/`down`. Para zerar: `docker compose down -v`.

## Solução de problemas

### Build falha por SSL (rede corporativa)
O `pip`/`npm`/HuggingFace dentro do container pode bater em
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` (interceptação TLS). Opções:
- **npm** (frontend): no `frontend/Dockerfile`, antes do `npm ci`, adicione a CA
  corporativa (`COPY ca.pem … && npm config set cafile …`) ou, em rede confiável,
  `RUN npm config set strict-ssl false`.
- **pip / modelo e5** (backend): configure a CA no build
  (`PIP_CERT`/`REQUESTS_CA_BUNDLE`) ou monte o cache do HuggingFace do host como
  volume e remova o passo de pré-cache.

### Mudei o código e quero rebuildar
`docker compose up --build` (reusa cache das camadas que não mudaram).

### Reindexar o guia
A ingestão roda só quando a coleção está vazia. Para forçar: `docker compose down -v`
e suba de novo, **ou** `docker compose exec backend python -m app.ingestao --reset`.

> Observação: este compose foi escrito e teve a configuração validada
> (`docker compose config`), mas o **build completo não foi executado** no ambiente
> de desenvolvimento (sem rede para baixar torch/modelo). Rode na sua máquina.

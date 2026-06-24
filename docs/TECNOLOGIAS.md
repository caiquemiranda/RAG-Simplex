# Tecnologias & Decisões — RAG-Simplex

Stack atual, **por que** foi escolhida e **equivalentes** em outras linguagens —
para reconstruir o sistema com fidelidade fora do Python. Decisões formais (com
ID) em [`projeto/DECISOES.md`](projeto/DECISOES.md).

## Stack atual

| Camada | Tecnologia | Papel | Por quê |
| --- | --- | --- | --- |
| Linguagem | **Python 3.10+** | backend | ecossistema de ML/embeddings maduro |
| API | **FastAPI** | HTTP + validação | async, OpenAPI automático, Pydantic |
| ORM | **SQLAlchemy 2.0** | persistência | tipado, portátil entre bancos (D-016) |
| Banco | **SQLite** (dev) | relacional | zero-config; portável a Postgres/MySQL |
| Vetorial | **ChromaDB** | busca semântica | persistente, distância de cosseno |
| Embeddings | **sentence-transformers** (`intfloat/multilingual-e5-small`) | vetorização PT/EN | local, sem chave, otimizado p/ recuperação |
| Auth | **JWT** (HS256) + **bcrypt** | sessão/segurança | stateless, padrão de mercado |
| Cripto | Fernet/derivado (`app/cripto.py`) | chaves de provedor | nunca em claro |
| Geração (nuvem, Fase 10) | **Anthropic SDK** (`claude-opus-4-8`) | LLM | qualidade; opcional |
| Frontend | **React + Vite + TypeScript + TailwindCSS** | SPA | rápido, tipado, utilitário |
| Testes | **pytest** | backend | sem rede/modelo no caminho padrão |
| Empacotamento | **Docker / docker-compose** | deploy | reprodutível |

## Parâmetros exatos (replicar idêntico)

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Limiar de similaridade | **0.78** | `config.similarity_threshold` |
| top_k (recuperação) | **5** | `config.top_k` |
| Distância vetorial | **cosseno** (`hnsw:space=cosine`) | ChromaDB |
| Modelo de embeddings | `intfloat/multilingual-e5-small` | `config.embedding_model` |
| Prefixos e5 | `query:` (pergunta) / `passage:` (bloco) | `ingestao`/`recuperacao` |
| Coleção | `simplex_falhas` | `config.collection_name` |
| Chunking | por header Markdown `###` | `ingestao` |
| JWT | HS256; access 60 min; refresh 7 dias | `config.jwt_*` |
| Geração nuvem | `claude-opus-4-8`; extended thinking **off** | `config.claude_model` |
| Latência alvo | < 3s fim-a-fim | PRD §2.2 |

## Equivalentes por ecossistema (para portar)

| Função | Python (atual) | Node/TypeScript | Java | .NET | Go |
| --- | --- | --- | --- | --- | --- |
| API | FastAPI | NestJS / Express | Spring Boot | ASP.NET Core | Gin/Fiber |
| ORM | SQLAlchemy | Prisma/TypeORM | Hibernate/JPA | EF Core | GORM |
| Vetorial | ChromaDB | Chroma JS / Qdrant | Qdrant/Weaviate | Qdrant | Qdrant/Weaviate |
| Embeddings | sentence-transformers | `@xenova/transformers` | DJL | ONNX Runtime | ONNX/Ollama |
| JWT | python-jose/pyjwt | jsonwebtoken | jjwt | Microsoft.IdentityModel | golang-jwt |
| Hash senha | bcrypt | bcrypt | jBCrypt | BCrypt.Net | x/crypto bcrypt |
| Validação | Pydantic | zod/class-validator | Bean Validation | DataAnnotations | validator |

> O **modelo e5-small** existe em ONNX (`Xenova/multilingual-e5-small`), permitindo
> reproduzir os **mesmos vetores** em JS/Go/.NET — mantendo o limiar 0.78 válido.

## Decisões-chave (resumo)

- **Estratégia padrão `local_extrativa`** (sem LLM): funciona offline e sem custo;
  nuvem é opcional (Fase 10). Mantém o sistema utilizável e barato.
- **Ancoragem total / limiar 0.78 / dupla camada / gatilho de segurança**:
  requisitos de **segurança de vida** (PRD) — replicar exatamente em qualquer port.
- **Cosseno + bônus léxico (D-015)**: casar termos de display (`HEAD MISSING`) que a
  semântica pura às vezes erra.
- **Camadas por papel (RBAC)**: operador vê só linguagem simples; técnico/analista
  veem a resolução técnica.
- **Auditoria sempre** (`LogConsulta`) e **chaves cifradas**.

## Relacionada
[`ARQUITETURA.md`](ARQUITETURA.md) · [`MODELO_DADOS.md`](MODELO_DADOS.md) ·
[`FLUXOS.md`](FLUXOS.md) · [`TESTES.md`](TESTES.md) · [`projeto/BACKLOG.md`](projeto/BACKLOG.md)

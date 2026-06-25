# Índice & Guia da Documentação — RAG-Simplex

Mapa de **toda a documentação** do projeto: o que foi feito, por quê, como funciona e
como **reconstruir com exatidão** (inclusive em outra linguagem). Comece por aqui.

> Para retomar o trabalho: leia [`projeto/ESTADO_ATUAL.md`](projeto/ESTADO_ATUAL.md)
> (onde estamos) e [`projeto/PLANEJAMENTO.md`](projeto/PLANEJAMENTO.md) (para onde vamos).

## 1. Visão geral & como foi feito
| Documento | O que contém |
| --- | --- |
| [`ARQUITETURA.md`](ARQUITETURA.md) | Pipeline RAG, módulos do backend, **endpoints**, RBAC, frontend, status por fase. |
| [`TECNOLOGIAS.md`](TECNOLOGIAS.md) | Stack, **parâmetros exatos** (0.78, e5, JWT…) e **equivalentes** por linguagem (Node/Java/.NET/Go). |
| [`DESIGN.md`](DESIGN.md) | Identidade visual IBSystems (paleta ciano→teal), tokens, tema claro/escuro, logo. |

## 2. Dados & comportamento (para replicar a lógica)
| Documento | O que contém |
| --- | --- |
| [`MODELO_DADOS.md`](MODELO_DADOS.md) | **Diagrama ER** (Mermaid) + entidades, campos e invariantes. |
| [`FLUXOS.md`](FLUXOS.md) | **Diagramas de sequência**: auth, `/query`, streaming, feedback, ingestão + precedência de estratégia. |

## 3. Qualidade
| Documento | O que contém |
| --- | --- |
| [`TESTES.md`](TESTES.md) | Inventário dos testes (cobertura por arquivo) + como rodar. |

## 4. Produto (requisitos & base de conhecimento)
| Documento | O que contém |
| --- | --- |
| [`prd_sistema_rag_simplex.md`](prd_sistema_rag_simplex.md) | Requisitos (segurança de vida, dupla camada, limiar 0.78…). |
| [`guia_falhas_simplex_ptbr.md`](guia_falhas_simplex_ptbr.md) | Base de conhecimento indexada (falhas Simplex). |

## 5. Operação (rodar/implantar)
| Documento | O que contém |
| --- | --- |
| [`../README.md`](../README.md) | Visão rápida + como rodar (nativo/Docker) + endpoints. |
| [`../scripts/README.md`](../scripts/README.md) | Runners nativos (`run/backend/frontend.ps1`), flags. |
| [`DOCKER.md`](DOCKER.md) | Subir com `docker compose up --build`. |
| [`CONFIGURAR_APIKEYS.md`](CONFIGURAR_APIKEYS.md) | Chaves de provedor (Fase 10). |

## 6. Governança & planejamento (`projeto/`)
| Documento | O que contém |
| --- | --- |
| [`projeto/PLANEJAMENTO.md`](projeto/PLANEJAMENTO.md) | **Mestre**: snapshot, status, plano sequenciado, marcos, riscos, DoD. |
| [`projeto/ESTADO_ATUAL.md`](projeto/ESTADO_ATUAL.md) | Snapshot "leia primeiro". |
| [`projeto/BACKLOG.md`](projeto/BACKLOG.md) | Tarefas pendentes + ordem sem retrabalho. |
| [`projeto/ROADMAP.md`](projeto/ROADMAP.md) | Status por fase (0–11). |
| [`projeto/LOG.md`](projeto/LOG.md) | Diário de bordo (o que foi feito, quando, por quê). |
| [`projeto/DECISOES.md`](projeto/DECISOES.md) | Decisões técnicas com ID (D-0xx). |
| [`projeto/specs/`](projeto/specs/) | Spec detalhado de cada fase/módulo. |

### Specs por fase/módulo
- [Fase 0 — backend RAG](projeto/specs/spec-fase-0-backend-rag.md) ·
  [Fase 1 — documentação](projeto/specs/spec-fase-1-documentacao.md) ·
  [Fase 2 — extrativo](projeto/specs/spec-fase-2-local-extrativo.md)
- [Fase 3 — persistência](projeto/specs/spec-fase-3-persistencia.md) ·
  [Fase 4 — auth](projeto/specs/spec-fase-4-auth.md) ·
  [Fase 5 — RBAC](projeto/specs/spec-fase-5-rbac.md) ·
  [Fase 6 — admin](projeto/specs/spec-fase-6-admin.md)
- [Fase 7 — frontend base](projeto/specs/spec-fase-7-frontend.md) ·
  [Fase 8 — chat](projeto/specs/spec-fase-8-frontend-chat.md) ·
  [Fase 9 — painel ADM](projeto/specs/spec-fase-9-painel-adm-frontend.md)
- [Arquitetura (consolidado)](projeto/specs/spec-arquitetura.md) ·
  [Etapa 0 — API keys/perfil](projeto/specs/spec-etapa0-apikeys-perfil.md) ·
  [Etapa 1 — Clientes](projeto/specs/spec-etapa1-clientes.md) ·
  [Etapa 3 — Cronograma](projeto/specs/spec-etapa3-cronograma.md) ·
  [#FILES — Arquivos](projeto/specs/spec-files-arquivos.md) ·
  [#DOC1 — Biblioteca](projeto/specs/spec-doc1-biblioteca.md) ·
  [Unidade (D-021)](projeto/specs/spec-unidade.md) ·
  [Alembic + Banco (D-022)](projeto/specs/spec-d022-alembic-banco.md) ·
  [Lote 4 — token/e-mail/feriado](projeto/specs/spec-lote4-fixes.md) ·
  [#ATV-1 — página de atividade](projeto/specs/spec-atv1-pagina-atividade.md)

## 7. Roteiro: recriar o sistema em outra linguagem
1. **Requisitos & invariantes** → [`prd…`](prd_sistema_rag_simplex.md) + [`FLUXOS.md`](FLUXOS.md) §"invariantes".
2. **Esquema de dados** → [`MODELO_DADOS.md`](MODELO_DADOS.md) (ER + regras).
3. **Stack equivalente & parâmetros exatos** → [`TECNOLOGIAS.md`](TECNOLOGIAS.md).
4. **Endpoints & RBAC** → [`ARQUITETURA.md`](ARQUITETURA.md).
5. **Comportamento passo a passo** → [`FLUXOS.md`](FLUXOS.md) (sequência).
6. **UI & marca** → [`DESIGN.md`](DESIGN.md).
7. **Validar** reproduzindo os casos de [`TESTES.md`](TESTES.md).

> **Regra do projeto:** toda entrega atualiza os documentos relevantes (ver DoD em
> [`projeto/PLANEJAMENTO.md`](projeto/PLANEJAMENTO.md) §5). Documentação e testes são
> parte do "pronto".

# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-24

> **Planejamento mestre:** [`PLANEJAMENTO.md`](PLANEJAMENTO.md) (snapshot + linha do
> tempo + plano). **O que existe:** [`../ARQUITETURA.md`](../ARQUITETURA.md),
> [`../MODELO_DADOS.md`](../MODELO_DADOS.md), [`../FLUXOS.md`](../FLUXOS.md),
> [`../TECNOLOGIAS.md`](../TECNOLOGIAS.md), [`../TESTES.md`](../TESTES.md).
> **O que falta:** [`BACKLOG.md`](BACKLOG.md).

## 📍 Você está aqui

- **Branch:** `feat/fase-7-frontend`. **Backend: 61 testes** passando.
- **Fases 0–9 ✅** (tudo **sem API key e sem custo**):
  - **RAG:** ingestão, recuperação híbrida (limiar 0.78), `local_extrativa` (dupla camada).
  - **Plataforma:** auth JWT, RBAC, persistência, **micro-migração automática** de schema.
  - **Chat (estilo ChatGPT):** streaming NDJSON, citações split-screen, feedback 👍/👎,
    **histórico persistente**, sidebar **responsiva** (drawer no mobile).
  - **Painel ADM em cards:** Gerenciar usuários (com **perfil + foto + documentos com
    validade/alertas**), Auditoria; cards **API keys / Banco de dados / Clientes** (placeholder).
  - **Cronograma:** aba com **calendário mensal** (eventos de exemplo).
- **Rodar:** `scripts\run.ps1` (nativo, caches em `.cache/`) ou `docker compose up --build`.
  Login da 1ª execução: **admin@local / admin123**.

## ⏭️ Próximo passo (ver plano completo em [`PLANEJAMENTO.md`](PLANEJAMENTO.md))

Ordem **sem retrabalho** (detalhe em [`BACKLOG.md`](BACKLOG.md) §2):
0. **Trilha Design (paralela):** identidade visual da empresa (⛔ aguarda paleta/logo),
   **tema claro/escuro**, lista de usuários moderna (foto+cargo), edição como tela própria.
1. **Etapa 0** (rápido, independente): alerta global de vencimento na lista de
   usuários · UI de **API keys** (backend `/admin/provedores` pronto).
2. **Etapa 1 — fundação `Cliente`** (entidade + relação técnico↔cliente). Destrava
   card Clientes, Cronograma real e troca do `Usuario.clientes` (CSV) por relação.
3. **Etapas 2–4:** card Clientes · Cronograma backend · documentos por cliente.
4. **Depois:** Fase 11 (reranker D-020, RAGAS-lite, **Alembic**) · Fase 10 (nuvem, **requer API key**).

## 🔧 Para rodar na sua máquina

```powershell
# tudo de uma vez (cria .venv, instala, migra o banco, sobe backend + frontend)
powershell -ExecutionPolicy Bypass -File scripts\run.ps1
```
Frontend: http://localhost:5173 · API: http://127.0.0.1:8000/docs · login: admin@local / admin123.
Detalhe e flags em [`../../scripts/README.md`](../../scripts/README.md).

## 🎯 Decisões em aberto

- **D-020 🔄** — cross-encoder reranker p/ fallback robusto (Fase 11).
- **D-006 🔄** — provedor grátis de nuvem (Gemini vs Groq): Fase 10.
- **Migrações:** hoje há micro-migração caseira (coluna nullable); **Alembic** entra
  quando o schema estabilizar (ver [`BACKLOG.md`](BACKLOG.md) §2, Etapa 5).
- Decisões fechadas: ver [`DECISOES.md`](DECISOES.md).

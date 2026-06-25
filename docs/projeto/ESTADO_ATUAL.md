# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-25

> **Planejamento mestre:** [`PLANEJAMENTO.md`](PLANEJAMENTO.md) (snapshot + linha do
> tempo + plano). **O que existe:** [`../ARQUITETURA.md`](../ARQUITETURA.md),
> [`../MODELO_DADOS.md`](../MODELO_DADOS.md), [`../FLUXOS.md`](../FLUXOS.md),
> [`../TECNOLOGIAS.md`](../TECNOLOGIAS.md), [`../TESTES.md`](../TESTES.md).
> **O que falta:** [`BACKLOG.md`](BACKLOG.md).

## 📍 Você está aqui

- **Branch:** `feat/lote4-fixes` (PR #6 da robustez/Alembic já mergeado em `main`).
  **Backend: 90 testes** passando.
- **Fases 0–9 ✅ + muitas evoluções pós-fase-9** (tudo **sem API key e sem custo**):
  - **RAG:** ingestão, recuperação híbrida (limiar 0.78), `local_extrativa` (dupla camada).
  - **Plataforma:** auth JWT (**token 1 dia**, **e-mail case-insensitive**), RBAC, persistência,
    **infra de arquivos** (`/upload` + `/arquivos`, #FILES).
  - **Marca/tema:** identidade **IBSystems**, **tema claro/escuro**, **logo SVG** clicável.
  - **Chat:** streaming NDJSON, citações split-screen, feedback, histórico, sidebar responsiva.
  - **Dashboard (#HOME):** atividades do dia, onde estará, notificações, seus documentos.
  - **Plataforma+:** **migrações Alembic** (banco real, D-022) — micro-migração vira fallback/testes.
  - **Painel ADM (cards):** Gerenciar usuários (edição em tela própria; **foto por arquivo**;
    cliente fixo #ALOC; **unidade base**; alerta ⚠️ docs); **Clientes e unidades** (CRUD +
    **cor/logo**, técnico↔cliente, **unidade** D-021); **API keys** (cifrada); **Banco de dados**
    (status + backup, D-022); Auditoria.
  - **Relatórios:** **cards de clientes** + grupo na sidebar (#R1).
  - **Documentos:** biblioteca **Empresa / Clientes / Marcas** (cards + grupo na sidebar +
    **busca**), CRUD de arquivos (#DOC1–#DOC4).
  - **Cronograma (real):** visitas com **vários técnicos** (#CR8), **card do dia** por papel,
    **fechamento**, **cliente fixo + relocação** (#ALOC), **visão por unidade** (D-021),
    agrupamento por **cliente** (cor/logo + avatares), **editar**, feriados, **notificações**.
- **Rodar:** `scripts\run.ps1` (nativo) ou `docker compose up --build`. Login: **admin@local / admin123**.

## ⏭️ PRÓXIMO PASSO — Lote 4 (em andamento, branch `feat/lote4-fixes`)

Sequência sem retrabalho (detalhe no [`BACKLOG.md`](BACKLOG.md) §G):
1. ✅ **#FIX-TOKEN** (token 1 dia) + **#FIX-EMAIL** (e-mail case-insensitive).
2. ✅ **#FER-1** — feriado sem atividades (suprime visitas/#ALOC no dia + notifica + bloqueia agendar).
3. ⏭️ **#ATV-1** — página de atividade (status, multi-técnico, anexar imagens, comentários).
4. **#EQP-1** (fundação: entidade `Equipamento` + CSV) → **#CLI-PG** (página do cliente
   com endereço/contatos) → **#EQP-2** (sidebar "Equipamentos" com sub-abas + lista por cliente).

**Depois do Lote 4:** Fase 11 (reranker D-020 + RAGAS-lite, *sem key*) · Fase 10 (nuvem,
*requer API key*) · #1 (alinhamento ChatGPT).

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

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

- **Branch:** `feat/fase-7-frontend`. **Backend: 70 testes** passando.
- **Fases 0–9 ✅ + evoluções pós-fase-9** (tudo **sem API key e sem custo**):
  - **RAG:** ingestão, recuperação híbrida (limiar 0.78), `local_extrativa` (dupla camada).
  - **Plataforma:** auth JWT, RBAC, persistência, **micro-migração automática** de schema.
  - **Marca/tema:** identidade **IBSystems** (paleta), **tema claro/escuro**, **logo SVG** clicável.
  - **Chat:** streaming NDJSON, citações split-screen, feedback 👍/👎, histórico persistente,
    sidebar responsiva, input centralizado no estado vazio.
  - **Dashboard (#HOME)** ao clicar no logo: atividades do dia, onde estará, notificações, seus documentos.
  - **Painel ADM (cards):** **Gerenciar usuários** (lista moderna com avatar; **edição em tela
    própria** — perfil/foto/documentos+validade/permissões/estratégia; alerta ⚠️ de docs);
    **Clientes** (CRUD + técnico↔cliente); **API keys** (chave cifrada); **Auditoria**.
    *Card "Banco de dados" ainda é placeholder.*
  - **Cronograma (real):** visitas por técnico/cliente, **card do dia** por papel, avatares,
    fim de semana/**feriados**, **notificações** (sino com badge).
- **Rodar:** `scripts\run.ps1` (nativo, caches em `.cache/`) ou `docker compose up --build`.
  Login da 1ª execução: **admin@local / admin123**.

## ⏭️ Próximo passo (plano completo em [`PLANEJAMENTO.md`](PLANEJAMENTO.md) e [`BACKLOG.md`](BACKLOG.md) §2)

Pendências em ordem **sem retrabalho**:
1. **Etapa 1 — Cronograma:** fechar visita (status *concluída* + observações no card do dia) ·
   **DECISÃO pendente: "local de trabalho" vira entidade `Unidade`?** (fazer **antes** da
   "visão por unidade", senão refaz o filtro) · visão por unidade/local.
2. **Etapa 2 — Robustez:** **Alembic** (migrações versionadas) · upload de **foto por arquivo**
   (hoje data URL) · card **"Banco de dados"**.
3. **Etapa 3 — Inteligência:** **Fase 11** (reranker D-020 + RAGAS-lite, *sem key*) ·
   **Fase 10** (nuvem + arena, *requer API key* + decisão D-006).
4. Pequenas: **#1** alinhamento fino ao ChatGPT (precisa sua confirmação).

> ⚠️ **Bloqueio leve:** a **decisão sobre `Unidade`** (cadastro/entidade vs texto livre)
> destrava a "visão por unidade" do cronograma sem retrabalho.

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

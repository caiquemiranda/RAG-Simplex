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

- **Branch:** `feat/fase-7-frontend`. **Backend: 81 testes** passando.
- **Fases 0–9 ✅ + muitas evoluções pós-fase-9** (tudo **sem API key e sem custo**):
  - **RAG:** ingestão, recuperação híbrida (limiar 0.78), `local_extrativa` (dupla camada).
  - **Plataforma:** auth JWT, RBAC, persistência, **micro-migração automática**, **infra de
    arquivos** (`/upload` + `/arquivos`, #FILES).
  - **Marca/tema:** identidade **IBSystems**, **tema claro/escuro**, **logo SVG** clicável.
  - **Chat:** streaming NDJSON, citações split-screen, feedback, histórico, sidebar responsiva.
  - **Dashboard (#HOME):** atividades do dia, onde estará, notificações, seus documentos.
  - **Painel ADM (cards):** Gerenciar usuários (edição em tela própria; foto **data URL**;
    cliente fixo #ALOC; alerta ⚠️ docs); **Clientes** (CRUD + **cor/logo**, técnico↔cliente);
    **API keys** (cifrada); Auditoria.
  - **Relatórios:** **cards de clientes** + grupo na sidebar (#R1).
  - **Documentos:** biblioteca **Empresa / Clientes / Marcas** (cards + grupo na sidebar +
    **busca**), CRUD de arquivos (#DOC1–#DOC4).
  - **Cronograma (real):** visitas com **vários técnicos** (#CR8), **card do dia** por papel,
    **fechamento**, **cliente fixo + relocação** (#ALOC), agrupamento por **cliente**
    (cor/logo + avatares), **editar** atividade, feriados, **notificações**, número grande.
- **Rodar:** `scripts\run.ps1` (nativo) ou `docker compose up --build`. Login: **admin@local / admin123**.

## ⏭️ PRÓXIMO PASSO (fila desta sessão — começar por aqui)

1. **Foto do usuário por arquivo** ⚡ (rápido): hoje `Usuario.foto_url` guarda **data URL**
   (pesado no banco). Trocar o upload do Admin (edição de usuário) para usar **`/upload`**
   (subpasta `usuarios`) → grava a **URL** em `foto_url`. Reusa **#FILES** (`uploadArquivo`)
   e o `Avatar` já resolve `/arquivos/...`. Sem mudança de schema.
2. **Entidade `Unidade`** (D-021 decidida) → **visão por unidade** no cronograma: modelo
   `Unidade` (nome, cidade…) + vínculo usuário/cliente + filtro por unidade no cronograma.

**Depois (ordem sem retrabalho):**
3. **Robustez:** **Alembic** (migrações versionadas) · card **"Banco de dados"**.
4. **Inteligência:** **Fase 11** (reranker D-020 + RAGAS-lite, *sem key*) · **Fase 10**
   (nuvem, *requer API key* + decisão D-006).
5. Pequena: **#1** alinhamento fino ao ChatGPT.

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

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

- **Branch:** `feat/buscar-equipamento` (Lote 5 mergeado, PR #8; `feat/relatorio-cliente`/#R2
  é PR separado em aberto). **Backend: 99 testes** passando.
- **#MAP** (Buscar equipamento / mapa, D-023) — **#MAP-1/2/3/4 ✅ completo** (backend +
  visualizador custom + busca + editor + **histórico de manutenção** no detalhe).
- **#OS** (Ordem de Serviço, D-024) — **#OS-1/2 ✅ completo** (entidade; CRUD; **concluir grava
  `ultima_manutencao`**; histórico por equipamento; **página `/ordens`** + sidebar). Specs
  [`spec-os`](specs/spec-os-ordem-servico.md), [`spec-map`](specs/spec-map-mapa-dispositivos.md).
- **Backend: 101 testes** passando. Branch `feat/buscar-equipamento` (#MAP + #OS) aguardando merge.
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
    **fechamento**, **cliente fixo + relocação** (#ALOC, só seg–sex), **visão por unidade** (D-021),
    **filtros Equipe + Clientes** (multi), **página de atividade** (#ATV-1: status, imagens,
    comentários), agrupamento por **cliente**, **editar**, feriados (#FER-1), **notificações**.
- **Rodar:** `scripts\run.ps1` (nativo) ou `docker compose up --build`. Login: **admin@local / admin123**.

## ⏭️ PRÓXIMO PASSO — Lote 5 **completo** (branch `feat/lote5-fixes`, falta merge)

Tudo do Lote 5 entregue (detalhe no [`BACKLOG.md`](BACKLOG.md) §G):
- ✅ **#CR-FILTROS** — filtros Equipe/Clientes (multi) + #ALOC só seg–sex.
- ✅ **#ATV-1** — página de atividade (status, técnicos, galeria de imagens, comentários).
- ✅ **#EQP-1** — entidade `Equipamento` + import CSV por cliente.
- ✅ **#CLI-PG** — página do cliente (`/admin/cliente/:id`) com endereço/contatos + CSV.
- ✅ **#EQP-2** — sidebar "Equipamentos" (Buscar/Sobre/Lista) + lista por cliente.
- ✅ **Melhorias UI:** modal do dia em 2 colunas (#CR-DIA) · sidebar Cronograma→Atividades
  (#CR-ATV, com "faltam N / atrasada há N") · fix da auditoria com colunas cortadas (#FIX-AUDIT).
- ✅ **Mais melhorias:** filtros (status multi/cliente/técnico) + **gráfico por status** na tela
  Atividades · status **pendente** · **lightbox** da imagem na atividade · sidebar com
  espaçamento simétrico e `<main>` com scroll (não quebra mais).
- ✅ **UX/mobile:** login cai na **#home** + grupos da sidebar recolhidos (#HOME-FIRST) ·
  **notificações linkam** à atividade/calendário (#NOTIF-LINK) · **app responsivo** mobile
  (#MOBILE: Consulta full-screen, modal do dia, calendário compacto).
- ✅ **Modal do dia v2 (#CR-DIA2):** scroll único (não esconde mais topo/rodapé) · cards =
  **resumo** clicável (abre a atividade) · **admin** com botão **editar** (form inline).

**Falta:** abrir PR da `feat/lote5-fixes` → `main` e mergear.

**Depois do Lote 5:** equipamentos fase b/c (colunas últ. manutenção/teste; histórico do
painel — *adiado pelo usuário*) · Fase 11 (reranker D-020 + RAGAS-lite, *sem key*) ·
Fase 10 (nuvem, *requer API key*) · #1 (alinhamento ChatGPT).

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

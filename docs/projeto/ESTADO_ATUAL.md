# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-30

> **Planejamento mestre:** [`PLANEJAMENTO.md`](PLANEJAMENTO.md) (snapshot + linha do
> tempo + plano). **O que existe:** [`../ARQUITETURA.md`](../ARQUITETURA.md),
> [`../MODELO_DADOS.md`](../MODELO_DADOS.md), [`../FLUXOS.md`](../FLUXOS.md),
> [`../TECNOLOGIAS.md`](../TECNOLOGIAS.md), [`../TESTES.md`](../TESTES.md).
> **O que falta:** [`BACKLOG.md`](BACKLOG.md).

## 📍 Você está aqui

- **Branch:** `feat/lote6-equipamentos` (do `main` com #MAP+#OS+#R2). **Backend: 103 testes**.
  **Lote 6 em andamento:** ✅ **#EQP-STATUS** (equipamento com `falha_id`/estado, status padrão
  "Operando", editor de status no ClienteAdmin — migração `8bf05fde56d0`, D-026). Próximo: `#TAB-ORDEM`.
- **#MAP** (Buscar equipamento / mapa, D-023) — **#MAP-1/2/3/4 ✅ completo** (backend +
  visualizador custom + busca + editor + **histórico de manutenção** no detalhe).
- **#OS** (Ordem de Serviço, **D-025 reverte D-024**) — **backend da unificação ✅**: a `Visita`
  **vira a O.S.** (entidade `OrdemServico` removida). Ganhou `tipo` (manutenção preventiva/
  corretiva/avulsa), `equipamento_id`, `falha_id` + **12 campos do documento de corretiva**;
  catálogo `Falha` (CRUD `/admin/falhas`); sem técnicos → **fixos do cliente**; **concluir grava
  `ultima_manutencao`**; histórico `GET /cronograma/equipamento/{id}`; notificação "Nova O.S.".
  Migração `34b255a20aa8`. **Frontend ✅**: Atividades→"Ordens de Serviço" (filtro/gráfico por
  tipo), form no calendário (tipo/equipamento/falha/campos-doc, técnicos default fixos), admin
  "Catálogo de falhas", histórico repontado. Ver [`spec-os`](specs/spec-os-ordem-servico.md).
- **#MAP-5** (melhorias do editor) ✅ — scroll só no mapa; **posicionar em 2 passos** (caixa +
  Salvar); **autocomplete** por tag (+ alerta sem registro); **Ver todos**; **cadastro avulso**
  de equipamento + **tag composta** (painel+loop+add+type) + colunas Tag/Coordenadas/Últ. manut.
- **#R2** — página de relatório do cliente (`/relatorios/:id`) deixou de ser placeholder.
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

## ⏭️ PRÓXIMO PASSO

Tudo mergeado na `main` (Lote 5 PR #8 · #MAP · #OS/D-025 · #R2). Frente aberta a escolher:

- **➡️ Lote 6** (novo, 7 itens — ver [`BACKLOG.md`](BACKLOG.md) §J): O.S. como CRUD completo pelo
  ADM (`#OS-PAGINA`, extrai `FormOS`) + histórico com filtros (`#OS-HIST-FILTRO`); lista de
  equipamentos tipo planilha (`#TAB-ORDEM` ordenar por coluna, `#EQP-FILTROS+`), **página por
  dispositivo** (`#EQP-PAGINA`: dados + O.S. + documentos), status padrão "Operando"
  (`#EQP-STATUS`) e **listas de equipamentos** (`#EQP-LISTAS`, base do doc de preventiva).
  **Decisões confirmadas ([D-026](DECISOES.md)):** estado "em falha" via `Equipamento.falha_id`;
  documentos do equipamento = link para a biblioteca (Marcas). Pronto para começar por `#EQP-STATUS`.
- **Campos-doc da O.S.** editáveis fora da criação — **absorvido pelo `#OS-PAGINA`** do Lote 6.
- **Lacunas restantes (stubs):** `/equipamentos/sobre`.
- **Adiado pelo usuário:** equipamentos fase B (colunas última manutenção/teste) e fase C
  (histórico do painel — hoje suprido pela O.S.).
- **Roadmap:** Fase 11 (reranker D-020 + RAGAS-lite, *sem key*) · Fase 10 (nuvem, *requer
  API key*) · #1 (alinhamento ChatGPT).

---

### Histórico do Lote 5 (mergeado — detalhe no [`BACKLOG.md`](BACKLOG.md) §G):
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

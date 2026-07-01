# Spec — #OS: Ordem de Serviço (unifica atividade do cronograma)

**Status:** ✅ Backend (102 testes) + Frontend (unificação D-025)
**Data:** 2026-06-30 · **Branch:** `feat/buscar-equipamento` · **Decisão:** [D-025](../DECISOES.md)
(substitui [D-024](../DECISOES.md))

**Ordem de Serviço = atividade do cronograma** (mesma entidade `Visita`). Reaproveita
cronograma, **vários técnicos**, comentários, **anexos de imagem** (#ATV-1), #ALOC e
notificação. Liga-se a um **equipamento** → alimenta o **histórico** do dispositivo (#MAP-4).

## Decisões (D-025 — reverte D-024)
- A entidade `OrdemServico` (D-024) foi **removida**; a `Visita` **vira a O.S.**
- **Tipo** = manutenção ∈ **preventiva / corretiva / avulsa**.
- **Falha** = catálogo cadastrável (`Falha`), **1 por O.S.** (`Visita.falha_id`).
- Sem técnicos informados → usa os **fixos do cliente** (#ALOC).
- **Concluir** com data → grava `equipamento.ultima_manutencao` (fonte automática).
- Campos do **documento de corretiva** embutidos na O.S. (opcionais, só corretiva).

## Modelo (`app/modelos.py`)
- **`Visita`** ganhou: `tipo` (`server_default='corretiva'`), `equipamento_id` (FK SET NULL),
  `falha_id` (FK SET NULL) e os **12 campos do documento**: `especialidade`, `requisitante`,
  `data_solicitacao`, `centro_custo`, `numero_os`, `reserva_material`, `material_utilizado`,
  `endereco`, `setor`, `prioridade`, `data_execucao`, `acao_aplicada`. Relacionamentos
  `equipamento` e `falha`.
- **`Falha`**: `nome` (único), `termo_en` (display, opcional), `criado_em`.
- Migração **`34b255a20aa8`** — cria `falha`, **dropa** `ordem_servico`, adiciona 15 colunas à
  `visita` (batch). FK-noise do autogenerate (SQLite) removido manualmente.

## Backend
**Catálogo de falhas — `app/admin.py`** (perm `gerir_usuarios`):
- `GET /admin/falhas`, `POST /admin/falhas` (409 se `nome` duplicado), `DELETE /admin/falhas/{id}`.

**O.S. = cronograma — `app/cronograma.py`:**
- `POST /cronograma` / `PATCH /cronograma/{id}` — `_aplicar_os` valida `tipo`, aplica
  equipamento/falha/campos-doc (via `model_fields_set`) e a manutenção (status `concluida` +
  equipamento → `ultima_manutencao = data`). `usuario_ids` vazio → técnicos = fixos do cliente.
- Notificação ao criar: **"Nova O.S.: {titulo}"**, linka à O.S.
- `GET /cronograma/equipamento/{id}` — **histórico** de O.S. do equipamento (RBAC pelo cliente, #MAP-4).
- `VisitaResumo` expõe `tipo`, `equipamento_id`/`equipamento_tag`, `falha_id`/`falha_nome` e os 12 campos.

## Frontend (✅ Fase 2)
- **Atividades → "Ordens de Serviço"** (`pages/Atividades.tsx`): título, sidebar Cronograma,
  filtro por **tipo**, **gráfico por tipo** (além do por status), badges tipo/falha/equipamento.
- **Form no calendário** (`pages/Cronograma.tsx`): `tipo` (preventiva/corretiva/avulsa), seletor de
  **equipamento** (do cliente) e **falha** (catálogo), **campos do documento** em `<details>` (só
  corretiva), técnicos com **vazio = fixos do cliente**. Editor inline ganhou tipo/falha.
- **Admin → "Catálogo de falhas"** (`pages/Admin.tsx`): CRUD de `Falha` (nome + termo_en).
- **Histórico do equipamento** (`pages/Equipamentos.tsx`) repontado para
  `api.ordensEquipamento` → `GET /cronograma/equipamento/{id}` (agora `Visita[]`), com link à O.S.
- **Removidos:** `pages/Ordens.tsx`, rota `/ordens`, link da sidebar, `api.admin.ordens*` e os
  tipos `OrdemServico`/`OrdemEntrada`. Novos helpers em `lib/format.ts` (`TIPOS_OS`,
  `TIPO_OS_LABEL/COR`, `CAMPOS_DOC_OS`).

## Testes (`tests/test_cronograma.py`)
- `test_os_unificada_falha_equipamento_manutencao` — catálogo de falha (incl. 409 duplicado),
  criar O.S. corretiva concluída com equipamento/falha/campos-doc → resumo + `ultima_manutencao`;
  histórico por equipamento; tipo inválido no POST → 400; default = fixos.
- `test_os_editar_deletar_falha_e_rbac` — **editar** a O.S. via PATCH (muda `tipo`, vincula
  equipamento/falha, preenche campo-doc; concluir grava `ultima_manutencao`; tipo inválido → 400);
  **DELETE** de falha; **RBAC** do catálogo (técnico → 403) e do histórico (técnico só vê se
  atende o cliente do equipamento).
- `tests/test_ordens.py` **removido** (entidade extinta). Suíte: **102 passed**.

## Fluxo
Diagrama de sequência de criar/editar O.S. e do histórico em [`../../FLUXOS.md`](../../FLUXOS.md) §8.

# Spec — #OS: Ordem de Serviço (manutenção)

**Status:** ✅ #OS-1 backend (101 testes); frontend (#OS-2) e detalhe do equipamento (#MAP-4) pendentes
**Data:** 2026-06-26 · **Branch:** `feat/buscar-equipamento` · **Decisão:** [D-024](../DECISOES.md)

Registro de **manutenção** (ordem de serviço), entidade **separada** da atividade do
cronograma. Liga-se a um **equipamento** → alimenta o **histórico** do dispositivo (#MAP-4).

## Decisões (D-024)
- **Entidade própria** `OrdemServico` (≠ `Visita`).
- **Tipo** ∈ corretiva/preventiva/planejada; **status** ∈ aberta/em_andamento/concluida/cancelada.
- **Concluir** com data → grava `equipamento.ultima_manutencao` (fonte automática da manutenção).

## Modelo (`app/modelos.py`)
`OrdemServico`: `cliente_id` (cascade), `equipamento_id` (opcional, SET NULL), `usuario_id`
(técnico), `data`, `tipo`, `status`, `descricao`, `solucao`, `criado_em`. Migração `58e01d15fabc`.

## Backend (`app/ordens.py`)
- `GET /admin/ordens?cliente_id=&equipamento_id=&status=` — lista (perm `gerir_usuarios`).
- `POST /admin/ordens`, `PATCH /admin/ordens/{id}`, `DELETE /admin/ordens/{id}` — CRUD; valida
  tipo/status; `_aplicar_manutencao` grava `ultima_manutencao` quando `status=concluida`.
- `GET /equipamentos/{id}/ordens` — **histórico** visível (RBAC pelo cliente do equipamento, #MAP-4).

## Frontend (pendente)
- **#OS-2:** página de O.S. (`/ordens`) — lista + filtros + criar/editar; entrada na sidebar.
- **#MAP-4:** no detalhe do equipamento (Buscar equipamento), mostrar o **histórico** de O.S.

## Testes (`tests/test_ordens.py`, 2)
- `test_os_crud_conclusao_atualiza_manutencao`; `test_os_rbac`. Suíte: **101 passed**.

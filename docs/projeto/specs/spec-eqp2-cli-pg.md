# Spec — #CLI-PG (página do cliente) + #EQP-2 (sidebar Equipamentos)

**Status:** ✅ Implementado (96 testes) · **Data:** 2026-06-25 · **Branch:** `feat/lote5-fixes`
Complementa [`spec-eqp1-equipamento-csv.md`](spec-eqp1-equipamento-csv.md) (entidade + CSV).

## #CLI-PG — página do cliente
- **Modelo:** `Cliente` ganhou `endereco`, `contato` (responsável), `telefone`, `email`,
  `observacoes` (migração Alembic `84ff7bfcb358`). `GET /admin/clientes/{id}` →
  `ClienteDetalhe` (campos + `equipamentos[]`). CRUD de cliente aceita os novos campos.
- **Frontend:** `pages/ClienteAdmin.tsx` (rota `/admin/cliente/:id`, admin) — dados do
  cliente, logo, endereço/contatos, observações + seção **Equipamentos** (import CSV com
  `substituir`, tabela, remover). O nome do cliente na lista do painel ADM vira **link**.

## #EQP-2 — grupo "Equipamentos" na sidebar
- **Sidebar:** *"Buscar Equipamento"* (link plano) vira **grupo colapsável "Equipamentos"**
  com sub-abas **Buscar equipamento** (`/equipamentos`), **Sobre equipamento**
  (`/equipamentos/sobre`, placeholder) e **Lista de equipamentos** (`/equipamentos/lista`).
- **Lista por cliente:** `pages/EquipamentosLista.tsx` — sem `:id`, mostra **card por cliente**
  (clientes visíveis); com `:id`, mostra a **tabela de equipamentos** do cliente.
- **API visível:** `GET /clientes/{id}/equipamentos` (`EquipamentoPublico`) — admin vê de
  todos; técnico só dos **seus** clientes (`cliente in usuario.clientes_rel`, senão 403).

## Testes
- `tests/test_admin.py::test_cliente_detalhe_e_campos` (#CLI-PG).
- `tests/test_admin.py::test_equipamentos_visiveis_por_papel` (#EQP-2, RBAC).
- Suíte: **96 passed**.

## DoD
`MODELO_DADOS` (campos do Cliente), `ARQUITETURA` (endpoints), `TESTES`, `BACKLOG`,
`LOG`, `ESTADO_ATUAL`, `INDICE` atualizados.

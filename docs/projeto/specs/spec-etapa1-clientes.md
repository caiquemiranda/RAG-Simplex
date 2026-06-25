# Spec — Etapa 1: Entidade Cliente (fundação)

**Status:** ✅ Implementado · **Data:** 2026-06-24

Fundação de dados que destrava o card Clientes, o Cronograma por local e o seletor
de clientes na edição de usuário (#U2). Ver plano em
[`../BACKLOG.md`](../BACKLOG.md) §2 e [`../PLANEJAMENTO.md`](../PLANEJAMENTO.md).

## Objetivo
Modelar **clientes** (prédios/instalações atendidas) e a relação **N:N técnico↔cliente**,
substituindo o campo legado `Usuario.clientes` (CSV).

## Modelo (`app/modelos.py`)
- **`Cliente`**: `id`, `nome` (único), `unidade` (local/cidade), `ativo`.
- **`usuario_cliente`** (tabela de associação N:N) — `usuario_id` × `cliente_id`.
- `Usuario.clientes_rel` (relação) substitui o uso de `Usuario.clientes` (coluna CSV
  permanece como legado, sem uso na API). A micro-migração cria a tabela nova
  automaticamente no banco existente.

## API (`app/admin.py`, perm. `gerir_usuarios`)
- `GET /admin/clientes` — lista (ordenada por nome).
- `POST /admin/clientes` — cria (`nome` único → 409 se duplicado).
- `PATCH /admin/clientes/{id}` — atualiza (nome/unidade/ativo).
- `DELETE /admin/clientes/{id}` — remove (204).
- `GET/PATCH /admin/usuarios/{id}`: `UsuarioDetalhe.clientes` agora é **lista de
  clientes**; o update aceita **`cliente_ids: list[int]`** para definir a associação.

## Frontend
- `lib/api.ts`: tipo `AdminCliente`; métodos `clientes/criarCliente/atualizarCliente/
  removerCliente`; `AtualizaUsuario.cliente_ids`.
- `pages/Admin.tsx`: card **Clientes** com CRUD (criar, ativar/desativar, remover);
  edição de usuário com **clientes em checkbox** (puxados do banco) → fecha o #U2.

## Testes
`tests/test_admin.py::test_clientes_crud_e_associacao` (criar, duplicado 409, listar,
associar via `cliente_ids`, atualizar, remover, 404). Suíte: **62 passed**.

## Próximo (depende desta etapa)
- Etapa 3 — Cronograma backend (Visita por técnico/cliente/local) → card do dia (#C1).
- (Opcional) Etapa 4 — documentos exigidos **por cliente**.

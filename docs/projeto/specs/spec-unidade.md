# Spec — Entidade Unidade + "visão por unidade" (D-021)

**Status:** ✅ Implementado · **Data:** 2026-06-25 · **Decisão:** [D-021](../DECISOES.md)

Promove o antigo texto livre `unidade` (em `Usuario`/`Cliente`) a uma **entidade
`Unidade`** (base/regional), para a **"visão por unidade"** do cronograma ter filtro
robusto — sem sofrer com variação de digitação. Reusa as fundações de Cliente (#CLIV)
e o padrão de cadastro do painel ADM.

## Modelo (`app/modelos.py`)
- **`Unidade`**: `id`, `nome` (único), `cidade` (opcional), `ativo`.
- **`Usuario.unidade_id`** (FK → `unidade`, nullable) + `unidade_rel` — base do técnico.
- **`Cliente.unidade_id`** (FK → `unidade`, nullable) + `unidade_rel`.
- O texto legado `Usuario.unidade`/`Cliente.unidade` permanece como **fallback de
  exibição** (sem migração obrigatória). Tabela e colunas criadas pela micro-migração
  genérica (`create_all` + `_migrar_colunas`), sem Alembic.

## API
- `GET/POST/PATCH/DELETE /admin/unidades[/{id}]` — perm. `gerir_usuarios`. **DELETE**
  bloqueia com **409** se houver técnicos/clientes vinculados (evita órfãos); nome
  duplicado → **409**.
- `GET /unidades` — autenticado; unidades **ativas** para o seletor da visão por unidade.
- `POST/PATCH /admin/clientes` e `PATCH /admin/usuarios/{id}` aceitam **`unidade_id`**
  (valida existência → 404). `ClienteResumo`/`UsuarioDetalhe` trazem `unidade_id` +
  `unidade_nome`.
- **Cronograma:** `GET /cronograma?unidade_id=` filtra as visitas cujo **cliente**
  pertence à unidade (`Visita.cliente.has(unidade_id=...)`); as alocações virtuais
  **#ALOC** também respeitam o filtro (pelo `cliente_padrao` do técnico). `VisitaResumo`
  ganhou `unidade_id` e `unidade` agora prioriza o nome da entidade.

## Frontend
- `lib/api.ts`: tipos `AdminUnidade`/`UnidadeVisivel`; `api.admin.unidades/criarUnidade/
  atualizarUnidade/removerUnidade`; `api.unidadesVisiveis()`; `cronograma.listar(...,
  unidadeId)`; `unidade_id`/`unidade_nome` em Cliente/Visita/UsuarioDetalhe.
- **Admin** (card "Clientes e unidades"): bloco de **Unidades** (criar/listar/remover) +
  seletor de unidade no novo cliente, em cada linha de cliente e no **perfil do usuário**.
- **Cronograma:** dropdown **"Todas as unidades"** na barra de filtros (só aparece se há
  unidades), refiltra ao mudar.

## Testes
`tests/test_cronograma.py::test_unidade_crud_e_visao_por_unidade`: cria unidade (409
duplicado), vincula cliente, cria visitas em clientes de unidades diferentes, filtra por
`unidade_id` (só a da unidade aparece), lista `/unidades`, e confirma DELETE em uso → 409
e liberado após desvincular. Suíte: **82 passed**.

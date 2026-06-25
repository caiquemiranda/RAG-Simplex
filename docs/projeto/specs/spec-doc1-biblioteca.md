# Spec — #DOC1: Biblioteca de documentos (empresa + marcas)

**Status:** ✅ Implementado · **Data:** 2026-06-24

Dois acervos de documentos de equipamentos: **Empresa (IBSystems)** e **Marcas**
(Simplex, Notifier…). Reusa a infra de arquivos (#FILES). Ver
[`spec-files-arquivos.md`](spec-files-arquivos.md).

## Modelo (`app/modelos.py`)
**`DocumentoEquipamento`**: `categoria` (`empresa|marca`), `marca` (rótulo;
`IBSystems` por padrão na empresa), `nome` (editável), `url` (`/arquivos/...`),
`oculto`, `criado_em`. Tabela nova via micro-migração.

## API (`app/biblioteca.py`, prefixo `/biblioteca`)
- `GET /biblioteca?categoria=` — leitura **autenticada**; **oculto** só para admin.
- `POST /biblioteca` (multipart: `arquivo`, `categoria`, `marca`, `nome`) — **upload**
  via `salvar_upload(…, "biblioteca/{categoria}")`. Perm.: `gerir_usuarios`.
- `PATCH /biblioteca/{id}` — **renomear** / mudar marca / **ocultar**.
- `DELETE /biblioteca/{id}` — remove o registro **e o arquivo** (`remover_arquivo`).
- **Download:** o `url` é servido direto em `/arquivos/...` (link com `download`).

## Frontend (`pages/Documentos.tsx`)
- Card **Empresa** (com o logo) + card **Marcas** (agrupado por marca).
- **Admin:** upload (empresa: só arquivo; marca: campo de marca + arquivo), **renomear**,
  **ocultar/mostrar**, **excluir**. Não-admin: vê só os não-ocultos como links de download.
- `lib/api.ts`: tipo `DocEquip` + `api.biblioteca.*` + `urlArquivo`.

## Evolução (lote 3: #DOC2/#DOC3/#DOC4)
- **#DOC3** categoria **`cliente`** + `DocumentoEquipamento.cliente_id` (FK); upload com
  seletor de cliente; `_resumo` traz `cliente_nome`.
- **#DOC4** busca: `GET /biblioteca?busca=` (ilike no nome) + filtros `categoria`/`cliente_id`.
- **#DOC2** frontend: grupo **Documentos** na sidebar (`?cat=empresa|clientes|marcas`);
  página com seções (Empresa/Clientes/Marcas) e **card por cliente** (avatar cor/logo);
  campo de busca; uploads por categoria. CRUD reusa #FILES.

## Testes
`tests/test_biblioteca.py` (3): upload→listar→renomear→ocultar (admin vê / operador não)
→excluir; default `IBSystems` na empresa; categoria inválida 400 + operador 403.
Suíte: **78 passed**.

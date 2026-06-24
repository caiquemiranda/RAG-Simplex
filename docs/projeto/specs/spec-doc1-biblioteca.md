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

## Testes
`tests/test_biblioteca.py` (3): upload→listar→renomear→ocultar (admin vê / operador não)
→excluir; default `IBSystems` na empresa; categoria inválida 400 + operador 403.
Suíte: **78 passed**.

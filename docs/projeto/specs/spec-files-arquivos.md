# Spec — #FILES: Infra de upload/arquivos (keystone)

**Status:** ✅ Implementado · **Data:** 2026-06-24

Fundação reutilizável de arquivos. Destrava **#DOC1** (documentos de equipamentos),
o **logo do cliente (#CLIV)** e a pendência **foto-por-arquivo**. Ver
[`../BACKLOG.md`](../BACKLOG.md) §H/§2.

## Onde ficam os arquivos
Pasta **na raiz do projeto**: `arquivos/` (`settings.arquivos_dir`, sobrescrevível por
`RAG_ARQUIVOS_DIR`). **Gitignorada.** Servidos como estáticos em `/arquivos/...`.

## Backend (`app/arquivos.py`)
- `salvar_upload(upload, subpasta="") -> url` — nome único (`uuid_nome`), nome
  **sanitizado**, limite **10 MB**; cria a subpasta; devolve a URL pública `/arquivos/…`.
- `remover_arquivo(url)` — apaga do disco com **guarda de path traversal** (só remove
  dentro de `arquivos_dir`).
- `POST /upload` (multipart: `arquivo` + `subpasta`) → `{url, nome_original}`. Perm.:
  **`gerir_usuarios`** (só admin sobe).
- `app.main`: monta `StaticFiles` em `/arquivos`; cria a pasta no startup. Dep nova:
  `python-multipart`.

## Como reusar
- **Logo do cliente / foto do usuário:** o front faz `POST /upload` (subpasta
  `clientes`/`usuarios`) → recebe a `url` → grava em `Cliente.logo_url` / `Usuario.foto_url`.
- **Documentos (#DOC1):** modelo de metadados aponta para a `url`; CRUD reusa
  `salvar_upload`/`remover_arquivo`.

## Testes
`tests/test_arquivos.py` (3): upload salva + URL; exige admin (403); remoção segura
(não apaga fora da pasta). Suíte: **74 passed**.

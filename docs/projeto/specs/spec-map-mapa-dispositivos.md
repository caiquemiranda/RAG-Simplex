# Spec — #MAP: Buscar equipamento / Mapa de dispositivos

**Status:** 🚧 Em implementação (Fase 1 backend ✅, 99 testes) · **Data:** 2026-06-26
**Branch:** `feat/buscar-equipamento` · **Decisão:** [D-023](../DECISOES.md)

Traz o projeto legado `sistema-manutencao-3` (React CRA + Leaflet, dados estáticos) para
dentro do RAG-Simplex, nativo e moderno: o usuário **busca um equipamento por `tag`**, o
sistema abre a **planta certa** do cliente e mostra **onde ele está** (marcador + popup),
com status e última manutenção.

## Decisões (D-023, confirmadas com o usuário)
- **Visualizador custom** (zero dependência npm; o npm aqui é restrito por SSL).
- **PDF→PNG no servidor** (PyMuPDF, `settings.planta_dpi`); PDF multipágina → N plantas.
- **`tag`** é a chave de busca (ex.: `N2-L23-DF-003`).
- **Coordenadas recadastradas** no editor (não migradas do `Dispositivos.js`).
- **Manutenção** no equipamento (`status`/`ultima_manutencao`/`ultimo_teste`); histórico
  detalhado virá da futura **O.S.**

## Modelo (`app/modelos.py`)
- **`Planta`**: `cliente_id` (cascade), `nome`, `imagem_url` (PNG), `largura`/`altura` (px), `ordem`.
- **`Equipamento` +**: `tag`, `status`, `ultima_manutencao`, `ultimo_teste`, `planta_id` (FK),
  `pos_x`, `pos_y`. Migração Alembic `ec6397a8beb8`.

## Backend
- **`app/plantas.py`** (`/admin`): `pdf_para_pngs(bytes, dpi)`; `POST /admin/clientes/{id}/plantas`
  (upload PDF → 1 página = 1 `Planta`, PNG via #FILES `salvar_bytes` → `/arquivos/plantas/{cid}/`);
  `GET` lista; `DELETE /admin/plantas/{id}` (desvincula equipamentos).
- **`app/admin.py`**: import CSV ganhou `tag/status` + datas (`ultima_manutencao/ultimo_teste`,
  aceita ISO e BR `dd/mm/aaaa`); novo `PATCH /admin/equipamentos/{id}` (campos + **posição**
  `planta_id`/`pos_x`/`pos_y` — editor de mapa).
- **`app/main.py`** (visível, RBAC por cliente): `GET /clientes/{id}/equipamentos?busca=`
  (filtra por `tag`/`add`, traz status/posição) e `GET /clientes/{id}/plantas`.
- `requirements`: `pymupdf==1.24.10`; `config.planta_dpi=150`; `arquivos.salvar_bytes()`.

## Frontend (próximas fases)
- **Fase 2 — Visualizador + Buscar equipamento (`/equipamentos`):** componente
  `VisualizadorPlanta` (imagem + zoom/pan por scroll+drag + marcadores + popup). Busca:
  cliente → `tag` → abre a planta → marcador no (pos_x,pos_y) → popup (tipo · status · última
  manutenção · **Ver detalhes**) → zoom/centro. *(reproduz o legado, moderno)*
- **Fase 3 — Editor (admin):** na página do cliente, subir plantas (PDF) e **posicionar**
  equipamentos clicando na imagem (grava `planta_id`/`pos_x`/`pos_y` via PATCH).
- **Fase 4 (depois):** página de **detalhes do equipamento** com histórico (via O.S.).

## Testes (`tests/test_plantas.py`, 2)
- `test_upload_pdf_gera_plantas_e_remove` — PDF 2 págs → 2 plantas; lista/remoção; 400/403.
- `test_equipamento_tag_posicao_e_busca` — CSV tag/status/data; PATCH posiciona; busca por tag.
- Suíte: **99 passed**.

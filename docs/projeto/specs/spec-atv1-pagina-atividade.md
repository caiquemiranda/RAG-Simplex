# Spec — #ATV-1: card/página de atividade (comentários + anexos de imagem)

**Status:** ✅ Implementado (92 testes) · **Data:** 2026-06-25 · **Branch:** `feat/lote5-fixes`
**Backlog:** [§G](../BACKLOG.md) · item 3 do Lote 4/5.

Cada **visita** do cronograma vira uma **atividade** com **página própria** (cascata
**Cronograma → Cliente → Atividade**): status editável, técnicos atribuídos, **galeria de
imagens** anexadas e **thread de comentários**. Reusa `Visita`/`visita_tecnico` (#CR8) e a
infra de arquivos (#FILES).

> **Atualização #OS / D-025:** a `Visita`/atividade **é a Ordem de Serviço**. Esta página é,
> portanto, a página da O.S. (a galeria de imagens satisfaz o "anexar imagem à O.S.").
> **Edição completa (#OS-PAGINA):** criar/editar a O.S. com **todos os campos** — inclusive os
> 12 campos do documento de corretiva — é feito pelo componente **`FormOS`** (modal), acionado na
> página **Ordens de Serviço** ("+ Nova O.S." / "editar") e no calendário. Ver
> [`spec-os-ordem-servico.md`](spec-os-ordem-servico.md).

## Decisões (confirmadas com o usuário, 2026-06-25)
- **Quem comenta/anexa/fecha/vê:** **técnico atribuído** (em `visita_tecnico`) **ou admin**
  (`gerir_usuarios`). Coerente com "qualquer atribuído fecha" (#CR8).
- **Anexos:** **somente imagens** (`image/*`), exibidas como **galeria** na página.
  Armazenadas via #FILES em `/arquivos/atividades/`.

## Modelo (`app/modelos.py`) — entidades novas
```
COMENTARIO_VISITA { int id PK; int visita_id FK→visita (cascade); int autor_id FK→usuario;
                    text texto; datetime criado_em }
ANEXO_VISITA      { int id PK; int visita_id FK→visita (cascade); int autor_id FK→usuario;
                    text url "/arquivos/atividades/..."; string nome; datetime criado_em }
```
- `Visita` ganha relações `comentarios` e `anexos` (`cascade="all, delete-orphan"`).
- Migração **Alembic** dedicada (cria as 2 tabelas). Atualiza `MODELO_DADOS.md` (ER).

## API (`app/cronograma.py`)
- `GET /cronograma/{id}` — **detalhe da atividade**: campos do `VisitaResumo` +
  `comentarios[]` + `anexos[]`. Visível a **atribuído/admin** (técnico não atribuído → 403).
- `POST /cronograma/{id}/comentarios` `{texto}` — adiciona comentário (atribuído/admin).
- `POST /cronograma/{id}/anexos` (multipart `arquivo`, `image/*`) — sobe imagem via
  `salvar_upload(arquivo, "atividades")`; grava `AnexoVisita` (atribuído/admin).
- `DELETE /cronograma/{id}/anexos/{anexo_id}` — remove registro + arquivo (autor/admin).
- Helper `_pode_gerir_visita(usuario, visita)` = admin **ou** `usuario.id ∈ visita.tecnicos`.

## Frontend
- Rota `/cronograma/atividade/:id` → `pages/Atividade.tsx`:
  - **Breadcrumb** Cronograma / {Cliente} / {Atividade}.
  - Cabeçalho: título, data, **status** (select editável p/ atribuído/admin), avatares dos técnicos.
  - **Galeria** de imagens + botão **anexar** (input `accept="image/*"`, `uploadArquivo(...,'atividades')`).
  - **Comentários**: lista (autor + data + texto) + caixa para novo comentário.
- No calendário (`Cronograma.tsx`), o card da atividade vira **clicável** → abre a página.
- `lib/api.ts`: tipos `ComentarioVisita`, `AnexoVisita`, `VisitaDetalhe`; métodos
  `cronograma.obter(id)`, `comentar(id, texto)`, `anexar(id, file)`, `removerAnexo(id, anexoId)`.

## RBAC
| Ação | Quem |
| --- | --- |
| Ver detalhe / comentar / anexar / remover anexo / mudar status | técnico **atribuído** ou **admin** |
| Editar atribuição (usuario_ids), título, data, cliente | **admin** (já existente) |

## Testes (`tests/test_cronograma.py`)
- Detalhe acessível ao atribuído e ao admin; **não-atribuído → 403**.
- Comentar (atribuído/admin) aparece no detalhe; não-atribuído → 403.
- Anexar imagem → aparece em `anexos`; remover anexo apaga registro (+arquivo).

## Documentação (DoD)
Atualiza: `MODELO_DADOS.md` (ER + 2 entidades), `FLUXOS.md` (sequência comentar/anexar),
`ARQUITETURA.md` (endpoints), `TESTES.md` (contagem + casos), `BACKLOG/LOG/ESTADO_ATUAL`,
e este spec (status → ✅ ao concluir).

# Spec — Etapa 0: API keys, alerta de documentos, /me/documentos, input centralizado

**Status:** ✅ Implementado · **Data:** 2026-06-24

Itens independentes (sem schema novo) que fecharam a "higiene" do plano. Ver
[`../BACKLOG.md`](../BACKLOG.md) §2 e [`../PLANEJAMENTO.md`](../PLANEJAMENTO.md).

## 0a — Gerenciar API keys (UI)
- Backend já existente: `GET /admin/provedores` (lista; chave **mascarada**) e
  `PUT /admin/provedores/{nome}` (cadastra/rotaciona; **cifra** a chave). Perm.: `gerir_chaves`.
- Frontend: card ADM **Gerenciar API keys** — lista provedores (nome, chave mascarada,
  ativo) + formulário (nome com sugestões, `api_key` mascarada, ativo). Gated por `gerir_chaves`.
- `lib/api.ts`: `AdminProvedor` + `provedores`/`salvarProvedor`.
- **Uso real na Fase 10** (estratégias de nuvem) — as chaves cadastradas aqui.

## 0b — Alerta global de documentos vencendo
- `UsuarioResumo.docs_alerta` (int) = nº de documentos **vencidos ou vencendo ≤ 30 dias**.
- Lista "Gerenciar usuários" mostra **⚠️** ao lado de quem tem `docs_alerta > 0`.
- Teste: `test_lista_marca_documento_vencendo`.

## 0c — Input centralizado no chat
- No estado vazio da consulta, o campo de pergunta aparece **centralizado** (estilo
  "O que tem na agenda"), e desce para o rodapé quando há histórico. Frontend puro.

## 0d — `GET /me/documentos` + dashboard
- Endpoint `GET /me/documentos` (auth `usuario_atual`) → documentos **do próprio usuário**.
- O **#HOME** mostra o bloco **"Seus documentos"** com badge de validade (reusa
  `statusDoc`). Teste: `test_me_documentos`.

## Refino (DRY)
Helpers de UI centralizados em `frontend/src/lib/format.ts` — `isoData` (data→YYYY-MM-DD),
`STATUS_VISITA` (cores por status) e `statusDoc` (badge de validade) — eliminando
duplicação entre `Cronograma`, `Home` e `Admin`.

## Testes
Cobertos em `tests/test_admin.py` (`test_me_documentos`, `test_lista_marca_documento_vencendo`)
+ `test_provedor_chave_nunca_em_claro`. Suíte: **70 passed**.

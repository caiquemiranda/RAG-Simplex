# Spec — Etapa 3: Cronograma (visitas) + card do dia (#C1)

**Status:** ✅ Implementado · **Data:** 2026-06-24

Cronograma real dos técnicos, com **card do dia** por papel. Depende da Etapa 1
(Cliente). Ver [`../PLANEJAMENTO.md`](../PLANEJAMENTO.md) e [`spec-etapa1-clientes.md`](spec-etapa1-clientes.md).

## Modelo (`app/modelos.py`)
**`Visita`**: `id`, `usuario_id` (técnico), `cliente_id` (opcional), `data`, `titulo`
(atividade), `status` (`agendada|concluida|cancelada`), `observacoes`. Tabela nova →
criada pela micro-migração no banco existente.

## API (`app/cronograma.py`, montado em `/cronograma`)
- `GET /cronograma?de=&ate=&tecnico_id=` — visitas no intervalo. **RBAC:** técnico vê
  só as próprias; admin (`gerir_usuarios`) vê todas e pode filtrar por técnico.
  (auth: `usuario_atual`.)
- `POST /cronograma` · `PATCH /cronograma/{id}` · `DELETE /cronograma/{id}` — exigem
  `gerir_usuarios`. Validam técnico/cliente existentes.
- Resposta inclui `tecnico_nome`, `cliente_nome`, `unidade` (para exibir direto).

## Frontend (`pages/Cronograma.tsx`)
- Calendário mensal consome **dados reais** do intervalo do mês; eventos coloridos
  por status; navegação de mês + “Hoje”.
- **Card do dia** (modal central) ao clicar num dia:
  - **ADM:** vê **todos os técnicos** do dia (onde cada um está = cliente/unidade) +
    atividade/status; pode **adicionar/remover** visitas e **filtrar por técnico**.
  - **Técnico:** vê só as próprias visitas do dia (onde estará + atividade).
- `lib/api.ts`: tipos `Visita`/`NovaVisita` + `api.cronograma.{listar,criar,atualizar,remover}`.

## Testes
`tests/test_cronograma.py` (4): admin cria + filtro por intervalo; técnico vê só as
próprias; técnico não cria (403); remover (204/404). Suíte: **66 passed**.

## Próximo (opcional)
- Status “concluída” com histórico/observações ao fechar a visita.
- Visão por **unidade/local** além de por técnico.

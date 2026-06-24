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

## Otimizações (#CR1–#CR5)
- **#CR1** grade só do mês vigente; **#CR2/#CR5** avatar do técnico (foto/iniciais) no
  dia e no card + “onde está”; **#CR3** fim de semana em verde + **feriado global**
  (`Feriado`; marcar/remover no card do dia); **#CR4** ao criar atividade gera
  **notificação só para o técnico** (router `/notificacoes`, sino com badge, tela).

## Múltiplos técnicos por atividade (#CR8, 2026-06-24)
N:N `visita_tecnico` (`Visita.tecnicos`); `usuario_id` = responsável (1º, compat).
`VisitaIn.usuario_ids` (1+); `VisitaResumo.tecnicos[]` (+ `tecnico_nome/foto` do 1º).
`GET` filtra por **atribuição** (`tecnicos.any(id=…)`); criação **notifica todos**;
**qualquer atribuído** fecha (status/observações). Backfill em `db.criar_tabelas`.
Frontend: criar com **checkbox** de técnicos; célula/card do dia mostram todos.

## Fechamento de visita (2026-06-24)
No card do dia: **status** editável (agendada/concluída/cancelada) + **observações**.
`PATCH /cronograma/{id}` com RBAC — admin edita tudo; **técnico fecha a PRÓPRIA** visita
(só `status`/`observacoes`). Status validado (`agendada|concluida|cancelada`).

## Testes
`tests/test_cronograma.py` (7): visitas (intervalo/RBAC/403/remover) + **fechamento pelo
técnico** + feriado CRUD + notificação ao criar atividade. Suíte: **71 passed**.

## Próximo
- **Visão por unidade/local** — depende da entidade **`Unidade`** (D-021).
- Feriado **por unidade** (hoje é global).

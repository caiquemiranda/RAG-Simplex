# Spec — Fase 1: Sistema de documentação & planejamento

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Permitir **retomar o projeto em uma janela nova sem carregar o contexto antigo**.
Uma sessão (humana ou o Claude) lê 2–3 arquivos pequenos e sabe exatamente onde
continuar. É a base de governança que sustenta todas as fases seguintes.

## O que foi implementado

Pasta [`docs/projeto/`](../) com cinco documentos de papéis distintos:

| Arquivo | Papel | Quando ler | Quando atualizar |
| --- | --- | --- | --- |
| [`ESTADO_ATUAL.md`](../ESTADO_ATUAL.md) | "Você está aqui": fase/passo atual, próximo passo, bloqueios. **Curto.** | **Sempre primeiro** | Fim de cada sessão |
| [`ROADMAP.md`](../ROADMAP.md) | O plano: fases, objetivos, testes e status (✅/🔄/⬜). | Ao planejar a fase | Ao concluir itens |
| [`LOG.md`](../LOG.md) | Histórico append-only datado. | Para o "porquê" recente | A cada entrega (sempre adicionar) |
| [`DECISOES.md`](../DECISOES.md) | Registro de decisões (ADR-lite) e motivo. | Quando uma decisão é questionada | Ao decidir/revisar |
| [`specs/`](.) | Spec detalhada de uma fase (como esta). | Ao executar/revisar a fase | Durante a fase |
| [`fases/`](../fases/) | Detalhe técnico de uma fase futura, criado sob demanda. | Só na fase ativa | Durante a fase |

## Como funciona o "contexto leve"

- **Um ponteiro minúsculo** (`ESTADO_ATUAL.md`) governa tudo — é o primeiro a ser lido.
- **Detalhe isolado por fase** (`specs/` e `fases/`): só a fase ativa entra em contexto;
  fases concluídas não voltam.
- **Log append-only**, escaneável por data — não se relê do começo.
- **Decisões registradas** → não se rediscute o que já foi decidido.
- Uma fase = unidade entregável e **testável**; só avança quando os testes passam e o
  checkbox é marcado.

## Protocolo de retomada (sessão nova)

Gravado em [`.claude/CLAUDE.md`](../../../.claude/CLAUDE.md) (carregado automaticamente
em toda sessão), portanto o Claude segue sozinho:

1. Ler `ESTADO_ATUAL.md` → fase e próximo passo.
2. Ler a seção da fase no `ROADMAP.md` → objetivos e testes.
3. Se existir, ler `specs/spec-fase-N-*.md` (ou `fases/fase-N-*.md`).
4. **Não** reler o `LOG.md` inteiro nem fases concluídas.
5. Ao terminar: atualizar `ESTADO_ATUAL.md`, marcar checkboxes no `ROADMAP.md`,
   **adicionar** entrada no `LOG.md`; decisão nova → `DECISOES.md`.

## Decisão de processo associada

O fluxo de trabalho (uma fase por vez, testável, com atualização dos documentos ao
final) foi adotado nesta fase. A reordenação posterior (API só no fim) está em D-012.

## Validação

Teste de aceitação: abrir uma janela nova, ler só `ESTADO_ATUAL.md` + a seção da fase
no `ROADMAP.md`, e conseguir dizer o próximo passo sem mais contexto. (Confirmado na
prática ao longo das Fases 2–4, em que cada retomada partiu desses arquivos.)

## Manutenção

- Ao concluir uma fase, criar `specs/spec-fase-N-*.md` (este conjunto) e ligá-la no
  `ROADMAP.md`.
- Manter `ESTADO_ATUAL.md` curto — ele é o índice vivo do projeto.

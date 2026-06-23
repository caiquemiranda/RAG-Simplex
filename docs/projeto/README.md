# Sistema de Planejamento & Documentação — RAG-Simplex

Esta pasta é a **memória de longo prazo do projeto**. O objetivo é simples: você
(ou uma sessão nova do Claude, em uma janela limpa) consegue retomar o trabalho
lendo poucos arquivos pequenos, **sem precisar recarregar todo o histórico**.

## Os documentos e para que servem

| Arquivo | Papel | Quando ler | Quando atualizar |
| --- | --- | --- | --- |
| [`ESTADO_ATUAL.md`](ESTADO_ATUAL.md) | "Você está aqui." Fase/passo atual, próximo passo, bloqueios. **Curto.** | **SEMPRE primeiro** | No fim de cada sessão de trabalho |
| [`ROADMAP.md`](ROADMAP.md) | O plano: fases, objetivos, testes e status (✅/🔄/⬜). | Ao planejar a fase | Ao concluir objetivos/testes de uma fase |
| [`LOG.md`](LOG.md) | Histórico append-only do que foi feito (datado). | Para entender o "porquê" recente | A cada entrega relevante (sempre adicionar, nunca reescrever) |
| [`DECISOES.md`](DECISOES.md) | Registro de decisões técnicas (ADR-lite) e seu motivo. | Quando uma decisão for questionada | Quando uma nova decisão for tomada/revisada |
| [`specs/`](specs/) | Spec do que foi **implementado** em cada fase (o quê e como). | Ao revisar/retomar a fase | Ao concluir a fase |
| [`fases/`](fases/) | Detalhe técnico de uma fase **futura** (criado sob demanda). | Só ao executar aquela fase | Durante a execução da fase |

## Protocolo de retomada (sessão nova / janela limpa)

> Esta sequência também está em `.claude/CLAUDE.md` para o Claude seguir sozinho.

1. Ler [`ESTADO_ATUAL.md`](ESTADO_ATUAL.md) → descobrir a fase e o próximo passo.
2. Ler a seção daquela fase em [`ROADMAP.md`](ROADMAP.md) → objetivos e testes pendentes.
3. Se existir, ler `fases/fase-N-*.md` → detalhes técnicos só daquela fase.
4. **Não** reler o `LOG.md` inteiro nem fases concluídas — só o necessário.
5. Trabalhar; ao terminar, **atualizar** `ESTADO_ATUAL.md`, marcar checkboxes no
   `ROADMAP.md` e **adicionar** uma entrada no `LOG.md`.

## Princípios de contexto leve

- **Um arquivo "ponteiro" minúsculo** (`ESTADO_ATUAL.md`) governa tudo.
- **Detalhe por fase fica isolado** em `fases/` e só entra no contexto quando a fase
  está ativa. Fases concluídas não voltam ao contexto.
- **Log é append-only** e escaneável por data — não se relê do começo.
- **Decisões ficam registradas** para não serem rediscutidas.
- Uma fase = uma unidade entregável e **testável**. Só avança quando os testes da
  fase passam e o checkbox é marcado.

# Regras de RAG e Prompts

Sistema de **segurança de vida**: a prioridade é não induzir o técnico a erro.

## Recuperação
- Distância de **cosseno**; limiar **0.78** (PRD §6.1). Não baixar o limiar para
  "forçar" uma resposta.
- Abaixo do limiar → **fallback gracioso** (`FALLBACK_MSG`): informar que a falha
  não consta na base e direcionar ao suporte. Nunca improvisar procedimento.
- Embeddings multilíngues: a busca precisa mapear `HEAD MISSING` ≈ `CABEÇOTE
  AUSENTE` ao mesmo vetor (PRD §5.1).

## Geração (prompt)
- **Ancoragem absoluta:** responder somente com os blocos recuperados. Nunca
  inventar tensões, endereços, dipswitches ou passos. Nunca misturar outras marcas
  (Notifier, Bosch).
- **Dupla camada obrigatória** (PRD §5.2): "🟢 Em linguagem simples" + "🔧 Resolução
  técnica", nessa ordem.
- **Gatilho de segurança** no topo quando o contexto envolver risco elétrico,
  bypass de zona de supressão ou manipulação de fonte primária (AC/DC, carregador
  4100-0157A) — dizer quando parar e acionar suporte de fábrica (PRD §5.2).
- Preservar termos do display em inglês; corpo da resposta em PT-BR.
- **Latência:** extended thinking desligado (PRD §2.2, < 3s). Instruir resposta
  direta, sem rascunho visível.

## Modelo
- Geração via **Anthropic SDK oficial**, modelo `claude-opus-4-8`. Não trocar de
  modelo nem usar shims de outros provedores.

## Ingestão
- Chunking por header `###` (unidade de falha autocontida). Preservar o caminho do
  cabeçalho no texto do chunk para coerência semântica quando isolado.
- Metadados obrigatórios por chunk: `sistema`, `severidade`, `idioma_erro`,
  `termo_en`, `header`, `fonte` (PRD §4.2).

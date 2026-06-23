# Spec — Fase 2: Estratégia `LOCAL_EXTRATIVO` + interface plugável

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Responder ao usuário **sem nenhuma LLM e sem custo**, renderizando o bloco
recuperado em dupla camada. Roda em CPU fraca, é instantâneo e tem **ancoragem
perfeita** (não inventa nada — só reorganiza o texto oficial). Ao mesmo tempo,
introduz a **interface de estratégias** para que os LLMs de nuvem entrem na Fase
10 sem reescrever o pipeline.

## Arquitetura introduzida

```
recuperacao.Recuperacao
        │
        ▼
estrategias.obter_estrategia(nome | settings.estrategia_geracao)
        │
        ├── LocalExtrativa   (sem LLM, padrão)        ← Fase 2
        └── ClaudeNuvem      (registrada, inerte)     ← Fase 10 (requer API key)
        │
        ▼
estrategias.Resposta  →  geracao.gerar_resposta / _stream  →  main (API)
```

## `app/estrategias.py` (novo)

- **`Resposta`** (dataclass): `texto`, `fontes`, `fallback`, `estrategia`,
  `latencia_ms`, `custo_estimado`.
- **`EstrategiaGeracao`** (ABC): contrato `gerar(...)` + `gerar_stream(...)` (default
  emite a resposta inteira de uma vez; nuvem sobrescreve para streaming real).
- **`LocalExtrativa`** (`nome="local_extrativa"`):
  - Abaixo do limiar → `FALLBACK_MSG` (sem renderizar nada).
  - Pega o bloco de maior similaridade (`relevantes[0]`).
  - **`_corpo_do_bloco`**: remove a linha `[header_path]` e o título, sobra o corpo.
  - **`_separar_camadas`**: regex acha `**Explicação simples.**` → vira 🟢; o resto
    (causas, passos, notas) → 🔧. Sem o marcador, o 1º parágrafo vira 🟢 e o resto 🔧.
  - **`_precisa_aviso`**: aviso de segurança no topo se `severidade ∈ {Alta, Crítica}`
    ou se o texto contém termos de risco (`terra`, `tensão`, `fonte`, `bateria`,
    `curto`, `supress`, `evacua`, `carregador`, `aterr`, `4100-0157`, ...).
  - Monta: `[aviso?]` + título + `🟢` + `🔧` + **`📄 Sugestão do fabricante (trecho do
    guia, na íntegra)`** + `📎 Blocos relacionados` (até `settings.extrativo_max_relacionados`).
- **`trecho_integral(bloco)`**: devolve o texto do guia **na íntegra** (só remove a
  linha técnica `[header_path]`). Exposto em cada fonte (`fontes[].trecho`) e renderizado
  na resposta — o técnico confere a palavra exata do fabricante (reforça ancoragem).
- **Registro:** `ESTRATEGIAS` (dict nome→instância) + `obter_estrategia(nome)`
  (resolve o padrão de `settings`; erro acionável se nome inválido) +
  `registrar_estrategia()` (estratégias de nuvem se auto-registram).

## `app/geracao.py` (refatorado → orquestrador)

- API pública estável (consumida por `main.py`): `gerar_resposta(consulta,
  recuperacao=None, persona=None, estrategia=None)` e `gerar_resposta_stream(...)`.
  Ambas resolvem a estratégia (arg ou `settings.estrategia_geracao`) e delegam.
- **`ClaudeNuvem`** (`nome="claude_nuvem"`): mantém o prompt de dupla camada e a
  chamada ao SDK. Import de `anthropic` **preguiçoso**; se `ANTHROPIC_API_KEY`
  ausente, levanta erro acionável apontando para `docs/CONFIGURAR_APIKEYS.md`.
  Registrada no import, mas **inerte** enquanto o padrão for `local_extrativa`.

## `app/config.py`

- `estrategia_geracao: str = "local_extrativa"` (sobrescrevível por
  `RAG_ESTRATEGIA_GERACAO`).
- `extrativo_max_relacionados: int = 3`.

## Decisões aplicadas
D-005 ("local" = extrativo, sem LLM local) · D-007 (estratégias plugáveis) ·
D-012 (API empurrada para o fim) · D-013 (separação de camadas por marcadores do
guia). Ver [`../DECISOES.md`](../DECISOES.md).

## Testes (todos offline) — `tests/test_estrategias.py`
- Renderiza dupla camada na ordem 🟢→🔧 a partir de bloco mock.
- Aviso de segurança por severidade **e** por palavra-chave.
- Fallback quando abaixo do limiar.
- Lista "Blocos relacionados".
- `obter_estrategia`: padrão correto e erro em nome inválido.
- `_formatar_fontes`: resumo correto.

`tests/test_geracao.py` atualizado para o orquestrador (fallback usa `local_extrativa`).

## Validação executada
Render real do bloco `Head Missing`: dupla camada correta, ~1 ms, custo 0; aviso
dispara com severidade Alta; fallback OK. **Sem API key, sem rede.**

## Exemplo de saída (resumido)
```
**Falha: Head Missing (Cabeçote Ausente)**
## 🟢 Em linguagem simples
O painel enxerga a base, mas não enxerga o cabeçote.
## 🔧 Resolução técnica
**Causas possíveis:** ...  **Passos de solução:** ...
---
*Trecho extraído diretamente do guia oficial (..., similaridade 0.91) — sem geração por IA.*
```

## Como estender (Fase 10)
Criar `GeminiNuvem`/`GroqNuvem` herdando `EstrategiaGeracao`, registrar com
`registrar_estrategia(...)`, e implementar o `HIBRIDO_A_C` (extrativo por padrão,
escalando para nuvem quando precisa sintetizar). A arena (`/avaliacao`) roda várias
estratégias na mesma pergunta usando `obter_estrategia` para cada nome.

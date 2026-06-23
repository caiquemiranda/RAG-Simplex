# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Fase atual:** Fase 2 ✅ (extrativo funcionando) + **ajuste de recuperação em
  andamento**. Próxima fase: **Fase 3 (Persistência SQLite)**.
- **O que acabou de ser feito:** implementado `LOCAL_EXTRATIVO` (offline, grátis);
  ingestão e testes rodando na máquina do usuário (73 blocos, 18/18 testes).
- **Problema encontrado e tratado:** o modelo MiniLM dava scores baixos e ranking
  invertido → trocado por **`intfloat/multilingual-e5-small`** (D-014). Falta o
  usuário **reingerir** e **calibrar o limiar** com os scores reais do e5.

## ⏭️ Próximo passo (AÇÃO DO USUÁRIO — calibração)

1. `python -m app.ingestao --reset`  (baixa o e5 ~120 MB e re-embeda os 73 blocos)
2. `python -m app.recuperacao --diagnostico`  (mostra os scores reais do e5)
3. Reportar os números → decidimos o limiar final (mantém 0.78 ou ajusta com
   justificativa em D-015). **Só então** seguimos para a Fase 3.

> Tudo até a Fase 9 é **sem API key e sem custo**.

## 🧱 Base já existente

- **Fase 0:** pipeline RAG (`ingestao`/`recuperacao`/`geracao`/`main`), 73 blocos.
- **Fase 2:** `app/estrategias.py` (`EstrategiaGeracao`, `LocalExtrativa`,
  `obter_estrategia`); `geracao.py` virou orquestrador; `ClaudeNuvem` registrada
  mas **inerte** até a Fase 10. Padrão = `local_extrativa`.

## ⚠️ Bloqueios / pendências de ambiente

- Dependências **não instaladas** → validações feitas offline (stub de `app.config`).
  Para rodar de verdade: `pip install -r requirements.txt` + `python -m app.ingestao --reset`.
- Hardware fraco → **não usar LLM local**; "local" = extrativo (CPU). API só na Fase 10.

## 🎯 Decisões abertas (a confirmar quando chegar a fase)

- **D-006** — provedor grátis de nuvem (Gemini Flash vs Groq): decidir na Fase 10.
- **D-010** — stack do frontend (Vite + React + TS + Tailwind): confirmar na Fase 7.

# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Fase atual:** Fase 2 ✅ (extrativo funcionando) + **ajuste de recuperação em
  andamento**. Próxima fase: **Fase 3 (Persistência SQLite)**.
- **O que acabou de ser feito:** implementado `LOCAL_EXTRATIVO` (offline, grátis);
  ingestão e testes rodando na máquina do usuário (73 blocos, 18/18 testes).
- **e5 confirmado:** reingestão feita; ranking **corrigido** — bloco certo é o #1 em
  todas as consultas reais (Head Missing 0.893, Warm Start 0.915, Short Circuit 0.900).
- **Falta calibrar o limiar:** o e5 comprime os scores no alto (0.84–0.92), então
  0.78 ficou baixo demais (deixa passar quase tudo). Diagnóstico melhorado para
  medir também perguntas **fora da base** e recomendar o limiar.

## ⏭️ Próximo passo (AÇÃO DO USUÁRIO — só o diagnóstico, sem reingerir)

1. `python -m app.recuperacao --diagnostico`  (agora roda positivos + negativos e
   imprime o **limiar recomendado**)
2. Colar a seção "RESUMO / RECOMENDAÇÃO" → cravamos `RAG_SIMILARITY_THRESHOLD`
   (registro em D-015). **Só então** seguimos para a Fase 3.

> Se houver sobreposição (negativo ≥ positivo), avaliamos reranker/híbrido antes.
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

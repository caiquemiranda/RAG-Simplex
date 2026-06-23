# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Fase atual:** Fase 2 ✅ concluída → próxima é a **Fase 3 (Persistência SQLite)**.
- **O que acabou de ser feito:** implementada a estratégia `LOCAL_EXTRATIVO`
  (RAG respondendo **sem LLM, grátis, offline**) e a interface plugável de
  estratégias. Roadmap reordenado para deixar **API key só na Fase 10** (D-012).

## ⏭️ Próximo passo

Iniciar a **Fase 3 — Persistência (SQLite) & configuração hierárquica**:
1. Criar `docs/projeto/fases/fase-3-persistencia.md` (spec).
2. Modelar `Usuario`, `Papel`, `Permissao`, `Provedor`, `ConfigEstrategia`, `LogConsulta`.
3. Resolução de estratégia: requisição → usuário → papel → global.
4. Campo de chave cifrada (uso só na Fase 10).

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

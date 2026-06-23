# Log do Projeto — RAG-Simplex

Histórico **append-only** do que foi feito. Entrada mais recente no topo. Não
reescrever entradas antigas — apenas adicionar. Para o "onde estou agora", use
[`ESTADO_ATUAL.md`](ESTADO_ATUAL.md).

Formato de cada entrada:
`## AAAA-MM-DD — Fase N — título` · o que foi feito · decisões · arquivos.

---

## 2026-06-23 — Fase 2 — Estratégia LOCAL_EXTRATIVO + interface plugável

**Feito:**
- `app/estrategias.py` (novo): interface `EstrategiaGeracao`, `Resposta` (com
  métricas), `LocalExtrativa` (dupla camada sem LLM, aviso de segurança automático,
  blocos relacionados), registro `ESTRATEGIAS` + `obter_estrategia`.
- `app/geracao.py` refatorado para **orquestrador**; API pública mantida para
  `main.py`; `ClaudeNuvem` movida para cá, registrada porém **inerte** até a Fase 10.
- `app/config.py`: `estrategia_geracao` (padrão `local_extrativa`) + `extrativo_max_relacionados`.
- Testes: `tests/test_estrategias.py` (7 casos offline) e `test_geracao.py` atualizado.
- Docs: `docs/CONFIGURAR_APIKEYS.md` (guia para a Fase 10) e specs
  `docs/projeto/specs/spec-fase-0-backend-rag.md` e `spec-fase-2-local-extrativo.md`.
- ROADMAP **reordenado**: tudo que depende de API key → Fase 10.

**Decisões:** D-012 (API no final), D-013 (separação de camadas por marcadores).

**Validação:** render real do bloco `Head Missing` (dupla camada correta, ~1 ms,
custo 0); aviso por severidade; fallback OK — tudo **sem rede/API** (stub de config).

**Próximo:** Fase 3 — Persistência (SQLite) & config hierárquica.

**Arquivos:** `app/{estrategias,geracao,config}.py`, `tests/test_{estrategias,geracao}.py`,
`docs/CONFIGURAR_APIKEYS.md`, `docs/projeto/specs/*`.

---

## 2026-06-23 — Fase 1 — Sistema de documentação & planejamento

**Feito:**
- Criada a pasta `docs/projeto/` com o sistema de governança do projeto.
- `README.md` define o protocolo de retomada (sessão nova lê ≤ 3 arquivos).
- `ROADMAP.md` com 12 fases (0–11), objetivos, testes e status por fase.
- `ESTADO_ATUAL.md` como ponteiro "você está aqui".
- `LOG.md` (este) e `DECISOES.md` (D-001 a D-011) iniciados.
- `.claude/CLAUDE.md` atualizado com o protocolo de retomada (carregado em toda sessão).
- Fase 1 marcada como ✅ no ROADMAP.

**Decisões:** ver `DECISOES.md` (D-001 a D-011).

**Próximo:** iniciar Fase 2 — Estratégias de geração (`LOCAL_EXTRATIVO` primeiro).

**Arquivos:** `docs/projeto/{README,ROADMAP,ESTADO_ATUAL,LOG,DECISOES}.md`,
`docs/projeto/fases/.gitkeep`, `.claude/CLAUDE.md`.

---

## 2026-06-23 — Fase 0 — MVP RAG backend

**Feito:**
- Estrutura do projeto e pipeline RAG completo:
  `config`, `ingestao` (chunking por header `###` → ChromaDB cosseno),
  `recuperacao` (threshold 0.78 + filtros), `geracao` (Claude `claude-opus-4-8`,
  dupla camada, fallback gracioso), `main` (FastAPI).
- Testes de parsing, classificação de metadados, filtros e fallback (sem rede).
- `.claude/` (CLAUDE.md, settings.json, rules), `requirements.txt`, `.env.example`,
  `.gitignore`, README.
- Parser validado contra o guia real: **73 blocos**, IDs únicos, distribuição por
  sistema coerente (4100=27, QE90=31, REDE=10, F3200=3).

**Decisões:** ChromaDB + sentence-transformers (local, multilíngue) + Claude + FastAPI.

**Arquivos:** `app/*`, `tests/*`, `.claude/*`, `requirements.txt`, `README.md`.

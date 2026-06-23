# Log do Projeto — RAG-Simplex

Histórico **append-only** do que foi feito. Entrada mais recente no topo. Não
reescrever entradas antigas — apenas adicionar. Para o "onde estou agora", use
[`ESTADO_ATUAL.md`](ESTADO_ATUAL.md).

Formato de cada entrada:
`## AAAA-MM-DD — Fase N — título` · o que foi feito · decisões · arquivos.

---

## 2026-06-23 — Fase 2 (ajuste) — Troca do modelo de embeddings (recuperação)

**Contexto:** ao rodar de verdade (deps instaladas), a ingestão funcionou (73
blocos, 18/18 testes), mas consultas óbvias caíam em fallback.

**Diagnóstico (scores reais com MiniLM):** `"cabeçote ausente"` → bloco correto só
0.390; `"HEAD MISSING no loop do 4100"` → bloco errado (No Answer 0.536) acima do
correto (Head Missing 0.515). Logo: problema é o **modelo**, não o limiar.

**Feito:**
- Trocado o embedding para **`intfloat/multilingual-e5-small`** com prefixos
  `query:`/`passage:` (`embed_documentos`/`embed_consulta` em `ingestao.py`; `config`).
- `recuperacao.py` usa `embed_consulta`; adicionado `--diagnostico` (bateria de
  consultas + estatísticas para calibrar o limiar).
- Telemetria do Chroma desligada (`anonymized_telemetry=False`) → fim dos erros de
  protobuf/telemetry.
- Decisão D-014 registrada; D-002 (MiniLM) marcada como substituída.

**Validação:** sintaxe OK; 18/18 testes offline passam. Scores do e5 **pendentes**
(meu ambiente não baixa modelos por SSL) → usuário reingere e roda `--diagnostico`.

**Próximo:** calibrar o limiar com os números do e5; depois Fase 3.

**Arquivos:** `app/{config,ingestao,recuperacao}.py`.

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

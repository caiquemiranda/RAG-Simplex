# Decisões Técnicas — RAG-Simplex (ADR-lite)

Registro enxuto das decisões e seu **motivo**, para não serem rediscutidas. Cada
decisão tem id, data, status e contexto. Se uma decisão mudar, **não apague** —
marque como `Substituída por D-NNN`.

Status: ✅ Vigente · 🔄 Proposta · ❌ Substituída

---

### D-001 ✅ Banco vetorial: ChromaDB (cosseno)
**2026-06-23.** Persistente, simples, local. Distância de cosseno via `hnsw:space`
(PRD §6.1). Alternativas (FAISS, in-memory) descartadas por menos ergonomia/persistência.

### D-002 ✅ Embeddings locais multilíngues
**2026-06-23.** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
Roda em CPU fraca, sem chave externa, e mapeia `HEAD MISSING` ≈ `CABEÇOTE AUSENTE`
(PRD §5.1). **Embeddings nunca exigem hardware forte** — essa é a parte "local".

### D-003 ✅ Geração padrão via Claude `claude-opus-4-8`
**2026-06-23.** Decisão do PRD/CLAUDE.md. A partir da Fase 2 vira **uma estratégia
entre várias**, não a única — mas continua sendo o provedor de referência.

### D-004 ✅ Interface HTTP: FastAPI
**2026-06-23.** Já existente; o frontend React consumirá esta API.

### D-005 ✅ "Local" = extrativo, não LLM local
**2026-06-23.** O note do usuário é fraco e **não roda LLM 7B+**. Portanto:
- `LOCAL_EXTRATIVO` = renderizar o bloco recuperado em template (sem LLM). Grátis,
  instantâneo, ancoragem perfeita.
- Todo LLM é **nuvem** (Claude pago ou Gemini/Groq free-tier). Ollama está **fora**.

### D-006 🔄 Provedor grátis padrão da nuvem
**2026-06-23.** Proposta: **Gemini Flash** (cota gratuita real, bom PT, baixa
latência) como provedor grátis padrão; Groq como alternativa rápida. Claude
permanece como opção paga premium. **Confirmar na Fase 2.**

### D-007 🔄 Estratégias de geração plugáveis
**2026-06-23.** Geração será uma interface com 3 implementações: `LOCAL_EXTRATIVO`,
`LLM_NUVEM` (provedor configurável) e `HIBRIDO_A_C`. Selecionável por
config/usuário. Detalhe na Fase 2.

### D-008 🔄 Persistência de config/usuários: SQLite
**2026-06-23.** Leve, sem servidor, roda no note. Guardará usuários, papéis,
permissões, provedores (chaves cifradas), config de estratégia por usuário e
auditoria. Tira a config do `.env` para permitir edição via painel ADM. Fase 4.

### D-009 🔄 Auth: JWT local (com caminho para SSO depois)
**2026-06-23.** Começar com usuário/senha (hash argon2/bcrypt) + JWT, possivelmente
via `fastapi-users`. RBAC com os 4 papéis das personas do PRD §3
(Operador/Técnico/Analista/Admin). SSO corporativo fica como evolução. Fases 5–6.

### D-010 🔄 Stack do frontend: Vite + React + TypeScript + Tailwind
**2026-06-23.** Moderno, leve, build rápido — bom para note fraco. (Opcional:
shadcn/ui para componentes.) **Confirmar na Fase 8.**

### D-011 ✅ Chaves de API só no servidor, cifradas
**2026-06-23.** Nenhuma chave de provedor vai ao frontend nem ao JWT do técnico. O
servidor resolve a estratégia e chama o provedor. Requisito de segurança (PRD §6.2).

### D-012 ✅ API key empurrada para o final (Fase 10)
**2026-06-23.** A pedido do usuário (note fraco, sem custo inicial), todo o trabalho
que depende de API key foi reordenado para a **Fase 10**. Construímos primeiro a RAG
100% local/grátis (`local_extrativa`) e todo o restante (persistência, auth, RBAC,
painel, frontend) sem chave. Guia de chaves: `docs/CONFIGURAR_APIKEYS.md`.

### D-013 ✅ Separação de camadas no extrativo por marcadores do guia
**2026-06-23.** Como o `local_extrativa` não usa LLM, a "dupla camada" é obtida
parseando os marcadores consistentes do guia: `**Explicação simples.**` → camada 🟢;
`**Causas possíveis:**` + `**Passos de solução…**` → camada 🔧. Sem o marcador, o 1º
parágrafo vira a camada simples. Garante ancoragem perfeita (zero alucinação).

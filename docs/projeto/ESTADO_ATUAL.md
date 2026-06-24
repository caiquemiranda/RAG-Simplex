# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-24

> **Visão consolidada do que existe:** [`../ARQUITETURA.md`](../ARQUITETURA.md)
> (módulos, endpoints, RBAC, frontend) e [`../TESTES.md`](../TESTES.md) (59 testes).

## 📍 Você está aqui

- **Branch:** `feat/fase-7-frontend` (push via `http.sslBackend schannel`).
- **Fases 7, 8, 9 ✅:** frontend completo + Docker. Chat com **streaming (NDJSON)**,
  markdown, citações split-screen, **feedback 👍/👎**, **histórico persistente** e
  **layout estilo ChatGPT** (sidebar em grupos: Consulta + abas Relatórios/Buscar
  Equipamento/Documentos como placeholders). Painel ADM com CRUD de
  usuários/permissões, **estratégia por usuário** e **auditoria**. **Backend 59 testes**.
- **Rodar nativo:** scripts em [`../../scripts/`](../../scripts/) (`run.ps1`,
  `backend.ps1`, `frontend.ps1`); caches em `.cache/` (no D:).
- **D-015 ✅:** busca híbrida (bônus léxico) corrigiu o ranking.

## ⏭️ Próximos passos

1. **Validar na máquina do dev:** `scripts\run.ps1` (nativo) ou `docker compose up
   --build`. Schema mudou (coluna `feedback`): no nativo, recriar o `.db`; no Docker,
   volume novo. Ver `docs/DOCKER.md`.
2. **Conteúdo das abas novas:** Relatórios (métricas/feedback/auditoria), Buscar
   Equipamento, Documentos — hoje placeholders.
2. **Fase 11 (hardening):** cross-encoder reranker (D-020); avaliação RAGAS-lite;
   migrações Alembic (evitar recriar o banco a cada mudança de schema).
3. **Fase 10 (fim):** estratégias de nuvem + arena — **requer API key**.

> Rodar tudo: `docker compose up --build` **ou** uvicorn + `npm run dev`.

> Tudo até a Fase 9 é **sem API key e sem custo**.

## 🧱 Base já existente

- **Fases 0–2:** pipeline RAG; `local_extrativa`; `ClaudeNuvem` inerte até a Fase 10;
  embeddings `e5-small` (D-014); trecho do guia em `fontes[].trecho`.
- **Fase 3:** `app/{modelos,db,seed,cripto,preferencias}.py`.
- **Fase 4:** `app/auth.py` + endpoints de auth no `main.py`.

## 🔧 Para rodar na sua máquina (Fases 3–4)
```bash
pip install -r requirements.txt   # +SQLAlchemy +cryptography +PyJWT +argon2 +email-validator
python -m app.cripto              # gera RAG_SECRET_KEY (serve p/ cifra E JWT; cole no .env)
python -m app.db --init           # cria tabelas + semeia papéis/permissões
python -m app.auth --criar-admin admin@exemplo.com "SuaSenhaForte"
uvicorn app.main:app --reload     # /docs → POST /auth/login → use o Bearer token
```

## 🎯 Decisões

- **D-017 ✅** — Docker entra na **Fase 7** (com o frontend); compose enxuto (backend +
  frontend). Dev segue nativo até lá.
- **D-015 ✅** — busca híbrida (bônus léxico) corrigiu o ranking; limiar 0.78.
- **D-020 🔄** — cross-encoder reranker p/ fallback robusto (Fase 11).
- **D-006 🔄** — provedor grátis de nuvem (Gemini vs Groq): Fase 10.
- **D-010 🔄** — stack do frontend (Vite + React + TS + Tailwind): Fase 7.

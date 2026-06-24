# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Branch:** `feat/fase-7-frontend` (push via `http.sslBackend schannel`).
- **Fase 7 ✅:** frontend base+auth + **Docker (D-017)** — `docker compose up --build`
  sobe backend (:8000) + frontend (:8080) prontos. Backend **53 testes passando**.
- **Fase 8 🔄:** chat + markdown + citações com split-screen ✅ (falta streaming/feedback).
- **Fase 9 🔄:** painel ADM de **usuários/permissões** ✅ (falta estratégia/auditoria na UI).
- **D-015 ✅:** busca híbrida (bônus léxico) corrigiu o ranking.

## ⏭️ Próximos passos

1. **Validar na máquina do dev:** `docker compose up --build` (front :8080) — ou o
   fluxo nativo (uvicorn + `npm run dev`). Se o build bater em SSL, ver `docs/DOCKER.md`.
2. **Resto da Fase 9:** estratégia/persona por usuário + visualização da auditoria na UI.
3. **Resto da Fase 8:** streaming (`/query/stream`) + feedback 👍/👎.
4. **Fase 11:** cross-encoder reranker (D-020) p/ fallback robusto.

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

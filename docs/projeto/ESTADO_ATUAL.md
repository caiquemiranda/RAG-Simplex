# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Branch:** `feat/fase-7-frontend` (push via `http.sslBackend schannel`).
- **Fase 7 🔄 em andamento:** frontend **base + auth ✅** (Vite+React+TS+Tailwind,
  pronto p/ shadcn — login, rotas protegidas, layout por papel, cliente da API) +
  **CORS** no backend. **Falta: validar `npm install/build` (npm bloqueado aqui) e o
  Docker (D-017).** Backend: **44 testes passando**.
- **Fases 0–6 ✅:** backend completo (RAG, extrativo, persistência, auth, RBAC, ADM).

## ⏭️ Próximos passos

1. **Validar o frontend** na máquina do dev: `cd frontend && npm install && npm run dev`
   (se SSL: `npm config set cafile <CA>`). Reportar erros de build → eu ajusto.
2. **Docker (D-017):** `Dockerfile` backend (e5 pré-cacheado) + `Dockerfile` frontend
   (nginx) + `docker-compose` (volumes p/ `data/` e cache do modelo).
3. **Fase 8:** chat do técnico (markdown da dupla camada, aviso em destaque, streaming).
4. **Pendência (D-015):** calibrar limiar (`python -m app.recuperacao --diagnostico`).

> Para rodar tudo: backend (`uvicorn app.main:app --reload`) + frontend (`npm run dev`).

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
- **D-015 🔄** — limiar de similaridade (calibrar com `--diagnostico`).
- **D-006 🔄** — provedor grátis de nuvem (Gemini vs Groq): Fase 10.
- **D-010 🔄** — stack do frontend (Vite + React + TS + Tailwind): Fase 7.

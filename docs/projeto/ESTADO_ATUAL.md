# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Branch:** `feat/fase-4-auth` (empilhada sobre `feat/fase-3-persistencia`; PRs
  pendentes de abertura — push já funciona via `http.sslBackend schannel`).
- **Fase 4 ✅ concluída:** autenticação JWT — `/auth/login|refresh|me`, hash argon2,
  `usuario_atual`, rotas `/query`,`/query/stream`,`/ingest` protegidas, estratégia
  por usuário + `LogConsulta`. **33 testes passando** (rodados aqui, inclui TestClient).
- **Fases 0–3 ✅:** pipeline RAG + `local_extrativa` + trecho na íntegra + persistência.
- **Próxima fase:** **Fase 5 — Autorização / RBAC**.

## ⏭️ Próximos passos

1. **Fase 5 — RBAC:** dependency `requer(permissao)` por endpoint; **filtrar camadas
   por papel** (operador → só 🟢 linguagem simples); testes de bloqueio por papel.
2. **Pendência aberta (D-015):** calibrar o limiar — `python -m app.recuperacao --diagnostico`
   (não bloqueia; top-1 já correto).

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

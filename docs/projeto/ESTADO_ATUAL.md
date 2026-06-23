# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Branch:** `feat/fase-5-rbac` (empilhada sobre a 4; push via `http.sslBackend schannel`).
- **Fase 5 ✅ concluída:** RBAC — `requer(permissao)` nos endpoints, permissão extra
  por usuário (`usuario_permissao`), e **resposta adaptada ao papel** (operador → só 🟢;
  técnico/analista → 🟢+🔧). **39 testes passando** (rodados aqui).
- **Fases 0–4 ✅:** RAG + extrativo + persistência + auth JWT.
- **Próxima fase:** **Fase 6 — Painel ADM (API)**.

## ⏭️ Próximos passos

1. **Fase 6 — Painel ADM (API):** CRUD de usuários/papéis, atribuir estratégia/
   camadas/permissão extra por usuário, consultar auditoria (`LogConsulta`). Tudo
   protegido por `requer("gerir_usuarios")` etc. (cadastro de chaves fica p/ Fase 10).
2. **Pendência aberta (D-015):** calibrar o limiar — `python -m app.recuperacao --diagnostico`
   (não bloqueia; top-1 já correto).

> ⚠️ Schema novo: rode `python -m app.db --init` (cria a tabela `usuario_permissao`).

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

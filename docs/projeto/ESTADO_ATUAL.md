# Estado Atual — RAG-Simplex

> **Leia este arquivo primeiro.** Ele diz onde o projeto está e qual é o próximo
> passo. Atualize-o ao fim de cada sessão de trabalho.

**Última atualização:** 2026-06-23

## 📍 Você está aqui

- **Branch:** `feat/fase-3-persistencia` (ainda **não** está em `main`; PR pendente —
  `gh`/SSL precisam ser resolvidos para abrir o PR).
- **Fase 3 ✅ concluída:** persistência SQLite com **SQLAlchemy 2.0** (D-016) —
  modelos, seed de papéis/permissões, cifragem de chaves (Fernet) e resolução
  hierárquica da estratégia. **25 testes passando** (rodados aqui).
- **Fase 2 +:** resposta agora inclui o **trecho do guia na íntegra** (seção
  "📄 Sugestão do fabricante") e `fontes[].trecho` na API.
- **Próxima fase:** **Fase 4 — Autenticação (JWT)**.

## ⏭️ Próximos passos

1. **Pendência aberta (D-015):** calibrar o limiar de similaridade. Rodar
   `python -m app.recuperacao --diagnostico` e colar o "RESUMO / RECOMENDAÇÃO".
   Não bloqueia a Fase 4 (o top-1 já está correto).
2. **Fase 4 — Autenticação (JWT):** login usuário/senha (hash argon2/bcrypt),
   dependency `usuario_atual`, seed de admin, gravar `LogConsulta` nas consultas.

> Tudo até a Fase 9 é **sem API key e sem custo**.

## 🧱 Base já existente

- **Fase 0–2:** pipeline RAG; estratégia `local_extrativa` (sem LLM); `ClaudeNuvem`
  registrada mas inerte até a Fase 10. Embeddings: `e5-small` (D-014).
- **Fase 3:** `app/{modelos,db,seed,cripto,preferencias}.py`. Entidades: `Usuario`,
  `Papel`, `Permissao`, `Provedor` (key cifrada), `ConfigEstrategia`, `LogConsulta`.

## 🔧 Para rodar na sua máquina (Fase 3)
```bash
pip install -r requirements.txt   # agora inclui SQLAlchemy + cryptography
python -m app.cripto              # gera RAG_SECRET_KEY (cole no .env)
python -m app.db --init           # cria tabelas + semeia padrões
```

## 🎯 Decisões abertas (confirmar na fase)

- **D-015** — limiar de similaridade (calibrar com `--diagnostico`).
- **D-006** — provedor grátis de nuvem (Gemini vs Groq): Fase 10.
- **D-010** — stack do frontend (Vite + React + TS + Tailwind): Fase 7.

# Spec — Fase 7: Frontend React (base + auth) + Docker

**Status:** ✅ Concluído (frontend base + auth + Docker) · **Data:** 2026-06-23

> **Evolução:** o chat e o layout amadureceram na Fase 8
> ([`spec-fase-8-frontend-chat.md`](spec-fase-8-frontend-chat.md)): streaming,
> citações, feedback, histórico e sidebar responsiva estilo ChatGPT.

## Objetivo

Fundar a interface web (SPA) que consome a API, com login real, rotas protegidas
e navegação por papel. Depois, containerizar backend + frontend (D-017).

## Stack (D-010)

Vite + React + TypeScript + Tailwind, estrutura **pronta para shadcn/ui** (alias
`@/`, `cn()`, variáveis CSS de tema). Componentes UI base (Button, Input, Label,
Card) escritos no estilo shadcn — os oficiais podem ser adicionados via CLI depois.

## O que foi implementado — `frontend/`

```
src/
├── main.tsx              Router + AuthProvider
├── App.tsx               rotas: /login pública; demais sob ProtectedRoute + Layout
├── index.css             Tailwind + variáveis de tema (shadcn neutral)
├── lib/api.ts            cliente HTTP (fetch) + tipos (Usuario, Fonte, RespostaQuery);
│                         token JWT no localStorage, enviado como Bearer
├── lib/utils.ts          cn() = clsx + tailwind-merge
├── auth/AuthContext.tsx  entrar()/sair(); ao montar, valida sessão via /auth/me
├── auth/ProtectedRoute.tsx  redireciona p/ /login se não autenticado
├── components/Layout.tsx casca + navegação condicionada por permissão
├── components/ui/*       button, input, label, card
└── pages/
    ├── Login.tsx         formulário → /auth/login → guarda token
    ├── Home.tsx          usuário, papel e permissões; link condicional p/ consulta
    └── Consulta.tsx      consulta básica → /query (markdown rico = Fase 8)
```

Config: `package.json`, `vite.config.ts` (alias `@`), `tsconfig*`, `tailwind.config.js`,
`postcss.config.js`, `index.html`, `.env.example` (`VITE_API_URL`), `README.md`.

## Backend — glue
- **CORS** habilitado em `app/main.py` (`CORSMiddleware`), origens em
  `settings.cors_origins` (`RAG_CORS_ORIGINS`, padrão inclui `:5173`).
- Navegação/UI por papel reusa `permissoes` de `/auth/me` (RBAC da Fase 5).

## ⚠️ Validação
O build do frontend **não foi executado neste ambiente** (npm bloqueado por SSL
corporativo — `UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Revisão por leitura feita. O build
real roda na máquina do dev:
```bash
cd frontend
cp .env.example .env
npm install          # se SSL: npm config set cafile <CA> | ou strict-ssl false
npm run dev          # http://localhost:5173
```
Backend: **44 testes passando** (inclui CORS).

## Pendente nesta fase
- [ ] `Dockerfile` backend (e5 pré-cacheado) + `Dockerfile` frontend (nginx)
- [ ] `docker-compose.yml` (volumes p/ `data/` e cache do modelo) — D-017

## Próximo (Fase 8)
Chat do técnico: render de markdown da dupla camada, aviso de segurança em destaque,
streaming (`/query/stream`) e feedback 👍/👎.

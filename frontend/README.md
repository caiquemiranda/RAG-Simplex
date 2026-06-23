# RAG-Simplex — Frontend

SPA em **Vite + React + TypeScript + Tailwind** (estrutura pronta para shadcn/ui)
que consome a API FastAPI do backend.

## Pré-requisitos
- Node 18+ e npm
- Backend rodando (`uvicorn app.main:app --reload`) com um usuário criado
  (`python -m app.auth --criar-admin ...`)

## Configurar e rodar
```bash
cd frontend
cp .env.example .env      # ajuste VITE_API_URL se necessário
npm install
npm run dev               # http://localhost:5173
```

### ⚠️ Erro de SSL no `npm install` (rede corporativa)
Se aparecer `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, aponte o npm para a CA corporativa:
```bash
npm config set cafile "C:\caminho\para\CA-corporativa.pem"
# OU (last resort, só em rede confiável):
npm config set strict-ssl false
```

## Estrutura
```
src/
├── main.tsx              ponto de entrada (Router + AuthProvider)
├── App.tsx               rotas (login pública; demais protegidas)
├── index.css            Tailwind + variáveis de tema (shadcn)
├── lib/
│   ├── api.ts            cliente HTTP + tipos da API
│   └── utils.ts          cn() (clsx + tailwind-merge)
├── auth/
│   ├── AuthContext.tsx   login/logout + /auth/me; token no localStorage
│   └── ProtectedRoute.tsx
├── components/
│   ├── Layout.tsx        cabeçalho + navegação por papel
│   └── ui/               Button, Input, Label, Card (estilo shadcn)
└── pages/
    ├── Login.tsx
    ├── Home.tsx          dados do usuário + permissões
    └── Consulta.tsx      consulta básica (chat rico = Fase 8)
```

## shadcn/ui
A base já segue as convenções do shadcn (alias `@/`, `cn()`, variáveis CSS). Para
adicionar componentes oficiais depois:
```bash
npx shadcn@latest init
npx shadcn@latest add button input card label
```

## Próximas fases
- **Fase 8:** chat do técnico (markdown da dupla camada, aviso de segurança em
  destaque, streaming, feedback 👍/👎).
- **Fase 9:** painel ADM (usuários, estratégias, auditoria).
- **Docker (D-017):** `docker-compose` com backend + este frontend.

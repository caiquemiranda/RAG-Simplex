# Spec — Fase 9: Painel ADM (frontend)

**Status:** ✅ Implementado · **Data:** 2026-06-24

## Objetivo

Dar ao administrador uma interface web para gerir usuários, acessos, estratégia
por usuário e ver a auditoria — consumindo a API ADM (Fases 5–6).

## Frontend — `pages/Admin.tsx` (rota `/admin`, só com `gerir_usuarios`)

Duas abas:

### Usuários
- **Tabela**: e-mail, nome, papel, ativo, nº de permissões extra.
- **Criar**: e-mail, nome, senha, papel.
- **Editar** (painel inline):
  - Dados: nome, papel (select), ativo, reset de senha.
  - **Permissões**: checkboxes de todas; as do papel vêm marcadas/“(papel)”; as
    demais são **extra** (`PUT /admin/usuarios/{id}/permissoes-extra`).
  - **Estratégia/persona/camadas deste usuário**: carrega a config atual
    (`GET /admin/usuarios/{id}/estrategia`), select de estratégias disponíveis,
    persona, checkboxes 🟢/🔧 → `PUT`. Vazio = padrão global/por papel.

### Auditoria — `components/AuditoriaView.tsx`
- Tabela das consultas (`GET /admin/auditoria`): quando, usuário (id→e-mail),
  pergunta, estratégia, fallback, **feedback** 👍/👎.

## Backend (complementos desta fase)
- `GET /admin/usuarios/{id}/estrategia` — config do usuário (ou `null`).
- `feedback` exposto em `AuditoriaItem`.
- (Já existiam: `PUT estrategia`, `/auditoria`, `/estrategias`, catálogos.)

## `lib/api.ts`
Bloco `admin` ganhou: `estrategias`, `estrategiaUsuario`, `definirEstrategiaUsuario`,
`auditoria`.

## Testes
Backend `tests/test_admin.py` (GET/PUT estratégia por usuário) → **59 passed**.
UI não testada no ambiente (npm bloqueado por SSL) — revisão por leitura.

## Fora de escopo (Fase 10)
Arena (comparar estratégias) e gestão de chaves de provedor — entram quando as
estratégias de nuvem existirem.

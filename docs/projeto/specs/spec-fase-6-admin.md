# Spec — Fase 6: Painel ADM (API)

**Status:** ✅ Implementado · **Data:** 2026-06-23

## Objetivo

Permitir ao administrador configurar a plataforma **em runtime** (sem editar
`.env` nem o banco na mão): usuários, papéis, estratégia/camadas por usuário,
config global, auditoria e provedores de LLM.

## Componente — `app/admin.py` (router `/admin`)

Todo endpoint é protegido por `requer(permissao)` (RBAC, Fase 5).

### Usuários (`gerir_usuarios`)
- `GET /admin/usuarios` — lista (com papel e permissões extra).
- `POST /admin/usuarios` — cria (email, senha hasheada, papel) → 201.
- `GET /admin/usuarios/{id}` — detalhe.
- `PATCH /admin/usuarios/{id}` — atualiza nome/ativo/papel/senha.
- `PUT /admin/usuarios/{id}/permissoes-extra` — define permissões extra.

### Estratégia / configuração (`gerir_estrategias`)
- `GET /admin/estrategias` — estratégias disponíveis (registro `ESTRATEGIAS`).
- `PUT /admin/usuarios/{id}/estrategia` — upsert `ConfigEstrategia` escopo=usuario
  (estrategia/persona/camadas). **Vale na próxima consulta do usuário** (via
  `resolver_estrategia`/`resolver_camadas`).
- `PUT /admin/config-global` — upsert a config global.

### Auditoria (`ver_auditoria`)
- `GET /admin/auditoria?limite&offset` — `LogConsulta` recentes (id desc).

### Provedores (`gerir_chaves`) — preparação da Fase 10
- `GET /admin/provedores` — lista com `tem_chave` e `chave_mascarada` (últimos 4).
- `PUT /admin/provedores/{nome}` — grava a chave **cifrada** (`cripto.cifrar`).
  A chave **nunca** retorna em claro — só máscara (PRD §6.2, D-011).

## Testes (rodados — 44 passed) — `tests/test_admin.py`
- Não-admin (operador) **barrado** em `/admin/usuarios` (403).
- Admin lista e **cria** usuário (201).
- Admin **troca a estratégia** de um técnico e a mudança **vale na próxima consulta**
  (estratégia resolvida = `claude_nuvem`, capturada no mock de geração).
- `/query` gera registro em **auditoria** (admin consegue listar).
- Provedor: chave gravada cifrada; resposta/listagem trazem **máscara**, nunca a
  chave em claro.

## Ainda NÃO feito
- Frontend do painel (Fases 7–9).
- Uso real das chaves de provedor na geração (Fase 10).
- Ligar/desligar estratégias com persistência fina (hoje: listar + definir padrão
  global/por usuário).

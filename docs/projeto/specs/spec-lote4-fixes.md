# Spec — Lote 4 (parte 1): #FIX-TOKEN · #FIX-EMAIL · #FER-1

**Status:** ✅ Implementado · **Data:** 2026-06-25 · **Branch:** `feat/lote4-fixes`
**Backlog:** [§G](../BACKLOG.md) · **Log:** [2026-06-25](../LOG.md)

Três ajustes independentes solicitados pelo usuário (itens 4, 2 e 1 do Lote 4). Sem novas
entidades; o #FER-1 muda o **comportamento** do cronograma.

---

## #FIX-TOKEN — token de acesso dura 1 dia (item 4)
**Problema:** o token expirava em 60 min, interrompendo o uso.
**Mudança:** `app/config.py` → `access_token_expira_min: 60 → 1440` (24 h). O refresh
token segue em 7 dias (`refresh_token_expira_dias`). Sobrescrevível por `.env`
(`RAG_ACCESS_TOKEN_EXPIRA_MIN`). Sem mudança de contrato.

## #FIX-EMAIL — e-mail case-insensitive (item 2)
**Problema:** login falhava por diferença de maiúscula/minúscula.
**Regra:** o e-mail é a **chave de identidade** e passa a ser sempre normalizado para
**`strip().lower()`** — no cadastro (armazenamento) e no login (comparação).

**Implementação:**
- `app/auth.py` → `normalizar_email(email) -> str` (`(email or "").strip().lower()`).
- **Login** (`app/main.py`): `where(Usuario.email == normalizar_email(dados.email))`.
- **Criação** (`app/admin.py::criar_usuario`): normaliza antes de checar duplicado (409
  agora é case-insensitive) e de gravar; e-mail vazio → 400.
- **CLI admin** (`app/auth.py::criar_ou_atualizar_admin`): normaliza o e-mail.
- **Backfill** dos existentes: migração Alembic `5c77258e6fc6`
  (`UPDATE usuario SET email = lower(trim(email))`), **pulando colisões** (se já existir
  outro usuário com o e-mail-alvo) para não violar a unicidade — colisão fica para
  tratamento manual.

> Nota: não há edição de e-mail na API (`UsuarioAtualizar` não tem `email`), então só
> login e criação precisam normalizar.

## #FER-1 — feriado sem atividades (item 1)
**Regra de negócio:** num dia de **feriado** o cronograma **não** tem atividades nem
alocações fixas (#ALOC) — aparece **apenas "Feriado"**. Ao transformar um dia em feriado,
os técnicos que tinham atividade nele são **notificados** (o dia ficará vazio).

**Implementação (`app/cronograma.py`):**
- `listar`: carrega o conjunto de datas de feriado no intervalo
  (`select(Feriado.data).where(... entre de/ate ...)`) e **remove** da resposta as visitas
  reais nessas datas; o laço de #ALOC **pula** dias de feriado (nenhum fixo virtual).
- `criar_feriado`: após inserir, busca as visitas naquele dia, junta os técnicos (dedup) e
  cria uma `Notificacao` (`tipo="cronograma"`, "atividades suspensas") para cada um.
- `criar`: **bloqueia** (400 "Dia é feriado — sem atividades.") agendar visita numa data
  de feriado — mantém a regra consistente (evita criar algo que não apareceria).
- **Frontend:** sem mudança — a célula do dia já mostra `🎌 {descrição}` (#CR3) e, como a
  API não retorna mais visitas no feriado, o dia exibe só o feriado.

**Reversível:** a supressão é só de exibição (as visitas continuam no banco); ao remover o
feriado, as atividades daquele dia voltam a aparecer.

## Testes
- `tests/test_admin.py::test_email_case_insensitive` — cadastro normaliza; duplicado por
  caixa → 409; login com caixa diferente → 200.
- `tests/test_cronograma.py::test_feriado_suprime_atividades_e_notifica` — feriado some com
  atividades/fixos, notifica os técnicos do dia e bloqueia (400) agendar em feriado.
- Suíte: **90 passed**.

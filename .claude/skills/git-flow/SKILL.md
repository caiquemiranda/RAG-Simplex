---
name: git-flow
description: >-
  Fluxo de Git profissional deste projeto, ponta a ponta: abrir trabalho (branch a
  partir da main atualizada), commits no padrão tipo(#TAG), certificação (testes +
  tsc + Alembic), e fechar (merge --no-ff na main + push + limpeza). Use quando for
  iniciar uma feature/correção, padronizar commits, ou integrar/mergear na main.
---

# git-flow — fluxo de Git profissional do RAG-Simplex

Padroniza o versionamento **de ponta a ponta**, como usado no projeto. Referência humana
completa: [`docs/GUIA_GIT.md`](../../../docs/GUIA_GIT.md). Siga as fases na ordem.

## Princípios (não violar)
- **Uma feature = um branch**; a `main` fica sempre "verde" (testes + typecheck).
- **Nunca** commitar direto na `main` — sempre branch → merge.
- **Nunca** reescrever história de branch compartilhado (`reset --hard`/`push --force`).
- Commits **atômicos**: código + **testes** + **docs** juntos.
- Confirmar com o usuário antes de **push para `main`** se ele não autorizou explicitamente.

## Fase 1 — Abrir o trabalho
1. Garantir base limpa e atualizada:
   ```bash
   git checkout main && git pull
   git status   # working tree deve estar limpo
   ```
2. Criar o branch com o prefixo certo (kebab-case, um assunto):
   - `feat/<slug>` funcionalidade · `docs/<slug>` só docs · `fix/<slug>` correção ·
     `refactor/<slug>` · `test/<slug>` · `chore/<slug>`.
   ```bash
   git checkout -b feat/<slug>
   ```
3. Definir/confirmar a **#TAG** de rastreio (ex.: `#OS-PAGINA`) e, se for decisão
   arquitetural, registrar um `D-0NN` em `docs/projeto/DECISOES.md`.

## Fase 2 — Trabalhar em commits pequenos
- Formato da mensagem (heredoc para multi-linha, sem aspas frágeis):
  ```
  <tipo>(#TAG): resumo no imperativo (≤ ~72 col)

  - o QUÊ e o PORQUÊ, por área tocada
  - efeitos colaterais / decisões

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- `tipo` ∈ `feat|fix|docs|refactor|test|chore|perf|build|ci` (combináveis: `docs+test`).
- Antes de cada commit relevante: **atualizar docs** (`BACKLOG.md`, `LOG.md`,
  `ESTADO_ATUAL.md`; specs; `DECISOES.md`) e **escrever/rodar testes**.
- Comandos:
  ```bash
  git add -A
  git commit -F - <<'EOF'
  feat(#TAG): ...
  EOF
  ```

## Fase 3 — Certificar (antes de integrar) — DoD
Rodar e exigir **tudo verde**:
```bash
pytest -q                          # backend (ver comando exato do projeto)
(cd frontend && node_modules/.bin/tsc -b)   # typecheck do frontend
python -m alembic heads            # deve haver UM único head
```
Se houver migração nova: aplicar num banco temporário e conferir o encadeamento
(`down_revision` = head anterior; sem "ruído de FK" no SQLite; coluna não-nula com
`server_default`).

## Fase 4 — Fechar (integrar na main)
**Caminho A — PR (preferido em equipe):**
```bash
git push origin feat/<slug>
```
Abrir o **PR** no GitHub (descrição + como testar + checklist), revisar, mergear pela UI.

**Caminho B — merge local `--no-ff` (quando autorizado):**
```bash
git checkout main
git merge --no-ff feat/<slug> -m "Merge branch 'feat/<slug>' (#TAG): <resumo>"
# resolver conflitos se houver; em arquivos append-only (LOG.md) manter os DOIS lados
pytest -q && (cd frontend && node_modules/.bin/tsc -b)   # re-certificar a main
git push origin main
git branch -d feat/<slug>          # limpeza local
```

## Fase 5 — Higiene periódica
- Apagar branches já mergeadas (remotas e locais):
  ```bash
  git branch --merged main | grep -v '\*\|main' | xargs -r git branch -d
  git push origin --delete <branch-remota-mergeada>
  ```
- **Releases** (quando marcar versão): tag anotada + SemVer + `CHANGELOG.md`.
  ```bash
  git tag -a v0.7.0 -m "Lote 7: ..." && git push origin v0.7.0
  ```

## Checklist rápido
- [ ] Branch a partir da `main` atualizada, prefixo correto.
- [ ] Commits `tipo(#TAG)` + `Co-Authored-By`, atômicos, com testes e docs.
- [ ] `pytest` verde · `tsc -b` limpo · Alembic head único.
- [ ] `BACKLOG`/`LOG`/`ESTADO_ATUAL` (+ `DECISOES` se houve decisão) atualizados.
- [ ] Merge `--no-ff` (ou PR) com mensagem descritiva; `main` re-certificada; branch limpa.

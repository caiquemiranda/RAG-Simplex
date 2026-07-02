# Guia de Git Profissional — como foi usado no RAG-Simplex

Documento de referência do **fluxo de versionamento** deste projeto: o que foi realmente
praticado (branches, commits, merges, PRs) **e** as práticas profissionais que o cercam.
Serve como manual para reproduzir o mesmo rigor em qualquer projeto.

> **Filosofia deste projeto:** uma **feature por branch**, **commits pequenos e descritivos**,
> **docs no mesmo commit da feature**, **merge via `--no-ff`** para preservar a história, e
> **decisões registradas** (ADR-lite em `docs/projeto/DECISOES.md`). Nada vai para a `main`
> sem **testes verdes** e **typecheck limpo**.

---

## 1. Conceitos base (o modelo mental)

- **Repositório**: a pasta `.git` guarda todo o histórico como um **grafo de commits**.
- **Commit**: uma *foto imutável* do projeto + metadados (autor, data, mensagem, pai(s)).
  Identificado por um hash SHA (ex.: `b6da7d1`). É a unidade atômica de mudança.
- **Branch**: um **ponteiro móvel** para um commit. Criar branch é barato (só um ponteiro).
  `main` é o branch estável; `feat/*`/`docs/*` são de trabalho.
- **HEAD**: onde você está agora (normalmente a ponta do branch atual).
- **Working tree / staging (index) / repositório**: as 3 áreas. Você edita na *working tree*,
  seleciona com `git add` (staging), e grava com `git commit`.
- **Remoto (`origin`)**: a cópia no GitHub. `push` envia, `fetch` traz, `pull` = fetch + merge.
- **Merge vs Rebase**: *merge* junta históricos criando um commit de junção; *rebase* reescreve
  seus commits sobre outra base (história linear). Aqui usamos **merge `--no-ff`**.

---

## 2. Branches — estratégia usada

Modelo próximo do **GitHub Flow**: `main` sempre "verde"; todo trabalho em um branch curto que
volta por PR/merge.

### 2.1 Convenção de nomes (praticada aqui)

| Prefixo | Uso | Exemplos reais |
| --- | --- | --- |
| `feat/` | nova funcionalidade ou épico | `feat/lote6-equipamentos`, `feat/buscar-equipamento`, `feat/fase-4-auth` |
| `docs/` | mudança só de documentação | `docs/backlog-lote6`, `docs/d026-lote6` |
| *(sufixo)* `-fixes` | lote de correções | `feat/lote4-fixes`, `feat/lote5-fixes` |

Regras: **kebab-case**, curto e descritivo, um assunto por branch. Prefixos possíveis num time
maior: `fix/`, `chore/`, `refactor/`, `test/`, `hotfix/`, `release/`.

### 2.2 Ciclo de vida de um branch (o que foi feito)

```bash
git checkout main                       # parte da base estável
git pull                                # sincroniza com o remoto
git checkout -b feat/lote6-equipamentos # cria o branch da feature

# ... trabalha, commita em pequenos passos ...

git push origin feat/lote6-equipamentos # publica o branch
# abre o PR (UI) OU integra localmente (ver §5)
```

**Um branch = uma feature isolada.** No projeto, cada épico teve o seu (`#MAP`, `#OS`, Lote 6).
Branches de docs (`docs/backlog-lote6`) isolaram mudanças de planejamento das de código.

---

## 3. Commits — padrão adotado

### 3.1 Anatomia da mensagem

Formato usado (dialeto de **Conventional Commits** com uma **tag de rastreio** entre parênteses):

```
<tipo>(#TAG): resumo no imperativo, curto (≤ ~72 col)

Corpo opcional explicando O QUÊ e POR QUÊ (não o "como" — isso o diff mostra).
- bullets objetivos por área tocada
- decisões e efeitos colaterais relevantes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

Exemplos reais:

```
feat(#EQP-STATUS): estado do equipamento + falha atual (Lote 6, D-026)
feat(#OS-PAGINA): criar/editar O.S. com todos os campos (FormOS reutilizavel)
docs(D-026): confirma decisoes do Lote 6 (#EQP-STATUS e #EQP-PAGINA)
docs+test(#OS): fecha pendencias de docs (D1-D4) e testes (T1-T4) da unificacao
```

### 3.2 `<tipo>` usados

| Tipo | Quando | Visto no projeto |
| --- | --- | --- |
| `feat` | nova funcionalidade | maioria dos commits |
| `docs` | só documentação | `docs(backlog)`, `docs(D-026)` |
| `docs+test` | doc + teste juntos | `docs+test(#OS)` |
| *(comuns no mercado)* `fix`, `refactor`, `test`, `chore`, `perf`, `style`, `build`, `ci` | — | usar conforme a natureza |

### 3.3 A `#TAG` de rastreio

Cada frente tem uma **tag curta e estável** (`#OS`, `#MAP`, `#EQP-STATUS`, `#TAB-ORDEM`…) que
aparece no **commit**, no **BACKLOG**, no **LOG**, nas **specs** e no **código** (comentários).
Isso amarra *pedido → decisão → código → teste → doc*. As **decisões** têm id próprio
(`D-025`, `D-026`) em `docs/projeto/DECISOES.md` (padrão **ADR-lite**).

### 3.4 Boas práticas de commit (praticadas)

- **Atômico**: um commit = uma ideia completa e coerente (compila, testa, documenta).
- **Testes e docs no mesmo commit** da feature — nunca "commito o código agora e documento depois".
- **Imperativo**: "adiciona", "corrige" (não "adicionado"/"adicionando").
- **Verde antes de commitar**: `pytest` + `tsc -b` limpos.
- **Co-autoria** creditada (`Co-Authored-By:`), como manda a etiqueta quando há par/assistente.

### 3.5 Comandos do dia a dia

```bash
git status                 # o que mudou / o que está no staging
git add -A                 # seleciona tudo (ou: git add caminho/arquivo)
git commit -F - <<'EOF'    # mensagem multi-linha via heredoc (evita aspas)
feat(#TAG): resumo

- detalhe
EOF
git log --oneline -20      # histórico compacto
git diff                   # mudanças ainda não no staging
git restore --staged X     # tira X do staging (desfaz o add)
```

---

## 4. Tags e versionamento (SemVer)

> **Estado neste projeto:** ainda **não usamos tags** (o produto está em desenvolvimento contínuo
> por Fases/Lotes). Abaixo, como adotar quando houver releases — recomendação para o próximo passo.

- **Tag** = rótulo fixo num commit (um marco). Diferente de branch: **não se move**.
- **SemVer** `MAJOR.MINOR.PATCH` (ex.: `v1.4.2`):
  - **MAJOR**: quebra compatibilidade;
  - **MINOR**: nova funcionalidade compatível (cada "Lote" fechado seria um `MINOR`);
  - **PATCH**: correção compatível.
- **Tag anotada** (recomendada — guarda autor/data/mensagem, e pode ser assinada):

```bash
git tag -a v0.6.0 -m "Lote 6: equipamentos avancados + O.S. CRUD"
git push origin v0.6.0            # tags não sobem no push normal
git push origin --tags           # ou envia todas
```

- No GitHub, uma tag vira base de um **Release** (com notas/changelog e binários).
- **Changelog**: manter um `CHANGELOG.md` (padrão *Keep a Changelog*) alimentado pelo `LOG.md`.

---

## 5. Integração: PR e merge

Este projeto usou **dois caminhos**, ambos válidos:

### 5.1 Pull Request pela interface do GitHub (revisão)

Fluxo padrão de time: `push` do branch → abre **PR** → revisão → **merge** pela UI
(ex.: *"Merge pull request #8 from feat/lote5-fixes"*). Vantagens: revisão de código, checks de
CI obrigatórios, discussão registrada. **Prefira este em equipe.**

### 5.2 Merge local `--no-ff` (o que fizemos ao integrar vários branches)

```bash
git checkout main
git merge --no-ff feat/lote6-equipamentos -m "Merge branch 'feat/lote6-equipamentos' (Lote 6): ..."
git push origin main
```

- **`--no-ff` (no fast-forward)**: **força um commit de merge** mesmo quando daria para adiantar
  o ponteiro. Isso **preserva a fronteira da feature** no histórico (dá para ver onde o branch
  começou e terminou) e facilita reverter a feature inteira (`git revert -m 1 <merge>`).
- **Mensagem de merge descritiva**, citando a(s) tag(s): *"Merge branch '…' (#MAP + #OS D-025): …"*.

### 5.3 Resolver conflitos (aconteceu em `LOG.md`/`ESTADO_ATUAL.md`)

```bash
git merge feat/x
# CONFLICT em docs/... → o arquivo ganha marcadores:
#   <<<<<<< HEAD ... ======= ... >>>>>>> feat/x
# edite mantendo o conteúdo correto dos DOIS lados, remova os marcadores
git add docs/arquivo.md
git commit                # conclui o merge (mantém a mensagem de merge)
```

Dica usada: em arquivos **append-only** (como `LOG.md`), a resolução foi **manter as duas
entradas** em ordem cronológica, não escolher um lado.

### 5.4 Certificação antes do push da `main`

Rotina aplicada a **todo** merge para a `main`:

1. `pytest -q` → **todos os testes verdes** (104 no fim do Lote 6);
2. `tsc -b` → **typecheck do frontend limpo**;
3. `alembic heads` → **um único head** de migração (sem ramificação);
4. só então `git push origin main`.

---

## 6. Migrações de banco no fluxo Git (especial deste projeto)

Cada mudança de schema entra **junto** da feature: modelo (`app/modelos.py`) + arquivo de
migração Alembic (`alembic/versions/…`) + teste. Regras aprendidas:

- **Encadeamento linear**: cada migração aponta `down_revision` para o head anterior → um único
  head (`alembic heads` confirma). Merges de branches com migração diferente exigem cuidado.
- **SQLite + Alembic**: `ALTER` limitado → usar `op.batch_alter_table`. O autogenerate produz
  "ruído de FK" que foi **removido manualmente**; colunas novas não-nulas precisam de
  `server_default`.
- **Verificar aplicando** num banco temporário antes de commitar: `RAG_DB_PATH=... alembic upgrade head`.

---

## 7. Desfazer com segurança (rede de proteção)

| Situação | Comando | Observação |
| --- | --- | --- |
| Tirar arquivo do staging | `git restore --staged X` | não perde a edição |
| Descartar edição não commitada | `git restore X` | **destrutivo** |
| Corrigir a última mensagem | `git commit --amend` | só antes de `push` |
| Reverter um commit já publicado | `git revert <sha>` | cria commit inverso (seguro) |
| Reverter uma feature inteira (merge) | `git revert -m 1 <merge_sha>` | por causa do `--no-ff` |
| "Voltar no tempo" localmente | `git reset --hard <sha>` | **perigoso**, reescreve |
| Achei que perdi um commit | `git reflog` | histórico de onde o HEAD esteve |

> Regra de ouro: **nunca** reescrever história (`reset --hard`, `push --force`) de um branch
> **compartilhado**. Em branch só seu, tudo bem.

---

## 8. Checklist "feature pronta" (Definition of Done deste projeto)

- [ ] Branch `feat/…` a partir da `main` atualizada.
- [ ] Código + **testes** (pytest) + **docs** no(s) commit(s).
- [ ] `pytest` verde e `tsc -b` limpo.
- [ ] Migração encadeada e aplicável (`alembic upgrade head`), head único.
- [ ] `BACKLOG.md`, `LOG.md`, `ESTADO_ATUAL.md` atualizados; decisão em `DECISOES.md` se houver.
- [ ] Commits no padrão `tipo(#TAG): …` com `Co-Authored-By`.
- [ ] Merge `--no-ff` (ou PR) com mensagem descritiva; `main` re-certificada.

---

## 9. Glossário rápido

**upstream/origin**, **fast-forward**, **detached HEAD**, **cherry-pick** (levar um commit
específico para outro branch), **stash** (guardar mudanças sujas temporariamente), **bisect**
(busca binária pelo commit que quebrou algo), **blame** (quem/quando mudou cada linha),
**squash** (fundir vários commits em um), **tag anotada vs leve**, **submódulo**.

Ver também: [`ARQUITETURA.md`](ARQUITETURA.md), [`projeto/DECISOES.md`](projeto/DECISOES.md),
[`projeto/LOG.md`](projeto/LOG.md).

# Decisões Técnicas — RAG-Simplex (ADR-lite)

Registro enxuto das decisões e seu **motivo**, para não serem rediscutidas. Cada
decisão tem id, data, status e contexto. Se uma decisão mudar, **não apague** —
marque como `Substituída por D-NNN`.

Status: ✅ Vigente · 🔄 Proposta · ❌ Substituída

---

### D-001 ✅ Banco vetorial: ChromaDB (cosseno)
**2026-06-23.** Persistente, simples, local. Distância de cosseno via `hnsw:space`
(PRD §6.1). Alternativas (FAISS, in-memory) descartadas por menos ergonomia/persistência.

### D-002 ❌ Embeddings: MiniLM (substituída por D-014)
**2026-06-23.** `paraphrase-multilingual-MiniLM-L12-v2`. **Substituída** após testes
reais mostrarem scores baixos e ranking invertido (ver D-014).

### D-003 ✅ Geração padrão via Claude `claude-opus-4-8`
**2026-06-23.** Decisão do PRD/CLAUDE.md. A partir da Fase 2 vira **uma estratégia
entre várias**, não a única — mas continua sendo o provedor de referência.

### D-004 ✅ Interface HTTP: FastAPI
**2026-06-23.** Já existente; o frontend React consumirá esta API.

### D-005 ✅ "Local" = extrativo, não LLM local
**2026-06-23.** O note do usuário é fraco e **não roda LLM 7B+**. Portanto:
- `LOCAL_EXTRATIVO` = renderizar o bloco recuperado em template (sem LLM). Grátis,
  instantâneo, ancoragem perfeita.
- Todo LLM é **nuvem** (Claude pago ou Gemini/Groq free-tier). Ollama está **fora**.

### D-006 🔄 Provedor grátis padrão da nuvem
**2026-06-23.** Proposta: **Gemini Flash** (cota gratuita real, bom PT, baixa
latência) como provedor grátis padrão; Groq como alternativa rápida. Claude
permanece como opção paga premium. **Confirmar na Fase 2.**

### D-007 🔄 Estratégias de geração plugáveis
**2026-06-23.** Geração será uma interface com 3 implementações: `LOCAL_EXTRATIVO`,
`LLM_NUVEM` (provedor configurável) e `HIBRIDO_A_C`. Selecionável por
config/usuário. Detalhe na Fase 2.

### D-008 🔄 Persistência de config/usuários: SQLite
**2026-06-23.** Leve, sem servidor, roda no note. Guardará usuários, papéis,
permissões, provedores (chaves cifradas), config de estratégia por usuário e
auditoria. Tira a config do `.env` para permitir edição via painel ADM. Fase 4.

### D-009 🔄 Auth: JWT local (com caminho para SSO depois)
**2026-06-23.** Começar com usuário/senha (hash argon2/bcrypt) + JWT, possivelmente
via `fastapi-users`. RBAC com os 4 papéis das personas do PRD §3
(Operador/Técnico/Analista/Admin). SSO corporativo fica como evolução. Fases 5–6.

### D-010 🔄 Stack do frontend: Vite + React + TypeScript + Tailwind
**2026-06-23.** Moderno, leve, build rápido — bom para note fraco. (Opcional:
shadcn/ui para componentes.) **Confirmar na Fase 8.**

### D-011 ✅ Chaves de API só no servidor, cifradas
**2026-06-23.** Nenhuma chave de provedor vai ao frontend nem ao JWT do técnico. O
servidor resolve a estratégia e chama o provedor. Requisito de segurança (PRD §6.2).

### D-012 ✅ API key empurrada para o final (Fase 10)
**2026-06-23.** A pedido do usuário (note fraco, sem custo inicial), todo o trabalho
que depende de API key foi reordenado para a **Fase 10**. Construímos primeiro a RAG
100% local/grátis (`local_extrativa`) e todo o restante (persistência, auth, RBAC,
painel, frontend) sem chave. Guia de chaves: `docs/CONFIGURAR_APIKEYS.md`.

### D-014 ✅ Embeddings: `intfloat/multilingual-e5-small` (otimizado p/ recuperação)
**2026-06-23.** Teste real com o MiniLM (D-002) na base indexada mostrou:
- `"cabeçote ausente"` → bloco correto a apenas **0.390**;
- `"HEAD MISSING no loop do 4100"` → bloco **errado** (No Answer 0.536) **acima** do
  correto (Head Missing 0.515).

Conclusão: o problema **não é o limiar 0.78** (baixá-lo não conserta ranking
invertido e deixaria passar falsos positivos — perigoso). O elo fraco é o modelo.
Trocado para **`intfloat/multilingual-e5-small`**, modelo assimétrico otimizado para
busca (prefixos `query: ` / `passage: `), melhor em PT/EN e com scores mais altos e
separados. Roda em CPU. Implementação: `embed_documentos`/`embed_consulta` aplicam os
prefixos; `config` guarda modelo e prefixos.
**Pendente:** recalibrar o limiar com os scores reais do e5 (rodar
`python -m app.recuperacao --diagnostico` após reingestão). O limiar 0.78 do PRD é
mantido até termos os dados; ajuste será justificado em D-015 se necessário.

### D-017 ✅ Containerização (Docker) na Fase 7, com o frontend
**2026-06-23.** Docker entra **na Fase 7** (junto do frontend), não antes. Motivo: hoje
o backend é um único processo (Chroma e SQLite são **embarcados**, não serviços), então
um container só agregaria pouco; o ganho do `docker compose up` ("subir tudo de uma
vez") aparece quando há **backend + frontend** para orquestrar.
- Compose **enxuto**: 2 serviços (`backend`, `frontend`). Chroma/SQLite seguem
  embarcados (não viram container próprio); Postgres só se for multiusuário (Fase 11).
- Modelo e5 **pré-cacheado** na imagem + **volumes** para `data/` → sem download em
  runtime (contorna o SSL) e dados persistentes.
- **Dev segue nativo** (venv + pip) pela agilidade no note fraco; o compose é para
  integração "tudo junto" e deploy.

### D-019 ✅ RBAC: permissão extra por usuário + camadas por papel
**2026-06-23.** Permissão efetiva = papel ∪ **permissões extra** do usuário
(`usuario_permissao`), permitindo acesso pontual sem trocar de papel. Dependency
`requer(permissao)` protege os endpoints (403). A **resposta é adaptada ao papel**
(PRD §5.2): operador → só 🟢; técnico/analista → 🟢 + 🔧 (+ trecho). Para isso a
`Resposta` passou a expor `camadas` estruturadas e o global deixou de fixar `camadas`
(senão sobreporia o padrão por papel). `/query/stream` passou a transmitir o texto já
filtrado (streaming de nuvem token a token fica para a Fase 10).

### D-018 ✅ Auth: argon2 + PyJWT (HS256) + login JSON; +email-validator
**2026-06-23.** Senha com **argon2** (argon2-cffi), tokens **PyJWT** HS256 (access +
refresh). Login por **corpo JSON** em vez de OAuth2 form → evita a dependência
`python-multipart`. O `OAuth2PasswordBearer` é usado só para ler o header `Bearer`.
Segredo do JWT = `RAG_JWT_SECRET` (ou `RAG_SECRET_KEY` como fallback).
**Dependência nova obrigatória:** `email-validator` — o FastAPI constrói modelos
OpenAPI (`Contact.email = EmailStr`) ao importar `fastapi.security`; sem o pacote a
API não sobe.

### D-016 ✅ Persistência com SQLAlchemy 2.0 (não SQLModel)
**2026-06-23.** O `sqlmodel` não estava instalado, mas `SQLAlchemy 2.0` e
`cryptography` já vinham com o Chroma. Optei por **SQLAlchemy 2.0 direto**: zero
dependência nova para o usuário baixar e permite **rodar os testes da Fase 3 offline**
(SQLite em memória). Modelos tipados (`Mapped`/`mapped_column`) em `app/modelos.py`.

### D-015 ✅ Busca híbrida (bônus léxico) + limiar mantido em 0.78
**2026-06-23.** O e5 confundia termos parecidos ("Head Missing" vs "Node Missing/
Failed") no ranking. **Resolvido** com **busca híbrida**: recupera um pool por vetor
e soma um **bônus aditivo** (`lexical_boost=0.12`) proporcional à cobertura dos termos
do display (`termo_en`/`header`). Medido na base real: o bloco correto passa a #1 com
folga ("head missing", "cabeçote ausente", "no answer", "warm start").

**Limiar mantido em 0.78** (não 0.94): o `--diagnostico` recomendou 0.94, mas seus
positivos continham o termo do display (todos ~0.96+). Uma consulta **coloquial**
sem termo em inglês fica ~0.88 e seria rejeitada por engano. Separar "fora da base"
de coloquial-válido com o e5 (scores comprimidos) exige um **cross-encoder reranker**
→ ver D-020 (Fase 11).

### D-020 🔄 Cross-encoder reranker (Fase 11)
**2026-06-23.** Para discriminar melhor *fora-da-base* × consulta válida (o limiar
sozinho não separa com o e5), avaliar um cross-encoder multilíngue (ex.:
`mmarco-mMiniLMv2`) reordenando o pool. Local/grátis, porém adiciona download e
latência → planejado para a Fase 11 (qualidade/hardening), não bloqueia.

### D-013 ✅ Separação de camadas no extrativo por marcadores do guia
**2026-06-23.** Como o `local_extrativa` não usa LLM, a "dupla camada" é obtida
parseando os marcadores consistentes do guia: `**Explicação simples.**` → camada 🟢;
`**Causas possíveis:**` + `**Passos de solução…**` → camada 🔧. Sem o marcador, o 1º
parágrafo vira a camada simples. Garante ancoragem perfeita (zero alucinação).

### D-021 ✅ "Local de trabalho" vira entidade Unidade
**2026-06-24.** O campo livre `unidade` (em `Usuario`/`Cliente`) será promovido a uma
**entidade `Unidade`** (cadastro: nome, cidade…), com usuário/cliente vinculados a ela.
**Por quê:** a "visão por unidade" do cronograma agrupando por texto livre sofreria com
variação de digitação; a entidade dá filtro robusto e evita retrabalho. **Quando:**
criar a `Unidade` **antes** de implementar a "visão por unidade" (Etapa 1c do BACKLOG).
Até lá, o texto livre permanece (sem migração obrigatória).
**Implementado (2026-06-25):** entidade `Unidade` (nome/cidade/ativo); `Usuario.unidade_id`
e `Cliente.unidade_id`; CRUD `/admin/unidades` (DELETE 409 se em uso); `GET /unidades`;
filtro `GET /cronograma?unidade_id=` (pela unidade do cliente, inclui virtuais #ALOC). O
texto livre legado segue como fallback de exibição.

### D-022 ✅ Migrações de schema versionadas com Alembic
**2026-06-25.** O banco **real/persistente** passa a ser gerido por **Alembic**
(`alembic/versions/`, baseline `2bd03ef0fccf` = schema completo atual). `aplicar_migracoes()`
roda `upgrade head`; o `env.py` usa `settings.database_url` (fonte única de URL) e
`Base.metadata` (autogenerate). **Por quê:** a micro-migração ad-hoc (`_migrar_colunas`,
só ALTER ADD de colunas nullable) não cobre renomear/remover/constraint e não tem histórico
auditável — perigoso conforme o schema cresce. **Escopo:** Alembic é a fonte de verdade do
banco real; a `criar_tabelas()`/`create_all` permanece para os **testes** (SQLite em memória)
e como **fallback** quando o Alembic não está instalado (substituição **gradual** da ad-hoc).
Banco real existente foi **stampado** na baseline (já tinha o schema via `create_all`).
**Fluxo:** `python -m alembic revision --autogenerate -m "..."` → revisar → `upgrade head`.

### D-023 ✅ "Buscar equipamento" (mapa de dispositivos) integrado e modernizado (#MAP)
**2026-06-26.** Trazer o projeto legado `sistema-manutencao-3` (React CRA + Leaflet, dados
estáticos em `Dispositivos.js`) para dentro do RAG-Simplex, nativo na stack atual. **Decisões:**
- **Visualizador custom (zero dependência npm)** em vez de Leaflet — o npm aqui é restrito por
  SSL; um componente próprio (imagem + zoom/pan + marcadores + popup) evita `npm install`.
- **Conversão PDF→PNG no servidor** (PyMuPDF, `settings.planta_dpi=150`): o admin sobe o PDF;
  cada página vira uma `Planta`. (PyMuPDF instala via pip — só o npm é restrito.)
- **`tag`** (coluna nova) é a chave de busca do equipamento (ex.: `N2-L23-DF-003`).
- **Coordenadas recadastradas** no editor (clicar na planta grava `pos_x`/`pos_y`), não migradas
  do `Dispositivos.js`.
- **Manutenção:** `status`, `ultima_manutencao`, `ultimo_teste` no equipamento (fecha a "fase B"
  adiada do #EQP-1); **histórico detalhado** virá da futura **O.S. (Ordem de Serviço)**.
**Escopo:** trazer só o módulo **plantas + buscar/mapa**; ordens de serviço/RAS do legado ficam
para depois (a O.S. terá um campo "equipamento"). Spec: `specs/spec-map-mapa-dispositivos.md`.

### D-024 ❌ Ordem de Serviço como entidade separada (Substituída por D-025)
**2026-06-26.** A **O.S.** (registro de manutenção) é entidade **própria** (`OrdemServico`),
distinta da `Visita`/atividade do cronograma. **Por quê:** semânticas diferentes — atividade =
agendamento no calendário; O.S. = ordem de manutenção ligada a **equipamento**/cliente (com
tipo corretiva/preventiva/planejada). Manter separadas evita poluir o cronograma e dá o
**histórico por equipamento** (#MAP-4). **Regra:** O.S. **concluída** com data grava
`equipamento.ultima_manutencao` (fonte automática da manutenção, antes manual). Tipos:
corretiva/preventiva/planejada; status: aberta/em_andamento/concluida/cancelada. Gestão por
`gerir_usuarios`; histórico do equipamento visível ao técnico do cliente. Spec
`specs/spec-os-ordem-servico.md`.

### D-025 ✅ Ordem de Serviço unifica a atividade do cronograma (substitui D-024)
**2026-06-26.** A pedido do usuário, **O.S. e atividade do cronograma são a mesma coisa** —
nome único **"Ordem de Serviço"**. A entidade **`Visita`** vira a O.S. (reaproveita
cronograma, **vários técnicos**, comentários, **anexar imagens**, #ALOC, notificação); a
entidade `OrdemServico` recém-criada (D-024) foi **removida**. **Visita ganhou:** `tipo`
(manutenção **preventiva/corretiva/avulsa**), `equipamento_id`, `falha_id` e os **campos do
documento de corretiva** (especialidade, requisitante, data de solicitação/execução, centro
de custo, nº O.S., reserva/material, endereço, setor, prioridade, ação aplicada). **Falha:**
catálogo `Falha` (cadastrável; ex.: No Answer, Dirty, Head Missing), 1 por O.S. **Regras:**
sem técnicos informados → usa os **fixos do cliente** (#ALOC); **concluir** com data grava
`equipamento.ultima_manutencao`; notificação ao criar linka à O.S. (#NOTIF-LINK). Histórico
por equipamento: `GET /cronograma/equipamento/{id}`. Spec `specs/spec-os-ordem-servico.md`.

### D-026 ✅ Estado do equipamento por `falha_id`; documentos do equipamento via biblioteca (Lote 6)
**2026-06-30.** Duas decisões para o Lote 6 ([BACKLOG §J](BACKLOG.md)):
- **#EQP-STATUS:** o equipamento tem `status` textual (padrão **"Operando"**; também
  **Desabilitado**/**Desativado**) e, quando **em falha**, um **`falha_id`** (FK → `Falha`,
  `ondelete=SET NULL`) apontando a **falha atual** do dispositivo. A UI exibe o nome da falha
  como estado e colore o marcador do mapa. Distinto do `Visita.falha_id` (falha de uma O.S.):
  aqui é a condição *corrente* do equipamento.
- **#EQP-PAGINA (documentos):** **não** haverá upload de documento por equipamento. Manuais e
  datasheets são cadastrados na **biblioteca → Marcas** (#DOC-MARCAS) e a **página do
  equipamento** apenas **linka** para o documento da biblioteca. Falta definir na implementação
  o critério de associação (por `model`/marca automático vs. seleção manual de um `documento_id`).

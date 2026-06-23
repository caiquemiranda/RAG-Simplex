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

### D-015 🔄 Limiar de similaridade — calibração pendente
**2026-06-23.** Com o e5 (D-014), positivos top-1 ficam 0.848–0.915, mas os scores
são comprimidos e blocos fracos passam de 0.78. Falta rodar `--diagnostico` com a
bateria de negativos (outra marca/fora de domínio) para cravar o valor. Mantido 0.78
até ter os dados. **Não conclama mudar antes de medir os negativos.**

### D-013 ✅ Separação de camadas no extrativo por marcadores do guia
**2026-06-23.** Como o `local_extrativa` não usa LLM, a "dupla camada" é obtida
parseando os marcadores consistentes do guia: `**Explicação simples.**` → camada 🟢;
`**Causas possíveis:**` + `**Passos de solução…**` → camada 🔧. Sem o marcador, o 1º
parágrafo vira a camada simples. Garante ancoragem perfeita (zero alucinação).

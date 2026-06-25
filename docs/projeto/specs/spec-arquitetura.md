# Spec — Arquitetura (consolidado até a Fase 9)

**Status:** ✅ Vigente · **Data:** 2026-06-24

Spec de arquitetura: contratos e responsabilidades estáveis do sistema. O mapa
narrativo completo (com tabelas de endpoints e estrutura do frontend) está em
[`../../ARQUITETURA.md`](../../ARQUITETURA.md); os testes em
[`../../TESTES.md`](../../TESTES.md).

## 1. Camadas

```
Ingestão → Recuperação → Estratégia/Geração → API → Frontend
```

- **Ingestão** (`app/ingestao.py`): Markdown → blocos por header `###` (unidade de
  falha autocontida, com caminho do cabeçalho) → metadados obrigatórios
  (`sistema, severidade, idioma_erro, termo_en, header, fonte`) → embeddings e5 →
  ChromaDB.
- **Recuperação** (`app/recuperacao.py`): cosseno + **bônus léxico** (D-015);
  **limiar 0.78**; filtro por metadados. Abaixo do limiar ⇒ fallback.
- **Estratégia** (`app/estrategias.py`): `EstrategiaGeracao` (interface) +
  `LocalExtrativa` (padrão, sem LLM). Contrato de saída: `Resposta` com
  `camadas{titulo, simples, tecnica}`, `fontes[]`, `fallback`, `estrategia`,
  `latencia_ms`, `custo_estimado`.
- **Geração** (`app/geracao.py`): orquestra a estratégia selecionada;
  `ClaudeNuvem` inerte até a Fase 10. Fallback gracioso nas bordas.
- **API** (`app/main.py` + `app/admin.py`): FastAPI, JWT, CORS.

## 2. Invariantes (não violar)

- **Ancoragem total:** responder só com os blocos recuperados; zero alucinação;
  nunca misturar outras marcas.
- **Limiar 0.78** fixo; nunca baixar para “forçar” resposta.
- **Dupla camada** (🟢 simples + 🔧 técnica) na ordem; **gatilho de segurança** no
  topo em risco elétrico / bypass de supressão / fonte primária.
- **Termos do display em inglês** preservados (`HEAD MISSING`); corpo em PT-BR.
- **Latência < 3s** (extended thinking desligado).

## 3. Modelo de dados (ORM — `app/modelos.py`)

`Usuario` (n–1 `Papel`; n–n `Permissao` extra) · `Papel` (n–n `Permissao`) ·
`ConfigEstrategia` (escopo: global | papel | usuario) · `LogConsulta`
(auditoria, inclui `feedback`) · `ProvedorChave` (chave **cifrada**).

## 4. RBAC

Permissões: `consultar`, `consultar_stream`, `ingerir`, `ver_avaliacao`,
`gerir_estrategias`, `gerir_usuarios`, `gerir_chaves`.

| Papel | Permissões |
| --- | --- |
| Operador | `consultar` |
| Tecnico | `consultar`, `consultar_stream` |
| Analista | + `ingerir`, `ver_avaliacao` |
| Admin | todas |

- Permissão efetiva = papel ∪ extras do usuário (`requer(permissao)` nas bordas).
- **Camadas por papel:** operador só 🟢 simples; técnico/analista também 🔧 técnica.

## 5. Precedência de configuração

`ConfigEstrategia` (usuário) > (papel) > (global) > `settings` (config.py/.env).

## 6. Segurança

bcrypt (senhas) · JWT access/refresh · chaves de provedor **nunca em claro**
(`app/cripto.py`, cifragem + mascaramento).

## 7. Frontend

SPA React acima das rotas: `AuthProvider` (sessão) → `ChatProvider` (histórico de
consultas + execução das buscas). Detalhe em
[`spec-fase-8-frontend-chat.md`](spec-fase-8-frontend-chat.md) e
[`spec-fase-9-painel-adm-frontend.md`](spec-fase-9-painel-adm-frontend.md).

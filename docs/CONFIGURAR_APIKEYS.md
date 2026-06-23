# Como configurar as API keys dos LLMs

> **Quando usar este guia:** só ao chegar na **Fase 10** (estratégias de nuvem).
> Até lá, o RAG-Simplex roda 100% **local e grátis** com a estratégia
> `local_extrativa` — **não precisa de nenhuma chave**.

O sistema foi desenhado para funcionar sem LLM. As chaves abaixo só são
necessárias quando você quiser ativar uma estratégia de **nuvem**
(`claude_nuvem` e, na Fase 10, `gemini_nuvem` / `groq_nuvem`).

---

## 1. Onde as chaves ficam

### Em desenvolvimento (agora): arquivo `.env`

1. Copie o exemplo: `cp .env.example .env` (Windows: `copy .env.example .env`).
2. Preencha a chave do provedor desejado. O `.env` **nunca** é versionado
   (já está no `.gitignore`).

```dotenv
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# (Fase 10) provedores grátis — nomes propostos, com prefixo RAG_
# RAG_GEMINI_API_KEY=...
# RAG_GROQ_API_KEY=...

# Qual estratégia usar (padrão: local_extrativa, sem chave)
# RAG_ESTRATEGIA_GERACAO=claude_nuvem
```

### Em produção (Fase 10 em diante): painel ADM, **cifradas**

No produto final, as chaves **não** ficam em `.env`. O administrador as cadastra
pelo painel ADM e elas são **cifradas em repouso** no banco (decisão **D-011**).
Regras invioláveis:

- A chave **nunca** vai para o frontend nem para o token (JWT) do técnico.
- O servidor é quem resolve a estratégia e chama o provedor.
- A API nunca retorna a chave em texto claro (só máscara, ex.: `sk-ant-…X4f2`).

---

## 2. Como obter cada chave

| Provedor | Modelo sugerido | Custo | Onde obter |
| --- | --- | --- | --- |
| **Anthropic (Claude)** | `claude-opus-4-8` | Pago (créditos iniciais no cadastro) | <https://console.anthropic.com/> → *API Keys* |
| **Google (Gemini)** | `gemini-2.0-flash` | **Tier gratuito** | <https://aistudio.google.com/app/apikey> |
| **Groq** | `llama-3.x` | **Tier gratuito** | <https://console.groq.com/keys> |

> Recomendação para custo zero (D-006): **Gemini Flash** como provedor de nuvem
> padrão; Claude fica como opção paga premium.

---

## 3. Como selecionar a estratégia

A estratégia ativa vem de `app/config.py` → `settings.estrategia_geracao`,
sobrescrevível pelo `.env`:

```dotenv
RAG_ESTRATEGIA_GERACAO=local_extrativa   # padrão (sem chave, grátis)
# RAG_ESTRATEGIA_GERACAO=claude_nuvem    # requer ANTHROPIC_API_KEY
```

A partir da Fase 6/10, o admin também define a estratégia **por usuário** no
painel ADM, e a resolução segue a hierarquia (requisição → usuário → papel →
global).

### Verificar se está configurado

```bash
curl http://127.0.0.1:8000/health
# "api_key_configurada": true/false
```

Se selecionar uma estratégia de nuvem **sem** a chave, o sistema retorna um erro
acionável apontando para este guia (não cai em silêncio).

---

## 4. Segurança (checklist)

- [ ] `.env` está no `.gitignore` (está) e **nunca** foi commitado.
- [ ] Chaves de produção ficam **cifradas** no banco, não em arquivo.
- [ ] Rotação de chaves possível pelo painel ADM sem redeploy.
- [ ] Tráfego sob TLS (PRD §6.2).
- [ ] Auditoria registra **qual estratégia/provedor** respondeu cada consulta — nunca a chave.

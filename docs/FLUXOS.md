# Fluxos — RAG-Simplex

Diagramas de sequência dos fluxos principais, para **reproduzir o comportamento**
em qualquer stack. Complementa [`ARQUITETURA.md`](ARQUITETURA.md) e
[`MODELO_DADOS.md`](MODELO_DADOS.md).

## 1. Autenticação (JWT)

```mermaid
sequenceDiagram
  participant U as Frontend
  participant API as FastAPI
  participant DB as Banco
  U->>API: POST /auth/login {email, senha}
  API->>DB: busca usuário por email
  API->>API: verifica senha (bcrypt)
  API-->>U: {access_token, refresh_token}
  Note over U: guarda token (localStorage)
  U->>API: GET /auth/me (Authorization: Bearer)
  API->>API: decodifica/valida JWT
  API-->>U: usuário + permissões efetivas
  U->>API: (access expira) POST /auth/refresh
  API-->>U: novo access_token
```

## 2. Consulta `/query` (RAG completo)

```mermaid
sequenceDiagram
  participant U as Frontend
  participant API as FastAPI
  participant R as recuperacao.py
  participant V as ChromaDB
  participant E as estrategias.py
  participant DB as Banco
  U->>API: POST /query {pergunta} (Bearer)
  API->>API: requer("consultar") — RBAC
  API->>API: resolve estratégia + camadas (usuário>papel>global>settings)
  API->>R: buscar(pergunta, top_k, sistema)
  R->>V: similaridade (cosseno) + bônus léxico
  V-->>R: blocos candidatos
  R->>R: aplica limiar 0.78
  alt nenhum acima do limiar
    R-->>API: vazio → fallback
  else relevantes
    R-->>API: blocos recuperados
  end
  API->>E: gerar_resposta(pergunta, recuperacao, estratégia)
  E->>E: monta dupla camada (🟢 simples / 🔧 técnica) + gatilho de segurança
  E-->>API: Resposta {camadas, fontes, fallback, latencia, custo}
  API->>API: filtra camadas por papel (montar_texto)
  API->>DB: grava LogConsulta (auditoria) → log_id
  API-->>U: {resposta, fontes, camadas_exibidas, fallback, log_id}
```

## 3. Streaming `/query/stream` (NDJSON)

```mermaid
sequenceDiagram
  participant U as Frontend
  participant API as FastAPI
  U->>API: POST /query/stream {pergunta} (requer consultar_stream)
  API->>API: mesma resolução + recuperação + geração + log (item 2)
  API-->>U: linha 1 — {tipo:"meta", log_id, fallback, camadas, fontes}
  loop pedaços do texto
    API-->>U: {tipo:"delta", texto:"..."}
  end
  Note over U: ReadableStream lê linha a linha; renderiza markdown incremental
```
> Operador (sem `consultar_stream`) → o frontend usa `/query` (não-stream).

## 4. Feedback 👍/👎

```mermaid
sequenceDiagram
  participant U as Frontend
  participant API as FastAPI
  participant DB as Banco
  U->>API: POST /feedback {log_id, voto:1|-1} (requer consultar)
  API->>DB: busca LogConsulta(log_id)
  API->>API: valida dono (log.usuario_id == usuário) e voto ∈ {1,-1}
  API->>DB: grava feedback
  API-->>U: {ok:true}
```

## 5. Ingestão (indexação da base)

```mermaid
sequenceDiagram
  participant Admin as Analista/Admin
  participant API as FastAPI
  participant I as ingestao.py
  participant V as ChromaDB
  Admin->>API: POST /ingest (requer ingerir)
  API->>I: parse do guia Markdown
  I->>I: chunk por header ### (unidade de falha autocontida)
  I->>I: metadados {sistema, severidade, idioma_erro, termo_en, header, fonte}
  I->>I: embeddings (e5: prefixo passage:)
  I->>V: upsert dos vetores (distância cosseno)
  API-->>Admin: status (nº de blocos)
```

## 6. Resolução de estratégia e camadas (precedência)

```mermaid
flowchart TD
  A[Consulta do usuário] --> B{Config do usuário?}
  B -- sim --> U[usa config do usuário]
  B -- não --> C{Config do papel?}
  C -- sim --> P[usa config do papel]
  C -- não --> D{Config global?}
  D -- sim --> G[usa config global]
  D -- não --> S[usa settings padrão local_extrativa]
  U & P & G & S --> K["camadas filtradas por papel:<br/>operador = 🟢 · técnico/analista = 🟢+🔧"]
```

## Invariantes refletidas nos fluxos
- **RBAC** checado na borda (`requer(permissao)`) antes de qualquer lógica.
- **Limiar 0.78**: abaixo → fallback (nunca improvisar procedimento).
- **Ancoragem total**: resposta só com blocos recuperados.
- **Auditoria** sempre grava o `LogConsulta` (com `log_id` devolvido para o feedback).
- **Latência < 3s**: sem extended thinking na geração.

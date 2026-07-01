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
  API->>API: normalizar_email(email) = strip().lower()  (#FIX-EMAIL)
  API->>DB: busca usuário por email normalizado
  API->>API: verifica senha (argon2)
  API-->>U: {access_token (1 dia, #FIX-TOKEN), refresh_token (7 dias)}
  Note over U: guarda token (localStorage)
  U->>API: GET /auth/me (Authorization: Bearer)
  API->>API: decodifica/valida JWT
  API-->>U: usuário + permissões efetivas
  U->>API: (access expira) POST /auth/refresh
  API-->>U: novo access_token
```

> **#FIX-EMAIL:** o e-mail é normalizado (`strip().lower()`) no **login** e na **criação**
> (API + CLI admin); existentes normalizados pela migração Alembic `5c77258e6fc6`. Login é
> **case-insensitive**. **#FIX-TOKEN:** access token dura **1 dia** (`access_token_expira_min=1440`).

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

## 7. Cronograma — listar visitas (#ALOC virtuais + #FER-1)

`GET /cronograma?de&ate&tecnico_ids&cliente_ids&unidade_id` monta a visão do mês combinando
**visitas reais** e **alocações fixas virtuais** (#ALOC), suprimindo **feriados** (#FER-1).
Filtros multi: **Equipe** (`tecnico_ids`) e **Clientes** (`cliente_ids`).

```mermaid
flowchart TD
  A[GET /cronograma de..ate] --> B[seleciona visitas reais no intervalo]
  B --> C{papel}
  C -- técnico --> C1[só visitas onde está atribuído]
  C -- admin --> C2[todas; filtra por tecnico_ids/cliente_ids/unidade_id]
  C1 & C2 --> D[carrega datas de FERIADO no intervalo]
  D --> E[remove visitas reais em datas de feriado #FER-1]
  E --> F[para cada técnico com cliente_padrao #ALOC<br/>respeita filtros Equipe/Clientes/unidade]
  F --> G{dia é feriado OU fim de semana?}
  G -- sim --> F
  G -- não --> H{já tem visita real nesse dia?}
  H -- sim --> F
  H -- não --> I[gera visita virtual fixo=true id=0]
  I --> F
  E & I --> J[resposta = reais + virtuais]
```

## 8. Ordem de Serviço — criar / editar (#OS, D-025)

A **O.S. é a própria visita** (D-025). `POST /cronograma` cria; `PATCH /cronograma/{id}` edita.
Campos além do básico (`data`, `titulo`, `status`): **`tipo`** (manutenção
`preventiva|corretiva|avulsa`), **`equipamento_id`**, **`falha_id`** (catálogo) e os **12 campos
do documento de corretiva** (`especialidade`, `requisitante`, `data_solicitacao`, `centro_custo`,
`numero_os`, `reserva_material`, `material_utilizado`, `endereco`, `setor`, `prioridade`,
`data_execucao`, `acao_aplicada`). Regras aplicadas por `_aplicar_os`.

```mermaid
sequenceDiagram
  participant Admin as Admin (gerir_usuarios)
  participant API as FastAPI (cronograma.py)
  participant DB as Banco
  Admin->>API: POST /cronograma {data, titulo, tipo, cliente_id,<br/>usuario_ids[], equipamento_id?, falha_id?, campos-doc?}
  API->>DB: dia é feriado? → 400 se sim (#FER-1)
  Note over API: usuario_ids vazio →<br/>técnicos = fixos do cliente (cliente_padrao_id, #ALOC)
  API->>API: sem técnicos e sem cliente → 400
  API->>API: _aplicar_os: tipo ∉ {preventiva,corretiva,avulsa} → 400
  API->>DB: equipamento_id informado inexistente → 404
  API->>DB: grava Visita + vínculo N:N de técnicos
  API->>API: status=concluida E equipamento? → equipamento.ultima_manutencao = data (#MAP-4)
  API->>DB: cria Notificacao "Nova O.S.: {titulo}" p/ cada técnico (ref_id = visita, #NOTIF-LINK)
  API-->>Admin: 201 VisitaResumo {tipo, equipamento_tag, falha_nome, campos-doc}
  Admin->>API: PATCH /cronograma/{id} {tipo?, equipamento_id?, falha_id?, campos-doc?, status?}
  Note over API: admin edita tudo (_aplicar_os); técnico só status+observacoes.<br/>Só os campos em model_fields_set são tocados (Pydantic v2)
  API->>API: concluir aqui também grava ultima_manutencao
  API-->>Admin: 200 VisitaResumo atualizado
```

**Histórico do equipamento** (#MAP-4): `GET /cronograma/equipamento/{id}` devolve as O.S. daquele
equipamento (ordenadas por data desc). RBAC: admin vê tudo; técnico só se o **cliente do
equipamento** estiver entre os seus (`clientes_rel`) — senão **403** (404 se o equipamento não existe).

## 9. Cronograma — marcar feriado (#FER-1)

```mermaid
sequenceDiagram
  participant Admin as Admin
  participant API as FastAPI
  participant DB as Banco
  Admin->>API: POST /cronograma/feriados {data, descrição} (gerir_usuarios)
  API->>DB: existe feriado nessa data? (409 se sim)
  API->>DB: insere Feriado
  API->>DB: busca visitas naquele dia → técnicos (dedup)
  API->>DB: cria Notificacao "atividades suspensas" p/ cada técnico
  API-->>Admin: feriado criado
  Note over API: agendar visita em dia de feriado → 400 (criar bloqueia)
```

## 10. Atividade / O.S. — comentar e anexar imagem (#ATV-1)

```mermaid
sequenceDiagram
  participant U as Técnico/Admin
  participant API as FastAPI
  participant FS as arquivos.py (#FILES)
  participant DB as Banco
  U->>API: GET /cronograma/{id} (detalhe)
  API->>API: _pode_gerir_visita = admin OU atribuído? (senão 403)
  API-->>U: VisitaDetalhe {..., comentarios[], anexos[]}
  U->>API: POST /cronograma/{id}/comentarios {texto}
  API->>DB: insere ComentarioVisita (autor = usuário)
  API-->>U: detalhe atualizado
  U->>API: POST /cronograma/{id}/anexos (multipart imagem)
  API->>API: valida content_type image/*
  API->>FS: salvar_upload(arquivo, "atividades") → /arquivos/atividades/...
  API->>DB: insere AnexoVisita {url, nome, autor}
  API-->>U: detalhe atualizado (galeria)
  U->>API: DELETE /cronograma/{id}/anexos/{anexoId}
  API->>FS: remover_arquivo(url)
  API->>DB: remove AnexoVisita
  API-->>U: detalhe atualizado
```

## Invariantes refletidas nos fluxos
- **RBAC** checado na borda (`requer(permissao)`) antes de qualquer lógica.
- **Limiar 0.78**: abaixo → fallback (nunca improvisar procedimento).
- **Ancoragem total**: resposta só com blocos recuperados.
- **Auditoria** sempre grava o `LogConsulta` (com `log_id` devolvido para o feedback).
- **Latência < 3s**: sem extended thinking na geração.

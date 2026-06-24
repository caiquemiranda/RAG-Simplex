# Testes — RAG-Simplex

**78 testes** automatizados (pytest). Cobrem parsing, recuperação, estratégias,
geração, persistência (+ micro-migração), autenticação, RBAC, painel ADM (usuários,
perfil, documentos, **clientes**), **cronograma** (visitas, **feriados**,
**notificações**), **arquivos/biblioteca**, streaming e feedback.

## Princípios

- **Sem rede e sem download de modelo** no caminho padrão (regra de
  [`.claude/rules/codificacao.md`](../.claude/rules/codificacao.md)): o que dependeria
  de embeddings/Chroma reais é mockado ou usa SQLite em memória.
- Banco de testes: **SQLite em memória** (`sqlite://` + `StaticPool`), semeado com
  papéis/permissões padrão.
- RAG mockado: `buscar`/`gerar_resposta` são substituídos (`monkeypatch`) por
  retornos determinísticos onde o teste é de API/fluxo, não de recuperação real.

## Como rodar

```bash
pip install -r requirements.txt      # ou usar o .venv do scripts/backend.ps1
pytest                               # todos
pytest tests/test_consulta.py -v     # um arquivo
```

No Windows, com o `.venv` criado pelos scripts:
```powershell
.\.venv\Scripts\Activate.ps1
pytest
```

## Cobertura por arquivo

### `test_ingestao.py` (5) — parsing e metadados
- `test_classificar_sistema` — mapeia o bloco para 4100/F3200/QE90/IMS.
- `test_classificar_severidade` — deriva a severidade do bloco.
- `test_extrair_termo_en` — captura o termo de display em inglês (ex.: `HEAD MISSING`).
- `test_parse_markdown_extrai_blocos` — chunking por header `###` com caminho do cabeçalho.
- `test_bloco_head_missing_presente` — bloco-chave do guia é indexado.

### `test_recuperacao.py` (6) — busca híbrida e limiar
- `test_filtro_metadados` — filtra por `sistema`.
- `test_relevantes_aplica_limiar` — descarta resultados abaixo de 0.78.
- `test_tokens_remove_stopwords_e_acentos` — normalização do score léxico.
- `test_score_lexical_premia_termo_do_display` — bônus para `HEAD MISSING` & cia.
- `test_boost_lexical_reordena_blocos_parecidos` — D-015 corrige o ranking.
- `test_acima_do_limiar_falso_quando_todos_abaixo` — dispara fallback corretamente.

### `test_estrategias.py` (7) — resposta extrativa
- `test_extrativo_renderiza_dupla_camada` — "🟢 simples" + "🔧 técnica" na ordem.
- `test_aviso_seguranca_por_severidade` — gatilho de segurança no topo.
- `test_aviso_seguranca_por_palavra_chave` — idem por termo de risco elétrico/supressão.
- `test_fallback_quando_abaixo_do_limiar` — `FALLBACK_MSG` sem improvisar.
- `test_blocos_relacionados_listados` — referências relacionadas.
- `test_obter_estrategia_padrao_e_invalida` — registro/seleção de estratégia.
- `test_formatar_fontes_inclui_trecho_integral` — fontes com trecho para citação.

### `test_geracao.py` (3) — orquestração
- `test_fallback_sem_chamar_llm` — fallback não aciona provedor.
- `test_formatar_contexto_inclui_metadados` — contexto com metadados.
- `test_montar_mensagem_inclui_persona_e_pergunta` — montagem da mensagem.

### `test_persistencia.py` (7) — ORM, precedência e cripto
- `test_semear_padroes` / `_idempotente` — seed cria e não duplica.
- `test_resolucao_precedencia` — usuário > papel > global > settings.
- `test_resolucao_sem_config_usa_settings` — fallback de configuração.
- `test_cifrar_decifrar_roundtrip` / `test_mascarar` / `test_cifrar_sem_chave_erro_claro` — chaves nunca em claro.

### `test_auth.py` (8) — autenticação
- Hash/verificação de senha; round-trip de access token; rejeição de token
  expirado/malformado; login ok + `/me`; senha errada (401); rotas protegidas sem
  token (401); refresh emite novo access.

### `test_rbac.py` (6) — controle de acesso e camadas
- `test_permissao_efetiva_papel_e_extra` — papel + permissões extra.
- `test_resolver_camadas_por_papel` / `test_camadas_filtradas_por_papel` — operador só "simples".
- `test_montar_texto_filtra_camadas` — filtragem do texto por papel.
- `test_operador_bloqueado_em_ingest` / `test_analista_pode_ingerir` — gating de `/ingest`.

### `test_admin.py` (11) — painel ADM
- `test_nao_admin_barrado` — sem `gerir_usuarios` → 403.
- `test_admin_lista_e_cria_usuario` — CRUD de usuário.
- `test_admin_troca_estrategia_vale_na_consulta` — estratégia aplicada na consulta.
- `test_estrategia_por_usuario_get_e_put` — GET nulo → PUT → GET com valor.
- `test_perfil_e_documentos_do_usuario` — perfil + documentos (add/list/remove).
- `test_clientes_crud_e_associacao` — clientes CRUD + associação por `cliente_ids`.
- `test_me_documentos` — `/me/documentos` devolve os documentos do próprio usuário.
- `test_lista_marca_documento_vencendo` — `docs_alerta` no resumo da lista.
- `test_auditoria_registra_consulta` — consulta aparece na auditoria.
- `test_catalogos_papeis_e_permissoes` — catálogos para os seletores.
- `test_provedor_chave_nunca_em_claro` — chave cifrada/mascarada.

### `test_documentos.py` (5) — guias (split-screen)
- Exige autenticação; lista indexados; obtém conteúdo; rejeita nome inválido;
  documento não indexado → 404.

### `test_arquivos.py` (3) — infra de arquivos (#FILES)
- `test_upload_salva_e_devolve_url` — upload salva no disco e devolve `/arquivos/…`.
- `test_upload_exige_admin` — sem `gerir_usuarios` → 403.
- `test_remover_arquivo` — remoção segura (não apaga fora da pasta).

### `test_biblioteca.py` (3) — documentos de equipamentos (#DOC1)
- `test_upload_listar_renomear_ocultar_excluir` — fluxo completo; admin vê oculto, operador não.
- `test_empresa_default_marca_ibsystems` — categoria empresa → marca IBSystems.
- `test_categoria_invalida_e_op_nao_sobe` — 400 (categoria) e 403 (operador).

### `test_cronograma.py` (9) — cronograma, clientes visíveis, feriados, notificações
- `test_clientes_visiveis_por_papel` — `/clientes`: admin vê todos; técnico só os seus.
- `test_tecnico_fecha_propria_visita` — técnico fecha a própria (status/observações); 403/400 nos limites.
- `test_admin_cria_e_filtra_por_intervalo` — cria visita; filtra por intervalo de datas.
- `test_tecnico_ve_apenas_as_proprias` — técnico só enxerga as próprias visitas.
- `test_tecnico_nao_cria` — sem `gerir_usuarios` → 403 ao criar.
- `test_remover_visita` — remove (204) e inexistente → 404.
- `test_feriado_crud` — cria (409 se duplicado), lista por intervalo, remove.
- `test_notificacao_ao_criar_atividade` — criar visita gera notificação só para o
  técnico; marcar como lida.

### `test_consulta.py` (5) — streaming e feedback (Fase 8)
- `test_query_retorna_log_id` — `/query` devolve `log_id`.
- `test_feedback_registra_voto` — `/feedback` ok + 400 (voto inválido) + 404.
- `test_feedback_so_no_proprio_log` — feedback só no próprio log (404 alheio).
- `test_stream_ndjson_meta_e_deltas` — `/query/stream` emite meta + deltas.
- `test_stream_negado_sem_permissao` — sem `consultar_stream` → 403.

## Frontend

O frontend é validado por **`tsc --noEmit`** (typecheck estrito). Não há testes de
runtime de UI no ambiente atual (npm restrito por SSL). A verificação visual é feita
no navegador via `scripts/frontend.ps1`.

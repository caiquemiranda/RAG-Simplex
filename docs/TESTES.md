# Testes — RAG-Simplex

**104 testes** automatizados (pytest). Cobrem parsing, recuperação, estratégias,
geração, persistência (+ micro-migração + **migrações Alembic**), autenticação
(+ **e-mail case-insensitive**), RBAC, painel ADM (usuários, perfil, documentos,
**clientes**, **unidades**, **banco de dados**), **cronograma** (visitas, **feriados**,
**notificações**, **visão por unidade**), **arquivos/biblioteca**, streaming e feedback.

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

### O.S. unificada (#OS, D-025) — em `test_cronograma.py`
- `test_os_unificada_falha_equipamento_manutencao` — catálogo de falha (`/admin/falhas`, 409 se
  duplicado); criar **O.S.** corretiva concluída com `tipo`/equipamento/falha/campos-doc →
  resumo expõe `tipo`/`equipamento_tag`/`falha_nome` e grava `ultima_manutencao`; histórico por
  equipamento (`GET /cronograma/equipamento/{id}`); tipo inválido no POST → 400; sem técnicos → fixos.
- `test_os_editar_deletar_falha_e_rbac` — **editar O.S.** via PATCH (muda `tipo`, vincula
  equipamento/falha, preenche campo-doc; concluir grava `ultima_manutencao`; tipo inválido → 400);
  **DELETE** de falha some do catálogo; **RBAC**: técnico não cria/remove falha (403) e só vê o
  histórico do equipamento se atende o cliente (403 caso contrário).
- `test_ordens.py` **removido** (entidade `OrdemServico` extinta pela unificação).

### `test_plantas.py` (2) — mapa de dispositivos (#MAP)
- `test_upload_pdf_gera_plantas_e_remove` — PDF 2 páginas → 2 plantas (PNG, dimensões);
  lista admin/visível; remove; não-PDF → 400; não-admin → 403.
- `test_equipamento_tag_posicao_e_busca` — CSV com tag/status/data; PATCH posiciona na
  planta (`planta_id`/`pos_x`/`pos_y`); busca visível por `tag`.

### `test_migracoes.py` (2) — migrações Alembic (D-022)
- `test_migracao_tem_unica_head` — grafo de migrações sem branches (uma só head).
- `test_upgrade_cria_schema_igual_aos_modelos` — `upgrade head` num banco vazio gera
  exatamente as tabelas dos modelos (baseline sem drift). *Skip se Alembic ausente.*

### `test_banco.py` (4) — card ADM "Banco de dados" (D-022)
- `test_status_banco` — `/admin/banco`: contagem por tabela (sem `alembic_version`) + migração.
- `test_backup_indisponivel_sem_arquivo` — backend em memória → 400 (mensagem clara).
- `test_backup_copia_arquivo` — backup copia o SQLite para `backups/` (201).
- `test_banco_exige_admin` — operador → 403 no status e no backup.

### `test_auth.py` (8) — autenticação
- Hash/verificação de senha; round-trip de access token; rejeição de token
  expirado/malformado; login ok + `/me`; senha errada (401); rotas protegidas sem
  token (401); refresh emite novo access.

### `test_rbac.py` (6) — controle de acesso e camadas
- `test_permissao_efetiva_papel_e_extra` — papel + permissões extra.
- `test_resolver_camadas_por_papel` / `test_camadas_filtradas_por_papel` — operador só "simples".
- `test_montar_texto_filtra_camadas` — filtragem do texto por papel.
- `test_operador_bloqueado_em_ingest` / `test_analista_pode_ingerir` — gating de `/ingest`.

### `test_admin.py` (17) — painel ADM
- `test_nao_admin_barrado` — sem `gerir_usuarios` → 403.
- `test_admin_lista_e_cria_usuario` — CRUD de usuário.
- `test_email_case_insensitive` — e-mail normalizado (minúsculo) no cadastro/login; duplicado por caixa → 409.
- `test_equipamentos_import_csv` — #EQP-1: importa CSV (vírgula/ponto-e-vírgula), `substituir`, remove, RBAC.
- `test_cliente_detalhe_e_campos` — #CLI-PG: endereço/contatos no cadastro + `GET /admin/clientes/{id}` com equipamentos.
- `test_equipamento_criar_avulso_e_tag_composta` — cria equipamento manual; tag vazia compõe de painel+loop+add+type; **status padrão "Operando"** (#EQP-STATUS).
- `test_equipamento_status_e_falha` — #EQP-STATUS/D-026: pôr "em falha" grava `falha_id` (resumo admin+público mostra `falha_nome`); falha inexistente → 404; limpar volta a Operando.
- `test_equipamento_listas` — #EQP-LISTAS: cria lista nomeada (ids de outro cliente ignorados), edita nome+conjunto, RBAC (técnico 403), remove.
- `test_equipamentos_visiveis_por_papel` — #EQP-2: `GET /clientes/{id}/equipamentos` admin vê; técnico só dos seus (403).
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

### `test_biblioteca.py` (4) — documentos (empresa/marca/cliente + busca)
- `test_upload_listar_renomear_ocultar_excluir` — fluxo completo; admin vê oculto, operador não.
- `test_empresa_default_marca_ibsystems` — categoria empresa → marca IBSystems.
- `test_documento_cliente_e_busca` — categoria `cliente` (exige `cliente_id`) + busca por nome.
- `test_categoria_invalida_e_op_nao_sobe` — 400 (categoria) e 403 (operador).

### `test_cronograma.py` (16) — cronograma (multi-técnico, cliente fixo, unidade, atividade, feriados, notificações)
- `test_clientes_visiveis_por_papel` — `/clientes`: admin vê todos; técnico só os seus.
- `test_unidade_crud_e_visao_por_unidade` — CRUD de unidade (409 duplicado); vincula cliente;
  `/cronograma?unidade_id=` filtra pela unidade do cliente; `/unidades`; DELETE em uso → 409.
- `test_multiplos_tecnicos_por_atividade` — vários técnicos numa visita; todos veem/são notificados; qualquer um fecha.
- `test_cliente_fixo_alocacao` — cliente fixo aparece (`fixo`); visita real sobrescreve.
- `test_filtros_equipe_clientes_e_aloc_dias_uteis` — filtros multi **Equipe**/**Clientes**
  (`tecnico_ids`/`cliente_ids`) e alocação fixa (#ALOC) **só de segunda a sexta**.
- `test_tecnico_fecha_propria_visita` — técnico fecha a própria (status/observações); 403/400 nos limites.
- `test_admin_cria_e_filtra_por_intervalo` — cria visita; filtra por intervalo de datas.
- `test_tecnico_ve_apenas_as_proprias` — técnico só enxerga as próprias visitas.
- `test_tecnico_nao_cria` — sem `gerir_usuarios` → 403 ao criar.
- `test_remover_visita` — remove (204) e inexistente → 404.
- `test_feriado_crud` — cria (409 se duplicado), lista por intervalo, remove.
- `test_feriado_suprime_atividades_e_notifica` — #FER-1: feriado some com atividades/fixos
  no dia, notifica os técnicos do dia, e bloqueia (400) agendar em feriado.
- `test_atividade_detalhe_e_comentario` — #ATV-1: detalhe/comentário só p/ atribuído ou admin
  (não-atribuído → 403; vazio → 400).
- `test_atividade_anexo_imagem` — #ATV-1: anexa imagem (não-imagem → 400) e remove o anexo.
- `test_lista_atividades` — `/cronograma/atividades`: admin vê todas; técnico só as suas.
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

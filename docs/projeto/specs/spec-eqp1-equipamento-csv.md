# Spec — #EQP-1: entidade `Equipamento` + import CSV por cliente

**Status:** ✅ Backend implementado (94 testes; UI no #CLI-PG) · **Data:** 2026-06-25 · **Branch:** `feat/lote5-fixes`
**Backlog:** [§G](../BACKLOG.md) · item 6 (núcleo). Fundação de **#CLI-PG** e **#EQP-2**.

Cada **cliente** tem uma lista de **equipamentos** (dispositivos do painel de incêndio),
populada por **import de CSV**. Colunas iniciais: **painel, loop, add, type, model**
(`add` = endereço do dispositivo no loop). **Fases seguintes (adiadas):** (b) colunas
**última manutenção** e **último teste**; (c) **histórico do painel** do cliente.

## Modelo (`app/modelos.py`)
```
EQUIPAMENTO { int id PK; int cliente_id FK→cliente (cascade);
              string painel; string loop; string add; string type; string model;
              datetime criado_em }
```
- `Cliente` ganha `equipamentos` (`cascade="all, delete-orphan"`).
- Migração **Alembic** dedicada (cria `equipamento`). Atualiza `MODELO_DADOS.md`.

## API (`app/admin.py`, prefixo `/admin`)
- `GET /admin/clientes/{id}/equipamentos` — lista os equipamentos do cliente.
- `POST /admin/clientes/{id}/equipamentos/importar` (multipart `arquivo` CSV,
  query `substituir: bool=false`) — **importa** o CSV. Cabeçalho com as colunas
  (case-insensitive); delimitador `,` ou `;` (auto). `substituir=true` apaga os
  existentes antes. Devolve `{importados, total}`.
- `DELETE /admin/equipamentos/{eqp_id}` — remove um equipamento.
- Perm.: **`gerir_usuarios`** (admin gerencia o cadastro do cliente).
- *(A leitura por técnicos — "lista de equipamentos" por cliente — entra no #EQP-2.)*

## Parsing do CSV
- `csv.Sniffer` p/ delimitador (fallback `,`); `DictReader`; chaves normalizadas
  (`strip().lower()`). Mapeia `painel, loop, add, type, model` (faltantes viram `""`).
- Ignora linhas totalmente vazias. Limite defensivo de tamanho via #FILES não se aplica
  (lido em memória); validar `content_type`/extensão `.csv`/`text/*`.

## Testes (`tests/test_admin.py`)
- Importa um CSV (vírgula e ponto-e-vírgula) → equipamentos criados e listados.
- `substituir=true` troca a lista; `DELETE` remove um item; não-admin → 403.

## Documentação (DoD)
`MODELO_DADOS.md` (ER + entidade), `ARQUITETURA.md` (endpoints), `TESTES.md`,
`BACKLOG/LOG/ESTADO_ATUAL`, este spec (→ ✅ ao concluir). UI fica em **#CLI-PG**.

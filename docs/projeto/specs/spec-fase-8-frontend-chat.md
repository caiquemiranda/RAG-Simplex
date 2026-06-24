# Spec — Fase 8: Frontend do chat (streaming, feedback, histórico, layout ChatGPT)

**Status:** ✅ Implementado · **Data:** 2026-06-24

Como ficou a experiência do técnico no frontend. Backend correspondente: streaming
NDJSON + feedback (ver [`../LOG.md`](../LOG.md)). Visão geral: [`../../ARQUITETURA.md`](../../ARQUITETURA.md).

## Objetivo

Chat de diagnóstico estilo ChatGPT/Claude: resposta em dupla camada, citações
navegáveis, streaming, feedback e histórico persistente — com layout responsivo.

## 1. Estado e busca — `chat/ChatContext.tsx`

- Guarda **várias consultas** (`Conversa[]`: `id`, `titulo`, `mensagens[]`,
  `criadoEm`, `atualizadoEm`) + `conversaAtivaId`. `mensagens` é derivado da ativa.
- **Acima das rotas** (em `main.tsx`, dentro de `AuthProvider`): navegar entre abas
  **não desmonta** o provider → histórico preservado e **busca continua rodando**.
- API: `novaConsulta`, `selecionar`, `excluir`, `enviar`, `votar`.
- `enviar`: se não há conversa ativa, cria uma (título = início da pergunta). O
  streaming é **endereçado pelo id** da conversa (`mapUltima(convId, …)`), então
  trocar de consulta no meio não embaralha as respostas.
- **Persistência:** `localStorage["rag-consultas-<userId>"]` (sobrevive a reload);
  carrega/salva por usuário.

## 2. Cliente HTTP — `lib/api.ts`

- `queryStream(pergunta, onMeta, onDelta)`: consome `/query/stream` (NDJSON) via
  `ReadableStream` — `meta` (log_id, fontes, camadas, fallback) seguido de `delta`s.
- `api.feedback(log_id, voto)` → `POST /feedback`.
- Operador (sem `consultar_stream`) cai em `api.query` (não-stream).

## 3. Página de consulta — `pages/Consulta.tsx`

- Render markdown da **dupla camada** (`Markdown.tsx`), com **aviso de segurança**
  em destaque (blockquote vermelho).
- **Citações clicáveis** → `DocumentoPanel` abre o guia ao lado (split-screen),
  rolado e destacado no trecho exato (`GET /documentos/{nome}`).
- **Feedback 👍/👎** por resposta (some no fallback).
- **Streaming** com efeito de digitação; estado vazio “Qual falha vamos diagnosticar?”.

## 4. Navegação — `components/Sidebar.tsx` (estilo ChatGPT)

- Grupo colapsável **Consulta**: sub-itens **Nova consulta** e **Buscar consulta**
  (filtra o histórico por título/conteúdo) + lista **Consultas recentes** (abrir;
  excluir no hover).
- Abas de topo: **Relatórios**, **Buscar Equipamento**, **Documentos**
  (placeholders — `components/Placeholder.tsx`).
- Rodapé: usuário (iniciais + nome/papel) com menu **Início / Painel ADM / Sair**.
- Dois `variant`: `full` (260px) e `rail` (trilho de 56px só com ícones).

## 5. Layout responsivo — `components/Layout.tsx` + `hooks/useMediaQuery.ts`

- **≥ 768px:** sidebar fixa; botão alterna entre `full` e `rail` (preferência em
  `localStorage["rag-sidebar"]`).
- **< 768px:** a sidebar vira **drawer** sobreposto (fora da tela por padrão),
  aberto por um **☰** no cabeçalho e fechado ao navegar ou clicar no fundo. A
  transição entre os modos é automática (media query).

## 6. Rotas — `App.tsx`

`/` e `*` → `/consulta`. Páginas: `/consulta`, `/relatorios`, `/equipamentos`,
`/documentos`, `/inicio` (Home), `/admin` (painel ADM).

## Verificação

`tsc --noEmit` estrito (sem testes de runtime de UI no ambiente — npm restrito por
SSL). Conferência visual via `scripts/frontend.ps1`.

## Fora de escopo

Conteúdo real de Relatórios/Buscar Equipamento/Documentos (placeholders).

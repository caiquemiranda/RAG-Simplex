# Regras de Codificação

- **Idioma:** comentários, docstrings e nomes de variáveis em **português**.
  Exceção: termos de diagnóstico exibidos no display do painel permanecem em
  inglês (`HEAD MISSING`, `Earth Fault`, `No Answer` etc.).
- **Sem números mágicos:** threshold, top_k, nomes de modelo, caminhos e nome da
  coleção vivem em `app/config.py`. Nada de hardcode espalhado.
- **Imports absolutos** a partir de `app` (`from app.recuperacao import buscar`).
- **Type hints** em assinaturas públicas; `from __future__ import annotations` no topo.
- **Tratamento de erro explícito** nas bordas (API, arquivo ausente, coleção vazia)
  com mensagens acionáveis em português.
- **Dependências fixadas** em `requirements.txt` (versão exata). Ao adicionar libs,
  fixar versão e justificar.
- **Testes** não devem exigir rede nem download de modelo no caminho padrão; o que
  precisar de embeddings/Chroma reais deve ser marcado/skippado de forma clara.

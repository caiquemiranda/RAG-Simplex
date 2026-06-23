"""RAG-Simplex — assistente de auxílio técnico para painéis de incêndio Simplex.

Pacote da aplicação. O pipeline RAG é dividido em três etapas:

- :mod:`app.ingestao`    — quebra o guia em blocos autocontidos e vetoriza.
- :mod:`app.recuperacao` — busca semântica no banco vetorial (ChromaDB).
- :mod:`app.geracao`     — gera a resposta em dupla camada via API do Claude.

O ponto de entrada HTTP (FastAPI) fica em :mod:`app.main`.
"""

__version__ = "1.0.0"

"""Configuração central do RAG-Simplex.

Todos os caminhos, modelos e limiares ficam aqui para evitar números mágicos
espalhados pelo código. Valores podem ser sobrescritos por variáveis de
ambiente (prefixo ``RAG_``) ou pelo arquivo ``.env``.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Raiz do projeto (…/RAG-simplex)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Configurações da aplicação, carregadas de ``.env`` + ambiente."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_prefix="RAG_",
        extra="ignore",
    )

    # --- Credenciais ---
    # A chave da Anthropic é lida sem o prefixo RAG_ (nome padrão do SDK).
    anthropic_api_key: str = ""

    # --- Geração ---
    # Estratégia padrão de geração da resposta. Opções:
    #   "local_extrativa" → sem LLM, grátis, roda em CPU fraca (padrão atual).
    #   "claude_nuvem"    → API do Claude (requer ANTHROPIC_API_KEY; Fase 10).
    # Demais provedores de nuvem entram na Fase 10.
    estrategia_geracao: str = "local_extrativa"

    # Quantos blocos relacionados (além do principal) o extrativo lista no rodapé.
    extrativo_max_relacionados: int = 3

    # --- Geração via Claude (usado só pela estratégia de nuvem, Fase 10) ---
    claude_model: str = "claude-opus-4-8"
    max_tokens: int = 4096

    # --- Embeddings locais (multilíngue PT/EN, sem chave externa) ---
    # e5 é otimizado para RECUPERAÇÃO (assimétrico): exige prefixar a consulta com
    # "query: " e os documentos com "passage: ". Dá scores mais altos e melhor
    # separação que o MiniLM (ver decisão D-014). Roda em CPU.
    embedding_model: str = "intfloat/multilingual-e5-small"
    embedding_query_prefix: str = "query: "
    embedding_passage_prefix: str = "passage: "

    # --- Banco vetorial ---
    chroma_dir: Path = BASE_DIR / "data" / "processed" / "chroma"
    collection_name: str = "simplex_falhas"

    # --- Recuperação (PRD §6.1) ---
    # Distância de cosseno; limiar mínimo de aceitação do score de similaridade.
    similarity_threshold: float = 0.78
    top_k: int = 5

    # --- Fontes de conhecimento ---
    knowledge_base: Path = BASE_DIR / "docs" / "guia_falhas_simplex_ptbr.md"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Permite ANTHROPIC_API_KEY puro (convenção do SDK) além de RAG_…
        import os

        if not self.anthropic_api_key:
            self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")


settings = Settings()

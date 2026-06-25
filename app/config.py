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

    # --- Arquivos enviados (logos, documentos de equipamentos…) na raiz do projeto ---
    arquivos_dir: Path = BASE_DIR / "arquivos"

    # --- Banco relacional (usuários, papéis, config, auditoria) ---
    database_url: str = f"sqlite:///{(BASE_DIR / 'data' / 'processed' / 'ragsimplex.db').as_posix()}"
    # Chave Fernet p/ cifrar chaves de provedor em repouso (uso na Fase 10).
    # Gere uma com: python -m app.cripto
    secret_key: str = ""

    # --- CORS (frontend React) ---
    # Origens permitidas (separadas por vírgula). O front de dev roda em :5173.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Autenticação (JWT) ---
    # Segredo HMAC dos tokens. Se vazio, usa `secret_key` como fallback.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expira_min: int = 1440   # 1 dia (evita expirar no meio do uso)
    refresh_token_expira_dias: int = 7

    # --- Recuperação (PRD §6.1) ---
    # Distância de cosseno; limiar mínimo de aceitação do score de similaridade.
    similarity_threshold: float = 0.78
    top_k: int = 5

    # Busca híbrida (D-015): bônus aditivo ao score vetorial quando a consulta casa
    # com o termo do display (header/termo_en). Corrige ranking de termos parecidos
    # (ex.: "Head Missing" vs "Node Missing") sem prejudicar consultas coloquiais.
    lexical_boost: float = 0.12
    rerank_pool: int = 10  # candidatos recuperados por vetor antes de reordenar

    # --- Fontes de conhecimento ---
    knowledge_base: Path = BASE_DIR / "docs" / "guia_falhas_simplex_ptbr.md"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Permite ANTHROPIC_API_KEY puro (convenção do SDK) além de RAG_…
        import os

        if not self.anthropic_api_key:
            self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")


settings = Settings()

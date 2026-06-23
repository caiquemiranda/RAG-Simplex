"""API HTTP (FastAPI) do RAG-Simplex.

Endpoints:
- ``GET  /health``        — verificação de saúde + estado da coleção.
- ``POST /ingest``        — (re)indexa o guia no banco vetorial.
- ``POST /query``         — pergunta → resposta em dupla camada + fontes.
- ``POST /query/stream``  — mesma resposta, em streaming (text/plain).

Execução local:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app import __version__
from app.config import settings
from app.geracao import gerar_resposta, gerar_resposta_stream
from app.ingestao import get_collection, indexar
from app.recuperacao import buscar

app = FastAPI(
    title="RAG-Simplex",
    description="Assistente de auxílio técnico para painéis de incêndio Simplex.",
    version=__version__,
)


# --------------------------------------------------------------------------- #
# Schemas                                                                      #
# --------------------------------------------------------------------------- #
class ConsultaIn(BaseModel):
    pergunta: str = Field(..., min_length=1, examples=["painel apitando, luz vermelha piscando"])
    persona: str | None = Field(
        None,
        description="Perfil do usuário (ex.: 'operador não-técnico', 'técnico de campo').",
    )
    sistema: str | None = Field(None, description="Filtro: 4100 | QE90 | F3200 | REDE.")
    top_k: int | None = Field(None, ge=1, le=20)


class FonteOut(BaseModel):
    id: str
    header: str | None = None
    sistema: str | None = None
    severidade: str | None = None
    similaridade: float


class RespostaOut(BaseModel):
    pergunta: str
    resposta: str
    fallback: bool
    fontes: list[FonteOut]


class IngestOut(BaseModel):
    blocos_indexados: int
    colecao: str


# --------------------------------------------------------------------------- #
# Endpoints                                                                    #
# --------------------------------------------------------------------------- #
@app.get("/health")
def health() -> dict:
    try:
        total = get_collection(reset=False).count()
    except Exception:
        total = 0
    return {
        "status": "ok",
        "versao": __version__,
        "modelo_geracao": settings.claude_model,
        "modelo_embeddings": settings.embedding_model,
        "blocos_indexados": total,
        "limiar_similaridade": settings.similarity_threshold,
        "api_key_configurada": bool(settings.anthropic_api_key),
    }


@app.post("/ingest", response_model=IngestOut)
def ingest() -> IngestOut:
    """(Re)indexa o guia padrão definido em ``settings.knowledge_base``."""
    try:
        total = indexar(reset=True)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e
    return IngestOut(blocos_indexados=total, colecao=settings.collection_name)


@app.post("/query", response_model=RespostaOut)
def query(consulta: ConsultaIn) -> RespostaOut:
    """Recupera contexto e gera a resposta em dupla camada."""
    try:
        rec = buscar(consulta.pergunta, top_k=consulta.top_k, sistema=consulta.sistema)
        resp = gerar_resposta(consulta.pergunta, recuperacao=rec, persona=consulta.persona)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return RespostaOut(
        pergunta=consulta.pergunta,
        resposta=resp.texto,
        fallback=resp.fallback,
        fontes=resp.fontes,
    )


@app.post("/query/stream")
def query_stream(consulta: ConsultaIn) -> StreamingResponse:
    """Mesma resposta de ``/query``, porém em streaming (text/plain; charset=utf-8)."""
    try:
        rec = buscar(consulta.pergunta, top_k=consulta.top_k, sistema=consulta.sistema)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    gerador = gerar_resposta_stream(consulta.pergunta, recuperacao=rec, persona=consulta.persona)
    return StreamingResponse(gerador, media_type="text/plain; charset=utf-8")

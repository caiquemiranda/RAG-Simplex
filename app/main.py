"""API HTTP (FastAPI) do RAG-Simplex.

Endpoints:
- ``POST /auth/login``    — e-mail/senha → tokens (access + refresh).
- ``POST /auth/refresh``  — refresh token → novo access token.
- ``GET  /auth/me``       — dados do usuário autenticado.
- ``GET  /health``        — verificação de saúde + estado da coleção.
- ``POST /ingest``        — (re)indexa o guia (requer login).
- ``POST /query``         — pergunta → resposta em dupla camada + fontes (requer login).
- ``POST /query/stream``  — mesma resposta, em streaming (requer login).

Execução local:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import __version__
from app.admin import router as admin_router
from app.auth import (
    TokenInvalido,
    criar_access_token,
    criar_refresh_token,
    decodificar_token,
    requer,
    usuario_atual,
    verificar_senha,
)
from app.config import settings
from app.db import get_session
from app.estrategias import montar_texto
from app.geracao import gerar_resposta
from app.ingestao import get_collection, indexar
from app.modelos import LogConsulta, Usuario
from app.preferencias import resolver_camadas, resolver_estrategia
from app.recuperacao import buscar

app = FastAPI(
    title="RAG-Simplex",
    description="Assistente de auxílio técnico para painéis de incêndio Simplex.",
    version=__version__,
)
app.include_router(admin_router)


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
    fonte: str | None = None
    trecho: str | None = None  # texto do guia na íntegra (sugestão do fabricante)


class RespostaOut(BaseModel):
    pergunta: str
    resposta: str
    fallback: bool
    fontes: list[FonteOut]
    camadas_exibidas: list[str] = []  # quais camadas o papel do usuário recebeu


class IngestOut(BaseModel):
    blocos_indexados: int
    colecao: str


class LoginIn(BaseModel):
    email: str = Field(..., examples=["admin@example.com"])
    senha: str = Field(..., min_length=1)


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    email: str
    nome: str
    papel: str | None = None
    permissoes: list[str] = []


# --------------------------------------------------------------------------- #
# Autenticação                                                                 #
# --------------------------------------------------------------------------- #
@app.post("/auth/login", response_model=TokenOut)
def login(dados: LoginIn, sessao: Session = Depends(get_session)) -> TokenOut:
    """Autentica por e-mail/senha e devolve tokens de acesso e refresh."""
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email))
    if usuario is None or not verificar_senha(dados.senha, usuario.hash_senha):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="E-mail ou senha inválidos.")
    if not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo.")
    papel = usuario.papel.nome if usuario.papel else None
    return TokenOut(
        access_token=criar_access_token(usuario.id, papel),
        refresh_token=criar_refresh_token(usuario.id),
    )


@app.post("/auth/refresh", response_model=TokenOut)
def refresh(dados: RefreshIn, sessao: Session = Depends(get_session)) -> TokenOut:
    """Emite um novo token de acesso a partir de um refresh token válido."""
    try:
        payload = decodificar_token(dados.refresh_token)
    except TokenInvalido as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
    if payload.get("tipo") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token de refresh esperado.")
    usuario = sessao.get(Usuario, int(payload["sub"]))
    if usuario is None or not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuário inexistente ou inativo.")
    papel = usuario.papel.nome if usuario.papel else None
    return TokenOut(access_token=criar_access_token(usuario.id, papel))


@app.get("/auth/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(usuario_atual)) -> UsuarioOut:
    """Dados do usuário autenticado."""
    return UsuarioOut(
        id=usuario.id,
        email=usuario.email,
        nome=usuario.nome,
        papel=usuario.papel.nome if usuario.papel else None,
        permissoes=[p.chave for p in usuario.papel.permissoes] if usuario.papel else [],
    )


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
def ingest(usuario: Usuario = Depends(requer("ingerir"))) -> IngestOut:
    """(Re)indexa o guia padrão definido em ``settings.knowledge_base``."""
    try:
        total = indexar(reset=True)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e
    return IngestOut(blocos_indexados=total, colecao=settings.collection_name)


@app.post("/query", response_model=RespostaOut)
def query(
    consulta: ConsultaIn,
    usuario: Usuario = Depends(requer("consultar")),
    sessao: Session = Depends(get_session),
) -> RespostaOut:
    """Recupera contexto e gera a resposta na estratégia configurada para o usuário.

    As camadas exibidas dependem do papel (RBAC): operador recebe só a camada de
    linguagem simples; técnico/analista recebem também a resolução técnica.
    """
    papel = usuario.papel.nome if usuario.papel else None
    estrategia = resolver_estrategia(sessao, usuario_id=usuario.id, papel_nome=papel)
    permitidas = resolver_camadas(sessao, usuario_id=usuario.id, papel_nome=papel)
    try:
        rec = buscar(consulta.pergunta, top_k=consulta.top_k, sistema=consulta.sistema)
        resp = gerar_resposta(
            consulta.pergunta, recuperacao=rec, persona=consulta.persona, estrategia=estrategia
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    # Filtra as camadas conforme o papel. Fallback e estratégias sem camadas
    # estruturadas usam o texto completo.
    texto = montar_texto(resp.camadas, permitidas) if resp.camadas else resp.texto

    # Auditoria (PRD §6.2): registra a consulta sem expor a chave do provedor.
    sessao.add(LogConsulta(
        usuario_id=usuario.id,
        pergunta=consulta.pergunta,
        estrategia=resp.estrategia or estrategia,
        latencia_ms=resp.latencia_ms,
        custo_estimado=resp.custo_estimado,
        fallback=resp.fallback,
    ))
    sessao.commit()

    return RespostaOut(
        pergunta=consulta.pergunta,
        resposta=texto,
        fallback=resp.fallback,
        fontes=resp.fontes,
        camadas_exibidas=sorted(permitidas),
    )


@app.post("/query/stream")
def query_stream(
    consulta: ConsultaIn,
    usuario: Usuario = Depends(requer("consultar_stream")),
    sessao: Session = Depends(get_session),
) -> StreamingResponse:
    """Mesma resposta de ``/query``, porém em streaming (text/plain; charset=utf-8).

    As camadas são filtradas por papel antes do envio (gera a resposta e transmite
    o texto já filtrado). O streaming token a token de nuvem é tratado na Fase 10.
    """
    papel = usuario.papel.nome if usuario.papel else None
    estrategia = resolver_estrategia(sessao, usuario_id=usuario.id, papel_nome=papel)
    permitidas = resolver_camadas(sessao, usuario_id=usuario.id, papel_nome=papel)
    try:
        rec = buscar(consulta.pergunta, top_k=consulta.top_k, sistema=consulta.sistema)
        resp = gerar_resposta(
            consulta.pergunta, recuperacao=rec, persona=consulta.persona, estrategia=estrategia
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    texto = montar_texto(resp.camadas, permitidas) if resp.camadas else resp.texto

    sessao.add(LogConsulta(
        usuario_id=usuario.id, pergunta=consulta.pergunta,
        estrategia=resp.estrategia or estrategia, latencia_ms=resp.latencia_ms,
        custo_estimado=resp.custo_estimado, fallback=resp.fallback,
    ))
    sessao.commit()

    def _emitir():
        yield texto

    return StreamingResponse(_emitir(), media_type="text/plain; charset=utf-8")

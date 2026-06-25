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

import json
import re

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import __version__
from app.admin import router as admin_router
from app.arquivos import router as arquivos_router
from app.banco import router as banco_router
from app.biblioteca import router as biblioteca_router
from app.cronograma import router as cronograma_router
from app.notificacoes import router as notificacoes_router
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
from app.ingestao import documentos_indexados, get_collection, indexar
from app.modelos import Cliente, LogConsulta, Unidade, Usuario
from app.preferencias import resolver_camadas, resolver_estrategia
from app.recuperacao import buscar

app = FastAPI(
    title="RAG-Simplex",
    description="Assistente de auxílio técnico para painéis de incêndio Simplex.",
    version=__version__,
)
app.include_router(admin_router)
app.include_router(cronograma_router)
app.include_router(notificacoes_router)
app.include_router(arquivos_router)
app.include_router(biblioteca_router)
app.include_router(banco_router)

# Arquivos enviados (logos, documentos…) servidos em /arquivos.
settings.arquivos_dir.mkdir(parents=True, exist_ok=True)
app.mount("/arquivos", StaticFiles(directory=settings.arquivos_dir), name="arquivos")

# CORS para o frontend React (origens configuráveis via RAG_CORS_ORIGINS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    fonte: str | None = None
    trecho: str | None = None  # texto do guia na íntegra (sugestão do fabricante)


class RespostaOut(BaseModel):
    pergunta: str
    resposta: str
    fallback: bool
    fontes: list[FonteOut]
    camadas_exibidas: list[str] = []  # quais camadas o papel do usuário recebeu
    log_id: int | None = None         # id da consulta (para enviar feedback)


class FeedbackIn(BaseModel):
    log_id: int
    voto: int = Field(..., description="1 (👍) ou -1 (👎)")


class IngestOut(BaseModel):
    blocos_indexados: int
    colecao: str


class DocumentoOut(BaseModel):
    nome: str
    conteudo: str


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


class MeuDocumento(BaseModel):
    id: int
    nome: str
    validade: str | None = None


@app.get("/me/documentos", response_model=list[MeuDocumento])
def meus_documentos(usuario: Usuario = Depends(usuario_atual)) -> list[MeuDocumento]:
    """Documentos (com validade) do próprio usuário — para o dashboard."""
    return [
        MeuDocumento(id=d.id, nome=d.nome, validade=d.validade.isoformat() if d.validade else None)
        for d in usuario.documentos
    ]


class ClientePublico(BaseModel):
    id: int
    nome: str
    unidade: str | None = None
    unidade_id: int | None = None
    cor: str | None = None
    logo_url: str | None = None


class UnidadePublica(BaseModel):
    id: int
    nome: str
    cidade: str | None = None


@app.get("/clientes", response_model=list[ClientePublico])
def clientes_visiveis(
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[ClientePublico]:
    """Clientes ativos visíveis (Relatórios/sidebar): admin vê todos; técnico vê os seus."""
    if usuario.tem_permissao("gerir_usuarios"):
        clientes = sessao.scalars(
            select(Cliente).where(Cliente.ativo.is_(True)).order_by(Cliente.nome)
        ).all()
    else:
        clientes = sorted((c for c in usuario.clientes_rel if c.ativo), key=lambda c: c.nome)
    return [
        ClientePublico(id=c.id, nome=c.nome, unidade=c.unidade, unidade_id=c.unidade_id,
                       cor=c.cor, logo_url=c.logo_url)
        for c in clientes
    ]


@app.get("/unidades", response_model=list[UnidadePublica])
def unidades_visiveis(
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(get_session),
) -> list[UnidadePublica]:
    """Unidades ativas (para o seletor da 'visão por unidade' do cronograma)."""
    unidades = sessao.scalars(
        select(Unidade).where(Unidade.ativo.is_(True)).order_by(Unidade.nome)
    ).all()
    return [UnidadePublica(id=u.id, nome=u.nome, cidade=u.cidade) for u in unidades]


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


def _executar_consulta(consulta: ConsultaIn, usuario: Usuario, sessao: Session):
    """Roda a consulta (estratégia + camadas por papel) e registra a auditoria.

    Retorna ``(texto_filtrado, resposta, camadas_exibidas, log_id)``.
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

    # Filtra as camadas conforme o papel (fallback usa o texto completo).
    texto = montar_texto(resp.camadas, permitidas) if resp.camadas else resp.texto

    log = LogConsulta(
        usuario_id=usuario.id, pergunta=consulta.pergunta,
        estrategia=resp.estrategia or estrategia, latencia_ms=resp.latencia_ms,
        custo_estimado=resp.custo_estimado, fallback=resp.fallback,
    )
    sessao.add(log)
    sessao.commit()
    sessao.refresh(log)
    return texto, resp, sorted(permitidas), log.id


@app.post("/query", response_model=RespostaOut)
def query(
    consulta: ConsultaIn,
    usuario: Usuario = Depends(requer("consultar")),
    sessao: Session = Depends(get_session),
) -> RespostaOut:
    """Recupera contexto e gera a resposta na estratégia/camadas do usuário (RBAC)."""
    texto, resp, camadas, log_id = _executar_consulta(consulta, usuario, sessao)
    return RespostaOut(
        pergunta=consulta.pergunta,
        resposta=texto,
        fallback=resp.fallback,
        fontes=resp.fontes,
        camadas_exibidas=camadas,
        log_id=log_id,
    )


def _fatiar(texto: str, palavras_por_chunk: int = 4):
    """Quebra o texto em pedaços (mantendo espaços) para o efeito de digitação."""
    pedacos = re.findall(r"\S+\s*", texto)
    for i in range(0, len(pedacos), palavras_por_chunk):
        yield "".join(pedacos[i : i + palavras_por_chunk])


@app.post("/query/stream")
def query_stream(
    consulta: ConsultaIn,
    usuario: Usuario = Depends(requer("consultar_stream")),
    sessao: Session = Depends(get_session),
) -> StreamingResponse:
    """Resposta em streaming **NDJSON** (uma linha JSON por evento).

    Eventos: ``{"tipo":"meta", log_id, fallback, camadas_exibidas, fontes}`` seguido
    de vários ``{"tipo":"delta","texto":...}``. Pronto para o streaming token a token
    das estratégias de nuvem (Fase 10); no local, transmite o texto em pedaços.
    """
    texto, resp, camadas, log_id = _executar_consulta(consulta, usuario, sessao)

    def _emitir():
        yield json.dumps({
            "tipo": "meta", "log_id": log_id, "fallback": resp.fallback,
            "camadas_exibidas": camadas, "fontes": resp.fontes,
        }, ensure_ascii=False) + "\n"
        for pedaco in _fatiar(texto):
            yield json.dumps({"tipo": "delta", "texto": pedaco}, ensure_ascii=False) + "\n"

    return StreamingResponse(_emitir(), media_type="application/x-ndjson")


@app.post("/feedback")
def feedback(
    dados: FeedbackIn,
    usuario: Usuario = Depends(requer("consultar")),
    sessao: Session = Depends(get_session),
) -> dict:
    """Registra o feedback (👍/👎) do usuário sobre uma de suas consultas."""
    if dados.voto not in (1, -1):
        raise HTTPException(status_code=400, detail="voto deve ser 1 (👍) ou -1 (👎).")
    log = sessao.get(LogConsulta, dados.log_id)
    if log is None or log.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Consulta não encontrada.")
    log.feedback = dados.voto
    sessao.commit()
    return {"ok": True, "log_id": dados.log_id, "voto": dados.voto}


# --------------------------------------------------------------------------- #
# Documentos (para o painel de citações do frontend)                          #
# --------------------------------------------------------------------------- #
# Os guias ficam na mesma pasta da base de conhecimento configurada.
_DOCS_DIR = settings.knowledge_base.parent


@app.get("/documentos", response_model=list[str])
def listar_documentos(_: Usuario = Depends(requer("consultar"))) -> list[str]:
    """Documentos atualmente indexados (que o assistente pesquisa)."""
    return documentos_indexados()


@app.get("/documentos/{nome}", response_model=DocumentoOut)
def obter_documento(nome: str, _: Usuario = Depends(requer("consultar"))) -> DocumentoOut:
    """Conteúdo (markdown) de um documento indexado, para exibição lado a lado.

    Só serve arquivos `.md` que constam na base — guarda contra path traversal.
    """
    if not nome.endswith(".md") or "/" in nome or "\\" in nome or ".." in nome:
        raise HTTPException(status_code=400, detail="Nome de documento inválido.")
    if nome not in documentos_indexados():
        raise HTTPException(status_code=404, detail="Documento não indexado.")
    caminho = _DOCS_DIR / nome
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Arquivo do documento não encontrado.")
    return DocumentoOut(nome=nome, conteudo=caminho.read_text(encoding="utf-8"))

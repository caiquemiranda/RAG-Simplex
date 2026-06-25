"""Infra de arquivos (#FILES): salva uploads numa pasta na raiz e os serve estáticos.

Keystone reusado por: logo do cliente, foto do usuário e documentos de equipamentos.
Os arquivos vivem em ``settings.arquivos_dir`` (raiz do projeto) e são servidos em
``/arquivos/...`` (montado em ``app.main``). Só admin (`gerir_usuarios`) faz upload.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.auth import requer
from app.config import settings
from app.modelos import Usuario

router = APIRouter(tags=["arquivos"])

_SEGURO = re.compile(r"[^A-Za-z0-9._-]+")
_TAM_MAX = 10 * 1024 * 1024  # 10 MB


def _nome_seguro(nome: str) -> str:
    base = _SEGURO.sub("_", Path(nome).name).strip("_") or "arquivo"
    return base[:80]


def salvar_upload(upload: UploadFile, subpasta: str = "") -> str:
    """Salva o arquivo em ``arquivos_dir/subpasta`` e devolve a URL pública ``/arquivos/…``.

    ``subpasta`` pode ser aninhada (``biblioteca/marca``); cada segmento é sanitizado
    e ``..`` é descartado (sem path traversal).
    """
    dados = upload.file.read()
    if len(dados) > _TAM_MAX:
        raise HTTPException(status_code=413, detail="Arquivo maior que 10 MB.")
    segmentos = [
        s for s in (_SEGURO.sub("_", t).strip("_") for t in subpasta.replace("\\", "/").split("/"))
        if s and s != ".."
    ]
    destino = settings.arquivos_dir.joinpath(*segmentos) if segmentos else settings.arquivos_dir
    destino.mkdir(parents=True, exist_ok=True)
    nome = f"{uuid.uuid4().hex[:8]}_{_nome_seguro(upload.filename or 'arquivo')}"
    (destino / nome).write_bytes(dados)
    return "/" + "/".join(("arquivos", *segmentos, nome))


def remover_arquivo(url: str) -> None:
    """Remove do disco um arquivo apontado por uma URL ``/arquivos/…`` (best-effort, seguro)."""
    if not url or not url.startswith("/arquivos/"):
        return
    rel = url[len("/arquivos/"):]
    caminho = (settings.arquivos_dir / rel).resolve()
    try:
        if settings.arquivos_dir.resolve() in caminho.parents and caminho.is_file():
            caminho.unlink()
    except OSError:
        pass


class UploadOut(BaseModel):
    url: str
    nome_original: str


@router.post("/upload", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
def upload(
    arquivo: UploadFile = File(...),
    subpasta: str = Form(""),
    _: Usuario = Depends(requer("gerir_usuarios")),
) -> UploadOut:
    """Sobe um arquivo (logo, foto, documento…) e devolve sua URL pública."""
    url = salvar_upload(arquivo, subpasta)
    return UploadOut(url=url, nome_original=arquivo.filename or "arquivo")

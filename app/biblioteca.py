"""Biblioteca de documentos de equipamentos/empresa (#DOC1).

Dois acervos: **empresa** (IBSystems) e **marcas** (Simplex, Notifier…). Leitura por
qualquer autenticado (oculto só p/ admin); upload/edição/remoção exigem `gerir_usuarios`.
Os arquivos vivem em `/arquivos/biblioteca/...` (reusa a infra de arquivos, #FILES).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.arquivos import remover_arquivo, salvar_upload
from app.auth import requer, usuario_atual
from app.db import get_session
from app.modelos import DocumentoEquipamento, Usuario

router = APIRouter(prefix="/biblioteca", tags=["biblioteca"])

_CATEGORIAS = {"empresa", "marca"}


class DocEquipResumo(BaseModel):
    id: int
    categoria: str
    marca: str
    nome: str
    url: str
    oculto: bool


class DocEquipAtualizar(BaseModel):
    nome: str | None = None
    marca: str | None = None
    oculto: bool | None = None


def _resumo(d: DocumentoEquipamento) -> DocEquipResumo:
    return DocEquipResumo(id=d.id, categoria=d.categoria, marca=d.marca, nome=d.nome,
                          url=d.url, oculto=d.oculto)


@router.get("", response_model=list[DocEquipResumo])
def listar(categoria: str | None = Query(None),
           usuario: Usuario = Depends(usuario_atual),
           sessao: Session = Depends(get_session)) -> list[DocEquipResumo]:
    consulta = select(DocumentoEquipamento)
    if categoria:
        consulta = consulta.where(DocumentoEquipamento.categoria == categoria)
    if not usuario.tem_permissao("gerir_usuarios"):
        consulta = consulta.where(DocumentoEquipamento.oculto.is_(False))
    rows = sessao.scalars(consulta.order_by(DocumentoEquipamento.marca, DocumentoEquipamento.nome))
    return [_resumo(d) for d in rows]


@router.post("", response_model=DocEquipResumo, status_code=status.HTTP_201_CREATED)
def criar(arquivo: UploadFile = File(...),
          categoria: str = Form(...),
          marca: str = Form(""),
          nome: str = Form(""),
          _: Usuario = Depends(requer("gerir_usuarios")),
          sessao: Session = Depends(get_session)) -> DocEquipResumo:
    if categoria not in _CATEGORIAS:
        raise HTTPException(status_code=400, detail="categoria deve ser 'empresa' ou 'marca'.")
    url = salvar_upload(arquivo, f"biblioteca/{categoria}")
    marca_final = marca.strip() or ("IBSystems" if categoria == "empresa" else "Geral")
    d = DocumentoEquipamento(
        categoria=categoria, marca=marca_final,
        nome=(nome.strip() or arquivo.filename or "documento"), url=url,
    )
    sessao.add(d)
    sessao.commit()
    sessao.refresh(d)
    return _resumo(d)


@router.patch("/{doc_id}", response_model=DocEquipResumo)
def atualizar(doc_id: int, dados: DocEquipAtualizar,
              _: Usuario = Depends(requer("gerir_usuarios")),
              sessao: Session = Depends(get_session)) -> DocEquipResumo:
    d = sessao.get(DocumentoEquipamento, doc_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    if dados.nome is not None and dados.nome.strip():
        d.nome = dados.nome.strip()
    if dados.marca is not None:
        d.marca = dados.marca.strip()
    if dados.oculto is not None:
        d.oculto = dados.oculto
    sessao.commit()
    sessao.refresh(d)
    return _resumo(d)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(doc_id: int,
            _: Usuario = Depends(requer("gerir_usuarios")),
            sessao: Session = Depends(get_session)):
    d = sessao.get(DocumentoEquipamento, doc_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    remover_arquivo(d.url)
    sessao.delete(d)
    sessao.commit()

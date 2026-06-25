"""Autenticação: hash de senha (argon2) + tokens JWT + dependency de usuário.

- Senhas com **argon2** (argon2-cffi).
- Tokens **JWT HS256** (PyJWT): access (curto) + refresh (longo).
- `usuario_atual` é a dependency do FastAPI que protege rotas.

O segredo dos tokens vem de `settings.jwt_secret` (ou `settings.secret_key` como
fallback). A autorização por papel/permissão (RBAC) entra na Fase 5.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_session
from app.modelos import Papel, Usuario

_ph = PasswordHasher()
_oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


class TokenInvalido(ValueError):
    """Token ausente, malformado, expirado ou com assinatura inválida."""


# --------------------------------------------------------------------------- #
# Senhas                                                                       #
# --------------------------------------------------------------------------- #
def normalizar_email(email: str) -> str:
    """Normaliza o e-mail para comparação/armazenamento (sem espaços, minúsculo).

    Usado no login e no cadastro para o e-mail ser **case-insensitive** — evita falha
    de login por diferença de maiúscula/minúscula.
    """
    return (email or "").strip().lower()


def hash_senha(senha: str) -> str:
    """Gera o hash argon2 de uma senha."""
    return _ph.hash(senha)


def verificar_senha(senha: str, hash_armazenado: str | None) -> bool:
    """Confere a senha contra o hash. Retorna False em qualquer falha."""
    if not hash_armazenado:
        return False
    try:
        return _ph.verify(hash_armazenado, senha)
    except VerifyMismatchError:
        return False
    except Exception:  # noqa: BLE001 — hash corrompido/incompatível
        return False


# --------------------------------------------------------------------------- #
# Tokens JWT                                                                   #
# --------------------------------------------------------------------------- #
def _chave() -> str:
    chave = settings.jwt_secret or settings.secret_key
    if not chave:
        raise RuntimeError(
            "Segredo de JWT ausente. Defina RAG_JWT_SECRET (ou RAG_SECRET_KEY) no .env."
        )
    return chave


def _criar_token(sub: int | str, tipo: str, expira: timedelta, extra: dict | None = None) -> str:
    agora = datetime.now(timezone.utc)
    payload: dict = {"sub": str(sub), "tipo": tipo, "iat": agora, "exp": agora + expira}
    if extra:
        payload.update({k: v for k, v in extra.items() if v is not None})
    return jwt.encode(payload, _chave(), algorithm=settings.jwt_algorithm)


def criar_access_token(sub: int | str, papel: str | None = None) -> str:
    return _criar_token(
        sub, "access", timedelta(minutes=settings.access_token_expira_min), {"papel": papel}
    )


def criar_refresh_token(sub: int | str) -> str:
    return _criar_token(sub, "refresh", timedelta(days=settings.refresh_token_expira_dias))


def decodificar_token(token: str) -> dict:
    """Decodifica e valida o token. Levanta :class:`TokenInvalido` em erro."""
    try:
        return jwt.decode(token, _chave(), algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as e:
        raise TokenInvalido("Token expirado.") from e
    except jwt.InvalidTokenError as e:
        raise TokenInvalido("Token inválido.") from e


# --------------------------------------------------------------------------- #
# Dependencies do FastAPI                                                      #
# --------------------------------------------------------------------------- #
def _401(detalhe: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalhe,
        headers={"WWW-Authenticate": "Bearer"},
    )


def usuario_atual(
    token: str | None = Depends(_oauth2),
    sessao: Session = Depends(get_session),
) -> Usuario:
    """Resolve o usuário autenticado a partir do token de acesso."""
    if not token:
        raise _401("Não autenticado.")
    try:
        payload = decodificar_token(token)
    except TokenInvalido as e:
        raise _401(str(e)) from e
    if payload.get("tipo") != "access":
        raise _401("Token de acesso esperado.")
    try:
        usuario = sessao.get(Usuario, int(payload["sub"]))
    except (KeyError, ValueError, TypeError) as e:
        raise _401("Token sem 'sub' válido.") from e
    if usuario is None or not usuario.ativo:
        raise _401("Usuário inexistente ou inativo.")
    return usuario


def requer(permissao: str):
    """Cria uma dependency que exige uma permissão específica (RBAC, Fase 5).

    Uso: ``def endpoint(usuario = Depends(requer("ingerir"))): ...``
    """

    def _dependencia(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
        if not usuario.tem_permissao(permissao):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado: requer a permissão '{permissao}'.",
            )
        return usuario

    return _dependencia


# --------------------------------------------------------------------------- #
# Seed de administrador                                                        #
# --------------------------------------------------------------------------- #
def criar_ou_atualizar_admin(sessao: Session, email: str, senha: str, nome: str = "Admin") -> Usuario:
    """Cria (ou atualiza a senha de) um usuário com papel Admin."""
    email = normalizar_email(email)
    papel_admin = sessao.scalar(select(Papel).where(Papel.nome == "Admin"))
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == email))
    if usuario is None:
        usuario = Usuario(email=email, nome=nome, ativo=True)
        sessao.add(usuario)
    usuario.hash_senha = hash_senha(senha)
    usuario.papel = papel_admin
    sessao.flush()
    return usuario


def _main() -> None:
    import argparse

    from app.db import SessionLocal, criar_tabelas
    from app.seed import semear_padroes

    parser = argparse.ArgumentParser(description="Utilitários de autenticação.")
    parser.add_argument("--criar-admin", nargs=2, metavar=("EMAIL", "SENHA"),
                        help="Cria/atualiza um usuário admin.")
    args = parser.parse_args()

    if args.criar_admin:
        email, senha = args.criar_admin
        criar_tabelas()
        with SessionLocal() as sessao:
            semear_padroes(sessao)  # garante papéis/permissões
            usuario = criar_ou_atualizar_admin(sessao, email, senha)
            sessao.commit()
            print(f"Admin pronto: {usuario.email} (id={usuario.id}).")
    else:
        parser.print_help()


if __name__ == "__main__":
    _main()

"""Cifragem simétrica das chaves de API dos provedores (Fernet).

As chaves de provedor (Claude/Gemini/Groq) ficam **cifradas em repouso** no banco
(PRD §6.2, decisão D-011). Em texto claro, só em memória no momento da chamada.

Gere uma chave secreta para o `.env` com:
    python -m app.cripto
e defina em `RAG_SECRET_KEY`.
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def gerar_chave_secreta() -> str:
    """Gera uma chave Fernet (url-safe base64, 32 bytes) para `RAG_SECRET_KEY`."""
    return Fernet.generate_key().decode()


def _fernet() -> Fernet:
    if not settings.secret_key:
        raise RuntimeError(
            "RAG_SECRET_KEY não configurada. Gere uma com `python -m app.cripto` "
            "e defina no .env. (Necessária apenas para cifrar chaves de provedor.)"
        )
    try:
        return Fernet(settings.secret_key.encode())
    except Exception as e:  # noqa: BLE001
        raise RuntimeError("RAG_SECRET_KEY inválida (não é uma chave Fernet).") from e


def cifrar(texto: str) -> str:
    """Cifra um texto (ex.: chave de API) e devolve o token."""
    return _fernet().encrypt(texto.encode()).decode()


def decifrar(token: str) -> str:
    """Decifra um token gerado por :func:`cifrar`."""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as e:
        raise RuntimeError(
            "Não foi possível decifrar: token inválido ou RAG_SECRET_KEY trocada."
        ) from e


def mascarar(texto: str, visivel: int = 4) -> str:
    """Máscara para exibição segura (mostra só os últimos `visivel` caracteres)."""
    if not texto:
        return ""
    if len(texto) <= visivel:
        return "…"
    return "…" + texto[-visivel:]


if __name__ == "__main__":
    print(gerar_chave_secreta())

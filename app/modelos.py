"""Modelos ORM (SQLAlchemy 2.0) da camada de persistência.

Entidades (PRD §3, §4.2, §6.2):
- `Papel` / `Permissao` — RBAC (usado de fato na Fase 5).
- `Usuario` — técnicos/operadores (`hash_senha` preenchido na Fase 4).
- `Provedor` — provedores de LLM com a chave **cifrada** (uso na Fase 10).
- `ConfigEstrategia` — qual estratégia usar, por escopo (global/papel/usuário).
- `LogConsulta` — auditoria de cada consulta (segurança de vida → rastreabilidade).

Usa SQLAlchemy 2.0 direto (sem SQLModel) — ver decisão D-016.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarativa de todos os modelos."""


# Tabela de associação N:N entre papéis e permissões.
papel_permissao = Table(
    "papel_permissao",
    Base.metadata,
    Column("papel_id", ForeignKey("papel.id"), primary_key=True),
    Column("permissao_id", ForeignKey("permissao.id"), primary_key=True),
)

# Permissões EXTRA atribuídas diretamente a um usuário (sem trocar de papel).
usuario_permissao = Table(
    "usuario_permissao",
    Base.metadata,
    Column("usuario_id", ForeignKey("usuario.id"), primary_key=True),
    Column("permissao_id", ForeignKey("permissao.id"), primary_key=True),
)


class Permissao(Base):
    __tablename__ = "permissao"

    id: Mapped[int] = mapped_column(primary_key=True)
    chave: Mapped[str] = mapped_column(String(50), unique=True)
    descricao: Mapped[str] = mapped_column(String(200), default="")

    papeis: Mapped[list[Papel]] = relationship(
        secondary=papel_permissao, back_populates="permissoes"
    )


class Papel(Base):
    __tablename__ = "papel"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(50), unique=True)

    permissoes: Mapped[list[Permissao]] = relationship(
        secondary=papel_permissao, back_populates="papeis"
    )
    usuarios: Mapped[list[Usuario]] = relationship(back_populates="papel")

    def tem_permissao(self, chave: str) -> bool:
        return any(p.chave == chave for p in self.permissoes)


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    nome: Mapped[str] = mapped_column(String(120), default="")
    # Preenchido na Fase 4 (autenticação). Nulo enquanto não há senha definida.
    hash_senha: Mapped[str | None] = mapped_column(String(255), default=None)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    papel_id: Mapped[int | None] = mapped_column(ForeignKey("papel.id"), default=None)
    papel: Mapped[Papel | None] = relationship(back_populates="usuarios")
    # Permissões concedidas diretamente a este usuário, além das do papel.
    permissoes_extra: Mapped[list[Permissao]] = relationship(secondary=usuario_permissao)

    def tem_permissao(self, chave: str) -> bool:
        """Permissão efetiva = permissões do papel ∪ permissões extra do usuário."""
        if self.papel is not None and self.papel.tem_permissao(chave):
            return True
        return any(p.chave == chave for p in self.permissoes_extra)


class Provedor(Base):
    __tablename__ = "provedor"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nome da estratégia de nuvem associada (ex.: "claude_nuvem", "gemini_nuvem").
    nome: Mapped[str] = mapped_column(String(50), unique=True)
    # Chave de API CIFRADA (Fernet). Nunca armazenar/expor em texto claro (PRD §6.2).
    api_key_cifrada: Mapped[str | None] = mapped_column(Text, default=None)
    ativo: Mapped[bool] = mapped_column(Boolean, default=False)


class ConfigEstrategia(Base):
    """Qual estratégia usar, por escopo. Resolução: usuário → papel → global."""

    __tablename__ = "config_estrategia"
    __table_args__ = (UniqueConstraint("escopo", "alvo", name="uq_escopo_alvo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    escopo: Mapped[str] = mapped_column(String(20))           # global|papel|usuario
    alvo: Mapped[str | None] = mapped_column(String(120), default=None)  # papel.nome ou usuario.id
    estrategia: Mapped[str] = mapped_column(String(50))       # local_extrativa, claude_nuvem...
    persona: Mapped[str | None] = mapped_column(String(120), default=None)
    camadas: Mapped[str | None] = mapped_column(String(50), default=None)  # ex.: "simples,tecnica"
    provedor_id: Mapped[int | None] = mapped_column(ForeignKey("provedor.id"), default=None)


class LogConsulta(Base):
    __tablename__ = "log_consulta"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"), default=None)
    pergunta: Mapped[str] = mapped_column(Text)
    estrategia: Mapped[str] = mapped_column(String(50))
    latencia_ms: Mapped[float | None] = mapped_column(Float, default=None)
    custo_estimado: Mapped[float] = mapped_column(Float, default=0.0)
    fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

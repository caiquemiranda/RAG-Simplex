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

from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
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

# Quais clientes cada técnico/usuário atende (N:N).
usuario_cliente = Table(
    "usuario_cliente",
    Base.metadata,
    Column("usuario_id", ForeignKey("usuario.id"), primary_key=True),
    Column("cliente_id", ForeignKey("cliente.id"), primary_key=True),
)

# Técnicos atribuídos a uma visita/atividade (N:N) — #CR8 (vários técnicos por atividade).
visita_tecnico = Table(
    "visita_tecnico",
    Base.metadata,
    Column("visita_id", ForeignKey("visita.id", ondelete="CASCADE"), primary_key=True),
    Column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True),
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


class Unidade(Base):
    """Unidade operacional (base/regional) — D-021. Promove o antigo texto livre
    `unidade` a entidade, para a "visão por unidade" do cronograma ter filtro robusto
    (sem sofrer com variação de digitação). Usuários e clientes são vinculados a ela."""

    __tablename__ = "unidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    cidade: Mapped[str | None] = mapped_column(String(120), default=None)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


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

    # --- Perfil / gestão de acesso (Fase 8) — todos opcionais ---
    foto_url: Mapped[str | None] = mapped_column(Text, default=None)        # URL de arquivo (/arquivos/...); data URL legado tolerado
    telefone: Mapped[str | None] = mapped_column(String(40), default=None)
    cargo: Mapped[str | None] = mapped_column(String(80), default=None)
    unidade: Mapped[str | None] = mapped_column(String(120), default=None)  # legado (texto) — usar unidade_rel (D-021)
    unidade_id: Mapped[int | None] = mapped_column(ForeignKey("unidade.id"), default=None)  # base do técnico
    unidade_rel: Mapped[Unidade | None] = relationship(foreign_keys=[unidade_id])
    clientes: Mapped[str | None] = mapped_column(Text, default=None)        # legado (CSV) — usar clientes_rel
    observacoes: Mapped[str | None] = mapped_column(Text, default=None)
    acesso_expira_em: Mapped[date | None] = mapped_column(Date, default=None)
    # Cliente fixo (padrão) onde o técnico fica todo dia, salvo relocação (#ALOC).
    cliente_padrao_id: Mapped[int | None] = mapped_column(ForeignKey("cliente.id"), default=None)
    cliente_padrao: Mapped[Cliente | None] = relationship(foreign_keys=[cliente_padrao_id])

    documentos: Mapped[list[DocumentoTecnico]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    # Clientes que este técnico atende (N:N) — substitui o CSV `clientes`.
    clientes_rel: Mapped[list[Cliente]] = relationship(
        secondary=usuario_cliente, back_populates="tecnicos"
    )

    def tem_permissao(self, chave: str) -> bool:
        """Permissão efetiva = permissões do papel ∪ permissões extra do usuário."""
        if self.papel is not None and self.papel.tem_permissao(chave):
            return True
        return any(p.chave == chave for p in self.permissoes_extra)


class Cliente(Base):
    """Cliente atendido (prédio/condomínio/instalação). Técnicos são associados a
    clientes (N:N) para definir acesso e o cronograma por local."""

    __tablename__ = "cliente"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    unidade: Mapped[str | None] = mapped_column(String(120), default=None)  # legado (texto) — usar unidade_rel (D-021)
    unidade_id: Mapped[int | None] = mapped_column(ForeignKey("unidade.id"), default=None)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    # Identidade visual do cliente (usada onde ele aparecer) — #CLIV.
    cor: Mapped[str | None] = mapped_column(String(9), default=None)        # hex #RRGGBB
    logo_url: Mapped[str | None] = mapped_column(Text, default=None)        # /arquivos/...

    tecnicos: Mapped[list[Usuario]] = relationship(
        secondary=usuario_cliente, back_populates="clientes_rel"
    )
    unidade_rel: Mapped[Unidade | None] = relationship(foreign_keys=[unidade_id])


class Visita(Base):
    """Visita/atividade agendada de um técnico no cronograma (por dia e cliente/local)."""

    __tablename__ = "visita"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Técnico responsável (1º da lista) — mantido para compat; a lista completa é `tecnicos`.
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("cliente.id"), default=None)
    data: Mapped[date] = mapped_column(Date)
    titulo: Mapped[str] = mapped_column(String(160))            # atividade do dia
    status: Mapped[str] = mapped_column(String(20), default="agendada")  # agendada|concluida|cancelada
    observacoes: Mapped[str | None] = mapped_column(Text, default=None)

    usuario: Mapped[Usuario] = relationship()
    cliente: Mapped[Cliente | None] = relationship()
    tecnicos: Mapped[list[Usuario]] = relationship(secondary=visita_tecnico)  # #CR8
    # Página da atividade (#ATV-1): comentários e anexos de imagem.
    comentarios: Mapped[list[ComentarioVisita]] = relationship(
        back_populates="visita", cascade="all, delete-orphan", order_by="ComentarioVisita.criado_em"
    )
    anexos: Mapped[list[AnexoVisita]] = relationship(
        back_populates="visita", cascade="all, delete-orphan", order_by="AnexoVisita.criado_em"
    )


class ComentarioVisita(Base):
    """Comentário de um técnico/admin numa atividade do cronograma (#ATV-1)."""

    __tablename__ = "comentario_visita"

    id: Mapped[int] = mapped_column(primary_key=True)
    visita_id: Mapped[int] = mapped_column(ForeignKey("visita.id", ondelete="CASCADE"))
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"), default=None)
    texto: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    visita: Mapped[Visita] = relationship(back_populates="comentarios")
    autor: Mapped[Usuario | None] = relationship()


class AnexoVisita(Base):
    """Anexo de imagem de uma atividade (#ATV-1) — arquivo em /arquivos/atividades/."""

    __tablename__ = "anexo_visita"

    id: Mapped[int] = mapped_column(primary_key=True)
    visita_id: Mapped[int] = mapped_column(ForeignKey("visita.id", ondelete="CASCADE"))
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"), default=None)
    url: Mapped[str] = mapped_column(Text)                       # /arquivos/atividades/...
    nome: Mapped[str] = mapped_column(String(200), default="")   # nome original
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    visita: Mapped[Visita] = relationship(back_populates="anexos")
    autor: Mapped[Usuario | None] = relationship()


class Feriado(Base):
    """Feriado (global) — destaca o dia no cronograma."""

    __tablename__ = "feriado"

    id: Mapped[int] = mapped_column(primary_key=True)
    data: Mapped[date] = mapped_column(Date, unique=True)
    descricao: Mapped[str] = mapped_column(String(120))


class Notificacao(Base):
    """Notificação para um usuário (ex.: nova atividade no cronograma)."""

    __tablename__ = "notificacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(40), default="cronograma")
    titulo: Mapped[str] = mapped_column(String(160))
    texto: Mapped[str | None] = mapped_column(Text, default=None)
    ref_id: Mapped[int | None] = mapped_column(default=None)  # id da entidade relacionada
    lida: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class DocumentoEquipamento(Base):
    """Documento de equipamento/empresa (manual, datasheet…). Só admin sobe; #DOC1."""

    __tablename__ = "documento_equipamento"

    id: Mapped[int] = mapped_column(primary_key=True)
    categoria: Mapped[str] = mapped_column(String(20))           # empresa | marca | cliente
    marca: Mapped[str] = mapped_column(String(80), default="")   # IBSystems / Simplex / Notifier…
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("cliente.id"), default=None)  # categoria cliente
    nome: Mapped[str] = mapped_column(String(160))               # nome de exibição (editável)
    url: Mapped[str] = mapped_column(Text)                       # /arquivos/...
    oculto: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    cliente: Mapped[Cliente | None] = relationship()


class DocumentoTecnico(Base):
    """Documento exigido do técnico (ex.: NR-10, ASO, crachá de cliente) com validade.

    Próximo do vencimento, o painel ADM destaca para o admin providenciar a renovação.
    """

    __tablename__ = "documento_tecnico"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    nome: Mapped[str] = mapped_column(String(120))
    validade: Mapped[date | None] = mapped_column(Date, default=None)

    usuario: Mapped[Usuario] = relationship(back_populates="documentos")


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
    # Feedback do usuário: 1 (👍), -1 (👎) ou None (sem voto).
    feedback: Mapped[int | None] = mapped_column(default=None)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

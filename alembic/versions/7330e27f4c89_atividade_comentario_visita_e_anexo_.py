"""atividade: comentario_visita e anexo_visita (#ATV-1)

Revision ID: 7330e27f4c89
Revises: 5c77258e6fc6
Create Date: 2026-06-25 15:47:46.891679

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7330e27f4c89'
down_revision: Union[str, None] = '5c77258e6fc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #ATV-1: apenas as 2 tabelas novas. As "create_foreign_key" que o autogenerate
    # sugeriu em cliente/usuario/documento_equipamento são ruído do SQLite (colunas
    # adicionadas por ALTER ADD COLUMN não carregam a constraint FK no banco antigo);
    # recriar essas tabelas só para anotar a FK é desnecessário e arriscado — removido.
    op.create_table(
        'comentario_visita',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visita_id', sa.Integer(), nullable=False),
        sa.Column('autor_id', sa.Integer(), nullable=True),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['autor_id'], ['usuario.id']),
        sa.ForeignKeyConstraint(['visita_id'], ['visita.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'anexo_visita',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visita_id', sa.Integer(), nullable=False),
        sa.Column('autor_id', sa.Integer(), nullable=True),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['autor_id'], ['usuario.id']),
        sa.ForeignKeyConstraint(['visita_id'], ['visita.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('anexo_visita')
    op.drop_table('comentario_visita')

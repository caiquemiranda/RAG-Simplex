"""equipamento por cliente (#EQP-1)

Revision ID: 2681a9da4b28
Revises: 7330e27f4c89
Create Date: 2026-06-25 18:20:46.095858

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2681a9da4b28'
down_revision: Union[str, None] = '7330e27f4c89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #EQP-1: apenas a tabela nova. (As create_foreign_key em cliente/usuario/
    # documento_equipamento são ruído do SQLite — colunas FK adicionadas por ALTER ADD
    # não carregam a constraint no banco antigo; recriar a tabela só p/ anotar é evitado.)
    op.create_table(
        'equipamento',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('painel', sa.String(length=80), nullable=False),
        sa.Column('loop', sa.String(length=40), nullable=False),
        sa.Column('add', sa.String(length=40), nullable=False),
        sa.Column('type', sa.String(length=80), nullable=False),
        sa.Column('model', sa.String(length=80), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('equipamento')

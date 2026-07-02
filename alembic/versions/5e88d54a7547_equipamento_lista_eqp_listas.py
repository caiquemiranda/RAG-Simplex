"""listas nomeadas de equipamentos (#EQP-LISTAS)

Revision ID: 5e88d54a7547
Revises: 8bf05fde56d0
Create Date: 2026-06-30 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e88d54a7547'
down_revision: Union[str, None] = '8bf05fde56d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'equipamento_lista',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=120), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'lista_equipamento',
        sa.Column('lista_id', sa.Integer(), nullable=False),
        sa.Column('equipamento_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['lista_id'], ['equipamento_lista.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipamento_id'], ['equipamento.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('lista_id', 'equipamento_id'),
    )


def downgrade() -> None:
    op.drop_table('lista_equipamento')
    op.drop_table('equipamento_lista')

"""ordem_servico (#OS)

Revision ID: 58e01d15fabc
Revises: ec6397a8beb8
Create Date: 2026-06-30 09:16:30.982636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58e01d15fabc'
down_revision: Union[str, None] = 'ec6397a8beb8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #OS: apenas a tabela nova (FKs em cliente/usuario/etc. são ruído do SQLite).
    op.create_table(
        'ordem_servico',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('equipamento_id', sa.Integer(), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('data', sa.Date(), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('solucao', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipamento_id'], ['equipamento.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('ordem_servico')

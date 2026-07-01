"""planta + equipamento mapa/manutencao (#MAP)

Revision ID: ec6397a8beb8
Revises: 84ff7bfcb358
Create Date: 2026-06-26 11:42:26.282692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec6397a8beb8'
down_revision: Union[str, None] = '84ff7bfcb358'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #MAP: tabela planta + colunas novas no equipamento. (FKs em cliente/usuario/
    # documento_equipamento são ruído do SQLite; a FK planta_id não é forçada no SQLite —
    # a integridade é tratada no app ao remover planta.)
    op.create_table(
        'planta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=160), nullable=False),
        sa.Column('imagem_url', sa.Text(), nullable=False),
        sa.Column('largura', sa.Integer(), nullable=False),
        sa.Column('altura', sa.Integer(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('equipamento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tag', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('status', sa.String(length=40), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('ultima_manutencao', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('ultimo_teste', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('planta_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('pos_x', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('pos_y', sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('equipamento', schema=None) as batch_op:
        batch_op.drop_column('pos_y')
        batch_op.drop_column('pos_x')
        batch_op.drop_column('planta_id')
        batch_op.drop_column('ultimo_teste')
        batch_op.drop_column('ultima_manutencao')
        batch_op.drop_column('status')
        batch_op.drop_column('tag')
    op.drop_table('planta')

"""chat interno entre usuários — tabela mensagem (#CHAT)

Revision ID: 615d05505836
Revises: 55a1f2053b04
Create Date: 2026-07-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '615d05505836'
down_revision: Union[str, None] = '55a1f2053b04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'mensagem',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('remetente_id', sa.Integer(), nullable=False),
        sa.Column('destinatario_id', sa.Integer(), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('lida', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['remetente_id'], ['usuario.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['destinatario_id'], ['usuario.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('mensagem')

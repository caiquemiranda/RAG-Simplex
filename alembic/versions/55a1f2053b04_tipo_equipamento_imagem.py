"""imagem por tipo de equipamento (#EQP-TIPO-IMG, D-028)

Revision ID: 55a1f2053b04
Revises: 48dbeb05d767
Create Date: 2026-07-02 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55a1f2053b04'
down_revision: Union[str, None] = '48dbeb05d767'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tipo_equipamento_imagem',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(length=80), nullable=False),
        sa.Column('imagem_url', sa.Text(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tipo'),
    )


def downgrade() -> None:
    op.drop_table('tipo_equipamento_imagem')

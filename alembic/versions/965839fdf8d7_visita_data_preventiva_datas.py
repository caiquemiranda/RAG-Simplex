"""datas avulsas da preventiva mensal — tabela visita_data (#OS-PREV-DATAS, D-029)

Revision ID: 965839fdf8d7
Revises: 615d05505836
Create Date: 2026-07-02 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '965839fdf8d7'
down_revision: Union[str, None] = '615d05505836'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'visita_data',
        sa.Column('visita_id', sa.Integer(), nullable=False),
        sa.Column('data', sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(['visita_id'], ['visita.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('visita_id', 'data'),
    )


def downgrade() -> None:
    op.drop_table('visita_data')

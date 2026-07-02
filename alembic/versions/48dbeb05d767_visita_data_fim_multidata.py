"""visita.data_fim — O.S. que dura mais de um dia (#OS-MULTIDATA, D-028)

Revision ID: 48dbeb05d767
Revises: ed5186ac4b27
Create Date: 2026-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48dbeb05d767'
down_revision: Union[str, None] = 'ed5186ac4b27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.add_column(sa.Column('data_fim', sa.Date(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.drop_column('data_fim')

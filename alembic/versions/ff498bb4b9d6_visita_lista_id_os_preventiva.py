"""visita.lista_id — O.S. preventiva referencia a lista de equipamentos (#PREV-OS)

Revision ID: ff498bb4b9d6
Revises: bf54f9b66560
Create Date: 2026-07-02 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff498bb4b9d6'
down_revision: Union[str, None] = 'bf54f9b66560'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lista_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.drop_column('lista_id')

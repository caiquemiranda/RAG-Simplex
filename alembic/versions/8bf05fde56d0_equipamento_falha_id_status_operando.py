"""equipamento.falha_id (estado 'em falha') + status padrão Operando (#EQP-STATUS, D-026)

Revision ID: 8bf05fde56d0
Revises: 34b255a20aa8
Create Date: 2026-06-30 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8bf05fde56d0'
down_revision: Union[str, None] = '34b255a20aa8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #EQP-STATUS (D-026): coluna `falha_id` no equipamento (falha atual, quando "em falha").
    # Backfill do status vazio → "Operando" para os registros existentes.
    with op.batch_alter_table('equipamento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('falha_id', sa.Integer(), nullable=True))
    op.execute("UPDATE equipamento SET status = 'Operando' WHERE status IS NULL OR status = ''")


def downgrade() -> None:
    with op.batch_alter_table('equipamento', schema=None) as batch_op:
        batch_op.drop_column('falha_id')

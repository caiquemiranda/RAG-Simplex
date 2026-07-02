"""equipamento_documento — documentos manuais fixados ao equipamento (#EQP-DOC)

Revision ID: ed5186ac4b27
Revises: ff498bb4b9d6
Create Date: 2026-07-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed5186ac4b27'
down_revision: Union[str, None] = 'ff498bb4b9d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'equipamento_documento',
        sa.Column('equipamento_id', sa.Integer(), nullable=False),
        sa.Column('documento_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['equipamento_id'], ['equipamento.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['documento_id'], ['documento_equipamento.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('equipamento_id', 'documento_id'),
    )


def downgrade() -> None:
    op.drop_table('equipamento_documento')

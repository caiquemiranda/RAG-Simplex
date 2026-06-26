"""cliente: endereco/contato/telefone/email/observacoes (#CLI-PG)

Revision ID: 84ff7bfcb358
Revises: 2681a9da4b28
Create Date: 2026-06-25 20:03:22.768969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84ff7bfcb358'
down_revision: Union[str, None] = '2681a9da4b28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #CLI-PG: só os add_column do cliente. (As create_foreign_key são ruído do SQLite —
    # colunas FK adicionadas por ALTER ADD não carregam a constraint no banco antigo.)
    with op.batch_alter_table('cliente', schema=None) as batch_op:
        batch_op.add_column(sa.Column('endereco', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('contato', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('telefone', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('observacoes', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('cliente', schema=None) as batch_op:
        batch_op.drop_column('observacoes')
        batch_op.drop_column('email')
        batch_op.drop_column('telefone')
        batch_op.drop_column('contato')
        batch_op.drop_column('endereco')

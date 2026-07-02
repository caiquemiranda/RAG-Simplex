"""remove o tipo 'avulsa' das O.S. — back-fill para 'corretiva' (#OS-SEM-AVULSA)

Revision ID: bf54f9b66560
Revises: 5e88d54a7547
Create Date: 2026-07-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'bf54f9b66560'
down_revision: Union[str, None] = '5e88d54a7547'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # #OS-SEM-AVULSA: tipos passam a ser {preventiva, corretiva}. O.S. existentes com
    # tipo="avulsa" viram "corretiva" (decisão do usuário ao remover o tipo).
    op.execute("UPDATE visita SET tipo = 'corretiva' WHERE tipo = 'avulsa'")


def downgrade() -> None:
    # Não há como distinguir as que eram "avulsa"; downgrade é no-op.
    pass

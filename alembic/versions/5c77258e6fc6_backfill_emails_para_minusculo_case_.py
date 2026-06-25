"""backfill: emails para minusculo (case-insensitive)

Revision ID: 5c77258e6fc6
Revises: 2bd03ef0fccf
Create Date: 2026-06-25 15:28:04.785565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c77258e6fc6'
down_revision: Union[str, None] = '2bd03ef0fccf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # E-mails passam a ser case-insensitive (#FIX-EMAIL): normaliza os existentes para
    # minúsculo/sem espaços. Só atualiza onde o destino ainda não colide com outro e-mail
    # (evita violar a unicidade caso haja "A@x" e "a@x"); colisões ficam para tratamento manual.
    op.execute(
        """
        UPDATE usuario
           SET email = lower(trim(email))
         WHERE email <> lower(trim(email))
           AND NOT EXISTS (
               SELECT 1 FROM usuario u2
                WHERE u2.id <> usuario.id
                  AND u2.email = lower(trim(usuario.email))
           )
        """
    )


def downgrade() -> None:
    # Normalização não é reversível (não há como recuperar a capitalização original).
    pass

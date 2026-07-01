"""unifica O.S. na visita: falha + campos doc; remove ordem_servico (D-025)

Revision ID: 34b255a20aa8
Revises: 58e01d15fabc
Create Date: 2026-06-30 12:12:43.147691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34b255a20aa8'
down_revision: Union[str, None] = '58e01d15fabc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # D-025: unifica O.S. na visita. Cria `falha`, remove `ordem_servico`, adiciona colunas
    # de O.S. na `visita`. (FKs extras nas demais tabelas são ruído do SQLite — ignoradas.)
    op.create_table(
        'falha',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=120), nullable=False),
        sa.Column('termo_en', sa.String(length=120), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nome'),
    )
    op.drop_table('ordem_servico')
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo', sa.String(length=20), nullable=False, server_default='corretiva'))
        batch_op.add_column(sa.Column('equipamento_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('falha_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('especialidade', sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column('requisitante', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('data_solicitacao', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('centro_custo', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('numero_os', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('reserva_material', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('material_utilizado', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('endereco', sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column('setor', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('prioridade', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('data_execucao', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('acao_aplicada', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('visita', schema=None) as batch_op:
        batch_op.drop_column('acao_aplicada')
        batch_op.drop_column('data_execucao')
        batch_op.drop_column('prioridade')
        batch_op.drop_column('setor')
        batch_op.drop_column('endereco')
        batch_op.drop_column('material_utilizado')
        batch_op.drop_column('reserva_material')
        batch_op.drop_column('numero_os')
        batch_op.drop_column('centro_custo')
        batch_op.drop_column('data_solicitacao')
        batch_op.drop_column('requisitante')
        batch_op.drop_column('especialidade')
        batch_op.drop_column('falha_id')
        batch_op.drop_column('equipamento_id')
        batch_op.drop_column('tipo')

    op.create_table('ordem_servico',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('cliente_id', sa.INTEGER(), nullable=False),
    sa.Column('equipamento_id', sa.INTEGER(), nullable=True),
    sa.Column('usuario_id', sa.INTEGER(), nullable=True),
    sa.Column('data', sa.DATE(), nullable=False),
    sa.Column('tipo', sa.VARCHAR(length=20), nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), nullable=False),
    sa.Column('descricao', sa.TEXT(), nullable=False),
    sa.Column('solucao', sa.TEXT(), nullable=True),
    sa.Column('criado_em', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['equipamento_id'], ['equipamento.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.drop_table('falha')
    # ### end Alembic commands ###

"""add user_id to receipts

Revision ID: 41cb324ae2bc
Revises: bcd01591ad90
Create Date: 2026-05-15 03:50:21.072846

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41cb324ae2bc'
down_revision: Union[str, Sequence[str], None] = 'bcd01591ad90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('receipts', sa.Column('user_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_receipts_user_id'), 'receipts', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_receipts_user_id'), table_name='receipts')
    op.drop_column('receipts', 'user_id')

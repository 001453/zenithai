"""Order tablosuna realized_pnl alanı ekle (günlük kar/zarar takibi).

Revision ID: 002
Revises: 001
Create Date: 2025-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("realized_pnl", sa.Numeric(20, 8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "realized_pnl")

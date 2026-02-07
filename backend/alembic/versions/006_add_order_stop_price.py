"""orders tablosuna stop_price ekle (stop emirler için).

Revision ID: 006
Revises: 005
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("stop_price", sa.Numeric(20, 8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "stop_price")

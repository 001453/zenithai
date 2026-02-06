"""Users.created_at sütununu TIMESTAMPTZ yap (timezone-aware).

Revision ID: 004
Revises: 003
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Varsayılan: mevcut veriyi UTC kabul edip TIMESTAMPTZ'e çevir.
    op.alter_column(
        "users",
        "created_at",
        existing_type=sa.DateTime(timezone=False),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )


def downgrade() -> None:
    # Geri dönüş: timezone bilgisini kaldır, naive timestamp'a dön.
    op.alter_column(
        "users",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(timezone=False),
        existing_nullable=True,
        postgresql_using="created_at",
    )


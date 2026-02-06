"""Convert timestamp columns to TIMESTAMP WITH TIME ZONE across all tables.

Revision ID: 005
Revises: 004
Create Date: 2026-02-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert strategies.created_at to TIMESTAMPTZ
    op.alter_column(
        "strategies",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # Convert orders timestamps to TIMESTAMPTZ
    op.alter_column(
        "orders",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "orders",
        "filled_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="filled_at AT TIME ZONE 'UTC'",
    )

    # Convert positions.updated_at to TIMESTAMPTZ
    op.alter_column(
        "positions",
        "updated_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="updated_at AT TIME ZONE 'UTC'",
    )

    # Convert risk_limits.created_at to TIMESTAMPTZ
    op.alter_column(
        "risk_limits",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # Convert backtest_runs.created_at to TIMESTAMPTZ
    op.alter_column(
        "backtest_runs",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # Convert ml_models.created_at to TIMESTAMPTZ
    op.alter_column(
        "ml_models",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )


def downgrade() -> None:
    # Revert all columns back to TIMESTAMP WITHOUT TIME ZONE
    op.alter_column(
        "strategies",
        "created_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "orders",
        "created_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "orders",
        "filled_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="filled_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "positions",
        "updated_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="updated_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "risk_limits",
        "created_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "backtest_runs",
        "created_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "ml_models",
        "created_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

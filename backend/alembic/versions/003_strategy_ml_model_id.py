"""Strategy tablosuna ml_model_id ekle (ML sinyal entegrasyonu).

Revision ID: 003
Revises: 002
Create Date: 2025-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "strategies",
        sa.Column("ml_model_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_strategies_ml_model_id",
        "strategies",
        "ml_models",
        ["ml_model_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_strategies_ml_model_id", "strategies", ["ml_model_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_strategies_ml_model_id", table_name="strategies")
    op.drop_constraint("fk_strategies_ml_model_id", "strategies", type_="foreignkey")
    op.drop_column("strategies", "ml_model_id")

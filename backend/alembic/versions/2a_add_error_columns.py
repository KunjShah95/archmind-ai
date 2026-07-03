"""Add error tracking columns to Analysis model

Revision ID: 2a_add_error_columns
Revises: 48c640f994b3
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2a_add_error_columns"
down_revision: str | None = "48c640f994b3"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("error_code", sa.String(64), nullable=True))
    op.add_column("analyses", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("analyses", sa.Column("failed_step", sa.String(64), nullable=True))
    op.add_column("analyses", sa.Column("used_heuristic", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("analyses", sa.Column("score_source", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "score_source")
    op.drop_column("analyses", "used_heuristic")
    op.drop_column("analyses", "failed_step")
    op.drop_column("analyses", "error_message")
    op.drop_column("analyses", "error_code")

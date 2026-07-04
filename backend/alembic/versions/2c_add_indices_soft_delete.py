"""Add indices, soft delete columns, audit fields

Revision ID: 2c_add_indices_soft_delete
Revises: 2a_add_error_columns
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2c_add_indices_soft_delete"
down_revision: str | None = "2a_add_error_columns"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add soft delete columns
    op.add_column("analyses", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("findings", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # Add audit fields to findings
    op.add_column("findings", sa.Column("modified_by", postgresql.UUID(), nullable=True))
    op.add_column("findings", sa.Column("modified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("findings", sa.Column("confidence", sa.Float(), nullable=True))

    # Add indices
    op.create_index(op.f("ix_findings_analysis_id"), "findings", ["analysis_id"])
    op.create_index(op.f("ix_findings_agent"), "findings", ["agent"])
    op.create_index(op.f("ix_analyses_workspace_id"), "analyses", ["workspace_id"])
    op.create_index(op.f("ix_analyses_author_id"), "analyses", ["author_id"])
    op.create_index(op.f("ix_workspace_members_user_id"), "workspace_members", ["user_id"])
    op.create_index(op.f("ix_workspace_members_workspace_id"), "workspace_members", ["workspace_id"])


def downgrade() -> None:
    # Drop indices
    op.drop_index(op.f("ix_workspace_members_workspace_id"), table_name="workspace_members")
    op.drop_index(op.f("ix_workspace_members_user_id"), table_name="workspace_members")
    op.drop_index(op.f("ix_analyses_author_id"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_workspace_id"), table_name="analyses")
    op.drop_index(op.f("ix_findings_agent"), table_name="findings")
    op.drop_index(op.f("ix_findings_analysis_id"), table_name="findings")

    # Drop columns
    op.drop_column("findings", "confidence")
    op.drop_column("findings", "modified_at")
    op.drop_column("findings", "modified_by")
    op.drop_column("findings", "deleted_at")
    op.drop_column("analyses", "deleted_at")

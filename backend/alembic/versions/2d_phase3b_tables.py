"""Add Phase 3B tables: failed_analyses, share_links, audit_events, finding_versions

Revision ID: 2d_phase3b_tables
Revises: 2c_add_indices_soft_delete
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2d_phase3b_tables"
down_revision: str | None = "2c_add_indices_soft_delete"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "failed_analyses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("failed_step", sa.String(64), nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_failed_analyses_analysis_id"), "failed_analyses", ["analysis_id"])

    op.create_table(
        "share_links",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("scope", sa.String(32), nullable=False, server_default="read"),
        sa.Column("created_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_share_links_analysis_id"), "share_links", ["analysis_id"])
    op.create_index(op.f("ix_share_links_token"), "share_links", ["token"], unique=True)

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), nullable=True),
        sa.Column("analysis_id", sa.String(36), nullable=True),
        sa.Column("actor_id", sa.String(36), nullable=True),
        sa.Column("actor_name", sa.String(255), nullable=False),
        sa.Column("actor_email", sa.String(255), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_audit_events_workspace_id"), "audit_events", ["workspace_id"])
    op.create_index(op.f("ix_audit_events_analysis_id"), "audit_events", ["analysis_id"])
    op.create_index(op.f("ix_audit_events_action"), "audit_events", ["action"])

    op.create_table(
        "finding_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(32), nullable=False),
        sa.Column("summary", sa.String(512), nullable=False),
        sa.Column("author_id", sa.String(36), nullable=False),
        sa.Column("author_name", sa.String(255), nullable=False),
        sa.Column("scores", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_finding_versions_analysis_id"), "finding_versions", ["analysis_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_finding_versions_analysis_id"), table_name="finding_versions")
    op.drop_table("finding_versions")

    op.drop_index(op.f("ix_audit_events_action"), table_name="audit_events")
    op.drop_index(op.f("ix_audit_events_analysis_id"), table_name="audit_events")
    op.drop_index(op.f("ix_audit_events_workspace_id"), table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index(op.f("ix_share_links_token"), table_name="share_links")
    op.drop_index(op.f("ix_share_links_analysis_id"), table_name="share_links")
    op.drop_table("share_links")

    op.drop_index(op.f("ix_failed_analyses_analysis_id"), table_name="failed_analyses")
    op.drop_table("failed_analyses")

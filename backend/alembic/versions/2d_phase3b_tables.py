"""Add Phase 3B tables: failed_analyses, share_links, audit_events, finding_versions

Revision ID: 2d_phase3b_tables
Revises: 2c_add_indices_soft_delete
Create Date: 2026-07-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2d_phase3b_tables"
down_revision: str | None = "2c_add_indices_soft_delete"
branch_labels: str | None = None
depends_on: str | None = None


def _has_table(conn, name: str) -> bool:
    result = conn.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:n"),
        {"n": name},
    )
    return result.fetchone() is not None


def _has_index(conn, name: str) -> bool:
    result = conn.execute(
        sa.text("SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=:n"),
        {"n": name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    if not _has_table(conn, "failed_analyses"):
        op.create_table(
            "failed_analyses",
            sa.Column("id", postgresql.UUID(), primary_key=True),
            sa.Column("analysis_id", postgresql.UUID(), sa.ForeignKey("analyses.id"), nullable=False),
            sa.Column("error_code", sa.String(64), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("failed_step", sa.String(64), nullable=True),
            sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not _has_index(conn, "ix_failed_analyses_analysis_id"):
        op.create_index(op.f("ix_failed_analyses_analysis_id"), "failed_analyses", ["analysis_id"])

    if not _has_table(conn, "share_links"):
        op.create_table(
            "share_links",
            sa.Column("id", postgresql.UUID(), primary_key=True),
            sa.Column("analysis_id", postgresql.UUID(), sa.ForeignKey("analyses.id"), nullable=False),
            sa.Column("token", sa.String(64), nullable=False, unique=True),
            sa.Column("scope", sa.String(32), nullable=False, server_default="read"),
            sa.Column("created_by", postgresql.UUID(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not _has_index(conn, "ix_share_links_analysis_id"):
        op.create_index(op.f("ix_share_links_analysis_id"), "share_links", ["analysis_id"])
    if not _has_index(conn, "ix_share_links_token"):
        op.create_index(op.f("ix_share_links_token"), "share_links", ["token"], unique=True)

    if not _has_table(conn, "audit_events"):
        op.create_table(
            "audit_events",
            sa.Column("id", postgresql.UUID(), primary_key=True),
            sa.Column("workspace_id", postgresql.UUID(), nullable=True),
            sa.Column("analysis_id", postgresql.UUID(), nullable=True),
            sa.Column("actor_id", postgresql.UUID(), nullable=True),
            sa.Column("actor_name", sa.String(255), nullable=False),
            sa.Column("actor_email", sa.String(255), nullable=False),
            sa.Column("action", sa.String(64), nullable=False),
            sa.Column("entity_type", sa.String(32), nullable=False),
            sa.Column("entity_id", postgresql.UUID(), nullable=False),
            sa.Column("event_metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
    if not _has_index(conn, "ix_audit_events_workspace_id"):
        op.create_index(op.f("ix_audit_events_workspace_id"), "audit_events", ["workspace_id"])
    if not _has_index(conn, "ix_audit_events_analysis_id"):
        op.create_index(op.f("ix_audit_events_analysis_id"), "audit_events", ["analysis_id"])
    if not _has_index(conn, "ix_audit_events_action"):
        op.create_index(op.f("ix_audit_events_action"), "audit_events", ["action"])

    if not _has_table(conn, "finding_versions"):
        op.create_table(
            "finding_versions",
            sa.Column("id", postgresql.UUID(), primary_key=True),
            sa.Column("analysis_id", postgresql.UUID(), sa.ForeignKey("analyses.id"), nullable=False),
            sa.Column("version_no", sa.Integer(), nullable=False),
            sa.Column("change_type", sa.String(32), nullable=False),
            sa.Column("summary", sa.String(512), nullable=False),
            sa.Column("author_id", postgresql.UUID(), nullable=False),
            sa.Column("author_name", sa.String(255), nullable=False),
            sa.Column("scores", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
    if not _has_index(conn, "ix_finding_versions_analysis_id"):
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

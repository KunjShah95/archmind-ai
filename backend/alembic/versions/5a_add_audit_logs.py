"""Add audit_logs table (Phase 5 security)

Revision ID: 5a_add_audit_logs
Revises: 2d_phase3b_tables
Create Date: 2026-07-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "5a_add_audit_logs"
down_revision: str | None = "2d_phase3b_tables"
branch_labels: str | None = None
depends_on: str | None = None


def _has_table(conn, name: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name=:n"
        ),
        {"n": name},
    )
    return result.fetchone() is not None


def _has_index(conn, name: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=:n"
        ),
        {"n": name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    if not _has_table(conn, "audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", postgresql.UUID(), primary_key=True),
            sa.Column("actor_id", postgresql.UUID(), nullable=True),
            sa.Column("action", sa.String(64), nullable=False),
            sa.Column("entity_type", sa.String(64), nullable=True),
            sa.Column("entity_id", sa.String(64), nullable=True),
            sa.Column("event_metadata", sa.JSON(), nullable=True),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )

    if not _has_index(conn, "ix_audit_logs_actor_id"):
        op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    if not _has_index(conn, "ix_audit_logs_action"):
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    if not _has_index(conn, "ix_audit_logs_created_at"):
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_table("audit_logs")

"""Fix audit_logs legacy 'metadata' column -> 'event_metadata'

Revision ID: 5b_fix_audit_logs_metadata
Revises: 5a_add_audit_logs
Create Date: 2026-07-20

Some environments created ``audit_logs`` from an older schema whose JSON column
was named ``metadata``. Migration 5a creates the table inside a ``_has_table``
guard, so where the table already existed it was skipped and the column kept the
old name. The ORM (``models.AuditLog.event_metadata``) inserts into
``event_metadata``, so every ``log_audit_event`` INSERT raised
``column "event_metadata" does not exist`` -> HTTP 500 on any endpoint that
writes an audit log (analysis create/upload, GDPR export/delete).

This migration renames the legacy column when present. It is a no-op on fresh
databases (which already have ``event_metadata``) and on any DB already fixed.
"""
from alembic import op
import sqlalchemy as sa


revision: str = "5b_fix_audit_logs_metadata"
down_revision: str | None = "5a_add_audit_logs"
branch_labels: str | None = None
depends_on: str | None = None


def _has_column(conn, table: str, column: str) -> bool:
    # sa.inspect respects the active schema/search_path and is dialect-agnostic
    # (works on the sqlite dev DB and Postgres alike, incl. custom schemas).
    inspector = sa.inspect(conn)
    return column in {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    conn = op.get_bind()
    if _has_column(conn, "audit_logs", "metadata") and not _has_column(
        conn, "audit_logs", "event_metadata"
    ):
        op.alter_column("audit_logs", "metadata", new_column_name="event_metadata")


def downgrade() -> None:
    conn = op.get_bind()
    if _has_column(conn, "audit_logs", "event_metadata") and not _has_column(
        conn, "audit_logs", "metadata"
    ):
        op.alter_column("audit_logs", "event_metadata", new_column_name="metadata")

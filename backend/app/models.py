import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    plan: Mapped[str] = mapped_column(String(32), default="hobby")
    analyses_used: Mapped[int] = mapped_column(Integer, default=0)
    analyses_limit: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="user")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="author")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(32), default="hobby")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="editor")

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["Profile"] = relationship(back_populates="memberships")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("workspaces.id"), index=True)
    author_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("profiles.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    name: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(32))
    diagram_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    scores: Mapped[dict] = mapped_column(JSON, default=dict)
    diagram_nodes: Mapped[list] = mapped_column(JSON, default=list)
    diagram_edges: Mapped[list] = mapped_column(JSON, default=list)
    # Phase 1: Generator / Redesign / Pair Architect support
    analysis_mode: Mapped[str] = mapped_column(String(32), default="review")
    generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_artifacts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mediator_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    failed_step: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    used_heuristic: Mapped[bool] = mapped_column(Boolean, default=False)
    score_source: Mapped[str | None] = mapped_column(String(32), nullable=True, default=None)

    workspace: Mapped["Workspace"] = relationship(back_populates="analyses")
    author: Mapped["Profile"] = relationship(back_populates="analyses")
    findings: Mapped[list["Finding"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    agent: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)
    node_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    modified_by: Mapped[str | None] = mapped_column(Uuid(), nullable=True, default=None)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    confidence: Mapped[float | None] = mapped_column(nullable=True, default=None)

    analysis: Mapped["Analysis"] = relationship(back_populates="findings")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("analyses.id", ondelete="CASCADE"))
    user_id: Mapped[str | None] = mapped_column(Uuid(), ForeignKey("profiles.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    analysis: Mapped["Analysis"] = relationship(back_populates="messages")


class FailedAnalysis(Base):
    __tablename__ = "failed_analyses"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("analyses.id"), index=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    failed_step: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    analysis: Mapped["Analysis"] = relationship()


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("analyses.id"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    scope: Mapped[str] = mapped_column(String(32), default="read")
    created_by: Mapped[str | None] = mapped_column(Uuid(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    analysis: Mapped["Analysis"] = relationship()


class WorkspaceQuota(Base):
    __tablename__ = "workspace_quotas"

    workspace_id: Mapped[str] = mapped_column(Uuid(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    max_analyses: Mapped[int] = mapped_column(Integer, default=10)
    current_analyses: Mapped[int] = mapped_column(Integer, default=0)

    workspace: Mapped["Workspace"] = relationship(back_populates="quota")


# Add back-populates for Workspace
Workspace.quota: Mapped["WorkspaceQuota"] = relationship(back_populates="workspace")

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    """Base for response schemas read off ORM rows.

    Supabase uses native ``uuid`` columns, so the driver returns ``UUID``
    objects where these schemas declare ``str``. Coerce them before validation
    so the same schema serves both SQLite (str ids) and Supabase (uuid ids).
    """

    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="before")
    @classmethod
    def _stringify_uuid(cls, v: Any) -> Any:
        return str(v) if isinstance(v, uuid.UUID) else v


class ProfileOut(ORMModel):
    id: str
    email: str
    full_name: str | None
    plan: str
    analyses_used: int
    analyses_limit: int


class WorkspaceOut(ORMModel):
    id: str
    name: str
    slug: str
    plan: str
    member_count: int = 0
    analysis_count: int = 0


class WorkspaceMemberOut(ORMModel):
    id: str
    user_id: str
    email: str
    full_name: str | None
    role: str


class FindingOut(ORMModel):
    id: str
    agent: str
    severity: str
    title: str
    summary: str
    recommendation: str
    node_id: str | None = None


class AnalysisSummary(ORMModel):
    id: str
    name: str
    diagram_type: str | None
    status: str
    scores: dict[str, int]
    workspace: str
    workspace_id: str
    author: str
    author_id: str
    uploaded_at: datetime


class AnalysisDetail(AnalysisSummary):
    source_type: str
    diagram_nodes: list[dict[str, Any]]
    diagram_edges: list[dict[str, Any]]
    findings: list[FindingOut]


class CreateAnalysisBody(BaseModel):
    name: str = "Untitled architecture"
    workspace_id: str | None = None
    source_type: str = "paste"
    diagram_type: str | None = None
    source_content: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatMessageOut(ORMModel):
    id: str
    role: str
    content: str
    created_at: datetime


class DemoLoginRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ProfileOut


class DashboardStats(BaseModel):
    total_analyses: int
    avg_score: int
    critical_findings: int
    resolved_findings: int
    analyses_used: int
    analyses_limit: int
    plan: str

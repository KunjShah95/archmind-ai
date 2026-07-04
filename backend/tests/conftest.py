"""Shared pytest fixtures — isolated in-memory DB for pipeline tests."""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
# Import models so their tables register on Base.metadata before create_all.
import app.models  # noqa: F401

# Provider env vars that would route the agent engine to a live LLM.
_LLM_ENV_VARS = [
    "LLM_PROVIDER_ORDER", "OLLAMA_BASE_URL", "GROQ_API_KEY", "NVIDIA_API_KEY",
    "OPENROUTER_API_KEY", "GEMINI_API_KEY", "HF_API_KEY",
    "OPENAI_API_KEY", "OPENAI_BASE_URL",
]


@pytest.fixture(autouse=True)
def _no_live_llm(monkeypatch):
    """Force the deterministic heuristic engine in tests.

    config.py calls load_dotenv(), which can pull a real provider key into the
    environment and make agent/pipeline tests hit a live LLM (slow, flaky).
    Clear the keys so every test uses the heuristic path.
    """
    for var in _LLM_ENV_VARS:
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def db():
    """Fresh in-memory SQLite session (FK enforcement off — insert rows freely).

    Uses StaticPool + expire_on_commit=False so the single in-memory database
    connection is shared with the TestClient (which runs on a different thread).
    """
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db):
    """FastAPI TestClient with an overridden get_db dependency that returns the in-memory db session."""
    from unittest.mock import patch
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import get_db

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with patch("app.main.init_db"):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_user(db):
    """Creates and returns a Profile + ensures they have a default workspace."""
    from app.auth import get_or_create_profile, ensure_default_workspace, create_access_token
    user_id = uuid.uuid4()
    profile = get_or_create_profile(db, str(user_id), "test@example.com", "Test User")
    ws = ensure_default_workspace(db, profile)
    token = create_access_token(profile.id, profile.email)
    return profile, token, ws


@pytest.fixture
def seed_workspace(db, auth_user):
    """Creates a second workspace + member for isolation tests."""
    profile, token, ws = auth_user
    from app.models import Workspace, WorkspaceMember
    ws2 = Workspace(name="Other Workspace", slug="other-ws", plan="hobby")
    db.add(ws2)
    db.flush()
    from app.models import Profile as ProfileModel
    other_id = uuid.uuid4()
    other = ProfileModel(id=str(other_id), email="other@example.com", full_name="Other User")
    db.add(other)
    db.flush()
    db.add(WorkspaceMember(workspace_id=ws2.id, user_id=other.id, role="owner"))
    db.commit()
    db.refresh(ws2)
    return ws2, other

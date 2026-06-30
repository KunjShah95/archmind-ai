"""Shared pytest fixtures — isolated in-memory DB for pipeline tests."""

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
    """Fresh in-memory SQLite session (FK enforcement off — insert rows freely)."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()

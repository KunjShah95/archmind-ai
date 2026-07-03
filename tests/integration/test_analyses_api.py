# tests/integration/test_analyses_api.py

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.core.config import settings

client = TestClient(app)


@pytest.fixture
def auth_user(seed_workspace):
    """Fixture to authenticate a test user and return their token."""
    workspace_id, user_id, token = seed_workspace
    return token


@pytest.fixture
def seed_workspace_with_quota(seed_workspace):
    """Fixture to seed a workspace with quota limits."""
    workspace_id, user_id, token = seed_workspace
    from app.db.models import WorkspaceQuota
    from app.db.session import get_db

    db = next(get_db())
    quota = WorkspaceQuota(
        workspace_id=workspace_id,
        max_analyses=0,  # Set to 0 to trigger 402
        current_analyses=0,
    )
    db.add(quota)
    db.commit()
    db.refresh(quota)
    return workspace_id, user_id, token


def test_create_analysis_with_quota_enforcement(auth_user, seed_workspace_with_quota):
    """Test that creating an analysis enforces quota limits."""
    workspace_id, user_id, token = seed_workspace_with_quota

    response = client.post(
        "/api/analyses",
        json={
            "name": "Test Analysis",
            "description": "Test Description",
            "config": {},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_402_PAYMENT_REQUIRED
    assert "quota" in response.json().get("detail", "").lower()


def test_workspace_isolation(auth_user, seed_workspace):
    """Test that users cannot access analyses from other workspaces."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis in the seeded workspace
    response = client.post(
        "/api/analyses",
        json={
            "name": "Test Analysis",
            "description": "Test Description",
            "config": {},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    analysis_id = response.json()["id"]

    # Create a new workspace and user for unauthorized access
    from app.db.models import Workspace, User
    from app.core.security import create_access_token
    from app.db.session import get_db

    db = next(get_db())
    workspace = Workspace(name="Unauthorized Workspace")
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    user = User(
        email="unauthorized@example.com",
        hashed_password="fakehashedpassword",
        workspace_id=workspace.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    unauthorized_token = create_access_token(sub=user.id)

    # Attempt to access the analysis with the unauthorized user
    response = client.get(
        f"/api/analyses/{analysis_id}",
        headers={"Authorization": f"Bearer {unauthorized_token}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
# tests/integration/test_router_access_control.py

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.core.config import settings

client = TestClient(app)


@pytest.fixture
def auth_user(seed_workspace):
    """Fixture to authenticate a test user and return their token."""
    workspace_id, user_id, token = seed_workspace
    return token


@pytest.fixture
def unauthorized_user(seed_workspace):
    """Fixture to simulate an unauthorized user (different workspace)."""
    # Create a new workspace and user for unauthorized access
    from app.db.session import get_db
    from app.db.models import Workspace, User
    from app.core.security import create_access_token

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

    token = create_access_token(sub=user.id)
    return token


@pytest.fixture
def existing_analysis(seed_workspace):
    """Fixture to create an existing analysis for testing."""
    workspace_id, user_id, token = seed_workspace
    from app.db.models import Analysis
    from app.db.session import get_db

    db = next(get_db())
    analysis = Analysis(
        id="test-analysis-id",
        name="Test Analysis",
        description="Test Description",
        workspace_id=workspace_id,
        created_by=user_id,
        status="pending",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis.id


@pytest.mark.parametrize(
    "endpoint",
    [
        "/{analysis_id}/status",
        "/{analysis_id}/results",
        "/{analysis_id}/logs",
        "/{analysis_id}/cancel",
        "/{analysis_id}/retry",
    ],
)
def test_unauthorized_access_returns_404(endpoint, auth_user, unauthorized_user, existing_analysis):
    """Test that unauthorized users receive 404 for all analysis endpoints."""
    # Replace {analysis_id} in the endpoint with the existing analysis ID
    formatted_endpoint = endpoint.format(analysis_id=existing_analysis)

    # Test with unauthorized user
    response = client.get(
        formatted_endpoint,
        headers={"Authorization": f"Bearer {unauthorized_user}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Test with no authentication
    response = client.get(formatted_endpoint)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize(
    "endpoint, method",
    [
        ("/{analysis_id}/cancel", "POST"),
        ("/{analysis_id}/retry", "POST"),
    ],
)
def test_unauthorized_post_access_returns_404(endpoint, method, auth_user, unauthorized_user, existing_analysis):
    """Test that unauthorized users receive 404 for POST endpoints."""
    formatted_endpoint = endpoint.format(analysis_id=existing_analysis)

    # Test with unauthorized user
    response = client.request(
        method,
        formatted_endpoint,
        headers={"Authorization": f"Bearer {unauthorized_user}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Test with no authentication
    response = client.request(method, formatted_endpoint)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
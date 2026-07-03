"""Access control: non-members must get 404 on all analysis-id endpoints."""

import pytest
from fastapi.testclient import TestClient


ENDPOINTS_WITH_ID = [
    ("GET", "/api/analyses/{id}"),
    ("GET", "/api/analyses/{id}/chat"),
    ("POST", "/api/analyses/{id}/chat"),
    ("GET", "/api/analyses/{id}/export/json"),
    ("GET", "/api/analyses/{id}/agents/scalability"),
    ("POST", "/api/analyses/{id}/simulate"),
    ("POST", "/api/analyses/{id}/chaos"),
    ("POST", "/api/analyses/{id}/debate"),
    ("POST", "/api/analyses/{id}/benchmark"),
    ("POST", "/api/analyses/{id}/redesign"),
    ("GET", "/api/analyses/{id}/learn"),
    ("GET", "/api/analyses/{id}/learn/db"),
    ("GET", "/api/analyses/{id}/graph/dependencies/db"),
    ("GET", "/api/analyses/{id}/graph/impact"),
    ("GET", "/api/analyses/{id}/report/cto"),
    ("GET", "/api/analyses/{id}/docs/readme"),
    ("POST", "/api/analyses/{id}/cloud/scan"),
    ("GET", "/api/analyses/{id}/finops"),
    ("GET", "/api/analyses/{id}/compliance"),
]


def make_body(method: str, path: str) -> dict | None:
    if method != "POST":
        return None
    if "chaos" in path:
        return {"failed_node_id": "node-fake"}
    if "debate" in path:
        return {"topic": "test topic"}
    if "redesign" in path:
        return {"strategy": "cost_optimized"}
    return {"message": "test"}


class TestNonMemberAccess:
    """Every endpoint that takes an analysis_id must 404 for non-members."""

    @pytest.mark.parametrize("method,path", ENDPOINTS_WITH_ID)
    def test_non_member_gets_404(self, method, path, client, db, auth_user):
        profile, token, ws = auth_user
        from app.models import Analysis
        a = Analysis(
            workspace_id=ws.id, author_id=profile.id,
            name="Test", source_type="paste", source_content="graph TB\nA-->B",
            status="ready",
        )
        db.add(a)
        db.commit()
        db.refresh(a)

        from app.models import Profile as ProfileModel
        intruder = ProfileModel(id="intruder-id", email="intruder@evil.com", full_name="Intruder")
        db.add(intruder)
        db.commit()

        from app.auth import create_access_token
        bad_token = create_access_token(intruder.id, intruder.email)
        url = path.replace("{id}", a.id)
        if "cloud/scan" in url:
            url += "?provider=aws"
        body = make_body(method, path)

        if body:
            resp = client.request(method, url, json=body, headers={"Authorization": f"Bearer {bad_token}"})
        else:
            resp = client.request(method, url, headers={"Authorization": f"Bearer {bad_token}"})

        assert resp.status_code == 404, f"{method} {url} returned {resp.status_code} instead of 404"

"""Tests for POST /api/analyses and GET /api/analyses."""

from fastapi.testclient import TestClient
from app.models import Analysis


class TestCreateAnalysis:
    def test_create_analysis_paste(self, client, auth_user):
        profile, token, ws = auth_user
        resp = client.post(
            "/api/analyses",
            json={
                "name": "Test Diagram",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "queued"
        assert data["name"] == "Test Diagram"

    def test_create_analysis_empty_content_rejected(self, client, auth_user):
        profile, token, ws = auth_user
        resp = client.post(
            "/api/analyses",
            json={
                "name": "Empty",
                "source_type": "paste",
                "source_content": "",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400

    def test_quota_enforcement(self, client, db, auth_user):
        profile, token, ws = auth_user
        profile.analyses_used = profile.analyses_limit
        db.commit()
        resp = client.post(
            "/api/analyses",
            json={
                "name": "Over Quota",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 402

    def test_workspace_isolation(self, client, db, auth_user, seed_workspace):
        """User cannot create an analysis in a workspace they don't belong to."""
        profile, token, ws = auth_user
        other_ws, _ = seed_workspace
        resp = client.post(
            "/api/analyses",
            json={
                "name": "Hijack Attempt",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
                "workspace_id": other_ws.id,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_workspace_id_defaults_to_users_workspace(self, client, auth_user):
        profile, token, ws = auth_user
        resp = client.post(
            "/api/analyses",
            json={
                "name": "No WS specified",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["workspace_id"] == ws.id


class TestListAnalyses:
    def test_list_analyses(self, client, db, auth_user):
        profile, token, ws = auth_user
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A1", source_type="paste", status="ready")
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A2", source_type="paste", status="analyzing")
        db.add_all([a1, a2])
        db.commit()
        resp = client.get("/api/analyses", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2

    def test_list_analyses_search(self, client, db, auth_user):
        profile, token, ws = auth_user
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="Payment Service", source_type="paste", status="ready")
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="User Auth", source_type="paste", status="ready")
        db.add_all([a1, a2])
        db.commit()
        resp = client.get("/api/analyses?q=Payment", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Payment Service"

    def test_list_analyses_excludes_other_workspace(self, client, db, auth_user, seed_workspace):
        """User should only see their own workspace analyses."""
        profile, token, ws = auth_user
        ws2, other = seed_workspace

        # Create analyses in both workspaces
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="Mine", source_type="paste", status="ready")
        a2 = Analysis(workspace_id=ws2.id, author_id=other.id, name="Theirs", source_type="paste", status="ready")
        db.add_all([a1, a2])
        db.commit()

        resp = client.get("/api/analyses", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Mine"

    def test_list_analyses_unauthenticated(self, client):
        resp = client.get("/api/analyses")
        assert resp.status_code == 401


class TestGetAnalysis:
    def test_get_analysis_success(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = Analysis(
            workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste",
            status="ready", scores={"scalability": 80, "security": 75}
        )
        db.add(a)
        db.commit()

        resp = client.get(f"/api/analyses/{a.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == a.id
        assert data["name"] == "Test"
        assert data["scores"]["scalability"] == 80

    def test_get_analysis_non_member_404(self, client, db, auth_user, seed_workspace):
        profile, token, ws = auth_user
        ws2, other = seed_workspace

        # Create analysis in other workspace
        a = Analysis(workspace_id=ws2.id, author_id=other.id, name="Other", source_type="paste", status="ready")
        db.add(a)
        db.commit()

        resp = client.get(f"/api/analyses/{a.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404

    def test_get_analysis_nonexistent_404(self, client, auth_user):
        profile, token, ws = auth_user
        resp = client.get("/api/analyses/nonexistent-id", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404

    def test_get_analysis_unauthenticated(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", status="ready")
        db.add(a)
        db.commit()

        resp = client.get(f"/api/analyses/{a.id}")
        assert resp.status_code == 401


class TestAnalysisStatus:
    def test_get_analysis_status_polling(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", status="analyzing")
        db.add(a)
        db.commit()

        # Status endpoint should allow polling
        resp = client.get(f"/api/analyses/{a.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "analyzing"


class TestAnalysisQuota:
    def test_quota_decremented_on_quota_success(self, client, db, auth_user):
        profile, token, ws = auth_user
        initial_used = profile.analyses_used

        resp = client.post(
            "/api/analyses",
            json={
                "name": "Test",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # Verify quota was incremented
        db.refresh(profile)
        assert profile.analyses_used == initial_used + 1

    def test_quota_limit_custom(self, client, db, auth_user):
        profile, token, ws = auth_user
        # Set a low limit
        profile.analyses_limit = 2
        profile.analyses_used = 2
        db.commit()

        resp = client.post(
            "/api/analyses",
            json={
                "name": "Over limit",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 402
        detail = resp.json().get("detail", "")
        assert "limit" in detail.lower()

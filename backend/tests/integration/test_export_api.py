"""Tests for GET /api/analyses/{id}/export/{fmt}."""

import json
from fastapi.testclient import TestClient
from app.models import Analysis, Finding


class TestExport:
    def _seed_analysis(self, db, ws, profile):
        a = Analysis(
            workspace_id=ws.id, author_id=profile.id,
            name="Export Test", source_type="paste",
            source_content="graph TB\nA-->B", status="ready",
            scores={"scalability": 85, "security": 70},
        )
        db.add(a)
        db.flush()
        db.add(Finding(analysis_id=a.id, agent="scalability", severity="high",
                       title="No horizontal scaling", summary="...", recommendation="Add replicas"))
        db.commit()
        db.refresh(a)
        return a

    def test_export_json(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/json", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/json"
        data = json.loads(resp.content)
        assert data["name"] == "Export Test"

    def test_export_markdown(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/markdown", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "text/markdown" in resp.headers["content-type"]

    def test_export_html(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/html", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "text/html" in resp.headers["content-type"]

    def test_export_csv(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/csv", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    def test_export_pdf(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/pdf", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert len(resp.content) > 100

    def test_export_invalid_format(self, client, db, auth_user):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        resp = client.get(f"/api/analyses/{a.id}/export/docx", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 400

    def test_export_blocks_non_member(self, client, db, auth_user, seed_workspace):
        profile, token, ws = auth_user
        a = self._seed_analysis(db, ws, profile)
        other_ws, other_user = seed_workspace
        from app.auth import create_access_token
        bad_token = create_access_token(other_user.id, other_user.email)
        resp = client.get(f"/api/analyses/{a.id}/export/json", headers={"Authorization": f"Bearer {bad_token}"})
        assert resp.status_code == 404

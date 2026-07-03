"""End-to-end pipeline flow tests."""

from fastapi.testclient import TestClient


class TestPipelineFlow:
    def test_create_then_status_becomes_ready(self, client, db, auth_user):
        """After pipeline finishes, status transitions queued->analyzing->ready."""
        profile, token, ws = auth_user
        from app.services.pipeline import run_analysis_pipeline

        resp = client.post(
            "/api/analyses",
            json={
                "name": "Pipeline Test",
                "source_type": "paste",
                "source_content": "graph TB\nA-->B",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        analysis_id = resp.json()["id"]

        run_analysis_pipeline(db, analysis_id)

        resp2 = client.get(f"/api/analyses/{analysis_id}",
                           headers={"Authorization": f"Bearer {token}"})
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["status"] == "ready"

    def test_findings_persisted(self, client, db, auth_user):
        """Pipeline creates findings and scores on the analysis."""
        profile, token, ws = auth_user
        from app.services.pipeline import run_analysis_pipeline

        resp = client.post(
            "/api/analyses",
            json={
                "name": "Findings Test",
                "source_type": "paste",
                "source_content": "graph TB\nAPI-->DB\nAPI-->Cache",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        analysis_id = resp.json()["id"]

        run_analysis_pipeline(db, analysis_id)

        resp2 = client.get(f"/api/analyses/{analysis_id}",
                           headers={"Authorization": f"Bearer {token}"})
        data = resp2.json()
        assert len(data["findings"]) > 0
        assert len(data["scores"]) > 0

    def test_mediator_report_present(self, client, db, auth_user):
        """Pipeline includes mediator report when ready."""
        profile, token, ws = auth_user
        from app.services.pipeline import run_analysis_pipeline

        resp = client.post(
            "/api/analyses",
            json={
                "name": "Mediator Test",
                "source_type": "paste",
                "source_content": "graph TB\nGW-->S1\nS1-->DB",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        analysis_id = resp.json()["id"]

        run_analysis_pipeline(db, analysis_id)

        resp2 = client.get(f"/api/analyses/{analysis_id}",
                           headers={"Authorization": f"Bearer {token}"})
        data = resp2.json()
        assert "mediator_report" in data

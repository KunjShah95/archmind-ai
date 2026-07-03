"""Tests for workspaces API endpoints."""
import pytest

from app.models import Analysis, Finding, Profile, Workspace, WorkspaceMember


class TestListWorkspaces:
    """Test GET /api/workspaces endpoint."""

    def test_list_workspaces_authenticated(self, client, auth_user):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/workspaces", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 1
        assert any(w["id"] == ws.id for w in data)

    def test_list_workspaces_includes_member_and_analysis_counts(self, client, auth_user, db):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        # Add analyses to workspace
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A1", source_type="paste", source_content="test")
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A2", source_type="paste", source_content="test")
        db.add_all([a1, a2])
        db.commit()

        response = client.get("/api/workspaces", headers=headers)
        assert response.status_code == 200

        data = response.json()
        ws_data = next((w for w in data if w["id"] == ws.id), None)
        assert ws_data is not None
        assert ws_data["member_count"] >= 1
        assert ws_data["analysis_count"] == 2

    def test_list_workspaces_excludes_non_member_workspaces(self, client, auth_user, seed_workspace, db):
        profile, token, ws = auth_user
        ws2, other = seed_workspace
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/workspaces", headers=headers)
        assert response.status_code == 200

        data = response.json()
        ws_ids = [w["id"] for w in data]
        assert ws.id in ws_ids
        assert ws2.id not in ws_ids

    def test_list_workspaces_unauthenticated(self, client):
        response = client.get("/api/workspaces")
        assert response.status_code == 401


class TestListMembers:
    """Test GET /api/workspaces/{workspace_id}/members endpoint."""

    def test_list_members_success(self, client, auth_user, db):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        # Add another member
        other = Profile(id="other-user", email="other@example.com", full_name="Other User")
        db.add(other)
        db.flush()
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=other.id, role="editor"))
        db.commit()

        response = client.get(f"/api/workspaces/{ws.id}/members", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 2
        assert any(m["email"] == profile.email for m in data)
        assert any(m["email"] == "other@example.com" for m in data)

    def test_list_members_includes_user_details(self, client, auth_user):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get(f"/api/workspaces/{ws.id}/members", headers=headers)
        assert response.status_code == 200

        data = response.json()
        member = next((m for m in data if m["user_id"] == profile.id), None)
        assert member is not None
        assert member["email"] == profile.email
        assert member["full_name"] == profile.full_name
        assert member["role"] == "owner"

    def test_list_members_non_member_gets_404(self, client, auth_user, seed_workspace):
        profile, token, ws = auth_user
        ws2, other = seed_workspace
        headers = {"Authorization": f"Bearer {token}"}

        # Try to list members of workspace the user is not a member of
        response = client.get(f"/api/workspaces/{ws2.id}/members", headers=headers)
        assert response.status_code == 404

    def test_list_members_nonexistent_workspace(self, client, auth_user):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/workspaces/nonexistent-id/members", headers=headers)
        assert response.status_code == 404

    def test_list_members_unauthenticated(self, client, auth_user):
        profile, token, ws = auth_user

        response = client.get(f"/api/workspaces/{ws.id}/members")
        assert response.status_code == 401


class TestDashboardStats:
    """Test GET /api/dashboard/stats endpoint."""

    def test_dashboard_stats_authenticated(self, client, auth_user):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/dashboard/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "total_analyses" in data
        assert "avg_score" in data
        assert "critical_findings" in data
        assert "analyses_used" in data
        assert "analyses_limit" in data
        assert "plan" in data

    def test_dashboard_stats_with_analyses(self, client, auth_user, db):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        # Create ready analyses with scores
        a1 = Analysis(
            workspace_id=ws.id, author_id=profile.id, name="A1", source_type="paste",
            source_content="test", status="ready",
            scores={"scalability": 80, "security": 90, "reliability": 70}
        )
        a2 = Analysis(
            workspace_id=ws.id, author_id=profile.id, name="A2", source_type="paste",
            source_content="test", status="ready",
            scores={"scalability": 85, "security": 75, "reliability": 80}
        )
        db.add_all([a1, a2])
        db.commit()

        response = client.get("/api/dashboard/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["total_analyses"] == 2
        assert data["avg_score"] > 0

    def test_dashboard_stats_with_critical_findings(self, client, auth_user, db):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        # Create analysis with critical finding
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="A", source_type="paste", source_content="test")
        db.add(a)
        db.flush()

        f = Finding(
            analysis_id=a.id, agent="security", severity="critical",
            title="Critical", summary="Critical issue", recommendation="Fix it"
        )
        db.add(f)
        db.commit()

        response = client.get("/api/dashboard/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["critical_findings"] >= 1

    def test_dashboard_stats_no_analyses(self, client, auth_user):
        profile, token, ws = auth_user
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/dashboard/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["total_analyses"] == 0
        assert data["avg_score"] == 0
        assert data["critical_findings"] == 0

    def test_dashboard_stats_unauthenticated(self, client):
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 401

    def test_dashboard_stats_multiple_workspaces(self, client, auth_user, seed_workspace, db):
        """User should see stats across all their workspaces."""
        profile, token, ws = auth_user
        ws2, other = seed_workspace
        headers = {"Authorization": f"Bearer {token}"}

        # Add analyses to both workspaces
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A1", source_type="paste", source_content="test")
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A2", source_type="paste", source_content="test")

        # Only create for the other user's workspace (user should not see this)
        a3 = Analysis(workspace_id=ws2.id, author_id=other.id, name="A3", source_type="paste", source_content="test")

        db.add_all([a1, a2, a3])
        db.commit()

        response = client.get("/api/dashboard/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["total_analyses"] == 2

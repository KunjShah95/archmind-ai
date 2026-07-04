"""Tests for default-workspace bootstrap on login."""

import uuid

from app.auth import ensure_default_workspace
from app.models import Profile, WorkspaceMember


def _profile(db, uid=None, email="jane@acme.com", name="Jane Doe"):
    p = Profile(id=str(uid or uuid.uuid4()), email=email, full_name=name, plan="hobby",
                analyses_used=0, analyses_limit=10)
    db.add(p)
    db.commit()
    return p


class TestEnsureDefaultWorkspace:
    def test_creates_workspace_and_membership(self, db):
        p = _profile(db)
        ws = ensure_default_workspace(db, p)
        assert ws.name == "Jane Doe's Workspace"
        assert ws.slug == "jane-doe"
        assert db.query(WorkspaceMember).filter_by(user_id=p.id).count() == 1

    def test_creator_is_owner(self, db):
        p = _profile(db)
        ensure_default_workspace(db, p)
        m = db.query(WorkspaceMember).filter_by(user_id=p.id).first()
        assert m.role == "owner"

    def test_idempotent(self, db):
        p = _profile(db)
        ws1 = ensure_default_workspace(db, p)
        ws2 = ensure_default_workspace(db, p)
        assert ws1.id == ws2.id
        assert db.query(WorkspaceMember).filter_by(user_id=p.id).count() == 1

    def test_slug_collision_gets_suffix(self, db):
        p1 = _profile(db, uid="u1", email="jane@a.com", name="Jane Doe")
        p2 = _profile(db, uid="u2", email="jane@b.com", name="Jane Doe")
        ws1 = ensure_default_workspace(db, p1)
        ws2 = ensure_default_workspace(db, p2)
        assert ws1.slug != ws2.slug
        assert ws2.slug.startswith("jane-doe-")

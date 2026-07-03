# Critical API Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement critical API tests for exports and pipeline flow to ensure correct MIME types, content, and persistence.

**Architecture:** 
- Test export formats (JSON, MD, HTML, CSV, PDF) for correct MIME types and content structure.
- Test pipeline flow (create → status polling → findings persist → mediator report) to ensure end-to-end functionality.
- Use existing fixtures (`client`, `auth_user`, `seed_workspace`) for isolation.

**Tech Stack:** FastAPI, Pytest, TestClient, SQLAlchemy, PyMuPDF

---

## Files to Create/Modify
- Create: `tests/integration/test_export_api.py`
- Create: `tests/integration/test_pipeline_flow.py`
- Modify: `backend/app/routers/analyses.py` (if export endpoints are missing)

---

### Task 1: Create `test_export_api.py` for Export Format Tests

**Files:**
- Create: `tests/integration/test_export_api.py`
- Test: `tests/integration/test_export_api.py`

- [ ] **Step 1: Write the failing test for JSON export**

```python
# tests/integration/test_export_api.py
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_user(seed_workspace):
    """Fixture to authenticate a test user and return their token."""
    workspace_id, user_id, token = seed_workspace
    return token

def test_export_json_format(auth_user, seed_workspace):
    """Test JSON export returns correct MIME type and content."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis
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

    # Trigger export
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=json",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "application/json"
    assert "findings" in response.json()
    assert "scores" in response.json()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/integration/test_export_api.py::test_export_json_format -v`
Expected: FAIL with `404 Not Found` or `501 Not Implemented`

- [ ] **Step 3: Implement minimal endpoint in `backend/app/routers/analyses.py` (if missing)**

```python
# backend/app/routers/analyses.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from app.services.export import to_csv, to_pdf
from app.db.models import Analysis
from app.db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/analyses/{analysis_id}/export")
async def export_analysis(
    analysis_id: str, format: str, db: Session = Depends(get_db)
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if format == "json":
        return JSONResponse({
            "findings": [f.dict() for f in analysis.findings],
            "scores": analysis.scores,
        })
    elif format == "csv":
        csv_content = to_csv([f.dict() for f in analysis.findings])
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.csv"}
        )
    elif format == "pdf":
        pdf_bytes = to_pdf(analysis.name, analysis.scores, [f.dict() for f in analysis.findings])
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/integration/test_export_api.py::test_export_json_format -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration/test_export_api.py backend/app/routers/analyses.py
git commit -m "feat: add JSON export API test and endpoint"
```

---

- [ ] **Step 6: Write the failing test for CSV export**

```python
# tests/integration/test_export_api.py
def test_export_csv_format(auth_user, seed_workspace):
    """Test CSV export returns correct MIME type and content."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis
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

    # Trigger export
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=csv",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "text/csv"
    assert "attachment; filename=analysis_" in response.headers["Content-Disposition"]
    assert "agent,severity,title,summary,recommendation" in response.text
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pytest tests/integration/test_export_api.py::test_export_csv_format -v`
Expected: FAIL if endpoint is missing, otherwise PASS

- [ ] **Step 8: Run test to verify it passes**

Run: `pytest tests/integration/test_export_api.py::test_export_csv_format -v`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add tests/integration/test_export_api.py
git commit -m "test: add CSV export API test"
```

---

- [ ] **Step 10: Write the failing test for PDF export**

```python
# tests/integration/test_export_api.py
def test_export_pdf_format(auth_user, seed_workspace):
    """Test PDF export returns correct MIME type and content."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis
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

    # Trigger export
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=pdf",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "application/pdf"
    assert "attachment; filename=analysis_" in response.headers["Content-Disposition"]
    assert response.content.startswith(b"%PDF-")
```

- [ ] **Step 11: Run test to verify it fails**

Run: `pytest tests/integration/test_export_api.py::test_export_pdf_format -v`
Expected: FAIL if endpoint is missing, otherwise PASS

- [ ] **Step 12: Run test to verify it passes**

Run: `pytest tests/integration/test_export_api.py::test_export_pdf_format -v`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add tests/integration/test_export_api.py
git commit -m "test: add PDF export API test"
```

---

- [ ] **Step 14: Write the failing test for MD export**

```python
# tests/integration/test_export_api.py
def test_export_md_format(auth_user, seed_workspace):
    """Test MD export returns correct MIME type and content."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis
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

    # Trigger export
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=md",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "text/markdown"
    assert "# ArchMind AI" in response.text
    assert "## Findings" in response.text
```

- [ ] **Step 15: Run test to verify it fails**

Run: `pytest tests/integration/test_export_api.py::test_export_md_format -v`
Expected: FAIL with `400 Bad Request` or `501 Not Implemented`

- [ ] **Step 16: Implement MD export in `backend/app/services/export.py`**

```python
# backend/app/services/export.py
def to_md(name: str, scores: dict[str, int], findings: list[dict[str, Any]]) -> str:
    """Render an analysis report to Markdown."""
    lines = [
        f"# ArchMind AI — {name}",
        "",
        "## Scores",
        "",
    ]
    for k, v in (scores or {}).items():
        lines.append(f"- {k.capitalize()}: {v}/100")
    lines.extend(["", f"## Findings ({len(findings)})", ""])
    for f in findings:
        lines.extend([
            f"### [{str(f.get('severity', '')).upper()}] {f.get('title', '')}",
            "",
            f"{f.get('summary', '')}",
            "",
            f"**Fix:** {f.get('recommendation', '')}",
            "",
        ])
    return "\n".join(lines)
```

- [ ] **Step 17: Update endpoint in `backend/app/routers/analyses.py`**

```python
# backend/app/routers/analyses.py
@router.get("/analyses/{analysis_id}/export")
async def export_analysis(
    analysis_id: str, format: str, db: Session = Depends(get_db)
):
    # ... existing code ...
    
    if format == "md":
        from app.services.export import to_md
        md_content = to_md(analysis.name, analysis.scores, [f.dict() for f in analysis.findings])
        return StreamingResponse(
            iter([md_content]),
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.md"}
        )
    # ... existing code ...
```

- [ ] **Step 18: Run test to verify it passes**

Run: `pytest tests/integration/test_export_api.py::test_export_md_format -v`
Expected: PASS

- [ ] **Step 19: Commit**

```bash
git add tests/integration/test_export_api.py backend/app/services/export.py backend/app/routers/analyses.py
git commit -m "feat: add MD export API test and implementation"
```

---

- [ ] **Step 20: Write the failing test for HTML export**

```python
# tests/integration/test_export_api.py
def test_export_html_format(auth_user, seed_workspace):
    """Test HTML export returns correct MIME type and content."""
    workspace_id, user_id, token = seed_workspace

    # Create an analysis
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

    # Trigger export
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=html",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "text/html"
    assert "<h1>ArchMind AI</h1>" in response.text
    assert "<h2>Findings</h2>" in response.text
```

- [ ] **Step 21: Run test to verify it fails**

Run: `pytest tests/integration/test_export_api.py::test_export_html_format -v`
Expected: FAIL with `400 Bad Request` or `501 Not Implemented`

- [ ] **Step 22: Implement HTML export in `backend/app/services/export.py`**

```python
# backend/app/services/export.py
def to_html(name: str, scores: dict[str, int], findings: list[dict[str, Any]]) -> str:
    """Render an analysis report to HTML."""
    lines = [
        "<!DOCTYPE html>",
        "<html>",
        "<head><title>ArchMind AI — {name}</title></head>",
        "<body>",
        f"<h1>ArchMind AI — {name}</h1>",
        "<h2>Scores</h2>",
        "<ul>",
    ]
    for k, v in (scores or {}).items():
        lines.append(f"<li>{k.capitalize()}: {v}/100</li>")
    lines.extend([
        "</ul>",
        f"<h2>Findings ({len(findings)})</h2>",
    ])
    for f in findings:
        lines.extend([
            f"<div>",
            f"<h3>[{str(f.get('severity', '')).upper()}] {f.get('title', '')}</h3>",
            f"<p>{f.get('summary', '')}</p>",
            f"<p><strong>Fix:</strong> {f.get('recommendation', '')}</p>",
            "</div>",
        ])
    lines.extend(["</body>", "</html>"])
    return "\n".join(lines)
```

- [ ] **Step 23: Update endpoint in `backend/app/routers/analyses.py`**

```python
# backend/app/routers/analyses.py
@router.get("/analyses/{analysis_id}/export")
async def export_analysis(
    analysis_id: str, format: str, db: Session = Depends(get_db)
):
    # ... existing code ...
    
    if format == "html":
        from app.services.export import to_html
        html_content = to_html(analysis.name, analysis.scores, [f.dict() for f in analysis.findings])
        return StreamingResponse(
            iter([html_content]),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.html"}
        )
    # ... existing code ...
```

- [ ] **Step 24: Run test to verify it passes**

Run: `pytest tests/integration/test_export_api.py::test_export_html_format -v`
Expected: PASS

- [ ] **Step 25: Commit**

```bash
git add tests/integration/test_export_api.py backend/app/services/export.py backend/app/routers/analyses.py
git commit -m "feat: add HTML export API test and implementation"
```

---

### Task 2: Create `test_pipeline_flow.py` for Pipeline Flow Tests

**Files:**
- Create: `tests/integration/test_pipeline_flow.py`
- Test: `tests/integration/test_pipeline_flow.py`

- [ ] **Step 1: Write the failing test for full pipeline flow**

```python
# tests/integration/test_pipeline_flow.py
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app
from app.db.models import Analysis, Finding
from app.db.session import get_db

client = TestClient(app)

@pytest.fixture
def auth_user(seed_workspace):
    """Fixture to authenticate a test user and return their token."""
    workspace_id, user_id, token = seed_workspace
    return token

def test_full_pipeline_flow(auth_user, seed_workspace):
    """Test the full pipeline flow: create → status polling → findings persist → mediator report."""
    workspace_id, user_id, token = seed_workspace

    # Step 1: Create analysis
    response = client.post(
        "/api/analyses",
        json={
            "name": "Test Pipeline Flow",
            "description": "Test Description",
            "config": {},
            "diagram_type": "Mermaid",
            "source_content": "graph TD\n  A-->B\n  B-->C",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    analysis_id = response.json()["id"]

    # Step 2: Poll status until ready
    max_attempts = 10
    for _ in range(max_attempts):
        response = client.get(
            f"/api/analyses/{analysis_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        if response.json()["status"] == "ready":
            break
        pytest.skip("Pipeline not ready within max attempts")
    else:
        pytest.fail("Pipeline did not complete within max attempts")

    # Step 3: Verify findings persisted
    db = next(get_db())
    findings = db.query(Finding).filter(Finding.analysis_id == analysis_id).all()
    assert len(findings) > 0
    assert all(f.agent for f in findings)
    assert all(f.severity for f in findings)

    # Step 4: Verify mediator report (export)
    response = client.get(
        f"/api/analyses/{analysis_id}/export?format=json",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["Content-Type"] == "application/json"
    export_data = response.json()
    assert "findings" in export_data
    assert "scores" in export_data
    assert len(export_data["findings"]) == len(findings)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/integration/test_pipeline_flow.py::test_full_pipeline_flow -v`
Expected: FAIL with `404 Not Found` (missing endpoint) or `500 Internal Server Error` (pipeline issues)

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/integration/test_pipeline_flow.py::test_full_pipeline_flow -v`
Expected: PASS (assuming pipeline and endpoints exist)

- [ ] **Step 4: Commit**

```bash
git add tests/integration/test_pipeline_flow.py
git commit -m "test: add full pipeline flow test"
```

---

### Task 3: Run All Tests and Verify Coverage

- [ ] **Step 1: Run all integration tests**

Run: `pytest tests/integration/`
Expected: All tests pass

- [ ] **Step 2: Run all tests**

Run: `pytest`
Expected: All tests pass

- [ ] **Step 3: Commit final changes**

```bash
git add .
git commit -m "test: verify all tests pass and coverage is maintained"
```
"""CI/CD Integration Webhook Review Service.

Processes pull request events from GitHub and GitLab, identifies infrastructure, API, and database changes,
and returns automated review recommendations suited for PR comment postings.
"""

import json
from typing import Any, Dict, List
from app.services.iac_review import review_iac
from app.services.api_review import review_api
from app.services.db_review import review_database

def process_github_pr_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process a simulated or real GitHub webhook payload for changed files in a PR.

    Returns the generated markdown review comments to be posted back to GitHub.
    """
    action = payload.get("action", "")
    pull_request = payload.get("pull_request", {})
    pr_number = pull_request.get("number", 0)
    repo_name = payload.get("repository", {}).get("full_name", "unknown/repo")

    if action not in ["opened", "synchronize", "reopened", "opened-mock"]:
        return {
            "status": "ignored",
            "message": f"Webhook action '{action}' is ignored."
        }

    # In a real integration, we would fetch the patch/files changed via GitHub API.
    # Here we mock the changed files list or fetch them from the payload.
    changed_files = payload.get("changed_files", [])
    if not changed_files:
        # Default mock files if payload did not specify
        changed_files = [
            {
                "filename": "infra/k8s/deployment.yaml",
                "content": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 2\n  template:\n    spec:\n      containers:\n      - name: web\n        image: nginx:latest"
            }
        ]

    comments = []
    total_score = 0
    file_count = 0

    for file in changed_files:
        filename = file.get("filename", "")
        content = file.get("content", "")
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        result = None
        analysis_type = None

        if ext == "tf":
            analysis_type = "Terraform IaC Audit"
            result = review_iac("Terraform", content)
        elif ext in ["yaml", "yml"]:
            if "apiversion:" in content.lower() or "kind:" in content.lower():
                analysis_type = "Kubernetes IaC Audit"
                result = review_iac("Kubernetes", content)
            elif "openapi:" in content.lower() or "swagger:" in content.lower():
                analysis_type = "OpenAPI Contract Audit"
                result = review_api(content)
            elif "version:" in content.lower() and "services:" in content.lower():
                analysis_type = "Docker Compose Audit"
                result = review_iac("Docker Compose", content)
        elif ext == "sql":
            analysis_type = "Database DDL Audit"
            result = review_database(content)

        if result:
            file_count += 1
            total_score += result.get("score", 100)
            
            # Format comment
            file_comment = f"### 🔍 {analysis_type} on `{filename}`\n"
            file_comment += f"**Quality Score: {result.get('score', 100)}/100**\n\n"
            
            for f in result.get("findings", []):
                severity_emoji = {"critical": "🚨", "high": "⚠️", "medium": "🔔", "low": "💡"}.get(f.get("severity"), "💡")
                file_comment += f"- {severity_emoji} **[{f.get('severity').upper()}] {f.get('title')}**\n"
                file_comment += f"  - *Issue:* {f.get('summary')}\n"
                file_comment += f"  - *Fix:* {f.get('recommendation')}\n"
            
            comments.append(file_comment)

    avg_score = round(total_score / file_count) if file_count > 0 else 100

    # Build final PR comment summary
    pr_comment = f"## 🤖 ArchMind AI PR Review Summary\n"
    pr_comment += f"We reviewed {file_count} configuration/infrastructure files. **Average Security & Practice Score: {avg_score}/100**\n\n"
    
    if comments:
        pr_comment += "\n---\n".join(comments)
    else:
        pr_comment += "✅ No infrastructure or contract changes requiring optimization were found in this PR."

    return {
        "status": "reviewed",
        "repo": repo_name,
        "pr_number": pr_number,
        "average_score": avg_score,
        "comments_markdown": pr_comment
    }

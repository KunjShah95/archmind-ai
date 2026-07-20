"""API Design Review Service.

Audits OpenAPI and Swagger specifications for versioning, authentication,
rate limiting, resource naming, and error handling consistency.
"""

from typing import Any, Dict
from app.services.llm import llm_complete, _extract_json

_API_REVIEW_SYSTEM = (
    "You are an API Design Architect.\n"
    "Analyze the provided OpenAPI/Swagger specification for architectural API design violations.\n"
    "Respond ONLY with valid JSON inside a code block, using this schema:\n"
    "{\n"
    '  "score": 80,\n'
    '  "findings": [\n'
    '    {\n'
    '      "agent": "maintainability",\n'
    '      "severity": "high",\n'
    '      "title": "API Design Issue",\n'
    '      "summary": "Description of the API pattern deviation.",\n'
    '      "recommendation": "Correct design pattern recommendation."\n'
    '    }\n'
    '  ]\n'
    "}"
)

def _build_api_prompt(content: str) -> str:
    return (
        f"API OpenAPI Specification:\n```\n{content}\n```\n\n"
        "Audit this API design. Check for: API versioning (should have /v1/ or headers), authentication security, "
        "REST path conventions (plural nouns, clean actions), error response standardization, and query rate-limiting tags. "
        "Return a quality score from 0-100 and a list of structural findings."
    )

def review_api_llm(content: str) -> Dict[str, Any] | None:
    prompt = _build_api_prompt(content)
    result = llm_complete(_API_REVIEW_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def review_api_heuristic(content: str) -> Dict[str, Any]:
    findings = []
    score = 90
    content_lower = content.lower()

    # Check for versioning
    if "/v1" not in content_lower and "/v2" not in content_lower and "version" not in content_lower:
        score -= 15
        findings.append({
            "agent": "maintainability",
            "severity": "medium",
            "title": "Missing API Versioning prefix",
            "summary": "No version tag (/v1/, /v2/) was found in the endpoint paths. This makes client contract breaking changes difficult to manage.",
            "recommendation": "Prefix API routes with version paths, e.g., `/api/v1/users`."
        })

    # Check for authentication
    if "security:" not in content_lower and "securityschemes" not in content_lower:
        score -= 25
        findings.append({
            "agent": "security",
            "severity": "critical",
            "title": "Unauthenticated API endpoints exposed",
            "summary": "No security requirement schema (JWT, OAuth2, API Keys) is specified globally or locally in the endpoints.",
            "recommendation": "Configure a `security` property at the root level and specify standard securitySchemes like bearerAuth."
        })

    # Check error codes convention
    if "400" not in content_lower and "500" not in content_lower:
        score -= 10
        findings.append({
            "agent": "maintainability",
            "severity": "low",
            "title": "Inconsistent error response documentation",
            "summary": "The API spec does not document 400 Bad Request or 500 Internal Server Error schemas, causing inconsistent client integrations.",
            "recommendation": "Add a standard global schema for error payloads and document 400/401/403/500 code blocks."
        })

    if not findings:
        findings.append({
            "agent": "maintainability",
            "severity": "low",
            "title": "API contracts look clean",
            "summary": "Basic OpenAPI structure compliance check completed.",
            "recommendation": "Document individual object fields clearly in standard component schemas."
        })

    return {"score": max(20, score), "findings": findings}

def review_api(content: str) -> Dict[str, Any]:
    llm_res = review_api_llm(content)
    if llm_res and "findings" in llm_res:
        return llm_res
    return review_api_heuristic(content)

"""Infrastructure-as-Code (IaC) Review Service.

Audits Kubernetes manifests, Helm charts, Terraform configurations, and Docker Compose files
for security vulnerabilities, cost waste, and best practice violations.
"""

from typing import Any, Dict
from app.services.llm import llm_complete, _extract_json

_IAC_SYSTEM = (
    "You are a DevOps and Cloud Security auditing agent.\n"
    "Analyze the provided Infrastructure-as-Code (IaC) code (Terraform, Kubernetes, Docker Compose, or Helm) "
    "for misconfigurations, security risks, missing resource limits, and best practices.\n"
    "Respond ONLY with valid JSON inside a code block, matching this schema:\n"
    "{\n"
    '  "score": 75,\n'
    '  "findings": [\n'
    '    {\n'
    '      "agent": "security",\n'
    '      "severity": "high",\n'
    '      "title": "Vulnerability Title",\n'
    '      "summary": "Detailed description of the issue.",\n'
    '      "recommendation": "Steps to resolve or fix this issue."\n'
    '    }\n'
    '  ]\n'
    "}"
)

def _build_iac_prompt(code_type: str, content: str) -> str:
    return (
        f"Infrastructure Code Type: {code_type}\n"
        f"Source Code:\n```\n{content}\n```\n\n"
        "Audit this code. If Kubernetes: check for missing resource limits, running as root, privileged containers, missing probes. "
        "If Terraform: check for hardcoded secrets, wildcard IAM policies, unencrypted buckets, public ingress. "
        "If Docker Compose: check for exposed passwords, missing restart policies. "
        "Return a score from 0-100 and a list of specific security, cost, or maintainability findings."
    )

def review_iac_llm(code_type: str, content: str) -> Dict[str, Any] | None:
    prompt = _build_iac_prompt(code_type, content)
    result = llm_complete(_IAC_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def review_iac_heuristic(code_type: str, content: str) -> Dict[str, Any]:
    findings = []
    score = 90
    content_lower = content.lower()

    if code_type == "Kubernetes" or "apiversion:" in content_lower:
        # Check for missing limits
        if "limits:" not in content_lower:
            score -= 15
            findings.append({
                "agent": "performance",
                "severity": "high",
                "title": "Missing container CPU/Memory limits",
                "summary": "No resources.limits defined for the containers, which can lead to node resource starvation (noisy neighbor syndrome).",
                "recommendation": "Add resources.limits with reasonable CPU and memory caps to your Deployment spec."
            })
        # Check for privileged
        if "privileged: true" in content_lower:
            score -= 20
            findings.append({
                "agent": "security",
                "severity": "critical",
                "title": "Privileged container execution enabled",
                "summary": "Container is allowed to run with root capabilities on the host node, bypassing security sandboxing.",
                "recommendation": "Set securityContext.privileged to false unless strictly required by system agents."
            })
        # Check for probes
        if "livenessprobe" not in content_lower or "readinessprobe" not in content_lower:
            score -= 10
            findings.append({
                "agent": "reliability",
                "severity": "medium",
                "title": "Missing liveness/readiness probes",
                "summary": "Kubernetes cannot determine container health or readiness without configured probes, risking routing traffic to broken containers.",
                "recommendation": "Configure standard HTTP or TCP livenessProbe and readinessProbe endpoints."
            })

    elif code_type == "Terraform" or "resource " in content_lower:
        # Secrets check
        if any(k in content_lower for k in ["password =", "secret_key =", "token ="]) and not ("var." in content_lower or "local." in content_lower):
            score -= 25
            findings.append({
                "agent": "security",
                "severity": "critical",
                "title": "Possible hardcoded credentials detected",
                "summary": "Passwords or private keys appear directly in the Terraform config, posing a credential leakage risk.",
                "recommendation": "Use input variables, environment variables, or retrieve secrets dynamically using data sources (e.g. AWS Secrets Manager)."
            })
        # Wildcard IAM
        if "action = \"*\"" in content_lower or "action = [\"*\"]" in content_lower:
            score -= 15
            findings.append({
                "agent": "security",
                "severity": "high",
                "title": "Wildcard IAM Action policy mapping",
                "summary": "The IAM policy grants unrestricted access (*) to actions, violating the principle of least privilege.",
                "recommendation": "Narrow down the policy actions specifically to the required API operations."
            })
        # Unencrypted S3
        if "aws_s3_bucket" in content_lower and "server_side_encryption_configuration" not in content_lower:
            score -= 10
            findings.append({
                "agent": "security",
                "severity": "medium",
                "title": "S3 bucket side encryption disabled",
                "summary": "Bucket stores objects without default server-side encryption.",
                "recommendation": "Add a default aws_s3_bucket_server_side_encryption_configuration resource."
            })

    elif code_type == "Docker Compose" or "version:" in content_lower:
        if "restart: always" not in content_lower and "restart: unless-stopped" not in content_lower:
            score -= 10
            findings.append({
                "agent": "reliability",
                "severity": "medium",
                "title": "Missing service restart policy",
                "summary": "Services won't restart automatically if they crash or if the docker daemon reboots.",
                "recommendation": "Add 'restart: unless-stopped' to your service configuration."
            })
        if "environment:" in content_lower and any(k in content_lower for k in ["password", "secret"]):
            score -= 15
            findings.append({
                "agent": "security",
                "severity": "high",
                "title": "Exposed secrets in environment variables",
                "summary": "Plain-text passwords or api secrets are declared in docker-compose environment blocks.",
                "recommendation": "Load environment variables from an external encrypted .env file or use Docker Secrets."
            })

    if not findings:
        findings.append({
            "agent": "maintainability",
            "severity": "low",
            "title": "No major IaC vulnerabilities found",
            "summary": "Baseline configuration audit passed standard checks.",
            "recommendation": "Keep configuration files clean and scan during CI pipelines."
        })

    return {"score": max(20, score), "findings": findings}

def review_iac(code_type: str, content: str) -> Dict[str, Any]:
    llm_res = review_iac_llm(code_type, content)
    if llm_res and "findings" in llm_res:
        return llm_res
    return review_iac_heuristic(code_type, content)

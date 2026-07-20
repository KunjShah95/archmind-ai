"""Cloud Scanner Service — compares live cloud resources with intended architectural designs.

Simulates scans of AWS, GCP, Azure, or Kubernetes clusters.
Detects configuration drift, missing services, security issues, and cost differences.
"""

from typing import Any, Dict, List
from app.services.diagram import node_labels

def scan_live_infrastructure(provider: str, credentials: dict) -> List[Dict[str, Any]]:
    """Scan running cloud resources (mocked for demo/local setup)."""
    # Return a simulated list of actual cloud resources found
    if provider.lower() == "aws":
        return [
            {"id": "c-api-gw", "type": "aws_apigatewayv2_api", "name": "API Gateway", "properties": {"auth": "JWT", "throttling": "disabled"}},
            {"id": "c-orders-vm", "type": "aws_instance", "name": "Order Service VM", "properties": {"instance_type": "t3.large", "monitoring": "disabled"}},
            {"id": "c-postgres-db", "type": "aws_db_instance", "name": "Postgres DB", "properties": {"multi_az": "false", "storage_encrypted": "false"}},
            {"id": "c-redis-cache", "type": "aws_elasticache_cluster", "name": "Redis Cache", "properties": {"node_type": "cache.t3.micro"}},
            {"id": "c-s3-bucket", "type": "aws_s3_bucket", "name": "Static Assets Bucket", "properties": {"public_access_block": "false"}}
        ]
    # Default fallback
    return [
        {"id": "c-api", "type": "api_gateway", "name": "API Gateway", "properties": {"rate_limiting": "none"}},
        {"id": "c-db", "type": "database", "name": "Postgres DB", "properties": {"backup_retention": "0"}}
    ]

def compare_actual_vs_intended(nodes: List[dict], edges: List[dict], actual_resources: List[dict]) -> Dict[str, Any]:
    """Compare intended (design) architecture with actual scanned cloud resources.

    Detects missing resources, configuration drift, and security issues.
    """
    labels = node_labels(nodes)
    drift = []
    missing = []
    security_issues = []

    # 1. Check for missing services in the actual deployment
    for nid, label in labels.items():
        matched = False
        for res in actual_resources:
            if label.lower() in res["name"].lower() or res["name"].lower() in label.lower():
                matched = True
                break
        if not matched:
            missing.append({
                "node_id": nid,
                "label": label,
                "remediation": "Provision this component using Terraform or CloudFormation."
            })

    # 2. Check for configuration drift & security issues based on mock properties
    for res in actual_resources:
        res_name = res["name"].lower()
        res_props = res.get("properties", {})

        if "db" in res_name or "postgres" in res_name:
            if res_props.get("multi_az") == "false":
                drift.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "parameter": "Multi-AZ Replication",
                    "intended": "true (High Availability)",
                    "actual": "false",
                    "severity": "high"
                })
            if res_props.get("storage_encrypted") == "false":
                security_issues.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "vulnerability": "Storage is unencrypted at-rest",
                    "severity": "critical",
                    "remediation": "Enable KMS storage encryption in your DB parameters."
                })

        if "order" in res_name or "vm" in res_name:
            if res_props.get("instance_type") == "t3.large":
                drift.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "parameter": "Instance Type",
                    "intended": "t3.micro (Cost Optimized)",
                    "actual": "t3.large",
                    "severity": "medium"
                })

        if "s3" in res_name or "bucket" in res_name:
            if res_props.get("public_access_block") == "false":
                security_issues.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "vulnerability": "S3 bucket allows public ACL reading",
                    "severity": "critical",
                    "remediation": "Enable block public access settings on this bucket."
                })

    return {
        "drift": drift,
        "missing_components": missing,
        "security_issues": security_issues,
        "scan_summary": f"Cloud scan completed. Detected {len(drift)} configuration drifts, {len(missing)} missing components, and {len(security_issues)} critical security concerns."
    }

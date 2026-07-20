"""Compliance Audit Service.

Evaluates architecture templates against SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS standards.
Returns readiness scores and highlights missing security controls.
"""

from typing import Any, Dict, List
from app.services.diagram import node_labels

FRAMEWORKS = {
    "soc_2": {
        "name": "SOC 2 Type II",
        "description": "Security, Availability, Processing Integrity, Confidentiality, and Privacy controls audit criteria.",
    },
    "iso_27001": {
        "name": "ISO/IEC 27001",
        "description": "International standard governing information security management systems (ISMS) framework.",
    },
    "gdpr": {
        "name": "GDPR (General Data Protection Regulation)",
        "description": "European Union legal framework protecting personal data and user privacy consent.",
    },
    "hipaa": {
        "name": "HIPAA (Health Insurance Portability and Accountability Act)",
        "description": "US security standards safeguarding Protected Health Information (PHI).",
    },
    "pci_dss": {
        "name": "PCI DSS v4.0",
        "description": "Payment Card Industry Data Security Standard auditing credit card processing pipelines.",
    }
}

def audit_compliance_frameworks(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    labels = list(node_labels(nodes).values())
    labels_lower = [label.lower() for label in labels]

    # Check existence of common compliance controls in the design diagram
    has_auth = any(any(k in label for k in ["auth", "cognito", "identity", "oauth", "sso"]) for label in labels_lower)
    has_encryption = any(any(k in label for k in ["kms", "encrypt", "vault", "ssl", "tls", "https"]) for label in labels_lower)
    has_firewall = any(any(k in label for k in ["firewall", "sg", "security-group", "waf", "shield", "vpc"]) for label in labels_lower)
    has_audit = any(any(k in label for k in ["audit", "logging", "cloudtrail", "siem", "datadog", "elk"]) for label in labels_lower)
    has_backup = any(any(k in label for k in ["backup", "replica", "dr", "failover", "restore"]) for label in labels_lower)

    readiness = {}

    # 1. SOC 2 Audit
    soc2_score = 40
    soc2_gaps = []
    if has_auth:
        soc2_score += 15
    else:
        soc2_gaps.append("Missing explicit User Authentication barrier (CC6.1)")
    if has_firewall:
        soc2_score += 15
    else:
        soc2_gaps.append("No boundary WAF or perimeter Network Security Groups configured (CC6.6)")
    if has_audit:
        soc2_score += 15
    else:
        soc2_gaps.append("No centralized Audit Logging stack mapped to record access events (CC7.2)")
    if has_backup:
        soc2_score += 15
    else:
        soc2_gaps.append("Missing high-availability database replication or automated backups (CC8.1)")
    readiness["soc_2"] = {"score": soc2_score, "gaps": soc2_gaps}

    # 2. ISO 27001 Audit
    iso_score = 45
    iso_gaps = []
    if has_auth:
        iso_score += 15
    else:
        iso_gaps.append("A.9 Access Control: Missing robust client authorization mappings")
    if has_encryption:
        iso_score += 15
    else:
        iso_gaps.append("A.10 Cryptography: Encryption-at-rest not specified for database components")
    if has_audit:
        iso_score += 15
    else:
        iso_gaps.append("A.12 Operations Security: Missing trace logging collector")
    if has_backup:
        iso_score += 10
    readiness["iso_27001"] = {"score": iso_score, "gaps": iso_gaps}

    # 3. GDPR Audit
    gdpr_score = 50
    gdpr_gaps = []
    if has_auth:
        gdpr_score += 15
    else:
        gdpr_gaps.append("Art. 32 Security of Processing: Unauthorized data mutation risk due to lack of Auth layer")
    if has_encryption:
        gdpr_score += 20
    else:
        gdpr_gaps.append("Art. 32 Pseudonymisation: No encryption configured for customer PII database")
    if has_audit:
        gdpr_score += 15
    readiness["gdpr"] = {"score": gdpr_score, "gaps": gdpr_gaps}

    # 4. HIPAA Audit
    hipaa_score = 35
    hipaa_gaps = []
    if has_auth:
        hipaa_score += 20
    else:
        hipaa_gaps.append("§ 164.312(a) Access Control: Unique user identification not enforced")
    if has_encryption:
        hipaa_score += 20
    else:
        hipaa_gaps.append("§ 164.312(iv) Transmission Security: Encrypted pathways not specified for PHI databases")
    if has_audit:
        hipaa_score += 15
    else:
        hipaa_gaps.append("§ 164.312(b) Audit Controls: Mechanisms to record system activity are missing")
    if has_backup:
        hipaa_score += 10
    readiness["hipaa"] = {"score": hipaa_score, "gaps": hipaa_gaps}

    # 5. PCI DSS Audit
    pci_score = 30
    pci_gaps = []
    if has_auth:
        pci_score += 20
    else:
        pci_gaps.append("Requirement 8: Unique credentials mapping missing for system entry barriers")
    if has_encryption:
        pci_score += 25
    else:
        pci_gaps.append("Requirement 3: Protect Cardholder Data at-rest using crypto keys storage")
    if has_firewall:
        pci_score += 15
    else:
        pci_gaps.append("Requirement 1: Install and maintain network firewalls to restrict traffic")
    if has_audit:
        pci_score += 10
    readiness["pci_dss"] = {"score": pci_score, "gaps": pci_gaps}

    return {
        "readiness": readiness,
        "recommendation": "Integrate a centralized secrets store (e.g. AWS Secrets Manager/Vault) and enable server-side database encryption to satisfy key controls across all compliance frameworks."
    }

"""Database Schema Optimization Service.

Audits database DDL schemas, table structures, and indexing patterns to recommend performance,
sharding, partition, and read replica configurations.
"""

from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json

_DB_REVIEW_SYSTEM = (
    "You are a Principal Database Administrator.\n"
    "Analyze the provided database schema/DDL for optimization, indexing gaps, partitioning, and scalability bottlenecks.\n"
    "Respond ONLY with valid JSON inside a code block, using this schema:\n"
    "{\n"
    '  "score": 82,\n'
    '  "findings": [\n'
    '    {\n'
    '      "agent": "performance",\n'
    '      "severity": "high",\n'
    '      "title": "Optimization Issue",\n'
    '      "summary": "Description of indexing or partition gap.",\n'
    '      "recommendation": "SQL optimization query or configuration recommendation."\n'
    '    }\n'
    '  ]\n'
    "}"
)

def _build_db_prompt(content: str) -> str:
    return (
        f"Database Schema DDL:\n```\n{content}\n```\n\n"
        "Audit this database schema. Check for: missing indexes on foreign keys (foreign key lookup latency), "
        "partitioning opportunities for time-series or huge log tables, sharding recommendations, "
        "unconstrained tables, and index overhead issues. "
        "Return a score from 0-100 and a list of specific database findings."
    )

def review_database_llm(content: str) -> Dict[str, Any] | None:
    prompt = _build_db_prompt(content)
    result = llm_complete(_DB_REVIEW_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def review_database_heuristic(content: str) -> Dict[str, Any]:
    findings = []
    score = 90
    content_lower = content.lower()

    # Foreign key index check
    if "foreign key" in content_lower and "index" not in content_lower:
        score -= 15
        findings.append({
            "agent": "performance",
            "severity": "high",
            "title": "Missing index on Foreign Keys",
            "summary": "Foreign key relationships exist but no corresponding CREATE INDEX statements were detected. This results in full table scans during JOIN operations.",
            "recommendation": "Add explicit INDEX creation statements on all foreign key columns, e.g., `CREATE INDEX idx_user_id ON orders(user_id);`."
        })

    # Partitioning check
    if any(k in content_lower for k in ["created_at", "timestamp", "log_date"]) and "partition by" not in content_lower:
        score -= 10
        findings.append({
            "agent": "scalability",
            "severity": "medium",
            "title": "Partitioning candidate table found",
            "summary": "A timestamp column is present in a likely high-volume table, but no partitioning is configured. Queries filtering by dates will suffer as table size grows.",
            "recommendation": "Configure table partitioning by RANGE on the timestamp column (e.g. partition by month or day)."
        })

    # Primary key check
    if "create table" in content_lower and "primary key" not in content_lower:
        score -= 20
        findings.append({
            "agent": "reliability",
            "severity": "high",
            "title": "Table defined without Primary Key constraint",
            "summary": "At least one CREATE TABLE statement lacks a PRIMARY KEY definition, risking duplicate records and poor clustering lookup times.",
            "recommendation": "Ensure all tables have a unique, index-backed primary key, e.g., using UUIDs or auto-incrementing bigints."
        })

    if not findings:
        findings.append({
            "agent": "performance",
            "severity": "low",
            "title": "Database schema adheres to core guidelines",
            "summary": "DDL indexing check passed baseline tests.",
            "recommendation": "Establish a query profile monitor (e.g., pg_stat_statements) in staging to track active index utility."
        })

    return {"score": max(20, score), "findings": findings}

def review_database(content: str) -> Dict[str, Any]:
    llm_res = review_database_llm(content)
    if llm_res and "findings" in llm_res:
        return llm_res
    return review_database_heuristic(content)

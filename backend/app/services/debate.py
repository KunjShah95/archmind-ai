"""Multi-Agent Debate Service — simulates debates between architectural agents.

Agents: Security, Cost, Scalability, and DevOps.
Allows users to input a design dilemma, run a simulated discussion, and get a consensus recommendation.
"""

import json
from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json

_DEBATE_SYSTEM = (
    "You are a coordinator of a software architecture review board.\n"
    "Simulate a constructive debate between four agents (Security, Cost, Scalability, and DevOps) "
    "about a specific design dilemma. Each agent should argue strongly from its perspective.\n"
    "Respond ONLY with valid JSON in a code block using this schema:\n"
    "{\n"
    '  "topic": "dilemma description",\n'
    '  "debate_transcript": [\n'
    '    {"agent": "Scalability Agent", "argument": "Why this option is good/bad for scale..."}, \n'
    '    {"agent": "Security Agent", "argument": "Auth, threat surface, compliance points..."}, \n'
    '    {"agent": "Cost Agent", "argument": "Infrastructure spend, resource waste points..."}, \n'
    '    {"agent": "DevOps Agent", "argument": "Operational simplicity, deployability, CI/CD..."}\n'
    '  ],\n'
    '  "consensus_recommendation": "The final coordinated recommendation combining all points",\n'
    '  "trade_off_matrix": [\n'
    '    {"option": "Option A", "pros": ["Pro 1"], "cons": ["Con 1"]}\n'
    '  ]\n'
    "}"
)

def _build_debate_prompt(topic: str, node_labels: List[str]) -> str:
    return (
        f"Design Dilemma: {topic}\n"
        f"Context (Current system components): {', '.join(node_labels)}\n\n"
        "Generate a debate transcript between the Scalability, Security, Cost, and DevOps Agents. "
        "Each agent must give 1 solid paragraph arguing from their viewpoint. "
        "Synthesize their points into a coordinated final recommendation and produce a trade-off comparison matrix."
    )

def run_debate_llm(topic: str, nodes: List[dict]) -> Dict[str, Any] | None:
    from app.services.diagram import node_labels as get_node_labels
    labels = list(get_node_labels(nodes).values()) if nodes else []
    prompt = _build_debate_prompt(topic, labels)
    result = llm_complete(_DEBATE_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def run_debate_heuristic(topic: str, nodes: List[dict]) -> Dict[str, Any]:
    # Heuristic fallback if no LLM
    from app.services.diagram import node_labels as get_node_labels
    labels = list(get_node_labels(nodes).values()) if nodes else []
    
    transcript = [
        {
            "agent": "Scalability Agent",
            "argument": f"For '{topic}', we must evaluate the request throughput ceiling. If we choose a distributed system, we scale horizontally, but it adds network hops. We should ensure we partition keys properly to avoid hot spot bottlenecks."
        },
        {
            "agent": "Security Agent",
            "argument": f"Security requires protecting data in-transit and at-rest. With '{topic}', we must implement strong access control lists (ACLs), TLS 1.3 encryption, and robust secret rotation. Any new endpoint or data store increases the attack surface."
        },
        {
            "agent": "Cost Agent",
            "argument": f"From a FinOps perspective, direct virtual machines or persistent clusters for '{topic}' have high idle waste. Serverless or shared managed tiers are preferred for lower starting cost, scaling down when not in use."
        },
        {
            "agent": "DevOps Agent",
            "argument": f"Operational overhead is the main risk here. If we introduce highly complex orchestration for '{topic}', our build pipelines and deployment scripts get complicated. We should favor managed SaaS or standard Docker/Kubernetes configurations."
        }
    ]

    consensus = (
        f"Consensus recommendation on '{topic}': "
        "A hybrid approach is recommended. Begin with a managed service (e.g. cloud managed cache or DB) "
        "to satisfy DevOps simplicity and Security defaults, while configuring autoscaling thresholds to manage Cost."
    )

    trade_offs = [
        {
            "option": "Managed Cloud Service",
            "pros": ["High uptime", "Simple setup", "Built-in security patches"],
            "cons": ["Higher monthly base cost", "Vendor lock-in potential"]
        },
        {
            "option": "Self-Hosted Cluster",
            "pros": ["Full configuration control", "Lower raw resource cost at massive scale"],
            "cons": ["High DevOps maintenance overhead", "Complex security hardening required"]
        }
    ]

    return {
        "topic": topic,
        "debate_transcript": transcript,
        "consensus_recommendation": consensus,
        "trade_off_matrix": trade_offs
    }

def run_debate(topic: str, nodes: List[dict]) -> Dict[str, Any]:
    llm_res = run_debate_llm(topic, nodes)
    if llm_res and "debate_transcript" in llm_res:
        return llm_res
    return run_debate_heuristic(topic, nodes)

"""Knowledge Graph Service — implements dependency and impact analysis on architecture diagrams.

Tracks component relationships, computes service centrality/impact scores, and detects dependency chains.
"""

from typing import Any, Dict, List, Set
from app.services.diagram import node_labels

def get_node_neighbors(nodes: List[dict], edges: List[dict], node_id: str) -> Dict[str, Any]:
    """Find immediate upstream (incoming) and downstream (outgoing) neighbors of a node."""
    upstream = []
    downstream = []
    labels = node_labels(nodes)

    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src == node_id:
            downstream.append({"id": tgt, "label": labels.get(tgt, tgt)})
        if tgt == node_id:
            upstream.append({"id": src, "label": labels.get(src, src)})

    return {
        "node_id": node_id,
        "label": labels.get(node_id, node_id),
        "upstream": upstream,
        "downstream": downstream,
    }

def get_node_dependencies(nodes: List[dict], edges: List[dict], node_id: str) -> Dict[str, Any]:
    """Calculate recursive upstream (what this node depends on) and downstream (what depends on this node) trees."""
    labels = node_labels(nodes)
    
    # downstream traversal (DFS)
    downstream_ids: Set[str] = set()
    def find_downstream(curr: str):
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            if src == curr and tgt not in downstream_ids:
                downstream_ids.add(tgt)
                find_downstream(tgt)

    find_downstream(node_id)

    # upstream traversal (DFS)
    upstream_ids: Set[str] = set()
    def find_upstream(curr: str):
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            if tgt == curr and src not in upstream_ids:
                upstream_ids.add(src)
                find_upstream(src)

    find_upstream(node_id)

    return {
        "node_id": node_id,
        "label": labels.get(node_id, node_id),
        "upstream_dependencies": [{"id": nid, "label": labels.get(nid, nid)} for nid in upstream_ids],
        "downstream_dependents": [{"id": nid, "label": labels.get(nid, nid)} for nid in downstream_ids],
    }

def compute_impact_matrix(nodes: List[dict], edges: List[dict]) -> List[Dict[str, Any]]:
    """Calculate centrality metrics and impact scores for all nodes.

    Impact Score: percentage of total nodes in downstream blast radius if this node fails.
    """
    total_nodes = len(nodes)
    if total_nodes == 0:
        return []

    labels = node_labels(nodes)
    impact_list = []

    for node in nodes:
        node_id = node["id"]
        
        # Traverse downstream (DFS) to see what fails if this node fails
        affected_ids: Set[str] = {node_id}
        queue = [node_id]
        
        while queue:
            curr = queue.pop(0)
            # Find clients depending on curr (backwards: client -> curr, client is affected)
            # Or downstream tasks (curr -> server, server isn't necessarily affected, but client -> server means if server fails, client fails)
            for edge in edges:
                src = edge.get("source")
                tgt = edge.get("target")
                # If tgt fails, src (client) is affected
                if tgt == curr and src not in affected_ids:
                    affected_ids.add(src)
                    queue.append(src)

        impact_count = len(affected_ids)
        percentage = round((impact_count / total_nodes) * 100)
        
        # Degree calculation
        in_degree = sum(1 for e in edges if e.get("target") == node_id)
        out_degree = sum(1 for e in edges if e.get("source") == node_id)

        impact_list.append({
            "node_id": node_id,
            "label": labels.get(node_id, node_id),
            "impact_score": percentage,  # 0-100%
            "degree_centrality": in_degree + out_degree,
            "in_degree": in_degree,
            "out_degree": out_degree,
            "affected_count": impact_count,
        })

    # Sort by impact score descending
    impact_list.sort(key=lambda x: x["impact_score"], reverse=True)
    return impact_list

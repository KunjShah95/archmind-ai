"""Diagram parsing and default graph generation."""

import re
from typing import Any


DEFAULT_NODES = [
    {"id": "n-client", "position": {"x": 20, "y": 60}, "data": {"label": "Client"}},
    {"id": "n-cdn", "position": {"x": 220, "y": 60}, "data": {"label": "CDN"}},
    {"id": "n-api", "position": {"x": 420, "y": 60}, "data": {"label": "API Gateway"}},
    {"id": "n-auth", "position": {"x": 220, "y": 200}, "data": {"label": "Auth Service"}},
    {"id": "n-orders", "position": {"x": 420, "y": 200}, "data": {"label": "Order Service"}},
    {"id": "n-workers", "position": {"x": 620, "y": 200}, "data": {"label": "Workers"}},
    {"id": "n-db", "position": {"x": 420, "y": 340}, "data": {"label": "Postgres HA"}},
    {"id": "n-cache", "position": {"x": 620, "y": 340}, "data": {"label": "Redis"}},
]

DEFAULT_EDGES = [
    {"id": "e0", "source": "n-client", "target": "n-cdn"},
    {"id": "e1", "source": "n-cdn", "target": "n-api"},
    {"id": "e2", "source": "n-api", "target": "n-auth"},
    {"id": "e3", "source": "n-api", "target": "n-orders"},
    {"id": "e4", "source": "n-orders", "target": "n-workers"},
    {"id": "e5", "source": "n-orders", "target": "n-db"},
    {"id": "e6", "source": "n-workers", "target": "n-cache"},
    {"id": "e7", "source": "n-orders", "target": "n-cache"},
]


def detect_diagram_type(content: str | None, filename: str | None) -> str:
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        mapping = {
            "png": "PNG", "jpg": "JPG", "jpeg": "JPG", "pdf": "PDF",
            "drawio": "Draw.io", "excalidraw": "Excalidraw", "mmd": "Mermaid",
            "puml": "PlantUML", "svg": "SVG", "json": "JSON",
            "tf": "Terraform", "sql": "SQL Schema",
        }
        if ext in mapping:
            return mapping[ext]
        if ext in ["yaml", "yml"]:
            # Default to YAML, content check will refine
            return "YAML"
            
    if content:
        c = content.strip().lower()
        if c.startswith("graph ") or "graph td" in c or "graph lr" in c:
            return "Mermaid"
        if c.startswith("@startuml"):
            return "PlantUML"
        if "apiversion:" in c and "kind:" in c:
            return "Kubernetes"
        if "openapi:" in c or "swagger:" in c:
            return "OpenAPI"
        if "services:" in c and ("version:" in c or "image:" in c):
            return "Docker Compose"
        if "resource " in c and "provider " in c:
            return "Terraform"
        if "create table" in c or "alter table" in c:
            return "SQL Schema"
            
    return "Architecture"


# Node label declaration: id[Label], id(Label), id{Label}, id([Label]), id[(Label)]
_NODE_LABEL = re.compile(r"(\w+)\s*[\[\(\{]+([^\]\)\}]+)[\]\)\}]+")
# Edge: source [optional inline label] arrow [optional |edge text|] target.
# Tolerates inline node labels on either side and -->, ==>, -.-> arrow styles.
_EDGE = re.compile(
    r"(\w+)(?:\s*[\[\(\{]+[^\]\)\}]*[\]\)\}]+)?"  # source id + optional inline label
    r"\s*[-=.]+>"                                   # arrow head
    r"(?:\s*\|[^|]*\|)?"                            # optional |edge label|
    r"\s*(\w+)"                                     # target id
)
_RESERVED = {"graph", "flowchart", "td", "lr", "tb", "rl", "bt", "subgraph", "end"}


def _layout(node_list: list[dict], cols: int = 3) -> None:
    for i, n in enumerate(node_list):
        n["position"] = {"x": 40 + (i % cols) * 200, "y": 60 + (i // cols) * 140}


def parse_mermaid(content: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Parse Mermaid flowchart — labeled nodes and directed edges.

    Handles inline node labels on edge endpoints (e.g. ``A[Web] --> B[API]``),
    edge labels (``A -->|calls| B``) and ``-->``/``==>``/``-.->`` arrow styles.
    """
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def ensure(nid: str, label: str | None = None) -> None:
        if nid in _RESERVED:
            return
        if nid not in nodes:
            nodes[nid] = {"id": f"n-{nid}", "data": {"label": label or nid}}
        elif label:
            nodes[nid]["data"]["label"] = label

    for match in _NODE_LABEL.finditer(content):
        ensure(match.group(1), match.group(2).strip())

    seen: set[tuple[str, str]] = set()
    for match in _EDGE.finditer(content):
        src, tgt = match.group(1), match.group(2)
        if src in _RESERVED or tgt in _RESERVED or (src, tgt) in seen:
            continue
        seen.add((src, tgt))
        ensure(src)
        ensure(tgt)
        edges.append({
            "id": f"e{len(edges)}",
            "source": f"n-{src}",
            "target": f"n-{tgt}",
        })

    if not nodes:
        return DEFAULT_NODES, DEFAULT_EDGES

    node_list = list(nodes.values())
    _layout(node_list)
    return node_list, edges


def parse_plantuml(content: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Parse a subset of PlantUML — component/declared nodes and arrows."""
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    # Declarations: component "Web App" as Web   /   [Web App]   /   node Foo
    decl = re.compile(
        r'(?:component|node|database|actor|rectangle|cloud|queue|storage)\s+'
        r'(?:"([^"]+)"\s+as\s+(\w+)|(\w+))',
        re.IGNORECASE,
    )
    bracket = re.compile(r"\[([^\]]+)\]")
    # Arrows: A --> B, A ..> B, A -down-> B, optionally with : label
    arrow = re.compile(r"(\w+)\s*[-.]+(?:\w+)?[-.]*>\s*(\w+)")

    def ensure(nid: str, label: str | None = None) -> None:
        if nid not in nodes:
            nodes[nid] = {"id": f"n-{nid}", "data": {"label": label or nid}}
        elif label:
            nodes[nid]["data"]["label"] = label

    for m in decl.finditer(content):
        label, alias, plain = m.group(1), m.group(2), m.group(3)
        if alias:
            ensure(alias, label)
        elif plain:
            ensure(plain)
    for m in bracket.finditer(content):
        name = m.group(1).strip()
        ensure(re.sub(r"\W+", "_", name), name)

    seen: set[tuple[str, str]] = set()
    for m in arrow.finditer(content):
        src, tgt = m.group(1), m.group(2)
        if (src, tgt) in seen:
            continue
        seen.add((src, tgt))
        ensure(src)
        ensure(tgt)
        edges.append({"id": f"e{len(edges)}", "source": f"n-{src}", "target": f"n-{tgt}"})

    if not nodes:
        return DEFAULT_NODES, DEFAULT_EDGES

    node_list = list(nodes.values())
    _layout(node_list)
    return node_list, edges


def build_diagram(
    content: str | None, diagram_type: str | None
) -> tuple[list, list, bool]:
    """Return (nodes, edges, parsed).

    ``parsed`` is False when no real diagram source could be parsed and the
    built-in sample graph is returned — callers should label that to the user
    rather than presenting sample data as the user's own architecture.
    """
    if content:
        lowered = content.lower()
        if diagram_type == "Mermaid" or "graph " in lowered or "flowchart" in lowered:
            return (*parse_mermaid(content), True)
        if diagram_type == "PlantUML" or "@startuml" in lowered:
            return (*parse_plantuml(content), True)
    return DEFAULT_NODES, DEFAULT_EDGES, False


def node_labels(nodes: list[dict]) -> dict[str, str]:
    return {n["id"]: n.get("data", {}).get("label", n["id"]) for n in nodes}


def has_component(labels: list[str], *keywords: str) -> bool:
    lower = [label.lower() for label in labels]
    return any(any(kw in label for kw in keywords) for label in lower)

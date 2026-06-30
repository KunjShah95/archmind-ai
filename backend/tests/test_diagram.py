"""Tests for diagram parsing (Mermaid, PlantUML, sample fallback)."""

from app.services.diagram import (
    DEFAULT_NODES,
    build_diagram,
    detect_diagram_type,
    parse_mermaid,
    parse_plantuml,
)


def _edge_pairs(edges):
    return {(e["source"], e["target"]) for e in edges}


class TestDetectDiagramType:
    def test_mermaid_by_extension(self):
        assert detect_diagram_type(None, "arch.mmd") == "Mermaid"

    def test_plantuml_by_content(self):
        assert detect_diagram_type("@startuml\n@enduml", None) == "PlantUML"

    def test_mermaid_by_content(self):
        assert detect_diagram_type("graph TD\nA-->B", None) == "Mermaid"

    def test_unknown_falls_back_to_architecture(self):
        assert detect_diagram_type("random text", None) == "Architecture"


class TestParseMermaid:
    def test_inline_label_on_source_keeps_edge(self):
        # Regression: source node with inline [label] previously dropped the edge.
        content = "graph TD\n  LB[Load Balancer] --> API[API Server]"
        nodes, edges = parse_mermaid(content)
        assert _edge_pairs(edges) == {("n-LB", "n-API")}

    def test_all_edges_captured(self):
        content = (
            "graph TD\n"
            "  LB[Load Balancer] --> API[API Server]\n"
            "  API --> DB[(Postgres)]\n"
            "  API -->|cache| Cache[Redis]\n"
            "  API ==> Queue[RabbitMQ]"
        )
        nodes, edges = parse_mermaid(content)
        assert len(edges) == 4
        assert _edge_pairs(edges) == {
            ("n-LB", "n-API"),
            ("n-API", "n-DB"),
            ("n-API", "n-Cache"),
            ("n-API", "n-Queue"),
        }

    def test_edge_label_does_not_leak_into_target(self):
        nodes, edges = parse_mermaid("graph LR\nA -->|sends| B")
        assert _edge_pairs(edges) == {("n-A", "n-B")}

    def test_labels_extracted(self):
        nodes, _ = parse_mermaid("graph TD\nAPI[API Server] --> DB[(Postgres)]")
        by_id = {n["id"]: n["data"]["label"] for n in nodes}
        assert by_id["n-API"] == "API Server"
        assert by_id["n-DB"] == "Postgres"

    def test_reserved_keywords_not_nodes(self):
        nodes, _ = parse_mermaid("graph TD\nA --> B")
        ids = {n["id"] for n in nodes}
        assert "n-graph" not in ids and "n-TD" not in ids

    def test_duplicate_edges_deduped(self):
        nodes, edges = parse_mermaid("graph TD\nA-->B\nA-->B")
        assert len(edges) == 1

    def test_nodes_get_positions(self):
        nodes, _ = parse_mermaid("graph TD\nA-->B")
        assert all("position" in n and "x" in n["position"] for n in nodes)

    def test_empty_returns_sample(self):
        nodes, edges = parse_mermaid("graph TD")
        assert nodes == DEFAULT_NODES


class TestParsePlantUML:
    def test_component_alias_and_arrow(self):
        content = (
            "@startuml\n"
            'component "Web App" as Web\n'
            "database DB\n"
            "Web --> DB\n"
            "@enduml"
        )
        nodes, edges = parse_plantuml(content)
        labels = {n["id"]: n["data"]["label"] for n in nodes}
        assert labels["n-Web"] == "Web App"
        assert _edge_pairs(edges) == {("n-Web", "n-DB")}

    def test_dotted_arrow(self):
        nodes, edges = parse_plantuml("@startuml\nWeb ..> Cache\n@enduml")
        assert _edge_pairs(edges) == {("n-Web", "n-Cache")}


class TestBuildDiagram:
    def test_mermaid_parsed_flag_true(self):
        nodes, edges, parsed = build_diagram("graph TD\nA-->B", "Mermaid")
        assert parsed is True
        assert len(edges) == 1

    def test_plantuml_parsed_flag_true(self):
        nodes, edges, parsed = build_diagram("@startuml\nA-->B\n@enduml", "PlantUML")
        assert parsed is True

    def test_image_returns_sample_unparsed(self):
        nodes, edges, parsed = build_diagram(None, "PNG")
        assert parsed is False
        assert nodes == DEFAULT_NODES

    def test_content_without_known_type_is_sample(self):
        nodes, edges, parsed = build_diagram("just prose, no diagram", "Architecture")
        assert parsed is False

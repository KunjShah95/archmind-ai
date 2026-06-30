"""Tests for vision graph extraction and JSON parsing (no network)."""

import app.services.llm as llm
from app.services.llm import _extract_json, llm_vision_extract_graph


class TestExtractJson:
    def test_plain_json(self):
        assert _extract_json('{"a": 1}') == {"a": 1}

    def test_fenced_json(self):
        assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}

    def test_json_with_surrounding_prose(self):
        assert _extract_json('Here you go:\n{"a": 1}\nThanks') == {"a": 1}

    def test_garbage_returns_none(self):
        assert _extract_json("not json at all") is None


class TestVisionExtractGraph:
    def _patch(self, monkeypatch, reply):
        monkeypatch.setattr(llm, "llm_vision_complete", lambda *a, **k: reply)

    def test_normalizes_nodes_and_edges(self, monkeypatch):
        self._patch(monkeypatch,
            '{"nodes":[{"id":"api","label":"API Gateway"},{"id":"db","label":"Postgres"}],'
            '"edges":[{"source":"api","target":"db"}]}')
        nodes, edges = llm_vision_extract_graph(b"img")
        assert [n["id"] for n in nodes] == ["n-api", "n-db"]
        assert nodes[0]["data"]["label"] == "API Gateway"
        assert edges == [{"id": "e0", "source": "n-api", "target": "n-db"}]

    def test_nodes_get_positions(self, monkeypatch):
        self._patch(monkeypatch, '{"nodes":[{"id":"a","label":"A"}],"edges":[]}')
        nodes, _ = llm_vision_extract_graph(b"img")
        assert "position" in nodes[0]

    def test_edge_to_unknown_node_dropped(self, monkeypatch):
        self._patch(monkeypatch,
            '{"nodes":[{"id":"a","label":"A"}],"edges":[{"source":"a","target":"ghost"}]}')
        _, edges = llm_vision_extract_graph(b"img")
        assert edges == []

    def test_duplicate_node_ids_deduped(self, monkeypatch):
        self._patch(monkeypatch,
            '{"nodes":[{"id":"a","label":"A"},{"id":"a","label":"A2"}],"edges":[]}')
        nodes, _ = llm_vision_extract_graph(b"img")
        assert len(nodes) == 1

    def test_no_provider_returns_none(self, monkeypatch):
        self._patch(monkeypatch, None)
        assert llm_vision_extract_graph(b"img") is None

    def test_empty_nodes_returns_none(self, monkeypatch):
        self._patch(monkeypatch, '{"nodes":[],"edges":[]}')
        assert llm_vision_extract_graph(b"img") is None

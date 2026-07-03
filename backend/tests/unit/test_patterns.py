"""Unit tests for architecture pattern detection."""

import pytest
from app.services.patterns import detect_patterns


class TestPatternDetection:
    def test_netflix_pattern_detected(self):
        labels = ["cdn", "api gateway", "microservice", "load balancer", "service registry"]
        edges = ["cdn -> api gateway", "api gateway -> microservice"]
        results = detect_patterns(labels, edges)
        netflix = [r for r in results if "Netflix" in r.name]
        assert len(netflix) > 0
        assert netflix[0].similarity > 0.3

    def test_uber_pattern_detected(self):
        labels = ["kafka", "event bus", "dispatcher", "stream processor", "database"]
        edges = ["event bus -> dispatcher"]
        results = detect_patterns(labels, edges)
        uber = [r for r in results if "Uber" in r.name]
        assert len(uber) > 0

    def test_no_pattern_match(self):
        labels = ["simple app", "sqlite", "cron job"]
        edges = ["simple app -> sqlite"]
        results = detect_patterns(labels, edges)
        assert len(results) == 0

    def test_multiple_patterns_detected(self):
        labels = ["cdn", "api gateway", "kafka", "storefront", "checkout", "payment gateway"]
        edges = ["cdn -> api gateway", "api gateway -> kafka"]
        results = detect_patterns(labels, edges)
        assert len(results) >= 2

    def test_patterns_ordered_by_similarity(self):
        labels = ["cdn", "api gateway", "service registry", "circuit breaker", "load balancer"]
        edges = ["cdn -> api gateway"]
        results = detect_patterns(labels, edges)
        if len(results) >= 2:
            assert results[0].similarity >= results[1].similarity

    def test_match_includes_missing_components(self):
        labels = ["cdn", "api gateway"]
        edges: list[str] = []
        results = detect_patterns(labels, edges)
        if results:
            assert len(results[0].missing_components) > 0

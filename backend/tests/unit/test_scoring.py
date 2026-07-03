"""Unit tests for ensemble scoring and confidence."""

import pytest
from app.services.scoring import compute_ensemble, compute_finding_confidence


class TestEnsembleScoring:
    def test_all_signals_present(self):
        result = compute_ensemble(llm_score=85.0, heuristic_score=70.0, pattern_score=60.0)
        assert 70 <= result.final_score <= 80
        assert result.confidence > 0.5
        assert len(result.signals) == 3

    def test_llm_only(self):
        result = compute_ensemble(llm_score=90.0, heuristic_score=None, pattern_score=None)
        assert result.final_score == 90.0
        assert result.confidence < 0.7  # Moderate confidence with single signal

    def test_heuristic_only(self):
        result = compute_ensemble(llm_score=None, heuristic_score=92.0, pattern_score=None)
        assert result.final_score == 92.0
        assert not result.is_low_confidence  # Single but valid signal

    def test_no_signals(self):
        result = compute_ensemble(llm_score=None, heuristic_score=None, pattern_score=None)
        assert result.final_score == 50.0
        assert result.confidence == 0.0
        assert result.is_low_confidence

    def test_divergent_signals(self):
        result = compute_ensemble(llm_score=95.0, heuristic_score=40.0, pattern_score=30.0)
        assert result.is_low_confidence  # High variance

    def test_convergent_signals(self):
        result = compute_ensemble(llm_score=82.0, heuristic_score=78.0, pattern_score=75.0)
        assert not result.is_low_confidence
        assert result.confidence > 0.7

    def test_custom_weights(self):
        result = compute_ensemble(
            llm_score=80.0, heuristic_score=60.0, pattern_score=70.0,
            weights={"llm": 1.0, "heuristic": 0.0, "pattern": 0.0},
        )
        assert result.final_score == 80.0

    def test_scores_clamped(self):
        result = compute_ensemble(llm_score=150.0, heuristic_score=-10.0, pattern_score=50.0)
        assert 0 <= result.final_score <= 100

    def test_weight_validation(self):
        result = compute_ensemble(llm_score=80.0, heuristic_score=80.0, pattern_score=80.0)
        assert result.signals["llm"] == 80.0
        assert result.weights_used["llm"] == 0.5


class TestFindingConfidence:
    def test_critical_with_llm_and_heuristic(self):
        c = compute_finding_confidence("critical", has_llm_support=True, has_heuristic_match=True, agent_count=2)
        assert c > 0.8

    def test_low_without_support(self):
        c = compute_finding_confidence("low", has_llm_support=False, has_heuristic_match=False, agent_count=1)
        assert c < 0.7

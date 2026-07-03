"""Multi-signal ensemble scoring with confidence metrics."""

import math
import statistics
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class ScoreSignal:
    llm_score: float           # Score from LLM agent analysis
    heuristic_score: float     # Score from rule-based heuristic analysis
    pattern_score: float       # Score from pattern detection (0-100)
    weights: dict[str, float] = field(default_factory=lambda: {"llm": 0.5, "heuristic": 0.3, "pattern": 0.2})


@dataclass
class EnsembleResult:
    final_score: float         # Weighted ensemble score (0-100)
    confidence: float          # Confidence metric (0.0-1.0)
    signals: dict[str, float]  # Individual signal scores
    weights_used: dict[str, float]
    is_low_confidence: bool    # True if signals diverge significantly


DEFAULT_WEIGHTS = {"llm": 0.5, "heuristic": 0.3, "pattern": 0.2}


def compute_ensemble(
    llm_score: float | None,
    heuristic_score: float | None,
    pattern_score: float | None,
    weights: dict[str, float] | None = None,
) -> EnsembleResult:
    """Compute weighted ensemble score with confidence metric.
    
    Confidence is based on signal clustering:
    - Low variance (< 100) = high confidence
    - High variance (> 400) = low confidence (signals disagree)
    - Missing signals reduce confidence proportionally.
    """
    w = weights or DEFAULT_WEIGHTS.copy()
    
    signals: dict[str, float] = {}
    total_weight = 0.0
    weighted_sum = 0.0
    
    signal_pairs = [
        ("llm", llm_score, w.get("llm", 0.5)),
        ("heuristic", heuristic_score, w.get("heuristic", 0.3)),
        ("pattern", pattern_score, w.get("pattern", 0.2)),
    ]
    
    for name, score, weight in signal_pairs:
        if score is not None:
            signals[name] = round(score, 1)
            weighted_sum += score * weight
            total_weight += weight
    
    if not signals or total_weight == 0:
        return EnsembleResult(
            final_score=50.0,
            confidence=0.0,
            signals={},
            weights_used=w,
            is_low_confidence=True,
        )
    
    final_score = weighted_sum / total_weight
    
    # Confidence: based on variance of available signals
    values = list(signals.values())
    if len(values) >= 2:
        variance = statistics.variance(values)
        # Map variance to confidence: 0 var = 1.0, 400+ var = 0.0
        confidence = max(0.0, 1.0 - (variance / 400.0))
    else:
        # Single signal - moderate confidence (can't verify)
        confidence = 0.6
    
    # Apply signal count penalty
    signal_ratio = len(signals) / 3  # 3 possible signals
    confidence *= (0.5 + 0.5 * signal_ratio)
    
    # Clamp
    confidence = max(0.0, min(1.0, confidence))
    final_score = max(0.0, min(100.0, final_score))
    
    return EnsembleResult(
        final_score=round(final_score, 1),
        confidence=round(confidence, 2),
        signals=signals,
        weights_used=w,
        is_low_confidence=confidence < 0.35,
    )


def compute_finding_confidence(
    severity: str,
    has_llm_support: bool,
    has_heuristic_match: bool,
    agent_count: int,
) -> float:
    """Confidence that a finding is accurate.
    
    Higher confidence when:
    - Severity is critical/high (easier to detect)
    - Both LLM and heuristic agree
    - Multiple agents flagged similar issues
    """
    base = 0.5
    
    # Severity boost
    severity_boost = {"critical": 0.2, "high": 0.15, "medium": 0.1, "low": 0.05}
    base += severity_boost.get(severity, 0.0)
    
    # Multi-source agreement
    if has_llm_support and has_heuristic_match:
        base += 0.2
    elif has_llm_support or has_heuristic_match:
        base += 0.1
    
    # Cross-agent validation
    base += min(0.15, agent_count * 0.05)
    
    return round(min(1.0, base), 2)

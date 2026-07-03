"""Domain-specific exceptions and error handling."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineError(Exception):
    """An error that occurred during a pipeline stage."""

    error_code: str
    failed_step: str
    message: str = ""
    retryable: bool = True
    details: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.message:
            self.message = f"Pipeline step '{self.failed_step}' failed: {self.error_code}"


@dataclass
class LLMProviderError(Exception):
    """An error from an LLM provider that should be logged but not crash the pipeline."""

    provider: str
    model: str
    message: str
    status_code: int = 0
    retryable: bool = True

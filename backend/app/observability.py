"""Structured logging, correlation IDs, and observability utilities."""

import uuid
from contextvars import ContextVar

import structlog

_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    return _correlation_id.get()


def set_correlation_id(cid: str | None = None) -> str:
    if not cid:
        cid = uuid.uuid4().hex[:16]
    _correlation_id.set(cid)
    return cid


def configure_logging() -> None:

    from app.config import get_settings
    settings = get_settings()

    is_dev = settings.dev_mode or settings.database_url.startswith("sqlite")

    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if is_dev:
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        processors.append(structlog.processors.format_exc_info)
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(**kwargs) -> structlog.stdlib.BoundLogger:
    logger = structlog.get_logger()
    cid = get_correlation_id()
    if cid:
        logger = logger.bind(correlation_id=cid)
    if kwargs:
        logger = logger.bind(**kwargs)
    return logger

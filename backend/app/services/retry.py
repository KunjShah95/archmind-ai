"""
Retry logic and dead-letter queue for failed analyses.
"""

from __future__ import annotations

import random

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import FailedAnalysis
from datetime import datetime, timedelta


def _calculate_backoff(attempt: int, base_delay: int = 60, max_delay: int = 3600) -> int:
    """
    Calculate delay with exponential backoff and jitter.
    
    Args:
        attempt: The current attempt number (0-indexed).
        base_delay: Base delay in seconds.
        max_delay: Maximum delay in seconds.
    
    Returns:
        Delay in seconds.
    """
    delay = min(base_delay * (2 ** attempt), max_delay)
    # Add jitter: random delay between 0.5 * delay and 1.5 * delay
    jitter = delay * 0.5 * random.random()
    return int(delay + jitter)


def schedule_retry(
    db: Session,
    analysis_id: str,
    error_code: str,
    failed_step: str,
    error_message: str,
) -> FailedAnalysis:
    """
    Schedule a failed analysis for retry.
    
    Args:
        db: Database session.
        analysis_id: ID of the analysis that failed.
        error_code: Error code from the failure.
        failed_step: Step where the failure occurred.
        error_message: Error message.
    
    Returns:
        The created FailedAnalysis record.
    """
    # Create a new failed analysis record
    failed = FailedAnalysis(
        analysis_id=analysis_id,
        error_code=error_code,
        failed_step=failed_step,
        error_message=error_message,
        attempted_at=datetime.utcnow(),
        retry_count=0,
        next_retry_at=None,  # Will be set below
    )
    
    # Calculate initial retry delay (first retry after 1 minute)
    delay_seconds = _calculate_backoff(attempt=0)
    failed.next_retry_at = datetime.utcnow() + timedelta(seconds=delay_seconds)

    db.add(failed)
    try:
        db.commit()
        db.refresh(failed)
    except SQLAlchemyError:
        db.rollback()
        raise
    
    return failed


def process_retry_queue(db: Session) -> list[FailedAnalysis]:
    """
    Process the retry queue, returning a list of failed analyses that are ready for retry.
    This function does not perform the retry itself; it returns the items ready to be retried.
    The caller should update the retry count and next_retry_at after attempting.
    
    Uses FOR UPDATE SKIP LOCKED to allow multiple workers to safely process the queue.
    
    Args:
        db: Database session.
    
    Returns:
        List of FailedAnalysis instances that are ready for retry.
    """
    now = datetime.utcnow()
    stmt = (
        select(FailedAnalysis)
        .where(FailedAnalysis.next_retry_at <= now)
        .with_for_update(skip_locked=True)
        .order_by(FailedAnalysis.next_retry_at)
    )
    try:
        result = db.execute(stmt)
        return list(result.scalars().all())
    except SQLAlchemyError:
        # In case of error, we don't want to block the worker; return empty list.
        return []


def mark_retry_attempt(
    db: Session,
    failed_analysis: FailedAnalysis,
    success: bool,
    error_code: str | None = None,
    failed_step: str | None = None,
    error_message: str | None = None,
) -> None:
    """
    Update the failed analysis after a retry attempt.
    
    If success is True, the record is deleted (optional: could keep it for history).
    If success is False, we increment retry count and reschedule.
    
    Args:
        db: Database session.
        failed_analysis: The FailedAnalysis instance to update.
        success: Whether the retry attempt succeeded.
        error_code: New error code if failed (optional).
        failed_step: New failed step if failed (optional).
        error_message: New error message if failed (optional).
    """
    if success:
        # Delete the record on success (optional: could keep it for history)
        db.delete(failed_analysis)
    else:
        failed_analysis.retry_count += 1
        failed_analysis.attempted_at = datetime.utcnow()
        if error_code is not None:
            failed_analysis.error_code = error_code
        if failed_step is not None:
            failed_analysis.failed_step = failed_step
        if error_message is not None:
            failed_analysis.error_message = error_message
        
        # Calculate next retry delay
        delay_seconds = _calculate_backoff(attempt=failed_analysis.retry_count)
        failed_analysis.next_retry_at = datetime.utcnow() + timedelta(seconds=delay_seconds)

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

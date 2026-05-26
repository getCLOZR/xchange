from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog


def log_activity(
    db: Session,
    event_type: str,
    message: str,
    agent_id: Optional[int] = None,
) -> ActivityLog:
    """Record an exchange activity event."""
    entry = ActivityLog(
        event_type=event_type,
        message=message,
        agent_id=agent_id,
    )
    db.add(entry)
    return entry


def get_recent_activity(db: Session, limit: int = 50) -> list[ActivityLog]:
    """Return the most recent activity log entries."""
    stmt = (
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())

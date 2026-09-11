"""Pomodoro router — session logging and history."""
import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.pomodoro import PomodoroSession
from backend.schemas.schemas import PomodoroSessionCreate, PomodoroSessionResponse

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.get("/log", response_model=list[PomodoroSessionResponse])
def get_log(
    date: str | None = Query(None),
    type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(PomodoroSession)
    if date:
        q = q.filter(PomodoroSession.date == date)
    if type:
        q = q.filter(PomodoroSession.type == type)
    return q.order_by(PomodoroSession.date.desc(), PomodoroSession.time.desc()).all()


def _split_at_midnight(start_date_str: str, start_time_str: str, duration_min: int):
    """
    Given a session's start date (YYYY-MM-DD), start time (HH:MM), and duration,
    check if it crosses midnight. If so, return two (date, time, duration_min) tuples;
    otherwise return a single tuple.
    """
    try:
        start_date = date.fromisoformat(start_date_str)
        parts = start_time_str.split(":")
        start_hour, start_minute = int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        # Can't parse — return as-is, no split
        return [(start_date_str, start_time_str, duration_min)]

    start_dt = datetime.combine(start_date, datetime.min.time().replace(
        hour=start_hour, minute=start_minute
    ))
    end_dt = start_dt + timedelta(minutes=duration_min)
    midnight = datetime.combine(start_date + timedelta(days=1), datetime.min.time())

    if end_dt <= midnight:
        # Doesn't cross midnight — single session
        return [(start_date_str, start_time_str, duration_min)]

    # Split at midnight
    before_midnight_min = int((midnight - start_dt).total_seconds() // 60)
    after_midnight_min = duration_min - before_midnight_min

    parts_out = []
    if before_midnight_min > 0:
        parts_out.append((start_date_str, start_time_str, before_midnight_min))
    if after_midnight_min > 0:
        next_date_str = (start_date + timedelta(days=1)).isoformat()
        parts_out.append((next_date_str, "00:00", after_midnight_min))

    return parts_out if parts_out else [(start_date_str, start_time_str, duration_min)]


@router.post("/sessions", response_model=PomodoroSessionResponse | list[PomodoroSessionResponse], status_code=201)
def log_session(data: PomodoroSessionCreate, db: Session = Depends(get_db)):
    # Determine if we need to split the session at midnight
    if data.start_time:
        parts = _split_at_midnight(data.date, data.start_time, data.duration_min)
    else:
        # Fallback: use the completion time to check if session started before midnight
        parts = _try_infer_split(data.date, data.time, data.duration_min)

    created_sessions = []
    for part_date, part_time, part_dur in parts:
        session = PomodoroSession(
            id=str(uuid.uuid4()),
            date=part_date,
            time=part_time,
            type=data.type,
            task=data.task,
            duration_min=part_dur,
            created_at=utcnow(),
        )
        db.add(session)
        created_sessions.append(session)

    db.commit()
    for s in created_sessions:
        db.refresh(s)

    # Return single object for backward compatibility when no split occurred
    if len(created_sessions) == 1:
        return created_sessions[0]
    return created_sessions


def _try_infer_split(end_date_str: str, end_time_str: str, duration_min: int):
    """
    Fallback when start_time is not provided: infer the start time from end time
    minus duration to detect midnight crossings.
    """
    if not end_time_str:
        return [(end_date_str, end_time_str, duration_min)]
    try:
        end_date = date.fromisoformat(end_date_str)
        parts = end_time_str.split(":")
        end_hour, end_minute = int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return [(end_date_str, end_time_str, duration_min)]

    end_dt = datetime.combine(end_date, datetime.min.time().replace(
        hour=end_hour, minute=end_minute
    ))
    start_dt = end_dt - timedelta(minutes=duration_min)

    # Check if start was on the previous day
    if start_dt.date() < end_date:
        start_date_str = start_dt.date().isoformat()
        start_time_str = start_dt.strftime("%H:%M")
        return _split_at_midnight(start_date_str, start_time_str, duration_min)

    return [(end_date_str, end_time_str, duration_min)]

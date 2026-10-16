import sys
import uuid
from datetime import datetime, timezone

from backend.database import SessionLocal, utcnow
from backend.models.pomodoro import PomodoroSession

def restore_session():
    db = SessionLocal()
    # Check if a 240 min session on 2026-10-16 already exists
    existing = db.query(PomodoroSession).filter(
        PomodoroSession.date == "2026-10-16",
        PomodoroSession.duration_min == 240
    ).first()

    if existing:
        print(f"Session already exists: ID {existing.id}, Date {existing.date}, Duration {existing.duration_min} min")
        db.close()
        return

    session = PomodoroSession(
        id=str(uuid.uuid4()),
        date="2026-10-16",
        time="22:56",
        type="work",
        task="",
        subject_id=None,
        subject_name=None,
        task_id=None,
        duration_min=240,
        created_at=utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    print(f"Successfully restored 4-hour session: ID {session.id}, {session.duration_min} min on {session.date} at {session.time}")
    db.close()

if __name__ == "__main__":
    restore_session()

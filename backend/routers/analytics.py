"""Analytics router — aggregated overview data for the dashboard."""
import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.task import Task
from backend.models.test import Test
from backend.models.assignment import Assignment
from backend.models.practical import Practical
from backend.models.syllabus import Subject
from backend.models.pomodoro import PomodoroSession
from backend.models.settings import Setting
from backend.schemas.schemas import (
    OverviewData, TaskResponse, TestResponse, AssignmentResponse, PracticalResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

PRIORITY_ORDER = ["Immediate", "Important", "2nd Priority", "3rd Priority", "Someday"]


def _days_until(date_str: str) -> int | None:
    try:
        return (date.fromisoformat(date_str) - date.today()).days
    except (ValueError, TypeError):
        return None


@router.get("/overview", response_model=OverviewData)
def get_overview(db: Session = Depends(get_db)):
    today_iso = date.today().isoformat()

    # Tests due (future + today)
    all_tests = db.query(Test).all()
    upcoming_tests = sorted(
        [t for t in all_tests if (d := _days_until(t.date)) is not None and d >= 0],
        key=lambda t: t.date
    )

    # Pending tasks count and top 5 priority tasks
    tasks_count = db.query(Task).filter(Task.done == False, Task.archived == False).count()
    pending_tasks = db.query(Task).filter(Task.done == False, Task.archived == False).all()
    pending_tasks.sort(
        key=lambda t: PRIORITY_ORDER.index(t.priority)
        if t.priority in PRIORITY_ORDER else 99
    )

    # Pending assignments count & top 4 upcoming
    asgn_count = db.query(Assignment).filter(
        Assignment.submitted == False, Assignment.archived == False
    ).count()
    upcoming_asgn = db.query(Assignment).filter(
        Assignment.submitted == False, Assignment.archived == False
    ).order_by(Assignment.due.asc()).limit(4).all()

    # Pending practicals count & top 4
    prac_count = db.query(Practical).filter(
        Practical.done == False, Practical.archived == False
    ).count()
    upcoming_prac = db.query(Practical).filter(
        Practical.done == False, Practical.archived == False
    ).limit(4).all()

    # Subject count
    subjects_count = db.query(Subject).count()

    # Pomodoro today & focus hours
    today_sessions = db.query(PomodoroSession).filter(
        PomodoroSession.date == today_iso,
        PomodoroSession.type == "work"
    ).all()
    pomo_today = len(today_sessions)
    today_minutes = sum(s.duration_min for s in today_sessions if s.duration_min)
    focus_hours_today = round(today_minutes / 60.0, 1)

    # Streak
    from backend.routers.productivity import calc_current_streak
    streak = calc_current_streak(db)

    return OverviewData(
        tests_due=len(upcoming_tests),
        tasks_pending=tasks_count,
        assignments_pending=asgn_count,
        practicals_pending=prac_count,
        subjects_count=subjects_count,
        pomodoros_today=pomo_today,
        focus_hours_today=focus_hours_today,
        streak=streak,
        upcoming_tests=upcoming_tests[:4],
        top_tasks=pending_tasks[:5],
        upcoming_assignments=upcoming_asgn,
        pending_practicals=upcoming_prac,
    )

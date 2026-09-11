"""Productivity router — scores, heatmap, spider chart data, and analytics."""
import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.pomodoro import PomodoroSession
from backend.models.settings import Setting
from backend.schemas.schemas import (
    ProductivityScores, ScoreCard, HeatmapDay, SpiderData,
    SubjectBreakdownItem, DailyTrendDay, DailyTrendSummary,
    ProductivityBadge, ProductivityInsight
)

SUBJECT_COLORS = [
    "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
    "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#06b6d4"
]


# (existing helper functions continue)

router = APIRouter(prefix="/productivity", tags=["productivity"])


def _get_goal_hours(db: Session, default: float = 3.0) -> float:
    """Retrieve daily goal in hours from settings, defaulting to 3.0."""
    s = db.query(Setting).filter(Setting.key == "daily_goal").first()
    if s:
        try:
            val = json.loads(s.value) if isinstance(s.value, str) else s.value
            return float(val)
        except (json.JSONDecodeError, TypeError, ValueError):
            try:
                return float(s.value)
            except (ValueError, TypeError):
                return default
    return default


def _get_session_data_map(db: Session, start_date: str, end_date: str) -> dict[str, dict]:
    """Fetch pomodoro work session count and total duration grouped by date."""
    results = (
        db.query(
            PomodoroSession.date,
            func.count(PomodoroSession.id),
            func.coalesce(func.sum(PomodoroSession.duration_min), 0)
        )
        .filter(
            PomodoroSession.type == "work",
            PomodoroSession.date >= start_date,
            PomodoroSession.date <= end_date,
        )
        .group_by(PomodoroSession.date)
        .all()
    )
    data_map: dict[str, dict] = {}
    for r in results:
        if r[0]:
            d_min = int(r[2]) if r[2] else 0
            data_map[r[0]] = {
                "sessions": int(r[1]),
                "duration_min": d_min,
                "hours": round(d_min / 60.0, 2),
            }
    return data_map


def _score_grade(score: int) -> str:
    if score >= 80: return "EXCELLENT"
    if score >= 60: return "GOOD"
    if score >= 40: return "AVERAGE"
    if score > 0: return "NEEDS WORK"
    return "NO DATA"


def _calc_day_score(duration_min: int, goal_hours: float) -> int:
    """Calculate day score percentage based on hours worked vs goal hours."""
    hours = duration_min / 60.0
    return min(100, int((hours / max(goal_hours, 0.1)) * 100))


def _calc_period_score(data_map: dict[str, dict], days: list[str], goal_hours: float) -> int:
    scores = [
        _calc_day_score(data_map[d]["duration_min"], goal_hours)
        for d in days
        if d in data_map and data_map[d]["duration_min"] > 0
    ]
    return int(sum(scores) / len(scores)) if scores else 0


def calc_current_streak(db: Session) -> int:
    """Calculate current day streak dynamically based on active Pomodoro work sessions."""
    today = date.today()
    yesterday = today - timedelta(days=1)

    results = (
        db.query(PomodoroSession.date)
        .filter(PomodoroSession.type == "work")
        .group_by(PomodoroSession.date)
        .all()
    )
    active_dates = {r[0] for r in results if r[0]}

    today_iso = today.isoformat()
    yesterday_iso = yesterday.isoformat()

    if today_iso in active_dates:
        curr_check = today
    elif yesterday_iso in active_dates:
        curr_check = yesterday
    else:
        return 0

    streak = 0
    while curr_check.isoformat() in active_dates:
        streak += 1
        curr_check -= timedelta(days=1)

    return streak


@router.get("/scores", response_model=ProductivityScores)
def get_scores(db: Session = Depends(get_db)):
    goal = _get_goal_hours(db, 3.0)
    streak = calc_current_streak(db)

    today = date.today()
    today_iso = today.isoformat()
    yesterday_iso = (today - timedelta(days=1)).isoformat()
    week_start = today - timedelta(days=today.weekday())
    week_days = [(week_start + timedelta(days=i)).isoformat() for i in range(7)]
    month_start = today.replace(day=1)
    month_days = [(month_start + timedelta(days=i)).isoformat()
                  for i in range((today - month_start).days + 1)]

    min_date = min([yesterday_iso] + week_days + month_days)
    data_map = _get_session_data_map(db, min_date, today_iso)

    today_data = data_map.get(today_iso, {"sessions": 0, "duration_min": 0, "hours": 0.0})
    yest_data = data_map.get(yesterday_iso, {"sessions": 0, "duration_min": 0, "hours": 0.0})

    s_today = _calc_day_score(today_data["duration_min"], goal)
    s_yest = _calc_day_score(yest_data["duration_min"], goal)
    s_week = _calc_period_score(data_map, week_days, goal)
    s_month = _calc_period_score(data_map, month_days, goal)

    tot_week_min = sum(data_map.get(d, {}).get("duration_min", 0) for d in week_days)
    tot_week_sessions = sum(data_map.get(d, {}).get("sessions", 0) for d in week_days)
    tot_month_min = sum(data_map.get(d, {}).get("duration_min", 0) for d in month_days)
    tot_month_sessions = sum(data_map.get(d, {}).get("sessions", 0) for d in month_days)

    return ProductivityScores(
        today=ScoreCard(
            period="TODAY",
            score=s_today,
            sessions=today_data["sessions"],
            duration_min=today_data["duration_min"],
            hours=round(today_data["duration_min"] / 60.0, 1),
            grade=_score_grade(s_today)
        ),
        yesterday=ScoreCard(
            period="YESTERDAY",
            score=s_yest,
            sessions=yest_data["sessions"],
            duration_min=yest_data["duration_min"],
            hours=round(yest_data["duration_min"] / 60.0, 1),
            grade=_score_grade(s_yest)
        ),
        week=ScoreCard(
            period="THIS WEEK",
            score=s_week,
            sessions=tot_week_sessions,
            duration_min=tot_week_min,
            hours=round(tot_week_min / 60.0, 1),
            grade=_score_grade(s_week)
        ),
        month=ScoreCard(
            period="THIS MONTH",
            score=s_month,
            sessions=tot_month_sessions,
            duration_min=tot_month_min,
            hours=round(tot_month_min / 60.0, 1),
            grade=_score_grade(s_month)
        ),
        streak=streak,
        daily_goal=goal,
    )


@router.get("/heatmap", response_model=list[HeatmapDay])
def get_heatmap(
    days: int = 730,
    year: int | None = None,
    db: Session = Depends(get_db),
):
    goal = _get_goal_hours(db, 3.0)

    if year is not None:
        d1 = date(year, 1, 1)
        d2 = date(year, 12, 31)
        start_date = d1.isoformat()
        end_date = d2.isoformat()
        total_days = (d2 - d1).days + 1

        data_map = _get_session_data_map(db, start_date, end_date)
        result = []
        for i in range(total_days):
            d = (d1 + timedelta(days=i)).isoformat()
            entry = data_map.get(d, {"sessions": 0, "duration_min": 0, "hours": 0.0})
            score = _calc_day_score(entry["duration_min"], goal)
            result.append(
                HeatmapDay(
                    date=d,
                    score=score,
                    sessions=entry["sessions"],
                    duration_min=entry["duration_min"],
                    hours=round(entry["duration_min"] / 60.0, 2),
                )
            )
        return result

    today = date.today()
    start_date = (today - timedelta(days=days - 1)).isoformat()
    end_date = today.isoformat()

    data_map = _get_session_data_map(db, start_date, end_date)

    result = []
    for i in range(days):
        d = (today - timedelta(days=days - 1 - i)).isoformat()
        entry = data_map.get(d, {"sessions": 0, "duration_min": 0, "hours": 0.0})
        score = _calc_day_score(entry["duration_min"], goal)
        result.append(
            HeatmapDay(
                date=d,
                score=score,
                sessions=entry["sessions"],
                duration_min=entry["duration_min"],
                hours=round(entry["duration_min"] / 60.0, 2),
            )
        )
    return result


@router.get("/spider", response_model=SpiderData)
def get_spider(db: Session = Depends(get_db)):
    goal = _get_goal_hours(db, 3.0)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    last_week_start = week_start - timedelta(days=7)
    start_date = last_week_start.isoformat()
    end_date = (week_start + timedelta(days=6)).isoformat()

    data_map = _get_session_data_map(db, start_date, end_date)

    this_week: list[float] = []
    last_week: list[float] = []
    this_week_sessions: list[int] = []
    last_week_sessions: list[int] = []

    for i in range(7):
        d1 = (week_start + timedelta(days=i)).isoformat()
        d2 = (last_week_start + timedelta(days=i)).isoformat()
        e1 = data_map.get(d1, {"sessions": 0, "duration_min": 0, "hours": 0.0})
        e2 = data_map.get(d2, {"sessions": 0, "duration_min": 0, "hours": 0.0})
        this_week.append(round(e1["duration_min"] / 60.0, 2))
        last_week.append(round(e2["duration_min"] / 60.0, 2))
        this_week_sessions.append(e1["sessions"])
        last_week_sessions.append(e2["sessions"])

    return SpiderData(
        day_labels=day_labels,
        this_week=this_week,
        last_week=last_week,
        goal=goal,
        this_week_sessions=this_week_sessions,
        last_week_sessions=last_week_sessions,
    )


@router.get("/peak-hours")
def get_peak_hours(db: Session = Depends(get_db)):
    sessions = (
        db.query(PomodoroSession.time, PomodoroSession.duration_min)
        .filter(PomodoroSession.type == "work")
        .all()
    )
    hour_counts = [0] * 24
    hour_minutes = [0] * 24
    for time_str, duration_min in sessions:
        if not time_str:
            continue
        try:
            parts = time_str.split(":")
            hour = int(parts[0])
            start_min = int(parts[1]) if len(parts) > 1 else 0
            remaining = duration_min or 25
            h = hour
            while remaining > 0:
                mins_in_hour = min(remaining, 60 - start_min)
                hour_minutes[h % 24] += mins_in_hour
                hour_counts[h % 24] += 1
                remaining -= mins_in_hour
                start_min = 0
                h += 1
        except (ValueError, IndexError):
            pass
    
    # Calculate top peak window (3-hour block)
    max_block_sum = -1
    best_start_hour = 14
    for h in range(22):
        block_sum = hour_minutes[h] + hour_minutes[h+1] + hour_minutes[h+2]
        if block_sum > max_block_sum:
            max_block_sum = block_sum
            best_start_hour = h

    return {
        "hours": list(range(24)),
        "counts": hour_counts,
        "minutes": hour_minutes,
        "peak_window_start": best_start_hour,
        "peak_window_end": (best_start_hour + 3) % 24,
    }


@router.get("/subject-breakdown", response_model=list[SubjectBreakdownItem])
def get_subject_breakdown(db: Session = Depends(get_db)):
    """
    Returns study time distribution by subject/task.
    Only processes sessions that explicitly include a subject tag or were logged as new tagged sessions.
    """
    sessions = (
        db.query(
            PomodoroSession.task,
            func.sum(func.coalesce(PomodoroSession.duration_min, 25)).label("duration_min"),
            func.count(PomodoroSession.id).label("sessions"),
        )
        .filter(
            PomodoroSession.type == "work",
            PomodoroSession.task != "",
            PomodoroSession.task != None,
        )
        .group_by(PomodoroSession.task)
        .all()
    )

    # Group by subject/task tag
    subject_map: dict[str, dict] = {}
    total_min = 0

    for task_str, d_min, s_count in sessions:
        task_str = (task_str or "").strip()
        if not task_str:
            continue
        
        # Normalize subject label (e.g. "[OOPs] Assignment" -> "OOPs", "Subject: ML" -> "ML", "Math: Calculus" -> "Math")
        subject_name = task_str
        if task_str.startswith("[") and "]" in task_str:
            subject_name = task_str[1:task_str.index("]")].strip()
        elif task_str.lower().startswith("subject:"):
            subject_name = task_str.split(":", 1)[1].strip()
        elif ":" in task_str:
            subject_name = task_str.split(":", 1)[0].strip()

        if not subject_name:
            subject_name = "General"

        d_min_int = int(d_min)
        s_count_int = int(s_count)
        total_min += d_min_int

        if subject_name not in subject_map:
            subject_map[subject_name] = {"duration_min": 0, "sessions": 0}
        subject_map[subject_name]["duration_min"] += d_min_int
        subject_map[subject_name]["sessions"] += s_count_int

    if not subject_map or total_min == 0:
        return []

    result: list[SubjectBreakdownItem] = []
    # Sort subjects by total duration descending
    sorted_subjects = sorted(subject_map.items(), key=lambda x: x[1]["duration_min"], reverse=True)

    for idx, (sub, data) in enumerate(sorted_subjects):
        d_min = data["duration_min"]
        pct = round((d_min / total_min) * 100, 1)
        color = SUBJECT_COLORS[idx % len(SUBJECT_COLORS)]
        result.append(
            SubjectBreakdownItem(
                subject=sub,
                duration_min=d_min,
                hours=round(d_min / 60.0, 2),
                sessions=data["sessions"],
                percentage=pct,
                color=color,
            )
        )
    return result



@router.get("/daily-trend", response_model=DailyTrendSummary)
def get_daily_trend(days: int = 14, db: Session = Depends(get_db)):
    """
    Returns daily focus hours vs daily goal line for the past N days (e.g. 14 or 30 days).
    """
    days = max(7, min(days, 60))
    goal = _get_goal_hours(db, 3.0)
    today = date.today()
    start_date = (today - timedelta(days=days - 1)).isoformat()
    end_date = today.isoformat()

    data_map = _get_session_data_map(db, start_date, end_date)

    trend_days: list[DailyTrendDay] = []
    goals_met = 0
    total_period_min = 0
    best_day_date = ""
    best_day_min = 0

    for i in range(days):
        cur_date = today - timedelta(days=days - 1 - i)
        d_str = cur_date.isoformat()
        day_label = cur_date.strftime("%a, %b %d")

        entry = data_map.get(d_str, {"sessions": 0, "duration_min": 0, "hours": 0.0})
        d_min = entry["duration_min"]
        d_hours = round(d_min / 60.0, 2)
        goal_reached = (d_hours >= goal)

        if goal_reached:
            goals_met += 1
        total_period_min += d_min

        if d_min > best_day_min:
            best_day_min = d_min
            best_day_date = d_str

        trend_days.append(
            DailyTrendDay(
                date=d_str,
                day_name=day_label,
                hours=d_hours,
                duration_min=d_min,
                sessions=entry["sessions"],
                goal_hours=goal,
                goal_reached=goal_reached,
            )
        )

    hit_rate = round((goals_met / days) * 100)
    avg_hours = round((total_period_min / 60.0) / days, 2)

    return DailyTrendSummary(
        days=trend_days,
        goal_hit_rate=hit_rate,
        daily_avg_hours=avg_hours,
        best_day_date=best_day_date or today.isoformat(),
        best_day_hours=round(best_day_min / 60.0, 2),
        total_period_hours=round(total_period_min / 60.0, 2),
    )


@router.get("/badges", response_model=list[ProductivityBadge])
def get_badges(db: Session = Depends(get_db)):
    """
    Evaluates dynamic achievement badges and milestone progress.
    """
    goal = _get_goal_hours(db, 3.0)
    
    total_sessions = db.query(func.count(PomodoroSession.id)).filter(PomodoroSession.type == "work").scalar() or 0
    total_min = db.query(func.coalesce(func.sum(PomodoroSession.duration_min), 0)).filter(PomodoroSession.type == "work").scalar() or 0
    total_hours = round(total_min / 60.0, 2)
    
    # Calculate daily totals across history grouped by date in SQL
    daily_stats = (
        db.query(
            PomodoroSession.date,
            func.sum(func.coalesce(PomodoroSession.duration_min, 25)).label("duration_min")
        )
        .filter(PomodoroSession.type == "work", PomodoroSession.date != None)
        .group_by(PomodoroSession.date)
        .all()
    )
    
    day_durations: dict[str, int] = {row[0]: int(row[1]) for row in daily_stats if row[0]}

    # Query only time strings for Night Owl / Early Bird checks
    time_rows = (
        db.query(PomodoroSession.time)
        .filter(PomodoroSession.type == "work", PomodoroSession.time != None, PomodoroSession.time != "")
        .all()
    )
    night_sessions = 0
    morning_sessions = 0
    for (t_str,) in time_rows:
        try:
            hr = int(t_str.split(":")[0])
            if hr >= 21 or hr < 4:
                night_sessions += 1
            elif 4 <= hr < 8:
                morning_sessions += 1
        except (ValueError, IndexError):
            pass

    max_day_min = max(day_durations.values()) if day_durations else 0
    max_day_hours = round(max_day_min / 60.0, 2)

    current_streak = calc_current_streak(db)

    # Check best week goal count
    # Group dates by (year, week_number)
    week_goal_counts: dict[str, int] = {}
    for d_str, d_min in day_durations.items():
        if (d_min / 60.0) >= goal:
            try:
                d_obj = date.fromisoformat(d_str)
                yr, wk, _ = d_obj.isocalendar()
                key = f"{yr}-W{wk}"
                week_goal_counts[key] = week_goal_counts.get(key, 0) + 1
            except ValueError:
                pass
    max_week_goals = max(week_goal_counts.values()) if week_goal_counts else 0

    badges = [
        ProductivityBadge(
            id="century_club",
            title="Century Club",
            description="Complete 100+ focus sessions.",
            icon="Award",
            category="Volume",
            unlocked=(total_sessions >= 100),
            progress=min(100.0, round((total_sessions / 100.0) * 100, 1)),
            current_value=total_sessions,
            target_value=100,
            progress_label=f"{total_sessions} / 100 sessions",
        ),
        ProductivityBadge(
            id="deep_work_master",
            title="Deep Work Master",
            description="Accumulate 30+ total study hours.",
            icon="Brain",
            category="Mastery",
            unlocked=(total_hours >= 30.0),
            progress=min(100.0, round((total_hours / 30.0) * 100, 1)),
            current_value=total_hours,
            target_value=30.0,
            progress_label=f"{total_hours:.1f} / 30.0 hrs",
        ),
        ProductivityBadge(
            id="streak_flame",
            title="Streak Flame",
            description="Maintain a continuous 7-day study streak.",
            icon="Flame",
            category="Consistency",
            unlocked=(current_streak >= 7),
            progress=min(100.0, round((current_streak / 7.0) * 100, 1)),
            current_value=current_streak,
            target_value=7,
            progress_label=f"{current_streak} / 7 days",
        ),
        ProductivityBadge(
            id="marathoner",
            title="Marathoner",
            description="Study 7.0+ hours in a single calendar day.",
            icon="Zap",
            category="Endurance",
            unlocked=(max_day_hours >= 7.0),
            progress=min(100.0, round((max_day_hours / 7.0) * 100, 1)),
            current_value=max_day_hours,
            target_value=7.0,
            progress_label=f"{max_day_hours:.1f} / 7.0 hrs in a day",
        ),
        ProductivityBadge(
            id="night_owl",
            title="Night Owl",
            description="Complete 5+ focus sessions late at night (after 9 PM).",
            icon="Moon",
            category="Focus Habits",
            unlocked=(night_sessions >= 5),
            progress=min(100.0, round((night_sessions / 5.0) * 100, 1)),
            current_value=night_sessions,
            target_value=5,
            progress_label=f"{night_sessions} / 5 night sessions",
        ),
        ProductivityBadge(
            id="early_bird",
            title="Early Bird",
            description="Complete 5+ focus sessions in the early morning (before 8 AM).",
            icon="Sun",
            category="Focus Habits",
            unlocked=(morning_sessions >= 5),
            progress=min(100.0, round((morning_sessions / 5.0) * 100, 1)),
            current_value=morning_sessions,
            target_value=5,
            progress_label=f"{morning_sessions} / 5 morning sessions",
        ),
        ProductivityBadge(
            id="consistency_champion",
            title="Consistency Champion",
            description="Hit your daily focus goal 5+ days in a single calendar week.",
            icon="Trophy",
            category="Consistency",
            unlocked=(max_week_goals >= 5),
            progress=min(100.0, round((max_week_goals / 5.0) * 100, 1)),
            current_value=max_week_goals,
            target_value=5,
            progress_label=f"{max_week_goals} / 5 days in a week",
        ),
    ]
    return badges


@router.get("/insights", response_model=list[ProductivityInsight])
def get_insights(db: Session = Depends(get_db)):
    """
    Generates smart, personalized productivity advice and focus patterns.
    """
    goal = _get_goal_hours(db, 3.0)
    streak = calc_current_streak(db)

    # Hourly distribution
    time_sessions = (
        db.query(PomodoroSession.time, PomodoroSession.duration_min)
        .filter(PomodoroSession.type == "work", PomodoroSession.time != None, PomodoroSession.time != "")
        .all()
    )
    total_sessions = len(time_sessions)
    hour_counts = [0] * 24
    for t_str, d_min in time_sessions:
        try:
            parts = t_str.split(":")
            hour = int(parts[0])
            start_min = int(parts[1]) if len(parts) > 1 else 0
            remaining = d_min or 25
            h = hour
            while remaining > 0:
                mins_in_hour = min(remaining, 60 - start_min)
                hour_counts[h % 24] += 1
                remaining -= mins_in_hour
                start_min = 0
                h += 1
        except (ValueError, IndexError):
            pass

    # Find peak 3-hour window
    max_h = 15
    max_cnt = 0
    for h in range(22):
        cnt = hour_counts[h] + hour_counts[h+1] + hour_counts[h+2]
        if cnt > max_cnt:
            max_cnt = cnt
            max_h = h

    def _fmt_hr(h: int) -> str:
        h12 = h % 12 or 12
        ampm = "AM" if h < 12 else "PM"
        return f"{h12}:00 {ampm}"

    peak_text = f"{_fmt_hr(max_h)} – {_fmt_hr((max_h + 3) % 24)}"
    peak_pct = round((max_cnt / max(1, total_sessions)) * 100) if total_sessions > 0 else 0

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_data = _get_session_data_map(db, week_start.isoformat(), today.isoformat())
    week_min = sum(v["duration_min"] for v in week_data.values())
    week_hrs = round(week_min / 60.0, 1)

    insights = [
        ProductivityInsight(
            type="peak_window",
            title="Golden Focus Zone",
            message=f"Your highest concentration occurs between {peak_text} ({peak_pct}% of your deep work). Schedule difficult study topics during this window for maximum retention.",
            icon="Sparkles",
            category="Optimization",
        ),
        ProductivityInsight(
            type="streak_momentum",
            title=f"{streak}-Day Focus Streak",
            message=f"You're currently on a strong {streak}-day active study streak! Consistency builds academic momentum.",
            icon="Flame",
            category="Consistency",
        ),
        ProductivityInsight(
            type="weekly_pace",
            title="Weekly Focus Progress",
            message=f"You have logged {week_hrs} hours of deep study this week against your {goal * 7:.1f}h weekly pace. Keep up the great pace!",
            icon="TrendingUp",
            category="Pacing",
        ),
    ]
    return insights



"""Pydantic schemas for all request/response models."""
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ══════════════════════════════════════════════════════════════════════════
# TASKS
# ══════════════════════════════════════════════════════════════════════════

class TaskCreate(BaseModel):
    text: str = Field(..., max_length=1000)
    priority: str = Field(default="Someday", max_length=50)
    due: str | None = Field(default=None, max_length=20)
    recur: str = Field(default="None", max_length=20)
    tags: list[str] | None = None

class TaskUpdate(BaseModel):
    text: str | None = Field(default=None, max_length=1000)
    priority: str | None = Field(default=None, max_length=50)
    due: str | None = Field(default=None, max_length=20)
    done: bool | None = None
    recur: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None

class TaskResponse(BaseModel):
    id: str
    text: str
    priority: str
    due: str | None
    done: bool
    recur: str
    spawned: bool
    added_at: datetime
    tags: list[str] = []
    archived: bool = False

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, list):
            return v
        return []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# TESTS
# ══════════════════════════════════════════════════════════════════════════

class TestCreate(BaseModel):
    subject: str = Field(..., max_length=200)
    date: str = Field(..., max_length=20)
    time: str = Field(default="", max_length=20)
    note: str = Field(default="", max_length=500)

class TestResponse(BaseModel):
    id: str
    subject: str
    date: str
    time: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# ASSIGNMENTS
# ══════════════════════════════════════════════════════════════════════════

class AssignmentCreate(BaseModel):
    subject: str = Field(..., max_length=500)
    title: str = Field(..., max_length=500)
    due: str = Field(default="", max_length=100)
    marks: str = Field(default="", max_length=100)
    tags: list[str] | None = None

class AssignmentUpdate(BaseModel):
    subject: str | None = Field(default=None, max_length=500)
    title: str | None = Field(default=None, max_length=500)
    due: str | None = Field(default=None, max_length=100)
    marks: str | None = Field(default=None, max_length=100)
    submitted: bool | None = None
    tags: list[str] | None = None

class AssignmentResponse(BaseModel):
    id: str
    subject: str
    title: str
    due: str
    marks: str
    submitted: bool
    submitted_at: datetime | None
    created_at: datetime
    tags: list[str] = []
    archived: bool = False

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, list):
            return v
        return []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# PRACTICALS
# ══════════════════════════════════════════════════════════════════════════

class PracticalCreate(BaseModel):
    subject: str = Field(..., max_length=500)
    num: str = Field(default="", max_length=20)
    title: str = Field(..., max_length=500)
    date: str = Field(default="", max_length=20)

class PracticalUpdate(BaseModel):
    performed: bool | None = None
    writeup: bool | None = None
    submitted: bool | None = None

class PracticalResponse(BaseModel):
    id: str
    subject: str
    num: str
    title: str
    date: str
    performed: bool
    writeup: bool
    submitted: bool
    done: bool
    created_at: datetime
    archived: bool = False

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# LISTS
# ══════════════════════════════════════════════════════════════════════════

class ListItemCreate(BaseModel):
    text: str = Field(..., max_length=1000)

class ListItemUpdate(BaseModel):
    text: str | None = Field(default=None, max_length=1000)
    done: bool | None = None

class ListItemResponse(BaseModel):
    id: str
    text: str
    done: bool

    model_config = {"from_attributes": True}

class ListCreate(BaseModel):
    name: str = Field(..., max_length=200)

class ListResponse(BaseModel):
    id: str
    name: str
    items: list[ListItemResponse] = []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# SYLLABUS
# ══════════════════════════════════════════════════════════════════════════

class TopicCreate(BaseModel):
    name: str = Field(..., max_length=500)

class TopicUpdate(BaseModel):
    done: bool | None = None
    in_progress: bool | None = None

class TopicResponse(BaseModel):
    id: str
    name: str
    done: bool
    in_progress: bool = False

    model_config = {"from_attributes": True}

class SubjectCreate(BaseModel):
    name: str = Field(..., max_length=200)

class SubjectResponse(BaseModel):
    id: str
    name: str
    topics: list[TopicResponse] = []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# POMODORO
# ══════════════════════════════════════════════════════════════════════════

class PomodoroSessionCreate(BaseModel):
    date: str = Field(..., max_length=20)
    time: str = Field(default="", max_length=20)
    type: str = Field(default="work", max_length=20)
    task: str = Field(default="", max_length=200)
    duration_min: int = Field(default=25, ge=1, le=1440)
    start_time: str | None = Field(default=None, max_length=20)  # HH:MM — used to detect midnight-spanning sessions

class PomodoroSessionResponse(BaseModel):
    id: str
    date: str
    time: str
    type: str
    task: str
    duration_min: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# NOTES
# ══════════════════════════════════════════════════════════════════════════

class NoteCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=500)
    subject: str = Field(default="General", max_length=200)
    body: str = Field(default="", max_length=50000)
    tags: list[str] | None = None

class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    subject: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=50000)
    tags: list[str] | None = None

class NoteResponse(BaseModel):
    id: str
    title: str
    subject: str
    body: str
    created_at: datetime
    updated_at: datetime
    tags: list[str] = []
    archived: bool = False

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, list):
            return v
        return []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# SETTINGS
# ══════════════════════════════════════════════════════════════════════════

class SettingUpdate(BaseModel):
    key: str = Field(..., max_length=100)
    value: str = Field(..., max_length=10000)  # JSON string

class SettingResponse(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════
# PRODUCTIVITY / ANALYTICS
# ══════════════════════════════════════════════════════════════════════════

class ScoreCard(BaseModel):
    period: str
    score: int
    sessions: int
    duration_min: int = 0
    hours: float = 0.0
    grade: str

class ProductivityScores(BaseModel):
    today: ScoreCard
    yesterday: ScoreCard
    week: ScoreCard
    month: ScoreCard
    streak: int
    daily_goal: float

class HeatmapDay(BaseModel):
    date: str
    score: int
    sessions: int
    duration_min: int = 0
    hours: float = 0.0

class SpiderData(BaseModel):
    day_labels: list[str]
    this_week: list[float]
    last_week: list[float]
    goal: float
    this_week_sessions: list[int] = []
    last_week_sessions: list[int] = []

class OverviewData(BaseModel):
    tests_due: int
    tasks_pending: int
    assignments_pending: int
    practicals_pending: int
    subjects_count: int
    pomodoros_today: int
    focus_hours_today: float = 0.0
    streak: int
    upcoming_tests: list[TestResponse]
    top_tasks: list[TaskResponse]
    upcoming_assignments: list[AssignmentResponse]
    pending_practicals: list[PracticalResponse]

class BackupInfo(BaseModel):
    filename: str
    created_at: str
    size_bytes: int


# ══════════════════════════════════════════════════════════════════════════
# PRODUCTIVITY ENHANCEMENTS
# ══════════════════════════════════════════════════════════════════════════

class SubjectBreakdownItem(BaseModel):
    subject: str
    duration_min: int
    hours: float
    sessions: int
    percentage: float
    color: str = "#8b5cf6"

class DailyTrendDay(BaseModel):
    date: str
    day_name: str
    hours: float
    duration_min: int
    sessions: int
    goal_hours: float
    goal_reached: bool

class DailyTrendSummary(BaseModel):
    days: list[DailyTrendDay]
    goal_hit_rate: int
    daily_avg_hours: float
    best_day_date: str
    best_day_hours: float
    total_period_hours: float

class ProductivityBadge(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    category: str
    unlocked: bool
    progress: float
    current_value: float
    target_value: float
    progress_label: str
    unlocked_date: str | None = None

class ProductivityInsight(BaseModel):
    type: str
    title: str
    message: str
    icon: str
    category: str


# ══════════════════════════════════════════════════════════════════════════
# ARCHIVE
# ══════════════════════════════════════════════════════════════════════════

class ArchiveItemResponse(BaseModel):
    id: str
    item_type: str  # "task", "assignment", "note", "practical"
    title: str
    subtitle: str = ""
    created_at: datetime | None = None

class ArchiveStatsResponse(BaseModel):
    tasks: int = 0
    assignments: int = 0
    notes: int = 0
    practicals: int = 0
    total: int = 0

"""Tasks router — full CRUD with priority, recurrence, and sorting."""
import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.task import Task
from backend.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])

PRIORITY_ORDER = ["Immediate", "Important", "2nd Priority", "3rd Priority", "Someday"]


@router.get("", response_model=list[TaskResponse])
def get_tasks(done: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Task).filter(Task.archived == False)
    if done is not None:
        q = q.filter(Task.done == done)
    tasks = q.all()
    # Sort by priority order
    tasks.sort(key=lambda t: (
        t.done,
        PRIORITY_ORDER.index(t.priority) if t.priority in PRIORITY_ORDER else 99,
        t.due or "9999",
    ))
    return tasks


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        id=str(uuid.uuid4()),
        text=data.text,
        priority=data.priority,
        due=data.due or "",
        recur=data.recur,
        added_at=utcnow(),
        tags=",".join(data.tags) if data.tags else "",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    was_done = task.done

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "tags":
            task.tags = ",".join(value) if value else ""
        else:
            setattr(task, field, value)

    # Handle recurrence: when marking done, spawn next instance
    if not was_done and task.done and task.recur != "None" and not task.spawned:
        task.spawned = True
        delta = {"Daily": 1, "Weekly": 7, "Monthly": 30}.get(task.recur, 0)
        if delta:
            new_due = (date.today() + timedelta(days=delta)).isoformat()
            new_task = Task(
                id=str(uuid.uuid4()),
                text=task.text,
                priority=task.priority,
                due=new_due,
                recur=task.recur,
                added_at=utcnow(),
                tags=task.tags,
            )
            db.add(new_task)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()


@router.patch("/{task_id}/archive", response_model=TaskResponse)
def archive_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task.archived = not task.archived
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/reorder")
def reorder_task(task_id: str, new_priority: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if new_priority not in PRIORITY_ORDER:
        raise HTTPException(400, f"Invalid priority: {new_priority}")
    task.priority = new_priority
    db.commit()
    return {"ok": True}

"""Archive router — unified view, restore, delete, and clear for archived items."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.task import Task
from backend.models.assignment import Assignment
from backend.models.note import Note
from backend.models.practical import Practical
from backend.schemas.schemas import ArchiveItemResponse, ArchiveStatsResponse

router = APIRouter(prefix="/archive", tags=["archive"])

# Model registry for DRY operations
_MODELS = {
    "task": Task,
    "assignment": Assignment,
    "note": Note,
    "practical": Practical,
}


def _get_title(item, item_type: str) -> str:
    if item_type == "task":
        return item.text
    if item_type == "note":
        return item.title
    if item_type == "assignment":
        return f"{item.subject} — {item.title}"
    if item_type == "practical":
        return f"{item.subject} — {item.title}"
    return str(item.id)


def _get_subtitle(item, item_type: str) -> str:
    if item_type == "task":
        return item.priority
    if item_type == "note":
        return item.subject
    if item_type == "assignment":
        return f"Due: {item.due}" if item.due else ""
    if item_type == "practical":
        return f"#{item.num}" if item.num else ""
    return ""


def _get_created_at(item, item_type: str):
    if item_type == "task":
        return item.added_at
    return item.created_at


@router.get("/stats", response_model=ArchiveStatsResponse)
def get_archive_stats(db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.archived == True).count()
    assignments = db.query(Assignment).filter(Assignment.archived == True).count()
    notes = db.query(Note).filter(Note.archived == True).count()
    practicals = db.query(Practical).filter(Practical.archived == True).count()
    return ArchiveStatsResponse(
        tasks=tasks,
        assignments=assignments,
        notes=notes,
        practicals=practicals,
        total=tasks + assignments + notes + practicals,
    )


@router.get("", response_model=list[ArchiveItemResponse])
def get_archived_items(
    item_type: str | None = Query(None, description="Filter by type: task, assignment, note, practical"),
    db: Session = Depends(get_db),
):
    items = []

    types_to_query = [item_type] if item_type and item_type in _MODELS else list(_MODELS.keys())

    for t in types_to_query:
        model = _MODELS[t]
        archived = db.query(model).filter(model.archived == True).all()
        for row in archived:
            items.append(ArchiveItemResponse(
                id=row.id,
                item_type=t,
                title=_get_title(row, t),
                subtitle=_get_subtitle(row, t),
                created_at=_get_created_at(row, t),
            ))

    from datetime import datetime as dt_class
    # Sort by created_at descending (newest first) with safe datetime fallback
    items.sort(key=lambda x: x.created_at if x.created_at is not None else dt_class.min, reverse=True)
    return items


@router.patch("/{item_type}/{item_id}/restore")
def restore_item(item_type: str, item_id: str, db: Session = Depends(get_db)):
    if item_type not in _MODELS:
        raise HTTPException(400, f"Invalid type: {item_type}. Must be one of: {', '.join(_MODELS.keys())}")
    model = _MODELS[item_type]
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(404, f"{item_type.capitalize()} not found")
    item.archived = False
    db.commit()
    return {"ok": True, "message": f"{item_type.capitalize()} restored"}


@router.delete("/{item_type}/{item_id}")
def delete_archived_item(item_type: str, item_id: str, db: Session = Depends(get_db)):
    if item_type not in _MODELS:
        raise HTTPException(400, f"Invalid type: {item_type}")
    model = _MODELS[item_type]
    item = db.query(model).filter(model.id == item_id, model.archived == True).first()
    if not item:
        raise HTTPException(404, f"Archived {item_type} not found")
    db.delete(item)
    db.commit()
    return {"ok": True, "message": f"{item_type.capitalize()} permanently deleted"}


@router.delete("")
def clear_archive(
    item_type: str | None = Query(None, description="Clear specific type, or all if omitted"),
    db: Session = Depends(get_db),
):
    types_to_clear = [item_type] if item_type and item_type in _MODELS else list(_MODELS.keys())
    total = 0
    for t in types_to_clear:
        model = _MODELS[t]
        count = db.query(model).filter(model.archived == True).delete()
        total += count
    db.commit()
    return {"ok": True, "deleted": total}

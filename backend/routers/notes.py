"""Notes router — CRUD with search."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.note import Note
from backend.schemas.schemas import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
def get_notes(q: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Note).filter(Note.archived == False)
    if q:
        search = f"%{q}%"
        query = query.filter(
            Note.title.ilike(search) |
            Note.body.ilike(search) |
            Note.subject.ilike(search)
        )
    return query.order_by(Note.updated_at.desc()).all()


@router.post("", response_model=NoteResponse, status_code=201)
def create_note(data: NoteCreate, db: Session = Depends(get_db)):
    now = utcnow()
    note = Note(
        id=str(uuid.uuid4()),
        title=data.title,
        subject=data.subject,
        body=data.body,
        created_at=now,
        updated_at=now,
        tags=",".join(data.tags) if data.tags else "",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(note_id: str, data: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "tags":
            note.tags = ",".join(value) if value else ""
        else:
            setattr(note, field, value)
    note.updated_at = utcnow()
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{note_id}/archive", response_model=NoteResponse)
def archive_note(note_id: str, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    note.archived = not note.archived
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()

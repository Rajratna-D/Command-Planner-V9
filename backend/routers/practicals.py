"""Practicals router — CRUD with 3-stage completion tracking."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.practical import Practical
from backend.schemas.schemas import PracticalCreate, PracticalUpdate, PracticalResponse

router = APIRouter(prefix="/practicals", tags=["practicals"])


@router.get("", response_model=list[PracticalResponse])
def get_practicals(done: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Practical).filter(Practical.archived == False)
    if done is not None:
        q = q.filter(Practical.done == done)
    return q.order_by(Practical.subject.asc(), Practical.num.asc()).all()


@router.post("", response_model=PracticalResponse, status_code=201)
def create_practical(data: PracticalCreate, db: Session = Depends(get_db)):
    prac = Practical(
        id=str(uuid.uuid4()),
        subject=data.subject,
        num=data.num,
        title=data.title,
        date=data.date,
        created_at=utcnow(),
    )
    db.add(prac)
    db.commit()
    db.refresh(prac)
    return prac


@router.patch("/{prac_id}/toggle/{stage}", response_model=PracticalResponse)
def toggle_stage(prac_id: str, stage: str, db: Session = Depends(get_db)):
    prac = db.query(Practical).filter(Practical.id == prac_id).first()
    if not prac:
        raise HTTPException(404, "Practical not found")
    if stage not in ("performed", "writeup", "submitted"):
        raise HTTPException(400, f"Invalid stage: {stage}")
    current = getattr(prac, stage)
    setattr(prac, stage, not current)
    # Auto-set done when all 3 stages complete
    prac.done = prac.performed and prac.writeup and prac.submitted
    db.commit()
    db.refresh(prac)
    return prac


@router.patch("/{prac_id}/archive", response_model=PracticalResponse)
def archive_practical(prac_id: str, db: Session = Depends(get_db)):
    prac = db.query(Practical).filter(Practical.id == prac_id).first()
    if not prac:
        raise HTTPException(404, "Practical not found")
    prac.archived = not prac.archived
    db.commit()
    db.refresh(prac)
    return prac


@router.delete("/{prac_id}", status_code=204)
def delete_practical(prac_id: str, db: Session = Depends(get_db)):
    prac = db.query(Practical).filter(Practical.id == prac_id).first()
    if not prac:
        raise HTTPException(404, "Practical not found")
    db.delete(prac)
    db.commit()

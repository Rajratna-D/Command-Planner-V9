"""Assignments router — CRUD with submission tracking."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.assignment import Assignment
from backend.schemas.schemas import AssignmentCreate, AssignmentUpdate, AssignmentResponse

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=list[AssignmentResponse])
def get_assignments(submitted: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Assignment).filter(Assignment.archived == False)
    if submitted is not None:
        q = q.filter(Assignment.submitted == submitted)
    return q.order_by(Assignment.due.asc()).all()


@router.post("", response_model=AssignmentResponse, status_code=201)
def create_assignment(data: AssignmentCreate, db: Session = Depends(get_db)):
    asgn = Assignment(
        id=str(uuid.uuid4()),
        subject=data.subject,
        title=data.title,
        due=data.due,
        marks=data.marks,
        created_at=utcnow(),
        tags=",".join(data.tags) if data.tags else "",
    )
    db.add(asgn)
    db.commit()
    db.refresh(asgn)
    return asgn


@router.patch("/{asgn_id}", response_model=AssignmentResponse)
def update_assignment(asgn_id: str, data: AssignmentUpdate, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(404, "Assignment not found")

    was_submitted = asgn.submitted

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "tags":
            asgn.tags = ",".join(value) if value else ""
        else:
            setattr(asgn, field, value)

    # Only update submitted_at on actual submission state change
    if not was_submitted and asgn.submitted:
        asgn.submitted_at = utcnow()
    elif was_submitted and not asgn.submitted:
        asgn.submitted_at = None

    db.commit()
    db.refresh(asgn)
    return asgn


@router.patch("/{asgn_id}/submit", response_model=AssignmentResponse)
def submit_assignment(asgn_id: str, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(404, "Assignment not found")
    asgn.submitted = True
    asgn.submitted_at = utcnow()
    db.commit()
    db.refresh(asgn)
    return asgn


@router.patch("/{asgn_id}/archive", response_model=AssignmentResponse)
def archive_assignment(asgn_id: str, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(404, "Assignment not found")
    asgn.archived = not asgn.archived
    db.commit()
    db.refresh(asgn)
    return asgn


@router.delete("/{asgn_id}", status_code=204)
def delete_assignment(asgn_id: str, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(404, "Assignment not found")
    db.delete(asgn)
    db.commit()

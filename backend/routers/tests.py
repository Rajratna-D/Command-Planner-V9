"""Tests router — CRUD for exam scheduling."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.test import Test
from backend.schemas.schemas import TestCreate, TestResponse

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("", response_model=list[TestResponse])
def get_tests(db: Session = Depends(get_db)):
    return db.query(Test).order_by(Test.date.asc(), Test.time.asc()).all()


@router.post("", response_model=TestResponse, status_code=201)
def create_test(data: TestCreate, db: Session = Depends(get_db)):
    test = Test(
        id=str(uuid.uuid4()),
        subject=data.subject,
        date=data.date,
        time=data.time,
        note=data.note,
        created_at=utcnow(),
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.delete("/{test_id}", status_code=204)
def delete_test(test_id: str, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    db.delete(test)
    db.commit()

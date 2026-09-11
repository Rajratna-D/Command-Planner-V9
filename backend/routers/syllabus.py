"""Syllabus router — subjects with nested topics."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.syllabus import Subject, Topic
from backend.schemas.schemas import SubjectCreate, SubjectResponse, TopicCreate, TopicUpdate, TopicResponse

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


@router.get("", response_model=list[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name.asc()).all()


@router.post("", response_model=SubjectResponse, status_code=201)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    subj = Subject(id=str(uuid.uuid4()), name=data.name, created_at=utcnow())
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: str, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "Subject not found")
    db.delete(subj)
    db.commit()


# ── Topics ────────────────────────────────────────────────────────────────

@router.post("/{subject_id}/topics", response_model=SubjectResponse)
def add_topic(subject_id: str, data: TopicCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "Subject not found")
    topic = Topic(
        id=str(uuid.uuid4()),
        subject_id=subject_id,
        name=data.name,
        created_at=utcnow(),
    )
    db.add(topic)
    db.commit()
    db.refresh(subj)
    return subj


@router.patch("/{subject_id}/topics/{topic_id}", response_model=SubjectResponse)
def toggle_topic(
    subject_id: str,
    topic_id: str,
    data: TopicUpdate | None = None,
    db: Session = Depends(get_db)
):
    topic = db.query(Topic).filter(
        Topic.id == topic_id, Topic.subject_id == subject_id
    ).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    
    if data is not None:
        if data.done is not None:
            topic.done = data.done
        if data.in_progress is not None:
            topic.in_progress = data.in_progress
    else:
        topic.done = not topic.done

    db.commit()
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    return subj


@router.delete("/{subject_id}/topics/{topic_id}", status_code=204)
def delete_topic(subject_id: str, topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(
        Topic.id == topic_id, Topic.subject_id == subject_id
    ).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    db.delete(topic)
    db.commit()

"""Lists router — CRUD with nested items."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, utcnow
from backend.models.list_model import List, ListItem
from backend.schemas.schemas import ListCreate, ListResponse, ListItemCreate, ListItemUpdate

router = APIRouter(prefix="/lists", tags=["lists"])


@router.get("", response_model=list[ListResponse])
def get_lists(db: Session = Depends(get_db)):
    return db.query(List).order_by(List.created_at.desc()).all()


@router.post("", response_model=ListResponse, status_code=201)
def create_list(data: ListCreate, db: Session = Depends(get_db)):
    lst = List(id=str(uuid.uuid4()), name=data.name, created_at=utcnow())
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return lst


@router.delete("/{list_id}", status_code=204)
def delete_list(list_id: str, db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id).first()
    if not lst:
        raise HTTPException(404, "List not found")
    db.delete(lst)
    db.commit()


# ── List Items ────────────────────────────────────────────────────────────

@router.post("/{list_id}/items", response_model=ListResponse)
def add_item(list_id: str, data: ListItemCreate, db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id).first()
    if not lst:
        raise HTTPException(404, "List not found")
    item = ListItem(
        id=str(uuid.uuid4()),
        list_id=list_id,
        text=data.text,
        created_at=utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(lst)
    return lst


@router.patch("/{list_id}/items/{item_id}", response_model=ListResponse)
def update_item(list_id: str, item_id: str, data: ListItemUpdate, db: Session = Depends(get_db)):
    item = db.query(ListItem).filter(
        ListItem.id == item_id, ListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    lst = db.query(List).filter(List.id == list_id).first()
    return lst


@router.delete("/{list_id}/items/{item_id}", status_code=204)
def delete_item(list_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(ListItem).filter(
        ListItem.id == item_id, ListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()

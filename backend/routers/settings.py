"""Settings router — key-value store for app configuration."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.settings import Setting
from backend.schemas.schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/settings", tags=["settings"])

# Default settings
DEFAULTS = {
    "theme": '"dark"',
    "daily_goal": "3.0",
    "streak": '{"last_date": "", "count": 0}',
    "subject_colors": "{}",
    "last_digest_date": '""',
}


@router.get("", response_model=list[SettingResponse])
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    existing_keys = {s.key for s in settings}
    # Fill in defaults for missing settings
    for key, default in DEFAULTS.items():
        if key not in existing_keys:
            settings.append(Setting(key=key, value=default))
    return settings


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    s = db.query(Setting).filter(Setting.key == key).first()
    if s:
        try:
            return {"key": s.key, "value": json.loads(s.value)}
        except (json.JSONDecodeError, TypeError):
            return {"key": s.key, "value": s.value}
    default = DEFAULTS.get(key, '""')
    return {"key": key, "value": json.loads(default)}


@router.put("/{key}", response_model=SettingResponse)
def set_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    s = db.query(Setting).filter(Setting.key == key).first()
    if s:
        s.value = data.value
    else:
        s = Setting(key=key, value=data.value)
        db.add(s)
    db.commit()
    db.refresh(s)
    return s

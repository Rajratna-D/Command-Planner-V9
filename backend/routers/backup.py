"""Backup router — create and list SQLite backups."""
import os
import shutil
from datetime import datetime
from fastapi import APIRouter
from backend.database import DB_PATH
from backend.schemas.schemas import BackupInfo

router = APIRouter(prefix="/backup", tags=["backup"])

BACKUP_DIR = os.path.join(os.path.dirname(DB_PATH), "backups")


@router.get("/list", response_model=list[BackupInfo])
def list_backups():
    if not os.path.exists(BACKUP_DIR):
        return []
    backups = []
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith(".db"):
            path = os.path.join(BACKUP_DIR, f)
            stat = os.stat(path)
            backups.append(BackupInfo(
                filename=f,
                created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
                size_bytes=stat.st_size,
            ))
    return backups


@router.post("/create", response_model=BackupInfo)
def create_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = os.path.join(BACKUP_DIR, f"backup_{stamp}.db")
    shutil.copy2(DB_PATH, dst)
    # Keep only last 30 backups
    files = sorted(os.listdir(BACKUP_DIR))
    for old in files[:-30]:
        try:
            os.remove(os.path.join(BACKUP_DIR, old))
        except OSError:
            pass
    stat = os.stat(dst)
    return BackupInfo(
        filename=os.path.basename(dst),
        created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
        size_bytes=stat.st_size,
    )


@router.post("/restore")
def restore_backup(filename: str):
    path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    from backend.database import engine
    engine.dispose()
    
    shutil.copy2(path, DB_PATH)
    return {"message": "Backup restored successfully"}


@router.post("/wipe")
def wipe_database():
    from backend.database import Base, engine, init_db
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    init_db()
    return {"message": "Database wiped successfully"}


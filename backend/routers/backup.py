"""Backup router — create, list, restore, and wipe SQLite backups.

Security Hardening:
- Destructive endpoints (restore, wipe) require a confirmation token header.
- Path traversal protection via basename sanitization and directory boundary checks.
- Automatic safety backups are created before any destructive operation.
"""
import os
import re
import shutil
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException
from backend.database import DB_PATH
from backend.schemas.schemas import BackupInfo

router = APIRouter(prefix="/backup", tags=["backup"])

BACKUP_DIR = os.path.join(os.path.dirname(DB_PATH), "backups")

# ── Confirmation tokens for destructive operations ──────────────────────────
# These must be sent as the X-Confirmation-Token header.
# They prevent accidental triggers, CSRF attacks, and rogue script execution.
WIPE_TOKEN = "CONFIRM-WIPE-DATABASE"
RESTORE_TOKEN = "CONFIRM-RESTORE-DATABASE"

# Allowed backup filename pattern (alphanumeric, underscores, hyphens, dots)
_SAFE_FILENAME_RE = re.compile(r"^[a-zA-Z0-9_\-]+\.db$")


def _create_safety_backup(label: str = "safety") -> str | None:
    """Create an automatic safety backup before a destructive operation.
    Returns the backup filename on success, None on failure."""
    try:
        if not os.path.exists(DB_PATH):
            return None
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{label}_{stamp}.db"
        dst = os.path.join(BACKUP_DIR, filename)
        shutil.copy2(DB_PATH, dst)
        return filename
    except Exception:
        return None


def _validate_backup_filename(filename: str) -> str:
    """Sanitize and validate a backup filename to prevent path traversal.

    Returns the safe absolute path to the backup file.
    Raises HTTPException on any validation failure.
    """
    # Step 1: Strip to basename — removes any path separators (/, \, ..)
    safe_name = os.path.basename(filename)

    # Step 2: Reject empty or whitespace-only names
    if not safe_name or not safe_name.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid backup filename: filename cannot be empty."
        )

    # Step 3: Regex validation — only allow safe characters
    if not _SAFE_FILENAME_RE.match(safe_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid backup filename: must contain only alphanumeric characters, "
                   "underscores, hyphens, and end with .db"
        )

    # Step 4: Resolve absolute path and verify it stays inside BACKUP_DIR
    abs_backup_dir = os.path.abspath(BACKUP_DIR)
    abs_path = os.path.abspath(os.path.join(BACKUP_DIR, safe_name))

    if not abs_path.startswith(abs_backup_dir + os.sep) and abs_path != abs_backup_dir:
        raise HTTPException(
            status_code=400,
            detail="Invalid backup filename: path traversal detected."
        )

    return abs_path


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
def restore_backup(
    filename: str,
    x_confirmation_token: str | None = Header(None),
):
    """Restore database from a backup file.

    Requires X-Confirmation-Token header with value 'CONFIRM-RESTORE-DATABASE'.
    Automatically creates a safety backup of the current database before restoring.
    """
    # ── Security Gate: Confirmation Token ──
    if x_confirmation_token != RESTORE_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Destructive operation blocked. "
                   "Send X-Confirmation-Token: CONFIRM-RESTORE-DATABASE header to proceed."
        )

    # ── Security Gate: Path Traversal Prevention ──
    abs_path = _validate_backup_filename(filename)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Backup file not found.")

    # ── Safety: Auto-backup current state before overwriting ──
    safety = _create_safety_backup("pre_restore")

    from backend.database import engine
    engine.dispose()

    shutil.copy2(abs_path, DB_PATH)
    return {
        "message": "Backup restored successfully.",
        "safety_backup": safety,
    }


@router.post("/wipe")
def wipe_database(
    x_confirmation_token: str | None = Header(None),
):
    """Wipe all tables and recreate empty schema.

    Requires X-Confirmation-Token header with value 'CONFIRM-WIPE-DATABASE'.
    Automatically creates a safety backup before wiping.

    WARNING: This is an irreversible destructive operation (unless safety backup is used).
    """
    # ── Security Gate: Confirmation Token ──
    if x_confirmation_token != WIPE_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Destructive operation blocked. "
                   "Send X-Confirmation-Token: CONFIRM-WIPE-DATABASE header to proceed."
        )

    # ── Safety: Auto-backup current state before wiping ──
    safety = _create_safety_backup("pre_wipe")

    from backend.database import Base, engine, init_db
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    init_db()
    return {
        "message": "Database wiped successfully.",
        "safety_backup": safety,
    }

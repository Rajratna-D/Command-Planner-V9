"""Tests for backup router — security hardened with confirmation tokens."""
import os
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine


def test_backup_flow(client, tmp_path):
    """Test backup create, list, and restore flow with confirmation tokens."""
    # Setup temp DB_PATH and BACKUP_DIR
    temp_db = tmp_path / "test_planner.db"
    # Create a dummy database file
    temp_db.write_text("dummy sqlite database content")
    
    temp_backup_dir = tmp_path / "backups"
    temp_backup_dir.mkdir()
    
    with patch("backend.routers.backup.DB_PATH", str(temp_db)), \
         patch("backend.routers.backup.BACKUP_DIR", str(temp_backup_dir)):
        
        # Test creating a backup
        create_res = client.post("/backup/create")
        assert create_res.status_code == 200
        backup_data = create_res.json()
        assert "filename" in backup_data
        filename = backup_data["filename"]
        
        # Verify it created a file in backup_dir
        assert os.path.exists(os.path.join(temp_backup_dir, filename))
        
        # Test listing backups
        list_res = client.get("/backup/list")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert len(list_data) == 1
        assert list_data[0]["filename"] == filename
        
        # ── Security: Restore WITHOUT token should be BLOCKED ──
        restore_res = client.post(f"/backup/restore?filename={filename}")
        assert restore_res.status_code == 403
        assert "Destructive operation blocked" in restore_res.json()["detail"]
        
        # ── Security: Restore WITH wrong token should be BLOCKED ──
        restore_res = client.post(
            f"/backup/restore?filename={filename}",
            headers={"X-Confirmation-Token": "WRONG-TOKEN"},
        )
        assert restore_res.status_code == 403
        
        # ── Restore WITH correct token should SUCCEED ──
        # 1. Modify the test_planner.db content
        temp_db.write_text("modified database content")
        # 2. Call restore with correct confirmation token
        restore_res = client.post(
            f"/backup/restore?filename={filename}",
            headers={"X-Confirmation-Token": "CONFIRM-RESTORE-DATABASE"},
        )
        assert restore_res.status_code == 200
        response_data = restore_res.json()
        assert response_data["message"] == "Backup restored successfully."
        # 3. Verify it restored the original content
        assert temp_db.read_text() == "dummy sqlite database content"


def test_wipe_database(client, tmp_path):
    """Test wipe endpoint with confirmation token security."""
    temp_db_path = tmp_path / "test_wipe.db"
    temp_engine = create_engine(f"sqlite:///{temp_db_path}")
    with patch("backend.database.engine", temp_engine), \
         patch("backend.database.DB_PATH", str(temp_db_path)):
        
        # ── Security: Wipe WITHOUT token should be BLOCKED ──
        response = client.post("/backup/wipe")
        assert response.status_code == 403
        assert "Destructive operation blocked" in response.json()["detail"]
        
        # ── Security: Wipe WITH wrong token should be BLOCKED ──
        response = client.post(
            "/backup/wipe",
            headers={"X-Confirmation-Token": "WRONG-TOKEN"},
        )
        assert response.status_code == 403
        
        # ── Wipe WITH correct token should SUCCEED ──
        response = client.post(
            "/backup/wipe",
            headers={"X-Confirmation-Token": "CONFIRM-WIPE-DATABASE"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Database wiped successfully."


def test_path_traversal_blocked(client, tmp_path):
    """Test that path traversal attacks are rejected in /backup/restore."""
    temp_db = tmp_path / "test_planner.db"
    temp_db.write_text("dummy")
    temp_backup_dir = tmp_path / "backups"
    temp_backup_dir.mkdir()
    
    with patch("backend.routers.backup.DB_PATH", str(temp_db)), \
         patch("backend.routers.backup.BACKUP_DIR", str(temp_backup_dir)):
        
        traversal_payloads = [
            "../../etc/passwd",
            "..\\..\\windows\\system32\\config\\sam",
            "../../../planner.db",
            "....//....//etc//passwd",
            "backup.txt",       # wrong extension
            "backup.db.exe",    # double extension
            "",                 # empty
        ]
        
        for payload in traversal_payloads:
            res = client.post(
                f"/backup/restore?filename={payload}",
                headers={"X-Confirmation-Token": "CONFIRM-RESTORE-DATABASE"},
            )
            # Should be 400 (invalid filename) or 404 (file not found), never 200
            assert res.status_code in (400, 404, 422), (
                f"Path traversal payload '{payload}' was not blocked! "
                f"Got status {res.status_code}"
            )

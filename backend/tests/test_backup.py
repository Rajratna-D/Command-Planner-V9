import os
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine

def test_backup_flow(client, tmp_path):
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
        
        # Test restoring backup
        # 1. Modify the test_planner.db content
        temp_db.write_text("modified database content")
        # 2. Call restore
        restore_res = client.post(f"/backup/restore?filename={filename}")
        assert restore_res.status_code == 200
        # 3. Verify it restored the original content
        assert temp_db.read_text() == "dummy sqlite database content"

def test_wipe_database(client, tmp_path):
    temp_db_path = tmp_path / "test_wipe.db"
    temp_engine = create_engine(f"sqlite:///{temp_db_path}")
    with patch("backend.database.engine", temp_engine), \
         patch("backend.database.DB_PATH", str(temp_db_path)):
        response = client.post("/backup/wipe")
        assert response.status_code == 200
        assert response.json()["message"] == "Database wiped successfully"

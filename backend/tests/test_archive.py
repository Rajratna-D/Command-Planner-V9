def test_archive_and_restore_task(client):
    # Create task
    task = client.post("/tasks", json={"text": "Task to archive", "priority": "Important"}).json()
    task_id = task["id"]

    # Archive task
    res = client.patch(f"/tasks/{task_id}/archive")
    assert res.status_code == 200
    assert res.json()["archived"] is True

    # Active tasks list should exclude it
    active_tasks = client.get("/tasks").json()
    assert not any(t["id"] == task_id for t in active_tasks)

    # Archive stats & list should include it
    stats = client.get("/archive/stats").json()
    assert stats["tasks"] == 1
    assert stats["total"] == 1

    archived_list = client.get("/archive?item_type=task").json()
    assert len(archived_list) == 1
    assert archived_list[0]["id"] == task_id
    assert archived_list[0]["title"] == "Task to archive"

    # Restore task
    restore_res = client.patch(f"/archive/task/{task_id}/restore")
    assert restore_res.status_code == 200

    # Active tasks list should have it again
    active_tasks = client.get("/tasks").json()
    assert any(t["id"] == task_id for t in active_tasks)


def test_clear_archive(client):
    task = client.post("/tasks", json={"text": "Task to delete"}).json()
    note = client.post("/notes", json={"title": "Note to delete", "subject": "General"}).json()

    client.patch(f"/tasks/{task['id']}/archive")
    client.patch(f"/notes/{note['id']}/archive")

    stats = client.get("/archive/stats").json()
    assert stats["total"] == 2

    # Clear archive
    clear_res = client.delete("/archive")
    assert clear_res.status_code == 200
    assert clear_res.json()["deleted"] == 2

    stats_after = client.get("/archive/stats").json()
    assert stats_after["total"] == 0

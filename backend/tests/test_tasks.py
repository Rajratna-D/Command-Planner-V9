from datetime import datetime

def test_create_task(client):
    response = client.post("/tasks", json={
        "text": "Test Task 1",
        "priority": "Important",
        "due": "2026-06-20",
        "recur": "None",
        "tags": ["exam", "math"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["text"] == "Test Task 1"
    assert data["priority"] == "Important"
    assert data["due"] == "2026-06-20"
    assert data["recur"] == "None"
    assert data["tags"] == ["exam", "math"]
    assert "id" in data

def test_get_tasks(client):
    # Add a task
    client.post("/tasks", json={"text": "Task A", "priority": "Immediate"})
    client.post("/tasks", json={"text": "Task B", "priority": "Someday"})
    
    response = client.get("/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Immediate should come before Someday according to PRIORITY_ORDER sorting
    assert data[0]["text"] == "Task A"
    assert data[1]["text"] == "Task B"

def test_update_task(client):
    create_response = client.post("/tasks", json={
        "text": "Original Task",
        "priority": "3rd Priority",
        "tags": ["old"]
    })
    task_id = create_response.json()["id"]
    
    update_response = client.patch(f"/tasks/{task_id}", json={
        "text": "Updated Task",
        "priority": "Immediate",
        "tags": ["new", "fresh"]
    })
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["text"] == "Updated Task"
    assert data["priority"] == "Immediate"
    assert data["tags"] == ["new", "fresh"]

def test_delete_task(client):
    create_response = client.post("/tasks", json={"text": "To Be Deleted"})
    task_id = create_response.json()["id"]
    
    delete_response = client.delete(f"/tasks/{task_id}")
    assert delete_response.status_code == 204
    
    get_response = client.get("/tasks")
    assert not any(t["id"] == task_id for t in get_response.json())


def test_reorder_tasks(client):
    r1 = client.post("/tasks", json={"text": "Task 1", "priority": "None"}).json()
    r2 = client.post("/tasks", json={"text": "Task 2", "priority": "None"}).json()
    r3 = client.post("/tasks", json={"text": "Task 3", "priority": "None"}).json()

    # Reorder to [Task 3, Task 1, Task 2]
    reorder_res = client.post("/tasks/reorder", json={"task_ids": [r3["id"], r1["id"], r2["id"]]})
    assert reorder_res.status_code == 200

    tasks = client.get("/tasks").json()
    # Filter our 3 tasks
    filtered = [t for t in tasks if t["id"] in {r1["id"], r2["id"], r3["id"]}]
    assert len(filtered) == 3
    assert filtered[0]["id"] == r3["id"]
    assert filtered[1]["id"] == r1["id"]
    assert filtered[2]["id"] == r2["id"]


def test_daily_recurrence_and_upcoming_filtering(client):
    from datetime import date, timedelta
    today = date.today()
    tomorrow = (today + timedelta(days=1)).isoformat()

    r = client.post("/tasks", json={"text": "Daily Workout", "priority": "Immediate", "recur": "Daily"}).json()
    task_id = r["id"]

    # Mark done
    update_res = client.patch(f"/tasks/{task_id}", json={"done": True})
    assert update_res.status_code == 200
    updated_task = update_res.json()
    assert updated_task["done"] is True
    assert updated_task["is_upcoming"] is False

    # Fetch all tasks
    all_tasks = client.get("/tasks").json()
    spawned = [t for t in all_tasks if t.get("parent_task_id") == task_id]
    assert len(spawned) == 1
    assert spawned[0]["due"] == tomorrow
    assert spawned[0]["done"] is False
    assert spawned[0]["is_upcoming"] is True

    # Filter upcoming=False (current tasks only)
    current_only = client.get("/tasks?upcoming=false").json()
    assert any(t["id"] == task_id for t in current_only)
    assert not any(t["id"] == spawned[0]["id"] for t in current_only)

    # Filter upcoming=True (future upcoming tasks only)
    upcoming_only = client.get("/tasks?upcoming=true").json()
    assert any(t["id"] == spawned[0]["id"] for t in upcoming_only)
    assert not any(t["id"] == task_id for t in upcoming_only)


def test_weekly_and_monthly_recurrence_dates(client):
    from datetime import date, timedelta
    today = date.today()

    # Weekly
    days_to_monday = 7 - today.weekday()
    expected_monday = (today + timedelta(days=days_to_monday)).isoformat()

    w = client.post("/tasks", json={"text": "Weekly Review", "recur": "Weekly"}).json()
    client.patch(f"/tasks/{w['id']}", json={"done": True})

    all_tasks = client.get("/tasks").json()
    w_spawned = [t for t in all_tasks if t.get("parent_task_id") == w["id"]]
    assert len(w_spawned) == 1
    assert w_spawned[0]["due"] == expected_monday
    assert w_spawned[0]["is_upcoming"] is True

    # Monthly
    if today.month == 12:
        expected_first = date(today.year + 1, 1, 1).isoformat()
    else:
        expected_first = date(today.year, today.month + 1, 1).isoformat()

    m = client.post("/tasks", json={"text": "Monthly Budget", "recur": "Monthly"}).json()
    client.patch(f"/tasks/{m['id']}", json={"done": True})

    all_tasks = client.get("/tasks").json()
    m_spawned = [t for t in all_tasks if t.get("parent_task_id") == m["id"]]
    assert len(m_spawned) == 1
    assert m_spawned[0]["due"] == expected_first
    assert m_spawned[0]["is_upcoming"] is True


def test_unchecking_recurrence_cancels_spawned_task(client):
    r = client.post("/tasks", json={"text": "Daily Read", "recur": "Daily"}).json()
    task_id = r["id"]

    # Mark done -> spawns child
    client.patch(f"/tasks/{task_id}", json={"done": True})
    tasks = client.get("/tasks").json()
    spawned = [t for t in tasks if t.get("parent_task_id") == task_id]
    assert len(spawned) == 1

    # Accidental uncheck -> should delete child
    uncheck_res = client.patch(f"/tasks/{task_id}", json={"done": False})
    assert uncheck_res.status_code == 200
    assert uncheck_res.json()["done"] is False

    tasks_after = client.get("/tasks").json()
    spawned_after = [t for t in tasks_after if t.get("parent_task_id") == task_id]
    assert len(spawned_after) == 0


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

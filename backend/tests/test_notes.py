def test_create_note(client):
    response = client.post("/notes", json={
        "title": "Study Guide",
        "subject": "Physics",
        "body": "# Kinematics\n- Speed\n- Velocity",
        "tags": ["physics", "exam"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Study Guide"
    assert data["subject"] == "Physics"
    assert data["body"] == "# Kinematics\n- Speed\n- Velocity"
    assert data["tags"] == ["physics", "exam"]
    assert "id" in data

def test_get_notes(client):
    client.post("/notes", json={"title": "Note A", "subject": "Math", "body": "Math formulas"})
    client.post("/notes", json={"title": "Note B", "subject": "History", "body": "Dates and events"})
    
    # Test listing notes
    response = client.get("/notes")
    assert response.status_code == 200
    assert len(response.json()) == 2
    
    # Test searching notes
    search_response = client.get("/notes?q=formulas")
    assert search_response.status_code == 200
    search_data = search_response.json()
    assert len(search_data) == 1
    assert search_data[0]["title"] == "Note A"

def test_update_note(client):
    create_response = client.post("/notes", json={
        "title": "Old Title",
        "subject": "Math",
        "body": "Content"
    })
    note_id = create_response.json()["id"]
    
    update_response = client.patch(f"/notes/{note_id}", json={
        "title": "New Title",
        "body": "Updated Content",
        "tags": ["updated"]
    })
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["title"] == "New Title"
    assert data["body"] == "Updated Content"
    assert data["tags"] == ["updated"]

def test_delete_note(client):
    create_response = client.post("/notes", json={"title": "To delete", "subject": "Art", "body": "Art notes"})
    note_id = create_response.json()["id"]
    
    delete_response = client.delete(f"/notes/{note_id}")
    assert delete_response.status_code == 204
    
    get_response = client.get("/notes")
    assert not any(n["id"] == note_id for n in get_response.json())

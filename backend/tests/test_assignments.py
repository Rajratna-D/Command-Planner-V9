def test_create_assignment(client):
    response = client.post("/assignments", json={
        "subject": "Chemistry",
        "title": "Lab Report 1",
        "due": "2026-06-25",
        "marks": "100",
        "tags": ["chem", "lab"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Chemistry"
    assert data["title"] == "Lab Report 1"
    assert data["due"] == "2026-06-25"
    assert data["marks"] == "100"
    assert data["tags"] == ["chem", "lab"]
    assert "id" in data

def test_get_assignments(client):
    client.post("/assignments", json={"subject": "Math", "title": "HW1"})
    
    response = client.get("/assignments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "HW1"

def test_update_assignment(client):
    create_response = client.post("/assignments", json={
        "subject": "Math",
        "title": "HW1",
        "tags": ["math"]
    })
    asgn_id = create_response.json()["id"]
    
    update_response = client.patch(f"/assignments/{asgn_id}", json={
        "title": "HW1 - Updated",
        "tags": ["math", "homework"]
    })
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["title"] == "HW1 - Updated"
    assert data["tags"] == ["math", "homework"]

def test_submit_assignment(client):
    create_response = client.post("/assignments", json={
        "subject": "Math",
        "title": "HW1"
    })
    asgn_id = create_response.json()["id"]
    
    submit_response = client.patch(f"/assignments/{asgn_id}/submit")
    assert submit_response.status_code == 200
    data = submit_response.json()
    assert data["submitted"] is True
    assert data["submitted_at"] is not None

def test_delete_assignment(client):
    create_response = client.post("/assignments", json={"subject": "Math", "title": "HW2"})
    asgn_id = create_response.json()["id"]
    
    delete_response = client.delete(f"/assignments/{asgn_id}")
    assert delete_response.status_code == 204
    
    get_response = client.get("/assignments")
    assert not any(a["id"] == asgn_id for a in get_response.json())

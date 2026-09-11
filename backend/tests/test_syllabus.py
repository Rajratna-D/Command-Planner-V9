def test_create_subject(client):
    response = client.post("/syllabus", json={"name": "Mathematics"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mathematics"
    assert "id" in data
    assert data["topics"] == []

def test_get_subjects(client):
    client.post("/syllabus", json={"name": "Physics"})
    client.post("/syllabus", json={"name": "Chemistry"})
    
    response = client.get("/syllabus")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Should be sorted alphabetically by name
    assert data[0]["name"] == "Chemistry"
    assert data[1]["name"] == "Physics"

def test_delete_subject(client):
    create_response = client.post("/syllabus", json={"name": "Biology"})
    subj_id = create_response.json()["id"]
    
    delete_response = client.delete(f"/syllabus/{subj_id}")
    assert delete_response.status_code == 204
    
    # Verify subject is gone
    response = client.get("/syllabus")
    data = response.json()
    assert not any(s["id"] == subj_id for s in data)

def test_add_topic(client):
    create_subj_response = client.post("/syllabus", json={"name": "Computer Science"})
    subj_id = create_subj_response.json()["id"]
    
    response = client.post(f"/syllabus/{subj_id}/topics", json={"name": "Data Structures"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["topics"]) == 1
    assert data["topics"][0]["name"] == "Data Structures"
    assert data["topics"][0]["done"] is False
    assert data["topics"][0]["in_progress"] is False
    assert "id" in data["topics"][0]

def test_toggle_topic(client):
    create_subj_response = client.post("/syllabus", json={"name": "Computer Science"})
    subj_id = create_subj_response.json()["id"]
    
    add_topic_response = client.post(f"/syllabus/{subj_id}/topics", json={"name": "Data Structures"})
    topic_id = add_topic_response.json()["topics"][0]["id"]
    
    # Toggle without body (defaults to toggling done)
    response = client.patch(f"/syllabus/{subj_id}/topics/{topic_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["topics"][0]["done"] is True
    
    # Toggle with body (set done to False, in_progress to True)
    response = client.patch(f"/syllabus/{subj_id}/topics/{topic_id}", json={"done": False, "in_progress": True})
    assert response.status_code == 200
    data = response.json()
    assert data["topics"][0]["done"] is False
    assert data["topics"][0]["in_progress"] is True

def test_delete_topic(client):
    create_subj_response = client.post("/syllabus", json={"name": "Computer Science"})
    subj_id = create_subj_response.json()["id"]
    
    add_topic_response = client.post(f"/syllabus/{subj_id}/topics", json={"name": "Data Structures"})
    topic_id = add_topic_response.json()["topics"][0]["id"]
    
    delete_response = client.delete(f"/syllabus/{subj_id}/topics/{topic_id}")
    assert delete_response.status_code == 204
    
    # Get subjects and check topics is empty
    response = client.get("/syllabus")
    data = response.json()
    subj = next(s for s in data if s["id"] == subj_id)
    assert len(subj["topics"]) == 0

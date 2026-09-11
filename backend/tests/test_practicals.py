def test_create_practical(client):
    response = client.post("/practicals", json={
        "subject": "Physics",
        "num": "Exp 1",
        "title": "Ohm's Law",
        "date": "2026-06-20"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Physics"
    assert data["num"] == "Exp 1"
    assert data["title"] == "Ohm's Law"
    assert data["date"] == "2026-06-20"
    assert data["performed"] is False
    assert data["writeup"] is False
    assert data["submitted"] is False
    assert data["done"] is False
    assert "id" in data

def test_get_practicals(client):
    client.post("/practicals", json={"subject": "Physics", "title": "Ohm's Law"})
    client.post("/practicals", json={"subject": "Chemistry", "title": "Titration"})

    response = client.get("/practicals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Should be sorted by subject, then num
    assert data[0]["subject"] == "Chemistry"
    assert data[1]["subject"] == "Physics"

def test_toggle_practical_stage(client):
    create_response = client.post("/practicals", json={"subject": "Physics", "title": "Ohm's Law"})
    prac_id = create_response.json()["id"]

    # Toggle 'performed' stage
    response = client.patch(f"/practicals/{prac_id}/toggle/performed")
    assert response.status_code == 200
    data = response.json()
    assert data["performed"] is True
    assert data["done"] is False # done should be false because writeup and submitted are still false

    # Toggle invalid stage
    invalid_response = client.patch(f"/practicals/{prac_id}/toggle/invalid_stage")
    assert invalid_response.status_code == 400

    # Toggle remaining stages to complete it
    client.patch(f"/practicals/{prac_id}/toggle/writeup")
    final_response = client.patch(f"/practicals/{prac_id}/toggle/submitted")
    assert final_response.status_code == 200
    data = final_response.json()
    assert data["performed"] is True
    assert data["writeup"] is True
    assert data["submitted"] is True
    assert data["done"] is True # All 3 stages are complete, done should auto-set to true

def test_get_practicals_filter(client):
    create_response = client.post("/practicals", json={"subject": "Physics", "title": "Ohm's Law"})
    prac_id = create_response.json()["id"]

    # Not done yet
    response = client.get("/practicals?done=true")
    assert len(response.json()) == 0

    response = client.get("/practicals?done=false")
    assert len(response.json()) == 1

    # Complete it
    client.patch(f"/practicals/{prac_id}/toggle/performed")
    client.patch(f"/practicals/{prac_id}/toggle/writeup")
    client.patch(f"/practicals/{prac_id}/toggle/submitted")

    response = client.get("/practicals?done=true")
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == prac_id

def test_delete_practical(client):
    create_response = client.post("/practicals", json={"subject": "Physics", "title": "Ohm's Law"})
    prac_id = create_response.json()["id"]

    delete_response = client.delete(f"/practicals/{prac_id}")
    assert delete_response.status_code == 204

    # Verify deleted
    response = client.get("/practicals")
    assert not any(p["id"] == prac_id for p in response.json())

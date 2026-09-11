def test_create_test(client):
    response = client.post("/tests", json={
        "subject": "Mathematics",
        "date": "2026-06-21",
        "time": "09:00",
        "note": "Calculus and Algebra"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Mathematics"
    assert data["date"] == "2026-06-21"
    assert data["time"] == "09:00"
    assert data["note"] == "Calculus and Algebra"
    assert "id" in data
    assert "created_at" in data

def test_get_tests(client):
    client.post("/tests", json={
        "subject": "Physics",
        "date": "2026-06-22",
        "time": "14:00"
    })
    client.post("/tests", json={
        "subject": "Chemistry",
        "date": "2026-06-20",
        "time": "10:00"
    })

    response = client.get("/tests")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Should be sorted by date and time ascending
    assert data[0]["subject"] == "Chemistry"
    assert data[1]["subject"] == "Physics"

def test_delete_test(client):
    create_response = client.post("/tests", json={
        "subject": "Biology",
        "date": "2026-06-25",
        "time": "11:00"
    })
    test_id = create_response.json()["id"]

    delete_response = client.delete(f"/tests/{test_id}")
    assert delete_response.status_code == 204

    # Verify deleted
    response = client.get("/tests")
    assert not any(t["id"] == test_id for t in response.json())

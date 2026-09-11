def test_create_list(client):
    response = client.post("/lists", json={"name": "Groceries"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Groceries"
    assert "id" in data
    assert data["items"] == []

def test_get_lists(client):
    client.post("/lists", json={"name": "Books to read"})
    client.post("/lists", json={"name": "Groceries"})

    response = client.get("/lists")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Should be sorted by created_at desc, so Groceries comes first if it was created second
    assert data[0]["name"] == "Groceries"
    assert data[1]["name"] == "Books to read"

def test_delete_list(client):
    create_response = client.post("/lists", json={"name": "Temp"})
    list_id = create_response.json()["id"]

    delete_response = client.delete(f"/lists/{list_id}")
    assert delete_response.status_code == 204

    # Verify deleted
    response = client.get("/lists")
    assert not any(l["id"] == list_id for l in response.json())

def test_add_list_item(client):
    create_response = client.post("/lists", json={"name": "Groceries"})
    list_id = create_response.json()["id"]

    response = client.post(f"/lists/{list_id}/items", json={"text": "Apples"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["text"] == "Apples"
    assert data["items"][0]["done"] is False
    assert "id" in data["items"][0]

def test_update_list_item(client):
    create_response = client.post("/lists", json={"name": "Groceries"})
    list_id = create_response.json()["id"]

    add_response = client.post(f"/lists/{list_id}/items", json={"text": "Apples"})
    item_id = add_response.json()["items"][0]["id"]

    # Update text and done status
    response = client.patch(f"/lists/{list_id}/items/{item_id}", json={"text": "Green Apples", "done": True})
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["text"] == "Green Apples"
    assert data["items"][0]["done"] is True

def test_delete_list_item(client):
    create_response = client.post("/lists", json={"name": "Groceries"})
    list_id = create_response.json()["id"]

    add_response = client.post(f"/lists/{list_id}/items", json={"text": "Apples"})
    item_id = add_response.json()["items"][0]["id"]

    delete_response = client.delete(f"/lists/{list_id}/items/{item_id}")
    assert delete_response.status_code == 204

    # Verify item deleted from the list
    response = client.get("/lists")
    lst = next(l for l in response.json() if l["id"] == list_id)
    assert len(lst["items"]) == 0

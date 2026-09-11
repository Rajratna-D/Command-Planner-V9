def test_create_pomodoro_session(client):
    response = client.post("/pomodoro/sessions", json={
        "date": "2026-06-17",
        "time": "12:00",
        "type": "work",
        "task": "Study Chemistry",
        "duration_min": 25
    })
    assert response.status_code == 201
    data = response.json()
    assert data["date"] == "2026-06-17"
    assert data["time"] == "12:00"
    assert data["type"] == "work"
    assert data["task"] == "Study Chemistry"
    assert data["duration_min"] == 25
    assert "id" in data
    assert "created_at" in data

def test_get_pomodoro_log(client):
    # Log two sessions of different types and dates
    client.post("/pomodoro/sessions", json={
        "date": "2026-06-17",
        "time": "12:00",
        "type": "work",
        "task": "Study Chemistry",
        "duration_min": 25
    })
    client.post("/pomodoro/sessions", json={
        "date": "2026-06-18",
        "time": "13:00",
        "type": "break",
        "task": "Coffee break",
        "duration_min": 5
    })

    # Get all sessions
    response = client.get("/pomodoro/log")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Filter by date
    response = client.get("/pomodoro/log?date=2026-06-17")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["date"] == "2026-06-17"

    # Filter by type
    response = client.get("/pomodoro/log?type=break")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["type"] == "break"


def test_dynamic_streak(client):
    from datetime import date, timedelta
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    day_before = (date.today() - timedelta(days=2)).isoformat()

    # Log work sessions for today, yesterday, and day before
    client.post("/pomodoro/sessions", json={"date": today, "type": "work", "duration_min": 25})
    client.post("/pomodoro/sessions", json={"date": yesterday, "type": "work", "duration_min": 25})
    client.post("/pomodoro/sessions", json={"date": day_before, "type": "work", "duration_min": 25})

    scores = client.get("/productivity/scores").json()
    assert scores["streak"] == 3

    overview = client.get("/analytics/overview").json()
    assert overview["streak"] == 3


def test_midnight_session_split(client):
    # Session starts at 22:15 on 2026-06-17 for 120 mins -> ends at 00:15 on 2026-06-18
    # 105 min on 2026-06-17, 15 min on 2026-06-18
    res = client.post("/pomodoro/sessions", json={
        "date": "2026-06-17",
        "time": "00:15",
        "start_time": "22:15",
        "type": "work",
        "task": "Late Night Study",
        "duration_min": 120
    })
    assert res.status_code == 201

    log_prev = client.get("/pomodoro/log?date=2026-06-17").json()
    log_next = client.get("/pomodoro/log?date=2026-06-18").json()

    assert any(s["duration_min"] == 105 and s["time"] == "22:15" for s in log_prev)
    assert any(s["duration_min"] == 15 and s["time"] == "00:00" for s in log_next)

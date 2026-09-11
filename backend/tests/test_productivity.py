from datetime import date, timedelta


def test_productivity_scores_hours_based(client):
    today = date.today().isoformat()

    # Set daily goal to 3.0 hours
    client.put("/settings/daily_goal", json={"key": "daily_goal", "value": "3.0"})

    # 1. Test prevention of 1-minute session exploit:
    # Log ten 1-minute sessions (total 10 minutes = 0.167 hrs)
    for _ in range(10):
        client.post("/pomodoro/sessions", json={
            "date": today,
            "time": "10:00",
            "type": "work",
            "task": "Quick 1-min task",
            "duration_min": 1
        })

    scores = client.get("/productivity/scores").json()
    assert scores["daily_goal"] == 3.0
    assert scores["today"]["sessions"] == 10
    assert scores["today"]["duration_min"] == 10
    assert scores["today"]["hours"] == 0.2
    # 10 min / 180 min goal = 5.55% -> score is 5
    assert scores["today"]["score"] == 5
    assert scores["today"]["grade"] == "NEEDS WORK"

    # 2. Now log 170 more minutes of work (total 180 minutes = 3.0 hrs)
    client.post("/pomodoro/sessions", json={
        "date": today,
        "time": "11:00",
        "type": "work",
        "task": "Deep Study",
        "duration_min": 170
    })

    updated_scores = client.get("/productivity/scores").json()
    assert updated_scores["today"]["sessions"] == 11
    assert updated_scores["today"]["duration_min"] == 180
    assert updated_scores["today"]["hours"] == 3.0
    assert updated_scores["today"]["score"] == 100
    assert updated_scores["today"]["grade"] == "EXCELLENT"


def test_heatmap_returns_hours_and_sessions(client):
    today = date.today().isoformat()
    current_year = date.today().year

    client.post("/pomodoro/sessions", json={
        "date": today,
        "time": "14:00",
        "type": "work",
        "task": "Math Revision",
        "duration_min": 90
    })

    # Query heatmap for this year
    heatmap = client.get(f"/productivity/heatmap?year={current_year}").json()
    assert len(heatmap) >= 365

    today_item = next((item for item in heatmap if item["date"] == today), None)
    assert today_item is not None
    assert today_item["sessions"] >= 1
    assert today_item["duration_min"] >= 90
    assert today_item["hours"] >= 1.5


def test_spider_chart_returns_hours(client):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    monday_iso = monday.isoformat()

    client.put("/settings/daily_goal", json={"key": "daily_goal", "value": "4.0"})

    client.post("/pomodoro/sessions", json={
        "date": monday_iso,
        "time": "09:00",
        "type": "work",
        "task": "Physics Lab",
        "duration_min": 120
    })

    spider = client.get("/productivity/spider").json()
    assert spider["goal"] == 4.0
    assert len(spider["day_labels"]) == 7
    assert len(spider["this_week"]) == 7
    assert spider["this_week"][0] >= 2.0  # Monday has >= 2.0 hours (120 min)
    assert spider["this_week_sessions"][0] >= 1


def test_overview_focus_hours_today(client):
    today = date.today().isoformat()

    client.post("/pomodoro/sessions", json={
        "date": today,
        "time": "16:00",
        "type": "work",
        "task": "Coding",
        "duration_min": 60
    })

    overview = client.get("/analytics/overview").json()
    assert overview["pomodoros_today"] >= 1
    assert overview["focus_hours_today"] >= 1.0


def test_subject_breakdown(client):
    today = date.today().isoformat()
    client.post("/pomodoro/sessions", json={
        "date": today,
        "time": "10:00",
        "type": "work",
        "task": "[Linear Algebra] Matrix ops",
        "duration_min": 60
    })
    client.post("/pomodoro/sessions", json={
        "date": today,
        "time": "11:30",
        "type": "work",
        "task": "Subject: Deep Learning",
        "duration_min": 120
    })

    breakdown = client.get("/productivity/subject-breakdown").json()
    assert len(breakdown) >= 2
    la = next((b for b in breakdown if b["subject"] == "Linear Algebra"), None)
    dl = next((b for b in breakdown if b["subject"] == "Deep Learning"), None)
    assert la is not None
    assert la["duration_min"] >= 60
    assert dl is not None
    assert dl["duration_min"] >= 120
    assert dl["hours"] >= 2.0


def test_daily_trend_and_badges(client):
    today = date.today().isoformat()
    client.put("/settings/daily_goal", json={"key": "daily_goal", "value": "3.0"})
    
    # 1. Test Daily Trend
    trend = client.get("/productivity/daily-trend?days=14").json()
    assert len(trend["days"]) == 14
    assert "goal_hit_rate" in trend
    assert "daily_avg_hours" in trend

    # 2. Test Badges
    badges = client.get("/productivity/badges").json()
    assert len(badges) == 7
    marathoner = next(b for b in badges if b["id"] == "marathoner")
    assert marathoner["target_value"] == 7.0
    assert marathoner["unlocked"] is False  # Unless 7h logged

    century = next(b for b in badges if b["id"] == "century_club")
    assert century["target_value"] == 100

    # 3. Test Insights
    insights = client.get("/productivity/insights").json()
    assert len(insights) >= 3


def test_peak_hours_hour_distribution(client):
    # Log a 120-minute session starting at 22:15
    # Hour 22 should get 45 min, hour 23 should get 60 min, hour 0 should get 15 min
    client.post("/pomodoro/sessions", json={
        "date": "2026-06-20",
        "time": "22:15",
        "type": "work",
        "task": "Night Owl Study",
        "duration_min": 120
    })

    peak = client.get("/productivity/peak-hours").json()
    assert peak["minutes"][22] >= 45
    assert peak["minutes"][23] >= 60
    assert peak["minutes"][0] >= 15

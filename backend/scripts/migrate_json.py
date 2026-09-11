"""
JSON → SQLite Migration Script
Migrates existing planner_data.json from the desktop version to the new SQLite database.
Run once on first launch or manually: python -m backend.scripts.migrate_json
"""
import json
import os
import sys
import shutil
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine, SessionLocal, Base, DB_PATH, utcnow
from backend.models.task import Task
from backend.models.test import Test
from backend.models.assignment import Assignment
from backend.models.practical import Practical
from backend.models.list_model import List, ListItem
from backend.models.syllabus import Subject, Topic
from backend.models.pomodoro import PomodoroSession
from backend.models.note import Note
from backend.models.settings import Setting

# Path to the desktop version's JSON data file
JSON_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "planner_data.json")


def migrate():
    if not os.path.exists(JSON_FILE):
        print(f"[SKIP] No planner_data.json found at {JSON_FILE}")
        return

    if os.path.exists(DB_PATH):
        print(f"[SKIP] Database already exists at {DB_PATH}")
        print("       Delete planner.db to re-run migration.")
        return

    print(f"[MIGRATE] Reading {JSON_FILE}...")

    # 1. Backup the original JSON
    backup_path = JSON_FILE + ".backup"
    shutil.copy2(JSON_FILE, backup_path)
    print(f"[BACKUP] Original JSON backed up to {backup_path}")

    with open(JSON_FILE, encoding="utf-8") as f:
        data = json.load(f)

    # 2. Create the database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 3. Migrate Tasks
        tasks = data.get("tasks", [])
        for t in tasks:
            db.add(Task(
                id=t.get("id", ""),
                text=t.get("text", ""),
                priority=t.get("priority", "Someday"),
                due=t.get("due", ""),
                done=t.get("done", False),
                recur=t.get("recur", "None"),
                spawned=t.get("spawned", False),
                added_at=datetime.fromisoformat(t["added"]) if t.get("added") else utcnow(),
            ))
        print(f"  ✓ Tasks: {len(tasks)} records")

        # 4. Migrate Tests
        tests = data.get("tests", [])
        for t in tests:
            db.add(Test(
                id=t.get("id", ""),
                subject=t.get("subject", ""),
                date=t.get("date", ""),
                time=t.get("time", ""),
                note=t.get("note", ""),
            ))
        print(f"  ✓ Tests: {len(tests)} records")

        # 5. Migrate Assignments
        assignments = data.get("assignments", [])
        for a in assignments:
            db.add(Assignment(
                id=a.get("id", ""),
                subject=a.get("subject", ""),
                title=a.get("title", ""),
                due=a.get("due", ""),
                marks=a.get("marks", ""),
                submitted=a.get("submitted", False),
            ))
        print(f"  ✓ Assignments: {len(assignments)} records")

        # 6. Migrate Practicals
        practicals = data.get("practicals", [])
        for p in practicals:
            db.add(Practical(
                id=p.get("id", ""),
                subject=p.get("subject", ""),
                num=str(p.get("num", "")),
                title=p.get("title", ""),
                date=p.get("date", ""),
                performed=p.get("performed", False),
                writeup=p.get("writeup", False),
                submitted=p.get("submitted", False),
                done=p.get("done", False),
            ))
        print(f"  ✓ Practicals: {len(practicals)} records")

        # 7. Migrate Lists (with nested items)
        lists = data.get("lists", [])
        for lst in lists:
            list_obj = List(id=lst.get("id", ""), name=lst.get("name", ""))
            db.add(list_obj)
            for item in lst.get("items", []):
                db.add(ListItem(
                    id=item.get("id", ""),
                    list_id=lst["id"],
                    text=item.get("text", ""),
                    done=item.get("done", False),
                ))
        print(f"  ✓ Lists: {len(lists)} records")

        # 8. Migrate Syllabus (with nested topics)
        syllabus = data.get("syllabus", [])
        for subj in syllabus:
            subj_obj = Subject(id=subj.get("id", ""), name=subj.get("name", ""))
            db.add(subj_obj)
            for topic in subj.get("topics", []):
                db.add(Topic(
                    id=topic.get("id", ""),
                    subject_id=subj["id"],
                    name=topic.get("name", ""),
                    done=topic.get("done", False),
                ))
        print(f"  ✓ Syllabus: {len(syllabus)} subjects")

        # 9. Migrate Pomodoro Log
        pomo_log = data.get("pomodoro_log", [])
        for p in pomo_log:
            db.add(PomodoroSession(
                id=p.get("id", ""),
                date=p.get("date", ""),
                time=p.get("time", ""),
                type=p.get("type", "work"),
                task=p.get("task", ""),
                duration_min=p.get("duration_min", 25),
            ))
        print(f"  ✓ Pomodoro: {len(pomo_log)} sessions")

        # 10. Migrate Notes
        notes = data.get("notes", [])
        for n in notes:
            db.add(Note(
                id=n.get("id", ""),
                title=n.get("title", "Untitled"),
                subject=n.get("subject", "General"),
                body=n.get("body", ""),
                created_at=datetime.fromisoformat(n["created"]) if n.get("created") else utcnow(),
                updated_at=datetime.fromisoformat(n["updated"]) if n.get("updated") else utcnow(),
            ))
        print(f"  ✓ Notes: {len(notes)} records")

        # 11. Migrate Settings
        settings_map = {
            "streak": json.dumps(data.get("streak", {"last_date": "", "count": 0})),
            "daily_goal": json.dumps(data.get("daily_goal", 6)),
            "theme": json.dumps(data.get("theme", "dark")),
            "subject_colors": json.dumps(data.get("subject_colors", {})),
            "last_digest_date": json.dumps(data.get("last_digest_date", "")),
        }
        for key, value in settings_map.items():
            db.add(Setting(key=key, value=value))
        print(f"  ✓ Settings: {len(settings_map)} keys")

        # 12. Commit (atomic transaction)
        db.commit()
        print(f"\n[SUCCESS] Migration complete! Database: {DB_PATH}")

        # Verify row counts
        total = (
            db.query(Task).count() +
            db.query(Test).count() +
            db.query(Assignment).count() +
            db.query(Practical).count() +
            db.query(List).count() +
            db.query(Subject).count() +
            db.query(PomodoroSession).count() +
            db.query(Note).count() +
            db.query(Setting).count()
        )
        print(f"[VERIFY] Total records in database: {total}")

    except Exception as e:
        db.rollback()
        # Remove partially created database
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        print(f"\n[ERROR] Migration failed: {e}")
        print("Database rolled back. Original JSON is untouched.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()

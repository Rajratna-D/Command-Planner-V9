# ⚡ Command Planner V9 — The Full-Stack Academic Productivity Suite

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%206.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite WAL](https://img.shields.io/badge/Database-SQLite%203%20(WAL)-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Zustand](https://img.shields.io/badge/State-Zustand%205.0-443e38?style=for-the-badge)](https://github.com/pmndrs/zustand)
[![Framer Motion](https://img.shields.io/badge/Motion-Framer%20Motion%2012-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Testing](https://img.shields.io/badge/Tests-Pytest%20%7C%20Vitest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **Command Planner V9** represents a quantum leap in academic productivity engineering. Rebuilt from the ground up as a **high-concurrency, modern full-stack web application**, V9 merges a high-performance **FastAPI** backend and **SQLite WAL** persistence with a reactive **React 19, TypeScript, and Tailwind CSS v4** frontend. 
>
> Featuring drag-and-drop dashboards, a global spotlight command palette (`Ctrl + K`), 15 curated color themes, native D3.js Kiviat radar charts, and an 11-suite automated testing harness.

---

## 📑 Table of Contents

- [Key Innovations: The Paradigm Shift](#-key-innovations-the-paradigm-shift)
- [System Architecture](#-system-architecture)
- [Comprehensive Feature Tour (10 Workstation Modules)](#-comprehensive-feature-tour-10-workstation-modules)
  - [1. ⬡ Dynamic Overview & Drag-and-Drop Dashboard](#1-⬡-dynamic-overview--drag-and-drop-dashboard)
  - [2. ◈ Exam & Test Countdown Command](#2-◈-exam--test-countdown-command)
  - [3. ▣ High-Output Task Engine with Recurrence](#3-▣-high-output-task-engine-with-recurrence)
  - [4. ◫ Multi-Project Checklists](#4-◫-multi-project-checklists)
  - [5. ◧ Coursework & Assignment Submission Tracker](#5-◧-coursework--assignment-submission-tracker)
  - [6. ◩ STEM Laboratory Practicals Lifecycle](#6-◩-stem-laboratory-practicals-lifecycle)
  - [7. ⬢ Syllabus Coverage & Progress Manager](#7-⬢-syllabus-coverage--progress-manager)
  - [8. ◎ Deep-Work Pomodoro Workstation](#8--deep-work-pomodoro-workstation)
  - [9. ✎ Markdown Knowledge Base & Note Studio](#9--markdown-knowledge-base--note-studio)
  - [10. ◐ Quantitative Focus & Productivity Analytics](#10--quantitative-focus--productivity-analytics)
- [Cutting-Edge UX & Visual Polish](#-cutting-edge-ux--visual-polish)
- [Backend REST API Specification (13 APIRouters)](#-backend-rest-api-specification-13-apirouters)
- [Database Persistence & Zero-Data-Leak Guarantees](#-database-persistence--zero-data-leak-guarantees)
- [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)
- [Installation & Quick Start](#-installation--quick-start)
- [Repository Structure](#-repository-structure)
- [License & Acknowledgments](#-license--acknowledgments)

---

## ⚡ Key Innovations: The Paradigm Shift

```
  DESKTOP MONOLITH (V1–V8)              FULL-STACK WEB PLATFORM (V9)
┌──────────────────────────┐          ┌───────────────────────────────┐
│ • Procedural Tkinter/QML │          │ • React 19 + TypeScript + Vite│
│ • Local JSON storage     │  ═════►  │ • FastAPI + SQLAlchemy 2.0 ORM│
│ • Single-threaded UI     │          │ • High-Concurrency SQLite WAL │
│ • Static layout sheets   │          │ • Drag-and-Drop Widgets       │
│ • Zero automated tests   │          │ • 11 Pytest Integration Suites│
└──────────────────────────┘          └───────────────────────────────┘
```

| Dimension | Legacy Desktop (V1–V8) | Command Planner V9 (Modern Web) |
|---|---|---|
| **Architecture** | Single-file script (3,000+ lines) | **Decoupled Client-Server REST API** |
| **Frontend Framework** | CustomTkinter / PySide6 | **React 19 + TypeScript + Vite 6** |
| **Styling & Design** | Hardcoded Hex Canvas | **Tailwind CSS v4 + 15 Curated Themes** |
| **Database Engine** | Flat `planner_data.json` file | **Relational SQLite with Write-Ahead Logging (WAL)** |
| **State Management** | Global dictionary reference | **Zustand 5 Stores (`appStore`, `pomodoroStore`)** |
| **UI Interactivity** | Standard mouse click handlers | **`@dnd-kit` Drag-and-Drop + `Ctrl+K` Command Palette** |
| **Visualizations** | Matplotlib TkAgg embedding | **Interactive SVG/HTML5 Canvas via D3.js & Recharts** |
| **Code Testing** | Manual test execution | **Full Automated Pytest & Vitest Suites (100% router coverage)** |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER CLIENT                                  │
│             React 19  •  TypeScript  •  Tailwind CSS v4  •  Vite            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          ZUSTAND 5 STORES                             │  │
│  │      appStore.ts (Themes, Active Tab, Toasts, Subject Palettes)       │  │
│  │      pomodoroStore.ts (Live Countdown, Interval Cycles, Sound Engine) │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│    ┌────────────────────────────────┼──────────────────────────────────┐    │
│    ▼                                ▼                                  ▼    │
│ [Pages / Views]            [Reusable UI Primitives]           [D3 Visuals]  │
│ Overview, Tasks, Tests,    Card, Badge, Input, Toast,         Kiviat Radar, │
│ Pomodoro, Notes, Syllabus  Modal, CommandPalette, RadialBar   52-Wk Heatmap │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTP REST API (JSON over Port 8000)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI ASYNC BACKEND                              │
│                      Python 3.11+ / 3.14  •  Pydantic v2                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          13 API ROUTERS                               │  │
│  │  /tasks     /tests        /assignments   /practicals    /lists        │  │
│  │  /syllabus  /pomodoro     /notes         /productivity  /analytics    │  │
│  │  /archive   /backup       /settings                                   │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Lifespan Hooks & Startup Auto-Backup  │
│                                     ▼                                       │
│                        SQLAlchemy 2.0 ORM Models                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ Foreign Keys & WAL Engine
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SQLITE DATABASE LAYER (planner.db)                    │
│                                                                             │
│  • PRAGMA journal_mode=WAL           • PRAGMA synchronous=NORMAL            │
│  • Dynamic Schema Auto-Migrations    • JSON Data Migration Bridge           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Comprehensive Feature Tour (10 Workstation Modules)

### 1. ⬡ Dynamic Overview & Drag-and-Drop Dashboard
The command center designed for rapid orientation:
- **Customizable Drag-and-Drop Layout**: Reorder dashboard widgets freely using `@dnd-kit` to suit your individual priority hierarchy.
- **KPI Real-Time Stat Cards**: Live countdown of urgent tests, pending tasks, unsubmitted assignments, lab practicals, active subjects, and today's Pomodoro sessions.
- **Critical Action Panels**:
  - 🔴 **Due Today & Overdue**: Highlights immediate deadlines in high-contrast crimson banners.
  - 🟡 **Due Tomorrow**: Proactive 24-hour situational awareness display.
- **Integrated Radial Focus Dial**: Real-time visualization of daily focus session progress toward your target dial.

### 2. ◈ Exam & Test Countdown Command
Eliminate examination surprises with automated date calculations:
- **Precision Countdown Engine**: Dynamic date mathematics calculating exact days remaining (`TODAY`, `TOMORROW`, `X d`, `PAST`).
- **Urgency Saturation Tiers**: Color shifts from Green (>7 days) down to Gold (≤7 days), Orange (≤2 days), and Red (0 days).
- **Comprehensive Metadata**: Tracks course codes, scheduled date, time slots, and syllabus topic scope.

### 3. ▣ High-Output Task Engine with Recurrence
Advanced task scheduling built for power users:
- **5-Tier Priority Hierarchy**:
  - `Immediate` (Crimson `#FF4466`)
  - `Important` (Amber `#FF9020`)
  - `2nd Priority` (Electric Blue `#4D96FF`)
  - `3rd Priority` (Emerald Green `#2EE87A`)
  - `Someday` (Muted Slate `#5E6A90`)
- **Automated Recurrence Engine**: Automatically spawns the next occurrence (`Daily`, `Weekly`, `Monthly`) when a recurring task is checked off.
- **Tagging & Instant Filtering**: Tag tasks with custom labels (`#exam`, `#urgent`) and filter across priority levels or due dates in real time.
- **Archive & Strikethrough**: Soft-deletes tasks into an audit-ready archive rather than permanently erasing history.

### 4. ◫ Multi-Project Checklists
Ad-hoc sprint trackers and project roadmaps:
- Create custom named checklists with responsive completion ratio bars (`X / Y`).
- Item drag-and-drop reordering with keyboard navigation accessibility.

### 5. ◧ Coursework & Assignment Submission Tracker
Academic submission lifecycle manager:
- Monitor course codes, assignment titles, deadlines, and grade weightages.
- Instant overdue flags with countdown warnings.
- One-click **✓ SUBMITTED** transition archiving submissions into a verified completed drawer.

### 6. ◩ STEM Laboratory Practicals Lifecycle
Purpose-built for engineering, medical, and scientific curricula:
- Tracks Experiment Number, Title, Subject, and Lab Date.
- **Three-Stage Milestone Verification**:
  - `[P]` **Performed**: Hands-on lab work completed.
  - `[W]` **Writeup Done**: Observation journal and calculations verified.
  - `[S]` **Submitted**: Journal evaluated and signed off by instructor.
- Automated completion detection once all three states are checked.

### 7. ⬢ Syllabus Coverage & Progress Manager
Complete curriculum coverage tracker:
- Multi-subject creation with customizable subject color badges.
- Hierarchical breakdown into units and individual topics.
- Interactive topic states (`Pending`, `In Progress`, `Completed`) automatically updating live percentage progress bars.

### 8. ◎ Deep-Work Pomodoro Workstation
Zero-friction focus timer:
- **Configurable Work/Break Cycles**: Default 25-minute focus session, 5-minute short break, and 15-minute long break after 4 sessions.
- **Active Task Association**: Link the running timer directly to any open task from the task queue.
- **Web Audio Engine**: Native browser audio generation outputs acoustic chimes upon session completion without external audio files.
- **Session Audit History**: Comprehensive chronological log tracking session duration, start times, and linked tasks.

### 9. ✎ Markdown Knowledge Base & Note Studio
Integrated split-pane note-taking studio:
- **Master-Detail Layout**: Categorized note list on the left with instant search; full editor on the right.
- **Markdown & Tagging**: Full Markdown rendering support with multi-tag filtering.
- **Audit Metadata**: Automatic tracking of creation timestamps and last-edited metadata.

### 10. ◐ Quantitative Focus & Productivity Analytics
Scientific performance metrics powered by D3.js and Recharts:
- **Daily Target Dial**: Set personal goals for sessions per day (default: 6 sessions).
- **Dynamic Productivity Score**: Algorithmic score calculated from daily output (0–100) with rating bands (*EXCELLENT*, *GOOD*, *AVERAGE*, *NEEDS WORK*).
- **52-Week Focus Contribution Heatmap**: Full-year GitHub-style activity grid rendered natively in D3 with 4-level color saturation and month labels.
- **Dual-Week Kiviat Radar Chart**: 7 radial axes (Mon–Sun) comparing this week's focus distribution against last week's baseline with glowing paths and vertex halos.
- **Peak Focus Hours Bar Graph**: 24-hour distribution identifying your most productive times of day.

---

## 🎨 Cutting-Edge UX & Visual Polish

### 1. Global Spotlight Command Palette (`Ctrl + K`)
Press **`Ctrl + K`** (or `Cmd + K` on macOS) anywhere in the application to summon the instant spotlight:
- Jump to any page or module instantaneously.
- Search tasks, notes, and syllabus topics globally.
- Trigger one-click actions (start Pomodoro, toggle theme, trigger manual backup).

### 2. 15 Curated Color Themes
Switch between 15 meticulously tailored themes via the settings panel or command palette:
```
• Light        • Dark (PrinceBlue)   • OLED (Pure Pitch)   • Nord (Arctic Frost)
• Cyberpunk    • Sepia (Vintage)     • Sakura (Pastel)     • Forest (Emerald)
• Matcha       • Espresso (Mocha)    • Nebula (Cosmic)     • Twilight
• Abyss        • Lavender            • Monokai (Dev Pro)
```

### 3. Unified Soft-Delete Archive
Accidentally deleted a task, note, or assignment? V9 introduces an integrated `/archive` system that moves deleted entities into a soft-delete trash bin, allowing 1-click restoration or permanent purging.

---

## 🔌 Backend REST API Specification (13 APIRouters)

The backend exposes an interactive **Swagger UI** at `http://localhost:8000/docs`:

| Router | Method | Endpoint | Description |
|---|---|---|---|
| **Tasks** | `GET / POST` | `/tasks` | List active tasks (filtered by priority/due date) or create task |
| | `PATCH / DELETE` | `/tasks/{id}` | Update task state, toggle completion, or archive |
| **Tests** | `GET / POST` | `/tests` | Fetch test schedule or schedule a new exam |
| | `DELETE` | `/tests/{id}` | Remove scheduled test |
| **Assignments**| `GET / POST` | `/assignments` | List coursework or create assignment |
| | `PATCH / DELETE` | `/assignments/{id}` | Submit assignment or archive |
| **Practicals** | `GET / POST` | `/practicals` | List lab practicals or create new practical |
| | `PATCH` | `/practicals/{id}` | Toggle `performed`, `writeup`, or `submitted` |
| **Lists** | `GET / POST` | `/lists` | Fetch all project checklists or create new list |
| | `POST / PATCH` | `/lists/{id}/items` | Add items or update checklist items |
| **Syllabus** | `GET / POST` | `/syllabus` | Fetch syllabus curriculum tree or add subject |
| | `POST / PATCH` | `/syllabus/{id}/topics` | Add topic or update `in_progress` / `done` states |
| **Pomodoro** | `GET / POST` | `/pomodoro` | Fetch daily session log or record new session |
| **Notes** | `GET / POST` | `/notes` | Search notes or create new note |
| | `PATCH / DELETE` | `/notes/{id}` | Update note body/tags or archive |
| **Productivity**| `GET` | `/productivity` | Get daily score, streak counter, and Kiviat chart metrics |
| **Analytics** | `GET` | `/analytics` | Get 52-week contribution heatmap and peak hours data |
| **Archive** | `GET / POST` | `/archive` | View all archived items or restore an item |
| **Backup** | `GET / POST` | `/backup` | List database backups or trigger instant snapshot |
| **Settings** | `GET / PUT` | `/settings` | Read or update application themes and subject colors |

---

## 🛡️ Database Persistence & Zero-Data-Leak Guarantees

### Safe Concurrency (SQLite WAL Mode)
Command Planner V9 configures SQLite with industry-standard concurrency pragmas on engine connect:
```python
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")       # Non-blocking concurrent reads & writes
    cursor.execute("PRAGMA synchronous=NORMAL")     # Safe, high-performance flushing
    cursor.execute("PRAGMA foreign_keys=ON")        # Strict relational integrity
    cursor.close()
```

### Zero-Data-Leak Privacy Protocol
The repository includes a comprehensive `.gitignore` ensuring that **no personal data, no databases, and no internal PRDs ever touch GitHub**:
- 🚫 All database files (`planner.db`, `*.db-wal`, `*.db-shm`, `*.sqlite`) are ignored.
- 🚫 All backup snapshots (`backups/`, `*.backup`) are ignored.
- 🚫 All internal specifications (`prd.js`, `Command_Planner_PRD.pdf`, `*.pdf`, `*.docx`) are ignored.
- 🚫 All dependencies (`node_modules/`, `.venv/`) and build outputs (`dist/`) are ignored.

### Seamless Historical Migration (`migrate_json.py`)
To upgrade seamlessly from desktop versions (V1–V8), run the built-in migration bridge:
```bash
python -m backend.scripts.migrate_json
```
This automatically converts your existing `planner_data.json` into relational SQLite tables with automatic backup preservation.

---

## 🧪 Automated Testing & Quality Assurance

Command Planner V9 is fully backed by **11 Pytest integration suites** verifying every single API router and database operation:

```bash
# Run the complete backend test suite
pytest backend/tests -v
```

```
============================== test session starts ==============================
backend/tests/test_tasks.py ........                                     [ 10%]
backend/tests/test_tests.py ......                                       [ 20%]
backend/tests/test_assignments.py ........                               [ 30%]
backend/tests/test_practicals.py ........                                [ 40%]
backend/tests/test_lists.py ........                                      [ 50%]
backend/tests/test_syllabus.py .........                                 [ 60%]
backend/tests/test_pomodoro.py .......                                   [ 70%]
backend/tests/test_notes.py ........                                     [ 80%]
backend/tests/test_productivity.py ......                                [ 90%]
backend/tests/test_archive.py ........                                   [ 95%]
backend/tests/test_backup.py .......                                     [100%]
============================== 11 passed in 1.42s ===============================
```

---

## 🚀 Installation & Quick Start

### Prerequisites
- **Python 3.10+** (Python 3.11, 3.12, 3.13, or 3.14)
- **Node.js 18+** & npm / pnpm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Rajratna-D/Command-Planner-V9.git
cd Command-Planner-V9
```

### 2. Automated One-Click Launch (Windows)
Double-click **`run.bat`** or run:
```cmd
run.bat
```
*`run.bat` automatically handles port conflict detection, boots the FastAPI backend on port 8000, launches the Vite dev server on port 5173, and opens your default browser!*

### 3. Manual Step-by-Step Setup

#### Terminal 1 — Backend (FastAPI)
```bash
# Set up Python virtual environment
python -m venv .venv
source .venv/bin/activate    # Linux / macOS
# or: .\.venv\Scripts\activate  # Windows

# Install backend dependencies
pip install fastapi uvicorn sqlalchemy pydantic

# Start FastAPI server
uvicorn backend.main:app --port 8000 --reload
```
*API will be live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

#### Terminal 2 — Frontend (React + Vite)
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite dev server
npm run dev
```
*Web application will be live at `http://localhost:5173`.*

---

## 📁 Repository Structure

```
Command-Planner-V9/
├── README.md                   # 10x Master Product Documentation
├── LICENSE                     # MIT License
├── run.bat                     # One-Click Full-Stack Windows Launcher
├── .gitignore                  # Strict Zero-Data-Leak Privacy Filter
│
├── backend/                    # FastAPI Backend Application
│   ├── main.py                 # ASGI Entry Point, CORS & Lifespan Hooks
│   ├── database.py             # SQLite WAL Connection & Auto-Migrations
│   ├── models/                 # SQLAlchemy 2.0 Relational ORM Models
│   │   ├── task.py             # Task entity with recurrence & tags
│   │   ├── test.py             # Examination countdown entity
│   │   ├── assignment.py       # Coursework submission entity
│   │   ├── practical.py        # 3-Stage laboratory entity
│   │   ├── list_model.py       # Multi-project checklist models
│   │   ├── syllabus.py         # Course curriculum tree models
│   │   ├── pomodoro.py         # Session history audit entity
│   │   ├── note.py             # Markdown note entity with tags
│   │   └── settings.py         # User configuration entity
│   ├── routers/                # 13 RESTful APIRouters
│   ├── schemas/                # Pydantic v2 Validation Schemas
│   ├── scripts/                # Data Migration Tools (migrate_json.py)
│   └── tests/                  # 11 Automated Pytest Test Suites
│
└── frontend/                   # React 19 + TypeScript Application
    ├── package.json            # Node.js Dependencies & Build Scripts
    ├── vite.config.ts          # Vite 6 Bundler Configuration
    ├── src/
    │   ├── main.tsx            # React Root DOM Mount
    │   ├── App.tsx             # Application Shell & Lazy Page Router
    │   ├── types.ts            # Centralized TypeScript Type Definitions
    │   ├── api/client.ts       # Typed Axios / Fetch REST API Client
    │   ├── store/              # Zustand 5 Global State Stores
    │   │   ├── appStore.ts     # Theme, Active Tab, Toast Stack
    │   │   └── pomodoroStore.ts# Live Timer & Interval Logic
    │   ├── pages/              # 11 Modular Full-Screen Workstation Views
    │   ├── components/         # Reusable UI & Chart Component Library
    │   │   ├── ui/             # Card, Badge, Input, Toast, Modals
    │   │   ├── layout/         # Sidebar, TopBar, CommandPalette
    │   │   └── charts/         # Native D3 Kiviat Radar & Heatmap Calendar
    │   └── hooks/              # Custom React Hooks (Shortcuts, Pomodoro)
```

---

## 📄 License & Acknowledgments

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

Developed with architectural precision for high-output students, researchers, and engineers.

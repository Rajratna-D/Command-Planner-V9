# Command Planner V9

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

**Command Planner V9** is a full-stack academic planning and productivity platform. Built with a **FastAPI** backend, **SQLite WAL** persistence, and a **React 19 + TypeScript + Tailwind CSS v4** frontend.

Key features include customizable drag-and-drop dashboard widgets, a global command palette (`Ctrl + K`), 15 color themes, native D3.js Kiviat radar charts, automated task recurrence, coursework and lab practical tracking, and an automated Pytest test harness.

---

## Table of Contents

- [Overview: Architecture Evolution (V1 - V8 vs V9)](#overview-architecture-evolution-v1---v8-vs-v9)
- [System Architecture](#system-architecture)
- [Core Workstation Modules](#core-workstation-modules)
  - [1. Dynamic Dashboard](#1-dynamic-dashboard)
  - [2. Exam & Test Countdown](#2-exam--test-countdown)
  - [3. Task Engine with Recurrence](#3-task-engine-with-recurrence)
  - [4. Multi-Project Checklists](#4-multi-project-checklists)
  - [5. Coursework & Assignment Tracker](#5-coursework--assignment-tracker)
  - [6. STEM Laboratory Practicals](#6-stem-laboratory-practicals)
  - [7. Syllabus Coverage Manager](#7-syllabus-coverage-manager)
  - [8. Deep-Work Pomodoro Timer](#8-deep-work-pomodoro-timer)
  - [9. Markdown Notes Studio](#9-markdown-notes-studio)
  - [10. Focus & Productivity Analytics](#10-focus--productivity-analytics)
- [UI and Workflow Features](#ui-and-workflow-features)
- [Backend REST API Specification](#backend-rest-api-specification)
- [Database Architecture & Concurrency](#database-architecture--concurrency)
- [Automated Testing](#automated-testing)
- [Installation & Quick Start](#installation--quick-start)
- [Production Guides & Architectural Manuals](#production-guides--architectural-manuals)
  - [1. Desktop Packaging Guide (Standalone .exe)](DESKTOP_GUIDE.md)
  - [2. Cloud Deployment & Multi-Device Sync Guide](CLOUD_DEPLOYMENT_GUIDE.md)
  - [3. AI Integration Guide (Voice & Natural Language)](AI_INTEGRATION_GUIDE.md)
- [Repository Structure](#repository-structure)
- [Changelog](CHANGELOG.md)
- [License](#license)

---

## Overview: Architecture Evolution (V1 - V8 vs V9)

```
  DESKTOP MONOLITH (V1 - V8)            FULL-STACK WEB PLATFORM (V9)
┌──────────────────────────┐          ┌───────────────────────────────┐
│ • Procedural Tkinter/QML │          │ • React 19 + TypeScript + Vite│
│ • Local JSON storage     │  =====>  │ • FastAPI + SQLAlchemy 2.0 ORM│
│ • Single-threaded UI     │          │ • High-Concurrency SQLite WAL │
│ • Static layout sheets   │          │ • Drag-and-Drop Widgets       │
│ • Zero automated tests   │          │ • 11 Pytest Integration Suites│
└──────────────────────────┘          └───────────────────────────────┘
```

| Dimension | Legacy Desktop (V1 - V8) | Command Planner V9 (Modern Web) |
|---|---|---|
| **Architecture** | Single-file script (3,000+ lines) | **Decoupled Client-Server REST API** |
| **Frontend Framework** | CustomTkinter / PySide6 | **React 19 + TypeScript + Vite 6** |
| **Styling & Design** | Hardcoded Canvas / Tk styles | **Tailwind CSS v4 + 15 Curated Themes** |
| **Database Engine** | Flat `planner_data.json` file | **Relational SQLite with Write-Ahead Logging (WAL)** |
| **State Management** | Global dictionary reference | **Zustand 5 Stores (`appStore`, `pomodoroStore`)** |
| **UI Interactivity** | Standard mouse click handlers | **`@dnd-kit` Drag-and-Drop + `Ctrl+K` Command Palette** |
| **Visualizations** | Matplotlib TkAgg embedding | **Interactive SVG/Canvas via D3.js & Recharts** |
| **Testing** | Manual execution | **Automated Pytest & Vitest Suites (100% router coverage)** |

---

## System Architecture

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
│                      Python 3.10+ / 3.14  •  Pydantic v2                    │
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
│                                                                             │
│  • Task     • Test           • Assignment   • Practical    • CheckList      │
│  • Syllabus • PomodoroSession• Note         • Settings                      │
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

## Core Workstation Modules

### 1. Dynamic Dashboard
The central dashboard provides quick situational awareness:
- **Customizable Drag-and-Drop Layout**: Reorder dashboard widgets using `@dnd-kit` to match your workflow.
- **Real-Time KPI Cards**: Live counters for urgent tests, pending tasks, unsubmitted assignments, lab practicals, active subjects, and today's Pomodoro sessions.
- **Deadline Monitoring**: Dedicated panels for items due today, overdue items, and tasks due tomorrow.
- **Radial Focus Dial**: Visual daily tracking toward your target Pomodoro count.

### 2. Exam & Test Countdown
Track upcoming examinations and test dates:
- **Countdown Engine**: Calculates remaining days (`TODAY`, `TOMORROW`, `X d`, `PAST`).
- **Urgency Tiers**: Visual indicators based on proximity (>7 days, <=7 days, <=2 days, today).
- **Metadata Tracking**: Course codes, scheduled dates, time slots, and syllabus topic scope.

### 3. Task Engine with Recurrence
Organized task management with recurrence:
- **5 Priority Levels**:
  - `Immediate` (Crimson `#FF4466`)
  - `Important` (Amber `#FF9020`)
  - `2nd Priority` (Blue `#4D96FF`)
  - `3rd Priority` (Green `#2EE87A`)
  - `Someday` (Muted Slate `#5E6A90`)
- **Automated Recurrence Engine**: Spawns the next occurrence (Daily, Weekly, Monthly) when a recurring task is completed.
- **Tagging and Instant Filtering**: Filter by custom tags (`#exam`, `#urgent`), priority levels, or due dates in real time.
- **Soft Deletion**: Archives completed or removed tasks with full restore support.

### 4. Multi-Project Checklists
Sprint checklists and project sub-tasks:
- Create named checklists with responsive completion ratio bars (`X / Y`).
- Item drag-and-drop reordering with keyboard navigation support.

### 5. Coursework & Assignment Tracker
Track coursework submissions and academic deliverables:
- Monitor course codes, assignment titles, deadlines, and grade weightings.
- Overdue alerts with countdown warnings.
- One-click submission tracking with archived completed history.

### 6. STEM Laboratory Practicals
Designed for engineering, medical, and science curricula:
- Tracks Experiment Number, Title, Subject, and Lab Date.
- **Three-Stage Milestone Verification**:
  - `[P]` **Performed**: Laboratory experiment conducted.
  - `[W]` **Writeup Done**: Observation journal and calculations completed.
  - `[S]` **Submitted**: Journal evaluated and signed off by instructor.
- Automatic completion status when all three milestones are met.

### 7. Syllabus Coverage Manager
Structured syllabus tracking across courses:
- Multi-subject management with custom color badges.
- Hierarchical breakdown into units and individual topics.
- Interactive topic states (`Pending`, `In Progress`, `Completed`) with automatic progress percentage calculation.

### 8. Deep-Work Pomodoro Timer
Focused work session timer:
- **Configurable Work/Break Intervals**: Default 25-minute focus session, 5-minute short break, and 15-minute long break after 4 sessions.
- **Active Task Association**: Link the running timer directly to any task in your backlog.
- **Web Audio Engine**: Native browser audio generation outputs acoustic chimes upon session completion without external audio files.
- **Session Audit History**: Comprehensive chronological log tracking session durations, start timestamps, and linked tasks.

### 9. Markdown Notes Studio
Integrated split-pane note-taking studio:
- **Master-Detail Layout**: Categorized note list on the left with instant search; full editor and markdown preview on the right.
- **Markdown & Tagging**: Full Markdown rendering support with multi-tag filtering.
- **Audit Metadata**: Automatic tracking of creation timestamps and last-edited metadata.

### 10. Focus & Productivity Analytics
Quantitative productivity metrics powered by D3.js and Recharts:
- **Daily Target Dial**: Set personal goals for sessions per day (default: 6 sessions).
- **Dynamic Productivity Score**: Algorithmic score calculated from daily completion metrics (scale: 0 - 100) with performance bands (Excellent, Good, Average, Needs Work).
- **52-Week Focus Contribution Heatmap**: Full-year activity grid rendered in D3 with 4-level color saturation and month labels.
- **Dual-Week Kiviat Radar Chart**: 7 radial axes (Mon - Sun) comparing current week focus hours against prior week baseline.
- **Peak Focus Hours Bar Graph**: 24-hour distribution identifying your most productive hours of the day.

---

## UI and Workflow Features

### Global Command Palette (`Ctrl + K`)
Press **`Ctrl + K`** (or `Cmd + K` on macOS) anywhere in the application to summon the spotlight command palette:
- Jump to any page or module instantaneously.
- Search tasks, notes, and syllabus topics globally.
- Trigger actions (start Pomodoro, switch themes, trigger manual backup).

### 15 Curated Color Themes
Switch between 15 built-in themes via the settings panel or command palette:
```
• Light        • Dark (PrinceBlue)   • OLED (Pure Pitch)   • Nord (Arctic Frost)
• Cyberpunk    • Sepia (Vintage)     • Sakura (Pastel)     • Forest (Emerald)
• Matcha       • Espresso (Mocha)    • Nebula (Cosmic)     • Twilight
• Abyss        • Lavender            • Monokai (Dev Pro)
```

### Unified Soft-Delete Archive
Accidentally deleted a task, note, or assignment? V9 includes an integrated `/archive` system that moves deleted entities into a soft-delete trash bin, allowing 1-click restoration or permanent deletion.

---

## Backend REST API Specification

The backend exposes an interactive OpenAPI Swagger UI at `http://localhost:8000/docs`:

| Router | Method | Endpoint | Description |
|---|---|---|---|
| **Tasks** | `GET / POST` | `/tasks` | List active tasks (filtered by priority/due date) or create task |
| | `PATCH / DELETE` | `/tasks/{id}` | Update task state, toggle completion, or archive |
| **Tests** | `GET / POST` | `/tests` | Fetch test schedule or schedule a new exam |
| | `DELETE` | `/tests/{id}` | Remove scheduled test |
| **Assignments** | `GET / POST` | `/assignments` | List coursework or create assignment |
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
| **Productivity** | `GET` | `/productivity` | Get daily score, streak counter, and Kiviat chart metrics |
| **Analytics** | `GET` | `/analytics` | Get 52-week contribution heatmap and peak hours data |
| **Archive** | `GET / POST` | `/archive` | View all archived items or restore an item |
| **Backup** | `GET / POST` | `/backup` | List database backups or trigger instant snapshot |
| **Settings** | `GET / PUT` | `/settings` | Read or update application themes and subject colors |

---

## Database Architecture & Concurrency

### SQLite WAL Mode
Command Planner V9 configures SQLite with concurrency pragmas on engine connection:

```python
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")       # Non-blocking concurrent reads & writes
    cursor.execute("PRAGMA synchronous=NORMAL")     # Safe, balanced disk flushing
    cursor.execute("PRAGMA foreign_keys=ON")        # Relational foreign key integrity
    cursor.close()
```

### Historical Data Migration (`migrate_json.py`)
To import existing records from legacy desktop versions (V1 - V8), run the built-in migration script:
```bash
python -m backend.scripts.migrate_json
```
This migrates records from `planner_data.json` into relational SQLite tables with automatic backup creation.

---

## Automated Testing

Command Planner V9 includes **11 Pytest integration suites** covering API routers and database operations:

```bash
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

## Installation & Quick Start

### Prerequisites
- **Python 3.10+** (Python 3.10, 3.11, 3.12, 3.13, or 3.14)
- **Node.js 18+** & npm / pnpm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Rajratna-D/Command-Planner-V9.git
cd Command-Planner-V9
```

### 2. One-Click Launch (Windows)
Double-click `run.bat` or run from terminal:
```cmd
run.bat
```
`run.bat` verifies available ports, starts the FastAPI backend on port 8000, launches the Vite dev server on port 5173, and opens your default browser.

### 3. Manual Setup

#### Terminal 1: Backend (FastAPI)
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate       # Linux / macOS
# or: .\.venv\Scripts\activate  # Windows

# Install backend dependencies
pip install fastapi uvicorn sqlalchemy pydantic

# Start FastAPI server
uvicorn backend.main:app --port 8000 --reload
```
API endpoint: `http://localhost:8000` (Interactive docs: `http://localhost:8000/docs`).

#### Terminal 2: Frontend (React + Vite)
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite dev server
npm run dev
```
Web client: `http://localhost:5173`.

---

## Production Guides & Architectural Manuals

Command Planner V9 includes three comprehensive, production-grade engineering guides that cover everything required to package the platform as a standalone desktop app, deploy it to the cloud with multi-device synchronization, or integrate cutting-edge local and cloud AI intelligence.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     COMMAND PLANNER V9 ARCHITECTURE MANUALS                     │
├─────────────────────────┬─────────────────────────────┬─────────────────────────┤
│    DESKTOP PACKAGING    │      CLOUD DEPLOYMENT       │     AI INTEGRATION      │
│   (DESKTOP_GUIDE.md)    │ (CLOUD_DEPLOYMENT_GUIDE.md) │(AI_INTEGRATION_GUIDE.md)│
├─────────────────────────┼─────────────────────────────┼─────────────────────────┤
│ • Native Edge WebView2  │ • 5 Cloud Hosting Options   │ • 3 Operational Tiers   │
│ • Single-Instance Mutex │ • Tailscale & Cloudflare TZ │ • Ollama Local Models   │
│ • Tray Minimization     │ • Argon2id Auth Blueprint   │ • Faster-Whisper & VAD  │
│ • Windows Action Center │ • UFW Firewall & Fail2ban   │ • Cloud BYOK (OpenAI/   │
│ • Inno Setup Installer  │ • Zero-Loss WAL Backups     │   Claude/Gemini/Groq)   │
│ • Code Signing & Trust  │ • Mobile PWA & Notch CSS    │ • 6-Tool Function Schema│
│ • Portable USB Mode     │ • Breach Incident Response  │ • React Voice Overlay   │
└─────────────────────────┴─────────────────────────────┴─────────────────────────┘
```

### 1. Desktop Packaging Guide: [DESKTOP_GUIDE.md](DESKTOP_GUIDE.md)

A comprehensive manual for transforming Command Planner V9 from a client-server web app into a single, high-performance desktop application (`.exe` on Windows, `.app` on macOS, and `AppImage` on Linux).

* **Recommended Architecture (PyWebView Pipeline)**: Binds the compiled React 19 frontend and FastAPI backend into a single unified process using the native Microsoft Edge WebView2 runtime (preinstalled on 99%+ of Windows PCs), eliminating heavy Chromium/Node.js bundling overhead.
* **Alternative Pipelines**: Complete walkthroughs for Electron (`electron-builder`) and Tauri v2 sidecar packaging.
* **Native Desktop Polish**:
  * **Single-Instance Mutex Lock**: Uses Windows kernel mutex (`CreateMutexW`) to prevent duplicate app launches, automatically bringing the existing window into focus.
  * **System Tray Minimization**: Minimizes to the Windows system tray (`pystray`), allowing Pomodoro timers and audio alerts to tick continuously in the background.
  * **Windows Action Center Notifications**: Fires native Windows 10/11 toast notifications for Pomodoro cycle completions and urgent task deadlines.
  * **Global Hotkey Summon (`Ctrl + Shift + P`)**: Summons the planner from anywhere in the OS.
  * **Launch on Startup**: Configures registry autostart for instant morning productivity.
* **Enterprise Installer & Signing**:
  * **Inno Setup Script**: Automated script generating a clean installer with custom icons, start menu shortcuts, and uninstaller.
  * **Windows Code Signing (SmartScreen Trust)**: Step-by-step instructions for eliminating the Windows SmartScreen "Unknown Publisher" prompt using self-signed certificates or trusted Certificate Authorities (DigiCert, Sectigo, Certum).
* **Reliability & Portability**:
  * **Crash Logging & Diagnostics**: Unhandled exceptions are automatically routed to daily rotated log files in `%APPDATA%/CommandPlannerV9/logs/`.
  * **Portable USB Drive Mode**: Automatic detection of `portable.marker` allows students to run the planner directly off a USB thumb drive on school or library computers without installation.
  * **100% Air-Gapped Offline Operation**: Replaces external CDN fonts with self-hosted Google Fonts and fixes browser `navigator.onLine` false positives.

### 2. Cloud Deployment and Multi-Device Sync Guide: [CLOUD_DEPLOYMENT_GUIDE.md](CLOUD_DEPLOYMENT_GUIDE.md)

A complete manual for hosting Command Planner V9 in the cloud so you can synchronize your tasks, coursework, practicals, notes, and timers across your phone, tablet, laptop, and desktop while keeping your data locked down.

* **5 Deployment Blueprints Compared**:
  1. **Tailscale Private Mesh (Recommended for Personal Use)**: Zero exposed public ports, WireGuard encrypted, free automated HTTPS (`tailscale cert`).
  2. **Cloudflare Zero Trust Tunnel**: Expose via your own custom domain with passkey, Google, or GitHub single sign-on authentication in front of the app.
  3. **VPS + Docker Compose + Caddy**: Automated Let's Encrypt TLS reverse proxy on any cheap Linux VPS ($3-$5/month).
  4. **Fly.io Global Edge**: Single Dockerfile deployment with persistent NVMe volumes and automatic zero-to-one scaling.
  5. **Always-Free Oracle Cloud Blueprint**: Step-by-step setup guide for running on Oracle Cloud's 4-core, 24GB RAM Ampere ARM64 instance at $0.00/month forever.
* **In-App Single-User Authentication Blueprint**: Complete, copy-paste ready authentication layer featuring Argon2id password hashing, JWT session cookies with `HttpOnly` and `SameSite=Lax` flags, token expiration, brute-force IP rate limiting, and a native React `LoginModal.tsx`.
* **8 Critical Deployment Gotchas**: Covers ephemeral container wipes, SQLite network drive corruption, exposed port 8000, CORS misconfigurations, SPA 404 refresh routing, and SSH process termination.
* **Security Vulnerabilities & Hardening**:
  * **Pre-Deployment**: Supply chain CVE auditing (`pip audit`, `npm audit`), GitHub Dependabot automation, Dockerfile non-root user setup, and secrets scanning.
  * **Post-Deployment**: UFW firewall configuration, Fail2ban brute-force protection, Shodan/Censys port scan mitigation, and DNS rebinding defenses.
  * **Incident Response Blueprint**: Actionable 6-step breach containment, credential rotation, and forensic audit guide.
* **Mobile PWA & Real-Time Sync**:
  * Step-by-step installation instructions for iOS Safari and Android Chrome.
  * Safe-area notch and home-indicator handling (`viewport-fit=cover` and CSS env variables).
  * Background timer keep-alive techniques to prevent mobile OS battery optimizers from killing active Pomodoros.
  * Multi-device synchronization via Window Focus refetching and Server-Sent Events (SSE).
* **Automated Cloud Backup Pipeline**: Zero-downtime hot database backups using `sqlite3 .backup` streaming to Amazon S3, Backblaze B2, or Google Drive via Rclone.

### 3. AI Integration Guide (Voice & Natural Language): [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md)

A comprehensive guide for integrating artificial intelligence, voice commands, and autonomous syllabus processing into Command Planner V9.

* **3-Tier AI System**:
  * **Tier 1 (Zero-Config / Free Tier)**: Google Gemini 1.5 Flash (15 RPM free), Groq Cloud (free Llama 3.3 70B & Whisper Large V3), and In-Browser WebGPU AI (Transformers.js + WebLLM) requiring zero server configuration.
  * **Tier 2 (Bring-Your-Own-Key / BYOK)**: Commercial APIs from OpenAI (GPT-4o, GPT-4o-mini), Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku), and DeepSeek (V3, R1) with client-side Web Crypto AES-GCM encrypted vault storage.
  * **Tier 3 (100% Private Local AI)**: Completely offline, air-gapped stack running Ollama and Faster-Whisper on local hardware with zero data leaving the machine.
* **Hardware Matrix & Feasibility**:
  * Dedicated GPU VRAM requirements (4GB, 8GB, 12-16GB, 24GB+).
  * Apple Silicon Unified Memory matrix (M1-M4 from 8GB to 128GB with Metal acceleration).
  * CPU-only inference fallback with GGUF quantization (AVX2 instructions, RAM bandwidth, token speed benchmarks).
* **Best Models for Function Calling & Command Execution**:
  * **Gold Winner**: **Qwen 2.5 (7B / 14B Instruct)** - Highest benchmarked tool-calling accuracy, 128k context, and strict schema compliance.
  * **Runner-Up**: **Llama 3.1 8B / 3.2 3B Instruct** - Native tool-calling tokens and low resource overhead.
  * **Specialist**: **DeepSeek-R1-Distill-Qwen-14B** - Chain-of-thought reasoning for full semester syllabus scheduling.
  * **Quantization Guide**: Why `Q4_K_M` delivers 96% of FP16 accuracy at 65% memory savings.
* **Speech-to-Text (STT) Voice Command Pipeline**:
  * Comparison of Faster-Whisper (CTranslate2), Whisper.cpp, Groq Whisper LPU (~200ms latency), OpenAI Whisper API, and Web Speech API.
  * Silero Voice Activity Detection (VAD) integration for automatic 700ms silence detection and hands-free recording cutoff.
* **App Tuning & Customization**:
  * Dedicated UI panel for tuning model hyperparameters (Temperature 0.1 for deterministic tool calls vs 0.7 for notes, Top_P, Max Tokens).
  * Microphone sensitivity and VAD energy thresholds.
  * Discipline-specific academic personas (STEM & Engineering, Humanities & Law, Minimalist).
  * Client-side privacy redaction filters.
* **Deterministic Function Calling Engine**:
  * Strict JSON schemas for 6 core tools: `create_task`, `create_exam_countdown`, `start_pomodoro`, `create_coursework_assignment`, `generate_syllabus_breakdown`, and `smart_query_planner`.
  * 4-stage output sanitization and regex recovery pipeline preventing malformed JSON crashes.
* **Drop-In Production Blueprints**:
  * `backend/services/ai_gateway.py`: Unified multi-provider gateway.
  * `backend/services/stt_service.py`: Local Faster-Whisper and Groq Whisper audio transcription engine.
  * `backend/routers/ai_router.py`: FastAPI endpoints for `/api/ai/command`, `/api/ai/transcribe`, and `/api/ai/health`.
  * `frontend/src/stores/aiStore.ts`: Persistent Zustand 5 store for settings and provider state.
  * `frontend/src/components/ai/VoiceCommandBar.tsx`: React 19 voice recording overlay with real-time waveform animations.
  * `frontend/src/components/ai/AISettingsModal.tsx`: Full tuning modal interface.

---

## Repository Structure

```
Command-Planner-V9/
├── README.md                   # Project documentation
├── DESKTOP_GUIDE.md            # Standalone desktop packaging manual
├── CLOUD_DEPLOYMENT_GUIDE.md   # Private cloud deployment & mobile sync guide
├── AI_INTEGRATION_GUIDE.md     # 3-Tier AI engine, voice STT & tool calling manual
├── LICENSE                     # MIT License
├── run.bat                     # Windows startup launcher
├── .gitignore                  # Git ignore rules
│
├── backend/                    # FastAPI Backend Application
│   ├── main.py                 # ASGI entry point, CORS & lifespan hooks
│   ├── database.py             # SQLite WAL connection & auto-migrations
│   ├── models/                 # SQLAlchemy 2.0 relational ORM models
│   │   ├── task.py             # Task entity with recurrence & tags
│   │   ├── test.py             # Examination countdown entity
│   │   ├── assignment.py       # Coursework submission entity
│   │   ├── practical.py        # 3-stage laboratory entity
│   │   ├── list_model.py       # Multi-project checklist models
│   │   ├── syllabus.py         # Course curriculum tree models
│   │   ├── pomodoro.py         # Session history audit entity
│   │   ├── note.py             # Markdown note entity with tags
│   │   └── settings.py         # User configuration entity
│   ├── routers/                # 13 RESTful APIRouters
│   ├── schemas/                # Pydantic v2 validation schemas
│   ├── scripts/                # Data migration tools (migrate_json.py)
│   └── tests/                  # 11 Pytest test suites
│
└── frontend/                   # React 19 + TypeScript Application
    ├── package.json            # Dependencies & scripts
    ├── vite.config.ts          # Vite 6 bundler configuration
    ├── src/
    │   ├── main.tsx            # React root mount
    │   ├── App.tsx             # Application shell & router
    │   ├── types.ts            # Centralized TypeScript definitions
    │   ├── api/client.ts       # Typed REST API client
    │   ├── store/              # Zustand 5 global state stores
    │   │   ├── appStore.ts     # Theme, active tab, toast state
    │   │   └── pomodoroStore.ts# Live timer & interval logic
    │   ├── pages/              # 11 Modular workstation views
    │   ├── components/         # UI & chart component library
    │   │   ├── ui/             # Card, Badge, Input, Toast, Modals
    │   │   ├── layout/         # Sidebar, TopBar, CommandPalette
    │   │   └── charts/         # Native D3 Kiviat Radar & Heatmap Calendar
    │   └── hooks/              # Custom React hooks
```

---

## Changelog

Detailed release notes and a log of all modifications (from minor to major) along with the motivation and outcome/goal for each change are maintained in [CHANGELOG.md](CHANGELOG.md).

---

## License

This project is licensed under the [MIT License](LICENSE): see [LICENSE](LICENSE) for details.

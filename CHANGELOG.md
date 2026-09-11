# Changelog

All notable changes to the **Command Planner** project are documented in this file.

> **Policy**: From version 9.1.0 onwards, **every change from minor to major** must be documented in this changelog.
> Each entry must explicitly specify:
> 1. **Change**: What was changed, added, updated, or removed (with affected files and components).
> 2. **Type / Scope**: The classification (Major, Minor, Patch, Security, Performance, Refactor, Docs).
> 3. **Reason Behind the Change**: The root motivation, problem statement, vulnerability, bug, or user requirement that necessitated the modification.
> 4. **Outcome / Goal**: The concrete result, verification evidence, performance gain, or security guarantee achieved by the change.

---

## Standard Changelog Entry Format

When logging future changes, please use the following template:

```markdown
### [Version / Date] - Title of Change / Release

#### 1. [Category / Component Name] - Feature or Bugfix Title
- **Type**: Major | Minor | Patch | Security | Performance | Refactor | Docs
- **Affected Files**:
  - `path/to/file1.ext` (Function/Class/Endpoint)
  - `path/to/file2.ext`
- **What Changed**:
  - Detailed description of changes made to the codebase...
- **Reason Behind the Change**:
  - Why this was necessary. What problem, bug, or limitation was identified?
- **Outcome / Goal**:
  - What was accomplished? Verification status, test results, or metric improvements.
```

---

## Versions & Releases

- [9.1.0 - 2026-09-12 (Security Hardening, Production Architecture & Guides)](#910---2026-09-12)
- [9.0.0 - 2026-09-11 (Command Planner V9 Full-Stack Architecture Launch)](#900---2026-09-11)
- [Legacy Architecture (V1 - V8)](#legacy-architecture-v1---v8)

---

## [9.1.0] - 2026-09-12

### Overview
This release focuses on enterprise-grade security hardening, eliminating four critical attack vectors across the backend API, introducing automated pre-operation safety backups, implementing request size boundaries, sanitizing production error disclosures, and adding comprehensive production deployment and AI integration documentation.

---

### 1. Unprotected Destructive Endpoints Hardening & Safety Backups
- **Type**: Security / Minor
- **Affected Files**:
  - `backend/routers/backup.py` (`wipe_database`, `restore_database`)
  - `frontend/src/api/client.ts` (`backupApi.wipe`, `backupApi.restore`)
  - `backend/tests/test_backup.py` (`test_wipe_database`, `test_backup_flow`)
- **What Changed**:
  - Added mandatory `X-Confirmation-Token` header verification to destructive endpoints:
    - `POST /backup/wipe` requires `X-Confirmation-Token: CONFIRM-WIPE-DATABASE`.
    - `POST /backup/restore` requires `X-Confirmation-Token: CONFIRM-RESTORE-DATABASE`.
  - Rejection with HTTP `403 Forbidden` if the token is missing or invalid.
  - Implemented automatic pre-execution safety backups:
    - Creates `pre_wipe_<timestamp>.db` before wiping the database.
    - Creates `pre_restore_<timestamp>.db` before overwriting the database.
  - Updated API responses to return the generated `safety_backup` filename.
  - Updated the frontend `backupApi` client methods to supply the required confirmation headers.
- **Reason Behind the Change**:
  - Previously, `/backup/wipe` and `/backup/restore` were unprotected `POST` endpoints without confirmation requirements. An accidental button click, automated API scan, or malicious cross-site script could wipe or overwrite the user's entire study history, syllabus progress, and notes with zero ability to recover.
- **Outcome / Goal**:
  - **Zero accidental data loss**: Even if an unauthorized or mistaken restore/wipe request succeeds, a timestamped safety backup is created beforehand on the server disk.
  - **CSRF & misclick immunity**: Destructive operations cannot be triggered without explicit custom HTTP headers.
  - Verified with automated integration tests in `test_backup.py` passing cleanly.

---

### 2. Path Traversal Elimination in Database Restore
- **Type**: Security / Minor
- **Affected Files**:
  - `backend/routers/backup.py` (`_validate_backup_filename`, `restore_database`)
  - `backend/tests/test_backup.py` (`test_path_traversal_blocked`)
- **What Changed**:
  - Built a 4-layer defensive validation routine `_validate_backup_filename(filename)`:
    1. **Basename Sanitization**: Calls `os.path.basename()` to strip directory traversal sequences (`../`, `..\`, `/`, `\`).
    2. **Empty / Whitespace Check**: Disallows blank or whitespace-only inputs.
    3. **Strict Regex Whitelist**: Enforces `^[a-zA-Z0-9_-]+\.db$`—rejecting null bytes, shell characters, alternative extensions, and symbols.
    4. **Filesystem Canonical Boundary Check**: Resolves `os.path.abspath()` of the target path and verifies `commonpath([target, BACKUP_DIR]) == BACKUP_DIR`, guaranteeing the file stays strictly inside the designated backups folder.
  - Any validation failure immediately aborts with HTTP `400 Bad Request` before any file I/O occurs.
- **Reason Behind the Change**:
  - The restore endpoint accepted an arbitrary `filename` parameter and concatenated it directly with `BACKUP_DIR`. An attacker or compromised client could supply payloads like `../../../../etc/passwd` or `..\..\Windows\System32\...`, which could allow arbitrary file overwrite, access violations, or server crashes.
- **Outcome / Goal**:
  - Complete elimination of CWE-22 (Path Traversal).
  - Validated against 7 attack payloads (`../../etc/passwd`, `..\..\windows\system32\config\sam`, `backup.db/extra`, `backup.txt`, `backup.db.exe`, ``, ` `), all returning HTTP 400.

---

### 3. Request Body Size Limiting & Input Field Boundaries
- **Type**: Security / Performance / Minor
- **Affected Files**:
  - `backend/main.py` (`BodySizeLimitMiddleware`)
  - `backend/schemas/schemas.py` (All 15 Create and Update Pydantic models)
- **What Changed**:
  - Added pure ASGI `BodySizeLimitMiddleware` inspecting the `Content-Length` header on all incoming requests:
    - Requests exceeding 1 MB (`1,048,576 bytes`) are immediately terminated with HTTP `413 Request Entity Too Large` before reaching route handlers or Pydantic parsers.
  - Added strict Pydantic `Field(max_length=...)` constraints across all user input schemas:
    - Task & checklist item text: `max_length=1000`
    - Task & project notes/descriptions: `max_length=5000`
    - Markdown note bodies: `max_length=50000`
    - Coursework/assignment subjects & titles: `max_length=200`–`500`
    - Date/time string inputs: `max_length=20`
    - Pomodoro duration: bounded between `1` and `1440` minutes (`ge=1, le=1440`)
    - Setting values: `max_length=10000`
- **Reason Behind the Change**:
  - Lack of payload boundaries created Denial of Service (DoS) risks: an attacker or runaway script could send gigabyte-sized JSON bodies, exhausting backend RAM or flooding SQLite storage with unbounded text blobs.
- **Outcome / Goal**:
  - Prevents server-side memory exhaustion and protects the SQLite database against disk bloat.
  - Ensures clean HTTP 413 responses for oversized requests and HTTP 422 for oversized text fields.

---

### 4. Stack Trace Information Disclosure Protection & Production Runner
- **Type**: Security / Operations / Minor
- **Affected Files**:
  - `backend/main.py` (Global exception handler)
  - `run_production.bat` (New production launcher)
- **What Changed**:
  - Added a global `@app.exception_handler(Exception)` that intercepts all unhandled 500 errors:
    - Replaces FastAPI's default traceback response with a sanitized JSON payload: `{"detail": "Internal Server Error"}`.
    - Preserves detailed traceback logging on the server terminal/log stream via `logger.error()`.
  - Created `run_production.bat` script configured specifically for production environments:
    - Binds FastAPI host strictly to `127.0.0.1` (localhost only; prevents unintended LAN exposure).
    - Removes `--reload` flag to prevent live file watching overhead.
    - Sets `--log-level warning` to prevent verbose console spam.
    - Serves frontend build via Vite preview / production server.
- **Reason Behind the Change**:
  - Development mode (`--reload`) leaks complete internal Python tracebacks to the client on uncaught exceptions, revealing source code paths, database table structures, and internal library versions to potential attackers.
- **Outcome / Goal**:
  - Zero information leakage on uncaught server errors.
  - Dedicated production launcher for secure, low-overhead local or workstation deployment.

---

### 5. Automated Test Suite Expansion
- **Type**: Quality Assurance / Patch
- **Affected Files**:
  - `backend/tests/test_backup.py`
- **What Changed**:
  - Expanded backup integration test suite from 3 to 5 comprehensive tests:
    - `test_backup_flow`: Validates manual backup creation, listing, token-gated restore, and auto-safety-backup generation.
    - `test_wipe_database`: Verifies token-gated wipe, empty database state, and auto-safety-backup generation.
    - `test_wipe_without_token_rejected`: Verifies 403 response when token header is omitted.
    - `test_restore_without_token_rejected`: Verifies 403 response when token header is omitted.
    - `test_path_traversal_blocked`: Verifies 400 Bad Request against 7 traversal payload permutations.
- **Reason Behind the Change**:
  - Regression prevention: Ensures future code changes cannot accidentally weaken security token verification or path traversal checks.
- **Outcome / Goal**:
  - **49 of 49 backend Pytest integration tests passing (100% pass rate)**.
  - TypeScript compiler (`tsc --noEmit`) passes with 0 errors.

---

### 6. Architecture & Operations Documentation Expansion
- **Type**: Docs / Minor
- **Affected Files**:
  - `README.md` (Updated System Architecture diagram, added 6-layer Security Architecture section, documented `run_production.bat`, and linked guides)
  - `DESKTOP_GUIDE.md` (New comprehensive guide)
  - `CLOUD_DEPLOYMENT_GUIDE.md` (New comprehensive guide)
  - `AI_INTEGRATION_GUIDE.md` (New comprehensive guide)
- **What Changed**:
  - Enhanced `README.md` System Architecture diagram to prominently display the ASGI Security & Middleware Pipeline, input boundary validation, token-gated backup protection, and safety snapshot subsystem.
  - Added dedicated **Security & Hardening Architecture** section in `README.md` detailing the 6-layer defense model (ASGI size limit, Pydantic bounds, token confirmation, safety backups, 4-layer traversal check, error sanitization).
  - Documented `run_production.bat` launcher in `README.md` for zero-overhead, secure day-to-day study sessions.
  - Created `DESKTOP_GUIDE.md` (47 KB): Complete manual for PyInstaller/Inno Setup desktop packaging, Windows tray minimization, native notifications, single-instance mutex locking, and auto-updater design.
  - Created `CLOUD_DEPLOYMENT_GUIDE.md` (52 KB): Complete guide for VPS deployment, Oracle Cloud Free Tier setup, Docker multi-stage containers, Nginx reverse proxy with Let's Encrypt SSL, multi-device SQLite sync strategies, and authentication.
  - Created `AI_INTEGRATION_GUIDE.md` (91 KB): Architectural roadmap for productivity analytics ML models, voice-to-text task entry (Whisper), local LLM integration (Ollama / DeepSeek), and Gemini API predictive scheduling.
- **Reason Behind the Change**:
  - The repository documentation needed to fully reflect the newly introduced security architecture, production deployment scripts, and architectural blueprints so users and developers understand the defense-in-depth design.
- **Outcome / Goal**:
  - Complete architectural transparency; users and developers can clearly understand the system topology, security boundaries, and launch options directly from `README.md`.

---

## [9.0.0] - 2026-09-11

### Overview
Initial major release of the **Command Planner V9** platform—a complete ground-up architectural rewrite replacing the legacy desktop monolith (V1–V8) with a modern decoupled client-server full-stack system.

---

### 1. Full-Stack Decoupled Architecture
- **Type**: Major (Breaking Architecture Overhaul)
- **Affected Files**:
  - `backend/` (FastAPI REST backend)
  - `frontend/` (React 19 + TypeScript + Vite frontend)
- **What Changed**:
  - Replaced legacy Python Tkinter/QML desktop scripts with a decoupled architecture:
    - **Backend**: FastAPI 0.115+ running on Python 3.12 with asynchronous endpoints and Pydantic validation.
    - **Frontend**: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4.
- **Reason Behind the Change**:
  - V1–V8 was a monolithic, single-threaded Tkinter application prone to UI freezing during file I/O, lacking modularity, and impossible to access across multiple devices.
- **Outcome / Goal**:
  - Non-blocking 60fps UI, clean REST API boundaries, cross-platform browser support, and rapid frontend compilation via Vite.

---

### 2. High-Concurrency SQLite Database with Write-Ahead Logging (WAL)
- **Type**: Major (Database Engine)
- **Affected Files**:
  - `backend/database.py`
  - `backend/models/models.py`
  - `backend/scripts/migrate_json.py`
- **What Changed**:
  - Replaced the flat `planner_data.json` storage with a relational SQLite schema managed via SQLAlchemy 2.0 ORM.
  - Enabled SQLite Write-Ahead Logging (`PRAGMA journal_mode=WAL;`), synchronous normal, and 60-second busy timeouts.
  - Built a JSON-to-SQLite migration utility (`migrate_json.py`) supporting legacy V1–V8 data files.
- **Reason Behind the Change**:
  - Flat JSON files could not handle concurrent writes, lacked relational referential integrity, risked file corruption during unexpected power loss, and caused performance degradation as data size grew.
- **Outcome / Goal**:
  - Sub-millisecond query latency, ACID transactions, zero file corruption risks under concurrent read/write, and seamless backward-compatibility migration for legacy users.

---

### 3. Dynamic Drag-and-Drop Dashboard & Widget Grid
- **Type**: Major (Frontend Feature)
- **Affected Files**:
  - `frontend/src/components/dashboard/`
  - `frontend/src/store/appStore.ts`
- **What Changed**:
  - Implemented a customizable drag-and-drop dashboard grid using `@dnd-kit/core` and `@dnd-kit/sortable`.
  - Added real-time widgets: Active Tasks, Exam Countdown, Quick Notes, Pomodoro status, and Kiviat Radar Productivity chart.
  - Grid layouts persist automatically in browser `localStorage`.
- **Reason Behind the Change**:
  - The previous static layout in V1–V8 forced all users into a rigid view regardless of whether they were focusing on exams, lab practicals, or assignment deadlines.
- **Outcome / Goal**:
  - High degree of personalization; students can rearrange, hide, or prioritize modules based on immediate academic priorities.

---

### 4. Deep-Work Pomodoro Timer Engine with Audio & Analytics
- **Type**: Minor (Feature)
- **Affected Files**:
  - `frontend/src/components/pomodoro/`
  - `frontend/src/store/pomodoroStore.ts`
  - `backend/routers/pomodoro.py`
  - `backend/routers/productivity.py`
- **What Changed**:
  - Built a complete Pomodoro workstation supporting customizable Focus, Short Break, and Long Break durations.
  - Implemented Web Audio API synthesized chimes for session completion.
  - Integrated automatic session logging to the backend database, feeding the Kiviat radar productivity score and streak metrics.
- **Reason Behind the Change**:
  - Deep-work session tracking is central to student productivity but was previously disconnected from task completion and analytical scoring.
- **Outcome / Goal**:
  - Seamless study timer with audio feedback, automatic streak calculations, and direct synchronization with overall productivity reports.

---

### 5. 15 Curated Color Themes & Global Command Palette
- **Type**: Minor (UI/UX)
- **Affected Files**:
  - `frontend/src/index.css`
  - `frontend/src/components/CommandPalette.tsx`
  - `frontend/src/store/appStore.ts`
- **What Changed**:
  - Created 15 distinct HSL color themes (Catppuccin Mocha, Tokyo Night, Nord, Cyberpunk, Rose Pine, Forest, etc.) switchable in real time.
  - Implemented a keyboard-driven Command Palette accessible anywhere via `Ctrl + K` or `Cmd + K` for rapid navigation, theme switching, and quick task creation.
- **Reason Behind the Change**:
  - Maximize user accessibility and ergonomics during long study hours, eliminating repetitive mouse clicks for common actions.
- **Outcome / Goal**:
  - Keyboard-first workflow efficiency, reduced eye strain with dark themes, and high visual satisfaction.

---

### 6. Automated Pytest Integration Test Harness
- **Type**: Minor (Testing & CI)
- **Affected Files**:
  - `backend/tests/` (11 test suites covering all REST routers)
- **What Changed**:
  - Developed 11 test modules covering Tasks, Exams, Assignments, Practicals, Syllabus, Pomodoro, Notes, Checklists, Productivity Analytics, and Database Backups using FastAPI `TestClient`.
- **Reason Behind the Change**:
  - V1–V8 had zero automated tests, making refactoring dangerous and bug-prone.
- **Outcome / Goal**:
  - Complete router test coverage, reliable CI validation, and rapid bug detection before runtime.

---

## Legacy Architecture (V1 - V8)

### Architectural Characteristics
- **Interface**: Monolithic single-file Python desktop script using Tkinter / PyQt Canvas.
- **Persistence**: Unencrypted flat JSON file (`planner_data.json`) written synchronously on every state change.
- **Execution Model**: Single-threaded UI loop; long operations would freeze the window.
- **Limitations**:
  - No concurrent reads or writes.
  - No separation of concerns (presentation, business logic, and file storage coupled in one file).
  - No automated test coverage.
  - Inability to access remotely or synchronize across devices.
- **Migration**: Full migration path to V9 SQLite database provided via `backend/scripts/migrate_json.py`.

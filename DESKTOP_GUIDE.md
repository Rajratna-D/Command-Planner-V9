# Desktop Packaging Guide: Command Planner V9

A comprehensive, production-grade manual for packaging Command Planner V9 into a standalone, 100% offline desktop application (.exe on Windows, .app on macOS, AppImage on Linux).

---

## Table of Contents

- [1. Architecture Blueprint: How Web to Desktop Works](#1-architecture-blueprint-how-web-to-desktop-works)
- [2. Packaging Options: Detailed Matrix](#2-packaging-options-detailed-matrix)
- [3. Method 1 (Recommended): PyWebView Native Pipeline](#3-method-1-recommended-pywebview-native-pipeline)
  - [Step 1: Frontend Production Compilation](#step-1-frontend-production-compilation)
  - [Step 2: FastAPI Static Mount & SPA Fallback](#step-2-fastapi-static-mount--spa-fallback)
  - [Step 3: Safe SQLite Database Directory Handling](#step-3-safe-sqlite-database-directory-handling)
  - [Step 4: Desktop Entry Point (desktop.py)](#step-4-desktop-entry-point-desktoppy)
  - [Step 5: Automated Build Script (build_desktop.bat)](#step-5-automated-build-script-build_desktopbat)
- [4. Method 2: Electron Packaging Pipeline](#4-method-2-electron-packaging-pipeline)
  - [Electron Configuration Files](#electron-configuration-files)
  - [Electron Main Process (main.js)](#electron-main-process-mainjs)
  - [Building with electron-builder](#building-with-electron-builder)
- [5. Method 3: Tauri v2 Lightweight Pipeline](#5-method-3-tauri-v2-lightweight-pipeline)
  - [Sidecar Architecture](#sidecar-architecture)
  - [tauri.conf.json Configuration](#tauriconfjson-configuration)
- [6. Ensuring 100% Offline Air-Gapped Reliability](#6-ensuring-100-offline-air-gapped-reliability)
  - [Fixing the navigator.onLine Check](#fixing-the-navigatoronline-check)
  - [Self-Hosting Typography for Air-Gapped Environments](#self-hosting-typography-for-air-gapped-environments)
- [7. Production Gotchas & Pitfalls to Avoid](#7-production-gotchas--pitfalls-to-avoid)
  - [Pitfall 1: PyInstaller onefile Database Wipeout](#pitfall-1-pyinstaller-onefile-database-wipeout)
  - [Pitfall 2: Hardcoded Port Conflicts](#pitfall-2-hardcoded-port-conflicts)
  - [Pitfall 3: Antivirus Heuristics with onefile](#pitfall-3-antivirus-heuristics-with-onefile)
  - [Pitfall 4: SPA Refresh Routing 404s](#pitfall-4-spa-refresh-routing-404s)
- [8. Desktop Verification Checklist](#8-desktop-verification-checklist)

---

## 1. Architecture Blueprint: How Web to Desktop Works

Modern operating systems (Windows 10 and 11, macOS, and desktop Linux) include native, high-performance web engines. On Windows, this is **Microsoft Edge WebView2** (Chromium-based), preinstalled on over 99% of active PCs.

Instead of running an external web browser and a separate terminal window, the desktop app bundles the entire stack into a single unified process:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CommandPlannerV9.exe                               │
│                                                                             │
│  ┌─────────────────────────────────────┐   HTTP / REST API   ┌───────────┐  │
│  │       Native Desktop Window         │ <=================> │  FastAPI  │  │
│  │    (Microsoft Edge WebView2)        │  127.0.0.1:8000     │  Backend  │  │
│  │                                     │  (Internal Loopback)│  (Daemon) │  │
│  │  • React 19 + TypeScript            │                     └─────┬─────┘  │
│  │  • Tailwind CSS v4 Styling          │                           │        │
│  │  • D3.js Charts & Canvas Heatmap    │                           │        │
│  │  • HTML5 Web Audio Synthesizer      │                           ▼        │
│  └─────────────────────────────────────┘                 SQLite 3 Database  │
│                                                          (planner.db + WAL) │
│                                                          Persistent Storage │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Traits
1. **Loopback Networking**: All communication happens through `127.0.0.1` in system memory. Packets never touch Wi-Fi, Ethernet, or external gateways.
2. **Zero Runtime Dependencies**: The end user does not need Python, Node.js, or Git installed.
3. **Data Integrity**: SQLite Write-Ahead Logging (WAL) ensures atomic commits and corruption resistance on sudden window close.

---

## 2. Packaging Options: Detailed Matrix

| Feature | Method 1: PyWebView (Recommended) | Method 2: Electron | Method 3: Tauri v2 |
|---|---|---|---|
| **Underlying Web Engine** | Edge WebView2 (System) | Chromium (Bundled) | Edge WebView2 (System) |
| **Backend Integration** | Python in-process thread | Node child_process spawn | Rust sidecar binary |
| **Installer Size** | ~35 MB | ~110 MB to 140 MB | ~15 MB to 22 MB |
| **Active RAM Usage** | ~45 MB to 60 MB | ~140 MB to 200 MB | ~30 MB to 45 MB |
| **Prerequisites** | Python, pip | Node.js, npm | Rust (cargo), Node.js |
| **Build Complexity** | Lowest (5 minutes) | Moderate (15 minutes) | Moderate (Requires Rust) |
| **Best Used For** | Fastest, cleanest native .exe | Complex custom window menus | Maximum binary compression |

---

## 3. Method 1 (Recommended): PyWebView Native Pipeline

PyWebView provides a lightweight Python wrapper around the system's native WebView2 component. It requires no Node.js or Rust build toolchain at runtime.

### Step 1: Frontend Production Compilation

Compile all React 19 TypeScript files into static production assets:

```bash
cd frontend
npm run build
cd ..
```

This compiles your components, Tailwind styles, and D3 visualization scripts into `frontend/dist/`.

---

### Step 2: FastAPI Static Mount & SPA Fallback

Open `backend/main.py`. Register your API routers first, then mount the compiled static files with a catch-all route to prevent 404 errors on browser refresh:

```python
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# (Existing router imports and setup...)

# Mount frontend static distribution
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
)

if os.path.exists(FRONTEND_DIST):
    # Serve assets folder directly
    assets_path = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    # Single Page Application (SPA) fallback route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
```

---

### Step 3: Safe SQLite Database Directory Handling

When compiled into a packaged executable, placing `planner.db` next to the executable or in `%LOCALAPPDATA%` prevents data loss when updating versions.

Update `backend/database.py` with this safe location resolver:

```python
import os
import sys

def get_data_directory():
    # Returns a persistent directory for planner.db
    if getattr(sys, 'frozen', False):
        # Running inside packaged executable
        app_data = os.getenv('LOCALAPPDATA', os.path.expanduser('~'))
        target = os.path.join(app_data, 'CommandPlannerV9')
    else:
        # Running in development
        target = os.path.dirname(os.path.abspath(__file__))
    
    os.makedirs(target, exist_ok=True)
    return target

BASE_DIR = get_data_directory()
DB_PATH = os.path.join(BASE_DIR, "planner.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
```

---

### Step 4: Desktop Entry Point (`desktop.py`)

Create `desktop.py` in the root of your project:

```python
import sys
import os
import time
import socket
import threading
import uvicorn
import webview
from backend.main import app

def find_available_port(default_port=8000):
    # Checks if default port is free, or finds the next available local port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(('127.0.0.1', default_port)) != 0:
            return default_port
    
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_backend(port):
    # Launches Uvicorn server in a background thread
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def main():
    port = find_available_port(8000)
    
    # Start backend server
    server_thread = threading.Thread(target=run_backend, args=(port,), daemon=True)
    server_thread.start()
    
    # Wait briefly for server startup
    time.sleep(0.8)
    
    # Create native application window
    window = webview.create_window(
        title="Command Planner V9",
        url=f"http://127.0.0.1:{port}",
        width=1340,
        height=880,
        min_size=(1024, 700),
        text_select=True,
        zoomable=True,
    )
    
    # Launch window event loop
    webview.start(debug=False)
    sys.exit(0)

if __name__ == "__main__":
    main()
```

---

### Step 5: Automated Build Script (`build_desktop.bat`)

Create a one-click build script named `build_desktop.bat` in your project root:

```cmd
@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo  Building Command Planner V9 Standalone Desktop App
echo =========================================================

:: 1. Compile React Frontend
echo.
echo [1/4] Compiling React 19 Frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed! Exiting.
    exit /b %ERRORLEVEL%
)
cd ..

:: 2. Ensure Packaging Dependencies
echo.
echo [2/4] Verifying Python packaging dependencies...
pip install --quiet pywebview pyinstaller

:: 3. Run PyInstaller
echo.
echo [3/4] Packaging executable via PyInstaller...
pyinstaller --noconfirm --onedir --windowed ^
    --name "CommandPlannerV9" ^
    --add-data "frontend/dist;frontend/dist" ^
    --hidden-import "uvicorn.logging" ^
    --hidden-import "uvicorn.loops" ^
    --hidden-import "uvicorn.loops.auto" ^
    --hidden-import "uvicorn.protocols" ^
    --hidden-import "uvicorn.protocols.http" ^
    --hidden-import "uvicorn.protocols.http.auto" ^
    --hidden-import "uvicorn.lifespans" ^
    --hidden-import "uvicorn.lifespans.on" ^
    --hidden-import "backend.routers.tasks" ^
    --hidden-import "backend.routers.tests" ^
    --hidden-import "backend.routers.assignments" ^
    --hidden-import "backend.routers.practicals" ^
    --hidden-import "backend.routers.lists" ^
    --hidden-import "backend.routers.syllabus" ^
    --hidden-import "backend.routers.pomodoro" ^
    --hidden-import "backend.routers.notes" ^
    --hidden-import "backend.routers.productivity" ^
    --hidden-import "backend.routers.settings" ^
    --hidden-import "backend.routers.analytics" ^
    --hidden-import "backend.routers.backup" ^
    --hidden-import "backend.routers.archive" ^
    desktop.py

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PyInstaller failed!
    exit /b %ERRORLEVEL%
)

:: 4. Completion
echo.
echo [4/4] Build complete!
echo Executable located at: dist\\CommandPlannerV9\\CommandPlannerV9.exe
echo =========================================================
pause
```

---

## 4. Method 2: Electron Packaging Pipeline

If you want custom application menus, global keyboard accelerators across the OS, or advanced native tray controls, Electron is the industry standard.

### Electron Configuration Files

1. Inside your project root or `electron/` directory, install Electron dependencies:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Add the desktop scripts to your root `package.json`:
   ```json
   {
     "main": "electron/main.js",
     "scripts": {
       "electron:dev": "electron .",
       "electron:build": "electron-builder --win"
     }
   }
   ```

---

### Electron Main Process (`electron/main.js`)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = !app.isPackaged;
  let pythonPath = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';

  if (!isDev) {
    // In production, invoke bundled Python binary
    pythonPath = path.join(process.resourcesPath, 'backend_dist', 'backend.exe');
    backendProcess = spawn(pythonPath, [], { stdio: 'ignore' });
  } else {
    // In development, invoke local virtualenv
    backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'backend.main:app', '--port', '8000', '--host', '127.0.0.1']);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0c0f1a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://127.0.0.1:8000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

---

### Building with electron-builder

Configure `electron-builder.yml`:

```yaml
appId: com.commandplanner.v9
productName: Command Planner V9
directories:
  output: dist-electron
extraResources:
  - from: dist/backend
    to: backend_dist
win:
  target: nsis
nsis:
  oneClick: true
  perMachine: false
  allowToChangeInstallationDirectory: false
```

Run the build command:
```bash
npm run electron:build
```

---

## 5. Method 3: Tauri v2 Lightweight Pipeline

Tauri provides the smallest binary size (~15 MB) by compiling a native Rust shell that talks to WebView2.

### Sidecar Architecture
1. Compile your FastAPI backend into a single sidecar executable using PyInstaller:
   ```bash
   pyinstaller --onefile --name api-backend backend/main.py
   ```
2. Move the output binary into `frontend/src-tauri/binaries/api-backend-x86_64-pc-windows-msvc.exe`.

### tauri.conf.json Configuration
In `frontend/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "externalBin": [
      "binaries/api-backend"
    ]
  },
  "app": {
    "windows": [
      {
        "title": "Command Planner V9",
        "width": 1340,
        "height": 880,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true
      }
    ]
  }
}
```

Build the release installer:
```bash
cd frontend
npm run tauri build
```

---

## 6. Ensuring 100% Offline Air-Gapped Reliability

### Fixing the navigator.onLine Check

In web applications, developers frequently use `navigator.onLine` to check for an internet connection.

In `frontend/src/api/client.ts`, line 76 contains:
```typescript
if (typeof window !== 'undefined' && !navigator.onLine)
```

**Why this breaks offline desktop usage:**
When Wi-Fi or Ethernet is disconnected, Windows reports `navigator.onLine = false`. The client mistakenly assumes that "no internet" means "cannot communicate with the backend", which pauses API requests and shows an unnecessary "Offline" banner, even though the FastAPI backend is running locally on `127.0.0.1:8000`.

**The Permanent Solution:**
Remove the `!navigator.onLine` conditional check in `frontend/src/api/client.ts`. Send local fetch requests directly. Only consider the connection failed if the `fetch()` call itself rejects (which only occurs if the local Python process is terminated):

```typescript
// Bypasses the Wi-Fi check so localhost communication functions normally:
try {
  res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
} catch (networkErr) {
  // Only triggered if port 8000 is not responding:
  if (isGet && typeof window !== 'undefined') {
    const raw = localStorage.getItem(`cp-cache-${path}`);
    if (raw) return JSON.parse(raw);
  }
  throw networkErr;
}
```

---

### Self-Hosting Typography for Air-Gapped Environments

By default, `frontend/src/index.css` references Google Fonts via `@import`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
```

When operating on an isolated PC with no internet:
1. The browser automatically falls back to native system fonts (`system-ui`, `Segoe UI`, `sans-serif`).
2. To preserve the exact Outfit and Inter typography offline, download the `.woff2` files into `frontend/src/assets/fonts/` and declare local `@font-face` rules in `index.css`:

```css
@font-face {
  font-family: 'Inter';
  src: url('./assets/fonts/Inter-VariableFont.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: 'Outfit';
  src: url('./assets/fonts/Outfit-VariableFont.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

---

## 7. Production Gotchas & Pitfalls to Avoid

### Pitfall 1: PyInstaller onefile Database Wipeout
- **Problem**: When running PyInstaller with `--onefile`, the executable unpacks into a temporary folder (`AppData\Local\Temp\_MEIxxxx`). If `planner.db` is stored relative to `__file__`, your database is created inside this temp folder and wiped every time the application is closed.
- **Solution**: Always use `--onedir` for desktop apps with local databases, or ensure `database.py` stores `planner.db` under `%LOCALAPPDATA%\CommandPlannerV9\`.

### Pitfall 2: Hardcoded Port Conflicts
- **Problem**: If another application is using port 8000, Uvicorn will throw `[WinError 10048] Only one usage of each socket address is normally permitted`.
- **Solution**: Use the `find_available_port()` helper demonstrated in Step 4 of the PyWebView pipeline to dynamically assign an unused port on launch.

### Pitfall 3: Antivirus Heuristics with onefile
- **Problem**: Windows Defender occasionally flags freshly compiled `--onefile` Python binaries because unpacker decompression resembles heuristic malware patterns.
- **Solution**: Compiling with `--onedir` avoids unpacker decompression and significantly reduces false-positive detection rates.

### Pitfall 4: SPA Refresh Routing 404s
- **Problem**: In a web app, navigating to a sub-route and refreshing can produce a 404 error if the backend server does not have an SPA fallback handler.
- **Solution**: Ensure the catch-all route `@app.get("/{full_path:path}")` returns `index.html` as shown in Step 2.

---

## 8. Desktop Verification Checklist

Use this checklist to confirm production readiness before distributing your desktop application:

- [ ] **Clean Build**: `npm run build` exits with code 0 and populates `frontend/dist/`.
- [ ] **Offline Test**: Disconnect Wi-Fi and Ethernet. Launch the application. Verify all tabs load immediately.
- [ ] **Persistence Check**: Create a task with recurring priority, schedule an exam, and record a Pomodoro session. Close the window and reopen. Verify all records remain intact.
- [ ] **Audio Test**: Complete a Pomodoro interval. Confirm that the completion chime plays through your speakers without external audio files.
- [ ] **Chart Verification**: Open the Productivity tab. Confirm the 52-week heatmap and Kiviat radar charts render correctly via SVG.
- [ ] **Database Integrity**: Confirm `planner.db-wal` and `planner.db-shm` are active and that automatic backups are created without permission errors.

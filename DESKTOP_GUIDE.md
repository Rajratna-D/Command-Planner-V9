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
- [8. Native Desktop Polish & Advanced Features](#8-native-desktop-polish--advanced-features)
  - [8.1 Single-Instance Lock (Preventing Duplicate App Launches)](#81-single-instance-lock-preventing-duplicate-app-launches)
  - [8.2 Custom Icons on Taskbar and Executable](#82-custom-icons-on-taskbar-and-executable)
  - [8.3 System Tray Minimization (Keep Timers Running in Background)](#83-system-tray-minimization-keep-timers-running-in-background)
  - [8.4 Native Windows Action Center Notifications](#84-native-windows-action-center-notifications)
  - [8.5 Launch on Windows Startup (Run at Boot)](#85-launch-on-windows-startup-run-at-boot)
  - [8.6 Global Hotkey Summon (Ctrl + Shift + P)](#86-global-hotkey-summon-ctrl--shift--p)
- [9. Professional Windows Installer Creation (Inno Setup)](#9-professional-windows-installer-creation-inno-setup)
- [10. Safe Application Updates Without Data Loss](#10-safe-application-updates-without-data-loss)
- [11. Windows Code Signing and SmartScreen Trust](#11-windows-code-signing-and-smartscreen-trust)
  - [Option A: Self-Signed Certificate (Free, Developer Use)](#option-a-self-signed-certificate-free-developer-use)
  - [Option B: Trusted Code Signing Certificate (Public Distribution)](#option-b-trusted-code-signing-certificate-public-distribution)
- [12. Crash Logging and Production Diagnostics](#12-crash-logging-and-production-diagnostics)
- [13. Portable Mode (USB Drive Execution Without Installation)](#13-portable-mode-usb-drive-execution-without-installation)
- [14. Cross-Platform Build Notes (macOS and Linux)](#14-cross-platform-build-notes-macos-and-linux)
  - [macOS (.app Bundle via py2app)](#macos-app-bundle-via-py2app)
  - [Linux (AppImage via AppImageTool)](#linux-appimage-via-appimagetool)
- [15. Desktop Verification Checklist](#15-desktop-verification-checklist)

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
echo Executable located at: dist\CommandPlannerV9\CommandPlannerV9.exe
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
    pythonPath = path.join(process.resourcesPath, 'backend_dist', 'backend.exe');
    backendProcess = spawn(pythonPath, [], { stdio: 'ignore' });
  } else {
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
try {
  res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
} catch (networkErr) {
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

## 8. Native Desktop Polish & Advanced Features

### 8.1 Single-Instance Lock (Preventing Duplicate App Launches)

If a user double-clicks the application icon while it is already running, starting a second backend instance causes port collisions and file locking errors.

Implement a named mutex in `desktop.py` to ensure only one instance runs at a time:

```python
import sys
import ctypes
from ctypes import wintypes

def acquire_single_instance_lock(app_guid="{B49F7D21-8E14-4A3E-9A5C-9A92E86D1234}"):
    # Uses a Windows named mutex to prevent duplicate instances
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    CreateMutexW = kernel32.CreateMutexW
    CreateMutexW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR]
    CreateMutexW.restype = wintypes.HANDLE
    
    mutex_handle = CreateMutexW(None, False, app_guid)
    last_error = ctypes.get_last_error()
    
    ERROR_ALREADY_EXISTS = 183
    if last_error == ERROR_ALREADY_EXISTS:
        # Another instance is already running
        return None
    return mutex_handle

# Inside desktop.py main():
lock = acquire_single_instance_lock()
if not lock:
    print("Command Planner V9 is already running.")
    sys.exit(0)
```

---

### 8.2 Custom Icons on Taskbar and Executable

To give the application a professional icon across Windows File Explorer, the Alt+Tab switcher, and the taskbar:

1. Create or place a multi-size icon file at `assets/icon.ico` (containing 16x16, 32x32, 48x48, and 256x256 pixel sizes).
2. Pass the `--icon` parameter to PyInstaller:
   ```cmd
   pyinstaller --onedir --windowed --icon "assets/icon.ico" desktop.py
   ```
3. Set the Windows AppUserModelID in Python so the taskbar groups properly:
   ```python
   # Inside desktop.py:
   import ctypes
   myappid = "rajratna.commandplanner.v9.desktop"
   ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
   ```

---

### 8.3 System Tray Minimization (Keep Timers Running in Background)

When a student or engineer is running a Pomodoro session, closing the window should not terminate the timer. The app should minimize to the Windows System Tray (next to the clock).

Install `pystray` and `pillow`:
```bash
pip install pystray pillow
```

Add system tray management to `desktop.py`:

```python
import pystray
from PIL import Image
import threading

def create_system_tray(window):
    image = Image.open("assets/icon.ico")
    
    def on_show(icon, item):
        window.show()
        window.restore()

    def on_hide(icon, item):
        window.hide()

    def on_quit(icon, item):
        icon.stop()
        window.destroy()
        sys.exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Open Command Planner", on_show, default=True),
        pystray.MenuItem("Hide to Tray", on_hide),
        pystray.MenuItem("Exit Completely", on_quit)
    )
    
    tray_icon = pystray.Icon("CommandPlannerV9", image, "Command Planner V9", menu)
    tray_icon.run()

# Run the tray icon in a dedicated daemon thread:
threading.Thread(target=create_system_tray, args=(window,), daemon=True).start()
```

---

### 8.4 Native Windows Action Center Notifications

When Command Planner V9 is minimized, desktop alerts (Pomodoro interval complete, overdue coursework, upcoming exam) should trigger native Windows notifications:

Because Microsoft Edge WebView2 supports the HTML5 Notification API natively, no third-party libraries are required in the frontend:

```typescript
// In frontend/src/utils/notifications.ts:
export function showDesktopNotification(title: string, body: string) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/assets/icon.png',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/assets/icon.png' });
      }
    });
  }
}
```

Windows displays this notification in the bottom-right corner and stores it in the Action Center.

---

### 8.5 Launch on Windows Startup (Run at Boot)

To automatically launch Command Planner V9 when logging into Windows:

#### Method A: User Startup Folder (Zero Admin Privileges Required)
Create a `.bat` or shortcut in the user's startup folder:
```cmd
:: Path to Windows Startup Folder:
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CommandPlannerV9.lnk
```

#### Method B: Windows Registry Toggle via Python
```python
import winreg
import os
import sys

def set_run_at_startup(enable=True):
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    app_name = "CommandPlannerV9"
    exe_path = os.path.abspath(sys.argv[0])
    
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enable:
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{exe_path}"')
        else:
            winreg.DeleteValue(key, app_name)
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Startup registry error: {e}")
```

---

### 8.6 Global Hotkey Summon (Ctrl + Shift + P)

Pressing a global keyboard combination anywhere in Windows to instantly bring Command Planner V9 to the front:

```python
import keyboard

def register_summon_hotkey(window):
    def toggle_window():
        # Bring window to front or minimize if already active
        window.show()
        window.restore()
    
    keyboard.add_hotkey("ctrl+shift+p", toggle_window)

# In desktop.py:
threading.Thread(target=register_summon_hotkey, args=(window,), daemon=True).start()
```

---

## 9. Professional Windows Installer Creation (Inno Setup)

To package your compiled `dist/CommandPlannerV9/` directory into a single, polished setup installer (`CommandPlannerV9_Setup.exe`):

1. Download and install [Inno Setup](https://jrsoftware.org/isinfo.php) (Free, industry standard).
2. Create `installer.iss` in your project root:

```pascal
[Setup]
AppId={{C8E29B12-9F14-4B3E-8D5C-2A92E86D9876}
AppName=Command Planner V9
AppVersion=9.0.0
AppPublisher=Rajratna Dhiwar
DefaultDirName={autopf}\Command Planner V9
DefaultGroupName=Command Planner V9
OutputDir=dist-installer
OutputBaseFilename=CommandPlannerV9_Setup
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\CommandPlannerV9.exe

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\CommandPlannerV9\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Command Planner V9"; Filename: "{app}\CommandPlannerV9.exe"
Name: "{group}\Uninstall Command Planner V9"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Command Planner V9"; Filename: "{app}\CommandPlannerV9.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\CommandPlannerV9.exe"; Description: "{cm:LaunchProgram,Command Planner V9}"; Flags: nowait postinstall skipifsilent
```

3. Compile the installer:
   ```cmd
   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
   ```
4. Output: `dist-installer/CommandPlannerV9_Setup.exe`.
   - Single-file installer wizard.
   - Creates Start Menu entries and Desktop shortcuts.
   - Fully uninstallable via Windows Settings -> Installed Apps.

---

## 10. Safe Application Updates Without Data Loss

A frequent fear when distributing desktop applications is that updating the executable will overwrite user data.

### Architectural Guarantee: Separation of Code and State

In Command Planner V9:
- **Application Binaries**: Reside in `{autopf}\Command Planner V9\` (or your build directory).
- **User Database**: Resides strictly in `%LOCALAPPDATA%\CommandPlannerV9\planner.db`.

```
┌─────────────────────────────────────────────────────────────┐
│                    WINDOWS FILE SYSTEM                      │
│                                                             │
│  Program Files / Install Directory (Replaced on Update)     │
│  ├── CommandPlannerV9.exe                                   │
│  ├── python311.dll                                          │
│  └── frontend/dist/                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  User AppData Directory (Never Touched on Update)           │
│  %LOCALAPPDATA%\CommandPlannerV9\                           │
│  ├── planner.db           (All Tasks, Notes, Syllabus)      │
│  ├── planner.db-wal       (Active Write-Ahead Log)          │
│  └── backups/             (30-day Rolling SQLite Snapshots) │
└─────────────────────────────────────────────────────────────┘
```

When you release V9.1 or V10.0:
1. Running the new installer updates the `.exe`, DLLs, and React assets.
2. The user's `%LOCALAPPDATA%\CommandPlannerV9\planner.db` is left untouched.
3. On launch, `backend/database.py` runs non-destructive schema migrations, upgrading existing tables while preserving 100% of user data.

---

## 11. Windows Code Signing and SmartScreen Trust

When users download and run your `.exe` installer, Windows SmartScreen displays a full-screen warning: **"Windows protected your PC - Microsoft Defender SmartScreen prevented an unrecognized app from starting."** This is the number one reason users abandon unsigned desktop applications.

### Why SmartScreen Blocks Your App

Microsoft assigns a trust reputation to every executable based on its code signing certificate. A brand new, unsigned binary has zero reputation. SmartScreen flags it as potentially dangerous because:
1. No certificate authority has verified the publisher's identity.
2. The binary has no download history (it has never been seen before by Microsoft's telemetry).
3. PyInstaller-compiled binaries share structural patterns with actual malware droppers.

### Option A: Self-Signed Certificate (Free, Developer Use)

For personal use or distributing to a small group who trusts you, a self-signed certificate removes the "unknown publisher" label:

```powershell
# 1. Generate a self-signed code signing certificate (valid 3 years)
$cert = New-SelfSignedCertificate `
    -Subject "CN=Rajratna Dhiwar, O=Command Planner, L=India" `
    -Type CodeSigningCert `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(3)

# 2. Export the certificate to a .pfx file (you will need this for signing)
$password = ConvertTo-SecureString -String "YourCertPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "$HOME\code_signing.pfx" -Password $password

# 3. Sign the compiled executable
Set-AuthenticodeSignature `
    -FilePath "dist\CommandPlannerV9\CommandPlannerV9.exe" `
    -Certificate $cert `
    -TimestampServer "http://timestamp.digicert.com"

# 4. Verify the signature
Get-AuthenticodeSignature "dist\CommandPlannerV9\CommandPlannerV9.exe"
```

**Limitation**: Self-signed certificates are not trusted by Windows globally. Recipients must manually install your certificate into their Trusted Publishers store, or click through a less aggressive SmartScreen warning ("Publisher: Rajratna Dhiwar" instead of "Unknown Publisher").

### Option B: Trusted Code Signing Certificate (Public Distribution)

For public distribution where users should see zero warnings:

| Provider | Cost | Verification | SmartScreen Reputation |
|---|---|---|---|
| **SignPath.io** (Open Source Program) | Free for OSS | GitHub repo verification | Immediate trust |
| **Certum Open Source** | ~$26/year | Identity verification | Builds over time |
| **DigiCert / Sectigo** | $200 to $400/year | Organization verification | Immediate trust |
| **Azure Trusted Signing** | ~$10/month | Microsoft account | Immediate trust |

After obtaining a certificate:

```powershell
# Sign with a .pfx certificate from a trusted CA
signtool sign /f "cert.pfx" /p "password" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "dist\CommandPlannerV9\CommandPlannerV9.exe"

# Also sign the Inno Setup installer
signtool sign /f "cert.pfx" /p "password" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "dist-installer\CommandPlannerV9_Setup.exe"
```

### Signing the Inno Setup Installer Automatically

Add the `SignTool` directive to your `installer.iss` so the installer is signed during compilation:

```pascal
[Setup]
SignTool=signtool /f "$qcert.pfx$q" /p "$qpassword$q" /tr http://timestamp.digicert.com /td sha256 /fd sha256 $f
```

---

## 12. Crash Logging and Production Diagnostics

When the packaged desktop app crashes in production, you need a way to diagnose the failure without a terminal window. Add persistent logging to `desktop.py`:

```python
import logging
import os
import sys
import traceback
from datetime import datetime

def setup_crash_logger():
    # Store logs next to the database in the persistent data directory
    if getattr(sys, 'frozen', False):
        log_dir = os.path.join(os.getenv('LOCALAPPDATA', os.path.expanduser('~')), 'CommandPlannerV9', 'logs')
    else:
        log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"planner_{datetime.now().strftime('%Y%m%d')}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
        ]
    )
    return logging.getLogger('desktop')

def global_exception_handler(exc_type, exc_value, exc_tb):
    logger = logging.getLogger('desktop')
    logger.critical(
        "Unhandled exception:\n" + "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    )

# In desktop.py main(), add at the very top:
logger = setup_crash_logger()
sys.excepthook = global_exception_handler

logger.info("Application starting")
logger.info(f"Python: {sys.version}")
logger.info(f"Frozen: {getattr(sys, 'frozen', False)}")
logger.info(f"Data directory: {os.getenv('LOCALAPPDATA', 'N/A')}")
```

### Log File Location

```
%LOCALAPPDATA%\CommandPlannerV9\logs\
   planner_20260911.log
   planner_20260912.log
   ...
```

When a user reports a crash, ask them to send the latest `.log` file from this directory.

### Automatic Log Rotation

To prevent log files from consuming disk space indefinitely:

```python
import glob

def cleanup_old_logs(log_dir, keep_days=30):
    # Delete log files older than 30 days
    cutoff = datetime.now().timestamp() - (keep_days * 86400)
    for log_file in glob.glob(os.path.join(log_dir, "planner_*.log")):
        if os.path.getmtime(log_file) < cutoff:
            os.remove(log_file)
```

---

## 13. Portable Mode (USB Drive Execution Without Installation)

Students using shared library or lab computers often cannot install software. A portable build runs directly from a USB flash drive with zero installation and zero administrator privileges.

### How Portable Mode Works

The key difference from installed mode is that the database and logs are stored next to the executable instead of in `%LOCALAPPDATA%`. Modify `backend/database.py` to detect portable mode:

```python
import os
import sys

def get_data_directory():
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        
        # Portable mode: if a file named "portable.marker" exists next to the .exe,
        # store data in a "data" subfolder next to the executable
        portable_marker = os.path.join(exe_dir, "portable.marker")
        if os.path.exists(portable_marker):
            target = os.path.join(exe_dir, "data")
        else:
            # Installed mode: store in AppData
            app_data = os.getenv('LOCALAPPDATA', os.path.expanduser('~'))
            target = os.path.join(app_data, 'CommandPlannerV9')
    else:
        target = os.path.dirname(os.path.abspath(__file__))
    
    os.makedirs(target, exist_ok=True)
    return target
```

### Creating a Portable Distribution

1. Build the application normally using `build_desktop.bat`.
2. Copy the entire `dist\CommandPlannerV9\` folder to a USB drive.
3. Create an empty file named `portable.marker` in the same folder as `CommandPlannerV9.exe`.

```cmd
:: Create the portable marker
type nul > "E:\CommandPlannerV9\portable.marker"
```

### USB Drive Folder Structure

```
E:\ (USB Drive)
└── CommandPlannerV9\
    ├── CommandPlannerV9.exe
    ├── portable.marker          <-- Activates portable mode
    ├── python311.dll
    ├── frontend/dist/
    └── data/                    <-- Created automatically on first run
        ├── planner.db
        ├── planner.db-wal
        └── logs/
```

The student plugs in the USB, double-clicks the `.exe`, and their planner launches with all their data. When they unplug the USB, nothing is left on the host machine.

---

## 14. Cross-Platform Build Notes (macOS and Linux)

While the primary development target is Windows, the PyWebView + FastAPI architecture is cross-platform. Here are the platform-specific adjustments.

### macOS (.app Bundle via py2app)

#### Prerequisites
```bash
# Install Homebrew dependencies
brew install python@3.11
pip3 install pywebview py2app uvicorn fastapi sqlalchemy
```

#### Build Script (`build_macos.sh`)
```bash
#!/bin/bash
set -e

echo "[1/3] Building frontend..."
cd frontend && npm run build && cd ..

echo "[2/3] Creating macOS app bundle..."

# Create py2app setup file
cat > setup_mac.py << 'EOF'
from setuptools import setup

APP = ['desktop.py']
DATA_FILES = [('frontend/dist', ['frontend/dist'])]
OPTIONS = {
    'argv_emulation': False,
    'iconfile': 'assets/icon.icns',
    'packages': ['backend', 'uvicorn', 'fastapi', 'sqlalchemy', 'pydantic'],
    'plist': {
        'CFBundleName': 'Command Planner V9',
        'CFBundleDisplayName': 'Command Planner V9',
        'CFBundleIdentifier': 'com.rajratna.commandplanner.v9',
        'CFBundleVersion': '9.0.0',
        'CFBundleShortVersionString': '9.0.0',
        'LSMinimumSystemVersion': '11.0',
        'NSHighResolutionCapable': True,
    }
}

setup(
    app=APP,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
EOF

python3 setup_mac.py py2app

echo "[3/3] Build complete!"
echo "App bundle: dist/Command Planner V9.app"
```

#### macOS-Specific Notes
- **WebView Engine**: macOS uses WKWebView (Safari/WebKit) instead of Chromium. Test CSS rendering differences, particularly for backdrop-filter and scrollbar styling.
- **Data Directory**: Use `~/Library/Application Support/CommandPlannerV9/` instead of `%LOCALAPPDATA%`:

```python
import platform

def get_data_directory():
    system = platform.system()
    if system == "Darwin":
        return os.path.expanduser("~/Library/Application Support/CommandPlannerV9")
    elif system == "Linux":
        return os.path.join(os.getenv("XDG_DATA_HOME", os.path.expanduser("~/.local/share")), "CommandPlannerV9")
    else:
        return os.path.join(os.getenv("LOCALAPPDATA", os.path.expanduser("~")), "CommandPlannerV9")
```

- **Icon Format**: macOS requires `.icns` format instead of `.ico`. Convert using:
  ```bash
  # Requires a 1024x1024 PNG source image
  mkdir icon.iconset
  sips -z 16 16 icon_1024.png --out icon.iconset/icon_16x16.png
  sips -z 32 32 icon_1024.png --out icon.iconset/icon_16x16@2x.png
  sips -z 128 128 icon_1024.png --out icon.iconset/icon_128x128.png
  sips -z 256 256 icon_1024.png --out icon.iconset/icon_128x128@2x.png
  sips -z 256 256 icon_1024.png --out icon.iconset/icon_256x256.png
  sips -z 512 512 icon_1024.png --out icon.iconset/icon_256x256@2x.png
  sips -z 512 512 icon_1024.png --out icon.iconset/icon_512x512.png
  sips -z 1024 1024 icon_1024.png --out icon.iconset/icon_512x512@2x.png
  iconutil -c icns icon.iconset
  ```

- **Gatekeeper**: Unsigned `.app` bundles are blocked by macOS Gatekeeper. Users must right-click and select "Open" to bypass the warning on first launch. For proper distribution, sign with an Apple Developer ID ($99/year).

---

### Linux (AppImage via AppImageTool)

AppImage is a portable Linux format that runs on any distribution without installation, package managers, or root access.

#### Prerequisites
```bash
sudo apt install python3-venv python3-pip
pip3 install pywebview pyinstaller uvicorn fastapi sqlalchemy

# Download AppImageTool
wget https://github.com/AppImage/AppImageKit/releases/latest/download/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage
```

#### Build Script (`build_linux.sh`)
```bash
#!/bin/bash
set -e

echo "[1/4] Building frontend..."
cd frontend && npm run build && cd ..

echo "[2/4] Packaging with PyInstaller..."
pyinstaller --noconfirm --onedir --windowed \
    --name "CommandPlannerV9" \
    --add-data "frontend/dist:frontend/dist" \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.loops" \
    --hidden-import "uvicorn.loops.auto" \
    --hidden-import "uvicorn.protocols" \
    --hidden-import "uvicorn.protocols.http" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "uvicorn.lifespans" \
    --hidden-import "uvicorn.lifespans.on" \
    desktop.py

echo "[3/4] Creating AppImage structure..."
mkdir -p AppDir/usr/bin AppDir/usr/share/applications AppDir/usr/share/icons/hicolor/256x256/apps

# Copy PyInstaller output
cp -r dist/CommandPlannerV9/* AppDir/usr/bin/

# Copy icon
cp assets/icon.png AppDir/usr/share/icons/hicolor/256x256/apps/commandplannerv9.png
cp assets/icon.png AppDir/commandplannerv9.png

# Create .desktop file
cat > AppDir/commandplannerv9.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Command Planner V9
Exec=CommandPlannerV9
Icon=commandplannerv9
Categories=Office;ProjectManagement;
Comment=Academic and personal productivity planner
EOF

cp AppDir/commandplannerv9.desktop AppDir/usr/share/applications/

# Create AppRun entry point
cat > AppDir/AppRun << 'APPRUN'
#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/usr/bin/CommandPlannerV9" "$@"
APPRUN
chmod +x AppDir/AppRun

echo "[4/4] Building AppImage..."
./appimagetool-x86_64.AppImage AppDir CommandPlannerV9-x86_64.AppImage

echo "Build complete: CommandPlannerV9-x86_64.AppImage"
```

#### Linux-Specific Notes
- **WebView Engine**: Linux PyWebView uses GTK WebKit2 (`libwebkit2gtk-4.1`). Install it with:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev gir1.2-webkit2-4.1
  ```
- **Wayland vs X11**: PyWebView works on both Wayland and X11. If you encounter blank windows on Wayland, set `GDK_BACKEND=x11` as a fallback.
- **Permissions**: AppImage files need execute permission: `chmod +x CommandPlannerV9-x86_64.AppImage`.
- **Data Directory**: Linux follows the XDG Base Directory Specification. Data goes to `~/.local/share/CommandPlannerV9/`.

---

## 15. Desktop Verification Checklist

Use this checklist to confirm production readiness before distributing your desktop application:

- [ ] **Clean Build**: `npm run build` exits with code 0 and populates `frontend/dist/`.
- [ ] **Single Instance Test**: Launch the application. Double-click the executable again. Confirm that no duplicate process or port collision error occurs.
- [ ] **Offline Test**: Disconnect Wi-Fi and Ethernet. Launch the application. Verify all tabs load immediately.
- [ ] **Persistence Check**: Create a task with recurring priority, schedule an exam, and record a Pomodoro session. Close the window and reopen. Verify all records remain intact.
- [ ] **Audio Test**: Complete a Pomodoro interval. Confirm that the completion chime plays through your speakers without external audio files.
- [ ] **Notification Test**: Minimize the app. Trigger an alert. Confirm that a native Windows toast appears in the Action Center.
- [ ] **Chart Verification**: Open the Productivity tab. Confirm the 52-week heatmap and Kiviat radar charts render correctly via SVG.
- [ ] **Tray Test**: Click minimize or hide. Confirm the tray icon appears next to the Windows clock and that clicking it restores the window.
- [ ] **Installer Test**: Run `CommandPlannerV9_Setup.exe`. Verify the desktop shortcut, Start Menu group, and uninstaller in Windows Settings.
- [ ] **Code Signing Check**: Right-click the `.exe`, select Properties, and check the Digital Signatures tab. Confirm your certificate is listed.
- [ ] **Crash Log Test**: Force-close the application via Task Manager. Relaunch and verify a crash log entry was written to `%LOCALAPPDATA%\CommandPlannerV9\logs\`.
- [ ] **Portable Mode Test**: Copy the build folder to a USB drive. Create `portable.marker`. Launch from the USB. Verify the database is created inside the USB folder, not in AppData.
- [ ] **SmartScreen Test**: Transfer the signed installer to a different Windows PC. Run it and verify no SmartScreen warning appears (or shows your publisher name instead of "Unknown Publisher").

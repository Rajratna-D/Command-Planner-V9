# Desktop Packaging Guide: Command Planner V9

This guide outlines how to package Command Planner V9 into a standalone desktop application (.exe for Windows, .app for macOS, or AppImage for Linux).

---

## Executive Summary: Is It Possible?

Yes, absolutely. Packaging a FastAPI and React 19 web application into a native desktop application is a standard pattern in modern software engineering.

Because modern desktop platforms (Windows 10/11, macOS, modern Linux distributions) come with embedded web engines (such as Microsoft Edge WebView2 on Windows and WebKit on macOS), you do not need to rewrite your application logic. You simply wrap the backend and frontend into an application shell.

---

## Comparison of Desktop Packaging Approaches

| Approach | Technology | Final Installer Size | RAM Footprint | Setup Complexity | Best For |
|---|---|---|---|---|---|
| **Option 1: PyWebView + PyInstaller** | Python + Edge WebView2 | ~35 MB | ~50 MB | Low (Python only) | **Recommended**: Fastest setup, single .exe, no Rust or Node runtime needed |
| **Option 2: Tauri v2** | Rust + Edge WebView2 | ~20 MB | ~35 MB | Medium (Requires Rust) | High-performance desktop distribution with minimal binary size |
| **Option 3: Electron** | Node.js + Chromium | ~110 MB | ~150 MB | Medium (Requires Node.js) | Maximum compatibility and custom OS menu integration |

---

## Option 1 (Recommended): PyWebView + PyInstaller

This is the cleanest approach for this repository. It requires no Rust compiler and no Node.js runtime on the user's machine during distribution. It uses the native Microsoft Edge WebView2 runtime already present in Windows 10 and 11.

### Architectural Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CommandPlannerV9.exe                     │
│                                                             │
│  ┌────────────────────────┐      ┌───────────────────────┐  │
│  │   Native App Window    │      │    FastAPI Server     │  │
│  │ (Microsoft WebView2)   │ <==> │  (Embedded Uvicorn)   │  │
│  │ React 19 Frontend UI   │      │ Port 127.0.0.1:8000   │  │
│  └────────────────────────┘      └───────────┬───────────┘  │
│                                              │              │
│                                              ▼              │
│                                     SQLite WAL (planner.db) │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Build the React Frontend

Generate production-optimized static assets:

```bash
cd frontend
npm run build
cd ..
```

This compiles your TypeScript, React 19, and Tailwind CSS v4 source files into static HTML, CSS, and JS files located in `frontend/dist/`.

### Step 2: Serve Frontend Static Files in FastAPI

Update `backend/main.py` so that when static assets exist, FastAPI serves them directly at the root URL while keeping API routes intact:

```python
import os
from fastapi.staticfiles import StaticFiles

# Mount frontend static build if present
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
```

### Step 3: Create Desktop Entry Point (`desktop.py`)

Create a root file named `desktop.py` that launches FastAPI in a background daemon thread and opens a native desktop window:

```python
import sys
import os
import threading
import time
import socket
import uvicorn
import webview
from backend.main import app

def find_free_port():
    """Find an available local TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def start_backend(port):
    """Run FastAPI via Uvicorn in background."""
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def main():
    port = 8000
    
    # Launch backend server
    server_thread = threading.Thread(target=start_backend, args=(port,), daemon=True)
    server_thread.start()
    
    # Brief pause to allow backend initialization
    time.sleep(0.8)
    
    # Create native desktop window
    window = webview.create_window(
        title="Command Planner V9",
        url=f"http://127.0.0.1:{port}",
        width=1320,
        height=880,
        min_size=(1024, 700),
        resizable=True,
    )
    
    # Start webview event loop (blocks until user closes window)
    webview.start()
    sys.exit(0)

if __name__ == "__main__":
    main()
```

### Step 4: Install Packaging Tools

```bash
pip install pywebview pyinstaller
```

### Step 5: Compile Standalone Executable with PyInstaller

Run PyInstaller to bundle Python, your dependencies, and static files into a Windows executable:

```bash
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
    desktop.py
```

The resulting desktop application will be generated in:
`dist/CommandPlannerV9/CommandPlannerV9.exe`

---

## Option 2: Electron Desktop Wrapper

If you prefer the ecosystem used by applications like VS Code, Slack, and Discord:

### Step 1: Install Electron in the Project

```bash
npm install --save-dev electron electron-builder
```

### Step 2: Create Electron Main Process (`electron/main.js`)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const pythonExecutable = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
  backendProcess = spawn(pythonExecutable, [
    '-m', 'uvicorn',
    'backend.main:app',
    '--port', '8000',
    '--host', '127.0.0.1'
  ]);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
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
  setTimeout(createWindow, 1200);
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
```

---

## Option 3: Tauri v2 (Rust-Powered Lightweight Shell)

For the lowest possible memory usage and binary footprint:

1. Initialize Tauri in the frontend directory:
   ```bash
   cd frontend
   npx @tauri-apps/cli init
   ```
2. Bundle the FastAPI backend into a single sidecar executable using PyInstaller:
   ```bash
   pyinstaller --onefile --name api-backend backend/main.py
   ```
3. Configure `tauri.conf.json` to include the sidecar binary and launch it when the Tauri application starts.
4. Run `npm run tauri build` to output an installer under `src-tauri/target/release/bundle/`.

---

---

## Ensuring 100% Offline Capability: The navigator.onLine Gotcha

In standard cloud web applications, frontends often check `navigator.onLine` to determine if the computer has an active internet connection.

In `frontend/src/api/client.ts`, there is an existing check:
```typescript
if (typeof window !== 'undefined' && !navigator.onLine)
```

Because your FastAPI backend runs directly on your computer at `127.0.0.1:8000`, network requests do not go over the internet. However, when your Wi-Fi is turned off, the browser sets `navigator.onLine = false`. This causes the client to falsely assume the server is unreachable and stop sending requests.

### Solution for 100% Offline Desktop Mode:
In `frontend/src/api/client.ts`, bypass the `!navigator.onLine` check and send requests directly to the local backend. Only handle offline state if the local `fetch()` call itself fails (meaning the local server process is stopped):

```typescript
// Allow direct requests to the local backend regardless of Wi-Fi state:
try {
  res = await fetch(`${BASE}${path}`, { ...options });
} catch (networkErr) {
  // Only triggers if the local backend server process is stopped
  if (isGet && typeof window !== 'undefined') {
    // Optional fallback to cached data
  }
  throw networkErr;
}
```

With this fix in place:
- You can run the application with Wi-Fi completely disabled or in airplane mode.
- Every API call, database save, chart render, and Pomodoro session runs 100% locally.
- Zero network packets ever leave your machine.


## Recommendations & Next Steps

1. For everyday Windows desktop use, **Option 1 (PyWebView)** is the fastest path because it leverages the Python environment already configured in this repository.
2. The user database (`planner.db`) will continue to persist locally under SQLite WAL mode with zero alterations needed.
3. For enterprise distribution with code-signing, Inno Setup (for Windows) or NSIS can wrap the generated directory into an installer wizard.

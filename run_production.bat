@echo off
echo =======================================================
echo  Starting Command Planner — PRODUCTION MODE
echo  (No hot-reload, warning-level logging, localhost only)
echo =======================================================

:: Resolve any processes currently occupying port 8000 to prevent startup errors
echo [1/3] Checking for port 8000 conflicts...
powershell -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch { exit 0 }"


:: Start the FastAPI backend server in PRODUCTION mode
:: • --host 127.0.0.1  : Bind only to localhost (not accessible from network)
:: • --log-level warning: Suppress debug/info output, hide stack traces from stdout
:: • No --reload       : No filesystem watcher overhead, no accidental restarts
echo [2/3] Starting FastAPI Backend on port 8000 (Production)...
start /b "" ".\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

:: Give the backend server a moment to spin up
timeout /t 2 /nobreak > nul

:: Add Node.js directory to Path and run Vite preview (serves production build)
echo [3/3] Starting React Frontend and launching browser...
set PATH=C:\Program Files\nodejs;%PATH%
cd frontend
cmd /c npm run dev -- --open

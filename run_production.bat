@echo off
setlocal enabledelayedexpansion
title Command Planner - Production Web App
echo =======================================================
echo  Starting Command Planner — PRODUCTION MODE
echo  (High performance, self-hosted web app on port 8000)
echo =======================================================

:: 1. Check Python virtual environment (.venv)
if not exist ".\.venv\Scripts\python.exe" (
    echo [!] Python virtual environment (.venv) not found. Setting up...
    where python >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python was not found in PATH.
        echo Please install Python 3.10+ and add it to your PATH.
        pause
        exit /b 1
    )
    echo [*] Creating virtual environment (.venv)...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies...
    .\.venv\Scripts\python.exe -m pip install --upgrade pip
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install backend requirements.
        pause
        exit /b 1
    )
    echo [✓] Backend environment ready!
)

:: 2. Check if frontend build exists in frontend/dist
set PATH=C:\Program Files\nodejs;%PATH%
if not exist "frontend\dist\index.html" (
    echo [!] Production frontend build (frontend\dist) not found. Building now...
    if not exist "frontend\node_modules" (
        echo [*] Installing frontend packages (npm install)...
        cd frontend
        call npm install
        cd ..
    )
    echo [*] Compiling production build (npm run build)...
    cd frontend
    call npm run build
    cd ..
    if errorlevel 1 (
        echo [ERROR] Failed to build frontend.
        pause
        exit /b 1
    )
    echo [✓] Frontend build completed!
)

:: 3. Clear port 8000 conflicts
echo [1/3] Checking for port 8000 conflicts...
powershell -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch { exit 0 }"

:: 4. Start FastAPI backend server in background
echo [2/3] Starting FastAPI Backend on port 8000 (Production)...
start /b "" ".\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --log-level warning

:: 5. Health check loop: wait until backend is responding
echo [*] Waiting for application to initialize...
set ATTEMPTS=0
:WAIT_BACKEND_PROD
set /a ATTEMPTS+=1
if %ATTEMPTS% GTR 30 (
    echo [ERROR] Backend failed to respond on http://127.0.0.1:8000/health within 15 seconds.
    pause
    exit /b 1
)
curl.exe -s http://127.0.0.1:8000/health | findstr /i "ok" > nul
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto WAIT_BACKEND_PROD
)
echo [✓] Backend and SPA are healthy and ready!

:: 6. Launch browser to production web app
echo [3/3] Opening Command Planner in default browser...
start "" "http://127.0.0.1:8000"

echo =======================================================
echo  Command Planner is running at: http://127.0.0.1:8000
echo  Press any key or Ctrl+C to stop the server.
echo =======================================================

pause > nul

echo Stopping backend server...
powershell -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch { exit 0 }"
echo Server stopped.

@echo off
setlocal
title Command Planner - Web App (Dev Mode)
echo =======================================================
echo  Starting Command Planner Fullstack Application...
echo =======================================================

:: 1. Check Python virtual environment
if exist ".\.venv\Scripts\python.exe" goto VENV_OK
echo [!] Python virtual environment not found. Setting up...
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found in PATH.
    echo Please install Python 3.10+ and add it to your PATH.
    pause
    exit /b 1
)
echo [*] Creating virtual environment...
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
:VENV_OK
echo [OK] Backend environment ready!

:: 2. Check Node.js / frontend dependencies
set PATH=C:\Program Files\nodejs;%PATH%
if exist "frontend\node_modules" goto FRONTEND_OK
echo [!] Frontend dependencies not found. Setting up...
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [*] Installing frontend packages...
cd frontend
call npm install
cd ..
if errorlevel 1 (
    echo [ERROR] Failed to install npm packages.
    pause
    exit /b 1
)
:FRONTEND_OK
echo [OK] Frontend dependencies ready!

:: 3. Clear port 8000 conflicts
echo [1/3] Checking for port 8000 conflicts...
powershell -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch { exit 0 }"

:: 4. Start FastAPI backend server in background window
echo [2/3] Starting FastAPI Backend on port 8000...
start "Command Planner - Backend (Port 8000)" ".\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

:: 5. Health check loop: wait until backend is responding
echo [*] Waiting for backend to become ready...
set ATTEMPTS=0
:WAIT_BACKEND
set /a ATTEMPTS+=1
if %ATTEMPTS% GTR 30 (
    echo [ERROR] Backend failed to respond on http://127.0.0.1:8000/health within 15 seconds.
    echo Please check backend logs or run '.\.venv\Scripts\python.exe -m uvicorn backend.main:app' manually.
    pause
    exit /b 1
)
curl.exe -s http://127.0.0.1:8000/health | findstr /i "ok" > nul
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto WAIT_BACKEND
)
echo [OK] Backend is healthy and ready!

:: 6. Start Vite Frontend and launch browser
echo [3/3] Starting React Frontend on port 5173 and opening browser...
cd frontend
call npm run dev -- --open

:: Cleanup backend when frontend stops
cd ..
powershell -Command "try { (Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop).OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch { exit 0 }"

@echo off
echo =======================================================
echo  Starting Command Planner Fullstack Application...
echo =======================================================

:: Resolve any processes currently occupying port 8000 to prevent startup errors
echo [1/3] Checking for port 8000 conflicts...
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"


:: Start the FastAPI backend server in the background
echo [2/3] Starting FastAPI Backend on port 8000...
start /b "" ".\.venv\Scripts\uvicorn" backend.main:app --port 8000 --reload

:: Give the backend server a moment to spin up
timeout /t 2 /nobreak > nul

:: Add Node.js directory to Path and run Vite with the automatic browser-open flag
echo [3/3] Starting React Frontend and launching browser...
set PATH=C:\Program Files\nodejs;%PATH%
cd frontend
cmd /c npm run dev -- --open

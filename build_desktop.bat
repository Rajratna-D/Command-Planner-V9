@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Packaging Command Planner Desktop Application (.exe)
echo ========================================================
echo.

:: 1. Compile React Frontend
echo [1/3] Building production frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed.
    exit /b %ERRORLEVEL%
)
cd ..

:: 2. Run PyInstaller
echo.
echo [2/3] Compiling desktop application with PyInstaller...
.\.venv\Scripts\pyinstaller.exe --noconfirm --onedir --windowed ^
    --name "CommandPlanner" ^
    --add-data "frontend/dist;frontend/dist" ^
    --hidden-import "uvicorn.logging" ^
    --hidden-import "uvicorn.loops" ^
    --hidden-import "uvicorn.loops.auto" ^
    --hidden-import "uvicorn.protocols" ^
    --hidden-import "uvicorn.protocols.http" ^
    --hidden-import "uvicorn.protocols.http.auto" ^
    --hidden-import "uvicorn.protocols.http.h11_impl" ^
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
    --hidden-import "backend.models.task" ^
    --hidden-import "backend.models.test" ^
    --hidden-import "backend.models.assignment" ^
    --hidden-import "backend.models.practical" ^
    --hidden-import "backend.models.list_model" ^
    --hidden-import "backend.models.syllabus" ^
    --hidden-import "backend.models.pomodoro" ^
    --hidden-import "backend.models.note" ^
    --hidden-import "backend.models.settings" ^
    desktop.py

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PyInstaller compilation failed.
    exit /b %ERRORLEVEL%
)

:: 3. Create Distribution Zip
echo.
echo [3/3] Creating distribution ZIP package...
powershell -Command "Compress-Archive -Path 'dist\CommandPlanner\*' -DestinationPath 'dist\CommandPlanner-v9.3.0-Windows.zip' -Force"

echo.
echo ========================================================
echo   BUILD COMPLETE!
echo   Executable location: dist\CommandPlanner\CommandPlanner.exe
echo   Release Package:     dist\CommandPlanner-v9.3.0-Windows.zip
echo ========================================================

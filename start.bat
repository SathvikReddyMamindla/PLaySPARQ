@echo off
REM ============================================================
REM  SportSphere - Windows launcher
REM  Starts the Python backend (port 8000) and the React
REM  frontend (port 5173) in two separate windows.
REM  Run this from the sportsphere folder.
REM ============================================================
cd /d "%~dp0"

echo Starting SportSphere backend on http://localhost:8000 ...
start "SportSphere API" cmd /k "cd /d %~dp0server && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting SportSphere frontend on http://localhost:5173 ...
start "SportSphere Web" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo   Frontend:  http://localhost:5173
echo   API:       http://localhost:8000/api/v1
echo.
echo  Two windows opened. Press Enter when done.
pause >nul

@echo off
REM ============================================================
REM  SportSphere - one-time setup for Windows.
REM  Installs Python backend deps + Node frontend deps.
REM  Run ONCE from the sportsphere folder.
REM ============================================================
cd /d "%~dp0"

echo [1/2] Installing Python backend dependencies...
cd /d "%~dp0server"
if exist .env (
  echo    .env already exists - skipping. Add your Featherless key:
  echo    FEATHERLESS_API_KEY=sk-...
) else (
  copy .env.example .env >nul
  echo    Created server\.env - open it and add your Featherless key:
  echo    FEATHERLESS_API_KEY=sk-...
)

echo [2/2] Installing Node frontend dependencies...
cd /d "%~dp0client"
call npm install

echo.
echo Setup complete! Now run  start.bat
pause >nul

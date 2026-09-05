@echo off
setlocal
title MediKiosk+ Server

cls
echo =====================================================================
echo                     MediKiosk+ Quick Launcher
echo =====================================================================
echo.
echo Starting MediKiosk+ at http://localhost:3000...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please run setup_and_launch.bat first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [NOTICE] 'node_modules' folder is missing. Running full setup first...
    call setup_and_launch.bat
    exit /b %errorlevel%
)

:: Wait 2 seconds, then open the browser in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the application
call npm run dev

pause


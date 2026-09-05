@echo off
setlocal enabledelayedexpansion
title MediKiosk+ System Verification ^& Diagnostics

cls
echo =====================================================================
echo           MediKiosk+ System Verification ^& Diagnostics Check
echo =====================================================================
echo.

:: 1. Node.js Check
echo [1] Checking Node.js:
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do echo     [OK] Node.js is installed: %%i
) else (
    echo     [FAIL] Node.js is NOT installed or not in PATH. Download: https://nodejs.org/
)

:: 2. npm Check
echo [2] Checking npm:
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do echo     [OK] npm is installed: v%%i
) else (
    echo     [FAIL] npm is NOT installed.
)

:: 3. Environment Check
echo [3] Checking .env configuration:
if exist ".env" (
    echo     [OK] .env file exists.
) else (
    echo     [WARNING] .env file is missing. Run setup_and_launch.bat to generate it.
)

:: 4. Dependencies Check
echo [4] Checking node_modules:
if exist "node_modules" (
    echo     [OK] node_modules directory exists.
) else (
    echo     [WARNING] Dependencies not yet installed. Run setup_and_launch.bat.
)

:: 5. Database & Table Health Check
echo [5] Checking MySQL Connection and Tables:
where node >nul 2>nul
if %errorlevel% equ 0 (
    if exist "setup_db.cjs" (
        node setup_db.cjs
    ) else (
        echo     [FAIL] setup_db.cjs not found.
    )
)

echo.
echo =====================================================================
echo Diagnostics check finished.
echo =====================================================================
pause


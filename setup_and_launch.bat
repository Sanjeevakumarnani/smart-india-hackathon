@echo off
setlocal enabledelayedexpansion
title MediKiosk+ One-Click Automated Setup ^& Launcher

cls
echo =====================================================================
echo       MediKiosk+ Automated Environment Setup ^& Full Launcher
echo =====================================================================
echo.
echo  This script will automatically:
echo    1. Verify system prerequisites (Node.js ^& npm)
echo    2. Prepare configuration (.env)
echo    3. Download ^& install all required dependencies (npm install)
echo    4. Connect to MySQL, create the 'medikiosk' database ^& 22 tables
echo    5. Seed initial data (languages, complaints, users)
echo    6. Launch the full ready application ^& open your browser!
echo.
echo =====================================================================
echo.

:: ----------------------------------------------------------------------
:: STEP 1: VERIFY NODE.JS & NPM
:: ----------------------------------------------------------------------
echo [1/5] Checking Node.js runtime...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ===================================================================
    echo  [ERROR] Node.js is NOT installed or NOT in your system PATH!
    echo ===================================================================
    echo  MediKiosk+ requires Node.js (v18 or higher).
    echo.
    echo  Please install Node.js:
    echo    1. Download the LTS version from: https://nodejs.org/
    echo    2. Run the installer and check "Add to PATH"
    echo    3. Restart your command prompt or laptop and run this file again.
    echo ===================================================================
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo       - Node.js found: %NODE_VER%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] npm is NOT found. Please reinstall Node.js with npm.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo       - npm found: v%NPM_VER%
echo.

:: ----------------------------------------------------------------------
:: STEP 2: VERIFY OR CREATE .env FILE
:: ----------------------------------------------------------------------
echo [2/5] Checking environment configuration (.env)...
if not exist ".env" (
    if exist ".env.example" (
        echo       - .env not found. Creating from .env.example...
        copy ".env.example" ".env" >nul
        echo       - Created .env file successfully.
    ) else (
        echo       - Creating fresh default .env file...
        (
            echo # MediKiosk+ Local Environment
            echo GEMINI_API_KEY=""
            echo APP_URL="http://localhost:3000"
            echo PORT="3000"
            echo.
            echo # MySQL Database Configuration
            echo DB_HOST="localhost"
            echo DB_PORT="3306"
            echo DB_USER="root"
            echo DB_PASSWORD="root"
            echo DB_NAME="medikiosk"
        ) > ".env"
        echo       - Default .env created.
    )
) else (
    echo       - Existing .env file detected.
)
echo.

:: ----------------------------------------------------------------------
:: STEP 3: INSTALL DEPENDENCIES
:: ----------------------------------------------------------------------
echo [3/5] Installing project dependencies (npm install)...
echo       This may take 1-2 minutes on first run. Please wait...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] 'npm install' encountered an issue. Retrying with legacy peer deps...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed. Please check your internet connection.
        pause
        exit /b 1
    )
)
echo.
echo       - All dependencies installed and verified successfully!
echo.

:: ----------------------------------------------------------------------
:: STEP 4: DATABASE SETUP & TABLE VERIFICATION
:: ----------------------------------------------------------------------
echo [4/5] Initializing Database, Tables, and Seed Data...
echo.
node setup_db.cjs
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] MySQL setup could not complete automatically.
    echo MediKiosk+ will still run using its built-in in-memory fallback engine.
    echo If you want MySQL persistence, start MySQL server (e.g., in XAMPP or Services)
    echo and re-run: node setup_db.cjs
    echo.
)

:: ----------------------------------------------------------------------
:: STEP 5: LAUNCH THE SITE & OPEN BROWSER
:: ----------------------------------------------------------------------
echo.
echo [5/5] Launching MediKiosk+ full ready application...
echo.
echo =====================================================================
echo  MediKiosk+ is starting at http://localhost:3000
echo.
echo  Default Login Accounts:
echo    * Admin:   admin   / Admin@123
echo    * Doctor:  doctor1 / Doctor@123
echo    * Staff:   staff1  / Staff@123
echo.
echo  Opening http://localhost:3000 in your browser...
echo  (Press Ctrl + C in this terminal anytime to stop the server)
echo =====================================================================
echo.

:: Wait 2 seconds, then open the browser in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the full-stack server
call npm run dev

pause


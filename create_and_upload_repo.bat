@echo off
setlocal enabledelayedexpansion
title MediKiosk+ GitHub Repository Creator ^& Uploader

cls
echo =====================================================================
echo          MediKiosk+ Automated GitHub Repository Creator
echo =====================================================================
echo.
echo  This tool will automatically:
echo    1. Authenticate with your GitHub account (via quick web login)
echo    2. Create a new repository on your GitHub profile
echo    3. Link and push all 61 project files directly to it
echo.
echo =====================================================================
echo.

:: Add GitHub CLI to PATH if installed in standard directory
if exist "C:\Program Files\GitHub CLI\gh.exe" (
    set "PATH=C:\Program Files\GitHub CLI;%PATH%"
)

where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI (gh) was not found in PATH or standard location.
    echo Please ensure GitHub CLI is installed.
    pause
    exit /b 1
)

:: Check if already authenticated with GitHub
gh auth status >nul 2>nul
if %errorlevel% neq 0 (
    echo [STEP 1] GitHub login required.
    echo Opening your web browser to sign in to GitHub...
    echo (If a 8-digit code appears on screen, enter it on the GitHub page)
    echo.
    gh auth login --web --git-protocol https
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] GitHub authentication was cancelled or failed.
        pause
        exit /b 1
    )
) else (
    echo [STEP 1] Already authenticated with GitHub!
)

echo.
echo =====================================================================
echo [STEP 2] Choose Repository Details:
echo =====================================================================
set REPO_NAME=medikiosk-plus
set /p USER_REPO_NAME="Enter repository name (Press Enter for default '%REPO_NAME%'): "
if not "%USER_REPO_NAME%"=="" set REPO_NAME=%USER_REPO_NAME%

echo.
echo Choose Visibility:
echo   1. Public (Anyone can view)
echo   2. Private (Only you and invited collaborators can view)
set /p VIS_CHOICE="Select 1 or 2 (Default: 1 - Public): "

set VISIBILITY=--public
if "%VIS_CHOICE%"=="2" set VISIBILITY=--private

echo.
echo =====================================================================
echo [STEP 3] Creating repository '%REPO_NAME%' on GitHub and uploading code...
echo =====================================================================
echo.

:: Remove existing origin if set
git remote remove origin 2>nul

:: Create repo on GitHub and push code
gh repo create "%REPO_NAME%" %VISIBILITY% --source=. --remote=origin --push

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [SUCCESS] Repository created and all code uploaded successfully!
    echo.
    gh repo view --web
    echo =====================================================================
) else (
    echo.
    echo [ERROR] Failed to create or upload repository.
    echo If the repository '%REPO_NAME%' already exists on your account:
    echo Running push to existing repository...
    git push -u origin main
)

echo.
pause

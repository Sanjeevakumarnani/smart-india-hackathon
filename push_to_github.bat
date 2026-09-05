@echo off
setlocal enabledelayedexpansion
title Push MediKiosk+ to GitHub

cls
echo =====================================================================
echo                 Push MediKiosk+ to GitHub Repository
echo =====================================================================
echo.
echo All code is already committed locally on the 'main' branch.
echo.
echo If you haven't created a GitHub repository yet:
echo   1. Go to https://github.com/new in your browser
echo   2. Name your repository (e.g. "medikiosk-plus")
echo   3. Do NOT check "Initialize with README", .gitignore, or license
echo   4. Click "Create repository"
echo   5. Copy the HTTPS URL (e.g. https://github.com/yourname/medikiosk-plus.git)
echo.
echo =====================================================================
echo.

set /p REPO_URL="Enter your GitHub Repository URL: "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Exiting...
    pause
    exit /b 1
)

echo.
echo Configuring remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo Pushing main branch to GitHub...
echo (A browser window or prompt may open for you to sign in to GitHub)
echo.

git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [SUCCESS] All code has been uploaded to your GitHub repository!
    echo URL: %REPO_URL%
    echo =====================================================================
) else (
    echo.
    echo [ERROR] Failed to push to GitHub.
    echo Please verify your repository URL and GitHub credentials.
)

echo.
pause


@echo off
setlocal enabledelayedexpansion
title LifeOps AI - Local Companion Server
color 0A

echo ================================================================
echo       LIFEOPS AI LOCAL AGENT - COMPANION SERVER (v1.0.0)        
echo ================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
set "VENV_DIR=%SERVER_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
    color 0E
    echo [NOTICE] Python virtual environment not found. Running setup first...
    echo.
    call "%SCRIPT_DIR%setup.bat"
    if not exist "%VENV_PYTHON%" (
        color 0C
        echo [ERROR] Setup did not complete. Cannot start server.
        pause
        exit /b 1
    )
)

if not exist "%SERVER_DIR%\.env" (
    color 0E
    echo [WARNING] server\.env not found! Creating template...
    if exist "%SERVER_DIR%\.env.example" (
        copy "%SERVER_DIR%\.env.example" "%SERVER_DIR%\.env" >nul
    )
)

echo Pre-flight environment check...
if exist "%SCRIPT_DIR%scripts\check_environment.py" (
    "%VENV_PYTHON%" "%SCRIPT_DIR%scripts\check_environment.py"
    if %errorlevel% neq 0 (
        color 0E
        echo.
        echo [WARNING] Environment diagnostics reported missing packages.
        echo Running dependency installation to fix environment...
        "%VENV_PYTHON%" -m pip install -r "%SERVER_DIR%\requirements.txt"
    )
)

echo.
echo ================================================================
echo    Starting LifeOps AI Server on http://127.0.0.1:8765
echo    Interpreter: %VENV_PYTHON%
echo    Press CTRL+C anytime to stop
echo ================================================================
echo.

cd /d "%SERVER_DIR%"
"%VENV_PYTHON%" main.py

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Server stopped with an error code.
    echo Please verify your GROQ_API_KEY in server\.env.
    pause
)

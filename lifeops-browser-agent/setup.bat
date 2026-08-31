@echo off
setlocal enabledelayedexpansion
title LifeOps AI - Local Agent Setup Wizard
color 0B

echo ================================================================
echo           LIFEOPS AI LOCAL AGENT - SETUP WIZARD (v1.0.0)         
echo ================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
set "VENV_DIR=%SERVER_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "VENV_PIP=%VENV_DIR%\Scripts\pip.exe"

echo [1/4] Checking Python environment...
set "SYS_PYTHON="

py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set "SYS_PYTHON=py -3"
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set "SYS_PYTHON=python"
    )
)

if "%SYS_PYTHON%"=="" (
    color 0C
    echo [ERROR] Python 3 is not installed or not found in PATH.
    echo Please download and install Python 3.10+ from https://www.python.org/
    echo Make sure to check the box "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%SYS_PYTHON% --version') do echo Found System Python: %%v

echo.
echo [2/4] Initializing Python virtual environment in server\.venv...
if not exist "%VENV_PYTHON%" (
    echo Creating isolated virtual environment...
    cd /d "%SERVER_DIR%"
    %SYS_PYTHON% -m venv .venv
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
) else (
    echo [OK] Virtual environment already exists at: %VENV_DIR%
)

echo.
echo [3/4] Installing dependencies into virtual environment...
echo Using virtual environment interpreter: %VENV_PYTHON%
"%VENV_PYTHON%" -m pip install --upgrade pip --quiet
if exist "%SERVER_DIR%\requirements.txt" (
    "%VENV_PYTHON%" -m pip install -r "%SERVER_DIR%\requirements.txt"
) else if exist "%SCRIPT_DIR%requirements.txt" (
    "%VENV_PYTHON%" -m pip install -r "%SCRIPT_DIR%requirements.txt"
) else (
    color 0C
    echo [ERROR] requirements.txt not found!
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Dependency installation failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.

echo.
echo [4/4] Configuring environment settings...
if not exist "%SERVER_DIR%\.env" (
    if exist "%SERVER_DIR%\.env.example" (
        copy "%SERVER_DIR%\.env.example" "%SERVER_DIR%\.env" >nul
    ) else if exist "%SCRIPT_DIR%.env.example" (
        copy "%SCRIPT_DIR%.env.example" "%SERVER_DIR%\.env" >nul
    )
    echo Created server\.env configuration file.
    echo.
    echo ****************************************************************
    echo [ACTION REQUIRED]
    echo 1. Open "server\.env" in Notepad.
    echo 2. Paste your Groq API key (from https://console.groq.com/keys).
    echo 3. Save the file.
    echo ****************************************************************
) else (
    echo [OK] server\.env already exists.
)

echo.
echo Running pre-flight environment diagnostics...
if exist "%SCRIPT_DIR%scripts\check_environment.py" (
    "%VENV_PYTHON%" "%SCRIPT_DIR%scripts\check_environment.py"
)

echo.
echo ================================================================
echo             SETUP COMPLETE! YOU ARE READY TO RUN                
echo ================================================================
echo 1. Double-click "start.bat" or "start_server.bat" to run your local server.
echo 2. Open Google Chrome, navigate to chrome://extensions/
echo 3. Enable "Developer mode" (top-right switch).
echo 4. Click "Load unpacked" and select the "extension" directory.
echo ================================================================
echo.
pause

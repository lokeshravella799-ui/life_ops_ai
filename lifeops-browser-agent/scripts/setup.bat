@echo off
title LifeOps AI - Local Agent Setup
color 0B

echo ================================================================
echo           LIFEOPS AI LOCAL AGENT - SETUP WIZARD                 
echo ================================================================
echo.

cd /d "%~dp0\..\server"

echo [1/4] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo [2/4] Creating virtual environment (.venv)...
if not exist ".venv" (
    python -m venv .venv
    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists.
)

echo [3/4] Installing dependencies from requirements.txt...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo [4/4] Setting up environment configuration...
if not exist ".env" (
    copy .env.example .env
    echo Created server\.env from .env.example.
    echo.
    echo [IMPORTANT] Please open server\.env and insert your GROQ_API_KEY.
) else (
    echo server\.env already exists.
)

echo.
echo ================================================================
echo             SETUP COMPLETE! YOU ARE READY TO START              
echo ================================================================
echo To start your local server, run: scripts\start_server.bat
echo.
pause

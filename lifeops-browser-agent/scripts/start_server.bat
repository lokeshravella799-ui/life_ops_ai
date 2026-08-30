@echo off
title LifeOps AI - Local Companion Server
color 0A

echo ================================================================
echo           LIFEOPS AI LOCAL AGENT - STARTUP                      
echo ================================================================
echo.

cd /d "%~dp0\..\server"

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

echo Starting LifeOps AI Local Server on http://127.0.0.1:8765 ...
echo.
python main.py
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Server terminated with an error.
    pause
)

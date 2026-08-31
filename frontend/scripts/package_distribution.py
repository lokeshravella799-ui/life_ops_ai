import os
import io
import shutil
import zipfile
import re

ROOT_DIR = r"c:\Users\lokes\Lifeops Ai"
BROWSER_AGENT_DIR = os.path.join(ROOT_DIR, "lifeops-browser-agent")
OUTPUT_DIR = os.path.join(ROOT_DIR, "frontend", "public", "downloads")
ZIP_NAME = "lifeops-ai-chrome-extension.zip"
ZIP_PATH = os.path.join(OUTPUT_DIR, ZIP_NAME)

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Setup root setup.bat content
SETUP_BAT_CONTENT = """@echo off
setlocal enabledelayedexpansion
title LifeOps AI - Local Agent Setup Wizard
color 0B

echo ================================================================
echo           LIFEOPS AI LOCAL AGENT - SETUP WIZARD (v1.0.0)         
echo ================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
set "VENV_DIR=%SERVER_DIR%\\.venv"
set "VENV_PYTHON=%VENV_DIR%\\Scripts\\python.exe"

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
echo [2/4] Initializing Python virtual environment in server\\.venv...
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
if exist "%SERVER_DIR%\\requirements.txt" (
    "%VENV_PYTHON%" -m pip install -r "%SERVER_DIR%\\requirements.txt"
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
if not exist "%SERVER_DIR%\\.env" (
    if exist "%SERVER_DIR%\\.env.example" (
        copy "%SERVER_DIR%\\.env.example" "%SERVER_DIR%\\.env" >nul
    ) else if exist "%SCRIPT_DIR%.env.example" (
        copy "%SCRIPT_DIR%.env.example" "%SERVER_DIR%\\.env" >nul
    )
    echo Created server\\.env configuration file.
    echo.
    echo ****************************************************************
    echo [ACTION REQUIRED]
    echo 1. Open "server\\.env" in Notepad.
    echo 2. Paste your Groq API key (from https://console.groq.com/keys).
    echo 3. Save the file.
    echo ****************************************************************
) else (
    echo [OK] server\\.env already exists.
)

echo.
echo Running pre-flight environment diagnostics...
if exist "%SCRIPT_DIR%scripts\\check_environment.py" (
    "%VENV_PYTHON%" "%SCRIPT_DIR%scripts\\check_environment.py"
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
"""

# 2. Setup root start.bat content
START_BAT_CONTENT = """@echo off
setlocal enabledelayedexpansion
title LifeOps AI - Local Companion Server
color 0A

echo ================================================================
echo       LIFEOPS AI LOCAL AGENT - COMPANION SERVER (v1.0.0)        
echo ================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
set "VENV_DIR=%SERVER_DIR%\\.venv"
set "VENV_PYTHON=%VENV_DIR%\\Scripts\\python.exe"

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

if not exist "%SERVER_DIR%\\.env" (
    color 0E
    echo [WARNING] server\\.env not found! Creating template...
    if exist "%SERVER_DIR%\\.env.example" (
        copy "%SERVER_DIR%\\.env.example" "%SERVER_DIR%\\.env" >nul
    )
)

echo Pre-flight environment check...
if exist "%SCRIPT_DIR%scripts\\check_environment.py" (
    "%VENV_PYTHON%" "%SCRIPT_DIR%scripts\\check_environment.py"
    if %errorlevel% neq 0 (
        color 0E
        echo.
        echo [WARNING] Environment diagnostics reported missing packages.
        echo Running dependency installation to fix environment...
        "%VENV_PYTHON%" -m pip install -r "%SERVER_DIR%\\requirements.txt"
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
    echo Please verify your GROQ_API_KEY in server\\.env.
    pause
)
"""

START_SERVER_BAT_CONTENT = """@echo off
call "%~dp0start.bat"
"""

README_MD_CONTENT = """# 🚀 LifeOps AI — Browser Agent (Chrome Extension & Local Agent)
**Version: 1.0.0**

Autonomous Multi-Agent Browser Companion powered by high-speed Groq Inference. Brings page summarization, selection explanations, on-demand vision understanding, and PDF analysis directly into your browser.

---

## 🔒 Privacy & Security Notice

> **The Chrome extension does not contain your Groq API key.**
> All AI inference requests are processed exclusively through your own local LifeOps AI agent running on `http://127.0.0.1:8765`. 
> Your API key remains in `server/.env` on your machine and is **never** transmitted to the browser, extension scripts, or third-party web pages. Keep your API key private.

---

## 📦 What's Inside This Package

```
lifeops-ai-chrome-extension/
├── setup.bat              # One-click Windows setup wizard (creates isolated .venv)
├── start.bat              # Deterministic server launcher (pins to .venv python)
├── start_server.bat       # Convenience server launcher
├── requirements.txt       # Python dependencies list
├── .env.example           # Environment template
├── scripts/
│   └── check_environment.py # Diagnostic & health verification script
├── extension/             # Chrome Extension (Manifest V3)
│   ├── manifest.json      # Extension manifest and permissions
│   ├── background.js      # Service worker & tab capture
│   ├── content.js         # Noise-free DOM text extractor
│   ├── popup.html / .js   # Quick action toolbar popup
│   ├── sidepanel.html/.js # Dockable side companion
│   ├── styles.css         # Modern obsidian/violet design system
│   └── icons/             # App icons (16, 32, 48, 128px)
├── server/                # Localhost Python Companion Server
│   ├── main.py            # FastAPI REST application
│   ├── ai_service.py      # Qwen 3.6 27B chat & text intelligence
│   ├── screen_service.py  # Vision AI visual layout & OCR engine
│   ├── pdf_service.py     # Multi-section structured PDF summarizer
│   ├── config.py          # Port 8765 & model configuration
│   ├── requirements.txt   # FastAPI, Uvicorn, Groq, PyPDF dependencies
│   └── .env.example       # Sample environment template
├── README.md              # Documentation & guide
└── LICENSE                # MIT License
```

---

## ⚡ Quick 3-Minute Setup (Windows)

### Step 1: Run Setup
Double-click `setup.bat` (or `start.bat` which automatically configures setup if missing).
This will verify Python 3.10+, create an isolated virtual environment in `server/.venv`, install requirements, create `server/.env`, and run pre-flight diagnostics.

### Step 2: Configure Your Free Groq API Key
1. Open `server/.env` in Notepad or any text editor.
2. Replace `your_groq_api_key_here` with your key from [Groq Console](https://console.groq.com/keys):
   ```env
   GROQ_API_KEY=your_actual_api_key_here
   ```
3. Save the file.

### Step 3: Start the Local Server
Double-click `start.bat` or `start_server.bat`.
You will see:
```
==================================================
   Starting LifeOps AI Server on http://127.0.0.1:8765
   Interpreter: server\\.venv\\Scripts\\python.exe
==================================================
```
Keep this terminal window open while browsing.

### Step 4: Load Extension in Google Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Turn **ON** the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extension` folder inside this extracted package.
5. Pin **LifeOps AI** to your Chrome toolbar.

---

## 🌟 Features & Usage

| Feature | How to Use |
|---|---|
| **📄 Page Summary** | Click extension icon → Click **Analyze Page** or **Page Summary** |
| **🔍 Selection Intelligence** | Highlight text on any page → Right click → *"Ask LifeOps AI about..."* |
| **📸 See My Screen** | Click **See My Screen** to analyze visual layouts, charts, or errors with Vision AI |
| **📑 Summarize PDF** | Open any PDF or click **Summarize PDF** to upload and receive an executive summary |
| **🪟 Side Companion** | Click the side panel dock icon (top-right of popup) for continuous chat while browsing |

---

## 🛠️ Diagnostics & Troubleshooting

- **Diagnose Environment**:
  Run: `server\\.venv\\Scripts\\python.exe scripts\\check_environment.py` to inspect Python version, pip location, dependencies, configuration, and port status.
- **Status shows OFFLINE?**
  Make sure `start.bat` is running. Test by visiting `http://127.0.0.1:8765/health` in your browser.
- **Python not recognized?**
  Install Python from [python.org](https://www.python.org/) and make sure to check *"Add Python to PATH"* in the installer.
"""

LICENSE_CONTENT = """MIT License

Copyright (c) 2026 LifeOps AI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

def create_distributable_zip():
    print(f"Creating distributable package at: {ZIP_PATH} ...")
    
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Write root files
        zf.writestr("lifeops-ai-chrome-extension/setup.bat", SETUP_BAT_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/start.bat", START_BAT_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/start_server.bat", START_SERVER_BAT_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/README.md", README_MD_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/LICENSE", LICENSE_CONTENT)
        
        # Write root requirements and .env.example
        root_req = os.path.join(BROWSER_AGENT_DIR, "requirements.txt")
        if os.path.exists(root_req):
            zf.write(root_req, "lifeops-ai-chrome-extension/requirements.txt")
            
        root_env_ex = os.path.join(BROWSER_AGENT_DIR, ".env.example")
        if os.path.exists(root_env_ex):
            zf.write(root_env_ex, "lifeops-ai-chrome-extension/.env.example")

        # Write scripts
        diag_script = os.path.join(BROWSER_AGENT_DIR, "scripts", "check_environment.py")
        if os.path.exists(diag_script):
            zf.write(diag_script, "lifeops-ai-chrome-extension/scripts/check_environment.py")

        # Write extension files
        ext_src = os.path.join(BROWSER_AGENT_DIR, "extension")
        for root, dirs, files in os.walk(ext_src):
            dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', '.vscode']]
            for file in files:
                if file.endswith('.pyc') or file == 'generate_icons.py':
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ext_src)
                zip_entry = f"lifeops-ai-chrome-extension/extension/{rel_path}".replace("\\", "/")
                zf.write(full_path, zip_entry)
                print(f"  + Added extension file: {zip_entry}")

        # Write server files
        srv_src = os.path.join(BROWSER_AGENT_DIR, "server")
        allowed_server_files = [
            "main.py",
            "config.py",
            "ai_service.py",
            "screen_service.py",
            "pdf_service.py",
            "requirements.txt",
            ".env.example"
        ]
        for file in allowed_server_files:
            full_path = os.path.join(srv_src, file)
            if os.path.exists(full_path):
                zip_entry = f"lifeops-ai-chrome-extension/server/{file}".replace("\\", "/")
                zf.write(full_path, zip_entry)
                print(f"  + Added server file: {zip_entry}")

    print(f"\n[SUCCESS] ZIP package created successfully! Size: {os.path.getsize(ZIP_PATH)} bytes\n")

if __name__ == "__main__":
    create_distributable_zip()

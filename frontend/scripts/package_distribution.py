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
title LifeOps AI - Local Agent Setup Wizard
color 0B

echo ================================================================
echo           LIFEOPS AI LOCAL AGENT - SETUP WIZARD (v1.0.0)         
echo ================================================================
echo.

echo [1/4] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python 3 is not installed or not in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    echo (Make sure to check "Add Python to PATH" during installation)
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do echo Found: %%i

echo.
echo [2/4] Setting up Python virtual environment in server\\.venv...
cd /d "%~dp0server"
if not exist ".venv" (
    python -m venv .venv
    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists.
)

echo.
echo [3/4] Installing dependencies from requirements.txt...
call .venv\\Scripts\\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Dependency installation failed. Please check internet connection.
    pause
    exit /b 1
)

echo.
echo [4/4] Configuring environment settings...
if not exist ".env" (
    copy .env.example .env >nul
    echo Created server\\.env from .env.example.
    echo.
    echo ****************************************************************
    echo [ACTION REQUIRED]
    echo 1. Open "server\\.env" in Notepad.
    echo 2. Paste your free Groq API key (from https://console.groq.com/keys).
    echo 3. Save the file.
    echo ****************************************************************
) else (
    echo server\\.env already exists.
)

echo.
echo ================================================================
echo             SETUP COMPLETE! YOU ARE READY TO RUN                
echo ================================================================
echo 1. Double-click "start_server.bat" to run your local AI agent.
echo 2. Open Google Chrome, go to chrome://extensions/
echo 3. Turn on "Developer mode" (top-right).
echo 4. Click "Load unpacked" and select the "extension" folder.
echo ================================================================
echo.
pause
"""

# 2. Setup root start_server.bat content
START_SERVER_BAT_CONTENT = """@echo off
title LifeOps AI - Local Companion Server
color 0A

echo ================================================================
echo       LIFEOPS AI LOCAL AGENT - COMPANION SERVER (v1.0.0)        
echo ================================================================
echo.

cd /d "%~dp0server"

if not exist ".env" (
    color 0E
    echo [WARNING] server\\.env not found! Running setup first...
    echo.
    cd /d "%~dp0"
    call setup.bat
    cd /d "%~dp0server"
)

if exist ".venv\\Scripts\\activate.bat" (
    call .venv\\Scripts\\activate.bat
)

echo ================================================================
echo    Server starting on: http://127.0.0.1:8765
echo    Status: ONLINE when Uvicorn startup completes
echo    Press CTRL+C anytime to stop
echo ================================================================
echo.

python main.py
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Server stopped with an error code.
    echo Please make sure your GROQ_API_KEY in server\\.env is valid.
    pause
)
"""

# 3. Setup root README.md content
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
├── setup.bat              # One-click Windows setup wizard
├── start_server.bat       # Local server launcher
├── README.md              # Documentation & guide
└── LICENSE                # MIT License
```

---

## ⚡ Quick 3-Minute Setup (Windows)

### Step 1: Run Setup
Double-click `setup.bat` (or run in Command Prompt).
This will verify Python 3.10+, create a virtual environment in `server/.venv`, install requirements, and create `server/.env`.

### Step 2: Configure Your Free Groq API Key
1. Open `server/.env` in Notepad or any text editor.
2. Replace `your_groq_api_key_here` with your key from [Groq Console](https://console.groq.com/keys):
   ```env
   GROQ_API_KEY=your_actual_api_key_here
   ```
3. Save the file.

### Step 3: Start the Local Server
Double-click `start_server.bat`.
You will see:
```
==================================================
   LifeOps AI Local Agent Server
   Running on: http://127.0.0.1:8765
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

## 🛠️ Troubleshooting

- **Status shows OFFLINE?**
  Make sure `start_server.bat` is running in a terminal window. Test by visiting `http://127.0.0.1:8765/health` in your browser.
- **Python not recognized?**
  Install Python from [python.org](https://www.python.org/) and make sure to check *"Add Python to PATH"* in the installer.
- **Need help?**
  Visit [LifeOps AI Platform](https://lifeops.ai) for support and updates.
"""

# 4. Setup root LICENSE
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
        zf.writestr("lifeops-ai-chrome-extension/start_server.bat", START_SERVER_BAT_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/README.md", README_MD_CONTENT)
        zf.writestr("lifeops-ai-chrome-extension/LICENSE", LICENSE_CONTENT)

        # Write extension files
        ext_src = os.path.join(BROWSER_AGENT_DIR, "extension")
        for root, dirs, files in os.walk(ext_src):
            # Skip caches
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

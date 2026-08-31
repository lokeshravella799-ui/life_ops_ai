#!/usr/bin/env python3
"""
LifeOps AI - Environment & Diagnostics Checker
Validates Python interpreter, virtual environment, required dependencies,
configuration files, and backend connectivity.
"""

import sys
import os
import shutil
import socket
import importlib
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def get_project_root():
    """Finds the browser agent project root."""
    current_file = Path(__file__).resolve()
    # If in scripts/ directory:
    if current_file.parent.name == "scripts":
        return current_file.parent.parent
    # If in root directory:
    return current_file.parent

def check_port_open(host: str, port: int) -> bool:
    """Checks if a TCP port is responding."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1.0)
            result = sock.connect_ex((host, port))
            return result == 0
    except Exception:
        return False

def check_backend_health(host: str, port: int) -> dict:
    """Queries the /health endpoint if backend is running."""
    try:
        import urllib.request
        import json
        url = f"http://{host}:{port}/health"
        req = urllib.request.Request(url, headers={"User-Agent": "LifeOps-Diagnostics"})
        with urllib.request.urlopen(req, timeout=2.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return {"online": True, "data": data}
    except Exception as e:
        return {"online": False, "error": str(e)}
    return {"online": False, "error": "Not responding"}

def run_diagnostics():
    project_root = get_project_root()
    server_dir = project_root / "server"
    
    print("=" * 70)
    print("          LIFEOPS AI LOCAL SERVER — ENVIRONMENT DIAGNOSTICS          ")
    print("=" * 70)
    
    # 1. Project Root
    print(f"\n[1] PROJECT INFORMATION")
    print(f"    • Project Root Directory: {project_root}")
    print(f"    • Server Directory:       {server_dir} ({'EXISTS' if server_dir.exists() else 'MISSING'})")
    
    # 2. Python Executable & Version
    in_venv = (sys.prefix != sys.base_prefix) or ("VIRTUAL_ENV" in os.environ)
    venv_indicator = " [VIRTUAL ENVIRONMENT]" if in_venv else " [GLOBAL / UNVIRTUALIZED]"
    print(f"\n[2] PYTHON INTERPRETER")
    print(f"    • Python Executable:     {sys.executable}{venv_indicator}")
    print(f"    • Python Version:        {sys.version.split()[0]} ({sys.platform})")
    print(f"    • Sys Prefix:            {sys.prefix}")
    print(f"    • Virtual Env Active:    {'YES' if in_venv else 'NO (Recommended: Run via .venv)'}")
    
    # 3. Pip Location & Version
    print(f"\n[3] PIP PACKAGE MANAGER")
    try:
        import pip
        import subprocess
        pip_res = subprocess.run([sys.executable, "-m", "pip", "--version"], capture_output=True, text=True, timeout=5)
        pip_info = pip_res.stdout.strip() if pip_res.returncode == 0 else f"pip version {pip.__version__}"
        print(f"    • Pip Status:            AVAILABLE")
        print(f"    • Pip Details:           {pip_info}")
    except Exception as e:
        print(f"    • Pip Status:            UNAVAILABLE ({e})")
        
    # 4. Required Dependency Verification
    print(f"\n[4] DEPENDENCY CHECKS")
    required_packages = [
        ("fastapi", "FastAPI Web Framework"),
        ("uvicorn", "ASGI Server"),
        ("groq", "Groq AI Inference SDK"),
        ("pydantic", "Data Validation"),
        ("pydantic_settings", "Settings Management"),
        ("dotenv", "Environment Variable Loader (python-dotenv)"),
        ("pypdf", "PDF Extraction Engine"),
        ("multipart", "Multipart Form Parser (python-multipart)"),
        ("PIL", "Pillow Image Processing"),
        ("requests", "HTTP Requests Client")
    ]
    
    missing_packages = []
    for mod_name, desc in required_packages:
        try:
            mod = importlib.import_module(mod_name)
            ver = getattr(mod, "__version__", "installed")
            print(f"    ✓ {mod_name:18} : {ver:<15} ({desc})")
        except ImportError:
            print(f"    ✗ {mod_name:18} : MISSING         ({desc})")
            missing_packages.append(mod_name)
            
    # 5. Configuration & Requirements Files
    print(f"\n[5] CONFIGURATION & REQUIREMENTS FILES")
    req_root = project_root / "requirements.txt"
    req_server = server_dir / "requirements.txt"
    req_found = req_root.exists() or req_server.exists()
    
    print(f"    • root requirements.txt:   {'FOUND' if req_root.exists() else 'NOT PRESENT'}")
    print(f"    • server requirements.txt: {'FOUND' if req_server.exists() else 'MISSING'}")
    
    env_file = server_dir / ".env"
    env_example = server_dir / ".env.example"
    
    print(f"    • server/.env.example:     {'FOUND' if env_example.exists() else 'MISSING'}")
    print(f"    • server/.env:             {'FOUND' if env_file.exists() else 'MISSING (Will be created by setup)'}")
    
    # 6. Environment Variables
    print(f"\n[6] ENVIRONMENT VARIABLES")
    # Load .env if present
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    port_val = os.environ.get("PORT", "8765")
    host_val = os.environ.get("HOST", "127.0.0.1")
    model_val = os.environ.get("GROQ_MODEL", "qwen/qwen3.6-27b")
    
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8", errors="ignore") as ef:
            for line in ef:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k == "GROQ_API_KEY" and not groq_api_key:
                        groq_api_key = v
                    elif k == "PORT" and port_val == "8765":
                        port_val = v
                    elif k == "HOST" and host_val == "127.0.0.1":
                        host_val = v
                    elif k == "GROQ_MODEL" and model_val == "qwen/qwen3.6-27b":
                        model_val = v
                        
    masked_key = (groq_api_key[:6] + "..." + groq_api_key[-4:]) if len(groq_api_key) > 10 else ("CONFIGURED" if groq_api_key and groq_api_key != "your_groq_api_key_here" else "NOT SET / PLACEHOLDER")
    print(f"    • HOST:                  {host_val}")
    print(f"    • PORT:                  {port_val}")
    print(f"    • GROQ_MODEL:            {model_val}")
    print(f"    • GROQ_API_KEY:          {masked_key}")
    
    # 7. Port & Backend Health Status
    try:
        port_num = int(port_val)
    except ValueError:
        port_num = 8765
        
    print(f"\n[7] BACKEND HEALTH & PORT STATUS")
    is_open = check_port_open(host_val, port_num)
    if is_open:
        print(f"    • Port {port_num}:              LISTENING (Active service detected)")
        health = check_backend_health(host_val, port_num)
        if health.get("online"):
            print(f"    • Health Endpoint Status: ONLINE")
            print(f"    • Backend Service:        {health['data'].get('service', 'LifeOps AI')}")
            print(f"    • AI Configured:          {health['data'].get('groq_configured', False)}")
        else:
            print(f"    • Health Endpoint Status: PORT OPEN, but /health check failed: {health.get('error')}")
    else:
        print(f"    • Port {port_num}:              IDLE (Ready for server to start)")
        print(f"    • Health Endpoint Status: OFFLINE (Server not running)")
        
    # Summary
    print("\n" + "=" * 70)
    if missing_packages:
        print(" [!] STATUS: DEPENDENCIES MISSING")
        print(f"     Please run setup.bat or execute:")
        print(f"     \"{sys.executable}\" -m pip install -r \"{req_server}\"")
        print("=" * 70)
        return 1
    elif not in_venv:
        print(" [!] STATUS: READY (Running with Global Python)")
        print("     Tip: For an isolated deployment, run setup.bat to use .venv")
        print("=" * 70)
        return 0
    else:
        print(" [✓] STATUS: 100% READY (Virtual Environment & Dependencies Verified)")
        print("=" * 70)
        return 0

if __name__ == "__main__":
    exit_code = run_diagnostics()
    sys.exit(exit_code)

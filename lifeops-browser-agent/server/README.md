# LifeOps AI Local Server

The local Python server runs on `http://127.0.0.1:8765` and acts as the secure local AI companion for the **LifeOps AI Chrome Extension**.

## Architecture & Security
- **Localhost Only**: Listens strictly on `127.0.0.1:8765`.
- **Private Secrets**: `GROQ_API_KEY` is loaded from `server/.env` and never transmitted to the browser extension frontend.
- **Fast Inference**: Integrates directly with Groq (`qwen/qwen3.6-27b` and `llama-3.2-11b-vision-preview`).

## Quick Setup

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your Groq API key:
```env
PORT=8765
HOST=127.0.0.1
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=qwen/qwen3.6-27b
GROQ_VISION_MODEL=llama-3.2-11b-vision-preview
```

### 3. Start the Server
```bash
python main.py
```
Or use the batch script: `..\scripts\start_server.bat`

# LifeOps AI — Browser Agent (Phase 1)

A powerful, privacy-first Chrome Extension and local AI companion server that brings **LifeOps AI** directly to your browser for webpage analysis, text selection explanations, on-demand screen understanding, and structured PDF summarization.

---

## 🏗️ Architecture

```
Chrome Browser (Extension V3)
       │
       │ HTTP (http://127.0.0.1:8765)
       ▼
Local Python Agent (FastAPI)
       │
       │ Groq Inference API (qwen/qwen3.6-27b & llama-3.2-11b-vision-preview)
       ▼
Groq Cloud
```

- **Localhost Isolation**: The extension communicates exclusively with your local computer on `127.0.0.1:8765`.
- **Private Key Storage**: Your `GROQ_API_KEY` stays in `server/.env` and is never exposed to the Chrome Extension or browser DevTools.
- **On-Demand Vision**: Screen capture is triggered strictly when you click "See My Screen". Zero background or silent monitoring.

---

## 🚀 Quick Start (Windows)

### 1. Run the Setup Script
Double-click `scripts\setup.bat` (or run in terminal):
```cmd
cd lifeops-browser-agent\scripts
setup.bat
```

### 2. Configure Your Groq API Key
Open `lifeops-browser-agent\server\.env` in any text editor and insert your free Groq API key:
```env
GROQ_API_KEY=gsk_your_actual_key_here
```

### 3. Start the Local Server
Double-click `scripts\start_server.bat`:
```cmd
cd lifeops-browser-agent\scripts
start_server.bat
```
You should see:
```
==================================================
   LifeOps AI Local Agent Server                  
   Running on: http://127.0.0.1:8765
==================================================
```

### 4. Install the Extension in Google Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** (top-left).
4. Select the `lifeops-browser-agent\extension` directory.
5. Pin **LifeOps AI** to your Chrome toolbar.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| **📄 Analyze Page** | Extracts clean visible text from the active tab and generates an executive summary, key takeaways, and data breakdown. |
| **🔍 Selection Intelligence** | Highlight any text on any webpage and ask LifeOps AI to simplify, summarize, translate, or rewrite it. |
| **📸 See My Screen** | Captures the visible tab and uses Groq Vision AI to analyze diagrams, layouts, and troubleshooting errors. |
| **📑 Summarize PDF** | Multi-page structured extraction producing executive summaries, key facts, metrics, and action items. |
| **🪟 Side Panel Companion** | Dockable full-height companion panel for continuous conversational assistance while browsing. |

---

## 🛠️ API Reference (Local Server: `http://127.0.0.1:8765`)

- `GET /health`: Health check status (`ONLINE` / `OFFLINE`) and active model info.
- `POST /analyze-page`: Analyzes webpage text and answers specific questions.
- `POST /analyze-selection`: Explains and rewrites highlighted text.
- `POST /analyze-screen`: Vision analysis on base64 captured tab screenshot.
- `POST /summarize-pdf`: Structured summary of PDF document via file upload or text.
- `POST /chat`: Multi-turn conversational chat with active page context.

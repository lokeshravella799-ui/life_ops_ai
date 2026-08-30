# LifeOps AI — Chrome Extension (Manifest V3)

The official browser companion extension for LifeOps AI.

## Features
- **Page Understanding**: Instant structured analysis and key takeaways of any active webpage.
- **Selection Intelligence**: Highlight any text on a webpage to explain, summarize, or translate.
- **Screen Understanding**: On-demand visible tab capture with Groq Vision AI (`llama-3.2-11b-vision-preview`).
- **PDF Summarizer**: Multi-page structured PDF extraction & executive summarization.
- **Side Panel Companion**: Dockable Chrome Side Panel for uninterrupted in-page conversation.
- **Privacy First**: Communicates exclusively with the local Python server (`127.0.0.1:8765`). Zero API keys are stored in the extension.

## Chrome Installation Instructions

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `lifeops-browser-agent/extension` folder.
6. Click the extension puzzle icon in Chrome and **Pin** LifeOps AI to your toolbar.

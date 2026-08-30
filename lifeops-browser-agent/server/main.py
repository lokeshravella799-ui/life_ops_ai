import os
import time
import base64
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from ai_service import ai_service
from screen_service import screen_service
from pdf_service import pdf_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("LifeOpsServer")

app = FastAPI(
    title="LifeOps AI Local Agent",
    description="Local companion server for LifeOps AI Chrome Extension",
    version="1.0.0"
)

# Allow Chrome Extension and Localhost requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits chrome-extension:// and localhost origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Request Schemas
# ------------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    pageContext: Optional[Dict[str, Any]] = None

class PageAnalysisRequest(BaseModel):
    url: str = Field(default="")
    title: str = Field(default="")
    content: str = Field(..., min_length=1)
    question: Optional[str] = None

class SelectionAnalysisRequest(BaseModel):
    selectedText: str = Field(..., min_length=1)
    pageTitle: Optional[str] = None
    pageUrl: Optional[str] = None
    action: Optional[str] = None
    question: Optional[str] = None

class ScreenAnalysisRequest(BaseModel):
    imageBase64: str = Field(..., min_length=1)
    question: Optional[str] = None
    pageTitle: Optional[str] = None
    pageUrl: Optional[str] = None

class PDFSummaryRequest(BaseModel):
    text: Optional[str] = None
    base64Pdf: Optional[str] = None
    filename: Optional[str] = None
    instructions: Optional[str] = None

# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Health check endpoint polled by Chrome Extension."""
    return {
        "status": "ONLINE",
        "service": "LifeOps AI Local Agent",
        "timestamp": time.time(),
        "groq_configured": ai_service.is_configured,
        "active_model": settings.GROQ_MODEL,
        "vision_model": settings.GROQ_VISION_MODEL,
        "port": settings.PORT
    }

@app.post("/analyze-page")
async def analyze_page(req: PageAnalysisRequest):
    """Analyzes visible webpage text and provides structured insights."""
    try:
        res = await ai_service.analyze_page(
            url=req.url,
            title=req.title,
            content=req.content,
            question=req.question
        )
        return res
    except Exception as e:
        logger.error(f"Error in /analyze-page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-selection")
async def analyze_selection(req: SelectionAnalysisRequest):
    """Analyzes highlighted text on a webpage."""
    try:
        res = await ai_service.analyze_selection(
            selected_text=req.selectedText,
            page_title=req.pageTitle,
            page_url=req.pageUrl,
            action=req.action,
            custom_question=req.question
        )
        return res
    except Exception as e:
        logger.error(f"Error in /analyze-selection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-screen")
async def analyze_screen(req: ScreenAnalysisRequest):
    """Performs Vision AI analysis on an explicitly captured user tab screenshot."""
    try:
        res = await screen_service.analyze_screenshot(
            image_base64=req.imageBase64,
            question=req.question,
            page_title=req.pageTitle,
            page_url=req.pageUrl
        )
        return res
    except Exception as e:
        logger.error(f"Error in /analyze-screen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize-pdf")
async def summarize_pdf(request: Request):
    """Summarizes PDF documents via file upload (multipart), raw text (json), or base64 data (json)."""
    try:
        content_type = request.headers.get("content-type", "")
        pdf_bytes = None
        pdf_text = None
        filename = "document.pdf"
        instructions = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            uploaded_file = form.get("file")
            if uploaded_file and hasattr(uploaded_file, "read"):
                pdf_bytes = await uploaded_file.read()
                filename = getattr(uploaded_file, "filename", filename) or filename
            if form.get("instructions"):
                instructions = str(form.get("instructions"))
            if form.get("text"):
                pdf_text = str(form.get("text"))
        else:
            body = await request.json()
            pdf_text = body.get("text")
            filename = body.get("filename") or filename
            instructions = body.get("instructions")
            if body.get("base64Pdf"):
                cleaned_b64 = body.get("base64Pdf")
                if "base64," in cleaned_b64:
                    cleaned_b64 = cleaned_b64.split("base64,")[1]
                pdf_bytes = base64.b64decode(cleaned_b64)

        res = await pdf_service.summarize_pdf(
            pdf_text=pdf_text,
            pdf_bytes=pdf_bytes,
            filename=filename,
            custom_instructions=instructions
        )
        return res
    except Exception as e:
        logger.error(f"Error in /summarize-pdf: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(req: ChatRequest):
    """In-page conversational chat assistant."""
    try:
        history = []
        if req.messages:
            history = [{"role": m.role, "content": m.content} for m in req.messages]
        elif req.message:
            history = [{"role": "user", "content": req.message}]

        res = await ai_service.in_page_chat(
            messages_history=history,
            page_context=req.pageContext
        )
        return res
    except Exception as e:
        logger.error(f"Error in /chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print(f"\n==================================================")
    print(f"   LifeOps AI Local Agent Server                  ")
    print(f"   Running on: http://{settings.HOST}:{settings.PORT}")
    print(f"==================================================\n")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

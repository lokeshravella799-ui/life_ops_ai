import re
import logging
from typing import Dict, Any, Optional
from groq import Groq
from config import settings
from ai_service import ai_service

logger = logging.getLogger("LifeOpsScreenService")

class ScreenService:
    def __init__(self):
        pass

    async def analyze_screenshot(
        self,
        image_base64: str,
        question: Optional[str] = None,
        page_title: Optional[str] = None,
        page_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyzes a captured visible tab screenshot using Groq Vision AI."""
        if not settings.GROQ_API_KEY:
            raise ValueError("Groq API key is not configured in server/.env.")

        client = ai_service.client
        if not client:
            raise ValueError("Groq client could not be initialized.")

        # Clean image data URL prefix if present
        cleaned_b64 = image_base64
        if "base64," in cleaned_b64:
            cleaned_b64 = cleaned_b64.split("base64,")[1]

        prompt_text = question or "Analyze what is displayed on this screen. Identify main elements, key data, any visible errors or notices, and explain the visual layout."
        if page_title or page_url:
            prompt_text = f"Context: Page '{page_title or ''}' ({page_url or ''})\n\nUser Question: {prompt_text}"

        vision_model = settings.GROQ_VISION_MODEL or "qwen/qwen3.6-27b"
        logger.info(f"Analyzing screen with vision model '{vision_model}'...")

        try:
            completion = client.chat.completions.create(
                model=vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{cleaned_b64}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.4,
                max_completion_tokens=2048
            )

            raw_answer = completion.choices[0].message.content or ""
            clean_answer = ai_service.strip_thinking_tags(raw_answer)

            return {
                "success": True,
                "answer": clean_answer,
                "model_used": vision_model
            }
        except Exception as e:
            logger.error(f"Vision analysis failed on model '{vision_model}': {ai_service.sanitize_error(e)}")
            # If vision model fails, try fallback vision model
            if vision_model != "qwen/qwen3.8-27b":
                try:
                    logger.info("Attempting fallback vision model 'qwen/qwen3.8-27b'...")
                    fallback_comp = client.chat.completions.create(
                        model="qwen/qwen3.8-27b",
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt_text},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{cleaned_b64}"
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature=0.4,
                        max_completion_tokens=2048
                    )
                    raw_fallback = fallback_comp.choices[0].message.content or ""
                    return {
                        "success": True,
                        "answer": ai_service.strip_thinking_tags(raw_fallback),
                        "model_used": "qwen/qwen3.8-27b"
                    }
                except Exception as fe:
                    logger.error(f"Fallback vision model failed: {ai_service.sanitize_error(fe)}")

            raise RuntimeError(f"Screen vision analysis error: {ai_service.sanitize_error(e)}")

screen_service = ScreenService()

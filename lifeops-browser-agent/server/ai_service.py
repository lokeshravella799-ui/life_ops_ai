import re
import logging
from typing import List, Dict, Any, Optional
from groq import Groq
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LifeOpsAI_Service")

class AIService:
    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Optional[Groq]:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return None
        if self._client is None or self._client.api_key != api_key:
            self._client = Groq(api_key=api_key)
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(settings.GROQ_API_KEY)

    def strip_thinking_tags(self, text: str) -> str:
        """Removes internal reasoning/thinking tags (e.g. <think>...</think>) from output."""
        if not text:
            return ""
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)
        if "<think>" in cleaned.lower():
            parts = re.split(r"</think>", cleaned, flags=re.IGNORECASE)
            if len(parts) > 1:
                cleaned = "".join(parts[1:])
            else:
                cleaned = re.sub(r"<think>[\s\S]*", "", cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    def sanitize_error(self, err: Exception) -> str:
        msg = str(err)
        msg = re.sub(r"gsk_[0-9A-Za-z-_]{30,60}", "[REDACTED_GROQ_KEY]", msg)
        msg = re.sub(r"AIza[0-9A-Za-z-_]{30,40}", "[REDACTED_GEMINI_KEY]", msg)
        return msg

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.5
    ) -> str:
        """Generates conversational completion via Groq with error handling and think-tag removal."""
        if not self.client:
            raise ValueError("Groq API key is not configured. Please set GROQ_API_KEY in server/.env.")

        target_model = model or settings.GROQ_MODEL or "qwen/qwen3.6-27b"
        logger.info(f"Invoking Groq model '{target_model}' (max_tokens: {max_tokens})...")

        try:
            completion = self.client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens
            )
            raw_content = completion.choices[0].message.content or ""
            cleaned = self.strip_thinking_tags(raw_content)
            if not cleaned and raw_content:
                logger.warning("Thinking tags consumed entire token budget without final answer, trying fallback...")
                raise ValueError("Model output only contained internal thinking tags without final answer.")
            return cleaned
        except Exception as e:
            logger.error(f"Groq execution failed: {self.sanitize_error(e)}")
            # Attempt fallback models if primary fails
            fallback_models = ["groq/compound-mini", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
            for fm in fallback_models:
                if fm != target_model:
                    try:
                        logger.info(f"Attempting fallback model '{fm}'...")
                        comp = self.client.chat.completions.create(
                            model=fm,
                            messages=messages,
                            temperature=temperature,
                            max_completion_tokens=min(max_tokens, 4096)
                        )
                        raw = comp.choices[0].message.content or ""
                        cleaned_fallback = self.strip_thinking_tags(raw)
                        if cleaned_fallback:
                            return cleaned_fallback
                    except Exception as fe:
                        logger.warning(f"Fallback model '{fm}' failed: {self.sanitize_error(fe)}")
            raise RuntimeError(f"AI service error: {self.sanitize_error(e)}")

    async def analyze_page(
        self,
        url: str,
        title: str,
        content: str,
        question: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyzes extracted webpage content and answers specific or general questions."""
        system_prompt = """You are LifeOps AI Browser Companion, an intelligent web assistant.
Your goal is to provide crystal-clear, structured, and insightful analysis of the webpage provided.

INSTRUCTIONS:
1. Base your answer directly on the provided webpage content.
2. If the user asks a specific question, answer it directly using facts and context from the page.
3. If no specific question is asked (or if asked to summarize/analyze), provide:
   - **Executive Summary**: 2-3 sentence high-level overview.
   - **Key Takeaways & Core Concepts**: Bulleted breakdown of essential insights.
   - **Important Details / Numbers / Data**: Notable facts, statistics, or quotes.
   - **Actionable Insights / Next Steps**: What the reader should know or do next.
4. Format using clean Markdown with bolding, lists, and headers (##, ###).
5. Never invent or hallucinate information not supported by the webpage content."""

        user_prompt = f"""WEBPAGE CONTEXT:
URL: {url}
Title: {title}

PAGE CONTENT:
{content[:25000]}

USER REQUEST:
{question or 'Analyze and summarize this page with key takeaways.'}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        answer = await self.generate_chat_response(messages=messages, max_tokens=4096)
        return {
            "success": True,
            "answer": answer,
            "metadata": {
                "url": url,
                "title": title,
                "content_length": len(content)
            }
        }

    async def analyze_selection(
        self,
        selected_text: str,
        page_title: Optional[str] = None,
        page_url: Optional[str] = None,
        action: Optional[str] = None,
        custom_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyzes highlighted text on a webpage."""
        system_prompt = """You are LifeOps AI Browser Companion.
Explain, summarize, simplify, or rewrite the selected text clearly and concisely.
Always preserve the core meaning while delivering actionable, easy-to-understand explanations."""

        action_instruction = custom_question or action or "Explain this in simple terms with examples."

        user_prompt = f"""PAGE CONTEXT:
Title: {page_title or 'Unknown'}
URL: {page_url or 'Unknown'}

SELECTED TEXT:
\"\"\"
{selected_text}
\"\"\"

TASK:
{action_instruction}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        answer = await self.generate_chat_response(messages=messages, max_tokens=2048)
        return {
            "success": True,
            "answer": answer,
            "selection_length": len(selected_text)
        }

    async def in_page_chat(
        self,
        messages_history: List[Dict[str, str]],
        page_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Conversational chat with in-page context awareness."""
        system_prompt = """You are LifeOps AI, the user's browser-side personal AI assistant.
You have access to the user's active webpage context. Answer questions conversationally, accurately, and helpful.
Use Markdown formatting."""

        if page_context and page_context.get("content"):
            title = page_context.get("title", "Active Tab")
            url = page_context.get("url", "")
            raw_text = page_context.get("content", "")[:20000]
            system_prompt += f"\n\nCURRENT WEBPAGE CONTEXT:\nTitle: {title}\nURL: {url}\nContent Snippet:\n{raw_text}"

        formatted_messages = [{"role": "system", "content": system_prompt}]
        for m in messages_history[-10:]:
            formatted_messages.append({
                "role": m.get("role", "user"),
                "content": m.get("content", "")
            })

        answer = await self.generate_chat_response(messages=formatted_messages, max_tokens=4096)
        return {
            "success": True,
            "message": answer
        }

ai_service = AIService()

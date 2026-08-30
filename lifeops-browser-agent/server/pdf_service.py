import io
import logging
from typing import Dict, Any, Optional, List
from pypdf import PdfReader
from ai_service import ai_service

logger = logging.getLogger("LifeOpsPDFService")

class PDFService:
    def __init__(self):
        pass

    def extract_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """Extracts plain text from raw PDF bytes."""
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages_text.append(f"--- [Page {i+1}] ---\n{txt.strip()}")
            return "\n\n".join(pages_text)
        except Exception as e:
            logger.error(f"Failed to parse PDF bytes: {e}")
            raise ValueError(f"Could not parse PDF content: {str(e)}")

    def chunk_text(self, text: str, max_chunk_chars: int = 16000) -> List[str]:
        """Splits long text into manageable chunks preserving paragraph boundaries."""
        if len(text) <= max_chunk_chars:
            return [text]

        chunks = []
        paragraphs = text.split("\n\n")
        current_chunk = []
        current_len = 0

        for p in paragraphs:
            if current_len + len(p) > max_chunk_chars and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = [p]
                current_len = len(p)
            else:
                current_chunk.append(p)
                current_len += len(p)

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks

    async def summarize_pdf(
        self,
        pdf_text: Optional[str] = None,
        pdf_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        custom_instructions: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates structured, multi-section summary of PDF content."""
        if not pdf_text and not pdf_bytes:
            raise ValueError("No PDF text or file data provided.")

        full_text = pdf_text or ""
        if pdf_bytes:
            extracted = self.extract_text_from_bytes(pdf_bytes)
            full_text = extracted if extracted.strip() else full_text

        if not full_text.strip():
            raise ValueError("The PDF document does not contain extractable text (it may be a scanned image).")

        chunks = self.chunk_text(full_text)
        logger.info(f"Processing PDF '{filename or 'Document'}' ({len(full_text)} chars, {len(chunks)} chunks)...")

        system_prompt = """You are LifeOps AI PDF Intelligence.
Your task is to produce a comprehensive, structured, and insightful summary of the provided PDF document.

STRUCTURE YOUR SUMMARY WITH THESE EXACT SECTIONS:
## 📄 Executive Summary
(2-3 clear paragraphs providing the overarching thesis, goal, and major findings)

## 📌 Core Topics & Key Insights
(Bullet points detailing the central themes, methodologies, or arguments)

## 📊 Key Data, Facts & Metrics
(Notable statistics, dates, financial figures, or empirical evidence)

## 🎯 Conclusions & Takeaways
(What the document proves or recommends)

## ⚡ Action Items / Next Steps
(Concrete action points, implications, or follow-ups)

Use clean Markdown formatting. Never invent facts not present in the document."""

        if len(chunks) == 1:
            user_prompt = f"PDF FILENAME: {filename or 'Document.pdf'}\n\nDOCUMENT TEXT:\n{chunks[0]}\n\nINSTRUCTIONS:\n{custom_instructions or 'Provide a full structured summary.'}"
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            summary = await ai_service.generate_chat_response(messages=messages, max_tokens=4096)
        else:
            # Hierarchical multi-chunk summarization
            chunk_summaries = []
            for idx, chunk in enumerate(chunks):
                logger.info(f"Summarizing PDF chunk {idx+1}/{len(chunks)}...")
                p = f"Summarize key facts, metrics, and arguments from Part {idx+1} of the document:\n\n{chunk}"
                res = await ai_service.generate_chat_response(
                    messages=[
                        {"role": "system", "content": "Extract and summarize all important facts, arguments, and data points."},
                        {"role": "user", "content": p}
                    ],
                    max_tokens=1500
                )
                chunk_summaries.append(f"### Summary Part {idx+1}:\n{res}")

            combined_summary_input = "\n\n".join(chunk_summaries)
            final_prompt = f"PDF FILENAME: {filename or 'Document.pdf'}\n\nSUMMARIZED PARTS:\n{combined_summary_input}\n\nINSTRUCTIONS:\nSynthesize a final, structured summary following the required sections."
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": final_prompt}
            ]
            summary = await ai_service.generate_chat_response(messages=messages, max_tokens=4096)

        return {
            "success": True,
            "filename": filename or "document.pdf",
            "summary": summary,
            "character_count": len(full_text),
            "chunks_processed": len(chunks)
        }

pdf_service = PDFService()

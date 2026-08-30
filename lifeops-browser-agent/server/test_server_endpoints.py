import io
import sys
import time
import base64
import requests
from pypdf import PdfWriter

# Ensure stdout handles UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SERVER_URL = "http://127.0.0.1:8765"

def safe_print(text: str):
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", errors="replace").decode("ascii"))

def create_sample_image_base64():
    """Generates a small valid 100x100 PNG image in base64."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (160, 100), color=(240, 240, 245))
    d = ImageDraw.Draw(img)
    d.text((10, 10), "LifeOps AI Test Graphic", fill=(30, 30, 40))
    d.rectangle([(10, 30), (140, 70)], outline=(99, 102, 241), width=2)
    d.text((20, 45), "Status: Active", fill=(16, 185, 129))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def run_tests():
    safe_print("\n================================================================")
    safe_print("   LIFEOPS AI LOCAL SERVER - ENDPOINT VERIFICATION SUITE       ")
    safe_print("================================================================\n")

    # TEST 1: /health
    safe_print("--- [TEST 1] GET /health ---")
    try:
        r = requests.get(f"{SERVER_URL}/health", timeout=15)
        safe_print(f"Status: {r.status_code}")
        safe_print(f"Response: {r.json()}")
        assert r.status_code == 200
        assert r.json().get("status") == "ONLINE"
        assert r.json().get("groq_configured") is True
        safe_print("[PASS] TEST 1 PASSED: /health is ONLINE\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 1 FAILED: {e}\n")
        return

    time.sleep(1)

    # TEST 2: /analyze-page
    safe_print("--- [TEST 2] POST /analyze-page ---")
    try:
        payload = {
            "url": "https://example.com/datacenter-architecture",
            "title": "Modern Hyperscale Data Centers",
            "content": """Hyperscale data centers are massive industrial facilities housing hundreds of thousands of servers. 
            Key systems include:
            1. Power Delivery: Redundant utility feeds, UPS battery backup systems, and diesel/gas backup generators to achieve 99.999% uptime.
            2. Thermal Management: Liquid direct-to-chip cooling, hot/cold aisle containment, and evaporative economizers designed to lower PUE below 1.15.
            3. Networking: 400GbE and 800GbE Spine-and-Leaf Clos networks providing high bisection bandwidth for AI and distributed computing workloads.
            4. Physical Security: Biometric access, multi-tier mantrap entry systems, and 24/7 security operations centers.""",
            "question": "What are the cooling and power systems used in these data centers?"
        }
        r = requests.post(f"{SERVER_URL}/analyze-page", json=payload, timeout=45)
        safe_print(f"Status: {r.status_code}")
        ans = r.json().get("answer", "")
        safe_print(f"AI Answer Preview ({len(ans)} chars):\n{ans[:350]}...\n")
        assert r.status_code == 200
        assert len(ans) > 50
        safe_print("[PASS] TEST 2 PASSED: /analyze-page succeeded\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 2 FAILED: {e}\n")

    time.sleep(2)

    # TEST 3: /analyze-selection
    safe_print("--- [TEST 3] POST /analyze-selection ---")
    try:
        payload = {
            "selectedText": "Quantum superposition allows a qubit to exist in a linear combination of |0> and |1> states simultaneously.",
            "pageTitle": "Quantum Computing Fundamentals",
            "pageUrl": "https://example.com/quantum",
            "action": "Explain this in simple terms with an analogy"
        }
        r = requests.post(f"{SERVER_URL}/analyze-selection", json=payload, timeout=45)
        safe_print(f"Status: {r.status_code}")
        ans = r.json().get("answer", "")
        safe_print(f"AI Answer Preview ({len(ans)} chars):\n{ans[:300]}...\n")
        assert r.status_code == 200
        assert len(ans) > 30
        safe_print("[PASS] TEST 3 PASSED: /analyze-selection succeeded\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 3 FAILED: {e}\n")

    time.sleep(2)

    # TEST 4: /analyze-screen (Vision AI)
    safe_print("--- [TEST 4] POST /analyze-screen (Vision AI) ---")
    try:
        b64_img = create_sample_image_base64()
        payload = {
            "imageBase64": b64_img,
            "question": "What text and status are shown in this test screenshot graphic?",
            "pageTitle": "Dashboard Screenshot",
            "pageUrl": "http://localhost:5173"
        }
        r = requests.post(f"{SERVER_URL}/analyze-screen", json=payload, timeout=45)
        safe_print(f"Status: {r.status_code}")
        ans = r.json().get("answer", "")
        safe_print(f"Vision Answer Preview ({len(ans)} chars):\n{ans[:300]}...\n")
        assert r.status_code == 200
        assert len(ans) > 20
        safe_print("[PASS] TEST 4 PASSED: /analyze-screen vision completed\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 4 FAILED: {e}\n")

    time.sleep(2)

    # TEST 5: /summarize-pdf
    safe_print("--- [TEST 5] POST /summarize-pdf ---")
    try:
        payload = {
            "filename": "quarterly_earnings_report.pdf",
            "text": """Company Q3 Earnings Report
            Revenue: $14.2 Billion, an increase of 28% year-over-year.
            Cloud Infrastructure Division: Generated $6.1 Billion, driven by enterprise AI workload adoption.
            Operating Expenses: $4.8 Billion. Net Operating Margin: 34%.
            Outlook: Management raises FY2026 revenue guidance to $58-$60 Billion.
            Risks: Supply chain lead times for high-density GPUs and rising power utility tariffs."""
        }
        r = requests.post(f"{SERVER_URL}/summarize-pdf", json=payload, timeout=45)
        safe_print(f"Status: {r.status_code}")
        summary = r.json().get("summary", "")
        safe_print(f"PDF Summary Preview ({len(summary)} chars):\n{summary[:400]}...\n")
        assert r.status_code == 200
        assert len(summary) > 100
        safe_print("[PASS] TEST 5 PASSED: /summarize-pdf succeeded\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 5 FAILED: {e}\n")

    time.sleep(2)

    # TEST 6: /chat (In-page conversational)
    safe_print("--- [TEST 6] POST /chat ---")
    try:
        payload = {
            "message": "Give me 3 practical tips based on this page.",
            "pageContext": {
                "title": "Time Management for Engineers",
                "url": "https://example.com/productivity",
                "content": "Deep work blocks of 90 minutes, minimizing context switching, and automated ticket prioritization."
            }
        }
        r = requests.post(f"{SERVER_URL}/chat", json=payload, timeout=45)
        safe_print(f"Status: {r.status_code}")
        ans = r.json().get("message", "")
        safe_print(f"Chat Answer Preview ({len(ans)} chars):\n{ans[:300]}...\n")
        assert r.status_code == 200
        assert len(ans) > 50
        safe_print("[PASS] TEST 6 PASSED: /chat succeeded\n")
    except Exception as e:
        safe_print(f"[FAIL] TEST 6 FAILED: {e}\n")

    safe_print("================================================================")
    safe_print("      ALL LOCAL PYTHON SERVER ENDPOINT TESTS COMPLETED!         ")
    safe_print("================================================================\n")

if __name__ == "__main__":
    run_tests()

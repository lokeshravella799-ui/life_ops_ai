// LifeOps AI Browser Agent - Popup Controller
const SERVER_URL = "http://127.0.0.1:8765";

// DOM Elements
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const offlineBanner = document.getElementById("offlineBanner");
const activePageTitle = document.getElementById("activePageTitle");
const analyzePageCard = document.getElementById("analyzePageCard");
const seeScreenCard = document.getElementById("seeScreenCard");
const summarizePdfCard = document.getElementById("summarizePdfCard");
const openSidepanelBtn = document.getElementById("openSidepanelBtn");
const promptChips = document.querySelectorAll(".chip");
const responseArea = document.getElementById("responseArea");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const loadingText = document.getElementById("loadingText");
const outputState = document.getElementById("outputState");
const responseBadge = document.getElementById("responseBadge");
const responseContent = document.getElementById("responseContent");
const copyBtn = document.getElementById("copyBtn");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let activeTab = null;
let cachedPageContent = null;
let currentRawResponse = "";

// Initialize on Load
document.addEventListener("DOMContentLoaded", async () => {
  await checkServerHealth();
  await loadActiveTabContext();
  checkPendingSelection();
  setupEventListeners();
});

// 1. Health Check
async function checkServerHealth() {
  try {
    const res = await fetch(`${SERVER_URL}/health`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      statusBadge.className = "status-badge online";
      statusText.textContent = "ONLINE";
      offlineBanner.style.display = "none";
      return true;
    } else {
      throw new Error("Server status code: " + res.status);
    }
  } catch (err) {
    statusBadge.className = "status-badge offline";
    statusText.textContent = "OFFLINE";
    offlineBanner.style.display = "block";
    return false;
  }
}

// 2. Active Tab Context
async function loadActiveTabContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      activePageTitle.textContent = activeTab.title || activeTab.url || "Active Webpage";
      activePageTitle.title = activeTab.url || "";
    } else {
      activePageTitle.textContent = "No active tab detected";
    }
  } catch (e) {
    activePageTitle.textContent = "Active Tab";
  }
}

// 3. Check for text selection
function checkPendingSelection() {
  chrome.storage.local.get(["pendingSelection", "latestSelection"], (res) => {
    const sel = res.pendingSelection || res.latestSelection;
    if (sel && sel.text && Date.now() - (sel.timestamp || 0) < 60000) {
      // Prompt user about selection
      userInput.value = `Explain this: "${sel.text.slice(0, 100)}..."`;
      // Clear pending selection
      chrome.storage.local.remove(["pendingSelection"]);
    }
  });
}

// 4. Event Listeners
function setupEventListeners() {
  // Page Analysis
  analyzePageCard.addEventListener("click", () => {
    handlePageAnalysis("Analyze and summarize this page with key takeaways.");
  });

  // Screen Understanding
  seeScreenCard.addEventListener("click", () => {
    handleScreenAnalysis();
  });

  // PDF Summarization
  summarizePdfCard.addEventListener("click", () => {
    handlePdfSummarization();
  });

  // Open Side Panel
  openSidepanelBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "OPEN_SIDEPANEL" });
    window.close();
  });

  // Quick Chips
  promptChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      handlePageAnalysis(prompt);
    });
  });

  // Input & Send
  sendBtn.addEventListener("click", () => {
    handleUserSendMessage();
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserSendMessage();
    }
  });

  // Copy Response
  copyBtn.addEventListener("click", () => {
    if (currentRawResponse) {
      navigator.clipboard.writeText(currentRawResponse);
      copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 2000);
    }
  });
}

// ------------------------------------------------------------------------------
// Action Handlers
// ------------------------------------------------------------------------------

async function getPageContent() {
  if (cachedPageContent) return cachedPageContent;
  if (!activeTab || !activeTab.id) return null;

  try {
    const res = await chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_PAGE_CONTENT" });
    if (res && res.success && res.data) {
      cachedPageContent = res.data;
      return cachedPageContent;
    }
  } catch (err) {
    console.warn("Could not extract via message, fallback to tab info:", err);
  }

  return {
    title: activeTab.title || "",
    url: activeTab.url || "",
    content: `Webpage: ${activeTab.title} (${activeTab.url})`
  };
}

async function handlePageAnalysis(customPrompt = null) {
  const isOnline = await checkServerHealth();
  if (!isOnline) return;

  setLoading(true, "Reading webpage and generating AI insights...");
  responseBadge.textContent = "Page Analysis";

  try {
    const page = await getPageContent();
    const payload = {
      url: page.url || activeTab.url || "",
      title: page.title || activeTab.title || "",
      content: page.content || page.title || "Webpage Content",
      question: customPrompt || "Analyze and summarize this page."
    };

    const res = await fetch(`${SERVER_URL}/analyze-page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Server analysis error");
    }

    const data = await res.json();
    renderResponse(data.answer || "No response received.");
  } catch (err) {
    renderResponse(`⚠️ **Analysis Error**\n\n${err.message}`);
  } finally {
    setLoading(false);
  }
}

async function handleScreenAnalysis() {
  const isOnline = await checkServerHealth();
  if (!isOnline) return;

  setLoading(true, "Capturing tab screen & running Vision AI analysis...");
  responseBadge.textContent = "Screen Vision";

  try {
    // Explicit user permission capture
    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, async (captureRes) => {
      if (!captureRes || !captureRes.success || !captureRes.dataUrl) {
        renderResponse(`⚠️ **Screen Capture Failed**\n\n${captureRes?.error || "Could not capture active tab screen."}`);
        setLoading(false);
        return;
      }

      try {
        const payload = {
          imageBase64: captureRes.dataUrl,
          question: userInput.value.trim() || "What is displayed on this screen? Explain key visual elements, errors, or forms.",
          pageTitle: activeTab?.title || "",
          pageUrl: activeTab?.url || ""
        };

        const res = await fetch(`${SERVER_URL}/analyze-screen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Vision analysis error");
        }

        const data = await res.json();
        renderResponse(data.answer || "Screen analyzed successfully.");
        userInput.value = "";
      } catch (postErr) {
        renderResponse(`⚠️ **Vision Error**\n\n${postErr.message}`);
      } finally {
        setLoading(false);
      }
    });
  } catch (err) {
    renderResponse(`⚠️ **Capture Error**\n\n${err.message}`);
    setLoading(false);
  }
}

async function handlePdfSummarization() {
  const isOnline = await checkServerHealth();
  if (!isOnline) return;

  setLoading(true, "Extracting and summarizing PDF document...");
  responseBadge.textContent = "PDF Intelligence";

  try {
    const isPdfTab = activeTab?.url?.toLowerCase().endsWith('.pdf') || 
                     activeTab?.title?.toLowerCase().endsWith('.pdf');

    if (isPdfTab && activeTab.url.startsWith('http')) {
      // Send URL or ask server to process
      const res = await fetch(`${SERVER_URL}/summarize-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeTab.title || "document.pdf",
          text: `PDF URL: ${activeTab.url}\nTitle: ${activeTab.title}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        renderResponse(data.summary);
        return;
      }
    }

    // Direct file upload fallback for restricted local/browser PDFs
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf";
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        setLoading(false);
        return;
      }

      setLoading(true, `Uploading & analyzing "${file.name}"...`);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${SERVER_URL}/summarize-pdf`, {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "PDF processing failed");
        }

        const data = await res.json();
        renderResponse(data.summary);
      } catch (uploadErr) {
        renderResponse(`⚠️ **PDF Summarization Error**\n\n${uploadErr.message}`);
      } finally {
        setLoading(false);
      }
    };
    fileInput.click();

  } catch (err) {
    renderResponse(`⚠️ **PDF Error**\n\n${err.message}`);
    setLoading(false);
  }
}

async function handleUserSendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const isOnline = await checkServerHealth();
  if (!isOnline) return;

  setLoading(true, "Thinking...");
  responseBadge.textContent = "AI Response";

  try {
    const page = await getPageContent();
    const payload = {
      message: text,
      pageContext: {
        title: page?.title || activeTab?.title || "",
        url: page?.url || activeTab?.url || "",
        content: page?.content || ""
      }
    };

    const res = await fetch(`${SERVER_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Chat error");
    }

    const data = await res.json();
    renderResponse(data.message);
    userInput.value = "";
  } catch (err) {
    renderResponse(`⚠️ **Chat Error**\n\n${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ------------------------------------------------------------------------------
// UI Helpers & Markdown Parser
// ------------------------------------------------------------------------------

function setLoading(isLoading, text = "Analyzing with local Groq AI...") {
  if (isLoading) {
    emptyState.style.display = "none";
    outputState.style.display = "none";
    loadingState.style.display = "flex";
    loadingText.textContent = text;
    sendBtn.disabled = true;
  } else {
    loadingState.style.display = "none";
    sendBtn.disabled = false;
  }
}

function renderResponse(markdownText) {
  currentRawResponse = markdownText;
  emptyState.style.display = "none";
  loadingState.style.display = "none";
  outputState.style.display = "block";
  responseContent.innerHTML = parseMarkdownToHtml(markdownText);
  responseArea.scrollTop = 0;
}

function parseMarkdownToHtml(md) {
  if (!md) return "";

  let html = md
    // Escape HTML tags to prevent XSS
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks with syntax highlighting container
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
    // Numbered lists
    .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li><strong>$1.</strong> $2</li>')
    // Paragraphs
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`
    .replace(/<p><\/p>/g, '')
    .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\s*<ul>/g, '');
}

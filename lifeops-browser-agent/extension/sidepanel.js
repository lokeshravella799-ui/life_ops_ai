// LifeOps AI Browser Agent - Side Panel Controller
const SERVER_URL = "http://127.0.0.1:8765";

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const activePageDomain = document.getElementById("activePageDomain");
const refreshContextBtn = document.getElementById("refreshContextBtn");
const chatHistory = document.getElementById("chatHistory");
const clearChatBtn = document.getElementById("clearChatBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeSunIcon = document.getElementById("themeSunIcon");
const themeMoonIcon = document.getElementById("themeMoonIcon");
const spAnalyzePageBtn = document.getElementById("spAnalyzePageBtn");
const spSeeScreenBtn = document.getElementById("spSeeScreenBtn");
const spExplainSimplyBtn = document.getElementById("spExplainSimplyBtn");
const spUserInput = document.getElementById("spUserInput");
const spSendBtn = document.getElementById("spSendBtn");

let activeTab = null;
let conversationHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  await checkHealth();
  await updateActiveTab();
  setupEvents();
});

// Theme Management
function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.classList.add("light-theme");
    if (themeSunIcon) themeSunIcon.style.display = "none";
    if (themeMoonIcon) themeMoonIcon.style.display = "block";
    if (themeToggleBtn) themeToggleBtn.title = "Switch to Dark Mode";
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.body.classList.remove("light-theme");
    if (themeSunIcon) themeSunIcon.style.display = "block";
    if (themeMoonIcon) themeMoonIcon.style.display = "none";
    if (themeToggleBtn) themeToggleBtn.title = "Switch to Light Mode";
  }
}

async function initTheme() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get(["lifeops_theme"]);
      applyTheme(res.lifeops_theme || "dark");
    } else {
      const saved = localStorage.getItem("lifeops_theme") || "dark";
      applyTheme(saved);
    }
  } catch {
    applyTheme("dark");
  }
}

async function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const newTheme = isLight ? "dark" : "light";
  applyTheme(newTheme);
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ lifeops_theme: newTheme });
    }
    localStorage.setItem("lifeops_theme", newTheme);
  } catch (e) {
    console.warn("Theme save error:", e);
  }
}

async function checkHealth() {
  try {
    const res = await fetch(`${SERVER_URL}/health`);
    if (res.ok) {
      statusBadge.className = "status-badge online";
      statusText.textContent = "ONLINE";
    } else {
      throw new Error();
    }
  } catch (e) {
    statusBadge.className = "status-badge offline";
    statusText.textContent = "OFFLINE";
  }
}

async function updateActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      try {
        const urlObj = new URL(activeTab.url);
        activePageDomain.textContent = `${urlObj.hostname} — ${activeTab.title || 'Tab'}`;
      } catch {
        activePageDomain.textContent = activeTab.title || "Active Webpage";
      }
    }
  } catch (e) {
    activePageDomain.textContent = "Active Tab";
  }
}

function setupEvents() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  refreshContextBtn.addEventListener("click", () => {
    updateActiveTab();
    checkHealth();
  });

  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML = `
      <div class="chat-bubble assistant">
        <div class="ai-card-header">
          <div class="ai-card-title-group">
            <span class="sparkle-icon">✦</span>
            <span class="ai-card-title">Conversation Cleared</span>
          </div>
        </div>
        <p class="ai-card-intro">How can I assist you with this page?</p>
      </div>`;
    conversationHistory = [];
  });

  spAnalyzePageBtn.addEventListener("click", () => {
    sendUserPrompt("Summarize this webpage and list the top 5 key takeaways.");
  });

  spExplainSimplyBtn.addEventListener("click", () => {
    sendUserPrompt("Explain the core ideas on this page simply, as if I'm a beginner.");
  });

  spSeeScreenBtn.addEventListener("click", () => {
    handleVisionScreen();
  });

  spSendBtn.addEventListener("click", () => {
    const text = spUserInput.value.trim();
    if (text) {
      sendUserPrompt(text);
      spUserInput.value = "";
    }
  });

  spUserInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = spUserInput.value.trim();
      if (text) {
        sendUserPrompt(text);
        spUserInput.value = "";
      }
    }
  });
}

function appendMessage(role, content, isMarkdown = true) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = isMarkdown ? parseMarkdown(content) : content;
  }
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return bubble;
}

async function getPageText() {
  if (!activeTab || !activeTab.id) return "";
  try {
    const res = await chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_PAGE_CONTENT" });
    if (res && res.success && res.data) {
      return res.data.content || "";
    }
  } catch (e) {
    console.warn("Could not extract page text:", e);
  }
  return "";
}

async function sendUserPrompt(promptText) {
  appendMessage("user", promptText);
  conversationHistory.push({ role: "user", content: promptText });

  const loadingBubble = appendMessage("assistant", `<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Analyzing...`, false);

  try {
    const pageText = await getPageText();
    const payload = {
      messages: conversationHistory,
      pageContext: {
        title: activeTab?.title || "",
        url: activeTab?.url || "",
        content: pageText
      }
    };

    const res = await fetch(`${SERVER_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error communicating with local server");
    }

    const data = await res.json();
    loadingBubble.innerHTML = parseMarkdown(data.message);
    conversationHistory.push({ role: "assistant", content: data.message });
  } catch (err) {
    loadingBubble.innerHTML = `<span style="color: var(--danger);">⚠️ ${err.message}</span>`;
  }
}

async function handleVisionScreen() {
  appendMessage("user", "📸 See My Screen");
  const loadingBubble = appendMessage("assistant", `<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Capturing screen & analyzing visuals...`, false);

  chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, async (captureRes) => {
    if (!captureRes || !captureRes.success || !captureRes.dataUrl) {
      loadingBubble.innerHTML = `<span style="color: var(--danger);">⚠️ Screen capture failed.</span>`;
      return;
    }

    try {
      const payload = {
        imageBase64: captureRes.dataUrl,
        question: "Explain what is on my screen and point out key elements or errors.",
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
      loadingBubble.innerHTML = parseMarkdown(data.answer);
      conversationHistory.push({ role: "assistant", content: data.answer });
    } catch (err) {
      loadingBubble.innerHTML = `<span style="color: var(--danger);">⚠️ ${err.message}</span>`;
    }
  });
}

function parseMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`
    .replace(/<p><\/p>/g, '')
    .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\s*<ul>/g, '');
}

// LifeOps AI Browser Agent - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menus
  chrome.contextMenus.create({
    id: "lifeops_ask_selection",
    title: "Ask LifeOps AI about '%s'",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "lifeops_analyze_page",
    title: "Analyze This Page with LifeOps AI",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "lifeops_summarize_pdf",
    title: "Summarize PDF with LifeOps AI",
    contexts: ["page", "link"]
  });

  console.log("LifeOps AI Extension service worker installed successfully.");
});

// Handle Context Menu Actions
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === "lifeops_ask_selection" && info.selectionText) {
    // Open Side Panel if available, or send message to content script
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (e) {
      console.warn("Could not open sidePanel:", e);
    }

    // Save selection in storage for popup / sidepanel
    chrome.storage.local.set({
      pendingSelection: {
        text: info.selectionText,
        pageTitle: tab.title,
        pageUrl: tab.url,
        timestamp: Date.now()
      }
    });
  } else if (info.menuItemId === "lifeops_analyze_page" || info.menuItemId === "lifeops_summarize_pdf") {
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (e) {
      console.warn("Could not open sidePanel:", e);
    }
  }
});

// Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_VISIBLE_TAB") {
    // Explicit screen capture triggered by user action
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 85 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === "OPEN_SIDEPANEL") {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      const tabId = sender.tab ? sender.tab.id : request.tabId;
      if (tabId) {
        chrome.sidePanel.open({ tabId }).then(() => {
          sendResponse({ success: true });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      } else {
        chrome.windows.getCurrent((win) => {
          chrome.sidePanel.open({ windowId: win.id }).then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            sendResponse({ success: false, error: err.message });
          });
        });
      }
      return true;
    } else {
      sendResponse({ success: false, error: "SidePanel API is not supported in this Chrome version." });
    }
  }

  if (request.action === "GET_ACTIVE_TAB_INFO") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        sendResponse({ success: true, tab: tabs[0] });
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true;
  }
});

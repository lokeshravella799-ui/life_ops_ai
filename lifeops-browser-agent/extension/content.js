// LifeOps AI Browser Agent - Content Script

(function () {
  /**
   * Extracts clean, structured visible text from the page, stripping noise and navigation clutter.
   */
  function extractCleanPageContent() {
    // Check for PDF in embed or object tag
    const isPdfUrl = window.location.href.toLowerCase().endsWith('.pdf') || 
                     window.location.pathname.toLowerCase().endsWith('.pdf') ||
                     document.contentType === 'application/pdf';

    if (isPdfUrl) {
      return {
        isPdf: true,
        title: document.title || "PDF Document",
        url: window.location.href,
        content: "[PDF Document Detected: Use PDF Summarizer tool or upload to parse full text.]"
      };
    }

    // Clone the body to avoid mutating the active DOM
    const clone = document.body.cloneNode(true);

    // List of selector tags to discard
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
      'nav', 'footer', 'header', 'aside',
      '.ad', '.advertisement', '.social-share', '.cookie-banner',
      '#cookie-banner', '#comments', '.comments'
    ];

    unwantedSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Remove hidden elements
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        el.remove();
      }
    });

    // Prefer main content containers if present
    const mainContent = clone.querySelector('main, article, [role="main"], #main-content, #content, .post-content');
    const targetNode = mainContent || clone;

    // Extract text with clean paragraph spacing
    let text = targetNode.innerText || targetNode.textContent || "";
    
    // Normalize excessive newlines and whitespace
    text = text.replace(/\r\n/g, '\n')
               .replace(/\n{3,}/g, '\n\n')
               .replace(/[ \t]+/g, ' ')
               .trim();

    return {
      isPdf: false,
      title: document.title || "Webpage",
      url: window.location.href,
      content: text.slice(0, 35000),
      wordCount: text.split(/\s+/).filter(Boolean).length
    };
  }

  /**
   * Retrieves currently selected text on page
   */
  function getSelectionInfo() {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    return {
      selectedText: text,
      pageTitle: document.title,
      pageUrl: window.location.href
    };
  }

  // Listen for messages from extension popup or background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_PAGE_CONTENT") {
      try {
        const pageData = extractCleanPageContent();
        sendResponse({ success: true, data: pageData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === "GET_SELECTED_TEXT") {
      try {
        const selData = getSelectionInfo();
        sendResponse({ success: true, data: selData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === "CHECK_IS_PDF") {
      const isPdf = window.location.href.toLowerCase().endsWith('.pdf') || 
                    window.location.pathname.toLowerCase().endsWith('.pdf') ||
                    document.contentType === 'application/pdf';
      sendResponse({ isPdf, url: window.location.href });
      return true;
    }
  });

  // Track selection changes for fast contextual access
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 5 && sel.length < 5000) {
      chrome.storage.local.set({
        latestSelection: {
          text: sel,
          pageTitle: document.title,
          pageUrl: window.location.href,
          timestamp: Date.now()
        }
      });
    }
  });
})();

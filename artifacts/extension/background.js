const API_BASE = "http://localhost:5000/api";

// Listen for messages from content.js and popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "API_REQUEST") {
    const { endpoint, method = "GET", body = null, token = null } = request.data;
    
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })
      .then(async (response) => {
        const text = await response.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // not JSON
        }
        sendResponse({ status: response.status, data: json || text });
      })
      .catch((error) => {
        sendResponse({ status: 500, error: error.message });
      });

    return true; // Keep message port open for async response
  }
});

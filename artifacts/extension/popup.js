const WEB_BASE = "http://localhost:5173";
const API_BASE = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  // Navigation buttons mapping
  const navMap = {
    "go-dashboard": "/",
    "go-seo": "/seo",
    "go-keywords": "/keywords",
    "go-bulk": "/bulk",
    "go-experiments": "/experiments",
    "go-ai": "/ai"
  };

  Object.entries(navMap).forEach(([id, route]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        chrome.tabs.create({ url: `${WEB_BASE}${route}` });
      });
    }
  });

  // Verify connection status
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  fetch(`${API_BASE}/healthz`)
    .then((res) => {
      if (res.ok) {
        statusDot.style.background = "#10b981";
        statusDot.style.boxShadow = "0 0 8px #10b981";
        statusText.textContent = "Connected to API Server";
      } else {
        throw new Error();
      }
    })
    .catch(() => {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "0 0 8px #ef4444";
      statusText.textContent = "API Server Offline (Start Port 5000)";
    });
});

let currentUrl = "";

function injectNavTrigger() {
  if (document.getElementById("tubepulse-nav-btn")) return;
  const logo = document.querySelector("ytd-topbar-logo-renderer") || document.querySelector("#logo-icon-container");
  if (logo) {
    const btn = document.createElement("a");
    btn.id = "tubepulse-nav-btn";
    btn.className = "tubepulse-nav-trigger";
    btn.textContent = "TubePulse App";
    btn.href = "http://localhost:5173/";
    btn.target = "_blank";
    logo.parentNode.insertBefore(btn, logo.nextSibling);
  }
}

function injectWatchPanel(videoId) {
  const target = document.querySelector("#secondary-inner") || document.querySelector("#secondary");
  if (!target) return;
  if (document.getElementById("tubepulse-watch-panel")) return;

  const card = document.createElement("div");
  card.id = "tubepulse-watch-panel";
  card.className = "tubepulse-sidebar-card";
  card.innerHTML = `
    <div class="tubepulse-header">
      <div class="tubepulse-title">TubePulse Video Lytics</div>
      <div class="tubepulse-badge">Watch Page</div>
    </div>
    <div style="margin: 8px 0; font-size: 13px;">Analyzing Video ID: <code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px;">${videoId}</code></div>
    <div id="tubepulse-watch-loading" style="color: #94a3b8; font-size: 12px; margin: 10px 0;">Loading video metrics...</div>
    <div id="tubepulse-watch-content" style="display: none;">
      <div class="tubepulse-metric">
        <div class="tubepulse-metric-label" id="tubepulse-views-label">Views: -</div>
      </div>
      <div class="tubepulse-metric">
        <div class="tubepulse-metric-label">Suggested Tags (Extension Widget):</div>
        <div id="tubepulse-tags-list" style="margin-top: 6px;"></div>
      </div>
      <a href="http://localhost:5173/competitors" target="_blank" class="tubepulse-btn">Compare Competitors on Web App</a>
    </div>
  `;
  target.insertBefore(card, target.firstChild);

  chrome.runtime.sendMessage({
    type: "API_REQUEST",
    data: { endpoint: `/analytics/video?videoId=${videoId}&channelId=1` }
  }, (res) => {
    if (res && res.status === 200 && res.data) {
      const loadingEl = document.getElementById("tubepulse-watch-loading");
      if (loadingEl) loadingEl.style.display = "none";
      const contentEl = document.getElementById("tubepulse-watch-content");
      if (contentEl) contentEl.style.display = "block";
      const viewsEl = document.getElementById("tubepulse-views-label");
      if (viewsEl) viewsEl.textContent = `Simulated Views: ${res.data.views?.toLocaleString() || "-"}`;

      chrome.runtime.sendMessage({
        type: "API_REQUEST",
        data: { endpoint: `/keywords/suggestions?videoId=${videoId}` }
      }, (tagsRes) => {
        if (tagsRes && tagsRes.status === 200 && Array.isArray(tagsRes.data)) {
          const list = document.getElementById("tubepulse-tags-list");
          if (list) {
            list.innerHTML = "";
            tagsRes.data.slice(0, 5).forEach(item => {
              const span = document.createElement("span");
              span.className = "tubepulse-tag";
              span.textContent = item.tag;
              list.appendChild(span);
            });
          }
        }
      });
    }
  });
}

function injectSearchPanel(q) {
  const target = document.querySelector("#secondary-inner") || document.querySelector("#secondary") || document.querySelector("#container.ytd-search");
  if (!target) return;
  if (document.getElementById("tubepulse-search-panel")) return;

  const card = document.createElement("div");
  card.id = "tubepulse-search-panel";
  card.className = "tubepulse-sidebar-card";
  card.innerHTML = `
    <div class="tubepulse-header">
      <div class="tubepulse-title">TubePulse Keyword Explorer</div>
      <div class="tubepulse-badge">Search Page</div>
    </div>
    <div style="margin: 8px 0; font-size: 13px;">Query: <strong style="color: #818cf8;">${q}</strong></div>
    <div id="tubepulse-search-loading" style="color: #94a3b8; font-size: 12px; margin: 10px 0;">Calculating search scores...</div>
    <div id="tubepulse-search-content" style="display: none;">
      <div class="tubepulse-score-container">
        <div class="tubepulse-score-circle" id="tubepulse-keyword-score">-</div>
        <div class="tubepulse-score-label">Overall Keyword Score (Goodness)</div>
      </div>
      <div class="tubepulse-metric">
        <div class="tubepulse-metric-label" id="tubepulse-volume-label">Search Volume: -</div>
      </div>
      <div class="tubepulse-metric">
        <div class="tubepulse-metric-label">Competition Level:</div>
        <div class="tubepulse-bar-bg">
          <div class="tubepulse-bar-fill" id="tubepulse-competition-bar" style="width: 0%;"></div>
        </div>
      </div>
      <a href="http://localhost:5173/keywords?q=${encodeURIComponent(q)}" target="_blank" class="tubepulse-btn">Explore Deep Trends on Web App</a>
    </div>
  `;
  target.insertBefore(card, target.firstChild);

  chrome.runtime.sendMessage({
    type: "API_REQUEST",
    data: { endpoint: `/keywords/search?channelId=1&q=${encodeURIComponent(q)}` }
  }, (res) => {
    if (res && res.status === 200 && res.data) {
      const loadingEl = document.getElementById("tubepulse-search-loading");
      if (loadingEl) loadingEl.style.display = "none";
      const contentEl = document.getElementById("tubepulse-search-content");
      if (contentEl) contentEl.style.display = "block";
      const kw = res.data.keywords?.[0];
      if (kw) {
        const scoreEl = document.getElementById("tubepulse-keyword-score");
        if (scoreEl) {
          scoreEl.textContent = kw.overallScore;
          if (kw.overallScore > 70) scoreEl.style.borderColor = "#10b981";
          else if (kw.overallScore > 40) scoreEl.style.borderColor = "#f59e0b";
          else scoreEl.style.borderColor = "#ef4444";
        }
        const volEl = document.getElementById("tubepulse-volume-label");
        if (volEl) volEl.textContent = `Search Volume: ${kw.searchVolume?.toUpperCase()?.replace("_", " ") || "-"}`;
        const barEl = document.getElementById("tubepulse-competition-bar");
        if (barEl) barEl.style.width = `${kw.competitionScore || 0}%`;
      }
    }
  });
}

function checkRoute() {
  const url = window.location.href;
  const urlChanged = url !== currentUrl;

  if (urlChanged) {
    currentUrl = url;
    document.querySelectorAll(".tubepulse-sidebar-card").forEach(el => el.remove());
  }

  // Inject top navbar trigger
  injectNavTrigger();

  if (window.location.pathname === "/watch") {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId && !document.getElementById("tubepulse-watch-panel")) {
      injectWatchPanel(videoId);
    }
  }

  if (window.location.pathname === "/results") {
    const q = new URLSearchParams(window.location.search).get("search_query");
    if (q && !document.getElementById("tubepulse-search-panel")) {
      injectSearchPanel(q);
    }
  }
}

// Check every 1.5 seconds to handle Polymer SPA router changes
setInterval(checkRoute, 1500);
checkRoute();

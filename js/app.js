/* ── Application Initialization ── */

// Keyboard handlers
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("authModal").classList.contains("show")) submitAuth();
  if (e.key === "Escape") { closeAuthModal(); closeOverlay(); closeScenarioOverlay(); }
});

// Click-outside handlers
document.getElementById("revealOverlay").addEventListener("click", function (e) { if (e.target === this) closeOverlay(); });
document.getElementById("authModal").addEventListener("click", function (e) { if (e.target === this) closeAuthModal(); });
document.getElementById("scenarioOverlay").addEventListener("click", function (e) { if (e.target === this) closeScenarioOverlay(); });

// Initialize
applyLang();
initAuth();

// Track visit (every page load)
(async function trackVisit() {
  try {
    const r = await fetch(API + "/api/visit", { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = await r.json();
    const el = document.getElementById("visitCount");
    if (el) el.textContent = toFarsiNum(data.visits);
  } catch {}
})();

// Register Service Worker for fast loading
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Check for updates every 30 seconds
    setInterval(() => reg.update(), 30000);
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // New version available, reload
          window.location.reload();
        }
      });
    });
  }).catch(() => {});
}

// ── Keyboard Navigation ──
document.addEventListener('keydown', (e) => {
  // ESC to close modals
  if (e.key === 'Escape') {
    const authModal = document.getElementById('authModal');
    if (authModal && authModal.style.display !== 'none') {
      closeAuthModal();
    }
  }
});

// ── Focus management for nav ──
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.setAttribute('tabindex', '0');
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
});

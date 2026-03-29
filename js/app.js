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

// Track visit (once per session, not on every reload)
(async function trackVisit() {
  try {
    if (!sessionStorage.getItem("visited")) {
      const r = await fetch(API + "/api/visit", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await r.json();
      document.getElementById("visitCount").textContent = toFarsiNum(data.visits);
      sessionStorage.setItem("visited", "1");
    } else {
      const r = await fetch(API + "/api/visit");
      const data = await r.json();
      document.getElementById("visitCount").textContent = toFarsiNum(data.visits);
    }
  } catch {}
})();

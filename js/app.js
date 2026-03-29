/* ── Application Initialization ── */

// Keyboard handlers
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("authModal").classList.contains("show")) submitAuth();
  if (e.key === "Escape") { closeAuthModal(); closeOverlay(); }
});

// Click-outside handlers
document.getElementById("revealOverlay").addEventListener("click", function (e) { if (e.target === this) closeOverlay(); });
document.getElementById("authModal").addEventListener("click", function (e) { if (e.target === this) closeAuthModal(); });

// Initialize
applyLang();
initAuth();

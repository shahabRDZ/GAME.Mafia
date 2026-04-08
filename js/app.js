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

// ── Swipe-to-dismiss for modals/overlays ──
function initSwipeDismiss(boxSelector, closeFn) {
  const box = document.querySelector(boxSelector);
  if (!box) return;
  let startY = 0, currentY = 0, isDragging = false;
  box.addEventListener("touchstart", e => {
    if (box.scrollTop > 5) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    box.style.transition = "none";
  }, { passive: true });
  box.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) { currentY = 0; return; }
    currentY = dy;
    box.style.transform = `translateY(${dy * 0.6}px)`;
    box.style.opacity = Math.max(0.4, 1 - dy / 500);
  }, { passive: true });
  box.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    box.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    if (currentY > 100) {
      box.style.transform = "translateY(100vh)";
      box.style.opacity = "0";
      if (typeof haptic === 'function') haptic('light');
      setTimeout(() => {
        closeFn();
        box.style.transform = "";
        box.style.opacity = "";
      }, 300);
    } else {
      box.style.transform = "";
      box.style.opacity = "";
    }
    currentY = 0;
  }, { passive: true });
}
initSwipeDismiss(".reveal-box", closeOverlay);
initSwipeDismiss(".modal-box", closeAuthModal);
initSwipeDismiss(".scenario-box", closeScenarioOverlay);

// Initialize
applyLang();
initAuth();

// ── Onboarding for first-time users ──
function showOnboarding() {
  if (localStorage.getItem('shushang_onboarded')) return;
  document.getElementById('onboardModal').classList.add('show');
}
function closeOnboarding() {
  document.getElementById('onboardModal').classList.remove('show');
  localStorage.setItem('shushang_onboarded', '1');
}
setTimeout(showOnboarding, 800);

// Track visit (every page load)
(async function trackVisit() {
  try {
    const r = await fetch(API + "/api/visit", { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = await r.json();
    const el = document.getElementById("visitCount");
    if (el) el.textContent = toFarsiNum(data.visits);
  } catch {}
})();

// Register Service Worker — force update on every load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Force immediate update check
    reg.update();
    // Check for updates every 15 seconds
    setInterval(() => reg.update(), 15000);
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          // Clear all caches then reload
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
            window.location.reload();
          });
        }
      });
    });
  }).catch(() => {});
  // Listen for controller change (another tab updated the SW)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
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

/* ── Application Initialization ── */

// ── Splash Screen ──
(function runSplash() {
  const fill = document.getElementById("splashFill");
  const splash = document.getElementById("splashScreen");
  const percentEl = document.getElementById("splashPercent");
  const tagline = document.getElementById("splashTagline");
  const canvas = document.getElementById("splashCanvas");
  if (!fill || !splash) return;

  // Particles
  if (canvas) {
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.3 + 0.1
      });
    }
    let animFrame;
    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233,69,96,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animFrame = requestAnimationFrame(drawParticles);
    }
    drawParticles();
    setTimeout(() => cancelAnimationFrame(animFrame), 4000);
  }

  // Typing effect
  const text = "به دنیای مافیا خوش اومدی...";
  let charIdx = 0;
  if (tagline) {
    const typeInterval = setInterval(() => {
      charIdx++;
      tagline.textContent = text.slice(0, charIdx);
      if (charIdx >= text.length) clearInterval(typeInterval);
    }, 70);
  }

  // Progress bar with percentage
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 12 + 3;
    if (progress >= 100) progress = 100;
    fill.style.width = progress + "%";
    if (percentEl) percentEl.textContent = Math.round(progress) + "٪";
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => splash.remove(), 600);
      }, 500);
    }
  }, 120);
})();

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

// ── Theme Toggle ──
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('shushang_theme', newTheme);
  document.getElementById('themeToggle').textContent = newTheme === 'light' ? '☀️' : '🌙';
}
// Load saved theme
(function loadTheme() {
  const saved = localStorage.getItem('shushang_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '☀️';
  }
})();

function getDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('shushang', 2, 2);
  const canvasHash = canvas.toDataURL().slice(-50);

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    canvasHash
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

// Initialize
applyLang();
initAuth();

// ── System Messages — check and show to user ──
async function checkSystemMessages() {
  if (!authToken) return;
  try {
    const r = await apiFetch("/api/system-messages", { _background: true });
    if (!r.ok || !r.data || !r.data.length) return;
    r.data.forEach(msg => {
      showSystemBanner(msg);
    });
  } catch {}
}
function showSystemBanner(msg) {
  const existing = document.getElementById("sysmsg-" + msg.id);
  if (existing) return;
  const el = document.createElement("div");
  el.id = "sysmsg-" + msg.id;
  el.className = "sys-msg-banner";
  el.innerHTML = `<span class="sys-msg-text">📢 ${msg.content}</span><button class="sys-msg-close" onclick="dismissSysMsg(${msg.id},this.parentElement)">✕</button>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 50);
}
async function dismissSysMsg(id, el) {
  el.classList.remove("show");
  setTimeout(() => el.remove(), 300);
  await apiFetch("/api/system-messages/" + id + "/read", { method: "POST", _background: true });
}
setTimeout(checkSystemMessages, 3000);
setInterval(checkSystemMessages, 30000);

// ── DM Unread Badge ──
async function updateDmBadge() {
  if (!authToken) return;
  try {
    const r = await apiFetch("/api/dm/unread", { _background: true });
    if (!r.ok) return;
    const badge = document.getElementById("dmBadge");
    if (badge) {
      if (r.data.count > 0) {
        badge.textContent = r.data.count > 9 ? '۹+' : toFarsiNum(r.data.count);
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  } catch {}
}
setTimeout(updateDmBadge, 4000);
setInterval(updateDmBadge, 10000);

// Auto-join digital room if opened via NFC URL (?nfc=CODE)
(function checkNfcUrl() {
  const params = new URLSearchParams(window.location.search);
  const nfcCode = params.get('nfc');
  if (nfcCode && /^[A-Z0-9]{5}$/.test(nfcCode)) {
    // Remove param from URL
    window.history.replaceState({}, '', window.location.pathname);
    // Auto-receive role
    setTimeout(() => autoJoinDigital(nfcCode), 500);
  }
})();

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

// ── PWA Install Prompt ──
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!localStorage.getItem('pwa_dismissed')) {
    setTimeout(() => {
      document.getElementById('pwaBanner').style.display = 'flex';
    }, 5000);
  }
});
function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') showToast('✅ نصب شد!');
    document.getElementById('pwaBanner').style.display = 'none';
    deferredInstallPrompt = null;
  });
}
function dismissPWA() {
  document.getElementById('pwaBanner').style.display = 'none';
  localStorage.setItem('pwa_dismissed', '1');
}

// ── Push Notifications ──
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendLocalNotification(title, body, icon = '/icon-192.png') {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon, badge: '/icon-192.png', tag: 'shushang' });
  } catch {
    // Fallback for mobile: use SW notification
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, { body, icon, badge: '/icon-192.png', tag: 'shushang' });
      });
    }
  }
}

// Ask for notification permission after first game
function promptNotifications() {
  if (Notification.permission !== 'default') return;
  if (!localStorage.getItem('notif_asked')) {
    localStorage.setItem('notif_asked', '1');
    setTimeout(() => {
      requestNotificationPermission().then(granted => {
        if (granted) showToast('🔔 نوتیفیکیشن فعال شد!');
      });
    }, 3000);
  }
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

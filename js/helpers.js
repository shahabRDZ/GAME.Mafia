/* ── Helper Functions ── */

function toFarsiNum(n) {
  if (currentLang !== "fa") return String(n);
  return String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function spawnParticle(e, icon) {
  if (!e || !e.clientX) return;
  const p = document.createElement("div");
  p.className = "particle";
  p.textContent = icon;
  p.style.left = e.clientX + "px";
  p.style.top = e.clientY + "px";
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// ── Colorful Avatar System ──
const AVATAR_COLORS = [
  ['#e94560','#c0392b'], ['#f5a623','#e67e22'], ['#4ade80','#22c55e'],
  ['#00cfff','#0ea5e9'], ['#c084fc','#9333ea'], ['#fb7185','#e11d48'],
  ['#fbbf24','#d97706'], ['#34d399','#059669'], ['#60a5fa','#3b82f6'],
  ['#a78bfa','#7c3aed']
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function renderAvatar(name, size = '2.25rem') {
  const initial = (name || '?').charAt(0).toUpperCase();
  const [c1, c2] = getAvatarColor(name);
  return `<div class="user-avatar" style="width:${size};height:${size};background:linear-gradient(135deg,${c1},${c2})">${initial}</div>`;
}

// ── Skeleton Loader ──
function showSkeleton(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array.from({length: count}, () =>
    `<div class="skeleton-row">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    </div>`
  ).join('');
}

// ── Loading State ──
function showLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'flex';
}
function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

// ── Button Loading State ──
function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('btn-loading', loading);
}

// ── Empty State with CTA ──
function showEmptyState(container, icon, title, desc, ctaText, ctaAction) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-desc">${desc}</div>
      ${ctaText ? `<button class="empty-state-cta" onclick="${ctaAction}">${ctaText}</button>` : ''}
    </div>`;
}

// ── Toast Queue ──
const toastQueue = [];
let toastActive = false;
const originalShowToast = typeof showToast === 'function' ? showToast : null;

function showToastQueued(msg, type) {
  toastQueue.push({ msg, type });
  if (!toastActive) processToastQueue();
}

function processToastQueue() {
  if (toastQueue.length === 0) { toastActive = false; return; }
  toastActive = true;
  const { msg, type } = toastQueue.shift();
  if (originalShowToast) originalShowToast(msg, type);
  setTimeout(processToastQueue, 2500);
}

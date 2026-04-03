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

// ── Empty State ──
function showEmptyState(container, icon, title, desc) {
  const tpl = document.getElementById('emptyStateTemplate');
  if (!tpl || !container) return;
  const clone = tpl.content.cloneNode(true);
  clone.querySelector('.empty-state-icon').textContent = icon;
  clone.querySelector('.empty-state-title').textContent = title;
  clone.querySelector('.empty-state-desc').textContent = desc;
  container.innerHTML = '';
  container.appendChild(clone);
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

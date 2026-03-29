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

/* ── Standalone Moderator Tools (Timer, Warnings, Notes) ── */

let tlTimerInterval = null;
let tlTimerSeconds = 0;
let tlTimerInitial = 0;
let tlTimerRunning = false;
let tlPhase = "day";
let tlPlayers = [];

const TL_STORAGE_KEY = "showshung_tools_v1";

function tlLoad() {
  try {
    const raw = localStorage.getItem(TL_STORAGE_KEY);
    if (!raw) return { players: [], notes: "" };
    return JSON.parse(raw);
  } catch { return { players: [], notes: "" }; }
}

function tlSave() {
  const data = {
    players: tlPlayers,
    notes: document.getElementById("tlNotes")?.value || ""
  };
  localStorage.setItem(TL_STORAGE_KEY, JSON.stringify(data));
}

function tlFormatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${toFarsiNum(String(m).padStart(2, "0"))}:${toFarsiNum(String(sec).padStart(2, "0"))}`;
}

function setToolsTimer(seconds) {
  if (tlTimerRunning) toggleToolsTimer();
  tlTimerSeconds = seconds;
  tlTimerInitial = seconds;
  document.getElementById("tlTimerDisplay").textContent = tlFormatTime(seconds);
}

function toggleToolsTimer() {
  const btn = document.getElementById("tlTimerStartBtn");
  if (tlTimerRunning) {
    clearInterval(tlTimerInterval);
    tlTimerInterval = null;
    tlTimerRunning = false;
    btn.textContent = "ادامه";
  } else {
    if (tlTimerSeconds <= 0) {
      if (typeof showToast === "function") showToast("⚠️ ابتدا زمان را انتخاب کنید");
      return;
    }
    tlTimerRunning = true;
    btn.textContent = "توقف";
    tlTimerInterval = setInterval(() => {
      tlTimerSeconds--;
      document.getElementById("tlTimerDisplay").textContent = tlFormatTime(Math.max(0, tlTimerSeconds));
      if (tlTimerSeconds <= 0) {
        clearInterval(tlTimerInterval);
        tlTimerInterval = null;
        tlTimerRunning = false;
        btn.textContent = "شروع";
        if (typeof showToast === "function") showToast("⏰ زمان تمام شد!");
        try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}
      }
    }, 1000);
  }
}

function resetToolsTimer() {
  if (tlTimerInterval) { clearInterval(tlTimerInterval); tlTimerInterval = null; }
  tlTimerRunning = false;
  tlTimerSeconds = tlTimerInitial;
  document.getElementById("tlTimerDisplay").textContent = tlFormatTime(tlTimerInitial);
  document.getElementById("tlTimerStartBtn").textContent = "شروع";
}

function toggleToolsPhase() {
  tlPhase = tlPhase === "day" ? "night" : "day";
  document.getElementById("tlPhaseIcon").textContent = tlPhase === "day" ? "☀️" : "🌙";
  document.getElementById("tlPhaseName").textContent = tlPhase === "day" ? "روز" : "شب";
}

function renderToolsWarnings() {
  const list = document.getElementById("tlWarnList");
  const badge = document.getElementById("tlPlayerCount");
  if (!list) return;
  if (badge) badge.textContent = `${toFarsiNum(tlPlayers.length)} بازیکن`;
  if (!tlPlayers.length) {
    list.innerHTML = `<div class="tl-warn-empty">👥 هنوز بازیکنی اضافه نشده<br><span style="font-size:.75rem;opacity:.6">نام یک بازیکن را در کادر بالا وارد کنید</span></div>`;
    return;
  }
  list.innerHTML = tlPlayers.map((p, i) => {
    const dots = [0, 1, 2].map(d => `<button class="tl-warn-dot ${d < p.warns ? "on" : ""}" onclick="bumpToolsWarn(${i})" aria-label="اخطار ${toFarsiNum(d+1)}"></button>`).join("");
    return `
      <div class="tl-warn-item ${p.warns >= 3 ? "is-eliminated" : ""}">
        <span class="tl-warn-num">${toFarsiNum(i+1)}</span>
        <span class="tl-warn-name ${p.warns >= 3 ? "eliminated" : ""}">${escapeHtml(p.name)}</span>
        <div class="tl-warn-dots">${dots}</div>
        <button class="tl-warn-remove" onclick="removeToolsPlayer(${i})" aria-label="حذف ${escapeHtml(p.name)}">×</button>
      </div>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function addToolsPlayer() {
  const input = document.getElementById("tlWarnNewName");
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (tlPlayers.some(p => p.name === name)) {
    if (typeof showToast === "function") showToast("⚠️ این بازیکن قبلاً اضافه شده");
    return;
  }
  tlPlayers.push({ name, warns: 0 });
  input.value = "";
  input.focus();
  renderToolsWarnings();
  tlSave();
}

function removeToolsPlayer(idx) {
  tlPlayers.splice(idx, 1);
  renderToolsWarnings();
  tlSave();
}

function bumpToolsWarn(idx) {
  const p = tlPlayers[idx];
  if (!p) return;
  p.warns = (p.warns + 1) % 4;
  if (p.warns === 3) {
    if (typeof showToast === "function") showToast(`⚠️ ${p.name} اخراج شد!`);
    try { navigator.vibrate?.([100, 50, 100]); } catch {}
  }
  renderToolsWarnings();
  tlSave();
}

function resetToolsWarnings() {
  tlPlayers.forEach(p => p.warns = 0);
  renderToolsWarnings();
  tlSave();
}

function copyToolsNotes() {
  const text = document.getElementById("tlNotes").value;
  if (!text.trim()) {
    if (typeof showToast === "function") showToast("یادداشتی برای کپی وجود ندارد");
    return;
  }
  navigator.clipboard?.writeText(text).then(() => {
    if (typeof showToast === "function") showToast("📋 یادداشت کپی شد");
  }).catch(() => {
    if (typeof showToast === "function") showToast("⚠️ کپی نشد");
  });
}

function clearToolsNotes() {
  if (!confirm("یادداشت‌ها پاک شوند؟")) return;
  const ta = document.getElementById("tlNotes");
  ta.value = "";
  tlSave();
  updateNotesCount();
}

function downloadToolsNotes() {
  const text = document.getElementById("tlNotes").value;
  if (!text.trim()) {
    if (typeof showToast === "function") showToast("یادداشتی برای دانلود وجود ندارد");
    return;
  }
  const date = new Date().toLocaleDateString("fa-IR");
  const blob = new Blob([`📝 یادداشت گرداننده — ${date}\n${"=".repeat(40)}\n\n${text}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mafia-notes-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === "function") showToast("💾 یادداشت دانلود شد");
}

function updateNotesCount() {
  const ta = document.getElementById("tlNotes");
  const badge = document.getElementById("tlNotesCount");
  if (!ta || !badge) return;
  const len = ta.value.length;
  badge.textContent = `${toFarsiNum(len)} کاراکتر`;
}

let tlSaveTimer = null;
function flashSaveStatus() {
  const dot = document.querySelector(".tl-save-dot");
  const text = document.querySelector(".tl-save-text");
  if (!dot || !text) return;
  dot.style.background = "#fbbf24";
  dot.style.boxShadow = "0 0 8px #fbbf24";
  text.textContent = "ذخیره شد";
  clearTimeout(tlSaveTimer);
  tlSaveTimer = setTimeout(() => {
    dot.style.background = "#4ade80";
    dot.style.boxShadow = "0 0 8px #4ade80";
    text.textContent = "ذخیره خودکار";
  }, 1200);
}

function initToolsScreen() {
  const data = tlLoad();
  tlPlayers = data.players || [];
  const notes = document.getElementById("tlNotes");
  if (notes) {
    notes.value = data.notes || "";
    notes.addEventListener("input", () => { tlSave(); updateNotesCount(); flashSaveStatus(); });
    updateNotesCount();
  }
  const newName = document.getElementById("tlWarnNewName");
  if (newName) {
    newName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addToolsPlayer(); }
    });
  }
  renderToolsWarnings();
  document.getElementById("tlTimerDisplay").textContent = tlFormatTime(0);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("toolsScreen")) initToolsScreen();
});

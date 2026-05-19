// ── Day/Night Timer ──
function setModTimer(seconds) {
  modTimerSeconds = seconds;
  modTimerRunning = false;
  if (modTimerInterval) { clearInterval(modTimerInterval); modTimerInterval = null; }
  updateTimerDisplay();
  document.getElementById("modTimerStartBtn").textContent = "شروع";
}

function toggleModTimer() {
  if (modTimerRunning) {
    clearInterval(modTimerInterval);
    modTimerInterval = null;
    modTimerRunning = false;
    document.getElementById("modTimerStartBtn").textContent = "ادامه";
  } else {
    if (modTimerSeconds <= 0) return;
    modTimerRunning = true;
    document.getElementById("modTimerStartBtn").textContent = "توقف";
    modTimerInterval = setInterval(() => {
      modTimerSeconds--;
      updateTimerDisplay();
      if (modTimerSeconds <= 0) {
        clearInterval(modTimerInterval);
        modTimerInterval = null;
        modTimerRunning = false;
        document.getElementById("modTimerStartBtn").textContent = "شروع";
        haptic('heavy');
        playAlarm();
        showToast("⏰ زمان تمام شد!");
        sendLocalNotification('شوشانگ', '⏰ زمان تمام شد!');
      }
    }, 1000);
  }
}

// ── Alarm Sound (Web Audio API) ──
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [880, 0, 880, 0, 880, 0, 1100];
    const dur = 0.15;
    freqs.forEach((freq, i) => {
      if (freq === 0) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * dur);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * dur + dur * 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * dur);
      osc.stop(ctx.currentTime + i * dur + dur);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

function resetModTimer() {
  if (modTimerInterval) { clearInterval(modTimerInterval); modTimerInterval = null; }
  modTimerSeconds = 0;
  modTimerRunning = false;
  updateTimerDisplay();
  document.getElementById("modTimerStartBtn").textContent = "شروع";
}

function updateTimerDisplay() {
  const m = Math.floor(modTimerSeconds / 60);
  const s = modTimerSeconds % 60;
  const display = document.getElementById("modTimerDisplay");
  display.textContent = toFarsiNum(String(m).padStart(2, '0')) + ':' + toFarsiNum(String(s).padStart(2, '0'));
  display.classList.toggle("warning", modTimerSeconds <= 10 && modTimerSeconds > 0);
}

function togglePhase() {
  modIsNight = !modIsNight;
  const phase = document.getElementById("modPhase");
  document.getElementById("modPhaseIcon").textContent = modIsNight ? '🌙' : '☀️';
  document.getElementById("modPhaseName").textContent = modIsNight ? 'شب' : 'روز';
  phase.classList.toggle("night", modIsNight);
  haptic('light');
}

// ── Warning System (3 warnings = elimination) ──
let modWarnings = {};

function renderWarningPlayers() {
  const container = document.getElementById("modWarningPlayers");
  if (!state.cards || !state.cards.length) return;
  if (Object.keys(modWarnings).length === 0) {
    state.cards.forEach(c => { modWarnings[c.number] = 0; });
  }
  container.innerHTML = state.cards.sort((a, b) => a.number - b.number).map(c => {
    const w = modWarnings[c.number] || 0;
    const eliminated = w >= 3;
    return `<div class="mod-vote-card${eliminated ? ' eliminated' : ''}" onclick="${eliminated ? '' : `addWarning(${c.number})`}">
      <span class="vote-num">${toFarsiNum(c.number)}</span>
      <div class="warn-dots">
        <div class="warn-dot${w >= 1 ? ' active' : ''}"></div>
        <div class="warn-dot${w >= 2 ? ' active' : ''}"></div>
        <div class="warn-dot${w >= 3 ? ' active' : ''}"></div>
      </div>
    </div>`;
  }).join('');
}

function addWarning(num) {
  modWarnings[num] = (modWarnings[num] || 0) + 1;
  haptic('medium');
  if (modWarnings[num] >= 3) {
    haptic('heavy');
    playAlarm();
    showToast(`🚫 بازیکن ${toFarsiNum(num)} اخراج شد!`);
  } else {
    showToast(`⚠️ اخطار ${toFarsiNum(modWarnings[num])} به بازیکن ${toFarsiNum(num)}`);
  }
  renderWarningPlayers();
}

function resetWarnings() {
  modWarnings = {};
  state.cards.forEach(c => { modWarnings[c.number] = 0; });
  renderWarningPlayers();
  showToast("اخطارها ریست شد");
}

// ── Night Actions — dynamic based on roles ──
const ROLE_ABILITIES = {
  // Mafia
  "رئیس مافیا":    { icon: "👑", action: "شات", color: "#ff5555", type: "kill" },
  "پدرخوانده":     { icon: "👑", action: "شات", color: "#ff5555", type: "kill" },
  "مافیا ساده":    { icon: "😈", action: "شات", color: "#ff5555", type: "kill" },
  "ناتو":          { icon: "🔫", action: "شات ناتو", color: "#ff5555", type: "kill" },
  "ناتاشا":        { icon: "💋", action: "بلاک", color: "#ff77aa", type: "block" },
  "مذاکره‌کننده":  { icon: "🤝", action: "جذب", color: "#ff9955", type: "recruit" },
  "هکر":           { icon: "💻", action: "هک", color: "#ff7777", type: "hack" },
  "شیاد":          { icon: "🃏", action: "فریب", color: "#ff7777", type: "deceive" },
  "گروگان‌گیر":    { icon: "💣", action: "گروگان", color: "#ff5555", type: "hostage" },
  "یاغی":          { icon: "🗡️", action: "حمله", color: "#ff5555", type: "attack" },
  "دکتر لکتر":     { icon: "🔪", action: "سیو مافیا", color: "#ff5555", type: "save" },
  "بمب‌گذار":      { icon: "💣", action: "بمب‌گذاری", color: "#ff5555", type: "mine" },
  // Citizen
  "دکتر":          { icon: "⚕️", action: "سیو", color: "#4ade80", type: "save" },
  "کارآگاه":       { icon: "🕵️", action: "استعلام", color: "#60a5fa", type: "inquiry" },
  "بازپرس":        { icon: "🔍", action: "استعلام", color: "#60a5fa", type: "inquiry" },
  "کارآگاه ویژه":  { icon: "🔍", action: "استعلام", color: "#60a5fa", type: "inquiry" },
  "تکاور":         { icon: "🎯", action: "شات", color: "#4ade80", type: "snipe" },
  "تک‌تیرانداز":   { icon: "🎯", action: "شات", color: "#4ade80", type: "snipe" },
  "نگهبان":        { icon: "👮", action: "محافظت", color: "#4ade80", type: "guard" },
  "محافظ":         { icon: "🛡️", action: "محافظت", color: "#4ade80", type: "guard" },
  "رویین‌تن":      { icon: "🛡️", action: "سپر", color: "#4ade80", type: "shield" },
  "زره‌پوش":       { icon: "🛡️", action: "سپر", color: "#4ade80", type: "shield" },
  "هانتر":         { icon: "🏹", action: "نشانه", color: "#4ade80", type: "mark" },
  "ساقی":          { icon: "🍷", action: "مست کردن", color: "#fbbf24", type: "silence" },
  "کشیش":          { icon: "⛪", action: "تحقیق", color: "#60a5fa", type: "inquiry" },
  "روانشناس":      { icon: "🧠", action: "آنالیز", color: "#c084fc", type: "inquiry" },
  "خبرنگار":       { icon: "📰", action: "تحقیق", color: "#60a5fa", type: "inquiry" },
  "فدایی":         { icon: "💥", action: "انتحاری", color: "#fbbf24", type: "suicide" },
  "وکیل":          { icon: "⚖️", action: "دفاع", color: "#4ade80", type: "defend" },
  "مین‌گذار":      { icon: "💥", action: "مین", color: "#fbbf24", type: "mine" },
  "راهنما":        { icon: "🧭", action: "هدایت", color: "#4ade80", type: "guide" },
  "گورکن":         { icon: "⚰️", action: "بررسی", color: "#94a3b8", type: "inquiry" },
  "جادوگر":        { icon: "🔮", action: "طلسم", color: "#c084fc", type: "spell" },
  "پرستار":        { icon: "💊", action: "سیو", color: "#4ade80", type: "save" },
  "شهردار":        { icon: "🎩", action: "وتو", color: "#4ade80", type: "veto" },
  "قاضی":          { icon: "⚖️", action: "حکم", color: "#4ade80", type: "judge" },
  "جان‌سخت":       { icon: "💪", action: "مقاومت", color: "#4ade80", type: "shield" },
  // Independent
  "هزارچهره":      { icon: "🎭", action: "تبدیل", color: "#c084fc", type: "transform" },
  "قاتل زنجیره‌ای": { icon: "🔪", action: "قتل", color: "#c084fc", type: "kill" },
  "زودیاک":        { icon: "♏", action: "قتل", color: "#c084fc", type: "kill" },
  "سندیکا":        { icon: "🕶️", action: "جذب", color: "#c084fc", type: "recruit" },
  "گرگ‌نما":       { icon: "🐺", action: "حمله", color: "#c084fc", type: "kill" },
  "دزد":           { icon: "🦹", action: "دزدی", color: "#c084fc", type: "steal" },
};

let nightActions = {};

function renderNightActions() {
  const container = document.getElementById("nightActionsContainer");
  if (!state.cards || !state.cards.length) { container.innerHTML = ''; return; }

  nightActions = {};
  // Find roles that have abilities in current game
  const activeRoles = [];
  state.cards.forEach(c => {
    if (ROLE_ABILITIES[c.roleName]) {
      activeRoles.push({ num: c.number, roleName: c.roleName, ...ROLE_ABILITIES[c.roleName] });
    }
  });

  // Group: mafia shot first, then others
  const mafiaShot = activeRoles.filter(r => r.type === 'kill' && state.cards.find(c => c.number === r.num)?.role === 'mafia');
  const others = activeRoles.filter(r => !(r.type === 'kill' && state.cards.find(c => c.number === r.num)?.role === 'mafia'));

  // Always show mafia shot as one group
  let html = `<div class="mod-night-item" style="border-color:rgba(255,85,85,.2)">
    <div class="mod-night-label" style="color:#ff5555">💀 شات مافیا</div>
    <div class="mod-night-target">
      <span>هدف:</span>
      <input type="number" id="nightInput_mafiaShot" min="1" max="${state.cards.length}" placeholder="—" class="mod-night-input" inputmode="numeric">
      <button class="mod-btn mod-btn-start" onclick="registerNightAction('mafiaShot')" style="padding:6px 14px">ثبت</button>
    </div>
    <div class="mod-night-result" id="nightResult_mafiaShot"></div>
  </div>`;

  // Each role with ability
  others.forEach(r => {
    const key = `role_${r.num}`;
    html += `<div class="mod-night-item" style="border-color:${r.color}22">
      <div class="mod-night-label" style="color:${r.color}">${r.icon} #${toFarsiNum(r.num)} ${r.roleName} — ${r.action}</div>
      <div class="mod-night-target">
        <span>هدف:</span>
        <input type="number" id="nightInput_${key}" min="1" max="${state.cards.length}" placeholder="—" class="mod-night-input" inputmode="numeric">
        <button class="mod-btn" onclick="registerNightAction('${key}')" style="padding:6px 14px;background:${r.color}22;border-color:${r.color}44;color:${r.color}">ثبت</button>
      </div>
      <div class="mod-night-result" id="nightResult_${key}"></div>
    </div>`;
  });

  container.innerHTML = html;
}

function registerNightAction(key) {
  const input = document.getElementById("nightInput_" + key);
  const num = parseInt(input.value);
  if (!num || num < 1 || num > state.cards.length) { showToast("⚠️ شماره نامعتبر"); return; }
  nightActions[key] = num;
  const resultEl = document.getElementById("nightResult_" + key);
  resultEl.innerHTML = `✓ ثبت شد: بازیکن <strong>${toFarsiNum(num)}</strong>`;
  resultEl.style.color = '#4ade80';
  haptic('medium');
}

function resolveNight() {
  const result = document.getElementById("nightFinalResult");
  if (Object.keys(nightActions).length === 0) {
    result.innerHTML = '<span style="color:var(--dim)">هیچ اقدامی ثبت نشده</span>';
    return;
  }

  let lines = [];
  const shot = nightActions['mafiaShot'];
  let savedTargets = [];
  let killedTargets = [];
  let guardedTargets = [];

  // Collect saves, guards, shields
  Object.entries(nightActions).forEach(([key, target]) => {
    if (key === 'mafiaShot') return;
    const numMatch = key.match(/role_(\d+)/);
    if (!numMatch) return;
    const playerNum = parseInt(numMatch[1]);
    const card = state.cards.find(c => c.number === playerNum);
    if (!card) return;
    const ability = ROLE_ABILITIES[card.roleName];
    if (!ability) return;

    if (ability.type === 'save') savedTargets.push(target);
    if (ability.type === 'guard' || ability.type === 'shield') guardedTargets.push(target);
    if (ability.type === 'snipe') killedTargets.push({ target, by: card.roleName, num: playerNum });

    lines.push(`${ability.icon} #${toFarsiNum(playerNum)} ${card.roleName}: ${ability.action} → بازیکن ${toFarsiNum(target)}`);
  });

  // Resolve mafia shot
  if (shot) {
    if (savedTargets.includes(shot)) {
      lines.unshift(`🛡️ شات مافیا → بازیکن <strong style="color:#4ade80">${toFarsiNum(shot)}</strong> — <strong style="color:#4ade80">سیو شد!</strong>`);
    } else if (guardedTargets.includes(shot)) {
      lines.unshift(`🛡️ شات مافیا → بازیکن <strong style="color:#4ade80">${toFarsiNum(shot)}</strong> — <strong style="color:#4ade80">محافظت شد!</strong>`);
    } else {
      lines.unshift(`☠️ شات مافیا → بازیکن <strong style="color:var(--accent)">${toFarsiNum(shot)}</strong> — <strong style="color:var(--accent)">کشته شد!</strong>`);
    }
  }

  // Resolve sniper kills
  killedTargets.forEach(k => {
    lines.push(`☠️ ${k.by} #${toFarsiNum(k.num)} → بازیکن <strong style="color:var(--accent)">${toFarsiNum(k.target)}</strong> — <strong style="color:var(--accent)">کشته شد!</strong>`);
  });

  result.innerHTML = lines.join('<br>');
  haptic('heavy');
  if (shot && !savedTargets.includes(shot) && !guardedTargets.includes(shot)) playAlarm();

  // Reset
  nightActions = {};
  document.querySelectorAll('[id^="nightInput_"]').forEach(el => el.value = '');
  document.querySelectorAll('[id^="nightResult_"]').forEach(el => el.textContent = '');
}

// ── Share Game Results ──
function shareGameResult() {
  if (!state.cards || !state.cards.length) return;
  const mafias = state.cards.filter(c => c.role === "mafia").sort((a, b) => a.number - b.number);
  const citizens = state.cards.filter(c => c.role === "citizen").sort((a, b) => a.number - b.number);
  const independents = state.cards.filter(c => c.role === "independent").sort((a, b) => a.number - b.number);

  let text = `🎭 نتیجه بازی مافیا شوشانگ\n`;
  text += `📋 سناریو: ${state.group} | ${state.count} نفر\n\n`;
  text += `😈 مافیا (${mafias.length} نفر):\n`;
  mafias.forEach(c => { text += `  ${ROLE_ICONS[c.roleName] || '🔴'} #${c.number} ${c.roleName}\n`; });
  text += `\n😇 شهروند (${citizens.length} نفر):\n`;
  citizens.forEach(c => { text += `  ${ROLE_ICONS[c.roleName] || '🟢'} #${c.number} ${c.roleName}\n`; });
  if (independents.length) {
    text += `\n🐺 مستقل (${independents.length} نفر):\n`;
    independents.forEach(c => { text += `  ${ROLE_ICONS[c.roleName] || '🟣'} #${c.number} ${c.roleName}\n`; });
  }
  text += `\n🔗 shahabrdz.dev/mafia`;

  if (navigator.share) {
    navigator.share({ title: 'نتیجه بازی مافیا', text: text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast("📋 نتیجه بازی کپی شد!"));
  }
}

function shareGameLink() {
  const url = window.location.origin;
  if (navigator.share) {
    navigator.share({ title: 'مافیا شوشانگ', text: 'بیا مافیا بازی کنیم!', url: url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => showToast("🔗 لینک کپی شد!"));
  }
}

function newGame() {
  state = { group: null, count: null, mafiaCount: null, citizenCount: null, cards: [], flipped: new Set(), seen: new Set(), isCustom: false, customCards: [] };
  customCardsList = [];
  selectedTeam = "mafia";
  document.getElementById("gameNavBtn").style.display = "none";
  // Hide both button rows
  const sr = document.getElementById("startBtnRow"); if (sr) sr.style.display = "none";
  const cr = document.getElementById("customStartRow"); if (cr) cr.style.display = "none";
  document.getElementById("countCard").style.display = "none";
  document.getElementById("customForm").classList.remove("show");
  document.querySelectorAll(".group-btn,.count-btn").forEach(b => b.classList.remove("selected"));
  exitGameFullscreen();
}

// ══════════════════════════════════════════
// DIGITAL NO-NARRATOR MODE (بدون گرداننده)
// ══════════════════════════════════════════
let dgSelectedScenario = null;
let dgSelectedCount = null;
let dgPollInterval = null;

function openDigitalMode() {
  document.getElementById("dgScreenA").style.display = "block";
  document.getElementById("dgScreenB").style.display = "none";
  document.getElementById("dgScreenC").style.display = "none";
  document.getElementById("digitalModeOverlay").classList.add("show");
}

function closeDigitalMode() {
  document.getElementById("digitalModeOverlay").classList.remove("show");
  if (dgPollInterval) { clearInterval(dgPollInterval); dgPollInterval = null; }
}

function digitalBackToA() {
  document.getElementById("dgScreenA").style.display = "block";
  document.getElementById("dgScreenB").style.display = "none";
  document.getElementById("dgScreenC").style.display = "none";
  if (dgPollInterval) { clearInterval(dgPollInterval); dgPollInterval = null; }
}

// ── Host Flow ──
function digitalStartHost() {
  dgSelectedScenario = null;
  dgSelectedCount = null;
  document.getElementById("dgScreenA").style.display = "none";
  document.getElementById("dgScreenB").style.display = "block";
  // Reset host UI
  document.getElementById("dgCountSection").style.display = "none";
  document.getElementById("dgCreateBtn").style.display = "none";
  document.getElementById("dgHostStatus").style.display = "none";
  document.getElementById("dgScenarioGrid").style.display = "grid";
  document.querySelectorAll(".dg-scenario-btn").forEach(b => b.classList.remove("active"));
}

function digitalSelectScenario(name) {
  dgSelectedScenario = name;
  dgSelectedCount = null;
  // Highlight active button
  document.querySelectorAll(".dg-scenario-btn").forEach(b => {
    b.classList.toggle("active", b.textContent.includes(name));
  });
  // Show count buttons
  const counts = Object.keys(ROLES_DATA[name]).map(Number);
  const grid = document.getElementById("dgCountGrid");
  grid.innerHTML = counts.map(c =>
    `<button class="dg-count-btn" onclick="digitalSelectCount(${c})">${toFarsiNum(c)} نفر</button>`
  ).join('');
  document.getElementById("dgCountSection").style.display = "block";
  document.getElementById("dgCreateBtn").style.display = "none";
}

function digitalSelectCount(count) {
  dgSelectedCount = count;
  document.querySelectorAll(".dg-count-btn").forEach(b => {
    b.classList.toggle("active", b.textContent.includes(toFarsiNum(count)));
  });
  document.getElementById("dgCreateBtn").style.display = "block";
}

async function digitalCreateRoom() {
  if (!dgSelectedScenario || !dgSelectedCount) { showToast("⚠️ سناریو و تعداد را انتخاب کنید"); return; }
  const groupData = ROLES_DATA[dgSelectedScenario] && ROLES_DATA[dgSelectedScenario][dgSelectedCount];
  if (!groupData) { showToast("⚠️ داده سناریو یافت نشد"); return; }

  // Build roles array — one extra for host (last role)
  const roles = [];
  groupData.mafia.forEach(n => roles.push({ name: n, team: "mafia" }));
  groupData.citizen.forEach(n => roles.push({ name: n, team: "citizen" }));

  try {
    const r = await fetch(API + "/api/digital/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles, group: dgSelectedScenario })
    });
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    dgHostRoomCode = data.code;
    dgHostTotal = data.total;

    // Hide scenario selection, show code + status
    document.getElementById("dgScenarioGrid").style.display = "none";
    document.getElementById("dgCountSection").style.display = "none";
    document.getElementById("dgCreateBtn").style.display = "none";
    document.getElementById("dgHostStatus").style.display = "block";
    document.getElementById("dgRoomCode").textContent = data.code;
    document.getElementById("dgProgressBar").style.width = "0%";
    document.getElementById("dgProgressText").textContent = `${toFarsiNum(0)} از ${toFarsiNum(data.total - 1)} بازیکن دریافت کرد`;
    document.getElementById("dgStatusText").textContent = "کد رو به بازیکنا بگو — نقش تو آخر نشون داده میشه";
    document.getElementById("dgStatusText").style.color = "#00cfff";
    // Hide host role initially
    const hostRoleEl = document.getElementById("dgHostRole");
    if (hostRoleEl) hostRoleEl.style.display = "none";

    haptic('medium');

    // Start polling
    if (dgPollInterval) clearInterval(dgPollInterval);
    dgPollInterval = setInterval(() => digitalPollStatus(data.code, data.total), 3000);
  } catch (e) {
    showToast("⚠️ خطا در اتصال به سرور");
  }
}

let dgHostRoomCode = null;
let dgHostTotal = 0;

async function digitalPollStatus(code, total) {
  try {
    const r = await fetch(API + "/api/digital/status/" + code);
    const data = await r.json();
    if (!r.ok) return;

    // remaining=1 means only host's role is left
    const othersTotal = data.total - 1;
    const othersAssigned = Math.min(data.assigned, othersTotal);
    const pct = othersTotal > 0 ? (othersAssigned / othersTotal) * 100 : 0;
    document.getElementById("dgProgressBar").style.width = pct + "%";
    document.getElementById("dgProgressText").textContent =
      `${toFarsiNum(othersAssigned)} از ${toFarsiNum(othersTotal)} بازیکن نقش دریافت کرد`;

    if (data.remaining <= 1 && data.assigned >= othersTotal) {
      // All other players received — now get host's own role
      clearInterval(dgPollInterval);
      dgPollInterval = null;
      document.getElementById("dgStatusText").textContent = "🎉 همه بازیکنا نقششون رو گرفتن!";
      document.getElementById("dgStatusText").style.color = "#4ade80";
      haptic('heavy');
      // Auto-receive host's role
      await digitalReceiveHostRole(code);
    } else {
      document.getElementById("dgStatusText").textContent =
        `${toFarsiNum(data.remaining - 1)} بازیکن مونده`;
      document.getElementById("dgStatusText").style.color = "#00cfff";
    }
  } catch {}
}

async function digitalReceiveHostRole(code) {
  try {
    const r = await fetch(API + "/api/digital/receive/" + code, { method: "POST" });
    const data = await r.json();
    if (!r.ok) return;

    const role = data.role;
    const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
    const teamNames = { mafia: "😈 تیم مافیا", citizen: "😇 تیم شهروند", independent: "🐺 مستقل" };
    const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };

    // Show host role section
    const hostEl = document.getElementById("dgHostRole");
    if (hostEl) {
      hostEl.style.display = "block";
      hostEl.innerHTML = `
        <div style="text-align:center;margin-top:20px;padding:20px;border-radius:18px;
          background:linear-gradient(160deg, ${role.team==='mafia'?'rgba(255,85,85,.1)':'rgba(68,255,153,.1)'}, transparent);
          border:1px solid ${role.team==='mafia'?'rgba(255,85,85,.3)':'rgba(68,255,153,.3)'}">
          <div style="font-size:.75rem;color:var(--dim);margin-bottom:8px">نقش تو:</div>
          <div style="font-size:2.5rem;margin-bottom:6px">${ROLE_ICONS[role.name] || teamEmojis[role.team] || '🎭'}</div>
          <div style="font-size:1.3rem;font-weight:900;color:${teamColors[role.team] || '#fff'};margin-bottom:4px">${role.name}</div>
          <div style="font-size:.85rem;color:${teamColors[role.team] || '#fff'}">${teamNames[role.team] || ''}</div>
          <div style="font-size:.7rem;color:var(--dim);margin-top:6px">بازیکن شماره ${toFarsiNum(data.playerNum)}</div>
        </div>`;
      hostEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch {}
}

// ── Player Flow ──
function digitalOpenReceive() {
  document.getElementById("dgScreenA").style.display = "none";
  document.getElementById("dgScreenC").style.display = "block";
  document.getElementById("dgCodePhase").style.display = "block";
  document.getElementById("dgRolePhase").style.display = "none";
  document.getElementById("dgCodeInput").value = "";
  setTimeout(() => document.getElementById("dgCodeInput").focus(), 300);
}

async function digitalReceiveRole() {
  const code = document.getElementById("dgCodeInput").value.trim().toUpperCase();
  if (code.length < 3) { showToast("⚠️ کد اتاق را وارد کنید"); return; }

  try {
    const r = await fetch(API + "/api/digital/receive/" + code, { method: "POST" });
    const data = await r.json();

    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    haptic('heavy');
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);

    const role = data.role;
    const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
    const teamNames = { mafia: "😈 تیم مافیا", citizen: "😇 تیم شهروند", independent: "🐺 مستقل" };
    const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };
    const teamBorder = { mafia: "rgba(255,85,85,.3)", citizen: "rgba(68,255,153,.3)", independent: "rgba(192,132,252,.3)" };
    const teamBg = { mafia: "linear-gradient(160deg, rgba(255,85,85,.08), rgba(255,85,85,.02))", citizen: "linear-gradient(160deg, rgba(68,255,153,.08), rgba(68,255,153,.02))", independent: "linear-gradient(160deg, rgba(192,132,252,.08), rgba(192,132,252,.02))" };

    document.getElementById("dgRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
    document.getElementById("dgRoleName").textContent = role.name;
    document.getElementById("dgRoleName").style.color = teamColors[role.team] || "#fff";
    document.getElementById("dgRoleTeam").textContent = teamNames[role.team] || role.team;
    document.getElementById("dgRoleTeam").style.color = teamColors[role.team] || "#fff";
    const abilityInfo = (typeof ROLE_ABILITIES !== 'undefined') ? ROLE_ABILITIES[role.name] : null;
    document.getElementById("dgRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
    document.getElementById("dgRoleAbility").style.display = abilityInfo ? "block" : "none";
    document.getElementById("dgRolePlayerNum").textContent = `بازیکن شماره ${toFarsiNum(data.playerNum)}`;

    // Style the card
    const card = document.getElementById("dgRoleCard");
    card.style.background = teamBg[role.team] || "";
    card.style.borderColor = teamBorder[role.team] || "rgba(255,255,255,.1)";

    // Switch to role reveal
    document.getElementById("dgCodePhase").style.display = "none";
    document.getElementById("dgRolePhase").style.display = "block";

  } catch {
    showToast("⚠️ خطا در دریافت نقش");
  }
}

function digitalBackToCode() {
  document.getElementById("dgRolePhase").style.display = "none";
  document.getElementById("dgCodePhase").style.display = "block";
  // Keep the code input value so next player can just tap receive
}

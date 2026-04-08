/* ── Game Logic ── */

async function startGame() {
  if (state.isCustom) {
    const name = document.getElementById("customName").value.trim() || "گروه دلخواه";
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    const ic = customCardsList.filter(c => c.team === "independent").length;
    if (customCardsList.length < 3) { showToast("⚠️ حداقل ۳ کارت اضافه کنید"); return; }
    if (mc < 1) { showToast("⚠️ حداقل یک کارت مافیا لازم است"); return; }
    if (cc < 1) { showToast("⚠️ حداقل یک کارت شهروند لازم است"); return; }
    state.group = name;
    state.count = customCardsList.length;
    state.mafiaCount = mc;
    state.citizenCount = cc + ic;
    state.customCards = [...customCardsList];
  }
  if (!state.group || !state.count) { showToast("⚠️ لطفاً گروه و تعداد را انتخاب کنید"); return; }
  generateCards();
  renderGame();
  await saveGame();
  document.getElementById("gameNavBtn").style.display = "block";
  showScreen("game");
}

// ── Cryptographic Random Engine ──
function secureRandom() {
  // Use crypto API for true randomness, fallback to Math.random + timestamp entropy
  try {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
  } catch {
    return Math.random();
  }
}

function secureRandomInt(max) {
  return Math.floor(secureRandom() * max);
}

// Multi-pass Fisher-Yates with crypto randomness
function deepShuffle(arr) {
  const a = [...arr];
  // Pass 1: crypto Fisher-Yates
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Pass 2: reverse sweep with different entropy
  for (let i = 0; i < a.length; i++) {
    const j = i + secureRandomInt(a.length - i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Pass 3: random swap pairs
  const swaps = Math.max(a.length, 5);
  for (let s = 0; s < swaps; s++) {
    const x = secureRandomInt(a.length);
    const y = secureRandomInt(a.length);
    [a[x], a[y]] = [a[y], a[x]];
  }
  return a;
}

// Smart spread: distribute minorities (mafia/independent) among majority (citizens)
function spreadShuffle(cards) {
  const groups = {};
  cards.forEach(c => {
    if (!groups[c.role]) groups[c.role] = [];
    groups[c.role].push(c);
  });

  // Shuffle each group deeply
  Object.keys(groups).forEach(k => { groups[k] = deepShuffle(groups[k]); });

  const majority = deepShuffle(groups["citizen"] || []);
  const minorities = [];
  Object.entries(groups).forEach(([role, arr]) => {
    if (role !== "citizen") arr.forEach(c => minorities.push(c));
  });

  // Shuffle minorities
  const shuffledMinorities = deepShuffle(minorities);

  // Insert each minority card into a valid slot (not adjacent to same team)
  const result = [...majority];
  for (const card of shuffledMinorities) {
    const valid = [];
    for (let p = 0; p <= result.length; p++) {
      const prev = p > 0 ? result[p - 1] : null;
      const next = p < result.length ? result[p] : null;
      const prevOk = !prev || prev.role === "citizen";
      const nextOk = !next || next.role === "citizen";
      // Also prevent same non-citizen team adjacent
      const prevSameTeam = prev && prev.role === card.role;
      const nextSameTeam = next && next.role === card.role;
      if (prevOk && nextOk && !prevSameTeam && !nextSameTeam) valid.push(p);
    }
    if (valid.length === 0) {
      result.splice(secureRandomInt(result.length + 1), 0, card);
    } else {
      result.splice(valid[secureRandomInt(valid.length)], 0, card);
    }
  }

  // Final chaos pass: swap random adjacent citizen pairs to break patterns
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].role === "citizen" && result[i + 1].role === "citizen" && secureRandom() > 0.6) {
      [result[i], result[i + 1]] = [result[i + 1], result[i]];
    }
  }

  return result;
}

function generateCards() {
  const { count, mafiaCount, citizenCount, group } = state;
  const groupData = ROLES_DATA[group] && ROLES_DATA[group][count];
  let cards = [];
  let mafiaVariants = deepShuffle([0, 1, 2, 3]);
  let citizenVariants = deepShuffle([0, 1, 2, 3]);
  let mi = 0, ci = 0;

  if (groupData) {
    const mn = deepShuffle([...groupData.mafia]);
    const cn = deepShuffle([...groupData.citizen]);
    mn.forEach(n => cards.push({ role: "mafia", roleName: n, charVariant: mafiaVariants[mi++ % 4] }));
    cn.forEach(n => cards.push({ role: "citizen", roleName: n, charVariant: citizenVariants[ci++ % 4] }));
  } else if (state.customCards && state.customCards.length) {
    deepShuffle([...state.customCards]).forEach(c => cards.push({
      role: c.team, roleName: c.name,
      charVariant: c.team === "mafia" ? mafiaVariants[mi++ % 4] : citizenVariants[ci++ % 4]
    }));
  } else {
    for (let i = 0; i < mafiaCount; i++) cards.push({ role: "mafia", roleName: "مافیا ساده", charVariant: mafiaVariants[i % 4] });
    for (let i = 0; i < citizenCount; i++) cards.push({ role: "citizen", roleName: "شهروند ساده", charVariant: citizenVariants[i % 4] });
  }

  // Multi-layer smart shuffle
  cards = spreadShuffle(cards);

  // Cryptographic number assignment
  const nums = deepShuffle(Array.from({ length: count }, (_, i) => i + 1));
  state.cards = cards.map((c, i) => ({ ...c, number: nums[i] }));
  state.flipped = new Set();
  state.seen = new Set();
}

function shuffleCards() {
  stopAmbientLightning();
  generateCards();
  document.getElementById("completionBanner").classList.remove("show");
  document.getElementById("cardStage").style.display = "flex";
  state.queueIdx = 0;
  showCurrentCard();
}

function renderGame() {
  document.getElementById("gameGroupLabel").textContent = state.group;
  document.getElementById("statTotal").textContent = toFarsiNum(state.count);
  document.getElementById("statMafia").textContent = toFarsiNum(state.mafiaCount);
  document.getElementById("statCitizen").textContent = toFarsiNum(state.citizenCount);
  document.getElementById("completionBanner").classList.remove("show");
  document.getElementById("cardStage").style.display = "flex";
  document.getElementById("gameScreen").classList.add("game-fullscreen");
  document.querySelector(".container").style.display = "none";
  document.body.appendChild(document.getElementById("gameScreen"));
  document.getElementById("gameScreen").classList.add("active");
  state.queueIdx = 0;
  showCurrentCard();
}

function exitGameFullscreen() {
  stopAmbientLightning();
  const gs = document.getElementById("gameScreen");
  gs.classList.remove("game-fullscreen", "active");
  document.querySelector(".container").style.display = "block";
  document.querySelector(".container").appendChild(gs);
  showScreen("setup");
  document.getElementById("gameNavBtn").style.display = "block";
}

// ── Game Menu Toggle ──
function toggleGameMenu() {
  const menu = document.getElementById("gameMenu");
  if (menu) menu.classList.toggle("show");
}

function showCurrentCard() {
  const card = state.cards[state.queueIdx];
  const total = state.cards.length;
  const done = state.queueIdx;
  document.getElementById("fsProgLabel").textContent = `${toFarsiNum(done + 1)} / ${toFarsiNum(total)}`;
  document.getElementById("fsProgNums").textContent = `${toFarsiNum(total - done)} باقی‌مانده`;
  document.getElementById("fsProgressFill").style.width = `${(done / total) * 100}%`;
  const slot = document.getElementById("cardSlot");
  slot.innerHTML = `<div class="big-card-wrapper" style="animation: cardSlideUp 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards">${buildCard(card, false)}</div>`;
  const cardEl = slot.querySelector(".card");
  cardEl.addEventListener("click", e => flipCurrentCard(e, card));
  cardEl.style.touchAction = "manipulation";
}

// ── Haptic feedback helper ──
function haptic(style = 'light') {
  try {
    if (navigator.vibrate) {
      const patterns = { light: 10, medium: 25, heavy: 50 };
      navigator.vibrate(patterns[style] || 10);
    }
  } catch {}
}

let cardRevealed = false;

function flipCurrentCard(e, card) {
  const cardEl = document.querySelector("#cardSlot .card");
  if (!cardEl) return;

  // Card is showing role — go to next
  if (cardRevealed) {
    cardRevealed = false;
    stopAmbientLightning();
    if (state.queueIdx + 1 >= state.cards.length) { showCompletion(); }
    else { nextCard(); }
    return;
  }

  // Flip the card to show role
  cardEl.classList.add("flipped");
  cardRevealed = true;
  haptic('medium');
  spawnLightningFlash();
  startAmbientLightning();
  state.seen.add(card.number);
  spawnParticle(e, card.role === "mafia" ? "💀" : "⭐");
  setTimeout(() => showFunnyText(card), 500);
  setTimeout(() => {
    const front = cardEl.querySelector(".card-front");
    if (front) {
      const hint = document.createElement("div");
      hint.className = "tap-hint-next";
      hint.textContent = 'لمس کنید — نفر بعدی';
      front.appendChild(hint);
    }
  }, 600);
}

// ── Screen-wide lightning flash ──
function spawnLightningFlash() {
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed; inset: 0; z-index: 1; pointer-events: none; touch-action: none;
    background: radial-gradient(ellipse at 50% 50%, rgba(180,200,255,.2) 0%, rgba(100,120,255,.08) 40%, transparent 70%);
    animation: screenFlash 0.6s ease-out forwards;
  `;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

// ── Ambient lightning loop while card is revealed ──
let ambientLightningTimer = null;
let ambientLightningEl = null;

function startAmbientLightning() {
  stopAmbientLightning();
  // Append to gameScreen so it's visible in fullscreen mode
  const parent = document.getElementById("gameScreen") || document.body;
  ambientLightningEl = document.createElement("div");
  ambientLightningEl.id = "ambientLightning";
  ambientLightningEl.style.cssText = `
    position: fixed; inset: 0; z-index: 1; pointer-events: none; touch-action: none;
  `;
  parent.appendChild(ambientLightningEl);

  function strike() {
    if (!ambientLightningEl) return;
    // Random position for each bolt
    const x = 5 + Math.random() * 90;
    const y = 5 + Math.random() * 90;
    const angle = -30 + Math.random() * 60;
    const brightness = 0.4 + Math.random() * 0.4;

    // Main bolt
    const bolt = document.createElement("div");
    bolt.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      background:
        linear-gradient(${160 + angle}deg, transparent ${y - 3}%, rgba(160,180,255,${brightness}) ${y}%, transparent ${y + 2}%),
        linear-gradient(${190 + angle}deg, transparent ${y + 4}%, rgba(200,220,255,${brightness * 0.7}) ${y + 4.5}%, transparent ${y + 6}%),
        linear-gradient(${175 + angle}deg, transparent ${y - 8}%, rgba(120,140,255,${brightness * 0.4}) ${y - 7}%, transparent ${y - 5.5}%);
      animation: lightningFlash 0.5s ease-out forwards;
    `;
    // Glow around bolt
    const glow = document.createElement("div");
    glow.style.cssText = `
      position: absolute; pointer-events: none;
      width: 300px; height: 300px;
      left: ${x}%; top: ${y}%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(140,170,255,.25) 0%, rgba(100,130,255,.08) 40%, transparent 70%);
      animation: lightningGlow 0.6s ease-out forwards;
    `;
    // Screen flash
    const screenFlash = document.createElement("div");
    screenFlash.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      background: rgba(180,200,255,${brightness * 0.08});
      animation: lightningGlow 0.3s ease-out forwards;
    `;
    ambientLightningEl.appendChild(bolt);
    ambientLightningEl.appendChild(glow);
    ambientLightningEl.appendChild(screenFlash);
    setTimeout(() => { bolt.remove(); glow.remove(); screenFlash.remove(); }, 700);

    // Schedule next strike randomly (500ms - 1800ms)
    ambientLightningTimer = setTimeout(strike, 500 + Math.random() * 1300);
  }
  // First strike immediately
  ambientLightningTimer = setTimeout(strike, 200);
}

function stopAmbientLightning() {
  if (ambientLightningTimer) { clearTimeout(ambientLightningTimer); ambientLightningTimer = null; }
  if (ambientLightningEl) { ambientLightningEl.remove(); ambientLightningEl = null; }
}

function nextCard() {
  cardRevealed = false;
  const funny = document.querySelector(".funny-container");
  if (funny) funny.remove();
  const slot = document.getElementById("cardSlot");
  const wrapper = slot.querySelector(".big-card-wrapper");
  if (wrapper) {
    wrapper.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    wrapper.style.transform = "translateY(-40px) scale(0.9)";
    wrapper.style.opacity = "0";
  }
  setTimeout(() => { state.queueIdx++; showCurrentCard(); }, 300);
}

function showCompletion() {
  stopAmbientLightning();
  document.getElementById("cardStage").style.display = "none";
  document.getElementById("completionBanner").classList.add("show");
  document.getElementById("fsProgressFill").style.width = "100%";
  if (typeof promptNotifications === 'function') promptNotifications();
}

function buildCard(card, flipped = false) {
  const flippedClass = flipped ? "flipped" : "";
  const charSVG = getCharSVG(card.roleName, card.role, card.charVariant || 0);
  const displayName = translateRole(card.roleName);
  const sparks = card.role === "mafia" ? '<div class="mafia-sparks"></div>' : '<div class="citizen-sparks"></div>';
  const delay = (card.charVariant || 0) * 0.4;
  // Generate floating particles for card back
  let particles = '<div class="card-particles">';
  for (let i = 0; i < 12; i++) {
    const x = 10 + Math.random() * 80;
    const y = Math.random() * 30;
    const dur = 3 + Math.random() * 4;
    const del = Math.random() * 3;
    particles += `<div class="card-particle" style="--x:${x}%;--y:${y}%;--dur:${dur}s;--delay:${del}s"></div>`;
  }
  particles += '</div>';
  return `
    <div class="card ${flippedClass}" data-num="${card.number}">
      <div class="card-face card-back">
        ${particles}
        <div class="card-number">${toFarsiNum(card.number)}</div>
        <div class="tap-hint">لمس کنید</div>
      </div>
      <div class="card-face card-front ${card.role}">
        ${sparks}
        <div class="char-wrap" style="animation-delay:${delay}s">${charSVG}</div>
        <div class="char-shadow"></div>
        <div class="card-role-name">${displayName}</div>
      </div>
    </div>`;
}

function revealAll() {
  if (!authToken) {
    showToast("⚠️ برای بازبینی نقش‌ها وارد حساب شوید");
    exitGameFullscreen();
    openAuthModal('login');
    return;
  }

  const mafias = state.cards.filter(c => c.role === "mafia").sort((a, b) => a.number - b.number);
  const citizens = state.cards.filter(c => c.role === "citizen").sort((a, b) => a.number - b.number);
  const independents = state.cards.filter(c => c.role === "independent").sort((a, b) => a.number - b.number);

  const savedBadge = currentUser ? '<div style="text-align:center;margin-bottom:12px"><span style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:50px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:0.78rem;font-weight:700">✓ ذخیره شده در تاریخچه</span></div>' : '';

  let html = savedBadge + `<div class="summary-grid">
    <div class="summary-col mafia-col">
      <h4>😈 مافیا (${toFarsiNum(mafias.length)} نفر)</h4>
      <ul class="summary-list mafia-list">
        ${mafias.map(c => `<li>${ROLE_ICONS[c.roleName] || "🔴"} ${translateRole(c.roleName)} — #${toFarsiNum(c.number)}</li>`).join("")}
      </ul>
    </div>
    <div class="summary-col citizen-col">
      <h4>😇 شهروند (${toFarsiNum(citizens.length)} نفر)</h4>
      <ul class="summary-list citizen-list">
        ${citizens.map(c => `<li>${ROLE_ICONS[c.roleName] || "🟢"} ${translateRole(c.roleName)} — #${toFarsiNum(c.number)}</li>`).join("")}
      </ul>
    </div>`;
  if (independents.length) {
    html += `<div class="summary-col" style="grid-column:1/-1">
      <h4 style="color:#c084fc">🐺 مستقل (${toFarsiNum(independents.length)} نفر)</h4>
      <ul class="summary-list" style="gap:5px">
        ${independents.map(c => `<li style="background:rgba(192,132,252,.1);border:1px solid rgba(192,132,252,.2);color:#d8b4fe">${ROLE_ICONS[c.roleName] || "🟣"} ${translateRole(c.roleName)} — #${toFarsiNum(c.number)}</li>`).join("")}
      </ul>
    </div>`;
  }
  html += `</div>`;
  document.getElementById("revealContent").innerHTML = html;
  document.getElementById("revealOverlay").classList.add("show");
}

function closeOverlay() { document.getElementById("revealOverlay").classList.remove("show"); }
function flipAllBack() { shuffleCards(); }
function goBack() { exitGameFullscreen(); }

// ══════════════════════════════════════════
// MODERATOR TOOLS
// ══════════════════════════════════════════

let modTimerInterval = null;
let modTimerSeconds = 0;
let modTimerRunning = false;
let modIsNight = false;
let modVotes = {};

function openModeratorTools() {
  document.getElementById("completionBanner").classList.remove("show");
  document.getElementById("cardStage").style.display = "none";
  const panel = document.getElementById("modPanel");
  panel.style.display = "block";
  renderWarningPlayers();
  renderNightActions();
  resetModTimer();
}

function closeModPanel() {
  document.getElementById("modPanel").style.display = "none";
  document.getElementById("completionBanner").classList.add("show");
  if (modTimerInterval) { clearInterval(modTimerInterval); modTimerInterval = null; }
}

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
  document.getElementById("startBtn").style.display = "none";
  const csb = document.getElementById("customStartBtn"); if (csb) csb.style.display = "none";
  document.getElementById("countCard").style.display = "none";
  document.getElementById("customForm").classList.remove("show");
  document.querySelectorAll(".group-btn,.count-btn").forEach(b => b.classList.remove("selected"));
  exitGameFullscreen();
}

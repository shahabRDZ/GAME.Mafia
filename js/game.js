/* ── Game Logic ── */

// ── Narrator System ──
let narratorName = 'گرداننده شوشانگ';

function showNarratorModal() {
  const modal = document.getElementById("narratorModal");
  const input = document.getElementById("narratorNameInput");
  const info = document.getElementById("narratorScenarioInfo");

  // Load saved name
  const saved = localStorage.getItem('ShowShung_narrator');
  if (saved) { input.value = saved; narratorName = saved; }

  // Show scenario info
  info.innerHTML = `
    <span class="narrator-scenario-chip">🎭 ${state.group}</span>
    <span class="narrator-scenario-chip">👥 ${toFarsiNum(state.count)} نفر</span>
    <span class="narrator-scenario-chip">😈 ${toFarsiNum(state.mafiaCount)} مافیا</span>
  `;

  modal.classList.add("show");
  setTimeout(() => input.select(), 300);
}

function confirmNarrator() {
  const input = document.getElementById("narratorNameInput");
  narratorName = input.value.trim() || 'گرداننده شوشانگ';
  localStorage.setItem('ShowShung_narrator', narratorName);
  document.getElementById("narratorModal").classList.remove("show");

  if (window._nearbyNarratorMode) {
    window._nearbyNarratorMode = false;
    actualStartNearbyGame();
  } else {
    actualStartGame();
  }
}

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
  // Show narrator modal before starting
  showNarratorModal();
}

async function actualStartGame() {
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
  // Show narrator name
  const narratorEl = document.getElementById("fsNarrator");
  const narratorNameEl = document.getElementById("fsNarratorName");
  if (narratorEl && narratorNameEl) {
    narratorNameEl.textContent = narratorName;
    narratorEl.style.display = "block";
  }
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

// ══════════════════════════════════════════
// DIGITAL ROLE DISTRIBUTION
// ══════════════════════════════════════════
let digitalPollInterval = null;
let nfcWriter = null;
let nfcReader = null;

// ── Web NFC: Host pushes URL, Player auto-reads ──
async function startNfcBroadcast(code) {
  if (!('NDEFReader' in window)) return false;
  try {
    nfcWriter = new NDEFReader();
    const url = `${window.location.origin}?nfc=${code}`;
    await nfcWriter.write({
      records: [{ recordType: "url", data: url }]
    });
    return true;
  } catch {
    return false;
  }
}

async function startNfcScan() {
  if (!('NDEFReader' in window)) return false;
  try {
    nfcReader = new NDEFReader();
    await nfcReader.scan();
    nfcReader.addEventListener("reading", ({ message }) => {
      for (const record of message.records) {
        if (record.recordType === "url") {
          const text = new TextDecoder().decode(record.data);
          const match = text.match(/[?&]nfc=([A-Z0-9]{5})/);
          if (match) {
            haptic('heavy');
            if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 50]);
            autoJoinDigital(match[1]);
            return;
          }
        }
        if (record.recordType === "text") {
          const text = new TextDecoder().decode(record.data);
          if (/^[A-Z0-9]{5}$/.test(text)) {
            haptic('heavy');
            if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 50]);
            autoJoinDigital(text);
            return;
          }
        }
      }
    });
    return true;
  } catch {
    return false;
  }
}

async function autoJoinDigital(code) {
  try {
    const r = await fetch(API + "/api/digital/receive/" + code, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    haptic('heavy');
    showNfcRoleReveal(data);
  } catch {
    showToast("⚠️ خطا در دریافت نقش");
  }
}

function showNfcRoleReveal(data) {
  const role = data.role;
  const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
  const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
  const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };

  document.getElementById("digitalRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
  document.getElementById("digitalRoleName").textContent = role.name;
  document.getElementById("digitalRoleName").style.color = teamColors[role.team] || "#fff";
  document.getElementById("digitalRoleTeam").textContent = teamNames[role.team] || role.team;
  document.getElementById("digitalRoleTeam").style.color = teamColors[role.team] || "#fff";
  const abilityInfo = ROLE_ABILITIES[role.name];
  document.getElementById("digitalRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
  document.getElementById("digitalRoleNum").textContent = `بازیکن شماره ${toFarsiNum(data.playerNum)}`;

  document.getElementById("digitalJoinPhase").style.display = "none";
  document.getElementById("digitalTapPhase").style.display = "none";
  document.getElementById("digitalRolePhase").style.display = "block";
  document.getElementById("digitalPlayerOverlay").classList.add("show");
}

// ══════════════════════════════════════════
// NEARBY PLAYERS — Location-based
// ══════════════════════════════════════════
let nearbySearchInterval = null;
let nearbySelectedIds = new Set();
let nearbyRoleCheckInterval = null;

async function startNearbyGame() {
  if (!authToken) { showToast("⚠️ ابتدا وارد شوید"); openAuthModal('login'); return; }

  // Nearby only supports 10, 12, 13 player games
  if (!state.group || !state.count) { showToast("⚠️ سناریو و تعداد انتخاب کنید"); return; }
  if (![10, 12, 13].includes(state.count) && !state.isCustom) {
    showToast("⚠️ حرفه‌ای فقط برای ۱۰، ۱۲ و ۱۳ نفره");
    return;
  }

  // Get roles
  let roles = [];
  if (state.isCustom) {
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    if (customCardsList.length < 3 || mc < 1 || cc < 1) { showToast("⚠️ نقش‌ها ناکافی"); return; }
    roles = customCardsList.map(c => ({ name: c.name, team: c.team }));
  } else {
    const groupData = ROLES_DATA[state.group] && ROLES_DATA[state.group][state.count];
    if (!groupData) { showToast("⚠️ سناریو پیدا نشد"); return; }
    groupData.mafia.forEach(n => roles.push({ name: n, team: "mafia" }));
    groupData.citizen.forEach(n => roles.push({ name: n, team: "citizen" }));
  }
  window._nearbyRoles = roles;

  // Show narrator modal first, then proceed
  showNearbyNarratorModal();
}

function showNearbyNarratorModal() {
  const modal = document.getElementById("narratorModal");
  const input = document.getElementById("narratorNameInput");
  const info = document.getElementById("narratorScenarioInfo");

  const saved = localStorage.getItem('ShowShung_narrator');
  if (saved) { input.value = saved; narratorName = saved; }

  info.innerHTML = `
    <span class="narrator-scenario-chip">🎭 ${state.group}</span>
    <span class="narrator-scenario-chip">👥 ${toFarsiNum(state.count)} نفر</span>
    <span class="narrator-scenario-chip">📱 حرفه‌ای</span>
  `;

  // Override confirm to go to nearby instead of normal game
  window._nearbyNarratorMode = true;
  modal.classList.add("show");
  setTimeout(() => input.select(), 300);
}

function actualStartNearbyGame() {
  if (!navigator.geolocation) { showToast("⚠️ لوکیشن در دسترس نیست"); return; }

  document.getElementById("nearbyOverlay").classList.add("show");
  document.getElementById("nearbyScenarioInfo").textContent = `🎭 ${state.group} · ${toFarsiNum(state.count)} نفر`;
  document.getElementById("nearbyHostName").textContent = narratorName || (currentUser ? currentUser.username : 'گرداننده');
  document.getElementById("nearbyStatus").textContent = "در انتظار پلیر...";
  document.getElementById("nearbyPlayerList").innerHTML = "";
  document.getElementById("nearbyPlayerList").style.display = "block";
  document.getElementById("nearbyConfirmList").style.display = "none";
  document.getElementById("nearbyAssignBtn").style.display = "none";
  nearbySelectedIds = new Set();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Register as host with game info
      await apiFetch("/api/nearby/host-register", {
        method: "POST", body: JSON.stringify({ lat, lng, group: state.group, count: state.count }), _background: true
      });
      // Also register in players pool
      await apiFetch("/api/nearby/register", {
        method: "POST", body: JSON.stringify({ lat, lng }), _background: true
      });

      // Search nearby
      searchNearby(lat, lng);
      nearbySearchInterval = setInterval(() => searchNearby(lat, lng), 5000);
    },
    () => {
      document.getElementById("nearbyStatus").textContent = "❌ دسترسی به لوکیشن رد شد";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function searchNearby(lat, lng) {
  const r = await apiFetch("/api/nearby/find", {
    method: "POST", body: JSON.stringify({ lat, lng, radius: 200 }), _background: true
  });
  if (!r.ok) return;
  const players = r.data;
  const list = document.getElementById("nearbyPlayerList");

  if (!players.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)">هنوز کسی پیدا نشده...<br><span style="font-size:0.72rem">بازیکنان باید اپ رو باز کنن و لوکیشن بدن</span></div>';
    document.getElementById("nearbyStatus").textContent = "🔍 در حال جستجو...";
    return;
  }

  document.getElementById("nearbyStatus").textContent = `${toFarsiNum(players.length)} نفر پیدا شد`;

  list.innerHTML = players.map(p => {
    const sel = nearbySelectedIds.has(p.user_id);
    return `<div class="nearby-item${sel ? ' selected' : ''}" onclick="toggleNearbyPlayer(${p.user_id}, this)">
      ${renderAvatar(p.username, '2rem')}
      <span class="nearby-name">${escapeHtml(p.username)}</span>
      <span class="nearby-dist">${toFarsiNum(p.distance)} متر</span>
      <span class="nearby-check">${sel ? '✓' : ''}</span>
    </div>`;
  }).join('');

  updateNearbyAssignBtn();
}

function toggleNearbyPlayer(uid, el) {
  if (nearbySelectedIds.has(uid)) {
    nearbySelectedIds.delete(uid);
    el.classList.remove("selected");
    el.querySelector(".nearby-check").textContent = "";
  } else {
    nearbySelectedIds.add(uid);
    el.classList.add("selected");
    el.querySelector(".nearby-check").textContent = "✓";
  }
  haptic('light');
  updateNearbyAssignBtn();
}

function updateNearbyAssignBtn() {
  const btn = document.getElementById("nearbyAssignBtn");
  const roles = window._nearbyRoles || [];
  const requiredPlayers = roles.length; // all roles go to players, host is just moderator
  const selected = nearbySelectedIds.size;

  btn.style.display = "block";
  if (selected < requiredPlayers) {
    btn.textContent = `⏳ ${toFarsiNum(selected)} از ${toFarsiNum(requiredPlayers)} نفر — ${toFarsiNum(requiredPlayers - selected)} نفر مونده`;
    btn.disabled = true;
    btn.style.opacity = "0.5";
  } else {
    btn.textContent = `🎲 پخش رندوم نقش به ${toFarsiNum(requiredPlayers)} نفر`;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

async function assignNearbyRoles() {
  const roles = window._nearbyRoles || [];
  const playerIds = [...nearbySelectedIds];
  const requiredPlayers = roles.length;

  if (playerIds.length < requiredPlayers) {
    showToast(`⚠️ لیست ${toFarsiNum(requiredPlayers)} نفره تکمیل نشده — ${toFarsiNum(requiredPlayers - playerIds.length)} نفر مونده`);
    return;
  }

  const finalIds = playerIds.slice(0, requiredPlayers);
  const selectedRoles = roles.slice(0, requiredPlayers);

  const r = await apiFetch("/api/nearby/assign", {
    method: "POST",
    body: JSON.stringify({ player_ids: finalIds, roles: selectedRoles })
  });

  if (!r.ok) { showToast("⚠️ " + (r.data?.error || "خطا")); return; }

  haptic('heavy');
  showToast(`🎉 نقش‌ها به ${toFarsiNum(finalIds.length)} نفر ارسال شد!`);
  document.getElementById("nearbyStatus").textContent = "منتظر تأیید بازیکنان...";
  document.getElementById("nearbyAssignBtn").style.display = "none";
  document.getElementById("nearbyPlayerList").style.display = "none";

  // Show confirmation list with red/green lights
  const confirmList = document.getElementById("nearbyConfirmList");
  confirmList.style.display = "block";
  window._nearbyGameId = r.data.gameId;

  // Start polling confirmations
  if (window._confirmPoll) clearInterval(window._confirmPoll);
  window._confirmPoll = setInterval(() => pollConfirmations(r.data.gameId), 2000);
  pollConfirmations(r.data.gameId);
}

async function pollConfirmations(gameId) {
  const r = await apiFetch("/api/nearby/confirmations/" + gameId, { _background: true });
  if (!r.ok) return;
  const list = document.getElementById("nearbyConfirmList");
  const players = r.data;

  list.innerHTML = players.map(p =>
    `<div class="confirm-item">
      <div class="confirm-light${p.confirmed ? ' confirmed' : ''}"></div>
      ${renderAvatar(p.username, '1.8rem')}
      <span class="confirm-name">#${toFarsiNum(p.playerNum)} ${escapeHtml(p.username)}</span>
      <span class="confirm-status${p.confirmed ? ' done' : ''}">${p.confirmed ? '✓ دیده شد' : '⏳ منتظر'}</span>
      <button class="confirm-resend" onclick="resendToPlayer(${p.user_id})" title="ارسال مجدد">🔄</button>
    </div>`
  ).join('') +
  `<div style="display:flex;gap:8px;margin-top:12px">
    <button class="mod-btn" onclick="resendAllPlayers()" style="flex:1">🔄 ارسال مجدد به همه</button>
    <button class="mod-btn mod-btn-start" onclick="resetAndReshuffle()" style="flex:1">🎲 ریست و پخش مجدد</button>
  </div>`;

  const allConfirmed = players.length > 0 && players.every(p => p.confirmed);
  if (allConfirmed) {
    clearInterval(window._confirmPoll);
    document.getElementById("nearbyStatus").textContent = "✅ همه بازیکنان نقش خود را دیدند!";
    document.getElementById("nearbyStatus").style.color = "#4ade80";
    haptic('heavy');
    showToast("✅ همه نقش‌ها تأیید شد!");

    // Show moderator tools button
    list.innerHTML += `<div style="margin-top:16px">
      <button class="start-btn start-btn-nearby" onclick="closeNearby();openModeratorTools()" style="width:100%">🎙️ ابزار گرداننده</button>
    </div>`;
  }
}

async function resendToPlayer(userId) {
  const r = await apiFetch("/api/nearby/resend/" + userId, { method: "POST", _background: true });
  if (r.ok) {
    haptic('light');
    showToast("🔄 ارسال مجدد شد");
  } else {
    showToast("⚠️ خطا در ارسال مجدد");
  }
}

async function resendAllPlayers() {
  const gameId = window._nearbyGameId;
  if (!gameId) return;
  const r = await apiFetch("/api/nearby/confirmations/" + gameId, { _background: true });
  if (!r.ok) return;
  for (const p of r.data) {
    await apiFetch("/api/nearby/resend/" + p.user_id, { method: "POST", _background: true });
  }
  haptic('medium');
  showToast("🔄 به همه ارسال مجدد شد");
}

async function resetAndReshuffle() {
  const gameId = window._nearbyGameId;
  if (!gameId) { showToast("⚠️ بازی فعالی نیست"); return; }

  const r = await apiFetch("/api/nearby/reassign", {
    method: "POST", body: JSON.stringify({ gameId })
  });
  if (!r.ok) { showToast("⚠️ " + (r.data?.error || "خطا")); return; }

  haptic('heavy');
  showToast("🎲 نقش‌ها مجدداً پخش شد!");

  // Update game ID and restart polling
  window._nearbyGameId = r.data.gameId;
  document.getElementById("nearbyStatus").textContent = "🎲 نقش‌ها مجدد پخش شد — منتظر تأیید...";
  document.getElementById("nearbyStatus").style.color = "var(--accent2)";
  if (window._confirmPoll) clearInterval(window._confirmPoll);
  window._confirmPoll = setInterval(() => pollConfirmations(r.data.gameId), 2000);
  pollConfirmations(r.data.gameId);
}

function closeNearby() {
  document.getElementById("nearbyOverlay").classList.remove("show");
  if (nearbySearchInterval) { clearInterval(nearbySearchInterval); nearbySearchInterval = null; }
}

// ── Player side: enter name → find hosts → pick one → wait for role ──
let hostSearchInterval = null;
let playerLat = null, playerLng = null;
let playerDisplayName = '';

function openHostList() {
  if (!authToken) { showToast("⚠️ ابتدا وارد حساب شوید"); openAuthModal('login'); return; }

  // Show name input first
  document.getElementById("playerNamePhase").style.display = "block";
  document.getElementById("hostPickPhase").style.display = "none";
  const nameInput = document.getElementById("playerNameInput");
  nameInput.value = currentUser ? currentUser.username : '';
  document.getElementById("hostListOverlay").classList.add("show");
  setTimeout(() => nameInput.select(), 300);
}

function submitPlayerName() {
  const name = document.getElementById("playerNameInput").value.trim();
  if (!name) { showToast("⚠️ اسم رو وارد کنید"); return; }
  playerDisplayName = name;

  if (!navigator.geolocation) { showToast("⚠️ لوکیشن در دسترس نیست"); return; }

  // Switch to host pick phase
  document.getElementById("playerNamePhase").style.display = "none";
  document.getElementById("hostPickPhase").style.display = "block";
  document.getElementById("hostListHint").textContent = "📍 در حال دریافت لوکیشن...";
  document.getElementById("hostListContent").innerHTML = "";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      playerLat = pos.coords.latitude;
      playerLng = pos.coords.longitude;
      document.getElementById("hostListHint").textContent = "🔍 در حال جستجوی گرداننده‌ها...";
      searchHosts();
      hostSearchInterval = setInterval(searchHosts, 4000);
    },
    () => {
      document.getElementById("hostListHint").textContent = "❌ دسترسی لوکیشن رد شد — از تنظیمات فعال کنید";
    },
    { enableHighAccuracy: true }
  );
}

function closeHostList() {
  document.getElementById("hostListOverlay").classList.remove("show");
  if (hostSearchInterval) { clearInterval(hostSearchInterval); hostSearchInterval = null; }
}

async function searchHosts() {
  if (!playerLat) return;
  const r = await apiFetch("/api/nearby/hosts", {
    method: "POST", body: JSON.stringify({ lat: playerLat, lng: playerLng }), _background: true
  });
  if (!r.ok) return;
  const hosts = r.data;
  const container = document.getElementById("hostListContent");

  if (!hosts.length) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--dim)">هنوز گرداننده‌ای پیدا نشده...<br><span style="font-size:0.72rem">گرداننده باید «حرفه‌ای» را بزند</span></div>';
    document.getElementById("hostListHint").textContent = "🔍 در حال جستجو...";
    return;
  }

  document.getElementById("hostListHint").textContent = `${toFarsiNum(hosts.length)} گرداننده پیدا شد`;
  container.innerHTML = hosts.map(h => `
    <div class="host-item" onclick="joinHostGame(${h.user_id})">
      ${renderAvatar(h.username, '2.2rem')}
      <div class="host-info">
        <div class="host-name">${escapeHtml(h.username)}</div>
        <div class="host-meta">🎭 ${escapeHtml(h.group)} · 👥 ${toFarsiNum(h.count)} نفر · ${toFarsiNum(h.distance)} متر</div>
      </div>
      <div class="host-join-icon">→</div>
    </div>
  `).join('');
}

async function joinHostGame(hostId) {
  if (!playerLat) return;
  const r = await apiFetch("/api/nearby/join-host/" + hostId, {
    method: "POST", body: JSON.stringify({ lat: playerLat, lng: playerLng, displayName: playerDisplayName })
  });
  if (!r.ok) { showToast("⚠️ خطا در اتصال"); return; }

  closeHostList();
  haptic('medium');
  showToast("✅ به بازی متصل شدید — منتظر پخش نقش باشید");

  // Start polling for role
  if (nearbyRoleCheckInterval) clearInterval(nearbyRoleCheckInterval);
  nearbyRoleCheckInterval = setInterval(checkMyNearbyRole, 2000);
}

// ── Player: flip card to confirm ──
let nearbyGameId = null;
let nearbyRoleData = null;

function flipNearbyCard() {
  const card = document.getElementById("nearbyCard");
  if (card.classList.contains("flipped")) return;
  card.classList.add("flipped");
  haptic('medium');

  // Send confirmation to server
  if (nearbyGameId) {
    apiFetch("/api/nearby/confirm/" + nearbyGameId, { method: "POST", _background: true });
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    document.getElementById("nearbyRoleOverlay").classList.remove("show");
  }, 5000);
}

function closeNearbyRole() {
  document.getElementById("nearbyRoleOverlay").classList.remove("show");
  // Keep polling alive for resend/reshuffle
}

async function checkMyNearbyRole() {
  const r = await apiFetch("/api/nearby/my-role", { _background: true });
  if (!r.ok || !r.data.assigned) return;

  // If already confirmed this game, skip (wait for new game)
  if (r.data.gameId === nearbyGameId && document.getElementById("nearbyCard")?.classList.contains("flipped")) {
    // Check if resend — confirmation was reset
    if (!r.data.confirmed) {
      // Resend! Reset card for re-viewing
      document.getElementById("nearbyCard").classList.remove("flipped");
    }
    return;
  }

  // New role or first time — don't stop polling (allow resend)
  const role = r.data.role;

  // Strong vibration pattern
  haptic('heavy');
  if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 100]);

  // Play alarm sound
  if (typeof playAlarm === 'function') playAlarm();

  // Push notification
  if (typeof sendLocalNotification === 'function') {
    sendLocalNotification('🎭 نقش شما آماده شد!', `${role.name} — الان ببینید!`);
  }

  nearbyGameId = r.data.gameId;
  nearbyRoleData = role;

  // Setup card — back side shows player number, front shows role
  const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
  const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
  const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };
  const teamBg = { mafia: "radial-gradient(ellipse at 50% 30%, #1a0000, #0a0000)", citizen: "radial-gradient(ellipse at 50% 30%, #001a10, #000a08)", independent: "radial-gradient(ellipse at 50% 30%, #1a0030, #0a0018)" };

  // Card back
  document.getElementById("nearbyCardNum").textContent = toFarsiNum(r.data.playerNum);

  // Card front
  document.getElementById("nearbyRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
  document.getElementById("nearbyRoleName").textContent = role.name;
  document.getElementById("nearbyRoleName").style.color = teamColors[role.team] || "#fff";
  document.getElementById("nearbyRoleTeam").textContent = teamNames[role.team] || role.team;
  document.getElementById("nearbyRoleTeam").style.color = teamColors[role.team] || "#fff";
  const abilityInfo = ROLE_ABILITIES[role.name];
  document.getElementById("nearbyRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
  document.getElementById("nearbyRoleNum").textContent = `بازیکن شماره ${toFarsiNum(r.data.playerNum)}`;
  document.getElementById("nearbyCardFront").style.background = teamBg[role.team] || "";
  document.getElementById("nearbyCardFront").style.borderColor = teamColors[role.team] || "";

  // Reset card to back
  document.getElementById("nearbyCard").classList.remove("flipped");

  // Show overlay — card is face down, player taps to flip
  document.getElementById("nearbyRoleOverlay").classList.add("show");

  showToast("🎭 نقش شما آماده شد — لمس کنید!");
}

function generateHostQr(code) {
  // Simple QR using ZXing on server or a tiny inline generator
  const container = document.getElementById("digitalQrContainer");
  if (!container) return;
  const url = `${window.location.origin}?nfc=${code}`;
  // Use a simple img tag with Google Charts QR API (works offline if cached)
  container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}" alt="QR" style="width:120px;height:120px;border-radius:8px;margin:8px auto;display:block;background:#fff;padding:4px">
    <div style="font-size:0.68rem;color:var(--dim)">آیفون: QR اسکن کنید</div>`;
}

async function startDigitalGame() {
  // Gather roles like startGame does
  let roles = [];
  if (state.isCustom) {
    const name = document.getElementById("customName").value.trim() || "گروه دلخواه";
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    if (customCardsList.length < 3) { showToast("⚠️ حداقل ۳ کارت اضافه کنید"); return; }
    if (mc < 1) { showToast("⚠️ حداقل یک کارت مافیا لازم است"); return; }
    if (cc < 1) { showToast("⚠️ حداقل یک کارت شهروند لازم است"); return; }
    state.group = name;
    roles = customCardsList.map(c => ({ name: c.name, team: c.team }));
  } else {
    if (!state.group || !state.count) { showToast("⚠️ لطفاً گروه و تعداد را انتخاب کنید"); return; }
    const groupData = ROLES_DATA[state.group] && ROLES_DATA[state.group][state.count];
    if (!groupData) { showToast("⚠️ داده سناریو یافت نشد"); return; }
    groupData.mafia.forEach(n => roles.push({ name: n, team: "mafia" }));
    groupData.citizen.forEach(n => roles.push({ name: n, team: "citizen" }));
  }

  // Create room on server
  try {
    const r = await fetch(API + "/api/digital/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles, group: state.group })
    });
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    // Show host overlay with code
    document.getElementById("digitalCode").textContent = data.code;
    document.getElementById("digitalTotal").textContent = toFarsiNum(data.total);
    document.getElementById("digitalAssigned").textContent = toFarsiNum(0);
    document.getElementById("digitalProgressBar").style.width = "0%";
    document.getElementById("digitalStatus").textContent = "در انتظار بازیکنان...";
    document.getElementById("digitalOverlay").classList.add("show");

    // Generate QR for iOS fallback
    try {
      const qrUrl = `${window.location.origin}?nfc=${data.code}`;
      const qrContainer = document.getElementById("digitalQrContainer");
      const writer = new (await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm')).default;
    } catch {}
    // Simple QR using canvas
    generateHostQr(data.code);

    // Try NFC broadcast (Android Chrome only)
    const nfcOk = await startNfcBroadcast(data.code);
    if (nfcOk) {
      document.getElementById("digitalNfcStatus").querySelector('div:nth-child(2)').textContent = "📡 NFC فعال — گوشی بازیکن را نزدیک کنید";
    }

    // Poll for status updates
    if (digitalPollInterval) clearInterval(digitalPollInterval);
    digitalPollInterval = setInterval(() => pollDigitalStatus(data.code), 2000);

  } catch (e) {
    showToast("⚠️ خطا در اتصال به سرور");
  }
}

async function pollDigitalStatus(code) {
  try {
    const r = await fetch(API + "/api/digital/status/" + code);
    const data = await r.json();
    if (!r.ok) return;

    document.getElementById("digitalAssigned").textContent = toFarsiNum(data.assigned);
    const pct = data.total > 0 ? (data.assigned / data.total) * 100 : 0;
    document.getElementById("digitalProgressBar").style.width = pct + "%";

    if (data.done) {
      document.getElementById("digitalStatus").textContent = "🎉 همه نقش‌ها تقسیم شد!";
      document.getElementById("digitalStatus").style.color = "#4ade80";
      clearInterval(digitalPollInterval);
      digitalPollInterval = null;
      haptic('heavy');
    } else {
      document.getElementById("digitalStatus").textContent = `${toFarsiNum(data.remaining)} نقش باقی‌مانده`;
    }
  } catch {}
}

function closeDigitalRoom() {
  document.getElementById("digitalOverlay").classList.remove("show");
  if (digitalPollInterval) { clearInterval(digitalPollInterval); digitalPollInterval = null; }
}

// ── Player side: join and receive ──
let digitalConnectedCode = null;

async function openDigitalPlayer() {
  document.getElementById("digitalJoinPhase").style.display = "block";
  document.getElementById("digitalTapPhase").style.display = "none";
  document.getElementById("digitalRolePhase").style.display = "none";
  document.getElementById("digitalJoinCode").value = "";
  digitalConnectedCode = null;
  document.getElementById("digitalPlayerOverlay").classList.add("show");

  // Try NFC scan — if available, auto-receive on tap
  const nfcOk = await startNfcScan();
  if (nfcOk) {
    document.getElementById("digitalPlayerNfcHint").textContent = "✅ NFC فعال — نزدیک کنید";
    document.getElementById("digitalPlayerNfcHint").style.color = "#4ade80";
  } else {
    document.getElementById("digitalPlayerNfcText").innerHTML = "NFC در دسترس نیست<br>از <strong>کد</strong> یا <strong>QR</strong> استفاده کنید";
    document.getElementById("digitalPlayerNfcHint").textContent = "آیفون / مرورگر قدیمی";
    document.getElementById("digitalNfcScanArea").style.borderColor = "rgba(255,255,255,.1)";
    document.getElementById("digitalNfcScanArea").style.opacity = "0.5";
  }

  setTimeout(() => document.getElementById("digitalJoinCode").focus(), 300);
}

function closeDigitalPlayer() {
  document.getElementById("digitalPlayerOverlay").classList.remove("show");
  digitalConnectedCode = null;
}

// Phase 1: Connect to room (enter code once)
async function connectToRoom() {
  const code = document.getElementById("digitalJoinCode").value.trim().toUpperCase();
  if (code.length !== 5) { showToast("⚠️ کد اتاق باید ۵ حرفی باشد"); return; }

  try {
    const r = await fetch(API + "/api/digital/info/" + code);
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "اتاق پیدا نشد")); return; }

    digitalConnectedCode = code;
    document.getElementById("digitalJoinPhase").style.display = "none";
    document.getElementById("digitalTapPhase").style.display = "block";
    document.getElementById("digitalRoomInfo").innerHTML =
      `🎭 ${data.group} · 👥 ${toFarsiNum(data.total)} نفر · ${toFarsiNum(data.remaining)} باقی‌مانده`;
    haptic('light');
  } catch {
    showToast("⚠️ خطا در اتصال");
  }
}

// Phase 2: Tap to receive role (one tap = one role)
async function tapToReceiveRole() {
  if (!digitalConnectedCode) return;
  const tapArea = document.getElementById("digitalTapArea");
  tapArea.classList.add("receiving");

  try {
    const r = await fetch(API + "/api/digital/receive/" + digitalConnectedCode, { method: "POST" });
    const data = await r.json();

    if (!r.ok) {
      showToast("⚠️ " + (data.error || "خطا"));
      tapArea.classList.remove("receiving");
      return;
    }

    // Heavy vibration — feels like NFC transfer
    haptic('heavy');
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);

    const role = data.role;
    const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
    const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
    const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };

    document.getElementById("digitalRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
    document.getElementById("digitalRoleName").textContent = role.name;
    document.getElementById("digitalRoleName").style.color = teamColors[role.team] || "#fff";
    document.getElementById("digitalRoleTeam").textContent = teamNames[role.team] || role.team;
    document.getElementById("digitalRoleTeam").style.color = teamColors[role.team] || "#fff";
    const abilityInfo = ROLE_ABILITIES[role.name];
    document.getElementById("digitalRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
    document.getElementById("digitalRoleNum").textContent = `بازیکن شماره ${toFarsiNum(data.playerNum)}`;

    // Switch to role reveal
    document.getElementById("digitalTapPhase").style.display = "none";
    document.getElementById("digitalRolePhase").style.display = "block";

  } catch {
    showToast("⚠️ خطا در دریافت نقش");
    tapArea.classList.remove("receiving");
  }
}

// Back to tap phase for next player
function backToTapPhase() {
  document.getElementById("digitalRolePhase").style.display = "none";
  document.getElementById("digitalTapPhase").style.display = "block";
  // Update remaining count
  fetch(API + "/api/digital/info/" + digitalConnectedCode)
    .then(r => r.json())
    .then(data => {
      if (data.remaining <= 0) {
        document.getElementById("digitalRoomInfo").innerHTML = "🎉 همه نقش‌ها تقسیم شد!";
        document.getElementById("digitalTapArea").style.display = "none";
      } else {
        document.getElementById("digitalRoomInfo").innerHTML =
          `🎭 ${data.group} · ${toFarsiNum(data.remaining)} نقش باقی‌مانده`;
      }
    }).catch(() => {});
}
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

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

function showCurrentCard() {
  const card = state.cards[state.queueIdx];
  const total = state.cards.length;
  const done = state.queueIdx;
  document.getElementById("fsProgLabel").textContent = `کارت ${toFarsiNum(done + 1)} از ${toFarsiNum(total)}`;
  document.getElementById("fsProgNums").textContent = `${toFarsiNum(total - done)} باقی‌مانده`;
  document.getElementById("fsProgressFill").style.width = `${(done / total) * 100}%`;
  const slot = document.getElementById("cardSlot");
  slot.innerHTML = `<div class="big-card-wrapper card-entering">${buildCard(card, false)}</div>`;
  const cardEl = slot.querySelector(".card");
  cardEl.addEventListener("click", e => flipCurrentCard(e, card));
  initSwipeGesture(slot.querySelector(".big-card-wrapper"), card);
}

// ── Swipe gesture for cards ──
function initSwipeGesture(wrapper, card) {
  if (!wrapper) return;
  let startX = 0, startY = 0, currentX = 0, isDragging = false;
  const threshold = 60;

  wrapper.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    isDragging = true;
    wrapper.style.transition = "none";
  }, { passive: true });

  wrapper.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const cardEl = wrapper.querySelector(".card");
    if (!cardEl || !cardEl.classList.contains("flipped")) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > Math.abs(dx)) return; // vertical scroll
    currentX = dx;
    wrapper.style.transform = `translateX(${dx * 0.5}px) rotate(${dx * 0.04}deg)`;
    wrapper.style.opacity = Math.max(0.5, 1 - Math.abs(dx) / 400);
  }, { passive: true });

  wrapper.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    const cardEl = wrapper.querySelector(".card");
    if (cardEl && cardEl.classList.contains("flipped") && Math.abs(currentX) > threshold) {
      haptic('light');
      wrapper.style.transform = `translateX(${currentX > 0 ? 300 : -300}px) rotate(${currentX > 0 ? 15 : -15}deg)`;
      wrapper.style.opacity = "0";
      setTimeout(() => {
        if (state.queueIdx + 1 >= state.cards.length) { showCompletion(); }
        else { state.queueIdx++; showCurrentCard(); }
      }, 250);
    } else {
      wrapper.style.transform = "";
      wrapper.style.opacity = "";
    }
  }, { passive: true });
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

function flipCurrentCard(e, card) {
  const cardEl = document.querySelector("#cardSlot .card");
  if (!cardEl) return;
  if (cardEl.classList.contains("flipped")) {
    stopAmbientLightning();
    if (state.queueIdx + 1 >= state.cards.length) { showCompletion(); }
    else { nextCard(); }
    return;
  }
  // Lightning effect before flip
  cardEl.classList.add("lightning-active");
  haptic('heavy');
  spawnLightningFlash();
  setTimeout(() => {
    cardEl.classList.remove("lightning-active");
    cardEl.classList.add("flipped");
    haptic('medium');
    // Start ambient lightning loop on background
    startAmbientLightning();
  }, 350);
  state.seen.add(card.number);
  spawnParticle(e, card.role === "mafia" ? "💀" : "⭐");
  // Show funny text after flip
  setTimeout(() => showFunnyText(card), 850);
  setTimeout(() => {
    const front = cardEl.querySelector(".card-front");
    if (front) {
      const hint = document.createElement("div");
      hint.className = "tap-hint-next";
      hint.textContent = "بکشید یا لمس کنید — نفر بعدی";
      front.appendChild(hint);
    }
  }, 950);
}

// ── Screen-wide lightning flash ──
function spawnLightningFlash() {
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed; inset: 0; z-index: 200; pointer-events: none;
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
  // Create persistent ambient container
  ambientLightningEl = document.createElement("div");
  ambientLightningEl.id = "ambientLightning";
  ambientLightningEl.style.cssText = `
    position: fixed; inset: 0; z-index: 50; pointer-events: none;
  `;
  document.body.appendChild(ambientLightningEl);

  function strike() {
    if (!ambientLightningEl) return;
    // Random position for each bolt
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const angle = -20 + Math.random() * 40;
    const bolt = document.createElement("div");
    bolt.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      background:
        linear-gradient(${170 + angle}deg, transparent ${y - 2}%, rgba(140,160,255,.5) ${y}%, transparent ${y + 1.5}%),
        linear-gradient(${185 + angle}deg, transparent ${y + 5}%, rgba(180,200,255,.3) ${y + 5.5}%, transparent ${y + 7}%);
      animation: lightningFlash 0.5s ease-out forwards;
    `;
    const glow = document.createElement("div");
    glow.style.cssText = `
      position: absolute; pointer-events: none;
      width: 200px; height: 200px;
      left: ${x}%; top: ${y}%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(140,170,255,.15) 0%, transparent 70%);
      animation: lightningGlow 0.5s ease-out forwards;
    `;
    ambientLightningEl.appendChild(bolt);
    ambientLightningEl.appendChild(glow);
    setTimeout(() => { bolt.remove(); glow.remove(); }, 600);

    // Schedule next strike randomly (800ms - 2500ms)
    ambientLightningTimer = setTimeout(strike, 800 + Math.random() * 1700);
  }
  // First strike after short delay
  ambientLightningTimer = setTimeout(strike, 400);
}

function stopAmbientLightning() {
  if (ambientLightningTimer) { clearTimeout(ambientLightningTimer); ambientLightningTimer = null; }
  if (ambientLightningEl) { ambientLightningEl.remove(); ambientLightningEl = null; }
}

function nextCard() {
  const funny = document.querySelector(".funny-container");
  if (funny) funny.remove();
  const slot = document.getElementById("cardSlot");
  const wrapper = slot.querySelector(".big-card-wrapper");
  if (wrapper) { wrapper.classList.remove("card-entering"); wrapper.classList.add("card-exiting"); }
  setTimeout(() => { state.queueIdx++; showCurrentCard(); }, 300);
}

function showCompletion() {
  stopAmbientLightning();
  document.getElementById("cardStage").style.display = "none";
  document.getElementById("completionBanner").classList.add("show");
  document.getElementById("fsProgressFill").style.width = "100%";
}

function buildCard(card, flipped = false) {
  const flippedClass = flipped ? "flipped" : "";
  const charSVG = getCharSVG(card.roleName, card.role, card.charVariant || 0);
  const displayName = translateRole(card.roleName);
  const sparks = card.role === "mafia" ? '<div class="mafia-sparks"></div>' : card.role === "independent" ? '<div class="citizen-sparks"></div>' : '<div class="citizen-sparks"></div>';
  const delay = (card.charVariant || 0) * 0.4;
  return `
    <div class="card ${flippedClass}" data-num="${card.number}">
      <div class="card-face card-back">
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
  const mafias = state.cards.filter(c => c.role === "mafia").sort((a, b) => a.number - b.number);
  const citizens = state.cards.filter(c => c.role === "citizen").sort((a, b) => a.number - b.number);
  const independents = state.cards.filter(c => c.role === "independent").sort((a, b) => a.number - b.number);
  let html = `<div class="summary-grid">
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

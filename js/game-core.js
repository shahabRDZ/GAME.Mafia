/* ── Game Logic ── */

// ── Role → Image map (img/roles/) ──
const ROLE_IMAGES = {
  // ── Citizens ──
  "بازپرس":               "img/roles/bazpors.png",
  "تکاور":                "img/roles/takavar.png",
  "کارآگاه":              "img/roles/karaagah.png",
  "کارآگاه ویژه":         "img/roles/karaagah-vijeh.png",
  "دکتر":                 "img/roles/doktor-lecter.png",
  "حرفه‌ای":              "img/roles/herfeh-ei.png",
  "تک‌تیرانداز":         "img/roles/herfeh-ei.png",
  "اسنایپر":              "img/roles/herfeh-ei.png",
  "تفنگدار":              "img/roles/herfeh-ei.png",
  "جان‌سخت":              "img/roles/jaan-sakht.png",
  "رویین‌تن":             "img/roles/jaan-sakht.png",
  "زره‌پوش":              "img/roles/jaan-sakht.png",
  "نگهبان":               "img/roles/negahbaan.png",
  "محافظ":                "img/roles/negahbaan.png",
  "بادیگارد":             "img/roles/negahbaan.png",
  "نخبه":                 "img/roles/nokhbeh.png",
  "شکارچی":               "img/roles/shekaarchi.png",
  "هانتر":                "img/roles/shekaarchi.png",
  "زندانبان":             "img/roles/zanjaanbaar.png",
  "پرستار":               "img/roles/kashish.png",
  "کشیش":                 "img/roles/kashish.png",
  "شهروند ساده":          "img/roles/naanvaa.png",
  "جادوگر":               "img/roles/jaadoogar.png",
  "صداپیشه":              "img/roles/sedaapisheh.png",
  "خبرنگار":              "img/roles/khabarnegarr.png",
  "نانوا":                "img/roles/naanvaa.png",
  "ساقی":                 "img/roles/saaqi.png",
  "قاضی":                 "img/roles/jellad.png",
  "وکیل":                 "img/roles/vakil.png",
  "راهنما":               "img/roles/daaneshvar.png",
  "روانشناس":             "img/roles/daaneshvar.png",
  "مین‌گذار":             "img/roles/terrorist.png",
  "سرباز":                "img/roles/takavar.png",
  "کارگاه":               "img/roles/nokhbeh.png",
  // ── Mafia ──
  "پدرخوانده":            "img/roles/pedar-khandeh.png",
  "رئیس مافیا":           "img/roles/pedar-khandeh.png",
  "دکتر لکتر":            "img/roles/doktor-lecter.png",
  "معشوقه":               "img/roles/mashogheh.png",
  "ناتاشا":               "img/roles/mashogheh.png",
  "روانکاو":              "img/roles/ravaankav.png",
  "شاه‌کش":              "img/roles/shaah-kosh.png",
  "تروریست":              "img/roles/terrorist.png",
  "بمب‌گذار":            "img/roles/terrorist.png",
  "ترور":                 "img/roles/terrorist.png",
  "مذاکره‌کننده":         "img/roles/mozakere-konandeh.png",
  "گروگان‌گیر":           "img/roles/groogan-gir.png",
  "دزد":                  "img/roles/dozd.png",
  "شارلاتان":             "img/roles/joker-mafia.png",
  "دست راست پدرخوانده":  "img/roles/dast-rast.png",
  "جاسوس":               "img/roles/jaasoos.png",
  "جوکر مافیا":           "img/roles/joker-mafia.png",
  "جوکر":                 "img/roles/joker-mafia.png",
  "هکر":                  "img/roles/jaasoos.png",
  "نینجا":                "img/roles/jaasoos.png",
  "ناتو":                 "img/roles/mafia-sadeh.png",
  "شیاد":                 "img/roles/joker-mafia.png",
  "کانسور":               "img/roles/ravaankav.png",
  "مافیای ساده":          "img/roles/mafia-sadeh.png",
  "مافیا ساده":           "img/roles/mafia-sadeh.png",
  "یاغی":                 "img/roles/motor-savar.png",
  // ── Independent ──
  "سندیکا":               "img/roles/sendika.png",
  "جانی":                 "img/roles/jaani.png",
  "قاتل زنجیره‌ای":      "img/roles/jaani.png",
  "جلاد":                 "img/roles/jellad.png",
  "هزارچهره":             "img/roles/mashogheh.png",
};

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
  document.getElementById('customOverlay')?.classList.remove('show');
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
    const inn = deepShuffle([...(groupData.independent || [])]);
    mn.forEach(n => cards.push({ role: "mafia", roleName: n, charVariant: mafiaVariants[mi++ % 4] }));
    cn.forEach(n => cards.push({ role: "citizen", roleName: n, charVariant: citizenVariants[ci++ % 4] }));
    inn.forEach(n => cards.push({ role: "independent", roleName: n, charVariant: citizenVariants[ci++ % 4] }));
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
  const displayName = translateRole(card.roleName);
  const sparks = card.role === "mafia" ? '<div class="mafia-sparks"></div>' : '<div class="citizen-sparks"></div>';
  const delay = (card.charVariant || 0) * 0.4;
  const roleImgSrc = ROLE_IMAGES[card.roleName];
  const charContent = roleImgSrc
    ? `<img src="${roleImgSrc}" class="char-img" alt="${displayName}" loading="eager" draggable="false">`
    : getCharSVG(card.roleName, card.role, card.charVariant || 0);
  const charWrapClass = roleImgSrc ? "char-wrap has-img" : "char-wrap";
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
      </div>
      <div class="card-face card-front ${card.role}${roleImgSrc ? ' has-img' : ''}">
        ${sparks}
        <div class="${charWrapClass}" style="${roleImgSrc ? '' : `animation-delay:${delay}s`}">${charContent}</div>
        ${roleImgSrc ? '' : '<div class="char-shadow"></div>'}
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


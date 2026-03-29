/* ── Game Logic ── */

async function startGame() {
  if (state.isCustom) {
    const name = document.getElementById("customName").value.trim() || "گروه دلخواه";
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    if (customCardsList.length < 3) { showToast("⚠️ حداقل ۳ کارت اضافه کنید"); return; }
    if (mc < 1) { showToast("⚠️ حداقل یک کارت مافیا لازم است"); return; }
    if (cc < 1) { showToast("⚠️ حداقل یک کارت شهروند لازم است"); return; }
    state.group = name;
    state.count = customCardsList.length;
    state.mafiaCount = mc;
    state.citizenCount = cc;
    state.customCards = [...customCardsList];
  }
  if (!state.group || !state.count) { showToast("⚠️ لطفاً گروه و تعداد را انتخاب کنید"); return; }
  generateCards();
  renderGame();
  await saveGame();
  document.getElementById("gameNavBtn").style.display = "block";
  showScreen("game");
}

function spreadShuffle(cards) {
  const mafias = cards.filter(c => c.role === "mafia");
  const citizens = cards.filter(c => c.role === "citizen");
  // Shuffle each group independently
  for (let i = mafias.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mafias[i], mafias[j]] = [mafias[j], mafias[i]]; }
  for (let i = citizens.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [citizens[i], citizens[j]] = [citizens[j], citizens[i]]; }
  // Insert mafias into random slots among citizens, ensuring no two adjacent
  const result = [...citizens];
  for (let m = 0; m < mafias.length; m++) {
    // Find all valid positions (not next to another mafia)
    const valid = [];
    for (let p = 0; p <= result.length; p++) {
      const prev = p > 0 ? result[p - 1] : null;
      const next = p < result.length ? result[p] : null;
      if ((!prev || prev.role !== "mafia") && (!next || next.role !== "mafia")) {
        valid.push(p);
      }
    }
    if (valid.length === 0) {
      // Fallback: just insert at random position
      result.splice(Math.floor(Math.random() * (result.length + 1)), 0, mafias[m]);
    } else {
      const pos = valid[Math.floor(Math.random() * valid.length)];
      result.splice(pos, 0, mafias[m]);
    }
  }
  return result;
}

function generateCards() {
  const { count, mafiaCount, citizenCount, group } = state;
  const groupData = ROLES_DATA[group] && ROLES_DATA[group][count];
  let cards = [];
  let mafiaVariants = [0, 1, 2, 3].sort(() => Math.random() - .5);
  let citizenVariants = [0, 1, 2, 3].sort(() => Math.random() - .5);
  let mi = 0, ci = 0;

  if (groupData) {
    const mn = [...groupData.mafia], cn = [...groupData.citizen];
    for (let i = mn.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mn[i], mn[j]] = [mn[j], mn[i]]; }
    for (let i = cn.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cn[i], cn[j]] = [cn[j], cn[i]]; }
    mn.forEach(n => cards.push({ role: "mafia", roleName: n, charVariant: mafiaVariants[mi++ % 4] }));
    cn.forEach(n => cards.push({ role: "citizen", roleName: n, charVariant: citizenVariants[ci++ % 4] }));
  } else if (state.customCards && state.customCards.length) {
    state.customCards.forEach(c => cards.push({
      role: c.team, roleName: c.name,
      charVariant: c.team === "mafia" ? mafiaVariants[mi++ % 4] : citizenVariants[ci++ % 4]
    }));
  } else {
    for (let i = 0; i < mafiaCount; i++) cards.push({ role: "mafia", roleName: "مافیا ساده", charVariant: mafiaVariants[i % 4] });
    for (let i = 0; i < citizenCount; i++) cards.push({ role: "citizen", roleName: "شهروند ساده", charVariant: citizenVariants[i % 4] });
  }

  // Smart shuffle: spread mafias apart so they rarely appear back-to-back
  cards = spreadShuffle(cards);
  const nums = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
  state.cards = cards.map((c, i) => ({ ...c, number: nums[i] }));
  state.flipped = new Set();
  state.seen = new Set();
}

function shuffleCards() {
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
  slot.querySelector(".card").addEventListener("click", e => flipCurrentCard(e, card));
}

function flipCurrentCard(e, card) {
  const cardEl = document.querySelector("#cardSlot .card");
  if (!cardEl) return;
  if (cardEl.classList.contains("flipped")) {
    if (state.queueIdx + 1 >= state.cards.length) { showCompletion(); }
    else { nextCard(); }
    return;
  }
  cardEl.classList.add("flipped");
  state.seen.add(card.number);
  spawnParticle(e, card.role === "mafia" ? "💀" : "⭐");
  // Show funny text after flip
  setTimeout(() => showFunnyText(card), 500);
  setTimeout(() => {
    const front = cardEl.querySelector(".card-front");
    if (front) {
      const hint = document.createElement("div");
      hint.className = "tap-hint-next";
      hint.textContent = "لمس کنید — نفر بعدی";
      front.appendChild(hint);
    }
  }, 600);
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
  document.getElementById("cardStage").style.display = "none";
  document.getElementById("completionBanner").classList.add("show");
  document.getElementById("fsProgressFill").style.width = "100%";
}

function buildCard(card, flipped = false) {
  const flippedClass = flipped ? "flipped" : "";
  const charSVG = getCharSVG(card.roleName, card.role, card.charVariant || 0);
  const displayName = translateRole(card.roleName);
  const sparks = card.role === "mafia" ? '<div class="mafia-sparks"></div>' : '<div class="citizen-sparks"></div>';
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
  document.getElementById("revealContent").innerHTML = `
    <div class="summary-grid">
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
      </div>
    </div>`;
  document.getElementById("revealOverlay").classList.add("show");
}

function closeOverlay() { document.getElementById("revealOverlay").classList.remove("show"); }
function flipAllBack() { shuffleCards(); }
function goBack() { exitGameFullscreen(); }

function newGame() {
  state = { group: null, count: null, mafiaCount: null, citizenCount: null, cards: [], flipped: new Set(), seen: new Set(), isCustom: false, customCards: [] };
  customCardsList = [];
  document.getElementById("gameNavBtn").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("countCard").style.display = "none";
  document.getElementById("customForm").classList.remove("show");
  document.querySelectorAll(".group-btn,.count-btn").forEach(b => b.classList.remove("selected"));
  exitGameFullscreen();
}

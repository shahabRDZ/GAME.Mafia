// ── Lab Mode (حالت آزمایشی) ──

let labState = {
  roomCode: null,
  players: [],
  scenario: null,
  isHost: false,
  maxPlayers: 10,
  phase: "lobby",
  myRole: null,
  myTeam: null,
  myRoleIcon: null,
  currentTurn: 0,
  turnEndAt: null,
  dayNumber: 0,
  messages: [],
  myPlayerId: null,
  timerInterval: null,
  voteResults: {},
  nightPhase: null,
  defensePlayerId: null,
  isMafia: false
};

// ═══════════════════════════════════════
// ENTRY & LOBBY (existing functionality)
// ═══════════════════════════════════════

function selectLabScenario(btn) {
  document.querySelectorAll('.lab-scenario-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function getSelectedLabScenario() {
  const active = document.querySelector('.lab-scenario-btn.active');
  return active ? active.dataset.scenario : 'بازپرس';
}

function waitForSocket() {
  return new Promise((resolve) => {
    if (socket && socket.connected) { resolve(); return; }
    initSocket();
    if (socket && socket.connected) { resolve(); return; }
    const onConnect = () => { socket.off("connect", onConnect); resolve(); };
    socket.on("connect", onConnect);
    setTimeout(() => { if (socket) socket.off("connect", onConnect); resolve(); }, 5000);
  });
}

async function fetchAndShowLobby(code) {
  console.log("[LAB] fetchAndShowLobby code:", code);
  try {
    const res = await apiFetch("/api/lab/room/" + code, { _background: true });
    console.log("[LAB] fetchAndShowLobby res:", JSON.stringify(res));
    if (res && res.ok && res.data) {
      showLabLobby();
      renderLabLobby(res.data);
    } else {
      console.error("[LAB] fetchAndShowLobby failed:", res);
      showToast(res?.data?.error || "خطا در بارگذاری اتاق");
    }
  } catch(e) {
    console.error("[LAB] fetchAndShowLobby error:", e);
    showToast("خطا: " + e.message);
  }
}

async function createLabRoom(scenario) {
  if (!authToken) { openAuthModal("login"); return; }

  // 1. Create room via REST API
  console.log("[LAB] Creating room, authToken:", authToken ? "yes" : "no");
  const res = await apiFetch("/api/lab/create", {
    method: "POST",
    body: JSON.stringify({ scenario: scenario || "بازپرس" })
  });
  console.log("[LAB] Create response:", JSON.stringify(res));
  if (!res || !res.ok) { showToast(res?.data?.error || "خطا در ساخت اتاق"); return; }
  const room = res.data;
  labState.roomCode = room.code;
  labState.scenario = room.scenario;
  labState.isHost = true;

  // 2. Show lobby from API data
  await fetchAndShowLobby(room.code);

  // 3. Connect socket in background for real-time updates
  await waitForSocket();
  if (socket && socket.connected) {
    socket.emit("join_lab", { code: room.code });
  }
}

async function joinLabRoom() {
  const code = document.getElementById("labJoinCode")?.value?.trim().toUpperCase();
  if (!code || code.length < 4) { showToast("کد اتاق را وارد کنید"); return; }
  if (!authToken) { openAuthModal("login"); return; }

  // 1. Fetch room info first
  const res = await apiFetch("/api/lab/room/" + code, { _background: true });
  if (!res || !res.ok) { showToast(res?.data?.error || "اتاق پیدا نشد"); return; }

  labState.roomCode = code;
  labState.isHost = res.data.host_id === currentUser?.id;

  // 2. Show lobby
  showLabLobby();
  renderLabLobby(res.data);

  // 3. Connect socket for real-time
  await waitForSocket();
  if (socket && socket.connected) {
    socket.emit("join_lab", { code });
  }
}

function leaveLabRoom() {
  if (labState.roomCode && socket && socket.connected) {
    socket.emit("leave_lab", { code: labState.roomCode });
  }
  clearLabTimer();
  bazporsSelections = [];
  labState = {
    roomCode: null, players: [], scenario: null, isHost: false,
    maxPlayers: 10, phase: "lobby", myRole: null, myTeam: null,
    myRoleIcon: null, currentTurn: 0, turnEndAt: null, dayNumber: 0,
    messages: [], myPlayerId: null, timerInterval: null,
    voteResults: {}, nightPhase: null, defensePlayerId: null, isMafia: false
  };
  showLabEntry();
}

async function ensureSocket() {
  if (socket && socket.connected) return true;
  await waitForSocket();
  return socket && socket.connected;
}

async function addLabBot() {
  if (!labState.roomCode) return;
  const res = await apiFetch("/api/lab/room/" + labState.roomCode + "/add-bot", {
    method: "POST"
  });
  if (res && res.ok && res.data) {
    renderLabLobby(res.data);
  } else {
    showToast(res?.data?.error || "خطا در افزودن بات");
  }
}

async function removeLabPlayer(playerId) {
  if (!labState.roomCode) return;
  const res = await apiFetch("/api/lab/room/" + labState.roomCode + "/remove-player/" + playerId, {
    method: "DELETE"
  });
  if (res && res.ok && res.data) {
    renderLabLobby(res.data);
  } else {
    showToast(res?.data?.error || "خطا در حذف");
  }
}

async function inviteLabFriend(userId) {
  if (!labState.roomCode) return;
  if (!await ensureSocket()) return;
  socket.emit("invite_lab", { code: labState.roomCode, target_user_id: userId });
}

async function startLabGame() {
  if (!labState.roomCode) return;
  if (!await ensureSocket()) { showToast("در حال اتصال..."); return; }
  socket.emit("start_lab", { code: labState.roomCode });
}

function copyLabCode() {
  const code = labState.roomCode;
  if (code && navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => showToast("کد کپی شد!"));
  }
}

// ═══════════════════
// VIEW SWITCHING
// ═══════════════════

function showLabEntry() {
  const entry = document.getElementById("labEntry");
  const lobby = document.getElementById("labLobby");
  const game = document.getElementById("labGame");
  if (entry) entry.style.display = "";
  if (lobby) lobby.style.display = "none";
  if (game) game.style.display = "none";
}

function showLabLobby() {
  const entry = document.getElementById("labEntry");
  const lobby = document.getElementById("labLobby");
  const game = document.getElementById("labGame");
  if (entry) entry.style.display = "none";
  if (lobby) lobby.style.display = "";
  if (game) game.style.display = "none";
}

function showLabGame() {
  const entry = document.getElementById("labEntry");
  const lobby = document.getElementById("labLobby");
  const game = document.getElementById("labGame");
  if (entry) entry.style.display = "none";
  if (lobby) lobby.style.display = "none";
  if (game) game.style.display = "";
}

// ═══════════════════
// LOBBY RENDERING
// ═══════════════════

function renderLabLobby(data) {
  labState.players = data.players || [];
  labState.scenario = data.scenario;
  if (data.host_id === currentUser?.id) labState.isHost = true;

  // Find my player id
  const me = data.players.find(p => !p.is_bot && p.user_id === currentUser?.id);
  if (me) labState.myPlayerId = me.id;

  const lobby = document.getElementById("labLobby");
  if (!lobby) return;

  const playerCount = data.player_count || data.players.length;
  const maxPlayers = data.max_players || 10;

  let slotsHTML = '';
  for (let i = 1; i <= maxPlayers; i++) {
    const p = data.players.find(pl => pl.slot === i);
    if (p) {
      const name = p.is_bot ? escapeHtml(p.bot_name) : escapeHtml(p.username);
      const avatar = escapeHtml(p.avatar);
      const isMe = !p.is_bot && p.user_id === currentUser?.id;
      const canRemove = labState.isHost && !isMe;
      slotsHTML += `
        <div class="lab-slot lab-slot-filled ${p.is_bot ? 'lab-slot-bot' : ''}">
          <span class="lab-slot-num">${toFarsiNum(i)}</span>
          <span class="lab-slot-avatar">${avatar}</span>
          <span class="lab-slot-name">${name}${p.is_bot ? ' 🤖' : ''}</span>
          ${isMe ? '<span class="lab-slot-badge">شما</span>' : ''}
          ${canRemove ? `<button class="lab-slot-remove" onclick="removeLabPlayer(${p.id})" aria-label="حذف">✕</button>` : ''}
        </div>`;
    } else {
      slotsHTML += `
        <div class="lab-slot lab-slot-empty">
          <span class="lab-slot-num">${toFarsiNum(i)}</span>
          <span class="lab-slot-avatar">⬜</span>
          <span class="lab-slot-name">خالی</span>
        </div>`;
    }
  }

  lobby.innerHTML = `
    <div class="lab-header gc">
      <div class="lab-header-top">
        <button class="lab-back-btn" onclick="leaveLabRoom()" aria-label="خروج">✕ خروج</button>
        <div class="lab-room-info">
          <span class="lab-scenario-badge">🔍 ${escapeHtml(data.scenario || "بازپرس")}</span>
          <span class="lab-player-count">${toFarsiNum(playerCount)} / ${toFarsiNum(maxPlayers)} نفر</span>
        </div>
      </div>
      <div class="lab-code-box">
        <span class="lab-code-label">کد اتاق</span>
        <span class="lab-code">${escapeHtml(data.code)}</span>
        <button class="lab-copy-btn" onclick="copyLabCode()" aria-label="کپی کد">📋</button>
      </div>
    </div>

    <div class="lab-slots gc">
      <div class="lab-slots-title">🎭 بازیکنان</div>
      <div class="lab-slots-grid">${slotsHTML}</div>
    </div>

    ${labState.isHost ? `
    <div class="lab-actions gc">
      <button class="lab-action-btn lab-btn-bot" onclick="addLabBot()" ${playerCount >= maxPlayers ? 'disabled' : ''}>
        🤖 افزودن بات
      </button>
      <button class="lab-action-btn lab-btn-invite" onclick="showLabInviteFriends()">
        👥 دعوت دوست
      </button>
      <button class="lab-action-btn lab-btn-start" onclick="startLabGame()" ${playerCount < maxPlayers ? 'disabled' : ''}>
        🚀 شروع بازی
      </button>
    </div>` : `
    <div class="lab-actions gc">
      <p style="text-align:center;color:var(--dim);font-size:.85rem;">⏳ منتظر میزبان برای شروع بازی...</p>
    </div>`}

    <div class="lab-invite-panel gc" id="labInvitePanel" style="display:none">
      <div class="lab-invite-title">دعوت دوستان آنلاین</div>
      <div class="lab-invite-list" id="labInviteList"></div>
    </div>
  `;
}

async function showLabInviteFriends() {
  const panel = document.getElementById("labInvitePanel");
  if (!panel) return;
  if (panel.style.display === "none") {
    panel.style.display = "";
    const res = await apiFetch("/api/friends", { _background: true });
    const list = document.getElementById("labInviteList");
    if (!list) return;
    const friends = res?.ok ? (res.data?.friends || []) : [];
    if (friends.length === 0) {
      list.innerHTML = '<p style="color:var(--dim);text-align:center;font-size:.82rem;">دوستی پیدا نشد</p>';
      return;
    }
    const inRoom = new Set((labState.players || []).filter(p => !p.is_bot).map(p => p.user_id));
    const available = friends.filter(f => f.status === "accepted" && !inRoom.has(f.user_id));
    if (available.length === 0) {
      list.innerHTML = '<p style="color:var(--dim);text-align:center;font-size:.82rem;">همه دوستان در اتاق هستند</p>';
      return;
    }
    list.innerHTML = available.map(f => `
      <div class="lab-invite-item">
        <span>${escapeHtml(f.avatar || '🎭')} ${escapeHtml(f.username)}</span>
        <button class="lab-invite-btn" onclick="inviteLabFriend(${f.user_id})">دعوت</button>
      </div>
    `).join('');
  } else {
    panel.style.display = "none";
  }
}

// ═══════════════════════════
// GAME RENDERING
// ═══════════════════════════

function getPhaseLabel() {
  const labels = {
    intro: "🎬 معرفی نقش‌ها",
    day_talk: "\u2600\uFE0F روز " + toFarsiNum(labState.dayNumber) + " \u2014 بحث",
    mafia_chat: "🔴 چت مافیا",
    voting: "\uD83D\uDDF3\uFE0F رأی‌گیری روز " + toFarsiNum(labState.dayNumber),
    defense: "🛡️ دفاعیه",
    revote: "\uD83D\uDDF3\uFE0F رأی‌گیری مجدد",
    night: "🌙 شب " + toFarsiNum(labState.dayNumber),
    night_hunter: "🌙 شب \u2014 هانتر",
    night_shayad: "🌙 شب \u2014 شیاد",
    night_mafia: "🌙 شب \u2014 مافیا",
    night_detective: "🌙 شب \u2014 کارآگاه",
    night_doctor: "🌙 شب \u2014 دکتر",
    night_bazpors: "🌙 شب \u2014 بازپرس",
    night_resolve: "🌙 نتیجه شب",
    bazpors_defense1: "🔍 دفاعیه بازپرس — نفر اول",
    bazpors_defense2: "🔍 دفاعیه بازپرس — نفر دوم",
    bazpors_vote: "🔍 رأی‌گیری بازپرس",
    bazpors_result: "🔍 نتیجه بازپرس",
    result: "🏆 نتیجه بازی"
  };
  return labels[labState.phase] || labState.phase;
}

function renderLabGame() {
  const game = document.getElementById("labGame");
  if (!game) return;

  const roleDisplay = labState.myRole
    ? `<span class="lab-my-role ${escapeHtml(labState.myTeam || '')}">${labState.myRoleIcon || '🎭'} ${escapeHtml(labState.myRole)}</span>`
    : '';

  game.innerHTML = `
    <div class="lab-game-header gc">
      <div class="lab-game-header-row">
        <button class="lab-back-btn" onclick="leaveLabRoom()" aria-label="خروج">✕</button>
        <div class="lab-phase-badge" id="labPhaseBadge">${getPhaseLabel()}</div>
        ${roleDisplay}
      </div>
      <div class="lab-players-bar" id="labPlayersBar"></div>
      <div class="lab-turn-info" id="labTurnInfo"></div>
    </div>

    <div class="lab-chat-area" id="labChatArea">
      <div class="lab-chat-messages" id="labChatMessages"></div>
    </div>

    <div class="lab-chat-input-area" id="labChatInputArea">
      <div class="lab-timer-bar" id="labTimerBar">
        <div class="lab-timer-fill" id="labTimerFill"></div>
      </div>
      <div class="lab-input-row">
        <input type="text" id="labChatInput" placeholder="پیام خود را بنویسید..." maxlength="500"
               autocomplete="off" disabled class="lab-chat-input">
        <button id="labSendBtn" onclick="handleLabSend()" disabled class="lab-send-btn">ارسال</button>
        <button id="labEndTurnBtn" onclick="endMyTurn()" style="display:none" class="lab-end-turn-btn">⏭️</button>
      </div>
    </div>
  `;

  renderPlayersBar();
  renderChatMessages();
  updateTurnInfo();
}

function updatePhaseBadge() {
  const badge = document.getElementById("labPhaseBadge");
  if (badge) badge.textContent = getPhaseLabel();
}

function renderPlayersBar() {
  const bar = document.getElementById("labPlayersBar");
  if (!bar) return;

  const isVotingPhase = labState.phase === "voting" || labState.phase === "revote";

  bar.innerHTML = labState.players.map(p => {
    const name = p.is_bot ? escapeHtml(p.bot_name) : escapeHtml(p.username || p.name);
    const avatar = escapeHtml(p.avatar);
    const alive = p.is_alive !== false;
    const isTurn = (p.slot === labState.currentTurn && labState.phase === "day_talk") ||
                   (isVotingPhase && p.id === (labState.currentVoterId || null));
    const voteCount = labState.voteResults[p.id] || 0;
    return `
      <div class="lab-player-pip ${alive ? '' : 'lab-pip-dead'} ${isTurn ? 'lab-pip-active' : ''}"
           title="${name}" data-slot="${p.slot}" data-pid="${p.id}">
        <span class="lab-pip-avatar">${avatar}</span>
        <span class="lab-pip-name">${name}</span>
        ${!alive ? '<span class="lab-pip-x">✕</span>' : ''}
        ${isVotingPhase && voteCount > 0 ? `<span class="lab-pip-votes">${toFarsiNum(voteCount)}</span>` : ''}
      </div>`;
  }).join('');
}

function updateTurnInfo() {
  const info = document.getElementById("labTurnInfo");
  const input = document.getElementById("labChatInput");
  const sendBtn = document.getElementById("labSendBtn");
  if (!info) return;

  const phase = labState.phase;

  if (phase === "day_talk" && labState.currentTurn > 0) {
    const turnPlayer = labState.players.find(p => p.slot === labState.currentTurn);
    const turnName = turnPlayer ? (turnPlayer.is_bot ? turnPlayer.bot_name : (turnPlayer.username || turnPlayer.name)) : "?";
    const isMyTurn = turnPlayer && !turnPlayer.is_bot && turnPlayer.user_id === currentUser?.id;

    info.innerHTML = `
      <span class="lab-turn-label">نوبت:</span>
      <span class="lab-turn-name ${isMyTurn ? 'lab-turn-me' : ''}">${escapeHtml(turnName)}</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;

    const endBtn = document.getElementById("labEndTurnBtn");
    if (input) input.disabled = !isMyTurn;
    if (sendBtn) sendBtn.disabled = !isMyTurn;
    if (isMyTurn && input) {
      input.placeholder = "الان نوبت شماست! پیام بنویسید... (۴۰ ثانیه)";
      input.focus();
      if (endBtn) { endBtn.style.display = ""; endBtn.disabled = false; }
    } else if (input) {
      input.placeholder = "\u0645\u0646\u062A\u0638\u0631 " + escapeHtml(turnName) + "...";
      if (endBtn) endBtn.style.display = "none";
    }
  } else if (phase === "mafia_chat") {
    info.innerHTML = `
      <span class="lab-turn-label">🔴 چت خصوصی مافیا</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
    const canChat = labState.isMafia;
    if (input) { input.disabled = !canChat; input.placeholder = canChat ? "پیام به تیم مافیا..." : "مافیا در حال مشورت..."; }
    if (sendBtn) sendBtn.disabled = !canChat;
    if (canChat && input) input.focus();
  } else if (phase === "voting") {
    info.innerHTML = `
      <span class="lab-turn-label">\uD83D\uDDF3\uFE0F رأی‌گیری نوبتی</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "defense") {
    const defPlayer = labState.players.find(p => p.id === labState.defensePlayerId);
    const defName = defPlayer ? (defPlayer.is_bot ? defPlayer.bot_name : (defPlayer.username || defPlayer.name)) : "?";
    const isDefending = defPlayer && !defPlayer.is_bot && defPlayer.user_id === currentUser?.id;
    info.innerHTML = `
      <span class="lab-turn-label">🛡️ دفاعیه:</span>
      <span class="lab-turn-name ${isDefending ? 'lab-turn-me' : ''}">${escapeHtml(defName)}</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
    if (input) { input.disabled = !isDefending; input.placeholder = isDefending ? "دفاعیه خود را بنویسید..." : "\u0645\u0646\u062A\u0638\u0631 دفاعیه " + escapeHtml(defName) + "..."; }
    if (sendBtn) sendBtn.disabled = !isDefending;
    if (isDefending && input) input.focus();
  } else if (phase === "revote") {
    info.innerHTML = `
      <span class="lab-turn-label">\uD83D\uDDF3\uFE0F رأی‌گیری مجدد</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "bazpors_defense1" || phase === "bazpors_defense2") {
    info.innerHTML = `
      <span class="lab-turn-label">🔍 دفاعیه بازپرس</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
  } else if (phase === "bazpors_vote") {
    info.innerHTML = `
      <span class="lab-turn-label">🔍 رأی‌گیری بازپرس</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "night" || phase === "night_detective" || phase === "night_doctor" || phase === "night_hunter" || phase === "night_mafia" || phase === "night_shayad" || phase === "night_bazpors") {
    info.innerHTML = `<span class="lab-turn-label">🌙 شب شده...</span>
                      <span class="lab-turn-timer" id="labTurnTimer"></span>`;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "night_resolve") {
    info.innerHTML = `<span class="lab-turn-label">🌙 نتیجه شب</span>`;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "intro") {
    info.innerHTML = `<span class="lab-turn-label">🎬 نقش‌ها در حال توزیع...</span>`;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else if (phase === "result") {
    info.innerHTML = `<span class="lab-turn-label">🏆 بازی تمام شد</span>`;
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  } else {
    info.innerHTML = '';
    if (input) { input.disabled = true; input.placeholder = ""; }
    if (sendBtn) sendBtn.disabled = true;
  }

  startTurnTimer();
}

// ═══════════════════
// TIMER
// ═══════════════════

function clearLabTimer() {
  if (labState.timerInterval) {
    clearInterval(labState.timerInterval);
    labState.timerInterval = null;
  }
}

function getTimerTotal() {
  const phase = labState.phase;
  if (phase === "day_talk") return 40000;
  if (phase === "mafia_chat") return 15000;
  if (phase === "voting" || phase === "revote" || phase === "bazpors_vote") return 5000;
  if (phase === "defense" || phase === "bazpors_defense1" || phase === "bazpors_defense2") return 30000;
  if (phase === "night_detective" || phase === "night_doctor" || phase === "night_hunter" || phase === "night_mafia" || phase === "night_shayad" || phase === "night_bazpors") return 10000;
  return 30000;
}

function startTurnTimer() {
  clearLabTimer();
  if (!labState.turnEndAt) return;

  const fill = document.getElementById("labTimerFill");
  const timerSpan = document.getElementById("labTurnTimer");
  const total = getTimerTotal();

  labState.timerInterval = setInterval(() => {
    const now = Date.now();
    const end = new Date(labState.turnEndAt).getTime();
    const remaining = Math.max(0, end - now);
    const pct = (remaining / total) * 100;
    const secs = Math.ceil(remaining / 1000);

    if (fill) {
      fill.style.width = pct + "%";
      if (pct < 25) fill.classList.add("lab-timer-danger");
      else fill.classList.remove("lab-timer-danger");
    }
    if (timerSpan) timerSpan.textContent = toFarsiNum(secs) + " ثانیه";

    if (remaining <= 0) clearLabTimer();
  }, 200);
}

// ═══════════════════
// CHAT & MESSAGES
// ═══════════════════

function handleLabSend() {
  const phase = labState.phase;
  if (phase === "mafia_chat") {
    sendLabMafiaMessage();
  } else if (phase === "defense" || phase === "bazpors_defense1" || phase === "bazpors_defense2") {
    sendDefenseMessage();
  } else {
    sendLabMessage();
  }
}

function endMyTurn() {
  if (!labState.roomCode || !socket || !socket.connected) return;
  socket.emit("lab_end_turn", { code: labState.roomCode });
  const btn = document.getElementById("labEndTurnBtn");
  if (btn) { btn.disabled = true; btn.style.display = "none"; }
}

function sendLabMessage() {
  const input = document.getElementById("labChatInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !labState.roomCode || !socket) return;
  socket.emit("lab_chat", { code: labState.roomCode, content });
  input.value = "";
}

function sendLabMafiaMessage() {
  const input = document.getElementById("labChatInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !labState.roomCode || !socket) return;
  socket.emit("lab_mafia_chat", { code: labState.roomCode, content });
  input.value = "";
}

function sendDefenseMessage() {
  const input = document.getElementById("labChatInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !labState.roomCode || !socket) return;
  socket.emit("lab_defense_chat", { code: labState.roomCode, content });
  input.value = "";
}

let bazporsSelections = [];

function sendNightAction(targetPlayerId) {
  if (!labState.roomCode || !socket) return;

  // Bazpors needs 2 selections
  if (labState.nightPhase === "night_bazpors") {
    const idx = bazporsSelections.indexOf(targetPlayerId);
    if (idx >= 0) {
      bazporsSelections.splice(idx, 1);
      const btn = document.querySelector('.lab-night-target[data-pid="' + targetPlayerId + '"]');
      if (btn) btn.classList.remove('selected');
      return;
    }
    if (bazporsSelections.length >= 2) {
      showToast("فقط ۲ نفر انتخاب کنید", "error");
      return;
    }
    bazporsSelections.push(targetPlayerId);
    const btn = document.querySelector('.lab-night-target[data-pid="' + targetPlayerId + '"]');
    if (btn) btn.classList.add('selected');

    if (bazporsSelections.length === 2) {
      socket.emit("lab_night_action", {
        code: labState.roomCode,
        target_player_id: bazporsSelections[0],
        target_player_id_2: bazporsSelections[1]
      });
      showToast("۲ بازیکن انتخاب شد ✓");
      bazporsSelections = [];
    } else {
      showToast("۱ نفر انتخاب شد — ۱ نفر دیگر انتخاب کنید");
    }
    return;
  }

  socket.emit("lab_night_action", { code: labState.roomCode, target_player_id: targetPlayerId });
  document.querySelectorAll('.lab-night-target').forEach(t => t.classList.remove('selected'));
  const sel = document.querySelector('.lab-night-target[data-pid="' + targetPlayerId + '"]');
  if (sel) sel.classList.add('selected');
  showToast("انتخاب ثبت شد ✓");
}

function sendRevote(decision) {
  if (!labState.roomCode || !socket) return;
  socket.emit("lab_revote", { code: labState.roomCode, decision });
  // Disable buttons after voting
  document.querySelectorAll('.lab-revote-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
  showToast(decision === "eliminate" ? "رأی حذف ثبت شد" : "رأی ابقا ثبت شد");
}

function renderChatMessages() {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  container.innerHTML = labState.messages.map(m => renderMessageHTML(m)).join('');
  container.scrollTop = container.scrollHeight;
}

function renderMessageHTML(m) {
  if (m.msg_type === "system") {
    return '<div class="lab-msg lab-msg-system">' + escapeHtml(m.content) + '</div>';
  }
  if (m.msg_type === "mafia") {
    const p = m.player || {};
    const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
    const avatar = escapeHtml(p.avatar || "🎭");
    const isMe = !p.is_bot && p.user_id === currentUser?.id;
    return '<div class="lab-msg lab-msg-mafia ' + (isMe ? 'lab-msg-me' : '') + '" data-msg-id="' + m.id + '">' +
      '<div class="lab-msg-header">' +
        '<span class="lab-msg-avatar">' + avatar + '</span>' +
        '<span class="lab-msg-name" style="color:var(--accent)">' + name + (p.is_bot ? ' 🤖' : '') + '</span>' +
        '<span class="lab-msg-slot">#' + toFarsiNum(p.slot || 0) + '</span>' +
      '</div>' +
      '<div class="lab-msg-body">' + escapeHtml(m.content) + '</div>' +
    '</div>';
  }
  const p = m.player || {};
  const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
  const avatar = escapeHtml(p.avatar || "🎭");
  const isMe = !p.is_bot && p.user_id === currentUser?.id;

  return '<div class="lab-msg ' + (isMe ? 'lab-msg-me' : '') + '" data-msg-id="' + m.id + '">' +
    '<div class="lab-msg-header">' +
      '<span class="lab-msg-avatar">' + avatar + '</span>' +
      '<span class="lab-msg-name">' + name + (p.is_bot ? ' 🤖' : '') + '</span>' +
      '<span class="lab-msg-slot">#' + toFarsiNum(p.slot || 0) + '</span>' +
    '</div>' +
    '<div class="lab-msg-body">' + escapeHtml(m.content) + '</div>' +
    '<div class="lab-msg-reactions">' +
      (!isMe ? (
        '<button class="lab-react-btn lab-react-like" onclick="sendLabReaction(' + m.id + ', \'like\')">👍 <span class="react-count" id="like_' + m.id + '">0</span></button>' +
        '<button class="lab-react-btn lab-react-dislike" onclick="sendLabReaction(' + m.id + ', \'dislike\')">👎 <span class="react-count" id="dislike_' + m.id + '">0</span></button>'
      ) : '') +
    '</div>' +
  '</div>';
}

function appendLabMessage(msg) {
  labState.messages.push(msg);
  const container = document.getElementById("labChatMessages");
  if (!container) { renderChatMessages(); return; }
  container.insertAdjacentHTML("beforeend", renderMessageHTML(msg));
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function sendLabReaction(messageId, reaction) {
  if (!labState.roomCode || !socket) return;
  socket.emit("lab_reaction", { code: labState.roomCode, message_id: messageId, reaction });
}

// ═══════════════════════════
// MAFIA CHAT PHASE
// ═══════════════════════════

function renderMafiaChat() {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  if (labState.isMafia) {
    container.insertAdjacentHTML("beforeend",
      '<div class="lab-msg lab-mafia-banner">🔴 چت خصوصی مافیا (' + toFarsiNum(15) + ' ثانیه)</div>');
  } else {
    container.insertAdjacentHTML("beforeend",
      '<div class="lab-msg lab-msg-system">مافیا در حال مشورت...</div>');
  }
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════
// SEQUENTIAL VOTING PHASE
// ═══════════════════════════

function renderSequentialVoting(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const candidate = data.candidate || data.turn_player;
  const candidateSlot = data.candidate_slot || data.current_turn;
  const candidateName = data.candidate_name ||
    (candidate ? (candidate.is_bot ? candidate.bot_name : (candidate.username || candidate.name)) : "?");
  const isMe = candidate && !candidate.is_bot && candidate.user_id === currentUser?.id;

  // System message announcing the candidate (don't double-escape)
  const displayMsg = "🗳️ رأی برای شماره " + toFarsiNum(candidateSlot) + " (" + escapeHtml(candidateName) + ") — موافقید حذف شود؟";

  // Remove previous vote buttons
  document.querySelectorAll('.lab-vote-active').forEach(el => el.remove());

  let html = '<div class="lab-msg lab-msg-system">' + displayMsg + '</div>';

  // Vote button (everyone except the candidate) — 3 seconds
  if (!isMe) {
    html += '<div class="lab-revote-btns lab-vote-active" id="labVoteBtns_' + candidateSlot + '">' +
      '<button class="lab-revote-btn lab-revote-eliminate" onclick="castVoteYes(' + candidateSlot + ')">✋ موافقم — حذف بشه</button>' +
      '<button class="lab-revote-btn lab-revote-keep" onclick="castVoteSkip(' + candidateSlot + ')">✕ مخالفم</button>' +
    '</div>';
  } else {
    html += '<div class="lab-msg lab-msg-system" style="font-size:.75rem;opacity:.6">⏭️ خودتان هستید — نمی‌توانید رأی بدهید</div>';
  }

  // Vote count display
  html += '<div class="lab-vote-count-display" id="labVoteCount_' + candidateSlot + '" style="text-align:center;color:var(--accent);font-weight:700;font-size:.9rem;margin:6px 0">' +
    toFarsiNum(labState.voteResults[candidateSlot] || 0) + ' رأی</div>';

  container.insertAdjacentHTML("beforeend", html);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function castVoteYes(candidateSlot) {
  if (!labState.roomCode) return;
  if (socket && socket.connected) {
    socket.emit("lab_vote", { code: labState.roomCode, vote: "yes" });
  }

  const btns = document.getElementById("labVoteBtns_" + candidateSlot);
  if (btns) {
    btns.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
  }
  showToast("رأی ثبت شد ✓");
}

function castVoteSkip(candidateSlot) {
  const btns = document.getElementById("labVoteBtns_" + candidateSlot);
  if (btns) {
    btns.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
  }
}

// ═══════════════════════════
// DEFENSE PHASE
// ═══════════════════════════

function renderDefensePhase(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const defPlayer = labState.players.find(p => p.id === labState.defensePlayerId);
  const defName = defPlayer
    ? (defPlayer.is_bot ? escapeHtml(defPlayer.bot_name || defPlayer.name) : escapeHtml(defPlayer.username || defPlayer.name))
    : "?";
  const defAvatar = defPlayer ? escapeHtml(defPlayer.avatar || "🎭") : "🎭";

  const html = '<div class="lab-msg lab-defense-banner">' +
    '<div class="lab-defense-title">🛡️ فاز دفاعیه</div>' +
    '<div class="lab-defense-name">' + defAvatar + ' ' + defName + '</div>' +
    '<div style="color:var(--dim);font-size:.8rem;">وارد فاز دفاعیه شد (' + toFarsiNum(30) + ' ثانیه)</div>' +
  '</div>';

  container.insertAdjacentHTML("beforeend", html);
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════
// REVOTE PHASE
// ═══════════════════════════

function renderRevotePhase(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const turnPlayer = data.turn_player || null;
  const isMyTurn = turnPlayer && !turnPlayer.is_bot && turnPlayer.user_id === currentUser?.id;
  labState.currentVoterId = turnPlayer ? turnPlayer.id : null;

  const defPlayer = labState.players.find(p => p.id === labState.defensePlayerId);
  const defName = defPlayer
    ? (defPlayer.is_bot ? escapeHtml(defPlayer.bot_name || defPlayer.name) : escapeHtml(defPlayer.username || defPlayer.name))
    : "?";

  const turnName = turnPlayer
    ? (turnPlayer.is_bot ? escapeHtml(turnPlayer.bot_name || turnPlayer.name) : escapeHtml(turnPlayer.username || turnPlayer.name))
    : "?";

  let html = '<div class="lab-msg lab-msg-system">\uD83D\uDDF3\uFE0F رأی‌گیری مجدد درباره ' + defName + ' \u2014 نوبت: ' + turnName + '</div>';

  if (isMyTurn) {
    html += '<div class="lab-revote-btns">' +
      '<button class="lab-revote-btn lab-revote-eliminate" onclick="sendRevote(\'eliminate\')">🚫 حذف</button>' +
      '<button class="lab-revote-btn lab-revote-keep" onclick="sendRevote(\'keep\')">✅ ابقا</button>' +
    '</div>';
  } else {
    html += '<div class="lab-msg lab-msg-system">\u0645\u0646\u062A\u0638\u0631 رأی ' + turnName + '...</div>';
  }

  container.insertAdjacentHTML("beforeend", html);
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════
// NIGHT PHASE
// ═══════════════════════════

function renderNightAction(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const phase = data.phase;
  labState.nightPhase = phase;

  const roleMap = {
    night_hunter: { role: "هانتر", icon: "🏹", desc: "بستن: یک بازیکن را برای مسدود کردن انتخاب کنید", team: "citizen" },
    night_shayad: { role: "شیاد", icon: "🃏", desc: "فریب: یک بازیکن انتخاب کنید — اگر کارآگاه باشد استعلامش منفی می‌شود", team: "mafia" },
    night_mafia: { role: "رئیس مافیا", icon: "👑", desc: "شلیک: یک شهروند را انتخاب کنید", team: "mafia" },
    night_detective: { role: "کارآگاه", icon: "🕵️", desc: "استعلام: مافیا یا شهروند بودن یک بازیکن را بررسی کنید", team: "citizen" },
    night_doctor: { role: "دکتر", icon: "⚕️", desc: "نجات: یک بازیکن را برای محافظت انتخاب کنید", team: "citizen" },
    night_bazpors: { role: "بازپرس", icon: "🔍", desc: "۲ بازیکن انتخاب کنید — فردا بین آنها رأی‌گیری می‌شود (فقط یکبار)", team: "citizen", selectTwo: true }
  };

  const info = roleMap[phase];
  if (!info) return;

  // Determine if the current sub-phase matches my role
  const isMyAction = (
    (phase === "night_hunter" && labState.myRole === "هانتر") ||
    (phase === "night_shayad" && labState.myRole === "شیاد") ||
    (phase === "night_mafia" && labState.myTeam === "mafia" && (data.is_boss || labState.myRole === "رئیس مافیا")) ||
    (phase === "night_detective" && labState.myRole === "کارآگاه") ||
    (phase === "night_doctor" && labState.myRole === "دکتر") ||
    (phase === "night_bazpors" && labState.myRole === "بازپرس")
  );

  if (isMyAction) {
    const alivePlayers = labState.players.filter(p => p.is_alive !== false && !(p.user_id === currentUser?.id && !p.is_bot));

    let html = '<div class="lab-msg lab-night-overlay">' +
      '<div class="lab-night-title">' + info.icon + ' ' + escapeHtml(info.role) + '</div>' +
      '<div class="lab-night-desc">' + escapeHtml(info.desc) + ' (' + toFarsiNum(10) + ' ثانیه)</div>' +
      '<div class="lab-night-targets">';

    alivePlayers.forEach(p => {
      const pName = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
      const avatar = escapeHtml(p.avatar || "🎭");
      html += '<button class="lab-night-target" onclick="sendNightAction(' + p.id + ')" data-pid="' + p.id + '">' +
        '<span style="font-size:1.3rem">' + avatar + '</span>' +
        '<span style="font-size:.75rem">' + pName + '</span>' +
      '</button>';
    });

    html += '</div></div>';
    container.insertAdjacentHTML("beforeend", html);
  } else {
    container.insertAdjacentHTML("beforeend",
      '<div class="lab-msg lab-night-overlay">' +
        '<div class="lab-night-title">🌙 شب است...</div>' +
        '<div class="lab-night-desc">منتظر بمانید</div>' +
      '</div>');
  }

  container.scrollTop = container.scrollHeight;
}

function renderNightResolve(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  let html = '';
  if (data.killed) {
    const killedName = data.killed.is_bot ? escapeHtml(data.killed.bot_name || data.killed.name) : escapeHtml(data.killed.username || data.killed.name);
    html += '<div class="lab-msg lab-msg-system">' + killedName + ' توسط مافیا کشته شد 💀</div>';

    // Update player alive status
    const idx = labState.players.findIndex(p => p.id === data.killed.id);
    if (idx >= 0) labState.players[idx].is_alive = false;
  }
  if (data.saved) {
    const savedName = data.saved.is_bot ? escapeHtml(data.saved.bot_name || data.saved.name) : escapeHtml(data.saved.username || data.saved.name);
    html += '<div class="lab-msg lab-msg-system">' + savedName + ' توسط دکتر نجات یافت ⚕️</div>';
  }
  if (!data.killed && !data.saved) {
    html += '<div class="lab-msg lab-msg-system">شب بدون تلفات گذشت 🌙</div>';
  }

  container.insertAdjacentHTML("beforeend", html);
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════
// GAME RESULT
// ═══════════════════

function showGameResult(data) {
  labState.phase = "result";
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const winnerText = data.winner === "mafia"
    ? "🔴 تیم مافیا برنده شد!"
    : "🟢 تیم شهروند برنده شد!";

  let playersHTML = (data.players || []).map(p => {
    const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
    const teamClass = p.team === "mafia" ? "lab-team-mafia" : "lab-team-citizen";
    const aliveText = p.is_alive ? "زنده" : "حذف شده";
    const icon = escapeHtml(p.avatar || "🎭");
    return '<div class="lab-result-player ' + teamClass + '">' +
      '<span>' + icon + '</span>' +
      '<span class="lab-result-name">' + name + '</span>' +
      '<span class="lab-result-role">' + escapeHtml(p.role_name || "?") + '</span>' +
      '<span class="lab-result-status">' + aliveText + '</span>' +
    '</div>';
  }).join('');

  let elimHTML = '';
  if (data.eliminated) {
    const eName = escapeHtml(data.eliminated.name || data.eliminated.bot_name || "?");
    const eRole = escapeHtml(data.eliminated_role || "?");
    elimHTML = '<div class="lab-result-elim">آخرین حذف: ' + eName + ' (' + eRole + ')</div>';
  }

  container.insertAdjacentHTML("beforeend",
    '<div class="lab-msg lab-msg-system lab-result-banner">' +
      '<div class="lab-result-title">' + winnerText + '</div>' +
      elimHTML +
      '<div class="lab-result-grid">' + playersHTML + '</div>' +
      '<button class="lab-action-btn lab-btn-create" onclick="leaveLabRoom()" style="margin-top:16px">🔄 بازگشت</button>' +
    '</div>');

  container.scrollTop = container.scrollHeight;
  updatePhaseBadge();
  updateTurnInfo();
}

// ═══════════════════════════
// SOCKET EVENT HANDLERS
// ═══════════════════════════

function handleLabUpdate(data) {
  labState.roomCode = data.code;
  labState.players = data.players || [];
  if (data.host_id === currentUser?.id) labState.isHost = true;

  const me = data.players.find(p => !p.is_bot && p.user_id === currentUser?.id);
  if (me) labState.myPlayerId = me.id;

  if (labState.phase === "lobby" || data.status === "waiting") {
    showLabLobby();
    renderLabLobby(data);
  }
}

function handleLabClosed() {
  showToast("اتاق بسته شد", "error");
  leaveLabRoom();
}

function handleLabInvite(data) {
  const accept = confirm(data.from_username + " شما را به بازی آزمایشی (" + data.scenario + ") دعوت کرد. قبول می\u200Cکنید؟");
  if (accept) {
    showScreen("lab");
    labState.roomCode = data.room_code;
    labState.isHost = false;
    initSocket();
    socket.emit("join_lab", { code: data.room_code });
    showLabLobby();
  }
}

function handleLabRoleAssigned(data) {
  labState.myRole = data.role_name;
  labState.myTeam = data.team;
  labState.myRoleIcon = data.icon;
  labState.isMafia = data.team === "mafia";
  showToast("نقش شما: " + data.icon + " " + data.role_name, "info");
}

function handleLabGameStarted(data) {
  labState.phase = "intro";
  labState.players = data.players || labState.players || [];
  labState.dayNumber = 0;
  labState.messages = [];
  labState.voteResults = {};
  bazporsSelections = [];

  labState.messages.push({
    id: 0, msg_type: "system",
    content: "🎬 بازی آزمایشی شروع شد! سناریو: " + (data.scenario || "بازپرس")
  });

  showLabGame();
  renderLabGame();

  // Show role reveal overlay
  if (labState.myRole) {
    const teamText = labState.myTeam === "mafia" ? "تیم مافیا 🔴" : "تیم شهروند 🟢";
    const teamClass = labState.myTeam === "mafia" ? "lab-role-mafia" : "lab-role-citizen";
    const overlay = document.createElement("div");
    overlay.className = "lab-role-reveal";
    overlay.id = "labRoleReveal";
    overlay.innerHTML =
      '<div class="lab-role-reveal-card ' + teamClass + '">' +
        '<div class="lab-role-reveal-icon">' + (labState.myRoleIcon || "🎭") + '</div>' +
        '<div class="lab-role-reveal-name">' + escapeHtml(labState.myRole) + '</div>' +
        '<div class="lab-role-reveal-team">' + teamText + '</div>' +
        '<div class="lab-role-reveal-hint">این نقش محرمانه شماست — به کسی نگویید!</div>' +
        '<button class="lab-role-reveal-btn" onclick="closeRoleReveal()">فهمیدم ✓</button>' +
      '</div>';
    document.body.appendChild(overlay);
  }
}

function closeRoleReveal() {
  const el = document.getElementById("labRoleReveal");
  if (el) el.remove();
}

function handleLabPhaseChange(data) {
  labState.phase = data.phase;
  labState.dayNumber = data.day_number || labState.dayNumber;
  labState.turnEndAt = data.turn_end_at || null;

  switch (data.phase) {
    case "day_talk":
      labState.currentTurn = data.current_turn;
      if (data.turn_player) {
        const idx = labState.players.findIndex(p => p.slot === data.turn_player.slot);
        if (idx >= 0) labState.players[idx] = { ...labState.players[idx], ...data.turn_player };
      }
      if (data.day_number > (labState.dayNumber - 1)) {
        appendLabMessage({ id: 0, msg_type: "system", content: "\u2600\uFE0F روز " + toFarsiNum(data.day_number) + " شروع شد" });
      }
      break;

    case "mafia_chat":
      renderMafiaChat();
      break;

    case "voting":
      labState.currentTurn = data.current_turn || 0;
      if (data.vote_counts) labState.voteResults = data.vote_counts;
      renderSequentialVoting(data);
      break;

    case "defense":
      labState.defensePlayerId = data.defense_player_id;
      renderDefensePhase(data);
      break;

    case "revote":
      labState.voteResults = {};
      renderRevotePhase(data);
      break;

    case "night":
      labState.currentTurn = 0;
      appendLabMessage({ id: 0, msg_type: "system", content: "🌙 شب فرا رسید..." });
      break;

    case "night_hunter":
    case "night_shayad":
    case "night_mafia":
    case "night_detective":
    case "night_doctor":
    case "night_bazpors":
      renderNightAction(data);
      break;

    case "night_resolve":
      renderNightResolve(data);
      break;

    case "bazpors_defense1":
    case "bazpors_defense2":
      labState.defensePlayerId = data.defense_player?.id;
      renderBazporsDefense(data);
      break;

    case "bazpors_vote":
      labState.currentTurn = data.current_turn || 0;
      labState.voteResults = {};
      renderBazporsVote(data);
      break;

    case "bazpors_result":
      renderBazporsResult(data);
      break;

    default:
      break;
  }

  renderPlayersBar();
  updatePhaseBadge();
  updateTurnInfo();
}

function handleLabNewMessage(data) {
  appendLabMessage(data);
}

function handleLabMafiaMessage(data) {
  // Only mafia players should receive this, but double-check
  if (labState.isMafia) {
    data.msg_type = "mafia";
    appendLabMessage(data);
  }
}

function handleNightActionPrompt(data) {
  // Server re-prompts for night action if needed
  renderNightAction(data);
}

function handleNightResult(data) {
  renderNightResolve(data);
}

function handleDefenseStart(data) {
  labState.phase = "defense";
  labState.defensePlayerId = data.defense_player_id;
  labState.turnEndAt = data.turn_end_at || null;
  renderDefensePhase(data);
  renderPlayersBar();
  updatePhaseBadge();
  updateTurnInfo();
}

function handleRevoteStart(data) {
  labState.phase = "revote";
  labState.voteResults = {};
  labState.turnEndAt = data.turn_end_at || null;
  renderRevotePhase(data);
  renderPlayersBar();
  updatePhaseBadge();
  updateTurnInfo();
}

function handleVoteCast(data) {
  // Update vote counts from server
  if (data.vote_counts) {
    labState.voteResults = data.vote_counts;
  }

  // Update the vote count display for this candidate
  const candidateSlot = data.candidate_slot;
  if (candidateSlot) {
    const countEl = document.getElementById("labVoteCount_" + candidateSlot);
    if (countEl) {
      const count = labState.voteResults[candidateSlot] || 0;
      countEl.textContent = toFarsiNum(count) + " رأی";
    }
  }

  // Show who voted
  const voter = data.voter;
  const voterName = voter ? (voter.is_bot ? escapeHtml(voter.bot_name || voter.name) : escapeHtml(voter.username || voter.name)) : "?";
  if (data.vote === "yes") {
    appendLabMessage({ id: 0, msg_type: "system", content: "✋ " + voterName + " رأی داد" });
  }

  renderPlayersBar();
}

function handleDetectiveResult(data) {
  // Only the detective gets this
  const targetName = data.target_name ? escapeHtml(data.target_name) : "?";
  const isMafia = data.is_mafia;
  const resultText = isMafia
    ? "🕵️ نتیجه استعلام: " + targetName + " مافیا است! 🔴"
    : "🕵️ نتیجه استعلام: " + targetName + " مافیا نیست 🟢";
  appendLabMessage({ id: 0, msg_type: "system", content: resultText });
}

function handleLabReaction(data) {
  if (!data || !data.reaction || !data.message_id) return;
  const el = document.getElementById(data.reaction + "_" + data.message_id);
  if (el) {
    el.textContent = parseInt(el.textContent || "0") + 1;
  }
}

function handleLabVoteUpdate(data) {
  appendLabMessage({
    id: 0, msg_type: "system",
    content: "📊 " + toFarsiNum(data.voted) + " از " + toFarsiNum(data.total) + " نفر رأی داده‌اند"
  });
}

function handleLabGameResult(data) {
  showGameResult(data);
}

// ═══════════════════
// ═══════════════════════════════
// BAZPORS TRIAL UI
// ═══════════════════════════════

function renderBazporsDefense(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const dp = data.defense_player;
  const dpName = dp ? (dp.is_bot ? escapeHtml(dp.bot_name || dp.name) : escapeHtml(dp.username || dp.name)) : "?";
  const isMyDefense = dp && !dp.is_bot && dp.user_id === currentUser?.id;

  appendLabMessage({
    id: 0, msg_type: "system",
    content: data.message || ("🔍 " + dpName + " در حال دفاع است (" + toFarsiNum(30) + " ثانیه)")
  });

  const input = document.getElementById("labChatInput");
  const sendBtn = document.getElementById("labSendBtn");
  if (input) {
    input.disabled = !isMyDefense;
    input.placeholder = isMyDefense ? "دفاع کنید..." : "منتظر دفاع " + dpName + "...";
    if (isMyDefense) input.focus();
  }
  if (sendBtn) sendBtn.disabled = !isMyDefense;

  startTurnTimer();
}

function renderBazporsVote(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const c1 = data.candidate1;
  const c2 = data.candidate2;
  if (!c1 || !c2) return;

  const c1Name = c1.is_bot ? escapeHtml(c1.bot_name || c1.name) : escapeHtml(c1.username || c1.name);
  const c2Name = c2.is_bot ? escapeHtml(c2.bot_name || c2.name) : escapeHtml(c2.username || c2.name);
  labState._bazporsC1 = c1;
  labState._bazporsC2 = c2;

  const isMyTurn = data.turn_player && !data.turn_player.is_bot && data.turn_player.user_id === currentUser?.id;

  let html = '<div class="lab-msg lab-msg-system">🔍 رأی‌گیری بازپرس: بین ' + c1Name + ' و ' + c2Name + '</div>';

  if (isMyTurn) {
    html += '<div class="lab-revote-btns">' +
      '<button class="lab-revote-btn lab-revote-eliminate" onclick="sendBazporsVote(' + c1.id + ')">' + escapeHtml(c1.avatar || "🎭") + ' ' + c1Name + '</button>' +
      '<button class="lab-revote-btn lab-revote-keep" onclick="sendBazporsVote(' + c2.id + ')">' + escapeHtml(c2.avatar || "🎭") + ' ' + c2Name + '</button>' +
    '</div>';
  }

  container.insertAdjacentHTML("beforeend", html);
  container.scrollTop = container.scrollHeight;

  const input = document.getElementById("labChatInput");
  const sendBtn = document.getElementById("labSendBtn");
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  startTurnTimer();
}

function sendBazporsVote(targetPlayerId) {
  if (!labState.roomCode || !socket) return;
  socket.emit("lab_bazpors_vote", { code: labState.roomCode, target_player_id: targetPlayerId });
  document.querySelectorAll('.lab-revote-btn').forEach(b => b.disabled = true);
  showToast("رأی ثبت شد ✓");
}

function renderBazporsResult(data) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  if (data.eliminated) {
    const eName = data.eliminated.is_bot ? escapeHtml(data.eliminated.bot_name || data.eliminated.name) : escapeHtml(data.eliminated.username || data.eliminated.name);
    const teamLabel = escapeHtml(data.team_label || (data.eliminated_team === "mafia" ? "مافیا 🔴" : "شهروند 🟢"));
    appendLabMessage({
      id: 0, msg_type: "system",
      content: "🔍 " + eName + " حذف شد — ساید: " + teamLabel
    });
    // Update player alive status
    const pIdx = labState.players.findIndex(p => p.id === data.eliminated.id);
    if (pIdx >= 0) labState.players[pIdx].is_alive = false;
  } else {
    appendLabMessage({ id: 0, msg_type: "system", content: data.message || "تساوی آرا! کسی حذف نشد" });
  }
  renderPlayersBar();
}

// ═══════════════════
// ENTER KEY LISTENER
// ═══════════════════

document.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    const input = document.getElementById("labChatInput");
    if (input && document.activeElement === input && !input.disabled) {
      e.preventDefault();
      handleLabSend();
    }
  }
});

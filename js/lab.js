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
  timerInterval: null
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

async function createLabRoom(scenario) {
  if (!authToken) { openAuthModal("login"); return; }
  initSocket();
  const res = await apiFetch("/api/lab/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: scenario || "بازپرس" })
  });
  if (!res || res.error) { showToast(res?.error || "خطا در ساخت اتاق", "error"); return; }
  labState.roomCode = res.code;
  labState.scenario = res.scenario;
  labState.isHost = true;
  socket.emit("join_lab", { code: res.code });
  showLabLobby();
}

function joinLabRoom() {
  const code = document.getElementById("labJoinCode")?.value?.trim().toUpperCase();
  if (!code || code.length < 4) { showToast("کد اتاق را وارد کنید", "error"); return; }
  if (!authToken) { openAuthModal("login"); return; }
  initSocket();
  labState.roomCode = code;
  labState.isHost = false;
  socket.emit("join_lab", { code });
  showLabLobby();
}

function leaveLabRoom() {
  if (labState.roomCode && socket) {
    socket.emit("leave_lab", { code: labState.roomCode });
  }
  clearLabTimer();
  labState = {
    roomCode: null, players: [], scenario: null, isHost: false,
    maxPlayers: 10, phase: "lobby", myRole: null, myTeam: null,
    myRoleIcon: null, currentTurn: 0, turnEndAt: null, dayNumber: 0,
    messages: [], myPlayerId: null, timerInterval: null
  };
  showLabEntry();
}

function addLabBot() {
  if (!labState.roomCode || !socket) return;
  socket.emit("add_bot", { code: labState.roomCode });
}

function removeLabPlayer(playerId) {
  if (!labState.roomCode || !socket) return;
  socket.emit("remove_player", { code: labState.roomCode, player_id: playerId });
}

function inviteLabFriend(userId, username) {
  if (!labState.roomCode || !socket) return;
  socket.emit("invite_lab", { code: labState.roomCode, target_user_id: userId });
}

function startLabGame() {
  if (!labState.roomCode || !socket) return;
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
    if (!res || !res.friends || res.friends.length === 0) {
      list.innerHTML = '<p style="color:var(--dim);text-align:center;font-size:.82rem;">دوستی پیدا نشد</p>';
      return;
    }
    const inRoom = new Set(labState.players.filter(p => !p.is_bot).map(p => p.user_id));
    const available = res.friends.filter(f => f.status === "accepted" && !inRoom.has(f.user_id));
    if (available.length === 0) {
      list.innerHTML = '<p style="color:var(--dim);text-align:center;font-size:.82rem;">همه دوستان در اتاق هستند</p>';
      return;
    }
    list.innerHTML = available.map(f => `
      <div class="lab-invite-item">
        <span>${escapeHtml(f.avatar || '🎭')} ${escapeHtml(f.username)}</span>
        <button class="lab-invite-btn" onclick="inviteLabFriend(${f.user_id}, ${JSON.stringify(escapeHtml(f.username))})">دعوت</button>
      </div>
    `).join('');
  } else {
    panel.style.display = "none";
  }
}

// ═══════════════════════════
// GAME CHAT ROOM RENDERING
// ═══════════════════════════

function renderLabGame() {
  const game = document.getElementById("labGame");
  if (!game) return;

  const phaseLabels = {
    intro: "🎬 معرفی نقش‌ها",
    day_talk: `☀️ روز ${toFarsiNum(labState.dayNumber)} — بحث`,
    voting: `🗳️ رأی‌گیری روز ${toFarsiNum(labState.dayNumber)}`,
    night: `🌙 شب ${toFarsiNum(labState.dayNumber)}`,
    result: "🏆 نتیجه بازی"
  };

  const roleDisplay = labState.myRole
    ? `<span class="lab-my-role ${labState.myTeam}">${labState.myRoleIcon || '🎭'} ${escapeHtml(labState.myRole)}</span>`
    : '';

  game.innerHTML = `
    <div class="lab-game-header gc">
      <div class="lab-game-header-row">
        <button class="lab-back-btn" onclick="leaveLabRoom()" aria-label="خروج">✕</button>
        <div class="lab-phase-badge">${phaseLabels[labState.phase] || labState.phase}</div>
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
        <button id="labSendBtn" onclick="sendLabMessage()" disabled class="lab-send-btn">ارسال</button>
      </div>
    </div>
  `;

  renderPlayersBar();
  renderChatMessages();
  updateTurnInfo();
}

function renderPlayersBar() {
  const bar = document.getElementById("labPlayersBar");
  if (!bar) return;

  bar.innerHTML = labState.players.map(p => {
    const name = p.is_bot ? escapeHtml(p.bot_name) : escapeHtml(p.username || p.name);
    const avatar = escapeHtml(p.avatar);
    const alive = p.is_alive !== false;
    const isTurn = p.slot === labState.currentTurn && labState.phase === "day_talk";
    return `
      <div class="lab-player-pip ${alive ? '' : 'lab-pip-dead'} ${isTurn ? 'lab-pip-active' : ''}"
           title="${name}" data-slot="${p.slot}">
        <span class="lab-pip-avatar">${avatar}</span>
        <span class="lab-pip-name">${name}</span>
        ${!alive ? '<span class="lab-pip-x">✕</span>' : ''}
      </div>`;
  }).join('');
}

function updateTurnInfo() {
  const info = document.getElementById("labTurnInfo");
  const input = document.getElementById("labChatInput");
  const sendBtn = document.getElementById("labSendBtn");
  if (!info) return;

  if (labState.phase === "day_talk" && labState.currentTurn > 0) {
    const turnPlayer = labState.players.find(p => p.slot === labState.currentTurn);
    const turnName = turnPlayer ? (turnPlayer.is_bot ? turnPlayer.bot_name : (turnPlayer.username || turnPlayer.name)) : "?";
    const isMyTurn = turnPlayer && !turnPlayer.is_bot && turnPlayer.user_id === currentUser?.id;

    info.innerHTML = `
      <span class="lab-turn-label">نوبت:</span>
      <span class="lab-turn-name ${isMyTurn ? 'lab-turn-me' : ''}">${escapeHtml(turnName)}</span>
      <span class="lab-turn-timer" id="labTurnTimer"></span>
    `;

    if (input) input.disabled = !isMyTurn;
    if (sendBtn) sendBtn.disabled = !isMyTurn;
    if (isMyTurn && input) {
      input.placeholder = "الان نوبت شماست! پیام بنویسید...";
      input.focus();
    } else if (input) {
      input.placeholder = `منتظر ${escapeHtml(turnName)}...`;
    }

    startTurnTimer();
  } else if (labState.phase === "voting") {
    info.innerHTML = `<span class="lab-turn-label">🗳️ رأی خود را انتخاب کنید</span>
                      <span class="lab-turn-timer" id="labTurnTimer"></span>`;
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    startTurnTimer();
  } else if (labState.phase === "night") {
    info.innerHTML = `<span class="lab-turn-label">🌙 شب شده...</span>`;
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  } else if (labState.phase === "intro") {
    info.innerHTML = `<span class="lab-turn-label">🎬 نقش‌ها در حال توزیع...</span>`;
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  } else {
    info.innerHTML = '';
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  }
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

function startTurnTimer() {
  clearLabTimer();
  if (!labState.turnEndAt) return;

  const fill = document.getElementById("labTimerFill");
  const timerSpan = document.getElementById("labTurnTimer");

  labState.timerInterval = setInterval(() => {
    const now = Date.now();
    const end = new Date(labState.turnEndAt).getTime();
    const total = labState.phase === "voting" ? 30000 : 20000;
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
// CHAT
// ═══════════════════

function sendLabMessage() {
  const input = document.getElementById("labChatInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !labState.roomCode || !socket) return;

  socket.emit("lab_chat", { code: labState.roomCode, content });
  input.value = "";
}

function renderChatMessages() {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  container.innerHTML = labState.messages.map(m => {
    if (m.msg_type === "system") {
      return `<div class="lab-msg lab-msg-system">${escapeHtml(m.content)}</div>`;
    }
    const p = m.player || {};
    const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
    const avatar = escapeHtml(p.avatar || "🎭");
    const isMe = !p.is_bot && p.user_id === currentUser?.id;

    return `
      <div class="lab-msg ${isMe ? 'lab-msg-me' : ''}" data-msg-id="${m.id}">
        <div class="lab-msg-header">
          <span class="lab-msg-avatar">${avatar}</span>
          <span class="lab-msg-name">${name}${p.is_bot ? ' 🤖' : ''}</span>
          <span class="lab-msg-slot">#${toFarsiNum(p.slot || 0)}</span>
        </div>
        <div class="lab-msg-body">${escapeHtml(m.content)}</div>
        <div class="lab-msg-reactions">
          ${!isMe ? `
            <button class="lab-react-btn lab-react-like" onclick="sendLabReaction(${m.id}, 'like')">👍 <span class="react-count" id="like_${m.id}">0</span></button>
            <button class="lab-react-btn lab-react-dislike" onclick="sendLabReaction(${m.id}, 'dislike')">👎 <span class="react-count" id="dislike_${m.id}">0</span></button>
          ` : ''}
        </div>
      </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function appendLabMessage(msg) {
  labState.messages.push(msg);
  const container = document.getElementById("labChatMessages");
  if (!container) { renderChatMessages(); return; }

  const p = msg.player || {};
  const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
  const avatar = escapeHtml(p.avatar || "🎭");
  const isMe = !p.is_bot && p.user_id === currentUser?.id;

  if (msg.msg_type === "system") {
    container.insertAdjacentHTML("beforeend",
      `<div class="lab-msg lab-msg-system">${escapeHtml(msg.content)}</div>`);
  } else {
    container.insertAdjacentHTML("beforeend", `
      <div class="lab-msg ${isMe ? 'lab-msg-me' : ''}" data-msg-id="${msg.id}">
        <div class="lab-msg-header">
          <span class="lab-msg-avatar">${avatar}</span>
          <span class="lab-msg-name">${name}${p.is_bot ? ' 🤖' : ''}</span>
          <span class="lab-msg-slot">#${toFarsiNum(p.slot || 0)}</span>
        </div>
        <div class="lab-msg-body">${escapeHtml(msg.content)}</div>
        <div class="lab-msg-reactions">
          ${!isMe ? `
            <button class="lab-react-btn lab-react-like" onclick="sendLabReaction(${msg.id}, 'like')">👍 <span class="react-count" id="like_${msg.id}">0</span></button>
            <button class="lab-react-btn lab-react-dislike" onclick="sendLabReaction(${msg.id}, 'dislike')">👎 <span class="react-count" id="dislike_${msg.id}">0</span></button>
          ` : ''}
        </div>
      </div>`);
  }
  container.scrollTop = container.scrollHeight;
}

function sendLabReaction(messageId, reaction) {
  if (!labState.roomCode || !socket) return;
  socket.emit("lab_reaction", { code: labState.roomCode, message_id: messageId, reaction });
}

// ═══════════════════
// VOTING UI
// ═══════════════════

function showVotingUI(players) {
  const container = document.getElementById("labChatMessages");
  if (!container) return;

  const votingHTML = `
    <div class="lab-msg lab-msg-system">🗳️ وقت رأی‌گیری! یک نفر را برای حذف انتخاب کنید (${toFarsiNum(30)} ثانیه)</div>
    <div class="lab-vote-grid" id="labVoteGrid">
      ${players.map(p => {
        const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
        const avatar = escapeHtml(p.avatar || "🎭");
        const isMe = !p.is_bot && p.user_id === currentUser?.id;
        if (isMe) return '';
        return `
          <button class="lab-vote-card" onclick="castLabVote(${p.id})" data-pid="${p.id}">
            <span class="lab-vote-avatar">${avatar}</span>
            <span class="lab-vote-name">${name}</span>
          </button>`;
      }).join('')}
    </div>
  `;
  container.insertAdjacentHTML("beforeend", votingHTML);
  container.scrollTop = container.scrollHeight;
}

function castLabVote(targetPlayerId) {
  if (!labState.roomCode || !socket) return;
  socket.emit("lab_vote", { code: labState.roomCode, target_player_id: targetPlayerId });

  // Highlight selected
  document.querySelectorAll('.lab-vote-card').forEach(c => c.classList.remove('lab-vote-selected'));
  const sel = document.querySelector(`.lab-vote-card[data-pid="${targetPlayerId}"]`);
  if (sel) sel.classList.add('lab-vote-selected');
  showToast("رأی شما ثبت شد ✓");
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

  let playersHTML = data.players.map(p => {
    const name = p.is_bot ? escapeHtml(p.bot_name || p.name) : escapeHtml(p.username || p.name);
    const teamClass = p.team === "mafia" ? "lab-team-mafia" : "lab-team-citizen";
    const aliveText = p.is_alive ? "زنده" : "حذف شده";
    const icon = escapeHtml(p.avatar || "🎭");
    return `
      <div class="lab-result-player ${teamClass}">
        <span>${icon}</span>
        <span class="lab-result-name">${name}</span>
        <span class="lab-result-role">${escapeHtml(p.role_name || "?")}</span>
        <span class="lab-result-status">${aliveText}</span>
      </div>`;
  }).join('');

  container.insertAdjacentHTML("beforeend", `
    <div class="lab-msg lab-msg-system lab-result-banner">
      <div class="lab-result-title">${winnerText}</div>
      ${data.eliminated ? `<div class="lab-result-elim">آخرین حذف: ${escapeHtml(data.eliminated.name || data.eliminated.bot_name || "?")} (${escapeHtml(data.eliminated_role || "?")})</div>` : ''}
      <div class="lab-result-grid">${playersHTML}</div>
      <button class="lab-action-btn lab-btn-create" onclick="leaveLabRoom()" style="margin-top:16px">🔄 بازگشت</button>
    </div>
  `);

  container.scrollTop = container.scrollHeight;
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
  const accept = confirm(`${data.from_username} شما را به بازی آزمایشی (${data.scenario}) دعوت کرد. قبول می‌کنید؟`);
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
  showToast(`نقش شما: ${data.icon} ${data.role_name}`, "info");
}

function handleLabGameStarted(data) {
  labState.phase = "intro";
  labState.players = data.players || labState.players;
  labState.dayNumber = 0;
  labState.messages = [];

  // Add system message
  labState.messages.push({
    id: 0, msg_type: "system",
    content: `🎬 بازی آزمایشی شروع شد! سناریو: ${data.scenario || "بازپرس"}`
  });
  if (labState.myRole) {
    labState.messages.push({
      id: 0, msg_type: "system",
      content: `نقش شما: ${labState.myRoleIcon || "🎭"} ${labState.myRole} (${labState.myTeam === "mafia" ? "مافیا" : "شهروند"})`
    });
  }

  showLabGame();
  renderLabGame();
}

function handleLabPhaseChange(data) {
  labState.phase = data.phase;
  labState.dayNumber = data.day_number || labState.dayNumber;
  labState.turnEndAt = data.turn_end_at || null;

  if (data.phase === "day_talk") {
    labState.currentTurn = data.current_turn;
    if (data.turn_player) {
      // Update player info
      const idx = labState.players.findIndex(p => p.slot === data.turn_player.slot);
      if (idx >= 0) labState.players[idx] = { ...labState.players[idx], ...data.turn_player };
    }

    if (data.day_number > (labState.dayNumber - 1)) {
      appendLabMessage({
        id: 0, msg_type: "system",
        content: `☀️ روز ${toFarsiNum(data.day_number)} شروع شد`
      });
    }

    renderPlayersBar();
    updateTurnInfo();
  } else if (data.phase === "voting") {
    labState.currentTurn = 0;
    appendLabMessage({ id: 0, msg_type: "system", content: "🗳️ وقت رأی‌گیری!" });
    showVotingUI(data.players || labState.players.filter(p => p.is_alive !== false));
    renderPlayersBar();
    updateTurnInfo();
  } else if (data.phase === "night") {
    labState.currentTurn = 0;
    let nightMsg = `🌙 شب ${toFarsiNum(data.day_number)} فرا رسید`;
    if (data.eliminated) {
      const eName = data.eliminated.is_bot ? data.eliminated.bot_name : (data.eliminated.username || data.eliminated.name);
      nightMsg += ` — ${escapeHtml(eName)} (${escapeHtml(data.eliminated_role || "?")}) با ${toFarsiNum(data.eliminated_votes || 0)} رأی حذف شد`;

      // Update player alive status
      const pIdx = labState.players.findIndex(p => p.slot === data.eliminated.slot);
      if (pIdx >= 0) labState.players[pIdx].is_alive = false;
    }
    appendLabMessage({ id: 0, msg_type: "system", content: nightMsg });
    renderPlayersBar();
    updateTurnInfo();
  }
}

function handleLabNewMessage(data) {
  appendLabMessage(data);
}

function handleLabReaction(data) {
  const el = document.getElementById(`${data.reaction}_${data.message_id}`);
  if (el) {
    el.textContent = parseInt(el.textContent || "0") + 1;
  }
}

function handleLabVoteUpdate(data) {
  // Could show vote progress
  appendLabMessage({
    id: 0, msg_type: "system",
    content: `📊 ${toFarsiNum(data.voted)} از ${toFarsiNum(data.total)} نفر رأی داده‌اند`
  });
}

function handleLabGameResult(data) {
  showGameResult(data);
}

// Enter key to send
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    const input = document.getElementById("labChatInput");
    if (input && document.activeElement === input && !input.disabled) {
      e.preventDefault();
      sendLabMessage();
    }
  }
});

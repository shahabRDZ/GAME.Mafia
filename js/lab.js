// ── Lab Mode (حالت آزمایشی) ──

let labState = {
  roomCode: null,
  players: [],
  scenario: null,
  isHost: false,
  maxPlayers: 10
};

// ── Create Room ──
async function createLabRoom(scenario) {
  if (!authToken) { openAuthModal("login"); return; }
  initSocket();
  const res = await apiFetch("/api/lab/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: scenario || "تکاور" })
  });
  if (!res || res.error) { showToast(res?.error || "خطا در ساخت اتاق", "error"); return; }
  labState.roomCode = res.code;
  labState.scenario = res.scenario;
  labState.isHost = true;
  socket.emit("join_lab", { code: res.code });
  showLabLobby();
}

// ── Join Room ──
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

// ── Leave Room ──
function leaveLabRoom() {
  if (labState.roomCode && socket) {
    socket.emit("leave_lab", { code: labState.roomCode });
  }
  labState = { roomCode: null, players: [], scenario: null, isHost: false, maxPlayers: 10 };
  showLabEntry();
}

// ── Add Bot ──
function addLabBot() {
  if (!labState.roomCode || !socket) return;
  socket.emit("add_bot", { code: labState.roomCode });
}

// ── Remove Player/Bot ──
function removeLabPlayer(playerId) {
  if (!labState.roomCode || !socket) return;
  socket.emit("remove_player", { code: labState.roomCode, player_id: playerId });
}

// ── Invite Friend ──
function inviteLabFriend(userId, username) {
  if (!labState.roomCode || !socket) return;
  socket.emit("invite_lab", { code: labState.roomCode, target_user_id: userId });
}

// ── Show Entry Screen ──
function showLabEntry() {
  const entry = document.getElementById("labEntry");
  const lobby = document.getElementById("labLobby");
  if (entry) entry.style.display = "";
  if (lobby) lobby.style.display = "none";
}

// ── Show Lobby ──
function showLabLobby() {
  const entry = document.getElementById("labEntry");
  const lobby = document.getElementById("labLobby");
  if (entry) entry.style.display = "none";
  if (lobby) lobby.style.display = "";
}

// ── Render Lobby ──
function renderLabLobby(data) {
  labState.players = data.players || [];
  labState.scenario = data.scenario;
  if (data.host_id === currentUser?.id) labState.isHost = true;

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

  const scenarioLabel = escapeHtml(data.scenario || "تکاور");

  lobby.innerHTML = `
    <div class="lab-header gc">
      <div class="lab-header-top">
        <button class="lab-back-btn" onclick="leaveLabRoom()" aria-label="خروج">✕ خروج</button>
        <div class="lab-room-info">
          <span class="lab-scenario-badge">${scenarioLabel}</span>
          <span class="lab-player-count">${toFarsiNum(playerCount)} / ${toFarsiNum(maxPlayers)} نفر</span>
        </div>
      </div>
      <div class="lab-code-box">
        <span class="lab-code-label">کد اتاق</span>
        <span class="lab-code" id="labRoomCode">${escapeHtml(data.code)}</span>
        <button class="lab-copy-btn" onclick="copyLabCode()" aria-label="کپی کد">📋</button>
      </div>
    </div>

    <div class="lab-slots gc">
      <div class="lab-slots-title">بازیکنان</div>
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
      <p style="text-align:center;color:var(--dim);font-size:.85rem;">منتظر میزبان برای شروع بازی...</p>
    </div>`}

    <div class="lab-invite-panel gc" id="labInvitePanel" style="display:none">
      <div class="lab-invite-title">دعوت دوستان آنلاین</div>
      <div class="lab-invite-list" id="labInviteList"></div>
    </div>
  `;
}

// ── Copy Room Code ──
function copyLabCode() {
  const code = labState.roomCode;
  if (code && navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => showToast("کد کپی شد!"));
  }
}

// ── Show Invite Friends Panel ──
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

// ── Start Game (placeholder for now) ──
function startLabGame() {
  showToast("بازی به زودی...", "info");
}

// ── Socket Listeners (called from socket.js) ──
function handleLabUpdate(data) {
  labState.roomCode = data.code;
  showLabLobby();
  renderLabLobby(data);
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

// ── Scenario Selection Helpers ──
function selectLabScenario(btn) {
  document.querySelectorAll('.lab-scenario-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function getSelectedLabScenario() {
  const active = document.querySelector('.lab-scenario-btn.active');
  return active ? active.dataset.scenario : 'تکاور';
}

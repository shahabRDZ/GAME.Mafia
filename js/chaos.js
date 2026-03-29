/* ── CHAOS Mode Game Logic ── */

let chaosTimerInterval = null;

async function createChaosRoom() {
  if (!authToken) { openAuthModal("login"); showToast("⚠️ ابتدا وارد شوید"); return; }
  initSocket();
  const r = await apiFetch("/api/chaos/create", { method: "POST" });
  if (r.ok) {
    chaosState.roomCode = r.data.code;
    chaosState.isHost = true;
    socket.emit("join_chaos", { code: r.data.code });
    document.getElementById("chaosEntry").style.display = "none";
    document.getElementById("chaosLobby").style.display = "block";
  } else {
    showToast("⚠️ " + (r.data.error || "خطا در ساخت اتاق"));
  }
}

function joinChaosRoom() {
  if (!authToken) { openAuthModal("login"); showToast("⚠️ ابتدا وارد شوید"); return; }
  const code = document.getElementById("joinCodeInput").value.trim().toUpperCase();
  if (code.length < 4) { showToast("⚠️ کد اتاق را وارد کنید"); return; }
  initSocket();
  chaosState.roomCode = code;
  chaosState.isHost = false;
  socket.emit("join_chaos", { code });
  document.getElementById("chaosEntry").style.display = "none";
  document.getElementById("chaosLobby").style.display = "block";
}

function leaveChaosRoom() {
  stopVoiceChat();
  if (socket && chaosState.roomCode) {
    socket.emit("leave_chaos", { code: chaosState.roomCode });
  }
  resetChaosState();
  document.getElementById("chaosLobby").style.display = "none";
  document.getElementById("chaosGame").style.display = "none";
  document.getElementById("chaosEntry").style.display = "block";
}

function startChaosGame() {
  if (socket && chaosState.roomCode) {
    socket.emit("start_chaos", { code: chaosState.roomCode });
  }
}

function sendChaosMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text || !socket) return;
  socket.emit("chat_message", { code: chaosState.roomCode, content: text });
  input.value = "";
  input.focus();
}

function sendLobbyChatMessage() {
  const input = document.getElementById("lobbyChatInput");
  const text = input.value.trim();
  if (!text || !socket) return;
  socket.emit("chat_message", { code: chaosState.roomCode, content: text });
  input.value = "";
  input.focus();
}

function selectChaosVote(targetUserId) {
  chaosState.selectedVote = targetUserId;
  document.querySelectorAll(".vote-card").forEach(c => {
    c.classList.toggle("voted", parseInt(c.dataset.uid) === targetUserId);
  });
  // Show confirm button
  const confirmBtn = document.getElementById("voteConfirmBtn");
  if (confirmBtn) confirmBtn.style.display = "block";
}

function confirmChaosVote() {
  if (!chaosState.selectedVote || chaosState.myVote) return;
  chaosState.myVote = chaosState.selectedVote;
  socket.emit("cast_vote", { code: chaosState.roomCode, target_user_id: chaosState.myVote });
  const confirmBtn = document.getElementById("voteConfirmBtn");
  if (confirmBtn) { confirmBtn.textContent = "✅ رأی ثبت شد"; confirmBtn.disabled = true; confirmBtn.style.opacity = ".5"; }
  // Disable vote cards
  document.querySelectorAll(".vote-card").forEach(c => { c.style.pointerEvents = "none"; });
}

async function showInviteFriends() {
  const el = document.getElementById("inviteFriendsList");
  if (!el) return;
  if (el.style.display === "block") { el.style.display = "none"; return; }
  el.style.display = "block";
  el.innerHTML = '<div class="custom-empty">در حال بارگذاری...</div>';
  const r = await apiFetch("/api/friends");
  if (!r.ok || !r.data.length) { el.innerHTML = '<div class="custom-empty">دوستی ندارید</div>'; return; }
  // Filter out players already in room
  const inRoom = chaosState.players.map(p => p.user_id);
  const available = r.data.filter(f => !inRoom.includes(f.id));
  if (!available.length) { el.innerHTML = '<div class="custom-empty">همه دوستانتان در اتاق هستند</div>'; return; }
  el.innerHTML = available.map(f => `
    <div class="friend-item" style="margin-bottom:4px">
      <span class="friend-avatar">${f.avatar || '🎭'}</span>
      <div class="friend-info">
        <div class="friend-name">${f.username}</div>
        <div class="friend-status ${f.online ? 'friend-online' : 'friend-offline'}">${f.online ? '● آنلاین' : '○ آفلاین'}</div>
      </div>
      <button class="friend-btn friend-btn-invite" onclick="inviteToRoom(${f.id},'${f.username}')">دعوت</button>
    </div>
  `).join("");
}

function inviteToRoom(userId, username) {
  if (!socket || !chaosState.roomCode) return;
  socket.emit("invite_to_room", { code: chaosState.roomCode, target_user_id: userId });
  showToast("📩 دعوت به " + username + " ارسال شد");
}

function voteEndDiscussion() {
  if (chaosState.votedEnd || !socket || !chaosState.roomCode) return;
  chaosState.votedEnd = true;
  socket.emit("vote_end_discussion", { code: chaosState.roomCode });
  const btn = document.getElementById("endVoteBtn");
  if (btn) { btn.textContent = "✅ رأی داده‌اید"; btn.disabled = true; btn.style.opacity = ".5"; }
}

function resetChaosState() {
  chaosState = { roomCode: null, players: [], myRole: null, phase: null,
                 phaseEndAt: null, messages: [], isHost: false, myVote: null };
  if (chaosTimerInterval) { clearInterval(chaosTimerInterval); chaosTimerInterval = null; }
}

// ── Render Functions ──

function renderChaosLobby(data) {
  document.getElementById("chaosLobby").style.display = "block";
  const isHost = data.host_id === (currentUser && currentUser.id);

  // Keep chat messages if they exist
  const oldMessages = document.getElementById("lobbyChatArea")?.innerHTML || "";

  document.getElementById("chaosLobby").innerHTML = `
    <div class="room-code-display" onclick="navigator.clipboard.writeText('${data.code}');showToast('📋 کد کپی شد')">${data.code}</div>
    <div class="room-code-label">کد اتاق — برای کپی کلیک کنید</div>
    <div class="player-slots">
      ${[0,1,2].map(i => {
        const p = data.players[i];
        return p
          ? `<div class="player-slot filled ${data.host_id === p.user_id ? 'host' : ''}">
               <div class="slot-avatar">${p.avatar || '🎭'}</div>
               <div class="slot-name">${p.username}</div>
             </div>`
          : `<div class="player-slot empty">
               <div class="slot-avatar">❓</div>
               <div class="slot-empty-text">در انتظار...</div>
             </div>`;
      }).join("")}
    </div>
    <div class="chat-area" id="lobbyChatArea" style="max-height:180px;min-height:100px">${oldMessages}</div>
    <div class="chat-input-bar">
      <input type="text" id="lobbyChatInput" placeholder="پیام..." maxlength="500"
        onkeydown="if(event.key==='Enter')sendLobbyChatMessage()">
      <button onclick="sendLobbyChatMessage()">ارسال</button>
      <button class="voice-btn voice-off" id="voiceToggleBtn" onclick="voiceEnabled ? toggleVoiceMute() : startVoiceChat()">🎙️</button>
      ${voiceEnabled ? '<button class="voice-btn voice-muted" onclick="stopVoiceChat()" style="padding:8px 10px">🔴</button>' : ''}
    </div>
    ${data.players.length < 3 ? '<button class="chaos-btn secondary" onclick="showInviteFriends()" style="margin-top:10px">👥 دعوت دوستان</button>' : ''}
    <div id="inviteFriendsList" style="display:none;margin-top:10px"></div>
    ${isHost && data.players.length === 3
      ? '<button class="chaos-btn" onclick="startChaosGame()" style="margin-top:12px">🎮 شروع کی‌اس</button>'
      : isHost
        ? '<p style="color:var(--dim);font-size:.82rem;margin-top:10px">منتظر ورود بازیکنان... ('+toFarsiNum(data.players.length)+'/۳)</p>'
        : '<p style="color:var(--dim);font-size:.82rem;margin-top:10px">منتظر شروع توسط میزبان...</p>'}
    <button class="chaos-btn secondary" onclick="leaveChaosRoom()" style="margin-top:8px">خروج از اتاق</button>
  `;
}

function renderChaosGame() {
  document.getElementById("chaosLobby").style.display = "none";
  document.getElementById("chaosGame").style.display = "flex";

  const roleClass = chaosState.myRole === "mafia" ? "role-mafia" : "role-citizen";
  const roleLabel = chaosState.myRole === "mafia" ? "😈 مافیا" : "😇 شهروند";

  const myId = currentUser ? currentUser.id : 0;

  document.getElementById("chaosGame").innerHTML = `
    <div class="phase-bar">
      <span class="phase-label" id="phaseLabel">بحث آزاد</span>
      <span class="phase-timer-text" id="phaseTimerText">5:00</span>
    </div>
    <div class="phase-timer-bar"><div class="phase-timer-fill" id="phaseTimerFill" style="width:100%"></div></div>

    <div class="your-role-badge ${roleClass}">${roleLabel}</div>

    <div class="players-circles" id="playersCircles">
      ${chaosState.players.map(p => `
        <div class="player-circle" id="pc-${p.user_id}" data-uid="${p.user_id}">
          <div class="pc-avatar">${p.avatar || '🎭'}</div>
          <div class="pc-name">${p.username}${p.user_id === myId ? ' (شما)' : ''}</div>
        </div>
      `).join("")}
    </div>

    <div class="chat-area" id="chatArea"></div>
    <div class="chat-input-bar" id="chatInputBar">
      <input type="text" id="chatInput" placeholder="پیام بنویسید..." maxlength="500"
        onkeydown="if(event.key==='Enter')sendChaosMessage()">
      <button onclick="sendChaosMessage()">ارسال</button>
      <button class="voice-btn voice-off" id="voiceToggleBtn" onclick="voiceEnabled ? toggleVoiceMute() : startVoiceChat()">🎙️</button>
      ${voiceEnabled ? '<button class="voice-btn voice-muted" onclick="stopVoiceChat()" style="padding:8px 10px">🔴</button>' : ''}
    </div>
    <div class="end-vote-bar" id="endVoteBar">
      <button class="end-vote-btn" id="endVoteBtn" onclick="voteEndDiscussion()">⏩ پایان بحث</button>
      <span class="end-vote-count" id="endVoteCount"></span>
    </div>
    <div class="vote-area" id="voteArea" style="display:none"></div>
    <div class="result-area" id="resultArea" style="display:none"></div>
  `;
  chaosState.votedEnd = false;
  startPhaseTimer();
}

function renderPhaseChange(phase) {
  if (phase === "voting") {
    document.getElementById("phaseLabel").textContent = "رأی‌گیری";
    document.getElementById("chatInputBar").style.display = "none";
    const endBar = document.getElementById("endVoteBar");
    if (endBar) endBar.style.display = "none";
    const myId = currentUser ? currentUser.id : 0;
    document.getElementById("voteArea").style.display = "flex";
    chaosState.selectedVote = null;
    document.getElementById("voteArea").innerHTML = `
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${chaosState.players.filter(p => p.user_id !== myId).map(p => `
          <div class="vote-card" data-uid="${p.user_id}" onclick="selectChaosVote(${p.user_id})">
            <div class="vote-avatar">${p.avatar || '🎭'}</div>
            <div class="vote-name">${p.username}</div>
          </div>
        `).join("")}
      </div>
      <div class="vote-status" id="voteStatus">بازیکن مورد نظر را انتخاب کنید</div>
      <button class="chaos-btn" id="voteConfirmBtn" onclick="confirmChaosVote()" style="display:none;margin-top:12px;width:100%">✅ ثبت نهایی رأی</button>
    `;
    startPhaseTimer();
  }
}

function renderGameResult(data) {
  if (chaosTimerInterval) { clearInterval(chaosTimerInterval); chaosTimerInterval = null; }
  const myId = currentUser ? currentUser.id : 0;
  const myPlayer = data.players.find(p => p.user_id === myId);
  const iWon = (myPlayer && ((myPlayer.role === "mafia" && data.winner === "mafia") || (myPlayer.role === "citizen" && data.winner === "citizen")));

  document.getElementById("chaosGame").innerHTML = `
    <div class="result-area" style="display:block">
      <div class="result-icon">${iWon ? '🏆' : '💀'}</div>
      <div class="result-title ${iWon ? 'win' : 'lose'}">${iWon ? 'پیروز شدید!' : 'باختید!'}</div>
      <div class="result-sub">${data.winner === 'mafia' ? '😈 تیم مافیا برنده شد' : '😇 تیم شهروند برنده شد'}</div>
      <div class="result-roles">
        ${data.players.map(p => `
          <div class="result-role-card ${p.role}">
            <div class="result-role-avatar">${p.avatar || '🎭'}</div>
            <div class="result-role-name">${p.username}</div>
            <div class="result-role-label">${p.role === 'mafia' ? '😈 مافیا' : '😇 شهروند'}</div>
          </div>
        `).join("")}
      </div>
      <button class="chaos-btn" onclick="leaveChaosRoom()">بازگشت</button>
    </div>
  `;
}

function appendChatMessage(data) {
  // Try game chat area first, then lobby chat area
  const area = document.getElementById("chatArea") || document.getElementById("lobbyChatArea");
  if (!area) return;
  const isSelf = currentUser && data.user_id === currentUser.id;
  area.innerHTML += `
    <div class="chat-msg ${isSelf ? 'chat-msg-self' : 'chat-msg-other'}">
      <div class="chat-body">
        <div class="chat-username">${data.username}</div>
        <div class="chat-text">${escapeHtml(data.content)}</div>
        <div class="chat-time">${data.time}</div>
      </div>
    </div>`;
  area.scrollTop = area.scrollHeight;
}

function updateVoteStatus(data) {
  const el = document.getElementById("voteStatus");
  if (el) el.textContent = `${toFarsiNum(data.voted)} از ${toFarsiNum(data.total)} رأی داده‌اند`;
}

function startPhaseTimer() {
  if (chaosTimerInterval) clearInterval(chaosTimerInterval);

  // Calculate server time offset for accurate sync
  const endTime = chaosState.phaseEndAt;
  if (!endTime) return;
  const totalDuration = chaosState.phase === "discussion" ? 300 : 90;

  // Run immediately once, then every second
  function tick() {
    const now = Date.now();
    const end = endTime instanceof Date ? endTime.getTime() : new Date(endTime).getTime();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const el = document.getElementById("phaseTimerText");
    const fill = document.getElementById("phaseTimerFill");
    if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    if (fill) fill.style.width = `${(remaining / totalDuration) * 100}%`;
    if (remaining <= 0 && chaosTimerInterval) { clearInterval(chaosTimerInterval); chaosTimerInterval = null; }
  }

  tick(); // Run immediately
  chaosTimerInterval = setInterval(tick, 1000);
}

function showRoomInviteNotification(fromUsername, roomCode) {
  // Remove old invite notification
  const old = document.getElementById("inviteNotification");
  if (old) old.remove();

  const notif = document.createElement("div");
  notif.id = "inviteNotification";
  notif.className = "invite-notification";
  notif.innerHTML = `
    <div class="invite-notif-content">
      <div class="invite-notif-text">⚡ <strong>${fromUsername}</strong> شما را به بازی کی‌اس دعوت کرد</div>
      <div class="invite-notif-code">کد اتاق: ${roomCode}</div>
      <div class="invite-notif-actions">
        <button class="chaos-btn" onclick="acceptRoomInvite('${roomCode}')" style="padding:8px 20px;font-size:.85rem">✅ قبول</button>
        <button class="chaos-btn secondary" onclick="this.closest('.invite-notification').remove()" style="padding:8px 20px;font-size:.85rem">❌ رد</button>
      </div>
    </div>
  `;
  document.body.appendChild(notif);

  // Auto-remove after 30 seconds
  setTimeout(() => { if (notif.parentNode) notif.remove(); }, 30000);
}

function acceptRoomInvite(code) {
  const notif = document.getElementById("inviteNotification");
  if (notif) notif.remove();
  showScreen("chaos");
  initSocket();
  chaosState.roomCode = code;
  chaosState.isHost = false;
  setTimeout(() => {
    socket.emit("join_chaos", { code });
    document.getElementById("chaosEntry").style.display = "none";
    document.getElementById("chaosLobby").style.display = "block";
  }, 500);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

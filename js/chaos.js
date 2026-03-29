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

function castChaosVote(targetUserId) {
  if (chaosState.myVote) return;
  chaosState.myVote = targetUserId;
  socket.emit("cast_vote", { code: chaosState.roomCode, target_user_id: targetUserId });
  document.querySelectorAll(".vote-card").forEach(c => {
    c.classList.toggle("voted", parseInt(c.dataset.uid) === targetUserId);
  });
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
    ${isHost && data.players.length === 3
      ? '<button class="chaos-btn" onclick="startChaosGame()">🎮 شروع CHAOS</button>'
      : isHost
        ? '<p style="color:var(--dim);font-size:.82rem;margin-top:10px">منتظر ورود بازیکنان... ('+toFarsiNum(data.players.length)+'/۳)</p>'
        : '<p style="color:var(--dim);font-size:.82rem;margin-top:10px">منتظر شروع توسط میزبان...</p>'}
    <button class="chaos-btn secondary" onclick="leaveChaosRoom()" style="margin-top:10px">خروج از اتاق</button>
  `;
}

function renderChaosGame() {
  document.getElementById("chaosLobby").style.display = "none";
  document.getElementById("chaosGame").style.display = "flex";

  const roleClass = chaosState.myRole === "mafia" ? "role-mafia" : "role-citizen";
  const roleLabel = chaosState.myRole === "mafia" ? "😈 مافیا" : "😇 شهروند";

  document.getElementById("chaosGame").innerHTML = `
    <div class="phase-bar">
      <span class="phase-label" id="phaseLabel">بحث آزاد</span>
      <div class="phase-timer-bar"><div class="phase-timer-fill" id="phaseTimerFill" style="width:100%"></div></div>
      <span class="phase-timer-text" id="phaseTimerText">3:00</span>
    </div>
    <div class="your-role-badge ${roleClass}">${roleLabel}</div>
    <div class="voice-controls">
      <button class="voice-btn voice-off" id="voiceToggleBtn" onclick="voiceEnabled ? toggleVoiceMute() : startVoiceChat()">🎙️ ویس</button>
      ${voiceEnabled ? '<button class="voice-btn voice-off" onclick="stopVoiceChat()">🔴 قطع</button>' : ''}
    </div>
    <div class="chat-area" id="chatArea"></div>
    <div class="chat-input-bar" id="chatInputBar">
      <input type="text" id="chatInput" placeholder="پیام بنویسید..." maxlength="500"
        onkeydown="if(event.key==='Enter')sendChaosMessage()">
      <button onclick="sendChaosMessage()">ارسال</button>
    </div>
    <div class="vote-area" id="voteArea" style="display:none"></div>
    <div class="result-area" id="resultArea" style="display:none"></div>
  `;
  startPhaseTimer();
}

function renderPhaseChange(phase) {
  if (phase === "voting") {
    document.getElementById("phaseLabel").textContent = "رأی‌گیری";
    document.getElementById("chatInputBar").style.display = "none";
    const myId = currentUser ? currentUser.id : 0;
    document.getElementById("voteArea").style.display = "flex";
    document.getElementById("voteArea").innerHTML = chaosState.players
      .filter(p => p.user_id !== myId)
      .map(p => `
        <div class="vote-card" data-uid="${p.user_id}" onclick="castChaosVote(${p.user_id})">
          <div class="vote-avatar">${p.avatar || '🎭'}</div>
          <div class="vote-name">${p.username}</div>
        </div>
      `).join("") + '<div class="vote-status" id="voteStatus">رأی خود را انتخاب کنید</div>';
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
  const area = document.getElementById("chatArea");
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
  chaosTimerInterval = setInterval(() => {
    if (!chaosState.phaseEndAt) return;
    const now = new Date();
    const remaining = Math.max(0, Math.floor((chaosState.phaseEndAt - now) / 1000));
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const el = document.getElementById("phaseTimerText");
    const fill = document.getElementById("phaseTimerFill");
    if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    const totalDuration = chaosState.phase === "discussion" ? 180 : 60;
    if (fill) fill.style.width = `${(remaining / totalDuration) * 100}%`;
    if (remaining <= 0 && chaosTimerInterval) { clearInterval(chaosTimerInterval); chaosTimerInterval = null; }
  }, 1000);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

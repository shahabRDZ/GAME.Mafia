/* ── WebSocket Connection Manager ── */

let socket = null;

function initSocket() {
  if (socket && socket.connected) return;
  if (!authToken) return;
  socket = io({
    query: { token: authToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  });

  socket.on("connect", () => { setupVoiceSocketEvents(); });
  socket.on("disconnect", () => { console.log("WS disconnected"); });
  socket.on("reconnect", () => {
    // Rejoin room if was in one
    if (chaosState.roomCode) socket.emit("join_chaos", { code: chaosState.roomCode });
  });
  socket.on("error", (data) => { showToast("⚠️ " + (data?.msg || "خطا")); });

  socket.on("room_update", (data) => {
    if (!data || !data.players) return;
    chaosState.players = data.players;
    chaosState.roomCode = data.code;
    renderChaosLobby(data);
  });

  socket.on("game_started", (data) => {
    if (!data) return;
    chaosState.myRole = data.your_role;
    chaosState.phase = data.phase;
    chaosState.phaseEndAt = new Date(data.phase_end_at);
    chaosState.players = data.players || [];
    chaosState.messages = [];
    chaosState.myVote = null;
    chaosState.selectedVote = null;
    renderChaosGame();
  });

  socket.on("new_message", (data) => {
    if (!data) return;
    chaosState.messages.push(data);
    appendChatMessage(data);
  });

  socket.on("phase_change", (data) => {
    if (!data) return;
    chaosState.phase = data.phase;
    chaosState.phaseEndAt = new Date(data.phase_end_at);
    chaosState.myVote = null;
    chaosState.selectedVote = null;
    renderPhaseChange(data.phase);
  });

  socket.on("vote_update", (data) => { if (data) updateVoteStatus(data); });
  socket.on("game_result", (data) => { if (data) { chaosState.phase = "result"; renderGameResult(data); } });
  socket.on("friend_request", (data) => { if (data?.from) showToast("📩 درخواست دوستی از " + data.from.username); });
}

function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

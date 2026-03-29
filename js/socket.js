/* ── WebSocket Connection Manager ── */

let socket = null;

function initSocket() {
  if (socket && socket.connected) return;
  if (!authToken) return;

  socket = io({ query: { token: authToken }, transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    console.log("WebSocket connected");
    setupVoiceSocketEvents();
  });

  socket.on("disconnect", () => {
    console.log("WebSocket disconnected");
  });

  socket.on("error", (data) => {
    showToast("⚠️ " + (data.msg || "خطا"));
  });

  // Room events
  socket.on("room_update", (data) => {
    chaosState.players = data.players;
    chaosState.roomCode = data.code;
    renderChaosLobby(data);
  });

  // Game events
  socket.on("game_started", (data) => {
    chaosState.myRole = data.your_role;
    chaosState.phase = data.phase;
    chaosState.phaseEndAt = new Date(data.phase_end_at);
    chaosState.players = data.players;
    chaosState.messages = [];
    chaosState.myVote = null;
    renderChaosGame();
  });

  socket.on("new_message", (data) => {
    chaosState.messages.push(data);
    appendChatMessage(data);
  });

  socket.on("phase_change", (data) => {
    chaosState.phase = data.phase;
    chaosState.phaseEndAt = new Date(data.phase_end_at);
    chaosState.myVote = null;
    renderPhaseChange(data.phase);
  });

  socket.on("vote_update", (data) => {
    updateVoteStatus(data);
  });

  socket.on("game_result", (data) => {
    chaosState.phase = "result";
    renderGameResult(data);
  });

  // Friend events
  socket.on("friend_request", (data) => {
    showToast("📩 درخواست دوستی از " + data.from.username);
  });
}

function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

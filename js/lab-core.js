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

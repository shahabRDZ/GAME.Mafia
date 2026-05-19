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

// ── Web NFC: Host pushes URL, Player auto-reads ──
async function startNfcBroadcast(code) {
  if (!('NDEFReader' in window)) return false;
  try {
    nfcWriter = new NDEFReader();
    const url = `${window.location.origin}?nfc=${code}`;
    await nfcWriter.write({
      records: [{ recordType: "url", data: url }]
    });
    return true;
  } catch {
    return false;
  }
}

async function startNfcScan() {
  if (!('NDEFReader' in window)) return false;
  try {
    nfcReader = new NDEFReader();
    await nfcReader.scan();
    nfcReader.addEventListener("reading", ({ message }) => {
      for (const record of message.records) {
        if (record.recordType === "url") {
          const text = new TextDecoder().decode(record.data);
          const match = text.match(/[?&]nfc=([A-Z0-9]{5})/);
          if (match) {
            haptic('heavy');
            if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 50]);
            autoJoinDigital(match[1]);
            return;
          }
        }
        if (record.recordType === "text") {
          const text = new TextDecoder().decode(record.data);
          if (/^[A-Z0-9]{5}$/.test(text)) {
            haptic('heavy');
            if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 50]);
            autoJoinDigital(text);
            return;
          }
        }
      }
    });
    return true;
  } catch {
    return false;
  }
}

async function autoJoinDigital(code) {
  try {
    const r = await fetch(API + "/api/digital/receive/" + code, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    haptic('heavy');
    showNfcRoleReveal(data);
  } catch {
    showToast("⚠️ خطا در دریافت نقش");
  }
}

function showNfcRoleReveal(data) {
  const role = data.role;
  const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
  const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
  const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };

  document.getElementById("digitalRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
  document.getElementById("digitalRoleName").textContent = role.name;
  document.getElementById("digitalRoleName").style.color = teamColors[role.team] || "#fff";
  document.getElementById("digitalRoleTeam").textContent = teamNames[role.team] || role.team;
  document.getElementById("digitalRoleTeam").style.color = teamColors[role.team] || "#fff";
  const abilityInfo = ROLE_ABILITIES[role.name];
  document.getElementById("digitalRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
  document.getElementById("digitalRoleNum").textContent = `بازیکن شماره ${toFarsiNum(data.playerNum)}`;

  document.getElementById("digitalJoinPhase").style.display = "none";
  document.getElementById("digitalTapPhase").style.display = "none";
  document.getElementById("digitalRolePhase").style.display = "block";
  document.getElementById("digitalPlayerOverlay").classList.add("show");
}

// ══════════════════════════════════════════
// NEARBY PLAYERS — Location-based
// ══════════════════════════════════════════
let nearbySearchInterval = null;
let nearbySelectedIds = new Set();
let nearbyRoleCheckInterval = null;

async function startNearbyGame() {
  if (!authToken) { showToast("⚠️ ابتدا وارد شوید"); openAuthModal('login'); return; }

  // Nearby only supports 10, 12, 13 player games
  if (!state.group || !state.count) { showToast("⚠️ سناریو و تعداد انتخاب کنید"); return; }
  if (![10, 12, 13].includes(state.count) && !state.isCustom) {
    showToast("⚠️ حرفه‌ای فقط برای ۱۰، ۱۲ و ۱۳ نفره");
    return;
  }

  // Get roles
  let roles = [];
  if (state.isCustom) {
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    if (customCardsList.length < 3 || mc < 1 || cc < 1) { showToast("⚠️ نقش‌ها ناکافی"); return; }
    roles = customCardsList.map(c => ({ name: c.name, team: c.team }));
  } else {
    const groupData = ROLES_DATA[state.group] && ROLES_DATA[state.group][state.count];
    if (!groupData) { showToast("⚠️ سناریو پیدا نشد"); return; }
    groupData.mafia.forEach(n => roles.push({ name: n, team: "mafia" }));
    groupData.citizen.forEach(n => roles.push({ name: n, team: "citizen" }));
  }
  window._nearbyRoles = roles;
  document.getElementById('customOverlay')?.classList.remove('show');
  showNearbyNarratorModal();
}

function showNearbyNarratorModal() {
  const modal = document.getElementById("narratorModal");
  const input = document.getElementById("narratorNameInput");
  const info = document.getElementById("narratorScenarioInfo");

  const saved = localStorage.getItem('ShowShung_narrator');
  if (saved) { input.value = saved; narratorName = saved; }

  info.innerHTML = `
    <span class="narrator-scenario-chip">🎭 ${state.group}</span>
    <span class="narrator-scenario-chip">👥 ${toFarsiNum(state.count)} نفر</span>
    <span class="narrator-scenario-chip">📱 حرفه‌ای</span>
  `;

  // Override confirm to go to nearby instead of normal game
  window._nearbyNarratorMode = true;
  modal.classList.add("show");
  setTimeout(() => input.select(), 300);
}

function actualStartNearbyGame() {
  if (!navigator.geolocation) { showToast("⚠️ لوکیشن در دسترس نیست"); return; }

  document.getElementById("nearbyOverlay").classList.add("show");
  document.getElementById("nearbyScenarioInfo").textContent = `🎭 ${state.group} · ${toFarsiNum(state.count)} نفر`;
  document.getElementById("nearbyHostName").textContent = narratorName || (currentUser ? currentUser.username : 'گرداننده');
  document.getElementById("nearbyStatus").textContent = "در انتظار پلیر...";
  document.getElementById("nearbyPlayerList").innerHTML = "";
  document.getElementById("nearbyPlayerList").style.display = "block";
  document.getElementById("nearbyConfirmList").style.display = "none";
  document.getElementById("nearbyAssignBtn").style.display = "none";
  nearbySelectedIds = new Set();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Register as host with game info
      await apiFetch("/api/nearby/host-register", {
        method: "POST", body: JSON.stringify({ lat, lng, group: state.group, count: state.count }), _background: true
      });
      // Also register in players pool
      await apiFetch("/api/nearby/register", {
        method: "POST", body: JSON.stringify({ lat, lng }), _background: true
      });

      // Search nearby
      searchNearby(lat, lng);
      nearbySearchInterval = setInterval(() => searchNearby(lat, lng), 5000);
    },
    () => {
      document.getElementById("nearbyStatus").textContent = "❌ دسترسی به لوکیشن رد شد";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function searchNearby(lat, lng) {
  const r = await apiFetch("/api/nearby/find", {
    method: "POST", body: JSON.stringify({ lat, lng, radius: 200 }), _background: true
  });
  if (!r.ok) return;
  const players = r.data;
  const list = document.getElementById("nearbyPlayerList");

  if (!players.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)">هنوز کسی پیدا نشده...<br><span style="font-size:0.72rem">بازیکنان باید اپ رو باز کنن و لوکیشن بدن</span></div>';
    document.getElementById("nearbyStatus").textContent = "🔍 در حال جستجو...";
    return;
  }

  document.getElementById("nearbyStatus").textContent = `${toFarsiNum(players.length)} نفر پیدا شد`;

  list.innerHTML = players.map(p => {
    const sel = nearbySelectedIds.has(p.user_id);
    return `<div class="nearby-item${sel ? ' selected' : ''}" onclick="toggleNearbyPlayer(${p.user_id}, this)">
      ${renderAvatar(p.username, '2rem')}
      <span class="nearby-name">${escapeHtml(p.username)}</span>
      <span class="nearby-dist">${toFarsiNum(p.distance)} متر</span>
      <span class="nearby-check">${sel ? '✓' : ''}</span>
    </div>`;
  }).join('');

  updateNearbyAssignBtn();
}

function toggleNearbyPlayer(uid, el) {
  if (nearbySelectedIds.has(uid)) {
    nearbySelectedIds.delete(uid);
    el.classList.remove("selected");
    el.querySelector(".nearby-check").textContent = "";
  } else {
    nearbySelectedIds.add(uid);
    el.classList.add("selected");
    el.querySelector(".nearby-check").textContent = "✓";
  }
  haptic('light');
  updateNearbyAssignBtn();
}

function updateNearbyAssignBtn() {
  const btn = document.getElementById("nearbyAssignBtn");
  const roles = window._nearbyRoles || [];
  const requiredPlayers = roles.length; // all roles go to players, host is just moderator
  const selected = nearbySelectedIds.size;

  btn.style.display = "block";
  if (selected < requiredPlayers) {
    btn.textContent = `⏳ ${toFarsiNum(selected)} از ${toFarsiNum(requiredPlayers)} نفر — ${toFarsiNum(requiredPlayers - selected)} نفر مونده`;
    btn.disabled = true;
    btn.style.opacity = "0.5";
  } else {
    btn.textContent = `🎲 پخش رندوم نقش به ${toFarsiNum(requiredPlayers)} نفر`;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

async function assignNearbyRoles() {
  const roles = window._nearbyRoles || [];
  const playerIds = [...nearbySelectedIds];
  const requiredPlayers = roles.length;

  if (playerIds.length < requiredPlayers) {
    showToast(`⚠️ لیست ${toFarsiNum(requiredPlayers)} نفره تکمیل نشده — ${toFarsiNum(requiredPlayers - playerIds.length)} نفر مونده`);
    return;
  }

  const finalIds = playerIds.slice(0, requiredPlayers);
  const selectedRoles = roles.slice(0, requiredPlayers);

  const r = await apiFetch("/api/nearby/assign", {
    method: "POST",
    body: JSON.stringify({ player_ids: finalIds, roles: selectedRoles })
  });

  if (!r.ok) { showToast("⚠️ " + (r.data?.error || "خطا")); return; }

  haptic('heavy');
  showToast(`🎉 نقش‌ها به ${toFarsiNum(finalIds.length)} نفر ارسال شد!`);
  document.getElementById("nearbyStatus").textContent = "منتظر تأیید بازیکنان...";
  document.getElementById("nearbyAssignBtn").style.display = "none";
  document.getElementById("nearbyPlayerList").style.display = "none";

  // Show confirmation list with red/green lights
  const confirmList = document.getElementById("nearbyConfirmList");
  confirmList.style.display = "block";
  window._nearbyGameId = r.data.gameId;

  // Start polling confirmations
  if (window._confirmPoll) clearInterval(window._confirmPoll);
  window._confirmPoll = setInterval(() => pollConfirmations(r.data.gameId), 2000);
  pollConfirmations(r.data.gameId);
}

async function pollConfirmations(gameId) {
  const r = await apiFetch("/api/nearby/confirmations/" + gameId, { _background: true });
  if (!r.ok) return;
  const list = document.getElementById("nearbyConfirmList");
  const players = r.data;

  list.innerHTML = players.map(p =>
    `<div class="confirm-item">
      <div class="confirm-light${p.confirmed ? ' confirmed' : ''}"></div>
      ${renderAvatar(p.username, '1.8rem')}
      <span class="confirm-name">#${toFarsiNum(p.playerNum)} ${escapeHtml(p.username)}</span>
      <span class="confirm-status${p.confirmed ? ' done' : ''}">${p.confirmed ? '✓ دیده شد' : '⏳ منتظر'}</span>
      <button class="confirm-resend" onclick="resendToPlayer(${p.user_id})" title="ارسال مجدد">🔄</button>
    </div>`
  ).join('') +
  `<div style="display:flex;gap:8px;margin-top:12px">
    <button class="mod-btn" onclick="resendAllPlayers()" style="flex:1">🔄 ارسال مجدد به همه</button>
    <button class="mod-btn mod-btn-start" onclick="resetAndReshuffle()" style="flex:1">🎲 ریست و پخش مجدد</button>
  </div>`;

  const allConfirmed = players.length > 0 && players.every(p => p.confirmed);
  if (allConfirmed) {
    clearInterval(window._confirmPoll);
    document.getElementById("nearbyStatus").textContent = "✅ همه بازیکنان نقش خود را دیدند!";
    document.getElementById("nearbyStatus").style.color = "#4ade80";
    haptic('heavy');
    showToast("✅ همه نقش‌ها تأیید شد!");

    // Show moderator tools button
    list.innerHTML += `<div style="margin-top:16px">
      <button class="start-btn start-btn-nearby" onclick="closeNearby();openModeratorTools()" style="width:100%">🎙️ ابزار گرداننده</button>
    </div>`;
  }
}

async function resendToPlayer(userId) {
  const r = await apiFetch("/api/nearby/resend/" + userId, { method: "POST", _background: true });
  if (r.ok) {
    haptic('light');
    showToast("🔄 ارسال مجدد شد");
  } else {
    showToast("⚠️ خطا در ارسال مجدد");
  }
}

async function resendAllPlayers() {
  const gameId = window._nearbyGameId;
  if (!gameId) return;
  const r = await apiFetch("/api/nearby/confirmations/" + gameId, { _background: true });
  if (!r.ok) return;
  for (const p of r.data) {
    await apiFetch("/api/nearby/resend/" + p.user_id, { method: "POST", _background: true });
  }
  haptic('medium');
  showToast("🔄 به همه ارسال مجدد شد");
}

async function resetAndReshuffle() {
  const gameId = window._nearbyGameId;
  if (!gameId) { showToast("⚠️ بازی فعالی نیست"); return; }

  const r = await apiFetch("/api/nearby/reassign", {
    method: "POST", body: JSON.stringify({ gameId })
  });
  if (!r.ok) { showToast("⚠️ " + (r.data?.error || "خطا")); return; }

  haptic('heavy');
  showToast("🎲 نقش‌ها مجدداً پخش شد!");

  // Update game ID and restart polling
  window._nearbyGameId = r.data.gameId;
  document.getElementById("nearbyStatus").textContent = "🎲 نقش‌ها مجدد پخش شد — منتظر تأیید...";
  document.getElementById("nearbyStatus").style.color = "var(--accent2)";
  if (window._confirmPoll) clearInterval(window._confirmPoll);
  window._confirmPoll = setInterval(() => pollConfirmations(r.data.gameId), 2000);
  pollConfirmations(r.data.gameId);
}

function closeNearby() {
  document.getElementById("nearbyOverlay").classList.remove("show");
  if (nearbySearchInterval) { clearInterval(nearbySearchInterval); nearbySearchInterval = null; }
}

// ── Player side: enter name → find hosts → pick one → wait for role ──
let hostSearchInterval = null;
let playerLat = null, playerLng = null;
let playerDisplayName = '';

function openHostList() {
  if (!authToken) { showToast("⚠️ ابتدا وارد حساب شوید"); openAuthModal('login'); return; }

  // Show name input first
  document.getElementById("playerNamePhase").style.display = "block";
  document.getElementById("hostPickPhase").style.display = "none";
  const nameInput = document.getElementById("playerNameInput");
  nameInput.value = currentUser ? currentUser.username : '';
  document.getElementById("hostListOverlay").classList.add("show");
  setTimeout(() => nameInput.select(), 300);
}

function submitPlayerName() {
  const name = document.getElementById("playerNameInput").value.trim();
  if (!name) { showToast("⚠️ اسم رو وارد کنید"); return; }
  playerDisplayName = name;

  if (!navigator.geolocation) { showToast("⚠️ لوکیشن در دسترس نیست"); return; }

  // Switch to host pick phase
  document.getElementById("playerNamePhase").style.display = "none";
  document.getElementById("hostPickPhase").style.display = "block";
  document.getElementById("hostListHint").textContent = "📍 در حال دریافت لوکیشن...";
  document.getElementById("hostListContent").innerHTML = "";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      playerLat = pos.coords.latitude;
      playerLng = pos.coords.longitude;
      document.getElementById("hostListHint").textContent = "🔍 در حال جستجوی گرداننده‌ها...";
      searchHosts();
      hostSearchInterval = setInterval(searchHosts, 4000);
    },
    () => {
      document.getElementById("hostListHint").textContent = "❌ دسترسی لوکیشن رد شد — از تنظیمات فعال کنید";
    },
    { enableHighAccuracy: true }
  );
}

function closeHostList() {
  document.getElementById("hostListOverlay").classList.remove("show");
  if (hostSearchInterval) { clearInterval(hostSearchInterval); hostSearchInterval = null; }
}

async function searchHosts() {
  if (!playerLat) return;
  const r = await apiFetch("/api/nearby/hosts", {
    method: "POST", body: JSON.stringify({ lat: playerLat, lng: playerLng }), _background: true
  });
  if (!r.ok) return;
  const hosts = r.data;
  const container = document.getElementById("hostListContent");

  if (!hosts.length) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--dim)">هنوز گرداننده‌ای پیدا نشده...<br><span style="font-size:0.72rem">گرداننده باید «حرفه‌ای» را بزند</span></div>';
    document.getElementById("hostListHint").textContent = "🔍 در حال جستجو...";
    return;
  }

  document.getElementById("hostListHint").textContent = `${toFarsiNum(hosts.length)} گرداننده پیدا شد`;
  container.innerHTML = hosts.map(h => `
    <div class="host-item" onclick="joinHostGame(${h.user_id})">
      ${renderAvatar(h.username, '2.2rem')}
      <div class="host-info">
        <div class="host-name">${escapeHtml(h.username)}</div>
        <div class="host-meta">🎭 ${escapeHtml(h.group)} · 👥 ${toFarsiNum(h.count)} نفر · ${toFarsiNum(h.distance)} متر</div>
      </div>
      <div class="host-join-icon">→</div>
    </div>
  `).join('');
}

async function joinHostGame(hostId) {
  if (!playerLat) return;
  const r = await apiFetch("/api/nearby/join-host/" + hostId, {
    method: "POST", body: JSON.stringify({ lat: playerLat, lng: playerLng, displayName: playerDisplayName })
  });
  if (!r.ok) { showToast("⚠️ خطا در اتصال"); return; }

  closeHostList();
  haptic('medium');
  showToast("✅ به بازی متصل شدید — منتظر پخش نقش باشید");

  // Start polling for role
  if (nearbyRoleCheckInterval) clearInterval(nearbyRoleCheckInterval);
  nearbyRoleCheckInterval = setInterval(checkMyNearbyRole, 2000);
}

// ── Player: flip card to confirm ──
let nearbyGameId = null;
let nearbyRoleData = null;

function flipNearbyCard() {
  const card = document.getElementById("nearbyCard");
  if (card.classList.contains("flipped")) return;
  card.classList.add("flipped");
  haptic('medium');

  // Send confirmation to server
  if (nearbyGameId) {
    apiFetch("/api/nearby/confirm/" + nearbyGameId, { method: "POST", _background: true });
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    document.getElementById("nearbyRoleOverlay").classList.remove("show");
  }, 5000);
}

function closeNearbyRole() {
  document.getElementById("nearbyRoleOverlay").classList.remove("show");
  // Keep polling alive for resend/reshuffle
}

async function checkMyNearbyRole() {
  const r = await apiFetch("/api/nearby/my-role", { _background: true });
  if (!r.ok || !r.data.assigned) return;

  // If already confirmed this game, skip (wait for new game)
  if (r.data.gameId === nearbyGameId && document.getElementById("nearbyCard")?.classList.contains("flipped")) {
    // Check if resend — confirmation was reset
    if (!r.data.confirmed) {
      // Resend! Reset card for re-viewing
      document.getElementById("nearbyCard").classList.remove("flipped");
    }
    return;
  }

  // New role or first time — don't stop polling (allow resend)
  const role = r.data.role;

  // Strong vibration pattern
  haptic('heavy');
  if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 100]);

  // Play alarm sound
  if (typeof playAlarm === 'function') playAlarm();

  // Push notification
  if (typeof sendLocalNotification === 'function') {
    sendLocalNotification('🎭 نقش شما آماده شد!', `${role.name} — الان ببینید!`);
  }

  nearbyGameId = r.data.gameId;
  nearbyRoleData = role;

  // Setup card — back side shows player number, front shows role
  const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
  const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
  const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };
  const teamBg = { mafia: "radial-gradient(ellipse at 50% 30%, #1a0000, #0a0000)", citizen: "radial-gradient(ellipse at 50% 30%, #001a10, #000a08)", independent: "radial-gradient(ellipse at 50% 30%, #1a0030, #0a0018)" };

  // Card back
  document.getElementById("nearbyCardNum").textContent = toFarsiNum(r.data.playerNum);

  // Card front
  document.getElementById("nearbyRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
  document.getElementById("nearbyRoleName").textContent = role.name;
  document.getElementById("nearbyRoleName").style.color = teamColors[role.team] || "#fff";
  document.getElementById("nearbyRoleTeam").textContent = teamNames[role.team] || role.team;
  document.getElementById("nearbyRoleTeam").style.color = teamColors[role.team] || "#fff";
  const abilityInfo = ROLE_ABILITIES[role.name];
  document.getElementById("nearbyRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
  document.getElementById("nearbyRoleNum").textContent = `بازیکن شماره ${toFarsiNum(r.data.playerNum)}`;
  document.getElementById("nearbyCardFront").style.background = teamBg[role.team] || "";
  document.getElementById("nearbyCardFront").style.borderColor = teamColors[role.team] || "";

  // Reset card to back
  document.getElementById("nearbyCard").classList.remove("flipped");

  // Show overlay — card is face down, player taps to flip
  document.getElementById("nearbyRoleOverlay").classList.add("show");

  showToast("🎭 نقش شما آماده شد — لمس کنید!");
}

function generateHostQr(code) {
  // Simple QR using ZXing on server or a tiny inline generator
  const container = document.getElementById("digitalQrContainer");
  if (!container) return;
  const url = `${window.location.origin}?nfc=${code}`;
  // Use a simple img tag with Google Charts QR API (works offline if cached)
  container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}" alt="QR" style="width:120px;height:120px;border-radius:8px;margin:8px auto;display:block;background:#fff;padding:4px">
    <div style="font-size:0.68rem;color:var(--dim)">آیفون: QR اسکن کنید</div>`;
}

async function startDigitalGame() {
  // Gather roles like startGame does
  let roles = [];
  if (state.isCustom) {
    const name = document.getElementById("customName").value.trim() || "گروه دلخواه";
    const mc = customCardsList.filter(c => c.team === "mafia").length;
    const cc = customCardsList.filter(c => c.team === "citizen").length;
    if (customCardsList.length < 3) { showToast("⚠️ حداقل ۳ کارت اضافه کنید"); return; }
    if (mc < 1) { showToast("⚠️ حداقل یک کارت مافیا لازم است"); return; }
    if (cc < 1) { showToast("⚠️ حداقل یک کارت شهروند لازم است"); return; }
    state.group = name;
    roles = customCardsList.map(c => ({ name: c.name, team: c.team }));
  } else {
    if (!state.group || !state.count) { showToast("⚠️ لطفاً گروه و تعداد را انتخاب کنید"); return; }
    const groupData = ROLES_DATA[state.group] && ROLES_DATA[state.group][state.count];
    if (!groupData) { showToast("⚠️ داده سناریو یافت نشد"); return; }
    groupData.mafia.forEach(n => roles.push({ name: n, team: "mafia" }));
    groupData.citizen.forEach(n => roles.push({ name: n, team: "citizen" }));
  }

  // Create room on server
  try {
    const r = await fetch(API + "/api/digital/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles, group: state.group })
    });
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "خطا")); return; }

    // Show host overlay with code
    document.getElementById("digitalCode").textContent = data.code;
    document.getElementById("digitalTotal").textContent = toFarsiNum(data.total);
    document.getElementById("digitalAssigned").textContent = toFarsiNum(0);
    document.getElementById("digitalProgressBar").style.width = "0%";
    document.getElementById("digitalStatus").textContent = "در انتظار بازیکنان...";
    document.getElementById("digitalOverlay").classList.add("show");

    // Generate QR for iOS fallback
    try {
      const qrUrl = `${window.location.origin}?nfc=${data.code}`;
      const qrContainer = document.getElementById("digitalQrContainer");
      const writer = new (await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm')).default;
    } catch {}
    // Simple QR using canvas
    generateHostQr(data.code);

    // Try NFC broadcast (Android Chrome only)
    const nfcOk = await startNfcBroadcast(data.code);
    if (nfcOk) {
      document.getElementById("digitalNfcStatus").querySelector('div:nth-child(2)').textContent = "📡 NFC فعال — گوشی بازیکن را نزدیک کنید";
    }

    // Poll for status updates
    if (digitalPollInterval) clearInterval(digitalPollInterval);
    digitalPollInterval = setInterval(() => pollDigitalStatus(data.code), 2000);

  } catch (e) {
    showToast("⚠️ خطا در اتصال به سرور");
  }
}

async function pollDigitalStatus(code) {
  try {
    const r = await fetch(API + "/api/digital/status/" + code);
    const data = await r.json();
    if (!r.ok) return;

    document.getElementById("digitalAssigned").textContent = toFarsiNum(data.assigned);
    const pct = data.total > 0 ? (data.assigned / data.total) * 100 : 0;
    document.getElementById("digitalProgressBar").style.width = pct + "%";

    if (data.done) {
      document.getElementById("digitalStatus").textContent = "🎉 همه نقش‌ها تقسیم شد!";
      document.getElementById("digitalStatus").style.color = "#4ade80";
      clearInterval(digitalPollInterval);
      digitalPollInterval = null;
      haptic('heavy');
    } else {
      document.getElementById("digitalStatus").textContent = `${toFarsiNum(data.remaining)} نقش باقی‌مانده`;
    }
  } catch {}
}

function closeDigitalRoom() {
  document.getElementById("digitalOverlay").classList.remove("show");
  if (digitalPollInterval) { clearInterval(digitalPollInterval); digitalPollInterval = null; }
}

// ── Player side: join and receive ──
let digitalConnectedCode = null;

async function openDigitalPlayer() {
  document.getElementById("digitalJoinPhase").style.display = "block";
  document.getElementById("digitalTapPhase").style.display = "none";
  document.getElementById("digitalRolePhase").style.display = "none";
  document.getElementById("digitalJoinCode").value = "";
  digitalConnectedCode = null;
  document.getElementById("digitalPlayerOverlay").classList.add("show");

  // Try NFC scan — if available, auto-receive on tap
  const nfcOk = await startNfcScan();
  if (nfcOk) {
    document.getElementById("digitalPlayerNfcHint").textContent = "✅ NFC فعال — نزدیک کنید";
    document.getElementById("digitalPlayerNfcHint").style.color = "#4ade80";
  } else {
    document.getElementById("digitalPlayerNfcText").innerHTML = "NFC در دسترس نیست<br>از <strong>کد</strong> یا <strong>QR</strong> استفاده کنید";
    document.getElementById("digitalPlayerNfcHint").textContent = "آیفون / مرورگر قدیمی";
    document.getElementById("digitalNfcScanArea").style.borderColor = "rgba(255,255,255,.1)";
    document.getElementById("digitalNfcScanArea").style.opacity = "0.5";
  }

  setTimeout(() => document.getElementById("digitalJoinCode").focus(), 300);
}

function closeDigitalPlayer() {
  document.getElementById("digitalPlayerOverlay").classList.remove("show");
  digitalConnectedCode = null;
}

// Phase 1: Connect to room (enter code once)
async function connectToRoom() {
  const code = document.getElementById("digitalJoinCode").value.trim().toUpperCase();
  if (code.length !== 5) { showToast("⚠️ کد اتاق باید ۵ حرفی باشد"); return; }

  try {
    const r = await fetch(API + "/api/digital/info/" + code);
    const data = await r.json();
    if (!r.ok) { showToast("⚠️ " + (data.error || "اتاق پیدا نشد")); return; }

    digitalConnectedCode = code;
    document.getElementById("digitalJoinPhase").style.display = "none";
    document.getElementById("digitalTapPhase").style.display = "block";
    document.getElementById("digitalRoomInfo").innerHTML =
      `🎭 ${data.group} · 👥 ${toFarsiNum(data.total)} نفر · ${toFarsiNum(data.remaining)} باقی‌مانده`;
    haptic('light');
  } catch {
    showToast("⚠️ خطا در اتصال");
  }
}

// Phase 2: Tap to receive role (one tap = one role)
async function tapToReceiveRole() {
  if (!digitalConnectedCode) return;
  const tapArea = document.getElementById("digitalTapArea");
  tapArea.classList.add("receiving");

  try {
    const r = await fetch(API + "/api/digital/receive/" + digitalConnectedCode, { method: "POST" });
    const data = await r.json();

    if (!r.ok) {
      showToast("⚠️ " + (data.error || "خطا"));
      tapArea.classList.remove("receiving");
      return;
    }

    // Heavy vibration — feels like NFC transfer
    haptic('heavy');
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);

    const role = data.role;
    const teamColors = { mafia: "#ff5555", citizen: "#44ff99", independent: "#c084fc" };
    const teamNames = { mafia: "😈 مافیا", citizen: "😇 شهروند", independent: "🐺 مستقل" };
    const teamEmojis = { mafia: "😈", citizen: "😇", independent: "🐺" };

    document.getElementById("digitalRoleEmoji").textContent = ROLE_ICONS[role.name] || teamEmojis[role.team] || "🎭";
    document.getElementById("digitalRoleName").textContent = role.name;
    document.getElementById("digitalRoleName").style.color = teamColors[role.team] || "#fff";
    document.getElementById("digitalRoleTeam").textContent = teamNames[role.team] || role.team;
    document.getElementById("digitalRoleTeam").style.color = teamColors[role.team] || "#fff";
    const abilityInfo = ROLE_ABILITIES[role.name];
    document.getElementById("digitalRoleAbility").textContent = abilityInfo ? abilityInfo.action : "";
    document.getElementById("digitalRoleNum").textContent = `بازیکن شماره ${toFarsiNum(data.playerNum)}`;

    // Switch to role reveal
    document.getElementById("digitalTapPhase").style.display = "none";
    document.getElementById("digitalRolePhase").style.display = "block";

  } catch {
    showToast("⚠️ خطا در دریافت نقش");
    tapArea.classList.remove("receiving");
  }
}

// Back to tap phase for next player
function backToTapPhase() {
  document.getElementById("digitalRolePhase").style.display = "none";
  document.getElementById("digitalTapPhase").style.display = "block";
  // Update remaining count
  fetch(API + "/api/digital/info/" + digitalConnectedCode)
    .then(r => r.json())
    .then(data => {
      if (data.remaining <= 0) {
        document.getElementById("digitalRoomInfo").innerHTML = "🎉 همه نقش‌ها تقسیم شد!";
        document.getElementById("digitalTapArea").style.display = "none";
      } else {
        document.getElementById("digitalRoomInfo").innerHTML =
          `🎭 ${data.group} · ${toFarsiNum(data.remaining)} نقش باقی‌مانده`;
      }
    }).catch(() => {});
}
function flipAllBack() { shuffleCards(); }
function goBack() { exitGameFullscreen(); }

// ══════════════════════════════════════════
// MODERATOR TOOLS
// ══════════════════════════════════════════

let modTimerInterval = null;
let modTimerSeconds = 0;
let modTimerRunning = false;
let modIsNight = false;
let modVotes = {};

function openModeratorTools() {
  document.getElementById("completionBanner").classList.remove("show");
  document.getElementById("cardStage").style.display = "none";
  const panel = document.getElementById("modPanel");
  panel.style.display = "block";
  renderWarningPlayers();
  renderNightActions();
  resetModTimer();
}

function closeModPanel() {
  document.getElementById("modPanel").style.display = "none";
  document.getElementById("completionBanner").classList.add("show");
  if (modTimerInterval) { clearInterval(modTimerInterval); modTimerInterval = null; }
}


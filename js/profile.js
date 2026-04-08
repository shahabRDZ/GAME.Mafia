/* ── Profile & Social System ── */

async function renderProfileScreen() {
  const card = document.getElementById("profileCard");
  const friendsSec = document.getElementById("friendsSection");
  const searchSec = document.getElementById("searchSection");

  if (!currentUser) {
    showEmptyState(card, '🎭', 'به شوشانگ خوش آمدید!', 'وارد شوید تا پروفایل، دوستان و آمار بازی‌هاتون رو ببینید', 'ورود / ثبت‌نام', "openAuthModal('login')");
    friendsSec.innerHTML = "";
    searchSec.innerHTML = "";
    return;
  }

  const u = currentUser;
  card.innerHTML = `
    ${renderAvatar(u.username, '3.5rem')}
    <div class="profile-username">${escapeHtml(u.username)}</div>
    <div class="profile-id">ID: ${u.id}</div>
    <div class="profile-bio">${escapeHtml(u.bio || 'بیو ندارید')}</div>
    <div class="profile-stats">
      <div class="profile-stat wins"><span class="profile-stat-num">${toFarsiNum(u.chaos_wins || 0)}</span><span class="profile-stat-label">برد</span></div>
      <div class="profile-stat losses"><span class="profile-stat-num">${toFarsiNum(u.chaos_losses || 0)}</span><span class="profile-stat-label">باخت</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${toFarsiNum(u.total_games || 0)}</span><span class="profile-stat-label">کل بازی</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${getWinRate(u)}٪</span><span class="profile-stat-label">درصد برد</span></div>
    </div>
    <div class="profile-extra-stats">
      <div class="extra-stat"><span class="extra-stat-icon">📅</span> عضویت: ${u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '—'}</div>
      <div class="extra-stat"><span class="extra-stat-icon">🎯</span> تجربه: ${getExperienceLevel(u)}</div>
    </div>
    <div class="badge-row">${renderBadges(u)}</div>
    <div class="profile-edit-row">
      <input type="text" id="editBio" placeholder="بیو..." value="${escapeHtml(u.bio || '')}" maxlength="200" style="flex:1">
      <button class="chaos-btn secondary" onclick="updateBio()" style="padding:8px 16px;font-size:.8rem">ذخیره</button>
    </div>
  `;

function getExperienceLevel(u) {
  const total = (u.total_games || 0) + (u.chaos_wins || 0) + (u.chaos_losses || 0);
  if (total >= 100) return '🏆 افسانه‌ای';
  if (total >= 50) return '⭐ حرفه‌ای';
  if (total >= 20) return '🎯 باتجربه';
  if (total >= 5) return '🎮 بازیکن';
  return '🌱 تازه‌کار';
}

function getWinRate(u) {
  const total = (u.chaos_wins || 0) + (u.chaos_losses || 0);
  if (total === 0) return toFarsiNum(0);
  return toFarsiNum(Math.round((u.chaos_wins / total) * 100));
}

function renderBadges(u) {
  const badges = [];
  const wins = u.chaos_wins || 0;
  const losses = u.chaos_losses || 0;
  const games = u.total_games || 0;

  // Always show some badges (locked or unlocked)
  badges.push(games >= 1
    ? { icon: '🎮', text: 'اولین بازی', cls: 'badge-green' }
    : { icon: '🎮', text: 'اولین بازی', cls: 'badge-green', locked: true });
  badges.push(games >= 10
    ? { icon: '⭐', text: 'بازیکن حرفه‌ای', cls: 'badge-gold' }
    : { icon: '⭐', text: '۱۰ بازی', cls: 'badge-gold', locked: true });
  badges.push(wins >= 1
    ? { icon: '🏆', text: 'اولین برد', cls: 'badge-blue' }
    : { icon: '🏆', text: 'اولین برد', cls: 'badge-blue', locked: true });
  badges.push(wins >= 5
    ? { icon: '🔥', text: 'فاتح', cls: 'badge-red' }
    : { icon: '🔥', text: '۵ برد', cls: 'badge-red', locked: true });
  badges.push(games >= 50
    ? { icon: '👑', text: 'افسانه‌ای', cls: 'badge-purple' }
    : { icon: '👑', text: '۵۰ بازی', cls: 'badge-purple', locked: true });

  return badges.map(b =>
    `<div class="badge ${b.cls}${b.locked ? ' locked' : ''}">${b.icon} ${b.text}</div>`
  ).join('');
}

  // Friends
  friendsSec.innerHTML = '<div class="section-title">👥 دوستان</div><div id="friendsList"></div><div id="friendRequests"></div>';
  showSkeleton(document.getElementById("friendsList"));
  loadFriends();
  loadFriendRequests();

  // Search
  searchSec.innerHTML = `
    <div class="section-title">🔍 جستجوی کاربران</div>
    <div class="search-bar">
      <input type="text" id="userSearchInput" placeholder="نام کاربری..." onkeydown="if(event.key==='Enter')searchUsersUI()">
      <button onclick="searchUsersUI()">جستجو</button>
    </div>
    <div class="search-results" id="searchResults"></div>
  `;
}

async function updateBio() {
  const bio = document.getElementById("editBio").value.trim();
  const r = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ bio }) });
  if (r.ok) { currentUser.bio = bio; showToast("✅ ذخیره شد"); }
}

async function loadFriends() {
  const r = await apiFetch("/api/friends");
  const el = document.getElementById("friendsList");
  if (!r.ok || !r.data.length) { showEmptyState(el, '👥', 'هنوز دوستی ندارید', 'از بخش جستجو دوستان خود را پیدا کنید'); return; }
  el.innerHTML = r.data.map(f => `
    <div class="friend-item">
      ${renderAvatar(f.username, '2.2rem')}
      <div class="friend-info">
        <div class="friend-name">${escapeHtml(f.username)}</div>
        <div class="friend-status ${f.online ? 'friend-online' : 'friend-offline'}">${f.online ? '● آنلاین' : '○ آفلاین'}</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-accept" onclick="startDMWithUser(${f.id},${JSON.stringify(f.username)},${JSON.stringify(f.avatar || '🎭')})">💬</button>
        <button class="friend-btn friend-btn-invite" onclick="inviteFriendToRoom(${f.id})">دعوت</button>
        <button class="friend-btn friend-btn-remove" onclick="removeFriendUI(${f.friendship_id})">حذف</button>
      </div>
    </div>`).join("");
}

async function loadFriendRequests() {
  const r = await apiFetch("/api/friends/requests");
  const el = document.getElementById("friendRequests");
  if (!r.ok || !r.data.length) { el.innerHTML = ""; return; }
  el.innerHTML = '<div class="section-title" style="margin-top:14px">📩 درخواست‌های دوستی</div>' +
    r.data.map(f => `
    <div class="friend-item">
      ${renderAvatar(f.username, '2.2rem')}
      <div class="friend-info"><div class="friend-name">${escapeHtml(f.username)}</div></div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-accept" onclick="acceptFriendUI(${f.friendship_id})">قبول</button>
        <button class="friend-btn friend-btn-reject" onclick="rejectFriendUI(${f.friendship_id})">رد</button>
      </div>
    </div>`).join("");
}

async function searchUsersUI() {
  const q = document.getElementById("userSearchInput").value.trim();
  if (q.length < 2) { showToast("⚠️ حداقل ۲ حرف وارد کنید"); return; }
  const r = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
  const el = document.getElementById("searchResults");
  if (!r.ok || !r.data.length) { el.innerHTML = '<div class="custom-empty">کاربری یافت نشد</div>'; return; }
  el.innerHTML = r.data.map(u => `
    <div class="search-result-item">
      ${renderAvatar(u.username, '2.2rem')}
      <div class="friend-info">
        <div class="friend-name">${escapeHtml(u.username)}</div>
        <div class="friend-status ${u.online ? 'friend-online' : 'friend-offline'}">${u.online ? '● آنلاین' : '○ آفلاین'}</div>
      </div>
      <button class="friend-btn friend-btn-invite" onclick="sendFriendRequestUI(${u.id})">درخواست دوستی</button>
    </div>`).join("");
}

async function sendFriendRequestUI(userId) {
  const r = await apiFetch("/api/friends/request", { method: "POST", body: JSON.stringify({ user_id: userId }) });
  if (r.ok) showToast("✅ درخواست ارسال شد");
  else showToast("⚠️ " + (r.data.error || "خطا"));
}

async function acceptFriendUI(fid) {
  await apiFetch(`/api/friends/${fid}/accept`, { method: "PUT" });
  showToast("✅ قبول شد");
  loadFriends(); loadFriendRequests();
}

async function rejectFriendUI(fid) {
  await apiFetch(`/api/friends/${fid}/reject`, { method: "PUT" });
  loadFriendRequests();
}

async function removeFriendUI(fid) {
  await apiFetch(`/api/friends/${fid}`, { method: "DELETE" });
  showToast("حذف شد");
  loadFriends();
}

function inviteFriendToRoom(userId) {
  if (!chaosState.roomCode) { showToast("⚠️ ابتدا اتاق بسازید"); return; }
  showToast("📋 کد اتاق: " + chaosState.roomCode);
}

// ── Leaderboard ──
async function loadLeaderboard(type = 'wins') {
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.lb-tab[onclick*="${type}"]`);
  if (activeTab) activeTab.classList.add('active');

  const list = document.getElementById('leaderboardList');
  showSkeleton(list, 5);

  const r = await apiFetch(`/api/leaderboard?type=${type}`);
  if (!r.ok || !r.data || !r.data.length) {
    showEmptyState(list, '🏆', 'هنوز رتبه‌بندی وجود نداره', 'بازی کنید تا در رتبه‌بندی قرار بگیرید');
    return;
  }

  list.innerHTML = r.data.map((u, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : toFarsiNum(i + 1);
    const isMe = currentUser && currentUser.id === u.id;
    const value = type === 'wins' ? (u.chaos_wins || 0) : (u.total_games || 0);
    const statLabel = type === 'wins' ? 'برد' : 'بازی';
    return `<div class="lb-item${isMe ? ' lb-me' : ''}">
      <div class="lb-rank ${rankClass}">${rankIcon}</div>
      ${renderAvatar(u.username, '2rem')}
      <div class="lb-info">
        <div class="lb-name">${escapeHtml(u.username)}${isMe ? ' (شما)' : ''}</div>
        <div class="lb-stat">${toFarsiNum(u.total_games || 0)} بازی · ${toFarsiNum(u.chaos_wins || 0)} برد</div>
      </div>
      <div class="lb-value">${toFarsiNum(value)}<div style="font-size:0.6rem;color:var(--dim)">${statLabel}</div></div>
    </div>`;
  }).join('');
}

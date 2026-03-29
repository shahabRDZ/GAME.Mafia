/* ── Profile & Social System ── */

async function renderProfileScreen() {
  const card = document.getElementById("profileCard");
  const friendsSec = document.getElementById("friendsSection");
  const searchSec = document.getElementById("searchSection");

  if (!currentUser) {
    card.innerHTML = '<div class="custom-empty">برای مشاهده پروفایل وارد شوید</div>';
    friendsSec.innerHTML = "";
    searchSec.innerHTML = "";
    return;
  }

  const u = currentUser;
  card.innerHTML = `
    <div class="profile-avatar-big">${u.avatar || '🎭'}</div>
    <div class="profile-username">${u.username}</div>
    <div class="profile-id">ID: ${u.id}</div>
    <div class="profile-bio">${u.bio || 'بیو ندارید'}</div>
    <div class="profile-stats">
      <div class="profile-stat wins"><span class="profile-stat-num">${toFarsiNum(u.chaos_wins || 0)}</span><span class="profile-stat-label">برد CHAOS</span></div>
      <div class="profile-stat losses"><span class="profile-stat-num">${toFarsiNum(u.chaos_losses || 0)}</span><span class="profile-stat-label">باخت CHAOS</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${toFarsiNum(u.total_games || 0)}</span><span class="profile-stat-label">بازی آفلاین</span></div>
    </div>
    <div class="profile-edit-row">
      <input type="text" id="editBio" placeholder="بیو..." value="${u.bio || ''}" maxlength="200" style="flex:1">
      <button class="chaos-btn secondary" onclick="updateBio()" style="padding:8px 16px;font-size:.8rem">ذخیره</button>
    </div>
  `;

  // Friends
  friendsSec.innerHTML = '<div class="section-title">👥 دوستان</div><div id="friendsList"><div class="custom-empty">در حال بارگذاری...</div></div><div id="friendRequests"></div>';
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
  if (!r.ok || !r.data.length) { el.innerHTML = '<div class="custom-empty">هنوز دوستی ندارید</div>'; return; }
  el.innerHTML = r.data.map(f => `
    <div class="friend-item">
      <span class="friend-avatar">${f.avatar || '🎭'}</span>
      <div class="friend-info">
        <div class="friend-name">${f.username}</div>
        <div class="friend-status ${f.online ? 'friend-online' : 'friend-offline'}">${f.online ? '● آنلاین' : '○ آفلاین'}</div>
      </div>
      <div class="friend-actions">
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
      <span class="friend-avatar">${f.avatar || '🎭'}</span>
      <div class="friend-info"><div class="friend-name">${f.username}</div></div>
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
      <span class="friend-avatar">${u.avatar || '🎭'}</span>
      <div class="friend-info">
        <div class="friend-name">${u.username}</div>
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

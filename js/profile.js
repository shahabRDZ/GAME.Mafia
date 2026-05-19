/* ── Profile & Social System ── */

let _profileTab = 'edit';

async function renderProfileScreen() {
  const card      = document.getElementById("profileCard");
  const friendsSec = document.getElementById("friendsSection");
  const searchSec  = document.getElementById("searchSection");
  friendsSec.innerHTML = "";
  searchSec.innerHTML  = "";

  if (!currentUser) {
    showEmptyStateCard('profileCard', '🎭', 'به شوشانگ خوش آمدید!',
      'وارد شوید تا پروفایل، دوستان و آمار بازی‌هاتون رو ببینید',
      'ورود / ثبت‌نام', "openAuthModal('login')");
    return;
  }

  const u = currentUser;
  const xp = u.xp || 0;
  const wr = _winRate(u);
  const levelInfo = _xpLevel(xp);
  const avatarContent = u.avatar_url
    ? `<img src="${u.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span style="font-size:2.6rem;line-height:1">${escapeHtml(u.avatar || '🎭')}</span>`;

  card.innerHTML = `
    <div class="pg-hero">
      <div class="pg-hero-bg"></div>
      <div class="pg-hero-content">
        <div class="pg-avatar-wrap" onclick="document.getElementById('avatarFileInput').click()" title="تغییر عکس پروفایل">
          <div class="pg-avatar">${avatarContent}</div>
          <div class="pg-avatar-edit">📷</div>
          <input type="file" id="avatarFileInput" accept="image/*" style="display:none" onchange="_onAvatarFile(event)">
        </div>
        <div class="pg-hero-info">
          <div class="pg-username">${escapeHtml(u.username)}</div>
          <div class="pg-level-badge" style="background:${levelInfo.bg};color:${levelInfo.color}">${levelInfo.icon} ${levelInfo.name}</div>
          <div class="pg-xp-row">
            <div class="pg-xp-bar"><div class="pg-xp-fill" style="width:${_xpPercent(xp)}%"></div></div>
            <span class="pg-xp-label">${toFarsiNum(xp)} XP</span>
          </div>
        </div>
      </div>
    </div>

    <div class="pg-stats-row">
      <div class="pg-stat-card wins">
        <div class="pg-stat-num">${toFarsiNum(u.chaos_wins || 0)}</div>
        <div class="pg-stat-label">🏆 برد</div>
      </div>
      <div class="pg-stat-card losses">
        <div class="pg-stat-num">${toFarsiNum(u.chaos_losses || 0)}</div>
        <div class="pg-stat-label">💀 باخت</div>
      </div>
      <div class="pg-stat-card">
        <div class="pg-stat-num">${toFarsiNum(u.total_games || 0)}</div>
        <div class="pg-stat-label">🎮 کل بازی</div>
      </div>
      <div class="pg-stat-card">
        <div class="pg-stat-num">${wr}٪</div>
        <div class="pg-stat-label">📈 نرخ برد</div>
      </div>
    </div>

    <div class="pg-badges-row">${_renderBadges(u)}</div>

    <div class="pg-tabs">
      <button class="pg-tab${_profileTab==='edit'?' active':''}" onclick="_switchProfileTab('edit')">✏️ ویرایش</button>
      <button class="pg-tab${_profileTab==='friends'?' active':''}" onclick="_switchProfileTab('friends')">👥 دوستان</button>
      <button class="pg-tab${_profileTab==='search'?' active':''}" onclick="_switchProfileTab('search')">🔍 جستجو</button>
    </div>

    <div id="pg-tab-content"></div>
  `;

  _renderTabContent(_profileTab, u);
}

function _switchProfileTab(tab) {
  _profileTab = tab;
  document.querySelectorAll('.pg-tab').forEach(b => b.classList.toggle('active', b.textContent.includes(
    tab==='edit'?'✏️': tab==='friends'?'👥':'🔍'
  )));
  _renderTabContent(tab, currentUser);
}

function _renderTabContent(tab, u) {
  const el = document.getElementById('pg-tab-content');
  if (!el) return;
  if (tab === 'edit') {
    el.innerHTML = `
      <div class="pg-section">
        <div class="pg-section-title">بیوگرافی</div>
        <textarea id="editBio" class="pg-textarea" placeholder="درباره خودت بنویس..." maxlength="200">${escapeHtml(u.bio || '')}</textarea>
        <div class="pg-char-count"><span id="bioCharCount">${toFarsiNum((u.bio||'').length)}</span>/۲۰۰</div>
        <button class="pg-btn primary" onclick="updateBio()">💾 ذخیره بیو</button>
      </div>

      <div class="pg-section">
        <div class="pg-section-title">آواتار</div>
        <div class="pg-emoji-grid">
          ${['🎭','😈','😇','🐺','👑','🎯','🛡️','⚕️','🕵️','🔮','🦹','🎪','🧙','🤡','👻','💀'].map(e =>
            `<button class="pg-emoji-opt${(u.avatar||'🎭')===e?' active':''}" onclick="changeAvatar('${e}')">${e}</button>`
          ).join('')}
        </div>
      </div>

      <div class="pg-section">
        <div class="pg-section-title">🔐 تغییر رمز عبور</div>
        <div class="pg-field">
          <label>رمز فعلی</label>
          <input type="password" id="pwCurrent" placeholder="رمز عبور فعلی" autocomplete="current-password">
        </div>
        <div class="pg-field">
          <label>رمز جدید</label>
          <input type="password" id="pwNew" placeholder="حداقل ۶ کاراکتر" autocomplete="new-password">
        </div>
        <div class="pg-field">
          <label>تکرار رمز جدید</label>
          <input type="password" id="pwConfirm" placeholder="رمز جدید را تکرار کنید" autocomplete="new-password">
        </div>
        <div id="pwError" class="pg-error"></div>
        <button class="pg-btn primary" onclick="changePassword()">🔐 تغییر رمز</button>
      </div>

      <div class="pg-section pg-danger-section">
        <div class="pg-meta">
          <span>📅 عضویت: ${u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '—'}</span>
          <span>🆔 شناسه: ${toFarsiNum(u.id)}</span>
        </div>
      </div>
    `;
    const ta = document.getElementById('editBio');
    if (ta) ta.addEventListener('input', () => {
      const c = document.getElementById('bioCharCount');
      if (c) c.textContent = toFarsiNum(ta.value.length);
    });
  } else if (tab === 'friends') {
    el.innerHTML = `
      <div id="friendRequests"></div>
      <div class="pg-section-title" style="padding:0 1rem">👥 دوستان</div>
      <div id="friendsList"></div>
    `;
    showSkeletonLoading('friendsList', 3);
    loadFriends();
    loadFriendRequests();
  } else {
    el.innerHTML = `
      <div class="pg-search-bar">
        <input type="text" id="userSearchInput" placeholder="جستجوی نام کاربری..."
               onkeydown="if(event.key==='Enter')searchUsersUI()">
        <button onclick="searchUsersUI()">جستجو</button>
      </div>
      <div id="searchResults"></div>
    `;
  }
}

/* ── Avatar File Upload ── */
async function _onAvatarFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast("⚠️ عکس باید کمتر از ۵MB باشد"); return; }

  const dataUrl = await _resizeImage(file, 256, 256);
  const el = document.querySelector('.pg-avatar');
  if (el) el.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;

  const r = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ avatar_url: dataUrl }) });
  if (r.ok) {
    currentUser.avatar_url = dataUrl;
    renderAuthBar();
    showToast("✅ عکس پروفایل ذخیره شد");
  } else {
    showToast("⚠️ " + (r.data?.error || "خطا در آپلود"));
  }
  e.target.value = "";
}

function _resizeImage(file, maxW, maxH) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ── Avatar Emoji ── */
async function changeAvatar(emoji) {
  const r = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ avatar: emoji }) });
  if (r.ok) {
    currentUser.avatar = emoji;
    currentUser.avatar_emoji = emoji;
    document.querySelectorAll('.pg-emoji-opt').forEach(b => b.classList.toggle('active', b.textContent === emoji));
    renderAuthBar();
    showToast("✅ آواتار تغییر کرد");
  }
}

/* ── Bio ── */
async function updateBio() {
  const ta = document.getElementById("editBio");
  const bio = ta ? ta.value.trim() : "";
  if (bio.length > 200) { showToast("⚠️ بیو نباید بیشتر از ۲۰۰ کاراکتر باشد"); return; }
  const r = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ bio }) });
  if (r.ok) { currentUser.bio = bio; showToast("✅ بیو ذخیره شد"); }
  else showToast("⚠️ " + (r.data?.error || "خطا"));
}

/* ── Change Password ── */
async function changePassword() {
  const cur  = document.getElementById("pwCurrent")?.value || "";
  const nw   = document.getElementById("pwNew")?.value || "";
  const conf = document.getElementById("pwConfirm")?.value || "";
  const errEl = document.getElementById("pwError");
  if (errEl) errEl.textContent = "";

  if (!cur || !nw || !conf) { if (errEl) errEl.textContent = "همه فیلدها را پر کنید"; return; }
  if (nw.length < 6)         { if (errEl) errEl.textContent = "رمز جدید باید حداقل ۶ کاراکتر باشد"; return; }
  if (nw !== conf)            { if (errEl) errEl.textContent = "رمز جدید و تکرار آن یکسان نیستند"; return; }

  const btn = document.querySelector('.pg-section .pg-btn[onclick="changePassword()"]');
  if (btn) { btn.disabled = true; btn.textContent = "..."; }

  const r = await apiFetch("/api/auth/change-password", {
    method: "POST", body: JSON.stringify({ current_password: cur, new_password: nw })
  });

  if (btn) { btn.disabled = false; btn.textContent = "🔐 تغییر رمز"; }

  if (r.ok) {
    showToast("✅ رمز عبور تغییر کرد");
    ["pwCurrent","pwNew","pwConfirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  } else {
    if (errEl) errEl.textContent = r.data?.error || "خطا رخ داد";
  }
}

/* ── Helpers ── */
function _winRate(u) {
  const t = (u.chaos_wins || 0) + (u.chaos_losses || 0);
  return t === 0 ? toFarsiNum(0) : toFarsiNum(Math.round((u.chaos_wins / t) * 100));
}

function _xpLevel(xp) {
  if (xp >= 500) return { name: 'افسانه‌ای', icon: '👑', bg: 'rgba(192,132,252,.2)', color: '#c084fc' };
  if (xp >= 250) return { name: 'حرفه‌ای',   icon: '⭐', bg: 'rgba(245,166,35,.18)', color: '#f5a623' };
  if (xp >= 100) return { name: 'باتجربه',    icon: '🎯', bg: 'rgba(96,165,250,.18)', color: '#60a5fa' };
  if (xp >= 30)  return { name: 'بازیکن',     icon: '🎮', bg: 'rgba(74,222,128,.15)', color: '#4ade80' };
  return           { name: 'تازه‌کار',         icon: '🌱', bg: 'rgba(255,255,255,.08)', color: '#aaa' };
}

function _xpPercent(xp) {
  const levels = [0, 30, 100, 250, 500];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) {
      const next = levels[i + 1] || levels[i] * 2;
      return Math.min(100, ((xp - levels[i]) / (next - levels[i])) * 100);
    }
  }
  return 0;
}

function _renderBadges(u) {
  const wins = u.chaos_wins || 0, games = u.total_games || 0;
  const all = [
    { icon:'🎮', text:'اولین بازی',    cls:'badge-green',  ok: games >= 1  },
    { icon:'🏆', text:'اولین برد',     cls:'badge-blue',   ok: wins  >= 1  },
    { icon:'🔥', text:'فاتح (۵ برد)', cls:'badge-red',    ok: wins  >= 5  },
    { icon:'⭐', text:'۱۰ بازی',       cls:'badge-gold',   ok: games >= 10 },
    { icon:'👑', text:'افسانه‌ای',      cls:'badge-purple', ok: games >= 50 },
  ];
  return all.map(b =>
    `<div class="badge ${b.cls}${b.ok ? '' : ' locked'}">${b.icon} ${b.text}</div>`
  ).join('');
}

/* ── Friends ── */
async function loadFriends() {
  const r = await apiFetch("/api/friends");
  const el = document.getElementById("friendsList");
  if (!el) return;
  if (!r.ok || !r.data.length) {
    showEmptyStateCard('friendsList', '👥', 'هنوز دوستی ندارید', 'از جستجو دوستان خود را پیدا کنید', null, null);
    return;
  }
  el.innerHTML = r.data.map(f => `
    <div class="pg-friend-item">
      ${renderAvatar(f.username, '2.4rem')}
      <div class="pg-friend-info">
        <div class="pg-friend-name">${escapeHtml(f.username)}</div>
        <div class="pg-friend-status ${f.online ? 'online' : ''}">${f.online ? '● آنلاین' : '○ آفلاین'}</div>
      </div>
      <div class="pg-friend-actions">
        <button class="pg-icon-btn" title="پیام"
          data-uid="${f.id}" data-name="${escapeHtml(f.username)}" data-av="${escapeHtml(f.avatar||'🎭')}"
          onclick="startDMWithUser(+this.dataset.uid, this.dataset.name, this.dataset.av)">💬</button>
        <button class="pg-icon-btn danger" title="حذف" onclick="removeFriendUI(${f.friendship_id})">✕</button>
      </div>
    </div>`).join('');
}

async function loadFriendRequests() {
  const r = await apiFetch("/api/friends/requests");
  const el = document.getElementById("friendRequests");
  if (!el || !r.ok || !r.data.length) { if (el) el.innerHTML = ""; return; }
  el.innerHTML = `<div class="pg-section-title" style="padding:1rem 1rem 0">📩 درخواست‌های دوستی</div>` +
    r.data.map(f => `
    <div class="pg-friend-item">
      ${renderAvatar(f.username, '2.4rem')}
      <div class="pg-friend-info"><div class="pg-friend-name">${escapeHtml(f.username)}</div></div>
      <div class="pg-friend-actions">
        <button class="pg-icon-btn accept" onclick="acceptFriendUI(${f.friendship_id})">✓</button>
        <button class="pg-icon-btn danger" onclick="rejectFriendUI(${f.friendship_id})">✕</button>
      </div>
    </div>`).join('');
}

async function searchUsersUI() {
  const q = document.getElementById("userSearchInput")?.value.trim() || "";
  if (q.length < 2) { showToast("⚠️ حداقل ۲ حرف وارد کنید"); return; }
  showSkeletonLoading('searchResults', 3);
  const r = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
  const el = document.getElementById("searchResults");
  if (!el) return;
  if (!r.ok) { showErrorState('searchResults', 'خطا در جستجو', 'searchUsersUI()'); return; }
  if (!r.data.length) { showEmptyStateCard('searchResults', '🔍', 'کاربری یافت نشد', 'با نام دیگری جستجو کنید', null, null); return; }
  el.innerHTML = r.data.map(u => `
    <div class="pg-friend-item">
      ${renderAvatar(u.username, '2.4rem')}
      <div class="pg-friend-info">
        <div class="pg-friend-name">${escapeHtml(u.username)}</div>
        <div class="pg-friend-status ${u.online?'online':''}">${u.online?'● آنلاین':'○ آفلاین'}</div>
      </div>
      <button class="pg-btn small" onclick="sendFriendRequestUI(${u.id})">درخواست دوستی</button>
    </div>`).join('');
}

async function sendFriendRequestUI(userId) {
  const r = await apiFetch("/api/friends/request", { method: "POST", body: JSON.stringify({ user_id: userId }) });
  showToast(r.ok ? "✅ درخواست ارسال شد" : "⚠️ " + (r.data?.error || "خطا"));
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

/* ── Leaderboard ── */
async function loadLeaderboard(type = 'wins') {
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.lb-tab[onclick*="${type}"]`);
  if (activeTab) activeTab.classList.add('active');

  const list = document.getElementById('leaderboardList');
  showSkeletonLoading('leaderboardList', 5);

  const r = await apiFetch(`/api/leaderboard?type=${type}`);
  if (!r.ok) { showErrorState('leaderboardList', 'خطا در بارگذاری رتبه‌بندی', `loadLeaderboard('${type}')`); return; }
  if (!r.data || !r.data.length) {
    showEmptyStateCard('leaderboardList', '🏆', 'هنوز رتبه‌بندی وجود نداره', 'بازی کنید تا در رتبه‌بندی قرار بگیرید', null, null);
    return;
  }

  list.innerHTML = r.data.map((u, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon  = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : toFarsiNum(i + 1);
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
      <div class="lb-value">${toFarsiNum(value)}<div style="font-size:.6rem;color:var(--dim)">${statLabel}</div></div>
    </div>`;
  }).join('');
}

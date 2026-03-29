/* ── Admin Panel ── */

async function renderAdminScreen() {
  const container = document.getElementById("adminContent");
  if (!currentUser) { container.innerHTML = '<div class="custom-empty">وارد شوید</div>'; return; }

  container.innerHTML = '<div class="custom-empty">در حال بارگذاری...</div>';

  // Load stats
  const stats = await apiFetch("/api/admin/stats");
  if (!stats.ok) { container.innerHTML = '<div class="custom-empty">⛔ دسترسی ندارید</div>'; return; }

  // Load users
  const users = await apiFetch("/api/admin/users");

  container.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_users)}</span><span class="admin-stat-label">کاربران</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.online_now)}</span><span class="admin-stat-label">آنلاین</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_visits)}</span><span class="admin-stat-label">بازدید</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_games)}</span><span class="admin-stat-label">بازی آفلاین</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_chaos_rooms)}</span><span class="admin-stat-label">اتاق کی‌اس</span></div>
    </div>

    <div class="section-title" style="margin-top:18px">👥 لیست کاربران (${toFarsiNum(users.data?.length || 0)})</div>
    <div class="admin-users-list" id="adminUsersList">
      ${(users.data || []).map(u => `
        <div class="admin-user-item">
          <span class="admin-user-avatar">${u.avatar || '🎭'}</span>
          <div class="admin-user-info">
            <div class="admin-user-name">${u.username} <span style="font-size:.65rem;color:var(--dim)">#${u.id}</span></div>
            <div class="admin-user-email">${u.email}</div>
            <div class="admin-user-meta">
              ثبت‌نام: ${u.created_at} · بازی: ${toFarsiNum(u.total_games)} · کی‌اس: ${toFarsiNum(u.chaos_wins)}W/${toFarsiNum(u.chaos_losses)}L
              ${u.online ? ' · <span style="color:#44ff99">● آنلاین</span>' : ''}
            </div>
          </div>
          <div class="admin-user-actions">
            <button class="friend-btn friend-btn-reject" onclick="adminResetPw(${u.id})">ریست رمز</button>
            <button class="friend-btn friend-btn-remove" onclick="adminDeleteUser(${u.id},'${u.username}')">حذف</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function adminDeleteUser(uid, username) {
  if (!confirm(`کاربر "${username}" حذف شود؟`)) return;
  const r = await apiFetch(`/api/admin/users/${uid}`, { method: "DELETE" });
  if (r.ok) { showToast("✅ حذف شد"); renderAdminScreen(); }
  else showToast("⚠️ " + (r.data.error || "خطا"));
}

async function adminResetPw(uid) {
  const pw = prompt("رمز جدید:", "123456");
  if (!pw) return;
  const r = await apiFetch(`/api/admin/users/${uid}/reset-password`, { method: "PUT", body: JSON.stringify({ password: pw }) });
  if (r.ok) showToast("✅ رمز تغییر کرد");
  else showToast("⚠️ " + (r.data.error || "خطا"));
}

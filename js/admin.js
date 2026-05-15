/* ── Admin Panel ── */

async function renderAdminScreen() {
  const container = document.getElementById("adminContent");
  if (!currentUser) { container.innerHTML = '<div class="custom-empty">وارد شوید</div>'; return; }

  container.innerHTML = '<div class="custom-empty">در حال بارگذاری...</div>';

  const stats = await apiFetch("/api/admin/stats");
  if (!stats.ok) { container.innerHTML = '<div class="custom-empty">⛔ دسترسی ندارید</div>'; return; }

  const users = await apiFetch("/api/admin/users");

  container.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_users)}</span><span class="admin-stat-label">کاربران</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.online_now)}</span><span class="admin-stat-label">آنلاین</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_visits)}</span><span class="admin-stat-label">بازدید</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_games)}</span><span class="admin-stat-label">بازی آفلاین</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${toFarsiNum(stats.data.total_chaos_rooms)}</span><span class="admin-stat-label">اتاق کی‌اس</span></div>
    </div>

    <div style="display:flex;gap:8px;margin:16px 0 4px">
      <button class="lb-tab active" id="adminTabUsers" onclick="adminShowTab('users')">👥 کاربران</button>
      <button class="lb-tab" id="adminTabGames" onclick="adminShowTab('games')">🎮 بازی‌ها</button>
    </div>

    <div id="adminPanelUsers">
      <div class="admin-users-list">
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
    </div>

    <div id="adminPanelGames" style="display:none">
      <div class="custom-empty">در حال بارگذاری...</div>
    </div>
  `;
}

function adminShowTab(tab) {
  document.getElementById("adminPanelUsers").style.display = tab === "users" ? "" : "none";
  document.getElementById("adminPanelGames").style.display = tab === "games" ? "" : "none";
  document.getElementById("adminTabUsers").classList.toggle("active", tab === "users");
  document.getElementById("adminTabGames").classList.toggle("active", tab === "games");
  if (tab === "games") adminLoadGames(1);
}

async function adminLoadGames(page = 1) {
  const container = document.getElementById("adminPanelGames");
  container.innerHTML = '<div class="custom-empty">در حال بارگذاری...</div>';
  const r = await apiFetch(`/api/admin/games?page=${page}`);
  if (!r.ok) { container.innerHTML = '<div class="custom-empty">خطا در بارگذاری</div>'; return; }
  const { games, total } = r.data;
  container.innerHTML = `
    <div style="font-size:.75rem;color:var(--dim);padding:8px 4px">
      مجموع: ${toFarsiNum(total)} بازی
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.8rem">
        <thead>
          <tr style="color:var(--dim);border-bottom:1px solid rgba(255,255,255,.07)">
            <th style="padding:8px 6px;text-align:right">#</th>
            <th style="padding:8px 6px;text-align:right">کاربر</th>
            <th style="padding:8px 6px;text-align:right">سناریو</th>
            <th style="padding:8px 6px;text-align:center">بازیکنان</th>
            <th style="padding:8px 6px;text-align:center">مافیا</th>
            <th style="padding:8px 6px;text-align:right">تاریخ</th>
          </tr>
        </thead>
        <tbody>
          ${games.map(g => `
            <tr style="border-bottom:1px solid rgba(255,255,255,.04)">
              <td style="padding:7px 6px;color:var(--dim)">${toFarsiNum(g.id)}</td>
              <td style="padding:7px 6px;font-weight:700">${g.username}</td>
              <td style="padding:7px 6px">${g.group}</td>
              <td style="padding:7px 6px;text-align:center">${toFarsiNum(g.count)}</td>
              <td style="padding:7px 6px;text-align:center;color:#e94560">${toFarsiNum(g.mafia)}</td>
              <td style="padding:7px 6px;color:var(--dim);font-size:.72rem">${g.date}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
      ${page > 1 ? `<button class="lb-tab" onclick="adminLoadGames(${page-1})">← قبلی</button>` : ""}
      ${games.length === 50 ? `<button class="lb-tab" onclick="adminLoadGames(${page+1})">بعدی →</button>` : ""}
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

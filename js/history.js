/* ── Game History Management ── */

async function saveGame() {
  if (!authToken) {
    const h = getLocalHistory();
    h.unshift({
      group: state.group, count: state.count,
      mafia: state.mafiaCount, citizen: state.citizenCount,
      date: new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    });
    localStorage.setItem("mafiaHistory", JSON.stringify(h.slice(0, 30)));
    return;
  }
  const r = await apiFetch("/api/games", {
    method: "POST",
    body: JSON.stringify({ group: state.group, count: state.count, mafia: state.mafiaCount, citizen: state.citizenCount })
  });
  if (r.ok && currentUser) {
    currentUser.total_games = (currentUser.total_games || 0) + 1;
    document.getElementById("gamesCountDisplay").textContent = toFarsiNum(currentUser.total_games) + " بازی ثبت‌شده";
  }
}

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem("mafiaHistory")) || []; }
  catch { return []; }
}

async function renderHistory() {
  const list = document.getElementById("historyList");

  if (authToken) {
    showSkeletonLoading('historyList', 4);
    const r = await apiFetch("/api/games");
    if (!r.ok) {
      showErrorState('historyList', 'خطا در بارگذاری تاریخچه', 'renderHistory()');
      return;
    }
    if (!r.data.length) {
      showEmptyStateCard('historyList', '📭', 'هنوز بازی‌ای ثبت نشده', 'بازی کنید تا تاریخچه ثبت شود', null, null);
      return;
    }
    list.innerHTML = r.data.map(h => `
      <div class="history-item gc">
        <div class="history-meta"><div class="history-group">${escapeHtml(h.group)}</div><div class="history-date">${escapeHtml(h.date)}</div></div>
        <div class="history-counts">
          <div class="h-count total"><span class="n">${toFarsiNum(h.count)}</span><span class="l">نفر</span></div>
          <div class="h-count mafia"><span class="n">${toFarsiNum(h.mafia)}</span><span class="l">مافیا</span></div>
          <div class="h-count citizen"><span class="n">${toFarsiNum(h.citizen)}</span><span class="l">شهروند</span></div>
        </div>
      </div>`).join("");
    return;
  }

  const history = getLocalHistory();
  if (!history.length) {
    showEmptyStateCard('historyList', '📭', 'هنوز بازی‌ای ثبت نشده', 'بازی کنید تا تاریخچه ثبت شود', null, null);
    return;
  }
  list.innerHTML = history.map(h => `
    <div class="history-item gc">
      <div class="history-meta"><div class="history-group">${escapeHtml(h.group)}</div><div class="history-date">${escapeHtml(h.date)}</div></div>
      <div class="history-counts">
        <div class="h-count total"><span class="n">${toFarsiNum(h.count)}</span><span class="l">نفر</span></div>
        <div class="h-count mafia"><span class="n">${toFarsiNum(h.mafia)}</span><span class="l">مافیا</span></div>
        <div class="h-count citizen"><span class="n">${toFarsiNum(h.citizen)}</span><span class="l">شهروند</span></div>
      </div>
    </div>`).join("");
}

async function clearHistory() {
  if (!confirm(t("clearConfirm"))) return;
  if (authToken) {
    // Keep last 10 games for logged-in users
    const r = await apiFetch("/api/games", { method: "DELETE", body: JSON.stringify({ keep_last: 10 }) });
    if (currentUser && r.ok) {
      currentUser.total_games = r.data.remaining || 0;
      document.getElementById("gamesCountDisplay").textContent = toFarsiNum(currentUser.total_games) + " بازی ثبت‌شده";
    }
    showToast("🗑️ تاریخچه پاک شد (۱۰ بازی اخیر حفظ شد)");
  } else {
    localStorage.removeItem("mafiaHistory");
    showToast("🗑️ تاریخچه پاک شد");
  }
  renderHistory();
}

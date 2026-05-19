/* ── Direct Messages — real-time via Socket.IO, no polling ── */

let dmOpenUserId = null;

function renderDMScreen() {
  if (!authToken || !currentUser) {
    const el = document.getElementById("dmConvoList");
    if (el) el.innerHTML = '<div class="custom-empty" style="padding:40px 20px;text-align:center">ابتدا وارد شوید</div>';
    return;
  }
  _showConvoList();
  loadConversations();
}

function _showConvoList() {
  const convoList = document.getElementById("dmConvoList");
  const chatView  = document.getElementById("dmChatView");
  if (convoList) convoList.style.display = "flex";
  if (chatView)  chatView.style.display  = "none";
}

function _showChatView() {
  const convoList = document.getElementById("dmConvoList");
  const chatView  = document.getElementById("dmChatView");
  if (convoList) convoList.style.display = "none";
  if (chatView)  chatView.style.display  = "flex";
}

async function loadConversations() {
  const el = document.getElementById("dmConvoList");
  if (!el) return;
  showSkeletonLoading("dmConvoList", 4);
  const r = await apiFetch("/api/dm/conversations");
  if (!r.ok) {
    showErrorState("dmConvoList", "خطا در بارگذاری پیام‌ها", "loadConversations()");
    return;
  }
  if (!r.data.length) {
    showEmptyStateCard("dmConvoList", "💬", "پیامی ندارید", "با دوستانتان گفتگو کنید", null, null);
    return;
  }
  el.innerHTML = r.data.map(c => `
    <div class="dm-convo-item"
      data-uid="${c.user_id}"
      data-name="${escapeHtml(c.username)}"
      data-av="${escapeHtml(c.avatar || '🎭')}"
      onclick="openDMChat(+this.dataset.uid, this.dataset.name, this.dataset.av)">
      ${renderAvatar(c.username, "2.5rem")}
      <div class="dm-convo-info">
        <div class="dm-convo-name">${escapeHtml(c.username)} ${c.online ? '<span class="friend-online">●</span>' : ""}</div>
        <div class="dm-convo-last">${escapeHtml(c.last_message)}</div>
      </div>
      <div class="dm-convo-meta">
        <div class="dm-convo-time">${c.last_time}</div>
        ${c.unseen > 0 ? `<div class="dm-badge">${c.unseen}</div>` : ""}
      </div>
    </div>
  `).join("");
}

async function openDMChat(userId, username, avatar) {
  if (!authToken) { openAuthModal("login"); return; }

  dmOpenUserId = userId;
  _showChatView();

  const chatView = document.getElementById("dmChatView");
  if (!chatView) return;

  chatView.innerHTML = `
    <div class="dm-chat-header">
      <button class="dm-back-btn" onclick="closeDMChat()">◀</button>
      ${renderAvatar(username, "2rem")}
      <span class="dm-chat-name">${escapeHtml(username)}</span>
    </div>
    <div class="dm-messages" id="dmMessages"></div>
    <div class="chat-input-bar">
      <input type="text" id="dmInput" placeholder="پیام..." maxlength="1000"
        onkeydown="if(event.key==='Enter')sendDM()">
      <button onclick="sendDM()">ارسال</button>
    </div>
  `;

  showSkeletonLoading("dmMessages", 3);
  const r = await apiFetch(`/api/dm/${userId}`);
  const msgs = document.getElementById("dmMessages");
  if (!r.ok) {
    if (msgs) showErrorState("dmMessages", "خطا در بارگذاری پیام‌ها", `openDMChat(${userId},'${escapeHtml(username)}','🎭')`);
    return;
  }
  if (!msgs) return;
  if (r.data.length) {
    msgs.innerHTML = r.data.map(m => _renderMsg(m)).join("");
    msgs.scrollTop = msgs.scrollHeight;
  } else {
    msgs.innerHTML = '<div class="custom-empty" style="padding:30px">اولین پیام را بفرستید 💬</div>';
  }

  document.getElementById("dmInput")?.focus();
}

function _renderMsg(m) {
  return `<div class="dm-msg ${m.is_me ? "dm-msg-me" : "dm-msg-other"}">
    <div class="dm-msg-text">${escapeHtml(m.content)}</div>
    <div class="dm-msg-time">${m.time}</div>
  </div>`;
}

/* Called from socket.js dm_received event */
function onDMReceived(data) {
  if (dmOpenUserId === data.from_user_id) {
    const msgs = document.getElementById("dmMessages");
    if (msgs) {
      const empty = msgs.querySelector(".custom-empty");
      if (empty) empty.remove();
      msgs.innerHTML += `
        <div class="dm-msg dm-msg-other">
          <div class="dm-msg-text">${escapeHtml(data.content)}</div>
          <div class="dm-msg-time">${data.time}</div>
        </div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }
  } else {
    showDMNotification(data);
    updateDmBadge();
    // Refresh conversation list if it is visible
    const convoList = document.getElementById("dmConvoList");
    if (convoList && convoList.style.display !== "none") {
      loadConversations();
    }
  }
}

function closeDMChat() {
  dmOpenUserId = null;
  _showConvoList();
  loadConversations();
}

async function sendDM() {
  const input = document.getElementById("dmInput");
  const text = input?.value.trim();
  if (!text || !dmOpenUserId) return;
  input.value = "";
  const r = await apiFetch(`/api/dm/${dmOpenUserId}`, { method: "POST", body: JSON.stringify({ content: text }) });
  if (r.ok) {
    const msgs = document.getElementById("dmMessages");
    if (!msgs) return;
    const empty = msgs.querySelector(".custom-empty");
    if (empty) empty.remove();
    msgs.innerHTML += `
      <div class="dm-msg dm-msg-me">
        <div class="dm-msg-text">${escapeHtml(text)}</div>
        <div class="dm-msg-time">${r.data.time}</div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }
  input?.focus();
}

function startDMWithUser(userId, username, avatar) {
  if (!authToken) { openAuthModal("login"); return; }
  showScreen("dm");
  openDMChat(userId, username, avatar || "🎭");
}

function showDMNotification(data) {
  const old = document.getElementById("dmNotification");
  if (old) old.remove();

  const notif = document.createElement("div");
  notif.id = "dmNotification";
  notif.className = "dm-notification";

  notif.innerHTML = `
    <div class="dm-notif-content"
      data-uid="${data.from_user_id}"
      data-name="${escapeHtml(data.from_username)}"
      onclick="document.getElementById('dmNotification')?.remove();startDMWithUser(+this.dataset.uid, this.dataset.name, '🎭')">
      <span class="dm-notif-avatar">💬</span>
      <div class="dm-notif-body">
        <div class="dm-notif-name">${escapeHtml(data.from_username)}</div>
        <div class="dm-notif-preview">${escapeHtml(data.content)}</div>
      </div>
      <button class="dm-notif-close" onclick="event.stopPropagation();this.closest('.dm-notification').remove()">✕</button>
    </div>
  `;

  document.body.appendChild(notif);
  setTimeout(() => { if (notif.parentNode) notif.remove(); }, 8000);
}

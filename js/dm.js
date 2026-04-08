/* ── Direct Messages ── */

let dmOpenUserId = null;
let dmPollInterval = null;

function renderDMScreen() {
  const container = document.getElementById("dmContent");
  if (!currentUser) { container.innerHTML = '<div class="custom-empty">وارد شوید</div>'; return; }
  container.innerHTML = `
    <div id="dmConvoList"></div>
    <div id="dmChatView" style="display:none"></div>
  `;
  loadConversations();
}

async function loadConversations() {
  const r = await apiFetch("/api/dm/conversations");
  const el = document.getElementById("dmConvoList");
  if (!el) return;
  if (!r.ok || !r.data.length) {
    showEmptyState(el, '💬', 'هنوز پیامی ندارید', 'از بخش پروفایل با دوستانتان چت کنید', 'رفتن به پروفایل', "showScreen('profile')");
    return;
  }
  el.innerHTML = r.data.map(c => `
    <div class="dm-convo-item" onclick="openDMChat(${c.user_id},${JSON.stringify(c.username)},${JSON.stringify(c.avatar || '🎭')})">
      ${renderAvatar(c.username, '2.5rem')}
      <div class="dm-convo-info">
        <div class="dm-convo-name">${escapeHtml(c.username)} ${c.online ? '<span class="friend-online">●</span>' : ''}</div>
        <div class="dm-convo-last">${escapeHtml(c.last_message)}</div>
      </div>
      <div class="dm-convo-meta">
        <div class="dm-convo-time">${c.last_time}</div>
        ${c.unseen > 0 ? `<div class="dm-badge">${c.unseen}</div>` : ''}
      </div>
    </div>
  `).join("");
}

async function openDMChat(userId, username, avatar) {
  dmOpenUserId = userId;
  const convoList = document.getElementById("dmConvoList");
  const chatView = document.getElementById("dmChatView");
  if (convoList) convoList.style.display = "none";
  if (chatView) chatView.style.display = "flex";

  chatView.innerHTML = `
    <div class="dm-chat-header">
      <button class="dm-back-btn" onclick="closeDMChat()">◀</button>
      ${renderAvatar(username, '2rem')}
      <span class="dm-chat-name">${escapeHtml(username)}</span>
    </div>
    <div class="dm-messages" id="dmMessages"><div class="custom-empty">در حال بارگذاری...</div></div>
    <div class="chat-input-bar">
      <input type="text" id="dmInput" placeholder="پیام..." maxlength="1000"
        onkeydown="if(event.key==='Enter')sendDM()">
      <button onclick="sendDM()">ارسال</button>
    </div>
  `;

  const r = await apiFetch(`/api/dm/${userId}`);
  const msgs = document.getElementById("dmMessages");
  if (r.ok && r.data.length) {
    msgs.innerHTML = r.data.map(m => `
      <div class="dm-msg ${m.is_me ? 'dm-msg-me' : 'dm-msg-other'}">
        <div class="dm-msg-text">${escapeHtml(m.content)}</div>
        <div class="dm-msg-time">${m.time}</div>
      </div>
    `).join("");
    msgs.scrollTop = msgs.scrollHeight;
  } else {
    msgs.innerHTML = '<div class="custom-empty" style="padding:30px">اولین پیام را بفرستید 💬</div>';
  }

  document.getElementById("dmInput")?.focus();

  // Poll for new messages
  if (dmPollInterval) clearInterval(dmPollInterval);
  dmPollInterval = setInterval(() => refreshDMMessages(userId), 3000);
}

async function refreshDMMessages(userId) {
  if (dmOpenUserId !== userId) return;
  const r = await apiFetch(`/api/dm/${userId}`);
  const msgs = document.getElementById("dmMessages");
  if (!r.ok || !msgs) return;
  const wasAtBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 50;
  if (r.data.length) {
    msgs.innerHTML = r.data.map(m => `
      <div class="dm-msg ${m.is_me ? 'dm-msg-me' : 'dm-msg-other'}">
        <div class="dm-msg-text">${escapeHtml(m.content)}</div>
        <div class="dm-msg-time">${m.time}</div>
      </div>
    `).join("");
    if (wasAtBottom) msgs.scrollTop = msgs.scrollHeight;
  }
}

function closeDMChat() {
  dmOpenUserId = null;
  if (dmPollInterval) { clearInterval(dmPollInterval); dmPollInterval = null; }
  const convoList = document.getElementById("dmConvoList");
  const chatView = document.getElementById("dmChatView");
  if (convoList) convoList.style.display = "block";
  if (chatView) chatView.style.display = "none";
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
    const empty = msgs.querySelector(".custom-empty");
    if (empty) empty.remove();
    msgs.innerHTML += `
      <div class="dm-msg dm-msg-me">
        <div class="dm-msg-text">${escapeHtml(text)}</div>
        <div class="dm-msg-time">${r.data.time}</div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }
  input.focus();
}

function startDMWithUser(userId, username, avatar) {
  showScreen("dm");
  setTimeout(() => openDMChat(userId, username, avatar || '🎭'), 100);
}

// escapeHtml is defined in helpers.js

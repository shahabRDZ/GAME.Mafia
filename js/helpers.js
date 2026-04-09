/* ── Helper Functions ── */

function toFarsiNum(n) {
  if (currentLang !== "fa") return String(n);
  return String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function spawnParticle(e, icon) {
  if (!e || !e.clientX) return;
  const p = document.createElement("div");
  p.className = "particle";
  p.textContent = icon;
  p.style.left = e.clientX + "px";
  p.style.top = e.clientY + "px";
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// ── Colorful Avatar System ──
const AVATAR_COLORS = [
  ['#e94560','#c0392b'], ['#f5a623','#e67e22'], ['#4ade80','#22c55e'],
  ['#00cfff','#0ea5e9'], ['#c084fc','#9333ea'], ['#fb7185','#e11d48'],
  ['#fbbf24','#d97706'], ['#34d399','#059669'], ['#60a5fa','#3b82f6'],
  ['#a78bfa','#7c3aed']
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function renderAvatar(name, size = '2.25rem') {
  const initial = (name || '?').charAt(0).toUpperCase();
  const [c1, c2] = getAvatarColor(name);
  return `<div class="user-avatar" style="width:${size};height:${size};background:linear-gradient(135deg,${c1},${c2})">${initial}</div>`;
}

// ── Skeleton Loader ──
function showSkeleton(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array.from({length: count}, () =>
    `<div class="skeleton-row">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    </div>`
  ).join('');
}

// ── Loading State ──
function showLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'flex';
}
function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

// ── Button Loading State ──
function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('btn-loading', loading);
}

// ── Empty State with CTA ──
function showEmptyState(container, icon, title, desc, ctaText, ctaAction) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-desc">${desc}</div>
      ${ctaText ? `<button class="empty-state-cta" onclick="${ctaAction}">${ctaText}</button>` : ''}
    </div>`;
}

// ── Game Rules ──
function showRulesTab(tab, btn) {
  if (btn) {
    document.querySelectorAll('.rules-tabs .lb-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }
  const el = document.getElementById('rulesContent');
  const rules = {
    overview: `
      <div class="rule-block"><h3>🎭 بازی مافیا چیست؟</h3><p>مافیا یک بازی گروهی است که بازیکنان به دو تیم اصلی تقسیم می‌شوند: <strong style="color:#ff5555">مافیا</strong> و <strong style="color:#4ade80">شهروند</strong>. هدف مافیا حذف شهروندان و هدف شهروندان شناسایی و حذف مافیاست.</p></div>
      <div class="rule-block"><h3>🌅 روند بازی</h3>
        <div class="rule-step"><span class="rule-num">۱</span> <strong>روز:</strong> بازیکنان بحث می‌کنند و به یک نفر رأی می‌دهند</div>
        <div class="rule-step"><span class="rule-num">۲</span> <strong>دفاع:</strong> متهم ۳۰ ثانیه دفاع می‌کند</div>
        <div class="rule-step"><span class="rule-num">۳</span> <strong>رأی نهایی:</strong> اخراج یا بقا</div>
        <div class="rule-step"><span class="rule-num">۴</span> <strong>شب:</strong> نقش‌ها اقدامات شبانه انجام می‌دهند</div>
        <div class="rule-step"><span class="rule-num">۵</span> <strong>صبح:</strong> گرداننده نتیجه شب را اعلام می‌کند</div>
      </div>
      <div class="rule-block"><h3>🏆 شرط پیروزی</h3>
        <p>😈 <strong>مافیا:</strong> تعداد مافیا ≥ تعداد شهروندان</p>
        <p>😇 <strong>شهروند:</strong> همه مافیاها حذف شوند</p>
      </div>
      <div class="rule-block"><h3>⚠️ قوانین عمومی</h3>
        <p>• ۳ اخطار = اخراج از بازی</p>
        <p>• نقش خود را فاش نکنید</p>
        <p>• در شب حرف نزنید</p>
        <p>• به رأی اکثریت احترام بگذارید</p>
      </div>`,
    mafia: `
      <div class="rule-role"><span class="role-icon">👑</span><div><strong>پدرخوانده / رئیس مافیا</strong><p>رهبر تیم مافیا. هر شب یک شات انجام می‌دهد. در استعلام کارآگاه «شهروند» نشان داده می‌شود.</p></div></div>
      <div class="rule-role"><span class="role-icon">🔫</span><div><strong>ناتو</strong><p>شات مستقل دارد. می‌تواند نقش مستقل را هم بزند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🃏</span><div><strong>شیاد / جوکر</strong><p>در استعلام، نقش جعلی نشان می‌دهد. مافیا را مخفی نگه می‌دارد.</p></div></div>
      <div class="rule-role"><span class="role-icon">🤝</span><div><strong>مذاکره‌کننده</strong><p>هر شب یک شهروند را جذب تیم مافیا می‌کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">💻</span><div><strong>هکر</strong><p>توانایی یک بازیکن را برای آن شب غیرفعال می‌کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">💣</span><div><strong>گروگان‌گیر</strong><p>یک بازیکن را گروگان می‌گیرد. اگر مافیا رأی بیاورد، گروگان هم حذف می‌شود.</p></div></div>
      <div class="rule-role"><span class="role-icon">🗡️</span><div><strong>یاغی</strong><p>حمله مستقل شبانه. به خودسر عمل می‌کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">😈</span><div><strong>مافیا ساده</strong><p>در رأی‌گیری شبانه مافیا شرکت می‌کند. توانایی ویژه ندارد.</p></div></div>`,
    citizen: `
      <div class="rule-role"><span class="role-icon">⚕️</span><div><strong>دکتر</strong><p>هر شب یک بازیکن را سیو می‌کند. نمی‌تواند دو شب متوالی یک نفر را سیو کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🕵️</span><div><strong>کارآگاه</strong><p>هر شب از یک بازیکن استعلام می‌گیرد: مافیا یا شهروند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🔍</span><div><strong>بازپرس</strong><p>مثل کارآگاه استعلام می‌گیرد. در بعضی سناریوها نقش دقیق را می‌فهمد.</p></div></div>
      <div class="rule-role"><span class="role-icon">🎯</span><div><strong>تک‌تیرانداز</strong><p>یک شات دارد. اگر مافیا بزند حذف می‌شود. اگر شهروند بزند خودش هم حذف می‌شود.</p></div></div>
      <div class="rule-role"><span class="role-icon">🏹</span><div><strong>هانتر</strong><p>یک بازیکن را نشانه می‌گذارد. اگر هانتر حذف شود، نشانه‌شده هم حذف می‌شود.</p></div></div>
      <div class="rule-role"><span class="role-icon">🛡️</span><div><strong>رویین‌تن / زره‌پوش</strong><p>یک بار از مرگ نجات پیدا می‌کند. سپر یک‌بار مصرف.</p></div></div>
      <div class="rule-role"><span class="role-icon">👮</span><div><strong>نگهبان / محافظ</strong><p>هر شب از یک بازیکن محافظت می‌کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🍷</span><div><strong>ساقی</strong><p>یک بازیکن را سایلنت می‌کند — در روز بعد حق صحبت ندارد.</p></div></div>
      <div class="rule-role"><span class="role-icon">🧠</span><div><strong>روانشناس</strong><p>تیم یک بازیکن را تشخیص می‌دهد (مافیا/شهروند/مستقل).</p></div></div>
      <div class="rule-role"><span class="role-icon">📰</span><div><strong>خبرنگار</strong><p>هر شب تحقیق می‌کند. اطلاعات محدود دریافت می‌کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">😇</span><div><strong>شهروند ساده</strong><p>توانایی شبانه ندارد. با منطق و استدلال بازی می‌کند.</p></div></div>`,
    independent: `
      <div class="rule-role"><span class="role-icon">🔪</span><div><strong>قاتل زنجیره‌ای</strong><p>هر شب مستقلاً یک نفر را می‌کشد. برد: آخرین نفر باقی بماند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🎭</span><div><strong>هزارچهره</strong><p>هر شب هویت خود را تغییر می‌دهد. در استعلام متفاوت دیده می‌شود.</p></div></div>
      <div class="rule-role"><span class="role-icon">🐺</span><div><strong>گرگ‌نما</strong><p>حمله شبانه مستقل. نه مافیاست نه شهروند.</p></div></div>
      <div class="rule-role"><span class="role-icon">♏</span><div><strong>زودیاک</strong><p>قاتل مستقل. باید مخفیانه حذف کند.</p></div></div>
      <div class="rule-role"><span class="role-icon">🕶️</span><div><strong>سندیکا</strong><p>تیم خودش را تشکیل می‌دهد. بازیکنان را جذب می‌کند.</p></div></div>`
  };
  el.innerHTML = rules[tab] || '';
}

// ── Events ──
function showEventTab(tab, btn) {
  document.querySelectorAll('.event-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.event-tab').forEach(t => t.classList.remove('active'));
  const target = document.getElementById('event' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'browse') filterEvents();
  if (tab === 'my') loadMyEvents();
}

async function filterEvents() {
  const country = document.getElementById('eventCountryFilter')?.value || '';
  const city = document.getElementById('eventCityFilter')?.value || '';
  const list = document.getElementById('eventList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)">در حال بارگذاری...</div>';

  try {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    const r = await fetch(API + '/api/events?' + params.toString());
    const events = await r.json();

    if (!events.length) {
      list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--dim)">🏠 ایونتی پیدا نشد<br><span style="font-size:0.72rem">اولین ایونت رو خودت بساز!</span></div>';
      return;
    }
    list.innerHTML = events.map(e => renderEventCard(e)).join('');
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--accent)">خطا در بارگذاری</div>';
  }
}

function renderEventCard(e) {
  const badgeClass = e.status === 'open' ? 'badge-open' : 'badge-full';
  const badgeText = e.status === 'open' ? 'باز' : e.status === 'full' ? 'تکمیل' : e.status;
  const canReserve = e.status === 'open' && authToken && currentUser && e.host_id !== currentUser.id;
  return `<div class="event-card">
    <div class="event-card-header">
      <div class="event-card-title">📍 ${escapeHtml(e.location_name)}</div>
      <span class="event-card-badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="event-card-info">
      <span>🌍 ${escapeHtml(e.country)}, ${escapeHtml(e.city)}</span>
      <span>🎭 ${escapeHtml(e.scenario || '—')}</span>
      <span>👥 ${toFarsiNum(e.reserved_count)}/${toFarsiNum(e.max_players)}</span><br>
      <span>📅 ${e.event_date}</span>
      <span>⏰ ${e.start_time}${e.end_time ? ' — ' + e.end_time : ''}</span>
    </div>
    ${e.description ? `<div style="font-size:0.75rem;color:var(--dim);margin-top:6px">${escapeHtml(e.description)}</div>` : ''}
    <div class="event-card-footer">
      <span class="event-card-host">🎙️ ${escapeHtml(e.host_name)}</span>
      ${canReserve ? `<button class="event-reserve-btn" onclick="reserveEvent(${e.id})">رزرو</button>` :
        e.status === 'full' ? '<span style="font-size:0.72rem;color:var(--accent)">ظرفیت تکمیل</span>' : ''}
    </div>
  </div>`;
}

async function createGameEvent() {
  if (!authToken) { showToast('⚠️ ابتدا وارد شوید'); openAuthModal('login'); return; }
  const data = {
    country: document.getElementById('evCountry')?.value || '',
    city: document.getElementById('evCity')?.value?.trim() || '',
    location_name: document.getElementById('evLocation')?.value?.trim() || '',
    scenario: document.getElementById('evScenario')?.value || '',
    player_count: parseInt(document.getElementById('evPlayerCount')?.value || 10),
    max_players: parseInt(document.getElementById('evPlayerCount')?.value || 10),
    event_date: document.getElementById('evDate')?.value || '',
    start_time: document.getElementById('evStartTime')?.value || '',
    end_time: document.getElementById('evEndTime')?.value || '',
    description: document.getElementById('evDescription')?.value?.trim() || ''
  };
  if (!data.city || !data.location_name || !data.event_date || !data.start_time) {
    showToast('⚠️ شهر، لوکیشن، تاریخ و ساعت الزامی است');
    return;
  }
  const r = await apiFetch('/api/events', { method: 'POST', body: JSON.stringify(data) });
  if (r.ok) {
    showToast('✅ ایونت ثبت شد!');
    showEventTab('browse', document.querySelector('.event-tab'));
  } else {
    showToast('⚠️ ' + (r.data?.error || 'خطا در ثبت'));
  }
}

async function reserveEvent(eid) {
  const r = await apiFetch('/api/events/' + eid + '/reserve', { method: 'POST' });
  if (r.ok) { showToast('✅ رزرو شد — منتظر تأیید گرداننده باشید'); filterEvents(); }
  else showToast('⚠️ ' + (r.data?.error || 'خطا'));
}

async function loadMyEvents() {
  if (!authToken) { document.getElementById('myEventsList').innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)">ابتدا وارد شوید</div>'; return; }
  const r = await apiFetch('/api/events/my', { _background: true });
  if (!r.ok) return;
  const el = document.getElementById('myEventsList');
  let html = '';
  if (r.data.hosted.length) {
    html += '<div style="font-size:0.82rem;color:var(--accent2);font-weight:700;margin-bottom:8px">🎙️ ایونت‌های شما</div>';
    html += r.data.hosted.map(e => renderEventCard(e) + renderReservationList(e)).join('');
  }
  if (r.data.reserved.length) {
    html += '<div style="font-size:0.82rem;color:#60a5fa;font-weight:700;margin:12px 0 8px">📋 رزروهای شما</div>';
    html += r.data.reserved.map(e => renderEventCard(e)).join('');
  }
  if (!html) html = '<div style="text-align:center;padding:20px;color:var(--dim)">ایونتی ندارید</div>';
  el.innerHTML = html;
}

function renderReservationList(e) {
  if (!e.reservations || !e.reservations.length) return '';
  return '<div style="padding:8px;font-size:0.75rem">' +
    e.reservations.map(r =>
      `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <span>${escapeHtml(r.username)}</span>
        <span style="flex:1"></span>
        <span style="color:${r.status==='accepted'?'#4ade80':r.status==='rejected'?'#e94560':'var(--dim)'}">${r.status==='pending'?'⏳ منتظر':r.status==='accepted'?'✅ تأیید':'❌ رد'}</span>
        ${r.status==='pending'?`<button class="btn-s btn-edit" onclick="manageReservation(${e.id},${r.user_id},'accepted')">✓</button><button class="btn-s btn-ban" onclick="manageReservation(${e.id},${r.user_id},'rejected')">✕</button>`:''}
      </div>`
    ).join('') + '</div>';
}

async function manageReservation(eid, uid, status) {
  // Find reservation ID — use uid to match
  const r = await apiFetch('/api/events/' + eid);
  if (!r.ok) return;
  const res = r.data.reservations.find(rv => rv.user_id === uid);
  if (!res) return;
  // We need the reservation ID, but API uses user_id, let's update
  await apiFetch(`/api/events/${eid}/reservations/0`, {
    method: 'PUT', body: JSON.stringify({ status, user_id: uid })
  });
  showToast(status === 'accepted' ? '✅ تأیید شد' : '❌ رد شد');
  loadMyEvents();
}

// ── Toast Queue ──
const toastQueue = [];
let toastActive = false;
const originalShowToast = typeof showToast === 'function' ? showToast : null;

function showToastQueued(msg, type) {
  toastQueue.push({ msg, type });
  if (!toastActive) processToastQueue();
}

function processToastQueue() {
  if (toastQueue.length === 0) { toastActive = false; return; }
  toastActive = true;
  const { msg, type } = toastQueue.shift();
  if (originalShowToast) originalShowToast(msg, type);
  setTimeout(processToastQueue, 2500);
}

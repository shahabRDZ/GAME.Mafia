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

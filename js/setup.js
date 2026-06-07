/* ── Setup Screen Logic ── */

let currentCustomMode = 'custom'; // 'custom' | 'shabnmafia'

// ── شب مافیا Role List ──
const SHAB_MAFIA_ROLES = {
  citizen: [
    {name:"دکتر",            desc:"نجات یک نفر در شب از شلیک مافیا",                                              icon:"⚕️"},
    {name:"کارآگاه",          desc:"استعلام هویت مافیا بودن بازیکنان · پدرخوانده منفی نشان می‌دهد",              icon:"🕵️"},
    {name:"حرفه‌ای",          desc:"شلیک شبانه به مافیا · شلیک اشتباه به شهروند = حذف خودش",                    icon:"🎯"},
    {name:"جان‌سخت",         desc:"زره‌دار در شب اول · اعلام وضعیت کشته‌های بازی در روز",                       icon:"💪"},
    {name:"شهردار",           desc:"لغو رای‌گیری روز یا خرید مستقیم بازیکن در دفاعیه",                          icon:"🎩"},
    {name:"روان‌پزشک",       desc:"لال (ساکت) کردن یک بازیکن برای روز بعد",                                      icon:"🧠"},
    {name:"نگهبان",           desc:"فدایی شدن برای نجات یک نفر از ترور یا شلیک",                                 icon:"🛡️"},
    {name:"نخبه",             desc:"شناسایی نقش‌های خارج شده از بازی",                                           icon:"🎓"},
    {name:"شکارچی",           desc:"اگر در شب کشته شود، با تیر خودش یک نفر را با خود می‌برد",                   icon:"🏹"},
    {name:"زندانبان",         desc:"زندانی کردن یک نفر و سلب تمام توانایی‌های شبانه او",                        icon:"⛓️"},
    {name:"پرستار",           desc:"نجات بازیکنانی که توسط سم مسموم شده‌اند",                                    icon:"💊"},
    {name:"کشیش",             desc:"نجات بازیکن لال‌شده یا برگرداندن ساید شهروندِ روانکاو شده",                 icon:"⛪"},
    {name:"شهروند ساده",      desc:"بدون توانایی شبانه · فقط بازوی رای در روز",                                  icon:"😇"},
    {name:"انتقام‌جو",        desc:"بعد از مرگ، در شب بعد می‌تواند یک نفر را ترور کند",                         icon:"⚔️"},
    {name:"کارآگاه ویژه",    desc:"استعلام نقش‌های مستقل بازی",                                                   icon:"🔎"},
    {name:"نانوا",            desc:"تا زنده است شهر غذا دارد · با حذف او بازی پس از ۳ روز تمام می‌شود",         icon:"🍞"},
    {name:"خبرنگار",          desc:"استعلام وضعیت بیدار شدن یا نشدن یک نقش در شب",                              icon:"📰"},
    {name:"صداپیشه",          desc:"تغییر دادن یا مخفی کردن صدای خود هنگام صحبت در شب",                         icon:"🎙️"},
    {name:"شاهد",             desc:"بیدار شدن همزمان با برخی نقش‌ها و دیدن کار آن‌ها بدون شناختن هویتشان",     icon:"👁️"},
    {name:"قهرمان",           desc:"رویین‌تن کردن یک بازیکن برای ۲۴ ساعت",                                       icon:"🦸"},
    {name:"جادوگر",           desc:"باطل کردن توانایی شبانه یک بازیکن در فاز روز",                               icon:"🔮"},
    {name:"تکاور",            desc:"اگر هدف شلیک شب قرار بگیرد، کشته نمی‌شود و شلیک متقابل می‌کند",            icon:"🪖"}
  ],
  mafia: [
    {name:"پدرخوانده",                desc:"شلیک نهایی تیم مافیا · استعلام کارآگاه برای او منفی است",                    icon:"👑"},
    {name:"دکتر لکتر",               desc:"نجات یکی از اعضای مافیا از شلیک تک‌تیرانداز شهر",                           icon:"🔪"},
    {name:"معشوقه",                   desc:"با حذف او در روز، مافیا شب بعد ۲ شلیک همزمان پیدا می‌کند",                 icon:"💋"},
    {name:"روانکاو",                  desc:"تغییر ساید یک شهروند ساده به ساید مافیا در شب",                             icon:"🧪"},
    {name:"شاه‌کش",                  desc:"حدس نقش دقیق شهروندان در شب و حذف مستقیم در صورت حدس درست",                icon:"🗡️"},
    {name:"تروریست",                  desc:"اگر در روز با رای حذف شود، یک نفر را همراه خود حذف می‌کند",                icon:"💣"},
    {name:"مذاکره‌کننده",            desc:"پس از حذف اولین مافیا، یک شهروند ساده را به تیم دعوت می‌کند",              icon:"🤝"},
    {name:"گروگان‌گیر",              desc:"بستن و بلاک کردن توانایی شبانه یکی از شهروندان",                            icon:"🔒"},
    {name:"دزد",                      desc:"سرقت توانایی شبانه یک بازیکن و استفاده از آن علیه شهر",                     icon:"🦹"},
    {name:"شارلاتان",                 desc:"جابه‌جا کردن استعلام کارآگاه · مثبت کردن شهروند یا منفی کردن مافیا",       icon:"🎭"},
    {name:"دست راست پدرخوانده",      desc:"جانشین رئیس پس از حذف او",                                                  icon:"🤜"},
    {name:"سم‌ساز",                  desc:"مسموم کردن یک بازیکن در شب که بعد از ۴۸ ساعت حذف می‌شود",                  icon:"☠️"},
    {name:"جاسوس",                    desc:"شهروندنمایی که در شب با مافیا بیدار می‌شود اما به نفع آن‌ها بازی می‌کند", icon:"🥷"},
    {name:"جوکر مافیا",              desc:"وارونه کردن نتایج استعلام‌های شبانه روی خودش",                              icon:"🃏"},
    {name:"مافیای ساده",             desc:"بدون توانایی خاص · بازوی رای و مشورت تیم مافیا",                            icon:"😈"},
    {name:"کیمیاگر",                  desc:"ساختن معجون‌های خاص برای قوی‌تر کردن اعضای مافیا",                         icon:"⚗️"}
  ],
  independent: [
    {name:"سندیکا",    desc:"هدف: حذف تمام مافیاها و رسیدن به ۳ نفر پایانی بازی",                                      icon:"🎰"},
    {name:"جانی",      desc:"هر شب یک نفر را سلاخی می‌کند تا خودش برنده شود",                                          icon:"🔪"},
    {name:"گرگ‌نما",  desc:"هر شب یک نفر را گاز می‌گیرد و او را تبدیل به گرگ‌نما می‌کند",                             icon:"🐺"},
    {name:"زامبی",     desc:"گاز گرفتن بازیکنان و تبدیل آن‌ها به زامبی‌های مطیع خود",                                  icon:"🧟"},
    {name:"هزارچهره", desc:"هر کس او را حذف کند، توانایی‌های آن فرد به هزارچهره می‌رسد",                              icon:"🦹"},
    {name:"دلقک",      desc:"هدف: کاری کند شهروندان در روز به او رای خروج بدهند تا فورا برنده شود",                    icon:"🤡"},
    {name:"لوسیفر",   desc:"توانایی دیدن نقش‌های شب و تاثیر روی تصمیمات مستقل‌ها",                                    icon:"😈"},
    {name:"خون‌آشام", desc:"مکیدن خون بازیکنان در شب و تبدیل یا حذف آن‌ها",                                           icon:"🧛"},
    {name:"جلاد",      desc:"در ابتدای بازی یک هدف مشخص دارد و باید او را در روز اعدام کند تا برنده شود",              icon:"⚖️"}
  ]
};

function getShabMafiaExtraRoles() {
  try { return JSON.parse(localStorage.getItem("shabMafiaExtraRoles")) || {citizen:[],mafia:[],independent:[]}; }
  catch { return {citizen:[],mafia:[],independent:[]}; }
}
function saveShabMafiaExtraRoles(data) { localStorage.setItem("shabMafiaExtraRoles", JSON.stringify(data)); }
function getShabMafiaSelection() {
  try { return JSON.parse(localStorage.getItem("shabMafiaSelection")) || []; }
  catch { return []; }
}
function saveShabMafiaSelection() { localStorage.setItem("shabMafiaSelection", JSON.stringify(customCardsList)); }
function loadShabMafiaSelection() { customCardsList = getShabMafiaSelection(); }

function getShabMafiaRoleInfo(name, team) {
  return (SHAB_MAFIA_ROLES[team] || []).find(r => r.name === name) || null;
}

// ── Default Role Catalog ──
const DEFAULT_ROLES = {
  citizen: [
    "کارآگاه","دکتر","تکاور","ساقی","کشیش","شهردار","قاضی","روانشناس",
    "جان‌سخت","نگهبان","فراماسون","کارآگاه ویژه","خبرنگار","نانوا","قصاب",
    "پرستار","گورکن","جادوگر","کلانتر","فدایی","شهروند ساده",
    "بازپرس","هانتر","رویین‌تن","راهنما","مین‌گذار","وکیل","محافظ",
    "تفنگدار","تک‌تیرانداز","سرباز","زره‌پوش"
  ],
  mafia: [
    "رئیس مافیا","دکتر لکتر","مذاکره‌کننده","جوکر","ناتاشا","معشوقه",
    "جاسوس","تروریست","شعبده‌باز","آمپول‌زن","سیاه‌زخم","مافیا ساده",
    "ناتو","هکر","یاغی","شیاد","گروگان‌گیر","پدرخوانده","بمب‌گذار"
  ],
  independent: [
    "هزارچهره","سندیکا","گرگ‌نما","قاتل زنجیره‌ای","زودیاک",
    "نوستراداموس","دزد","جانی","همزاد"
  ]
};

const ROLE_CATALOG = {
  citizen: { label: "😇 تیم شهروند", color: "#4ade80", roles: [] },
  mafia: { label: "😈 تیم مافیا", color: "#ff6b6b", roles: [] },
  independent: { label: "🐺 تیم مستقل", color: "#c084fc", roles: [] }
};

// ── Persistent Custom Roles (localStorage) ──
function getCustomRoles() {
  try { return JSON.parse(localStorage.getItem("mafiaCustomRoles")) || { citizen: [], mafia: [], independent: [] }; }
  catch { return { citizen: [], mafia: [], independent: [] }; }
}

function saveCustomRoles(custom) {
  localStorage.setItem("mafiaCustomRoles", JSON.stringify(custom));
}

function buildCatalog() {
  if (currentCustomMode === 'shabnmafia') {
    const extra = getShabMafiaExtraRoles();
    Object.keys(ROLE_CATALOG).forEach(team => {
      const defaults = (SHAB_MAFIA_ROLES[team] || []).map(r => r.name);
      const userAdded = extra[team] || [];
      const all = [...defaults];
      userAdded.forEach(r => { if (!all.includes(r)) all.push(r); });
      ROLE_CATALOG[team].roles = all;
    });
    return;
  }
  const custom = getCustomRoles();
  Object.keys(ROLE_CATALOG).forEach(team => {
    const defaults = DEFAULT_ROLES[team] || [];
    const userAdded = custom[team] || [];
    const all = [...defaults];
    userAdded.forEach(r => { if (!all.includes(r)) all.push(r); });
    ROLE_CATALOG[team].roles = all;
  });
}

function addRoleToCatalog(name, team) {
  if (currentCustomMode === 'shabnmafia') {
    const extra = getShabMafiaExtraRoles();
    if (!extra[team]) extra[team] = [];
    const defaults = (SHAB_MAFIA_ROLES[team] || []).map(r => r.name);
    if (defaults.includes(name) || extra[team].includes(name)) return;
    extra[team].push(name);
    saveShabMafiaExtraRoles(extra);
    buildCatalog();
    return;
  }
  const custom = getCustomRoles();
  if (!custom[team]) custom[team] = [];
  if (DEFAULT_ROLES[team]?.includes(name) || custom[team].includes(name)) return;
  custom[team].push(name);
  saveCustomRoles(custom);
  buildCatalog();
}

function removeRoleFromCatalog(name, team) {
  if (currentCustomMode === 'shabnmafia') {
    const extra = getShabMafiaExtraRoles();
    if (!extra[team]) return;
    const idx = extra[team].indexOf(name);
    if (idx === -1) return;
    extra[team].splice(idx, 1);
    saveShabMafiaExtraRoles(extra);
    buildCatalog();
    renderShabMafiaCatalog();
    syncShabMafiaCatalog();
    return;
  }
  const custom = getCustomRoles();
  if (!custom[team]) return;
  const idx = custom[team].indexOf(name);
  if (idx === -1) return;
  custom[team].splice(idx, 1);
  saveCustomRoles(custom);
  buildCatalog();
  renderRoleCatalog();
  syncCatalogFromList();
}

function isCustomRole(name, team) {
  if (currentCustomMode === 'shabnmafia') {
    return getShabMafiaExtraRoles()[team]?.includes(name) || false;
  }
  const custom = getCustomRoles();
  return custom[team]?.includes(name) || false;
}

// Init catalog on load
buildCatalog();
document.addEventListener("DOMContentLoaded", () => renderSavedScenarios());

// ── Render Catalog ──
function renderRoleCatalog() {
  const container = document.getElementById("roleCatalog");
  const isShab = currentCustomMode === 'shabnmafia';
  container.className = isShab ? 'role-catalog shab-mafia-catalog' : 'role-catalog';
  container.innerHTML = Object.entries(ROLE_CATALOG).map(([team, data]) => `
    <div class="rc-team-section open" style="--rc-color:${data.color}">
      <button class="rc-team-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="rc-team-label">${data.label}</span>
        <span class="rc-team-count" id="rcCount_${team}">۰</span>
        <span class="scn-toggle-icon">▶</span>
      </button>
      <div class="rc-roles-grid">
        ${data.roles.map(role => {
          const info = isShab ? getShabMafiaRoleInfo(role, team) : null;
          if (isShab) {
            return `<div class="rc-chip-wrap sm-chip-wrap">
              <div class="sm-tile rc-role-chip" data-role="${escapeHtml(role)}" data-team="${team}" onclick="toggleCatalogRole(this)">
                <div class="sm-tile-top">
                  ${info ? `<span class="sm-tile-icon">${info.icon}</span>` : ''}
                  <span class="sm-tile-name">${escapeHtml(role)}</span>
                </div>
                <div class="sm-tile-bottom" onclick="event.stopPropagation()">
                  <button class="sm-tile-minus" onclick="decrementCatalogRole(this.closest('.rc-role-chip'))">−</button>
                  <span class="rc-chip-badge">0</span>
                </div>
              </div>
              ${isCustomRole(role, team) ? `<button class="rc-chip-del" data-role="${escapeHtml(role)}" data-team="${team}" onclick="removeRoleFromCatalog(this.dataset.role,this.dataset.team)" title="حذف">✕</button>` : ''}
            </div>`;
          }
          return `<div class="rc-chip-wrap">
            <button class="rc-role-chip" data-role="${escapeHtml(role)}" data-team="${team}" onclick="toggleCatalogRole(this)">
              <span class="rc-chip-name">${escapeHtml(role)}</span>
              <span class="rc-chip-badge">0</span>
            </button>
            <button class="rc-chip-dec" onclick="event.stopPropagation();decrementCatalogRole(this.previousElementSibling)" title="کم کردن">−</button>
            ${isCustomRole(role, team) ? `<button class="rc-chip-del" data-role="${escapeHtml(role)}" data-team="${team}" onclick="removeRoleFromCatalog(this.dataset.role,this.dataset.team)" title="حذف از لیست">✕</button>` : ''}
          </div>`;
        }).join("")}
      </div>
    </div>
  `).join("");
}

function decrementCatalogRole(chip) {
  const role = chip.dataset.role;
  const team = chip.dataset.team;
  for (let i = customCardsList.length - 1; i >= 0; i--) {
    if (customCardsList[i].name === role && customCardsList[i].team === team) {
      customCardsList.splice(i, 1);
      break;
    }
  }
  const badge = chip.querySelector('.rc-chip-badge');
  if (badge) {
    const n = Math.max(0, (parseInt(badge.textContent) || 1) - 1);
    badge.textContent = n;
    if (n === 0) chip.classList.remove('active');
  }
  if (currentCustomMode === 'shabnmafia') {
    updateShabSummary();
    saveShabMafiaSelection();
  } else {
    renderCustomCardsList();
    updateStartBtn();
    syncCatalogFromList();
  }
}

function toggleCatalogRole(btn) {
  const role = btn.dataset.role;
  const team = btn.dataset.team;
  const badge = btn.querySelector(".rc-chip-badge");
  let count = parseInt(badge.textContent) || 0;
  count++;
  badge.textContent = count;
  btn.classList.add("active");
  customCardsList.push({ name: role, team: team });
  if (currentCustomMode === 'shabnmafia') {
    updateShabSummary();
    saveShabMafiaSelection();
  } else {
    renderCustomCardsList();
    updateStartBtn();
    updateCatalogCounts();
  }
}

function updateCatalogCounts() {
  Object.keys(ROLE_CATALOG).forEach(team => {
    const count = customCardsList.filter(c => c.team === team).length;
    const el = document.getElementById(`rcCount_${team}`);
    if (el) el.textContent = toFarsiNum(count);
  });
}

function syncCatalogFromList() {
  document.querySelectorAll("#roleCatalog .rc-role-chip").forEach(btn => {
    btn.classList.remove("active");
    const b = btn.querySelector(".rc-chip-badge");
    if (b) b.textContent = "0";
  });
  customCardsList.forEach(c => {
    const btn = document.querySelector(`#roleCatalog .rc-role-chip[data-role="${c.name}"][data-team="${c.team}"]`);
    if (btn) {
      btn.classList.add("active");
      const badge = btn.querySelector(".rc-chip-badge");
      if (badge) badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  });
  updateCatalogCounts();
}

// ── Shab Mafia Overlay ──
let shabMafiaSelectedTeam = 'mafia';

function renderShabMafiaCatalog() {
  const container = document.getElementById('shabMafiaCatalog');
  if (!container) return;
  container.innerHTML = Object.entries(ROLE_CATALOG).map(([team, data]) => `
    <div class="rc-team-section open" style="--rc-color:${data.color}">
      <button class="rc-team-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="rc-team-label">${data.label}</span>
        <span class="rc-team-count" id="shmCount_${team}">۰</span>
        <span class="scn-toggle-icon">▶</span>
      </button>
      <div class="rc-roles-grid">
        ${data.roles.map(role => {
          const info = getShabMafiaRoleInfo(role, team);
          return `<div class="rc-chip-wrap sm-chip-wrap">
            <div class="sm-tile rc-role-chip" data-role="${escapeHtml(role)}" data-team="${team}" onclick="toggleCatalogRole(this)">
              <div class="sm-tile-top">
                ${info ? `<span class="sm-tile-icon">${info.icon}</span>` : ''}
                <span class="sm-tile-name">${escapeHtml(role)}</span>
              </div>
              <div class="sm-tile-bottom" onclick="event.stopPropagation()">
                <button class="sm-tile-minus" onclick="decrementCatalogRole(this.closest('.rc-role-chip'))">−</button>
                <span class="rc-chip-badge">0</span>
              </div>
            </div>
            ${isCustomRole(role, team) ? `<button class="rc-chip-del" data-role="${escapeHtml(role)}" data-team="${team}" onclick="removeRoleFromCatalog(this.dataset.role,this.dataset.team)">✕</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function syncShabMafiaCatalog() {
  document.querySelectorAll('#shabMafiaCatalog .rc-role-chip').forEach(btn => {
    btn.classList.remove('active');
    const b = btn.querySelector('.rc-chip-badge');
    if (b) b.textContent = '0';
  });
  customCardsList.forEach(c => {
    const btn = document.querySelector(`#shabMafiaCatalog .rc-role-chip[data-role="${c.name}"][data-team="${c.team}"]`);
    if (btn) {
      btn.classList.add('active');
      const badge = btn.querySelector('.rc-chip-badge');
      if (badge) badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  });
  ['citizen','mafia','independent'].forEach(team => {
    const el = document.getElementById(`shmCount_${team}`);
    if (el) el.textContent = toFarsiNum(customCardsList.filter(c => c.team === team).length);
  });
}

function updateShabSummary() {
  const total = customCardsList.length;
  const mc = customCardsList.filter(c => c.team === 'mafia').length;
  const cc = customCardsList.filter(c => c.team === 'citizen').length;
  const ic = customCardsList.filter(c => c.team === 'independent').length;
  ['citizen','mafia','independent'].forEach(team => {
    const el = document.getElementById(`shmCount_${team}`);
    if (el) el.textContent = toFarsiNum(customCardsList.filter(c=>c.team===team).length);
  });
  const sumEl = document.getElementById('shabSummary');
  if (sumEl) sumEl.style.display = total > 0 ? 'flex' : 'none';
  const t = document.getElementById('shabTotal');       if (t) t.textContent = toFarsiNum(total) + ' کارت';
  const m = document.getElementById('shabMafiaCount'); if (m) m.textContent = toFarsiNum(mc) + ' مافیا';
  const ci = document.getElementById('shabCitizenCount'); if (ci) ci.textContent = toFarsiNum(cc) + ' شهروند';
  const ind = document.getElementById('shabIndepCount'); if (ind) ind.textContent = toFarsiNum(ic) + ' مستقل';
  const startBtn = document.getElementById('shabStartBtn');
  if (startBtn) startBtn.style.display = (total >= 3 && mc >= 1 && cc >= 1) ? 'block' : 'none';
}

function setShabTeam(team) {
  shabMafiaSelectedTeam = team;
  document.getElementById('shabBtnMafia').className = team === 'mafia' ? 'active-mafia' : '';
  document.getElementById('shabBtnCitizen').className = team === 'citizen' ? 'active-citizen' : '';
  document.getElementById('shabBtnIndependent').className = team === 'independent' ? 'active-independent' : '';
}

function addShabMafiaCustomRole() {
  const input = document.getElementById('shabNewRoleName');
  const name = input.value.trim();
  if (!name) { input.focus(); showToast('⚠️ اسم نقش را بنویسید'); return; }
  addRoleToCatalog(name, shabMafiaSelectedTeam);
  input.value = ''; input.focus();
  buildCatalog();
  renderShabMafiaCatalog();
  syncShabMafiaCatalog();
}

function startShabMafiaGame() {
  const mc = customCardsList.filter(c => c.team === 'mafia').length;
  const cc = customCardsList.filter(c => c.team === 'citizen').length;
  if (customCardsList.length < 3 || mc < 1 || cc < 1) {
    showToast('⚠️ حداقل ۱ مافیا و ۱ شهروند انتخاب کنید'); return;
  }
  document.getElementById('shabMafiaOverlay').classList.remove('show');
  state.group = 'شب مافیا'; state.isCustom = true;
  state.count = customCardsList.length;
  state.mafiaCount = mc;
  state.citizenCount = cc + customCardsList.filter(c => c.team === 'independent').length;
  state.customCards = [...customCardsList];
  if (typeof showNarratorModal === 'function') showNarratorModal();
}

// ── Step Indicator ──
function updateStepIndicator(step) {
  const items = document.querySelectorAll(".step-item");
  const lines = document.querySelectorAll(".step-line");
  items.forEach((item, i) => {
    item.classList.remove("active", "done");
    if (i + 1 < step) item.classList.add("done");
    else if (i + 1 === step) item.classList.add("active");
  });
  lines.forEach((line, i) => {
    line.classList.toggle("done", i + 1 < step);
  });
}

// ── Setup Flow ──
function selectGroup(group) {
  document.querySelectorAll(".group-btn").forEach(b => b.classList.remove("selected"));
  const btn = document.querySelector(`[data-group="${group}"]`);
  if (btn) btn.classList.add("selected");

  const cf = document.getElementById("customForm");
  const cc = document.getElementById("countCard");
  const sr = document.getElementById("startBtnRow"); if (sr) sr.style.display = "none";
  const csr = document.getElementById("customStartRow"); if (csr) csr.style.display = "none";
  cf.classList.remove("show");
  cc.style.display = "none";

  updateStepIndicator(2);

  if (group === "شب مافیا") {
    currentCustomMode = 'shabnmafia';
    state.group = group; state.isCustom = true;
    customCardsList = [];
    buildCatalog();
    renderShabMafiaCatalog();
    loadShabMafiaSelection();
    syncShabMafiaCatalog();
    updateShabSummary();
    document.getElementById('shabMafiaOverlay').classList.add('show');

  } else if (group === "دلخواه") {
    currentCustomMode = 'custom';
    state.group = group; state.isCustom = true;
    customCardsList = [];
    selectedTeam = "mafia";
    setTeam("mafia");
    buildCatalog();
    renderRoleCatalog();
    renderCustomCardsList();
    document.getElementById('customOverlay').classList.add('show');

  } else {
    state.group = group; state.isCustom = false;
    state.count = null; customCardsList = [];
    if (!ROLES_DATA[group]) { showToast("⚠️ این سناریو هنوز پیکربندی نشده"); return; }
    if (SCENARIO_INFO[group]) openScenarioOverlay(group);
    else openCountOverlay(group);
  }
}

function selectCount(count) {
  state.count = count;
  state.mafiaCount = ROLE_MAP[count].mafia;
  state.citizenCount = ROLE_MAP[count].citizen;

  const cc = document.getElementById("countCard");
  if (cc) cc.style.display = "none";

  updateStepIndicator(3);
  if (typeof openStartOverlay === "function") openStartOverlay();
}

function setTeam(team) {
  selectedTeam = team;
  document.getElementById("btnMafia").className = team === "mafia" ? "active-mafia" : "";
  document.getElementById("btnCitizen").className = team === "citizen" ? "active-citizen" : "";
  document.getElementById("btnIndependent").className = team === "independent" ? "active-independent" : "";
}

function addCustomCard() {
  const input = document.getElementById("newCardName");
  const name = input.value.trim();
  if (!name) { input.focus(); showToast("⚠️ اسم کارت را بنویسید"); return; }
  customCardsList.push({ name, team: selectedTeam });
  // Also save to catalog permanently
  addRoleToCatalog(name, selectedTeam);
  input.value = "";
  input.focus();
  renderRoleCatalog();
  renderCustomCardsList();
  updateStartBtn();
  syncCatalogFromList();
}

function removeCustomCard(idx) {
  customCardsList.splice(idx, 1);
  renderCustomCardsList();
  updateStartBtn();
  syncCatalogFromList();
  if (currentCustomMode === 'shabnmafia') saveShabMafiaSelection();
}

function renderCustomCardsList() {
  const container = document.getElementById("customCardsList");
  const summary = document.getElementById("customSummary");
  if (!customCardsList.length) {
    container.innerHTML = `<div class="custom-empty">${t("noCards")}</div>`;
    summary.style.display = "none";
    return;
  }

  const teamIcons = { mafia: "😈", citizen: "😇", independent: "🐺" };
  const teamLabels = { mafia: t("mafia"), citizen: t("citizen"), independent: currentLang === "en" ? "Independent" : currentLang === "tr" ? "Bağımsız" : "مستقل" };

  container.innerHTML = customCardsList.map((c, i) => `
    <div class="custom-card-item ${c.team}-item">
      <span class="item-icon">${teamIcons[c.team] || "❓"}</span>
      <span class="item-name">${escapeHtml(c.name)}</span>
      <span class="item-team">${teamLabels[c.team] || c.team}</span>
      <button class="item-del" onclick="removeCustomCard(${i})" title="حذف">✕</button>
    </div>`).join("");

  const mc = customCardsList.filter(c => c.team === "mafia").length;
  const cc = customCardsList.filter(c => c.team === "citizen").length;
  const ic = customCardsList.filter(c => c.team === "independent").length;
  document.getElementById("csTotalCount").textContent = toFarsiNum(customCardsList.length) + " کارت";
  document.getElementById("csMafiaCount").textContent = toFarsiNum(mc) + " مافیا";
  document.getElementById("csCitizenCount").textContent = toFarsiNum(cc) + " شهروند";
  document.getElementById("csIndependentCount").textContent = toFarsiNum(ic) + " مستقل";
  summary.style.display = "flex";
}

function updateStartBtn() {
  const mc = customCardsList.filter(c => c.team === "mafia").length;
  const cc = customCardsList.filter(c => c.team === "citizen").length;
  const show = customCardsList.length >= 3 && mc >= 1 && cc >= 1;
  const startRow = document.getElementById("startBtnRow");
  if (startRow && state.isCustom) startRow.style.display = "none";
  const customRow = document.getElementById("customStartRow");
  if (customRow) customRow.style.display = show && state.isCustom ? "flex" : "none";
  const saveBtn = document.getElementById("saveScenarioBtn");
  if (saveBtn) saveBtn.style.display = customCardsList.length > 0 && state.isCustom ? "block" : "none";
}

// ── Saved Scenarios ──
function getSavedScenarios() {
  try { return JSON.parse(localStorage.getItem("savedCustomScenarios")) || []; }
  catch { return []; }
}

function saveCurrentScenario() {
  if (!customCardsList.length) { showToast("⚠️ ابتدا نقش‌ها را انتخاب کنید"); return; }
  const name = (document.getElementById("customName")?.value.trim() || "گروه من");
  const scenarios = getSavedScenarios();
  const id = Date.now().toString();
  scenarios.unshift({ id, name, cards: [...customCardsList] });
  if (scenarios.length > 20) scenarios.splice(20);
  localStorage.setItem("savedCustomScenarios", JSON.stringify(scenarios));
  showToast("✅ سناریو «" + name + "» ذخیره شد");
  renderSavedScenarios();
}

function deleteSavedScenario(id) {
  const scenarios = getSavedScenarios().filter(s => s.id !== id);
  localStorage.setItem("savedCustomScenarios", JSON.stringify(scenarios));
  renderSavedScenarios();
}

function closeCustomOverlay() {
  document.getElementById('customOverlay').classList.remove('show');
}

function loadSavedScenario(id) {
  const s = getSavedScenarios().find(s => s.id === id);
  if (!s) return;
  currentCustomMode = 'custom';
  state.group = "دلخواه"; state.isCustom = true;
  const nameEl = document.getElementById("customName");
  if (nameEl) nameEl.value = s.name;
  customCardsList = [...s.cards];
  selectedTeam = "mafia";
  setTeam("mafia");
  buildCatalog();
  renderRoleCatalog();
  renderCustomCardsList();
  updateStartBtn();
  syncCatalogFromList();
  document.getElementById('customOverlay').classList.add('show');
  showToast("📋 سناریو «" + s.name + "» بارگذاری شد");
}

function startSavedScenario(id) {
  const s = getSavedScenarios().find(s => s.id === id);
  if (!s) return;
  currentCustomMode = 'custom';
  state.group = "دلخواه"; state.isCustom = true;
  const nameEl = document.getElementById("customName");
  if (nameEl) nameEl.value = s.name;
  customCardsList = [...s.cards];
  updateStartBtn();
  startGame();
}

function renderSavedScenarios() {
  const el = document.getElementById("savedScenariosSection");
  if (!el) return;
  const scenarios = getSavedScenarios();
  if (!scenarios.length) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.innerHTML = `
    <div class="saved-scen-header">
      <span class="saved-scen-header-title">📂 سناریوهای من</span>
      <span class="saved-scen-header-line"></span>
    </div>
    <div class="saved-scen-list">
      ${scenarios.map(s => {
        const mc = s.cards.filter(c => c.team === "mafia").length;
        const cc = s.cards.filter(c => c.team === "citizen").length;
        const ic = s.cards.filter(c => c.team === "independent").length;
        const sid = escapeHtml(s.id);
        return `<div class="saved-scen-item">
          <div class="saved-scen-top">
            <span class="saved-scen-icon">📋</span>
            <span class="saved-scen-name">${escapeHtml(s.name)}</span>
            <button class="saved-scen-del" onclick="deleteSavedScenario('${sid}')" title="حذف">🗑</button>
          </div>
          <div class="saved-scen-pills">
            ${mc ? `<span class="ss-pill mafia">😈 ${mc} مافیا</span>` : ''}
            ${cc ? `<span class="ss-pill citizen">😇 ${cc} شهروند</span>` : ''}
            ${ic ? `<span class="ss-pill indep">🐺 ${ic} مستقل</span>` : ''}
            <span class="ss-pill total">🎴 ${s.cards.length} کارت</span>
          </div>
          <div class="saved-scen-actions">
            <button class="saved-scen-start" onclick="startSavedScenario('${sid}')">▶ شروع بازی</button>
            <button class="saved-scen-load" onclick="loadSavedScenario('${sid}')">✏️ اصلاح</button>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

/* ── Setup Screen Logic ── */

// ── Default Role Catalog ──
const DEFAULT_ROLES = {
  citizen: [
    "کارآگاه","دکتر","تکاور","ساقی","کشیش","شهردار","قاضی","روانشناس",
    "جان‌سخت","نگهبان","فراماسون","کارآگاه ویژه","خبرنگار","نانوا","قصاب",
    "پرستار","گورکن","جادوگر","کلانتر","فدایی","شهروند ساده",
    "بازپرس","هانتر","رویین‌تن","راهنما","مین‌گذار","وکیل","محافظ",
    "تفنگدار","تک‌تیرانداز","سرباز","خبرنگار","زره‌پوش"
  ],
  mafia: [
    "رئیس مافیا","دکتر لکتر","مذاکره‌کننده","جوکر","ناتاشا","معشوقه",
    "جاسوس","تروریست","شعبده‌باز","آمپول‌زن","سیاه‌زخم","مافیا ساده",
    "ناتو","هکر","یاغی","شیاد","گروگان‌گیر","پدرخوانده"
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
  const custom = getCustomRoles();
  Object.keys(ROLE_CATALOG).forEach(team => {
    const defaults = DEFAULT_ROLES[team] || [];
    const userAdded = custom[team] || [];
    // Merge: defaults first, then user-added (no duplicates)
    const all = [...defaults];
    userAdded.forEach(r => { if (!all.includes(r)) all.push(r); });
    ROLE_CATALOG[team].roles = all;
  });
}

function addRoleToCatalog(name, team) {
  const custom = getCustomRoles();
  if (!custom[team]) custom[team] = [];
  // Don't add if already in defaults or custom
  if (DEFAULT_ROLES[team]?.includes(name) || custom[team].includes(name)) return;
  custom[team].push(name);
  saveCustomRoles(custom);
  buildCatalog();
}

function removeRoleFromCatalog(name, team) {
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
  const custom = getCustomRoles();
  return custom[team]?.includes(name) || false;
}

// Init catalog on load
buildCatalog();

// ── Render Catalog ──
function renderRoleCatalog() {
  const container = document.getElementById("roleCatalog");
  container.innerHTML = Object.entries(ROLE_CATALOG).map(([team, data]) => `
    <div class="rc-team-section">
      <button class="rc-team-header" onclick="this.parentElement.classList.toggle('open')" style="--rc-color:${data.color}">
        <span class="rc-team-label">${data.label}</span>
        <span class="rc-team-count" id="rcCount_${team}">۰</span>
        <span class="scn-toggle-icon">▶</span>
      </button>
      <div class="rc-roles-grid">
        ${data.roles.map(role => `
          <div class="rc-chip-wrap">
            <button class="rc-role-chip" data-role="${escapeHtml(role)}" data-team="${team}" onclick="toggleCatalogRole(this)">
              <span class="rc-chip-name">${escapeHtml(role)}</span>
              <span class="rc-chip-badge">0</span>
            </button>${isCustomRole(role, team) ? `<button class="rc-chip-del" onclick="removeRoleFromCatalog(${JSON.stringify(role)},${JSON.stringify(team)})" title="حذف از لیست">✕</button>` : ''}
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
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
  renderCustomCardsList();
  updateStartBtn();
  updateCatalogCounts();
}

function updateCatalogCounts() {
  Object.keys(ROLE_CATALOG).forEach(team => {
    const count = customCardsList.filter(c => c.team === team).length;
    const el = document.getElementById(`rcCount_${team}`);
    if (el) el.textContent = toFarsiNum(count);
  });
}

function syncCatalogFromList() {
  document.querySelectorAll(".rc-role-chip").forEach(btn => {
    btn.classList.remove("active");
    btn.querySelector(".rc-chip-badge").textContent = "0";
  });
  customCardsList.forEach(c => {
    const btn = document.querySelector(`.rc-role-chip[data-role="${c.name}"][data-team="${c.team}"]`);
    if (btn) {
      btn.classList.add("active");
      const badge = btn.querySelector(".rc-chip-badge");
      badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  });
  updateCatalogCounts();
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
  state.group = group;
  state.isCustom = group === "دلخواه";
  document.querySelectorAll(".group-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector(`[data-group="${group}"]`).classList.add("selected");

  const cf = document.getElementById("customForm");
  const cc = document.getElementById("countCard");
  const sb = document.getElementById("startBtn");

  updateStepIndicator(2);

  if (state.isCustom) {
    cf.classList.add("show");
    cc.style.display = "none";
    customCardsList = [];
    selectedTeam = "mafia";
    setTeam("mafia");
    buildCatalog();
    renderRoleCatalog();
    renderCustomCardsList();
    sb.style.display = "none";
  } else {
    cf.classList.remove("show");
    cc.style.display = "block";
    state.count = null;
    sb.style.display = "none";
    const counts = Object.keys(ROLES_DATA[group]).map(Number);
    document.getElementById("countGrid").innerHTML = counts.map(c => `
      <button class="count-btn" onclick="selectCount(${c})" data-count="${c}">
        <span class="number">${toFarsiNum(c)}</span><span class="label">${t("persons")}</span>
        <span class="breakdown"><span class="m">${toFarsiNum(ROLE_MAP[c].mafia)} ${t("mafia")}</span> · <span class="c">${toFarsiNum(ROLE_MAP[c].citizen)} ${t("citizen")}</span></span>
      </button>`).join("");
    cc.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (SCENARIO_INFO[group]) openScenarioOverlay(group);
  }
}

function selectCount(count) {
  state.count = count;
  state.mafiaCount = ROLE_MAP[count].mafia;
  state.citizenCount = ROLE_MAP[count].citizen;
  document.querySelectorAll(".count-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector(`[data-count="${count}"]`).classList.add("selected");
  updateStepIndicator(3);
  const row = document.getElementById("startBtnRow");
  if (row) {
    row.style.display = "flex";
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
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
  // Show row with both buttons
  const startRow = document.getElementById("startBtnRow");
  if (startRow) startRow.style.display = show && !state.isCustom ? "flex" : "none";
  const customRow = document.getElementById("customStartRow");
  if (customRow) customRow.style.display = show && state.isCustom ? "flex" : "none";
}

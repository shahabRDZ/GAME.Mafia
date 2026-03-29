/* ── Setup Screen Logic ── */

// ── Role Catalog ──
const ROLE_CATALOG = {
  citizen: {
    label: "😇 تیم شهروند",
    color: "#4ade80",
    roles: [
      "کارآگاه","دکتر","تکاور","ساقی","کشیش","شهردار","قاضی","روانشناس",
      "جان‌سخت","نگهبان","فراماسون","کارآگاه ویژه","خبرنگار","نانوا","قصاب",
      "پرستار","گورکن","جادوگر","کلانتر","فدایی","شهروند ساده",
      "بازپرس","هانتر","رویین‌تن","راهنما","مین‌گذار","وکیل","محافظ",
      "تفنگدار","تک‌تیرانداز","سرباز"
    ]
  },
  mafia: {
    label: "😈 تیم مافیا",
    color: "#ff6b6b",
    roles: [
      "رئیس مافیا","دکتر لکتر","مذاکره‌کننده","جوکر","ناتاشا","معشوقه",
      "جاسوس","تروریست","شعبده‌باز","آمپول‌زن","سیاه‌زخم","مافیا ساده",
      "ناتو","هکر","یاغی","شیاد","گروگان‌گیر"
    ]
  },
  independent: {
    label: "🐺 تیم مستقل",
    color: "#c084fc",
    roles: [
      "هزارچهره","سندیکا","گرگ‌نما","قاتل زنجیره‌ای","زودیاک",
      "نوستراداموس","دزد","جانی","همزاد"
    ]
  }
};

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
          <button class="rc-role-chip" data-role="${role}" data-team="${team}" onclick="toggleCatalogRole(this)">
            <span class="rc-chip-name">${role}</span>
            <span class="rc-chip-badge">0</span>
          </button>
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

  // Click = add one, already active click again = add more
  count++;
  badge.textContent = count;
  btn.classList.add("active");

  customCardsList.push({ name: role, team: team });
  renderCustomCardsList();
  updateStartBtn();
  updateCatalogCounts();
}

function removeCatalogRole(btn) {
  const role = btn.dataset.role;
  const badge = btn.querySelector(".rc-chip-badge");
  let count = parseInt(badge.textContent) || 0;
  if (count <= 0) return;

  count--;
  badge.textContent = count;
  if (count === 0) btn.classList.remove("active");

  const idx = customCardsList.findIndex(c => c.name === role);
  if (idx !== -1) customCardsList.splice(idx, 1);
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
  // Reset all chips
  document.querySelectorAll(".rc-role-chip").forEach(btn => {
    btn.classList.remove("active");
    btn.querySelector(".rc-chip-badge").textContent = "0";
  });
  // Count from customCardsList
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

// ── Setup Flow ──
function selectGroup(group) {
  state.group = group;
  state.isCustom = group === "دلخواه";
  document.querySelectorAll(".group-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector(`[data-group="${group}"]`).classList.add("selected");

  const cf = document.getElementById("customForm");
  const cc = document.getElementById("countCard");
  const sb = document.getElementById("startBtn");

  if (state.isCustom) {
    cf.classList.add("show");
    cc.style.display = "none";
    customCardsList = [];
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
  const sb = document.getElementById("startBtn");
  sb.style.display = "block";
  sb.classList.remove("start-btn-pop");
  void sb.offsetWidth;
  sb.classList.add("start-btn-pop");
  sb.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  input.value = "";
  input.focus();
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
  const teamLabels = { mafia: t("mafia"), citizen: t("citizen"), independent: "مستقل" };

  container.innerHTML = customCardsList.map((c, i) => `
    <div class="custom-card-item ${c.team}-item">
      <span class="item-icon">${teamIcons[c.team] || "❓"}</span>
      <span class="item-name">${c.name}</span>
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
  document.getElementById("startBtn").style.display = (customCardsList.length >= 3 && mc >= 1 && cc >= 1) ? "block" : "none";
}

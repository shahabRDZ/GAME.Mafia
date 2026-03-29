/* ── Setup Screen Logic ── */

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
    // Show scenario tutorial overlay
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
}

function removeCustomCard(idx) {
  customCardsList.splice(idx, 1);
  renderCustomCardsList();
  updateStartBtn();
}

function renderCustomCardsList() {
  const container = document.getElementById("customCardsList");
  const summary = document.getElementById("customSummary");
  if (!customCardsList.length) {
    container.innerHTML = `<div class="custom-empty">${t("noCards")}</div>`;
    summary.style.display = "none";
    return;
  }
  container.innerHTML = customCardsList.map((c, i) => `
    <div class="custom-card-item ${c.team}-item">
      <span class="item-icon">${c.team === "mafia" ? "😈" : "😇"}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-team">${c.team === "mafia" ? t("mafia") : t("citizen")}</span>
      <button class="item-del" onclick="removeCustomCard(${i})" title="حذف">✕</button>
    </div>`).join("");

  const mc = customCardsList.filter(c => c.team === "mafia").length;
  const cc = customCardsList.filter(c => c.team === "citizen").length;
  document.getElementById("csTotalCount").textContent = toFarsiNum(customCardsList.length) + " کارت";
  document.getElementById("csMafiaCount").textContent = toFarsiNum(mc) + " مافیا";
  document.getElementById("csCitizenCount").textContent = toFarsiNum(cc) + " شهروند";
  summary.style.display = "flex";
}

function updateStartBtn() {
  const mc = customCardsList.filter(c => c.team === "mafia").length;
  const cc = customCardsList.filter(c => c.team === "citizen").length;
  document.getElementById("startBtn").style.display = (customCardsList.length >= 3 && mc >= 1 && cc >= 1) ? "block" : "none";
}

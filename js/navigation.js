/* ── Screen Navigation ── */

let previousScreen = null;

function showScreen(name) {
  // ── Auth guard: screens that require login ──
  const authScreens = ['profile', 'dm', 'admin'];
  if (authScreens.includes(name) && !authToken) {
    showToast('⚠️ ابتدا وارد حساب کاربری شوید');
    showScreen('setup');
    return;
  }

  // ── Game guard: must have cards to enter game screen ──
  if (name === 'game' && (!state || !state.cards || !state.cards.length)) {
    showToast('⚠️ ابتدا یک بازی جدید بسازید');
    showScreen('setup');
    return;
  }

  // Track previous screen
  const currentActive = document.querySelector(".screen.active");
  if (currentActive) previousScreen = currentActive.id.replace("Screen", "");

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

  // Update bottom nav
  document.querySelectorAll(".bnav-btn").forEach(b => b.classList.remove("active"));
  const screen = document.getElementById(name + "Screen");
  if (screen) screen.classList.add("active");

  // Map screen names to nav button IDs
  const navMap = {
    setup: "navNewGame", game: "gameNavBtn", history: "navHistory",
    dm: "navDM", profile: "navProfile", admin: "navAdmin",
    chaos: "navNewGame", lab: "navNewGame", leaderboard: "navLeaderboard",
    rules: "navRules", events: "navEvents", tools: "navNewGame"
  };
  const navBtn = document.getElementById(navMap[name]);
  if (navBtn) navBtn.classList.add("active");

  // Scroll to top on screen change
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "history") renderHistory();
  if (name === "profile") renderProfileScreen();
  if (name === "dm") renderDMScreen();
  if (name === "chaos" && authToken) initSocket();
  if (name === "lab" && authToken) initSocket();
  if (name === "admin") renderAdminScreen();
  if (name === "leaderboard") loadLeaderboard('wins');
  if (name === "rules") showRulesTab('overview');
  if (name === "events") filterEvents();
}

/* ── Authentication System ── */

async function initAuth() {
  if (!authToken) return;
  const r = await apiFetch("/api/auth/me");
  if (r.ok) { currentUser = r.data; renderAuthBar(); }
  else { authToken = null; localStorage.removeItem("mafiaToken"); }
}

function openAuthModal(mode) {
  authMode = mode;
  updateAuthModalUI();
  document.getElementById("authModal").classList.add("show");
  document.getElementById("authError").textContent = "";
  setTimeout(() => {
    const f = mode === "login" ? document.getElementById("loginIdentifier") : document.getElementById("regUsername");
    if (f) f.focus();
  }, 100);
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("show");
}

function switchAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  updateAuthModalUI();
  document.getElementById("authError").textContent = "";
}

function updateAuthModalUI() {
  const isLogin = authMode === "login";
  document.getElementById("authTitle").innerHTML = isLogin ? 'ورود به <span>مافیا</span>' : 'ثبت‌نام در <span>مافیا</span>';
  document.getElementById("loginFields").style.display = isLogin ? "block" : "none";
  document.getElementById("registerFields").style.display = isLogin ? "none" : "block";
  document.getElementById("authSubmitBtn").textContent = isLogin ? "ورود" : "ثبت‌نام";
  document.getElementById("authSwitch").innerHTML = isLogin
    ? 'حساب ندارید؟ <a onclick="switchAuthMode()">ثبت‌نام کنید</a>'
    : 'حساب دارید؟ <a onclick="switchAuthMode()">وارد شوید</a>';
}

async function submitAuth() {
  const btn = document.getElementById("authSubmitBtn");
  const errEl = document.getElementById("authError");
  errEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "...";

  let body, path;
  if (authMode === "login") {
    body = {
      identifier: document.getElementById("loginIdentifier").value.trim(),
      password: document.getElementById("loginPassword").value
    };
    path = "/api/auth/login";
  } else {
    body = {
      username: document.getElementById("regUsername").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      password: document.getElementById("regPassword").value
    };
    path = "/api/auth/register";
  }

  const r = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
  btn.disabled = false;
  btn.textContent = authMode === "login" ? "ورود" : "ثبت‌نام";

  if (r.ok) {
    authToken = r.data.token;
    currentUser = r.data.user;
    localStorage.setItem("mafiaToken", authToken);
    closeAuthModal();
    renderAuthBar();
    showToast("👋 خوش آمدید " + currentUser.username);
    if (document.getElementById("historyScreen").classList.contains("active")) renderHistory();
  } else {
    errEl.textContent = r.data.error || "خطا رخ داد";
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("mafiaToken");
  renderAuthBar();
  showToast("👋 خداحافظ!");
  if (document.getElementById("historyScreen").classList.contains("active")) renderHistory();
}

function renderAuthBar() {
  const li = !!currentUser;
  document.getElementById("loggedInInfo").style.display = li ? "flex" : "none";
  document.getElementById("guestMsg").style.display = li ? "none" : "block";
  document.getElementById("loginBtn").style.display = li ? "none" : "inline-block";
  document.getElementById("registerBtn").style.display = li ? "none" : "inline-block";
  document.getElementById("logoutBtn").style.display = li ? "inline-block" : "none";
  if (li) {
    document.getElementById("userAvatar").textContent = currentUser.username[0].toUpperCase();
    document.getElementById("usernameDisplay").textContent = currentUser.username;
    document.getElementById("gamesCountDisplay").textContent = toFarsiNum(currentUser.total_games) + " بازی ثبت‌شده";
  }
}

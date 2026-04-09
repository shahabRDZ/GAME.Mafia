/* ── Authentication System ── */

async function initAuth() {
  // Try localStorage token first
  if (!authToken) {
    authToken = localStorage.getItem("mafiaToken") || sessionStorage.getItem("mafiaToken") || null;
  }

  if (authToken) {
    try {
      const r = await apiFetch("/api/auth/me", { _background: true });
      if (r.ok) {
        currentUser = r.data;
        renderAuthBar();
        return;
      }
      // Only clear token if server explicitly rejected it (401)
      if (r.status === 401) {
        authToken = null;
        localStorage.removeItem("mafiaToken");
        sessionStorage.removeItem("mafiaToken");
      } else {
        // Network error or server error — keep token, user stays logged in
        renderAuthBar();
        return;
      }
    } catch {
      // Network error — keep token and stay logged in
      renderAuthBar();
      return;
    }
  }

  // No valid token — try device fingerprint auto-login
  try {
    const fp = getDeviceFingerprint();
    const r = await fetch(API + "/api/auth/device-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: fp })
    });
    const data = await r.json();
    if (r.ok && data.token) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("mafiaToken", authToken);
      renderAuthBar();
    }
  } catch {}
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
    // Always save to localStorage
    localStorage.setItem("mafiaToken", authToken);
    // Register device fingerprint
    try {
      const fp = getDeviceFingerprint();
      fetch(API + "/api/auth/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authToken },
        body: JSON.stringify({ fingerprint: fp })
      });
    } catch {}
    closeAuthModal();
    renderAuthBar();
    showToast("👋 خوش آمدید " + currentUser.username);
    if (document.getElementById("historyScreen").classList.contains("active")) renderHistory();
  } else {
    errEl.textContent = r.data.error || "خطا رخ داد";
  }
}

// ── Forgot Password ──
function showForgotPassword() {
  document.getElementById("loginFields").style.display = "none";
  document.getElementById("registerFields").style.display = "none";
  document.getElementById("rememberMeRow").style.display = "none";
  document.getElementById("authSubmitBtn").style.display = "none";
  document.getElementById("authSwitch").style.display = "none";
  document.getElementById("forgotFields").style.display = "block";
  document.getElementById("forgotLink").style.display = "none";
  document.getElementById("authTitle").innerHTML = "بازیابی <span>رمز عبور</span>";
  document.getElementById("authError").textContent = "";
}

function hideForgotPassword() {
  document.getElementById("forgotFields").style.display = "none";
  document.getElementById("forgotLink").style.display = "inline";
  updateAuthModalUI();
}

async function sendResetEmail() {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) { document.getElementById("authError").textContent = "ایمیل را وارد کنید"; return; }
  const r = await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  if (r.ok) {
    document.getElementById("authError").textContent = "";
    showToast("✅ رمز جدید به ایمیل ارسال شد");
    hideForgotPassword();
  } else {
    document.getElementById("authError").textContent = r.data?.error || "خطا";
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("mafiaToken");
  sessionStorage.removeItem("mafiaToken");
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
    const avatarEl = document.getElementById("userAvatar");
    const [c1, c2] = getAvatarColor(currentUser.username);
    avatarEl.textContent = currentUser.username[0].toUpperCase();
    avatarEl.style.background = `linear-gradient(135deg,${c1},${c2})`;
    document.getElementById("usernameDisplay").textContent = currentUser.username;
    document.getElementById("gamesCountDisplay").textContent = toFarsiNum(currentUser.total_games) + " بازی ثبت‌شده";
    // Show admin button
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = ["shahab","admin"].includes(currentUser.username) ? "inline-block" : "none";
    // Auto-connect WebSocket when logged in
    initSocket();
  } else {
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = "none";
    disconnectSocket();
  }
}

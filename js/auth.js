/* ── Authentication System ── */

async function initAuth() {
  if (!authToken) {
    authToken = localStorage.getItem("mafiaToken") || sessionStorage.getItem("mafiaToken") || null;
  }

  if (!authToken) {
    renderAuthBar();
    return;
  }

  try {
    const r = await apiFetch("/api/auth/me", { _background: true });
    if (r.ok) {
      currentUser = r.data;
      renderAuthBar();
      return;
    }
    if (r.status === 401) {
      authToken = null;
      currentUser = null;
      localStorage.removeItem("mafiaToken");
      sessionStorage.removeItem("mafiaToken");
      renderAuthBar();
      return;
    }
    // Network/server error — keep token, stay logged in (will retry next page)
    renderAuthBar();
  } catch {
    renderAuthBar();
  }
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
    const newPw = r.data.new_password;
    // Show new password directly
    const forgotFields = document.getElementById("forgotFields");
    forgotFields.innerHTML = `
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:2rem;margin-bottom:10px">🔑</div>
        <div style="font-size:.85rem;color:var(--dim);margin-bottom:12px">رمز عبور جدید شما:</div>
        <div style="font-size:1.5rem;font-weight:900;color:var(--accent2);letter-spacing:3px;
          padding:14px 20px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);
          border-radius:12px;direction:ltr;user-select:all;cursor:pointer"
          onclick="navigator.clipboard?.writeText('${newPw}');showToast('📋 کپی شد!')">${newPw}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:10px">روی رمز بزن تا کپی بشه · با این رمز وارد شو</div>
      </div>
      <button onclick="hideForgotPassword()" style="width:100%;padding:12px;margin-top:12px;
        background:var(--accent);border:none;border-radius:12px;color:#fff;font-family:inherit;
        font-size:.9rem;font-weight:700;cursor:pointer">ورود با رمز جدید</button>`;
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
  // Buttons inside the new profile-menu popover
  const loginBtn    = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn   = document.getElementById("logoutBtn");
  const viewBtn     = document.getElementById("profileMenuView");
  if (loginBtn)    loginBtn.style.display    = li ? "none" : "block";
  if (registerBtn) registerBtn.style.display = li ? "none" : "block";
  if (logoutBtn)   logoutBtn.style.display   = li ? "block" : "none";
  if (viewBtn)     viewBtn.style.display     = li ? "block" : "none";

  // Header card (avatar / name / sub-line)
  const avatarEl = document.getElementById("userAvatar");
  const nameEl   = document.getElementById("usernameDisplay");
  const subEl    = document.getElementById("gamesCountDisplay");
  if (li) {
    if (avatarEl) {
      const [c1, c2] = getAvatarColor(currentUser.username);
      avatarEl.textContent = currentUser.username[0].toUpperCase();
      avatarEl.style.background = `linear-gradient(135deg,${c1},${c2})`;
    }
    if (nameEl) nameEl.textContent = currentUser.username;
    if (subEl)  subEl.textContent  = toFarsiNum(currentUser.total_games) + " بازی ثبت‌شده";
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = ["shahab","admin"].includes(currentUser.username) ? "inline-block" : "none";
    initSocket();
  } else {
    if (avatarEl) { avatarEl.textContent = "م"; avatarEl.style.background = ""; }
    if (nameEl)   nameEl.textContent   = "میهمان";
    if (subEl)    subEl.textContent    = "برای ذخیره تاریخچه وارد شوید";
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = "none";
    disconnectSocket();
  }
}

/* Profile pop-over toggle (top-right icon) */
function toggleProfileMenu() {
  const m = document.getElementById("profileMenu");
  if (!m) return;
  if (m.hasAttribute("hidden")) m.removeAttribute("hidden");
  else m.setAttribute("hidden", "");
}
function closeProfileMenu() {
  const m = document.getElementById("profileMenu");
  if (m) m.setAttribute("hidden", "");
}
document.addEventListener("click", function (e) {
  const menu = document.getElementById("profileMenu");
  const btn  = document.getElementById("profileIconBtn");
  if (!menu || menu.hasAttribute("hidden")) return;
  if (e.target.closest("#profileMenu") || e.target.closest("#profileIconBtn")) return;
  menu.setAttribute("hidden", "");
});

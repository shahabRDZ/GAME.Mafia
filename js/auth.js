/* ── Authentication System ── */

const _PW_MAX = 72;
const _USER_RE = /^[a-zA-Z0-9_؀-ۿ]{3,30}$/;
const _EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

async function initAuth() {
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
      if (r.status === 401) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("mafiaToken");
        sessionStorage.removeItem("mafiaToken");
      } else {
        renderAuthBar();
        return;
      }
    } catch {
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

function _setAuthError(msg) {
  document.getElementById("authError").textContent = msg;
}

function _validatePassword(pw, errEl) {
  if (!pw || pw.length < 6) { errEl("رمز عبور باید حداقل ۶ کاراکتر باشد"); return false; }
  if (pw.length > _PW_MAX)  { errEl(`رمز عبور نباید بیشتر از ${_PW_MAX} کاراکتر باشد`); return false; }
  return true;
}

async function submitAuth() {
  const btn = document.getElementById("authSubmitBtn");
  const errEl = document.getElementById("authError");
  errEl.textContent = "";

  let body, path;

  if (authMode === "login") {
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password   = document.getElementById("loginPassword").value;
    if (!identifier || !password) { _setAuthError("همه فیلدها را پر کنید"); return; }
    if (!_validatePassword(password, _setAuthError)) return;
    body = { identifier, password };
    path = "/api/auth/login";
  } else {
    const username = document.getElementById("regUsername").value.trim();
    const email    = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm  = document.getElementById("regPasswordConfirm").value;

    if (!username || !email || !password || !confirm) { _setAuthError("همه فیلدها را پر کنید"); return; }
    if (!_USER_RE.test(username)) { _setAuthError("نام کاربری باید ۳ تا ۳۰ کاراکتر و فقط حروف، عدد یا _ باشد"); return; }
    if (!_EMAIL_RE.test(email))   { _setAuthError("فرمت ایمیل نامعتبر است"); return; }
    if (!_validatePassword(password, _setAuthError)) return;
    if (password !== confirm) { _setAuthError("رمز عبور و تکرار آن یکسان نیستند"); return; }

    body = { username, email, password };
    path = "/api/auth/register";
  }

  btn.disabled = true;
  btn.textContent = "...";
  const r = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
  btn.disabled = false;
  btn.textContent = authMode === "login" ? "ورود" : "ثبت‌نام";

  if (r.ok) {
    authToken = r.data.token;
    currentUser = r.data.user;
    localStorage.setItem("mafiaToken", authToken);
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
    errEl.textContent = r.data?.error || "خطا رخ داد";
  }
}

// ── Forgot Password ──
function showForgotPassword() {
  ["loginFields","registerFields","rememberMeRow","authSubmitBtn","authSwitch","forgotLink"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("forgotFields").style.display = "block";
  document.getElementById("authTitle").innerHTML = "بازیابی <span>رمز عبور</span>";
  document.getElementById("authError").textContent = "";
}

function hideForgotPassword() {
  document.getElementById("forgotFields").style.display = "none";
  const fl = document.getElementById("forgotLink");
  if (fl) fl.style.display = "inline";
  updateAuthModalUI();
  ["rememberMeRow","authSubmitBtn","authSwitch"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  });
}

async function sendResetEmail() {
  const emailInput = document.getElementById("forgotEmail");
  const email = emailInput ? emailInput.value.trim() : "";
  if (!email) { _setAuthError("ایمیل را وارد کنید"); return; }
  if (!_EMAIL_RE.test(email)) { _setAuthError("فرمت ایمیل نامعتبر است"); return; }

  const btn = document.querySelector("#forgotFields button");
  if (btn) { btn.disabled = true; btn.textContent = "در حال ارسال..."; }

  const r = await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

  if (r.ok) {
    _setAuthError("");
    const container = document.getElementById("forgotFields");
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "text-align:center;padding:20px 0";
    wrapper.innerHTML = `
      <div style="font-size:2.5rem;margin-bottom:12px">📧</div>
      <div style="font-size:1rem;font-weight:700;margin-bottom:8px">ایمیل ارسال شد</div>
      <div style="font-size:.82rem;color:var(--dim);line-height:1.7">
        لینک بازیابی رمز به ایمیل شما ارسال شد.<br>
        پوشه اسپم را هم چک کنید.<br>
        <span style="color:var(--accent2)">لینک ۳۰ دقیقه اعتبار دارد.</span>
      </div>`;
    const backBtn = document.createElement("button");
    backBtn.textContent = "برگشت به ورود";
    backBtn.style.cssText = "width:100%;padding:12px;margin-top:12px;background:var(--accent);border:none;border-radius:12px;color:#fff;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer";
    backBtn.addEventListener("click", hideForgotPassword);

    container.appendChild(wrapper);
    container.appendChild(backBtn);
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "ارسال لینک بازیابی"; }
    _setAuthError(r.data?.error || "خطا");
  }
}

function showResetPasswordModal(token) {
  const modal = document.getElementById("authModal");
  modal.classList.add("show");
  ["loginFields","registerFields","rememberMeRow","authSwitch","forgotLink","authSubmitBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("authTitle").innerHTML = "رمز عبور <span>جدید</span>";
  _setAuthError("");

  const container = document.getElementById("forgotFields");
  container.style.display = "block";
  container.innerHTML = `
    <p style="text-align:center;color:var(--dim);font-size:.85rem;margin-bottom:1.25rem">رمز عبور جدید خود را وارد کنید</p>
    <div class="modal-field">
      <label for="newPasswordInput">رمز عبور جدید</label>
      <input type="password" id="newPasswordInput" placeholder="حداقل ۶ کاراکتر"
             autocomplete="new-password" minlength="6" maxlength="72">
    </div>
    <div class="modal-field">
      <label for="newPasswordConfirm">تکرار رمز عبور</label>
      <input type="password" id="newPasswordConfirm" placeholder="رمز عبور را تکرار کنید"
             autocomplete="new-password" minlength="6" maxlength="72">
    </div>
    <button class="modal-submit" id="resetSubmitBtn">ثبت رمز جدید</button>
  `;

  const submitBtn = container.querySelector("#resetSubmitBtn");
  submitBtn.dataset.token = token;
  submitBtn.addEventListener("click", _submitNewPassword);

  container.querySelector("#newPasswordInput").focus();
  window.history.replaceState({}, "", window.location.pathname);
}

async function _submitNewPassword(e) {
  const token = e.currentTarget.dataset.token;
  const pw  = document.getElementById("newPasswordInput").value;
  const pw2 = document.getElementById("newPasswordConfirm").value;

  if (!_validatePassword(pw, _setAuthError)) return;
  if (pw !== pw2) { _setAuthError("رمزها یکسان نیستند"); return; }

  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = "در حال ذخیره...";

  const r = await apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password: pw })
  });

  if (r.ok) {
    authToken = r.data.token;
    currentUser = r.data.user;
    localStorage.setItem("mafiaToken", authToken);
    renderAuthBar();
    closeAuthModal();
    showToast("رمز عبور با موفقیت تغییر کرد!");
  } else {
    btn.disabled = false;
    btn.textContent = "ثبت رمز جدید";
    _setAuthError(r.data?.error || "خطا");
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
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = ["shahab","admin"].includes(currentUser.username) ? "inline-block" : "none";
    initSocket();
  } else {
    const ab = document.getElementById("navAdmin");
    if (ab) ab.style.display = "none";
    disconnectSocket();
  }
}

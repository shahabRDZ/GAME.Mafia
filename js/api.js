/* ── API Communication ── */

async function _silentRefresh() {
  try {
    const res = await fetch(API + "/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      if (data.user) currentUser = data.user;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;

  const isBackground = opts._background;
  const isRetry = opts._isRetry;
  delete opts._background;
  delete opts._isRetry;

  if (!isBackground) showLoading();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(API + path, {
      ...opts, headers, signal: controller.signal, credentials: "include"
    });
    clearTimeout(timeoutId);
    if (!isBackground) hideLoading();

    let data;
    try {
      data = await res.json();
    } catch {
      return { ok: false, status: res.status, data: { error: getHttpErrorMessage(res.status) } };
    }

    // On 401, try to refresh once then retry the original request
    if (res.status === 401 && !isRetry) {
      const refreshed = await _silentRefresh();
      if (refreshed) {
        return apiFetch(path, { ...opts, _isRetry: true, _background: isBackground });
      }
      authToken = null;
      currentUser = null;
      renderAuthBar();
    }

    if (!res.ok) {
      const errMsg = data.error || getHttpErrorMessage(res.status);
      return { ok: false, status: res.status, data: { ...data, error: errMsg } };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    clearTimeout(timeoutId);
    if (!isBackground) hideLoading();

    if (err.name === 'AbortError') {
      return { ok: false, data: { error: "زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید" } };
    }
    return { ok: false, data: { error: "خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید" } };
  }
}

function getHttpErrorMessage(status) {
  switch (status) {
    case 400: return "درخواست نامعتبر است";
    case 401: return "لطفاً دوباره وارد شوید";
    case 403: return "دسترسی غیرمجاز";
    case 404: return "مورد یافت نشد";
    case 429: return "تعداد درخواست‌ها بیش از حد مجاز. کمی صبر کنید";
    case 500: return "خطای سرور. لطفاً بعداً تلاش کنید";
    default: return "خطای غیرمنتظره رخ داد";
  }
}

/* ── Button loading helpers ── */
function btnLoading(btn) {
  if (!btn) return;
  btn.classList.add('btn-loading');
  btn.disabled = true;
  btn._origText = btn.textContent;
}
function btnDone(btn) {
  if (!btn) return;
  btn.classList.remove('btn-loading');
  btn.disabled = false;
  if (btn._origText) btn.textContent = btn._origText;
}

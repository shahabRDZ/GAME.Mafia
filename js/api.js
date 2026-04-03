/* ── API Communication ── */

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;

  const isBackground = opts._background;
  delete opts._background;

  if (!isBackground) showLoading();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(API + path, { ...opts, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!isBackground) hideLoading();

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

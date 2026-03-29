/* ── API Communication ── */

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;
  try {
    const res = await fetch(API + path, { ...opts, headers });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, data: { error: "خطای شبکه" } };
  }
}

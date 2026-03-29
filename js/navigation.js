/* ── Screen Navigation ── */

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const screen = document.getElementById(name + "Screen");
  if (screen) screen.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if ((name === "setup" && b.textContent.includes("جدید")) ||
        (name === "game" && b.textContent.includes("جاری")) ||
        (name === "history" && b.textContent.includes("تاریخچه")) ||
        (name === "chaos" && b.textContent.includes("CHAOS")) ||
        (name === "profile" && b.textContent.includes("پروفایل"))) {
      b.classList.add("active");
    }
  });
  if (name === "history") renderHistory();
  if (name === "profile") renderProfileScreen();
  if (name === "chaos" && authToken) initSocket();
  if (name === "admin") renderAdminScreen();
}

/* ── Screen Navigation ── */

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(name + "Screen").classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if ((name === "setup" && b.textContent.includes("جدید")) ||
        (name === "game" && b.textContent.includes("جاری")) ||
        (name === "history" && b.textContent.includes("تاریخچه"))) {
      b.classList.add("active");
    }
  });
  if (name === "history") renderHistory();
}

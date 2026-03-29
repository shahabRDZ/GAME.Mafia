/* ── Funny Text + Animated Icon System ── */

const FUNNY_ICONS = {
  // Custom SVG mini icons — minimal, cartoonish, dark-themed
  eye: `<svg viewBox="0 0 24 24" class="fun-icon fun-bounce"><path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg>`,
  skull: `<svg viewBox="0 0 24 24" class="fun-icon fun-shake"><circle cx="12" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="currentColor"/><circle cx="15" cy="9" r="2" fill="currentColor"/><path d="M9 16h6M11 16v3M13 16v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  knife: `<svg viewBox="0 0 24 24" class="fun-icon fun-swing"><path d="M18 3L6 15l-2 6 6-2L22 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" class="fun-icon fun-float"><path d="M12 2L3 7v5c0 5 3.5 9.7 9 11 5.5-1.3 9-6 9-11V7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" class="fun-icon fun-flicker"><path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14c0-2 1.5-3 1.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" class="fun-icon fun-spin"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  brain: `<svg viewBox="0 0 24 24" class="fun-icon fun-pulse"><path d="M12 2C8 2 5 5 5 8c0 2 1 3.5 2 4.5C6 13 5 14.5 5 16c0 3 3 6 7 6s7-3 7-6c0-1.5-1-3-2-3.5 1-1 2-2.5 2-4.5 0-3-3-6-7-6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v20M8 6c2 1 4 1 6 0M8 18c2-1 4-1 6 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  mask: `<svg viewBox="0 0 24 24" class="fun-icon fun-tilt"><path d="M4 8c0-2 3-5 8-5s8 3 8 5c0 4-3 9-8 12C7 17 4 12 4 8z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.8" fill="currentColor"/><circle cx="15" cy="9" r="1.8" fill="currentColor"/><path d="M10 14c1 1 3 1 4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24" class="fun-icon fun-flash"><polygon points="13,2 3,14 11,14 9,22 21,10 13,10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  ghost: `<svg viewBox="0 0 24 24" class="fun-icon fun-float"><path d="M12 2C8 2 5 5.5 5 10v8l2-2 2 2 2-2 2 2 2-2 2 2 2-2v-8c0-4.5-3-8-7-8z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="14" cy="10" r="1.5" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 24 24" class="fun-icon fun-spin"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  bomb: `<svg viewBox="0 0 24 24" class="fun-icon fun-shake"><circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7V4M10 4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 4l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="2" r="1" fill="currentColor" class="fun-flicker-dot"/></svg>`,
};

const CITIZEN_TEXTS = [
  { text: "ملق نزنی", icon: "shield", color: "#4ade80" },
  { text: "خیلی شویی", icon: "eye", color: "#60d9fa" },
  { text: "تبر نزنی", icon: "knife", color: "#fbbf24" },
  { text: "خنگ‌بازی درنیار", icon: "brain", color: "#a78bfa" },
  { text: "عجول نباش", icon: "clock", color: "#fb923c" },
  { text: "خونسه نخور", icon: "fire", color: "#f87171" },
  { text: "یار پنجم تیم مافیا", icon: "skull", color: "#f472b6" },
  { text: "تپانی", icon: "bomb", color: "#fbbf24" },
  { text: "شهروند گردن نگیری باز", icon: "mask", color: "#34d399" },
  { text: "نایت نزنی", icon: "lightning", color: "#818cf8" },
  { text: "گند نزنی به بازی", icon: "ghost", color: "#fb7185" },
  { text: "روز یک رفتی …فکر کنم", icon: "star", color: "#fcd34d" },
];

const MAFIA_TEXTS = [
  { text: "یه دفعه نریزی", icon: "bomb", color: "#ff6b6b" },
  { text: "خیلی شویی", icon: "eye", color: "#ff9f43" },
  { text: "شو نمایان", icon: "ghost", color: "#c084fc" },
  { text: "کلین شیت کن", icon: "shield", color: "#ff6b6b" },
  { text: "سر دست نشی", icon: "skull", color: "#fbbf24" },
  { text: "تیم لا در نده", icon: "mask", color: "#fb7185" },
  { text: "فکر کن شهروند کشیدی", icon: "brain", color: "#f97316" },
  { text: "بزن زیر بازپرس", icon: "knife", color: "#ef4444" },
  { text: "ببینم روز یک میتونی شهروند پوش کنی", icon: "star", color: "#fbbf24" },
  { text: "یارات تپانن", icon: "fire", color: "#ff4757" },
  { text: "مثل روز روشنی", icon: "lightning", color: "#ffa502" },
];

function getRandomFunny(role) {
  const list = role === "mafia" ? MAFIA_TEXTS : role === "independent" ? MAFIA_TEXTS : CITIZEN_TEXTS;
  return list[Math.floor(Math.random() * list.length)];
}

function showFunnyText(card) {
  const existing = document.querySelector(".funny-container");
  if (existing) existing.remove();

  const funny = getRandomFunny(card.role);
  const iconSVG = FUNNY_ICONS[funny.icon] || FUNNY_ICONS.star;

  const container = document.createElement("div");
  container.className = "funny-container";
  container.style.color = funny.color;
  container.innerHTML = `
    <div class="funny-inner">
      <span class="funny-icon-wrap">${iconSVG}</span>
      <span class="funny-text">${funny.text}</span>
    </div>
  `;

  const cardSlot = document.getElementById("cardSlot");
  cardSlot.parentElement.appendChild(container);

  // Play subtle pop sound
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}
}

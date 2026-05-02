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

/* ── Card whispers ──
   Each line is the *card* speaking to the player who just drew it —
   a wise, sarcastic, cinematic voice. Styling (gold on velvet, italic
   serif) is centralised in CSS; per-line colors removed on purpose so
   every whisper feels like it comes from the same dark narrator. */
const CITIZEN_TEXTS = [
  { text: "ملق نزنی", icon: "shield" },
  { text: "خیلی شویی", icon: "eye" },
  { text: "تبر نزنی", icon: "knife" },
  { text: "خنگ‌بازی درنیار", icon: "brain" },
  { text: "عجول نباش", icon: "clock" },
  { text: "کنسه نخور", icon: "fire" },
  { text: "یار پنجم تیم مافیا", icon: "skull" },
  { text: "تپانی", icon: "bomb" },
  { text: "شهروند گردن نگیری باز", icon: "mask" },
  { text: "نایت نزنی", icon: "lightning" },
  { text: "گند نزنی به بازی", icon: "ghost" },
  { text: "روز یک رفتی …فکر کنم", icon: "star" },
  // ── 20 new whispers (citizen) ──
  { text: "شهر چشمش به توئه، خرابش نکن", icon: "eye" },
  { text: "آروم بازی کن، عجله مال مافیاست", icon: "clock" },
  { text: "گوش بده بیشتر از اونی که حرف بزنی", icon: "brain" },
  { text: "اعتماد سکه‌ایه، خرجش رو حساب کن", icon: "shield" },
  { text: "هرکی زیاد دفاع کرد، بهش شک کن", icon: "mask" },
  { text: "تو نقش‌داری، یادت نره", icon: "star" },
  { text: "یه نفر تو جمع داره دروغ می‌گه", icon: "ghost" },
  { text: "سکوت تو از فریاد یارات بلندتره", icon: "lightning" },
  { text: "این بار سرنوشت دست توئه", icon: "fire" },
  { text: "خونسرد باش، شهر بهت احتیاج داره", icon: "shield" },
  { text: "کسی که زیاد می‌خنده، یه چیزیش هست", icon: "skull" },
  { text: "نقشتو فاش نکن مگر آخرین لحظه", icon: "mask" },
  { text: "یه چشمت به چپ، یه چشمت به راست", icon: "eye" },
  { text: "اگه گیج شدی، همینجا بمون", icon: "brain" },
  { text: "رای‌گیری جنگه، نه شوخی", icon: "knife" },
  { text: "زیاد به خودت نبال، شب طولانیه", icon: "clock" },
  { text: "ساده نباش، اما زیادی هم پیچیده نشو", icon: "brain" },
  { text: "اگه شک داری، بهتره ساکت بمونی", icon: "ghost" },
  { text: "یه قهرمان شدن، یه آدم گرگ خوردن", icon: "fire" },
  { text: "این کارت تورو نمی‌بخشه اگه ول کنی", icon: "star" },
];

const MAFIA_TEXTS = [
  { text: "یه دفعه نریزی", icon: "bomb" },
  { text: "خیلی شویی", icon: "eye" },
  { text: "شو نمایان", icon: "ghost" },
  { text: "کلین شیت کن", icon: "shield" },
  { text: "سر دست نشی", icon: "skull" },
  { text: "تیم لا در نده", icon: "mask" },
  { text: "فکر کن شهروند کشیدی", icon: "brain" },
  { text: "بزن زیر نقشدار", icon: "knife" },
  { text: "ببینم روز یک میتونی شهروند پوش کنی", icon: "star" },
  { text: "یارات تپانن", icon: "fire" },
  { text: "مثل روز روشنی", icon: "lightning" },
  // ── 20 new whispers (mafia) ──
  { text: "خون سرد باش، کسی نباید بفهمه", icon: "skull" },
  { text: "لبخند بزن، انگار چیزی نمی‌دونی", icon: "mask" },
  { text: "اولین قانون: دروغ بگو حتی به خودت", icon: "ghost" },
  { text: "تو الان قسمت تاریک شهری", icon: "fire" },
  { text: "حواست به کارآگاه باشه، شکار توئی", icon: "eye" },
  { text: "یه بازیگر خوب، یه برنده‌ی خوبه", icon: "star" },
  { text: "هیچوقت اولین نفر شلیک‌شده نباش", icon: "lightning" },
  { text: "تیر اولت همه چیو معلوم می‌کنه", icon: "knife" },
  { text: "اگه گیر افتادی، یار بنداز جلو", icon: "shield" },
  { text: "روز اول، بی‌سروصدا‌ترین نفر باش", icon: "clock" },
  { text: "تو نقشی داری که کسی توش نباشه", icon: "ghost" },
  { text: "زیادی شهروند بازی نکن، تابلوئه", icon: "mask" },
  { text: "نفر سوم رای میده... تو هم بده", icon: "brain" },
  { text: "هیچ شبی برات تکرار نمی‌شه", icon: "fire" },
  { text: "اگه نفر اول بمیری، مقصر زبونته", icon: "skull" },
  { text: "سکوت طلاست، حرف زدن نقره‌ست", icon: "lightning" },
  { text: "یه چاقو پشت لبخندت قایم کن", icon: "knife" },
  { text: "هر کسی شک کرد، اول بهش لبخند بزن", icon: "mask" },
  { text: "این بازی برای تو مرگ یا زندگیه", icon: "bomb" },
  { text: "اگه گفتن ماهی نه، بگو شاید کوسه", icon: "ghost" },
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
  // No per-line color — the whisper styling comes from CSS so every
  // message reads in the same cinematic gold-on-velvet voice.
  container.innerHTML = `
    <div class="funny-inner whisper">
      <span class="funny-icon-wrap">${iconSVG}</span>
      <span class="funny-text">${funny.text}</span>
    </div>
  `;

  const cardSlot = document.getElementById("cardSlot");
  cardSlot.parentElement.appendChild(container);
}

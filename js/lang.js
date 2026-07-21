/* ── Language System ── */

const LANG = {
  fa: {
    dir: "rtl",
    ui: {
      title: "شوشانگ", newGame: "بازی جدید", currentGame: "بازی جاری", history: "تاریخچه",
      login: "ورود", register: "ثبت‌نام", logout: "خروج",
      guestMsg: "برای ذخیره تاریخچه وارد شوید", gamesRecorded: "بازی ثبت‌شده",
      selectGroup: "🎯 انتخاب سناریو", selectCount: "👥 تعداد بازیکنان",
      startGame: "🎮 شروع بازی", back: "◀ بازگشت", revealAll: "👁️ مشاهده همه",
      closeCards: "🔄 بستن کارت‌ها", shuffle: "🎲 بازنشانی", newGameBtn: "🆕 بازی جدید",
      tapHint: "لمس کنید", persons: "نفر", mafia: "مافیا", citizen: "شهروند",
      historyTitle: "📚 تاریخچه بازی‌ها", clearHistory: "پاک کردن",
      noGames: "هنوز بازی‌ای ثبت نشده", loading: "در حال بارگذاری...",
      allRoles: "🎭 همه نقش‌ها", close: "بستن",
      customGroup: "✏️ ساخت گروه دلخواه", groupName: "نام گروه",
      cardNamePlaceholder: "اسم کارت (مثلاً: دکتر)", addCard: "+ افزودن",
      noCards: "هنوز کارتی اضافه نشده — کارت‌های بازیکنان را وارد کنید",
      clearConfirm: "تاریخچه پاک شود؟",
      mafiaTeam: "😈 مافیا", citizenTeam: "😇 شهروند",
      groupDescs: { تکاور: "سبک تاکتیکی", بازپرس: "سبک تحقیقاتی", نماینده: "سبک سیاسی", مذاکره: "جذب شهروند", "جایزه سر رئیس": "شکار رئیس مافیا", دلخواه: "سفارشی‌سازی", دیجیتال: "پخش نقش دیجیتال", "شب مافیا": "نقش‌های کامل", "کی‌اس": "آنلاین ۳ نفره", آزمایشی: "آنلاین ۱۰ نفره", میتیک: "۱۲ نفره · نقش‌های حماسی", هانیبال: "۱۰–۱۳ نفره · روانشناختی", شاهنامه: "۱۰ نفره · حماسه ایرانی", دنتیست: "۱۲ نفره · جنگ سه‌جانبه" },
      groupNames: { تکاور: "تکاور", بازپرس: "بازپرس", نماینده: "نماینده", مذاکره: "مذاکره", "جایزه سر رئیس": "جایزه سر رئیس", دلخواه: "دلخواه", دیجیتال: "بدون گرداننده", "شب مافیا": "شب مافیا", "کی‌اس": "کی‌اس", آزمایشی: "آزمایشی", میتیک: "میتیک", هانیبال: "هانیبال", شاهنامه: "شاهنامه", دنتیست: "دنتیست" }
    },
    roles: {
      "رئیس مافیا": "رئیس مافیا", "ناتو": "ناتو", "شیاد": "شیاد", "گروگان‌گیر": "گروگان‌گیر",
      "هکر": "هکر", "یاغی": "یاغی", "مافیا ساده": "مافیا ساده", "مافیای ساده": "مافیای ساده",
      "شهروند ساده": "شهروند ساده", "بازپرس": "بازپرس", "کارآگاه": "کارآگاه", "هانتر": "هانتر",
      "دکتر": "دکتر", "رویین‌تن": "رویین‌تن", "راهنما": "راهنما", "مین‌گذار": "مین‌گذار",
      "وکیل": "وکیل", "محافظ": "محافظ", "تفنگدار": "تفنگدار", "نگهبان": "نگهبان", "تک‌تیرانداز": "تک‌تیرانداز", "سرباز": "سرباز",
      "شهردار": "شهردار", "قاضی": "قاضی", "جان‌سخت": "جان‌سخت", "دکتر لکتر": "دکتر لکتر", "بمب‌گذار": "بمب‌گذار",
      "ناتاشا": "ناتاشا", "ترور": "ترور", "کارگاه": "کارگاه", "اسنایپر": "اسنایپر", "کشیش": "کشیش",
      "حرفه‌ای": "حرفه‌ای", "روان‌پزشک": "روان‌پزشک", "نخبه": "نخبه", "شکارچی": "شکارچی",
      "زندانبان": "زندانبان", "پرستار": "پرستار", "انتقام‌جو": "انتقام‌جو", "کارآگاه ویژه": "کارآگاه ویژه",
      "نانوا": "نانوا", "خبرنگار": "خبرنگار", "صداپیشه": "صداپیشه", "شاهد": "شاهد",
      "قهرمان": "قهرمان", "جادوگر": "جادوگر", "تکاور": "تکاور",
      "پدرخوانده": "پدرخوانده", "معشوقه": "معشوقه", "روانکاو": "روانکاو", "شاه‌کش": "شاه‌کش",
      "تروریست": "تروریست", "مذاکره‌کننده": "مذاکره‌کننده", "دزد": "دزد", "شارلاتان": "شارلاتان",
      "دست راست پدرخوانده": "دست راست پدرخوانده", "سم‌ساز": "سم‌ساز", "جاسوس": "جاسوس",
      "جوکر مافیا": "جوکر مافیا", "کیمیاگر": "کیمیاگر",
      "سندیکا": "سندیکا", "جانی": "جانی", "گرگ‌نما": "گرگ‌نما", "زامبی": "زامبی",
      "هزارچهره": "هزارچهره", "دلقک": "دلقک", "لوسیفر": "لوسیفر", "خون‌آشام": "خون‌آشام", "جلاد": "جلاد",
      "کانسور": "کانسور", "نینجا": "نینجا", "نمایش‌نامه‌نویس": "نمایش‌نامه‌نویس", "بادیگارد": "بادیگارد",
      "ضحاک": "ضحاک", "بوف": "بوف", "افراسیاب": "افراسیاب", "سیمرغ": "سیمرغ",
      "جاماسب": "جاماسب", "کاوه": "کاوه", "رستم": "رستم", "آرش کمانگیر": "آرش کمانگیر"
    }
  },
  en: {
    dir: "ltr",
    ui: {
      title: "ShowShung", newGame: "New Game", currentGame: "Current Game", history: "History",
      login: "Login", register: "Register", logout: "Logout",
      guestMsg: "Login to save history", gamesRecorded: "games recorded",
      selectGroup: "🎯 Select Scenario", selectCount: "👥 Number of Players",
      startGame: "🎮 Start Game", back: "◀ Back", revealAll: "👁️ Reveal All",
      closeCards: "🔄 Close Cards", shuffle: "🎲 Shuffle", newGameBtn: "🆕 New Game",
      tapHint: "Tap to flip", persons: "Players", mafia: "Mafia", citizen: "Citizens",
      historyTitle: "📚 Game History", clearHistory: "Clear",
      noGames: "No games recorded yet", loading: "Loading...",
      allRoles: "🎭 All Roles", close: "Close",
      customGroup: "✏️ Build Custom Group", groupName: "Group Name",
      cardNamePlaceholder: "Card name (e.g. Doctor)", addCard: "+ Add",
      noCards: "No cards added yet — enter player cards",
      clearConfirm: "Clear history?",
      mafiaTeam: "😈 Mafia", citizenTeam: "😇 Citizen",
      groupDescs: { تکاور: "Tactical", بازپرس: "Investigation", نماینده: "Political", مذاکره: "Recruit Citizens", "جایزه سر رئیس": "Hunt the Boss", دلخواه: "Custom", دیجیتال: "Digital role deal", "شب مافیا": "Full role set", "کی‌اس": "Online 3-player", آزمایشی: "Online 10-player", میتیک: "12P · Epic roles", هانیبال: "10-13P · Psychological", شاهنامه: "10P · Persian Epic", دنتیست: "12P · Three-way war" },
      groupNames: { تکاور: "Rangers", بازپرس: "Detectives", نماینده: "Politicians", مذاکره: "Negotiation", "جایزه سر رئیس": "Bounty on the Boss", دلخواه: "Custom", دیجیتال: "No Game Master", "شب مافیا": "Mafia Night", "کی‌اس": "KS", آزمایشی: "Beta", میتیک: "Mythic", هانیبال: "Hannibal", شاهنامه: "Shahnameh", دنتیست: "Dentist" }
    },
    roles: {
      "رئیس مافیا": "Mafia Boss", "ناتو": "NATO Agent", "شیاد": "Swindler", "گروگان‌گیر": "Kidnapper",
      "هکر": "Hacker", "یاغی": "Outlaw", "مافیا ساده": "Mafia", "مافیای ساده": "Mafia",
      "شهروند ساده": "Citizen", "بازپرس": "Interrogator", "کارآگاه": "Detective", "هانتر": "Hunter",
      "دکتر": "Doctor", "رویین‌تن": "Invincible", "راهنما": "Guide", "مین‌گذار": "Bomb Expert",
      "وکیل": "Lawyer", "محافظ": "Bodyguard", "تفنگدار": "Rifleman", "نگهبان": "Guard", "تک‌تیرانداز": "Sniper", "تکاور": "Commando", "سرباز": "Soldier",
      "شهردار": "Mayor", "قاضی": "Judge", "جان‌سخت": "Tough Guy", "دکتر لکتر": "Dr. Lecter", "بمب‌گذار": "Bomber",
      "ناتاشا": "Natasha", "ترور": "Assassin", "کارگاه": "Workshop", "اسنایپر": "Sniper Pro", "کشیش": "Priest",
      "حرفه‌ای": "Professional", "روان‌پزشک": "Psychiatrist", "نخبه": "Elite", "شکارچی": "Predator",
      "زندانبان": "Jailer", "پرستار": "Nurse", "انتقام‌جو": "Avenger", "کارآگاه ویژه": "Special Detective",
      "نانوا": "Baker", "خبرنگار": "Reporter", "صداپیشه": "Voice Actor", "شاهد": "Witness",
      "قهرمان": "Hero", "جادوگر": "Wizard",
      "پدرخوانده": "Godfather", "معشوقه": "Mistress", "روانکاو": "Psychoanalyst", "شاه‌کش": "Kingslayer",
      "تروریست": "Terrorist", "مذاکره‌کننده": "Negotiator", "دزد": "Thief", "شارلاتان": "Charlatan",
      "دست راست پدرخوانده": "Right Hand", "سم‌ساز": "Poisoner", "جاسوس": "Spy",
      "جوکر مافیا": "Mafia Joker", "کیمیاگر": "Alchemist",
      "سندیکا": "Syndicate", "جانی": "Johnny", "گرگ‌نما": "Werewolf", "زامبی": "Zombie",
      "هزارچهره": "Shapeshifter", "دلقک": "Clown", "لوسیفر": "Lucifer", "خون‌آشام": "Vampire", "جلاد": "Executioner",
      "کانسور": "Counselor", "نینجا": "Ninja", "نمایش‌نامه‌نویس": "Playwright", "بادیگارد": "Bodyguard",
      "ضحاک": "Zahhak", "بوف": "Owl", "افراسیاب": "Afrasiab", "سیمرغ": "Simorgh",
      "جاماسب": "Jamasp", "کاوه": "Kaveh", "رستم": "Rostam", "آرش کمانگیر": "Arash the Archer"
    }
  },
  tr: {
    dir: "ltr",
    ui: {
      title: "ShowShung", newGame: "Yeni Oyun", currentGame: "Devam Eden", history: "Geçmiş",
      login: "Giriş", register: "Kayıt Ol", logout: "Çıkış",
      guestMsg: "Geçmişi kaydetmek için giriş yapın", gamesRecorded: "oyun kaydedildi",
      selectGroup: "🎯 Senaryo Seç", selectCount: "👥 Oyuncu Sayısı",
      startGame: "🎮 Oyunu Başlat", back: "◀ Geri", revealAll: "👁️ Tümünü Gör",
      closeCards: "🔄 Kartları Kapat", shuffle: "🎲 Karıştır", newGameBtn: "🆕 Yeni Oyun",
      tapHint: "Çevirmek için dokun", persons: "Oyuncu", mafia: "Mafya", citizen: "Vatandaş",
      historyTitle: "📚 Oyun Geçmişi", clearHistory: "Temizle",
      noGames: "Henüz oyun kaydedilmedi", loading: "Yükleniyor...",
      allRoles: "🎭 Tüm Roller", close: "Kapat",
      customGroup: "✏️ Özel Grup Oluştur", groupName: "Grup Adı",
      cardNamePlaceholder: "Kart adı (örn. Doktor)", addCard: "+ Ekle",
      noCards: "Henüz kart eklenmedi — oyuncu kartlarını girin",
      clearConfirm: "Geçmiş silinsin mi?",
      mafiaTeam: "😈 Mafya", citizenTeam: "😇 Vatandaş",
      groupDescs: { تکاور: "Taktik", بازپرس: "Soruşturma", نماینده: "Siyasi", مذاکره: "Vatandaş Kazan", "جایزه سر رئیس": "Patron Avı", دلخواه: "Özel", دیجیتال: "Dijital rol dağıtımı", "شب مافیا": "Tam rol seti", "کی‌اس": "Çevrimiçi 3 kişi", آزمایشی: "Çevrimiçi 10 kişi", میتیک: "12 kişi · Destansı", هانیبال: "10-13 kişi · Psikolojik", شاهنامه: "10 kişi · İran Destanı", دنتیست: "12 kişi · Üç taraflı savaş" },
      groupNames: { تکاور: "Akıncılar", بازپرس: "Dedektifler", نماینده: "Politikacılar", مذاکره: "Müzakere", "جایزه سر رئیس": "Patronun Başına Ödül", دلخواه: "Özel", دیجیتال: "Oyun Ustasız", "شب مافیا": "Mafya Gecesi", "کی‌اس": "KS", آزمایشی: "Beta", میتیک: "Mythic", هانیبال: "Hannibal", شاهنامه: "Şehname", دنتیست: "Dişçi" }
    },
    roles: {
      "رئیس مافیا": "Mafya Başı", "ناتو": "NATO Ajan", "شیاد": "Dolandırıcı", "گروگان‌گیر": "Rehine Alan",
      "هکر": "Hacker", "یاغی": "Haydut", "مافیا ساده": "Mafya", "مافیای ساده": "Mafya",
      "شهروند ساده": "Vatandaş", "بازپرس": "Sorgu Memuru", "کارآگاه": "Dedektif", "هانتر": "Avcı",
      "دکتر": "Doktor", "رویین‌تن": "Yenilmez", "راهنما": "Rehber", "مین‌گذار": "Bomba Uzmanı",
      "وکیل": "Avukat", "محافظ": "Koruyucu", "تفنگدار": "Nişancı", "نگهبان": "Bekçi", "تک‌تیرانداز": "Keskin Nişancı", "تکاور": "Komando", "سرباز": "Asker",
      "شهردار": "Belediye Başkanı", "قاضی": "Yargıç", "جان‌سخت": "Sert Adam", "دکتر لکتر": "Dr. Lecter", "بمب‌گذار": "Bombacı",
      "ناتاشا": "Natasha", "ترور": "Suikastçı", "کارگاه": "Atölye", "اسنایپر": "Sniper", "کشیش": "Papaz",
      "حرفه‌ای": "Profesyonel", "روان‌پزشک": "Psikiyatrist", "نخبه": "Seçkin", "شکارچی": "Yırtıcı",
      "زندانبان": "Gardiyan", "پرستار": "Hemşire", "انتقام‌جو": "İntikamcı", "کارآگاه ویژه": "Özel Dedektif",
      "نانوا": "Fırıncı", "خبرنگار": "Muhabir", "صداپیشه": "Seslendirme Sanatçısı", "شاهد": "Tanık",
      "قهرمان": "Kahraman", "جادوگر": "Büyücü",
      "پدرخوانده": "Baba", "معشوقه": "Metres", "روانکاو": "Psikanalist", "شاه‌کش": "Kral Katili",
      "تروریست": "Terörist", "مذاکره‌کننده": "Müzakereci", "دزد": "Hırsız", "شارلاتان": "Şarlatan",
      "دست راست پدرخوانده": "Sağ Kol", "سم‌ساز": "Zehirci", "جاسوس": "Casus",
      "جوکر مافیا": "Mafya Jokeri", "کیمیاگر": "Simyacı",
      "سندیکا": "Sendika", "جانی": "Johnny", "گرگ‌نما": "Kurt Adam", "زامبی": "Zombi",
      "هزارچهره": "Bin Yüzlü", "دلقک": "Palyaço", "لوسیفر": "Lucifer", "خون‌آشام": "Vampir", "جلاد": "Cellat",
      "کانسور": "Danışman", "نینجا": "Ninja", "نمایش‌نامه‌نویس": "Oyun Yazarı", "بادیگارد": "Koruyucu",
      "ضحاک": "Zahhak", "بوف": "Baykuş", "افراسیاب": "Afrasyab", "سیمرغ": "Simurg",
      "جاماسب": "Jamasp", "کاوه": "Kave", "رستم": "Rüstem", "آرش کمانگیر": "Okçu Araş"
    }
  }
};

let currentLang = localStorage.getItem("mafiaLang") || "fa";

function t(key) {
  return (LANG[currentLang] && LANG[currentLang].ui[key]) || LANG.fa.ui[key] || key;
}

function translateRole(name) {
  return (LANG[currentLang] && LANG[currentLang].roles[name]) || name;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("mafiaLang", lang);
  applyLang();
}

function applyLang() {
  const L = LANG[currentLang];
  document.documentElement.lang = currentLang;
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("lang-active", b.dataset.lang === currentLang));

  const upd = {
    "navNewGame": t("newGame"), "navHistory": t("history"),
    "loginBtn": t("login"), "registerBtn": t("register"), "logoutBtn": t("logout"),
    "guestMsg": t("guestMsg"), "startBtn": t("startGame"),
    "btnRevealAll": t("revealAll"), "btnFlipBack": t("closeCards"),
    "btnShuffle": t("shuffle"), "btnNewGame": t("newGameBtn"), "btnBack": t("back"),
  };
  Object.entries(upd).forEach(([id, txt]) => { const el = document.getElementById(id); if (el) el.textContent = txt; });

  const sep = '<span style="flex:1;height:1px;background:rgba(255,255,255,.07);margin-right:10px;display:inline-block"></span>';
  const setupH = document.getElementById("setupHeading");
  if (setupH) setupH.innerHTML = t("selectGroup") + sep;
  const customH = document.querySelector("#customForm .section-title");
  if (customH) customH.innerHTML = t("customGroup") + sep;

  document.querySelectorAll(".group-btn").forEach(b => {
    const g = b.dataset.group;
    if (g && L.ui.groupNames[g]) { b.querySelector(".name").textContent = L.ui.groupNames[g]; b.querySelector(".desc").textContent = L.ui.groupDescs[g]; }
  });

  const histH = document.querySelector("#historyScreen h2"); if (histH) histH.textContent = t("historyTitle");
  const custLbl = document.querySelector("#customName")?.previousElementSibling; if (custLbl) custLbl.textContent = t("groupName");
  document.getElementById("newCardName")?.setAttribute("placeholder", t("cardNamePlaceholder"));
  document.querySelector(".add-card-btn") && (document.querySelector(".add-card-btn").textContent = t("addCard"));

  if (state.cards.length) showCurrentCard();
  if (document.getElementById("historyScreen").classList.contains("active")) renderHistory();
}

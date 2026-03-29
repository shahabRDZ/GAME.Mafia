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
      groupDescs: { تکاور: "سبک تاکتیکی", بازپرس: "سبک تحقیقاتی", نماینده: "سبک سیاسی", دلخواه: "سفارشی‌سازی" },
      groupNames: { تکاور: "تکاور", بازپرس: "بازپرس", نماینده: "نماینده", دلخواه: "دلخواه" }
    },
    roles: {
      "رئیس مافیا": "رئیس مافیا", "ناتو": "ناتو", "شیاد": "شیاد", "گروگان‌گیر": "گروگان‌گیر",
      "هکر": "هکر", "یاغی": "یاغی", "مافیا ساده": "مافیا ساده",
      "شهروند ساده": "شهروند ساده", "بازپرس": "بازپرس", "کارآگاه": "کارآگاه", "هانتر": "هانتر",
      "دکتر": "دکتر", "رویین‌تن": "رویین‌تن", "راهنما": "راهنما", "مین‌گذار": "مین‌گذار",
      "وکیل": "وکیل", "محافظ": "محافظ", "تفنگدار": "تفنگدار", "نگهبان": "نگهبان", "تک‌تیرانداز": "تک‌تیرانداز", "سرباز": "سرباز"
    }
  },
  en: {
    dir: "ltr",
    ui: {
      title: "SHUSHANG", newGame: "New Game", currentGame: "Current Game", history: "History",
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
      groupDescs: { تکاور: "Tactical", بازپرس: "Investigation", نماینده: "Political", دلخواه: "Custom" },
      groupNames: { تکاور: "Rangers", بازپرس: "Detectives", نماینده: "Politicians", دلخواه: "Custom" }
    },
    roles: {
      "رئیس مافیا": "Mafia Boss", "ناتو": "NATO Agent", "شیاد": "Swindler", "گروگان‌گیر": "Kidnapper",
      "هکر": "Hacker", "یاغی": "Outlaw", "مافیا ساده": "Mafia",
      "شهروند ساده": "Citizen", "بازپرس": "Interrogator", "کارآگاه": "Detective", "هانتر": "Hunter",
      "دکتر": "Doctor", "رویین‌تن": "Invincible", "راهنما": "Guide", "مین‌گذار": "Bomb Expert",
      "وکیل": "Lawyer", "محافظ": "Bodyguard", "تفنگدار": "Rifleman", "نگهبان": "Guard", "تک‌تیرانداز": "Sniper", "سرباز": "Soldier"
    }
  },
  tr: {
    dir: "ltr",
    ui: {
      title: "SHUSHANG", newGame: "Yeni Oyun", currentGame: "Devam Eden", history: "Geçmiş",
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
      groupDescs: { تکاور: "Taktik", بازپرس: "Soruşturma", نماینده: "Siyasi", دلخواه: "Özel" },
      groupNames: { تکاور: "Akıncılar", بازپرس: "Dedektifler", نماینده: "Politikacılar", دلخواه: "Özel" }
    },
    roles: {
      "رئیس مافیا": "Mafya Başı", "ناتو": "NATO Ajan", "شیاد": "Dolandırıcı", "گروگان‌گیر": "Rehine Alan",
      "هکر": "Hacker", "یاغی": "Haydut", "مافیا ساده": "Mafya",
      "شهروند ساده": "Vatandaş", "بازپرس": "Sorgu Memuru", "کارآگاه": "Dedektif", "هانتر": "Avcı",
      "دکتر": "Doktor", "رویین‌تن": "Yenilmez", "راهنما": "Rehber", "مین‌گذار": "Bomba Uzmanı",
      "وکیل": "Avukat", "محافظ": "Koruyucu", "تفنگدار": "Nişancı", "نگهبان": "Bekçi", "تک‌تیرانداز": "Keskin Nişancı", "سرباز": "Asker"
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
  document.documentElement.dir = L.dir;
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("lang-active", b.dataset.lang === currentLang));

  const upd = {
    "navNewGame": t("newGame"), "navHistory": t("history"),
    "loginBtn": t("login"), "registerBtn": t("register"), "logoutBtn": t("logout"),
    "guestMsg": t("guestMsg"), "startBtn": t("startGame"),
    "btnRevealAll": t("revealAll"), "btnFlipBack": t("closeCards"),
    "btnShuffle": t("shuffle"), "btnNewGame": t("newGameBtn"), "btnBack": t("back"),
  };
  Object.entries(upd).forEach(([id, txt]) => { const el = document.getElementById(id); if (el) el.textContent = txt; });

  const secTitles = document.querySelectorAll(".section-title");
  if (secTitles[0]) secTitles[0].innerHTML = t("selectGroup") + '<span style="flex:1;height:1px;background:rgba(255,255,255,.07);margin-right:10px;display:inline-block"></span>';
  if (secTitles[1]) secTitles[1].innerHTML = t("customGroup") + '<span style="flex:1;height:1px;background:rgba(255,255,255,.07);margin-right:10px;display:inline-block"></span>';
  if (secTitles[2]) secTitles[2].innerHTML = t("selectCount") + '<span style="flex:1;height:1px;background:rgba(255,255,255,.07);margin-right:10px;display:inline-block"></span>';

  document.querySelectorAll(".group-btn").forEach(b => {
    const g = b.dataset.group;
    if (g && L.ui.groupNames[g]) { b.querySelector(".name").textContent = L.ui.groupNames[g]; b.querySelector(".desc").textContent = L.ui.groupDescs[g]; }
  });

  const histH = document.querySelector("#historyScreen h2"); if (histH) histH.textContent = t("historyTitle");
  const custLbl = document.querySelector("#customName")?.previousElementSibling; if (custLbl) custLbl.textContent = t("groupName");
  document.getElementById("newCardName")?.setAttribute("placeholder", t("cardNamePlaceholder"));
  document.querySelector(".add-card-btn") && (document.querySelector(".add-card-btn").textContent = t("addCard"));
  document.getElementById("btnMafia") && (document.getElementById("btnMafia").textContent = t("mafiaTeam"));
  document.getElementById("btnCitizen") && (document.getElementById("btnCitizen").textContent = t("citizenTeam"));

  if (state.cards.length) showCurrentCard();
  if (document.getElementById("historyScreen").classList.contains("active")) renderHistory();
}

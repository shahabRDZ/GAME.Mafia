/* ── Scenario Tutorial Data & Overlay ── */

const SCENARIO_INFO = {
  "تکاور": {
    icon: "⚔️",
    color: "#e94560",
    fa: {
      title: "سناریو تکاور", subtitle: "سبک تاکتیکی · شبکه سلامت",
      intro: "سناریوی تکاور دارای تعادل بالا بین نقش‌ها و استدلال‌محور است. نسبت مافیا به شهروند نزدیک ۱/۳ است.",
      flow: ["روز معارفه","شب معارفه (بدون شلیک)","روز اول (بحث + رأی‌گیری)","شب‌های اصلی (اجرای نقش‌ها)","روزها (اعلام نتایج + رأی‌گیری)"],
      rules: ["مافیا: شلیک یا ناتویی","ناتویی: حذف شلیک","نقش‌های اطلاعاتی همچنان فعال"],
      quorum: [{range:"۱۵–۱۱ نفر",votes:"۶ رأی"},{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Commando Scenario", subtitle: "Tactical Style · Health Network",
      intro: "The Commando scenario has high balance between roles and is reasoning-based. The mafia-to-citizen ratio is approximately 1/3.",
      flow: ["Introduction Day","Introduction Night (no shot)","Day 1 (discussion + voting)","Main Nights (role actions)","Days (announce results + voting)"],
      rules: ["Mafia: shoot or NATO","NATO: cancel shot","Information roles remain active"],
      quorum: [{range:"15–11 players",votes:"6 votes"},{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5 or less",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Komando Senaryosu", subtitle: "Taktik Stil · Sağlık Ağı",
      intro: "Komando senaryosu roller arasında yüksek denge sunar ve akıl yürütmeye dayalıdır. Mafya-vatandaş oranı yaklaşık 1/3'tür.",
      flow: ["Tanışma Günü","Tanışma Gecesi (ateş yok)","1. Gün (tartışma + oylama)","Ana Geceler (rol eylemleri)","Günler (sonuçlar + oylama)"],
      rules: ["Mafya: ateş veya NATO","NATO: ateşi iptal","Bilgi rolleri aktif kalır"],
      quorum: [{range:"15–11 oyuncu",votes:"6 oy"},{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"رئیس مافیا", fa:"رهبر تیم مافیا · تصمیم‌گیر نهایی شلیک", en:"Mafia leader · Final shot decision", tr:"Mafya lideri · Son ateş kararı", icon:"👑"},
        {name:"ناتو", fa:"حذف شلیک مافیا · قدرت ناتویی", en:"Cancel mafia shot · NATO power", tr:"Mafya ateşini iptal · NATO gücü", icon:"🔫"},
        {name:"گروگان‌گیر", fa:"گروگان‌گیری بازیکنان · ایجاد اختلال", en:"Kidnap players · Create disruption", tr:"Oyuncu rehin alma · Kaos yaratma", icon:"💣"},
        {name:"مافیا ساده", fa:"عضو تیم مافیا · هماهنگی در شب", en:"Mafia member · Night coordination", tr:"Mafya üyesi · Gece koordinasyonu", icon:"😈"}
      ],
      citizen: [
        {name:"تفنگدار", fa:"پخش تفنگ در شب", en:"Distribute guns at night", tr:"Gece silah dağıtımı", icon:"🎯"},
        {name:"دکتر", fa:"نجات بازیکنان در شب · کنترل حذف‌ها", en:"Save players at night · Control eliminations", tr:"Gece oyuncuları kurtarma", icon:"⚕️"},
        {name:"کارآگاه", fa:"استعلام مستقیم مافیا بودن افراد", en:"Direct inquiry if someone is mafia", tr:"Birinin mafya olup olmadığını sorgulama", icon:"🕵️"},
        {name:"نگهبان", fa:"محافظت از بازیکنان · جلوگیری از حمله", en:"Protect players · Prevent attacks", tr:"Oyuncuları koruma · Saldırıları önleme", icon:"👮"},
        {name:"تک‌تیرانداز", fa:"شلیک دقیق · حذف هدفمند", en:"Precise shot · Targeted elimination", tr:"Keskin atış · Hedefli eleme", icon:"🎯"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "نماینده": {
    icon: "🏛️",
    color: "#f5a623",
    fa: {
      title: "سناریو نماینده", subtitle: "سبک سیاسی · تعامل بالا",
      intro: "سناریوی نماینده بر پایه تعادل بین استدلال روز و قابلیت شب طراحی شده. تعامل بالا بین نقش‌ها و مدیریت تصمیم‌ها از ویژگی‌های اصلی است.",
      flow: ["روز معارفه","شب اول (بدون شلیک)","روز اول (بحث + انتخاب نماینده)","شب‌های اصلی","روزها (نماینده مدیریت رأی‌گیری)"],
      rules: ["نماینده با رأی انتخاب می‌شود","نماینده نقش مدیریتی در تصمیم‌ها دارد","هکر می‌تواند نقش‌ها را مختل کند","یاغی قدرت حمله مستقل دارد"],
      quorum: [{range:"۱۵–۱۱ نفر",votes:"۶ رأی"},{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Politicians Scenario", subtitle: "Political Style · High Interaction",
      intro: "The Politicians scenario balances day reasoning and night abilities. High interaction between roles and decision management are its key features.",
      flow: ["Introduction Day","Night 1 (no shot)","Day 1 (discussion + elect representative)","Main Nights","Days (representative manages voting)"],
      rules: ["Representative elected by vote","Representative manages decisions","Hacker can disrupt roles","Rebel has independent attack power"],
      quorum: [{range:"15–11 players",votes:"6 votes"},{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5 or less",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Politikacılar Senaryosu", subtitle: "Siyasi Stil · Yüksek Etkileşim",
      intro: "Politikacılar senaryosu gündüz akıl yürütme ve gece yetenekleri arasında denge kurar. Roller arası yüksek etkileşim temel özelliğidir.",
      flow: ["Tanışma Günü","1. Gece (ateş yok)","1. Gün (tartışma + temsilci seçimi)","Ana Geceler","Günler (temsilci oylamayı yönetir)"],
      rules: ["Temsilci oyla seçilir","Temsilci kararları yönetir","Hacker rolleri bozabilir","Asi bağımsız saldırı gücüne sahip"],
      quorum: [{range:"15–11 oyuncu",votes:"6 oy"},{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"رئیس مافیا", fa:"رهبر تیم · تصمیم‌گیر شلیک", en:"Team leader · Shot decision", tr:"Takım lideri · Ateş kararı", icon:"👑"},
        {name:"هکر", fa:"اختلال در نقش‌های شهروند · هک قابلیت‌ها", en:"Disrupt citizen roles · Hack abilities", tr:"Vatandaş rollerini boz · Yetenekleri hackle", icon:"💻"},
        {name:"یاغی", fa:"حمله مستقل · عمل خارج از تیم", en:"Independent attack · Acts outside team", tr:"Bağımsız saldırı · Takım dışı hareket", icon:"🗡️"},
        {name:"ناتو", fa:"حذف شلیک مافیا · قدرت ناتویی", en:"Cancel mafia shot · NATO power", tr:"Mafya ateşini iptal · NATO gücü", icon:"🔫"}
      ],
      citizen: [
        {name:"وکیل", fa:"دفاع از بازیکنان · لغو رأی حذف", en:"Defend players · Cancel elimination vote", tr:"Oyuncuları savun · Eleme oyunu iptal", icon:"⚖️"},
        {name:"دکتر", fa:"نجات بازیکنان در شب", en:"Save players at night", tr:"Gece oyuncuları kurtarma", icon:"⚕️"},
        {name:"مین‌گذار", fa:"کارگذاری مین · حذف مهاجم", en:"Plant mine · Eliminate attacker", tr:"Mayın yerleştir · Saldırganı ele", icon:"💥"},
        {name:"محافظ", fa:"محافظت فیزیکی از بازیکنان", en:"Physical protection of players", tr:"Oyuncuların fiziksel korunması", icon:"🛡️"},
        {name:"راهنما", fa:"هدایت تیم شهروند · اطلاعات محدود", en:"Guide citizen team · Limited info", tr:"Vatandaş takımını yönlendir", icon:"🧭"},
        {name:"سرباز", fa:"توان دفاعی · مقاومت در برابر حمله", en:"Defensive power · Resist attacks", tr:"Savunma gücü · Saldırılara diren", icon:"🪖"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "بازپرس": {
    icon: "🔍",
    color: "#00cfff",
    fa: {
      title: "سناریو بازپرس", subtitle: "سبک تحقیقاتی · تحلیل اطلاعات",
      intro: "سناریوی بازپرس بر پایه تحلیل اطلاعات، استعلام‌ها و مدیریت داده طراحی شده است. تمرکز اصلی روی نقش‌های اطلاعاتی و تعامل آن‌ها است.",
      flow: ["روز معارفه","شب اول (استعلام اولیه)","روز اول (تحلیل + بحث)","شب‌ها (استعلام + بررسی)","روزها (ارائه تحلیل + رأی‌گیری)"],
      rules: ["تمرکز بر تحلیل منطقی","اهمیت تعامل بین نقش‌های اطلاعاتی","کاهش نقش‌های قدرتی · افزایش نقش‌های فکری","مناسب برای بازی‌های استدلالی و حرفه‌ای"],
      quorum: [{range:"۱۵–۱۱ نفر",votes:"۶ رأی"},{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Investigator Scenario", subtitle: "Investigation Style · Data Analysis",
      intro: "The Investigator scenario is built on data analysis, inquiries and information management. The focus is on information roles and their interactions.",
      flow: ["Introduction Day","Night 1 (initial inquiry)","Day 1 (analysis + discussion)","Nights (inquiry + investigation)","Days (present analysis + voting)"],
      rules: ["Focus on logical analysis","Importance of information role interactions","Fewer power roles · More intellectual roles","Ideal for reasoning-based professional games"],
      quorum: [{range:"15–11 players",votes:"6 votes"},{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5 or less",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Müfettiş Senaryosu", subtitle: "Soruşturma Stili · Veri Analizi",
      intro: "Müfettiş senaryosu veri analizi, sorgulamalar ve bilgi yönetimi üzerine kurulmuştur. Odak noktası bilgi rolleri ve etkileşimleridir.",
      flow: ["Tanışma Günü","1. Gece (ilk sorgulama)","1. Gün (analiz + tartışma)","Geceler (sorgulama + araştırma)","Günler (analiz sunumu + oylama)"],
      rules: ["Mantıksal analize odaklan","Bilgi rolleri etkileşimi önemli","Daha az güç rolü · Daha çok düşünce rolü","Akıl yürütme oyunları için ideal"],
      quorum: [{range:"15–11 oyuncu",votes:"6 oy"},{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"رئیس مافیا", fa:"رهبر تیم مافیا · تصمیم‌گیر نهایی", en:"Mafia leader · Final decision maker", tr:"Mafya lideri · Son karar verici", icon:"👑"},
        {name:"ناتو", fa:"حذف شلیک · قدرت ناتویی", en:"Cancel shot · NATO power", tr:"Ateşi iptal · NATO gücü", icon:"🔫"},
        {name:"شیاد", fa:"فریب و اختلال در استعلام‌ها", en:"Deceive and disrupt inquiries", tr:"Aldatma ve sorgulamaları bozma", icon:"🃏"},
        {name:"مافیا ساده", fa:"هماهنگی برای حذف شهروندان", en:"Coordinate to eliminate citizens", tr:"Vatandaşları elemek için koordinasyon", icon:"😈"}
      ],
      citizen: [
        {name:"بازپرس", fa:"بررسی رفتار و ارتباطات · تحلیل استعلام‌ها", en:"Analyze behavior · Process inquiries", tr:"Davranış analizi · Sorgulamaları işle", icon:"🔍"},
        {name:"کارآگاه", fa:"استعلام مستقیم مافیا بودن افراد", en:"Direct inquiry if someone is mafia", tr:"Birinin mafya olup olmadığını sorgulama", icon:"🕵️"},
        {name:"هانتر", fa:"شکارچی · حذف هدفمند بازیکنان", en:"Hunter · Targeted player elimination", tr:"Avcı · Hedefli oyuncu eleme", icon:"🏹"},
        {name:"دکتر", fa:"نجات بازیکنان در شب · کنترل حذف‌ها", en:"Save players at night · Control eliminations", tr:"Gece oyuncuları kurtar · Elemeleri kontrol et", icon:"⚕️"},
        {name:"رویین‌تن", fa:"مقاومت در برابر حمله · زره‌دار", en:"Resist attacks · Armored", tr:"Saldırılara diren · Zırhlı", icon:"🛡️"},
        {name:"تک‌تیرانداز", fa:"شلیک دقیق · حذف هدفمند", en:"Precise shot · Targeted elimination", tr:"Keskin atış · Hedefli eleme", icon:"🎯"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "مذاکره": {
    icon: "🤝",
    color: "#a855f7",
    fa: {
      title: "سناریو مذاکره", subtitle: "جذب شهروند · تغییر تیم",
      intro: "سناریوی مذاکره بر پایه قدرت جذب مافیا طراحی شده. مذاکره‌کننده می‌تواند شهروندان ساده یا زره‌پوش را به تیم مافیا بکشاند. در شب مذاکره، مافیا حق شلیک ندارد.",
      flow: ["روز معارفه","شب اول (بدون شلیک)","روز اول (بحث + رأی‌گیری)","شب‌های اصلی (شلیک یا مذاکره)","روزها (اعلام نتایج + رأی‌گیری)"],
      rules: ["مذاکره فقط پس از حذف یک مافیا فعال می‌شود","در شب مذاکره، مافیا شلیک ندارد","مذاکره با شهروند ساده یا زره‌پوش موفق است","مذاکره با نقش‌دارها (دکتر، کارآگاه و...) شکست می‌خورد","استعلام پدرخوانده برای کارآگاه منفی است","اسنایپر ۲ تیر دارد · شلیک به شهروند = حذف خودش"],
      quorum: [{range:"۱۳–۱۱ نفر",votes:"۶ رأی"},{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Negotiation Scenario", subtitle: "Recruit Citizens · Team Switch",
      intro: "The Negotiation scenario is based on mafia's power to recruit. The Negotiator can turn simple citizens or the Armored into mafia. On negotiation nights, mafia cannot shoot.",
      flow: ["Introduction Day","Night 1 (no shot)","Day 1 (discussion + voting)","Main Nights (shoot or negotiate)","Days (announce results + voting)"],
      rules: ["Negotiation activates only after one mafia is eliminated","No mafia shot on negotiation night","Negotiation succeeds on simple citizens or Armored","Negotiation fails on special roles (Doctor, Detective, etc.)","Godfather's inquiry always shows negative","Sniper has 2 bullets · shooting a citizen eliminates self"],
      quorum: [{range:"13–11 players",votes:"6 votes"},{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5 or less",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Müzakere Senaryosu", subtitle: "Vatandaş Kazanma · Takım Değişimi",
      intro: "Müzakere senaryosu mafyanın kazanma gücüne dayanır. Müzakereci basit vatandaşları veya Zırhlıyı mafyaya çevirebilir. Müzakere gecelerinde mafya ateş edemez.",
      flow: ["Tanışma Günü","1. Gece (ateş yok)","1. Gün (tartışma + oylama)","Ana Geceler (ateş veya müzakere)","Günler (sonuçlar + oylama)"],
      rules: ["Müzakere yalnızca bir mafya elendikten sonra aktif olur","Müzakere gecesi mafya ateş edemez","Basit vatandaş veya Zırhlı ile müzakere başarılı","Özel rollerle müzakere başarısız","Baba'nın sorgusu her zaman negatif","Keskin nişancının 2 mermisi var · vatandaşa ateş = kendini ele"],
      quorum: [{range:"13–11 oyuncu",votes:"6 oy"},{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"پدرخوانده", fa:"رهبر مافیا · تصمیم شلیک · استعلام منفی", en:"Mafia leader · Shot decision · Negative inquiry", tr:"Mafya lideri · Ateş kararı · Negatif sorgulama", icon:"👑"},
        {name:"مذاکره‌کننده", fa:"جذب شهروند به مافیا · شب مذاکره بدون شلیک", en:"Recruit citizen to mafia · No shot on negotiation night", tr:"Vatandaşı mafyaya kazan · Müzakere gecesi ateş yok", icon:"🤝"},
        {name:"مافیا ساده", fa:"هماهنگی در شب · جهت‌دهی آرا در روز", en:"Night coordination · Guide votes during day", tr:"Gece koordinasyonu · Gündüz oyları yönlendir", icon:"😈"}
      ],
      citizen: [
        {name:"کارآگاه", fa:"استعلام شبانه · پدرخوانده منفی نشان داده می‌شود", en:"Night inquiry · Godfather shows negative", tr:"Gece sorgulama · Baba negatif görünür", icon:"🕵️"},
        {name:"دکتر", fa:"نجات یک نفر در شب از شلیک مافیا", en:"Save one player at night from mafia shot", tr:"Gece bir oyuncuyu mafya ateşinden kurtar", icon:"⚕️"},
        {name:"تک‌تیرانداز", fa:"۲ تیر · شلیک به شهروند = حذف خودش", en:"2 bullets · Shooting citizen = self elimination", tr:"2 mermi · Vatandaşa ateş = kendini ele", icon:"🎯"},
        {name:"خبرنگار", fa:"بعد از شب مذاکره نتیجه را می‌فهمد", en:"Learns negotiation result after negotiation night", tr:"Müzakere gecesinden sonra sonucu öğrenir", icon:"📰"},
        {name:"زره‌پوش", fa:"شلیک شب اثر ندارد · رأی روز = زره می‌افتد", en:"Immune to night shot · Day vote = loses armor", tr:"Gece ateşine bağışık · Gündüz oyu = zırhı düşer", icon:"🛡️"},
        {name:"روانشناس", fa:"سایلنت کردن یک نفر در روز", en:"Silence one player during day", tr:"Gündüz bir oyuncuyu sustur", icon:"🧠"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "جایزه سر رئیس": {
    icon: "💰",
    color: "#fbbf24",
    fa: {
      title: "سناریو جایزه سر رئیس", subtitle: "شکار رئیس مافیا · هیجان بالا",
      intro: "سناریوی جایزه سر رئیس بر پایه شکار رئیس مافیا طراحی شده. اگر رئیس مافیا با رأی شهر یا تیر تکاور حذف شود، شهروندان بلافاصله برنده می‌شوند. تعادل میان نقش‌های قدرتی و استدلالی بالا است.",
      flow: ["روز معارفه","شب اول (بدون شلیک)","روز اول (بحث + رأی‌گیری)","شب‌های اصلی (اجرای نقش‌ها)","روزها (اعلام نتایج + رأی‌گیری)"],
      rules: ["حذف رئیس مافیا = برد فوری شهر","استعلام رئیس مافیا برای کارآگاه منفی است","تکاور ۲ تیر دارد · شلیک به شهروند = حذف خودش","جراح (دکتر لکتر) فقط یک بار خودش را نجات می‌دهد","شهردار حق وتو در رأی‌گیری دارد","جان‌سخت با تیر اول مافیا نمی‌میرد"],
      quorum: [{range:"۱۵–۱۱ نفر",votes:"۶ رأی"},{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Bounty on the Boss", subtitle: "Hunt the Mafia Boss · High Thrill",
      intro: "The Bounty on the Boss scenario is built around hunting down the mafia leader. If the Godfather is eliminated by city vote or sniper shot, citizens win immediately. Strong balance between power and reasoning roles.",
      flow: ["Introduction Day","Night 1 (no shot)","Day 1 (discussion + voting)","Main Nights (role actions)","Days (announce results + voting)"],
      rules: ["Eliminating the Godfather = instant city win","Godfather's inquiry shows negative to Detective","Commando has 2 bullets · shooting citizen = self elimination","Surgeon (Dr. Lecter) saves self only once","Mayor has veto in voting","Tough Guy survives the first mafia shot"],
      quorum: [{range:"15–11 players",votes:"6 votes"},{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5 or less",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Patronun Başına Ödül", subtitle: "Mafya Lideri Avı · Yüksek Heyecan",
      intro: "Patronun Başına Ödül senaryosu mafya liderini avlamaya dayanır. Baba şehir oyu veya keskin nişancı ateşiyle elenirse vatandaşlar anında kazanır. Güç ve akıl yürütme rolleri arasında güçlü denge.",
      flow: ["Tanışma Günü","1. Gece (ateş yok)","1. Gün (tartışma + oylama)","Ana Geceler (rol eylemleri)","Günler (sonuçlar + oylama)"],
      rules: ["Baba'nın elenmesi = anında şehir galibiyeti","Baba'nın sorgusu Dedektife negatif görünür","Komando 2 mermi · vatandaşa ateş = kendini ele","Cerrah (Dr. Lecter) kendini yalnız bir kez kurtarır","Belediye Başkanı oylamada veto hakkına sahip","Sert Adam ilk mafya ateşinden ölmez"],
      quorum: [{range:"15–11 oyuncu",votes:"6 oy"},{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"رئیس مافیا", fa:"رهبر تیم · حذف او = برد فوری شهر · استعلام منفی", en:"Team leader · Elimination = instant city win · Negative inquiry", tr:"Takım lideri · Elenmesi = şehir kazanır · Negatif sorgulama", icon:"👑"},
        {name:"ناتاشا", fa:"هر شب یک بازیکن را فریب می‌دهد · توانایی شبانه هدف را خنثی می‌کند", en:"Seduces a player each night · Neutralises target's night action", tr:"Her gece bir oyuncuyu baştan çıkarır · Hedefin gece eylemini etkisiz kılar", icon:"💃"},
        {name:"ترور", fa:"عملیات ترور · حذف هدف مشخص در شب", en:"Assassination mission · Eliminate designated target at night", tr:"Suikast operasyonu · Gece belirlenen hedefi etkisiz hale getir", icon:"🗡️"},
        {name:"وکیل", fa:"محافظت از یک عضو مافیا در برابر رأی حذف", en:"Protect a mafia member from elimination vote", tr:"Bir mafya üyesini eleme oyundan koru", icon:"📜"},
        {name:"مافیا ساده", fa:"تیراندازی شبانه همراه با تیم مافیا", en:"Night shooting alongside the mafia team", tr:"Mafya takımıyla gece atışı", icon:"😈"}
      ],
      citizen: [
        {name:"قاضی", fa:"تغییر رأی نهایی دادگاه · صدور حکم", en:"Change final court vote · Issue ruling", tr:"Son mahkeme oyunu değiştir · Hüküm ver", icon:"⚖️"},
        {name:"دکتر", fa:"نجات یک نفر در شب از تیر مافیا", en:"Save a player at night from mafia shot", tr:"Gece bir oyuncuyu mafya ateşinden kurtar", icon:"⚕️"},
        {name:"کارگاه", fa:"هر شب اطلاعاتی از تیم مافیا دریافت می‌کند", en:"Receives intel about the mafia team each night", tr:"Her gece mafya takımı hakkında bilgi alır", icon:"🔧"},
        {name:"اسنایپر", fa:"یک تیر · شلیک به رئیس مافیا = برد فوری شهر", en:"One bullet · Shooting the boss = instant city win", tr:"Bir mermi · Patronu vurursa şehir anında kazanır", icon:"🎯"},
        {name:"کشیش", fa:"یک بار در بازی از حذف یک بازیکن جلوگیری می‌کند", en:"Once per game prevents a player's elimination", tr:"Oyun başına bir kez bir oyuncunun elenmesini önler", icon:"⛪"},
        {name:"محافظ", fa:"هر شب از یک بازیکن محافظت می‌کند · تیر مافیا را جذب می‌کند", en:"Guards a player each night · Absorbs mafia shot", tr:"Her gece bir oyuncuyu korur · Mafya ateşini emer", icon:"🛡️"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "میتیک": {
    icon: "⚜️",
    color: "#ffd700",
    fa: {
      title: "سناریو میتیک", subtitle: "۱۲ نفره · نقش‌های حماسی",
      intro: "میتیک یک سناریوی ۱۲ نفره با نقش‌های قدرتمند و استراتژیک است. تیم مافیا با چهار نقش ویژه در برابر شهر حیله‌گر قرار می‌گیرد. هر نقش توانایی منحصربه‌فردی دارد که ترکیب آن‌ها پیروزی را تعیین می‌کند.",
      flow: ["روز معارفه","شب اول (بدون شلیک)","روز اول (بحث + رأی‌گیری)","شب‌های اصلی (اجرای نقش‌ها)","روزها (اعلام نتایج + رأی‌گیری)"],
      rules: ["استعلام رئیس مافیا برای کارآگاه (کارگاه) منفی است","کانسور هر شب توانایی یک بازیکن را مسدود می‌کند","نینجا بدون صدا حذف می‌کند · شب‌هنگام کشته‌ای اعلام نمی‌شود","تروریست با رأی حذف در روز، یک نفر را همراه خود می‌برد","اسنایپر یک تیر دارد · شلیک به رئیس = برد فوری شهر","کارگاه هر شب یک اطلاعات از تیم مافیا می‌گیرد"],
      quorum: [{range:"۱۲–۱۰ نفر",votes:"۵ رأی"},{range:"۹–۷ نفر",votes:"۴ رأی"},{range:"۶–۵ نفر",votes:"۳ رأی"},{range:"۴ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — شروع بازی ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند"
    },
    en: {
      title: "Mythic Scenario", subtitle: "12 Players · Epic Roles",
      intro: "Mythic is a 12-player scenario with powerful and strategic roles. The mafia team with four unique roles faces a cunning city. Each role has a unique ability that together decides victory.",
      flow: ["Introduction Day","Night 1 (no shot)","Day 1 (discussion + voting)","Main Nights (role actions)","Days (announce results + voting)"],
      rules: ["Godfather shows negative to Detective (Workshop)","Counselor blocks one player's ability each night","Ninja eliminates silently · no death announcement at night","Terrorist takes one player down when eliminated by vote","Sniper has one bullet · shooting the boss = instant city win","Workshop receives one piece of intel about the mafia each night"],
      quorum: [{range:"12–10 players",votes:"5 votes"},{range:"9–7 players",votes:"4 votes"},{range:"6–5 players",votes:"3 votes"},{range:"4 or less",votes:"2 votes"}],
      proceed: "Continue — Start Game ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles"
    },
    tr: {
      title: "Mythic Senaryosu", subtitle: "12 Oyuncu · Destansı Roller",
      intro: "Mythic, güçlü ve stratejik rollerle oynanan 12 kişilik bir senaryodur. Dört özel rolle mafya takımı zeki şehre karşı çıkar. Her rolün benzersiz yeteneği galibiyeti belirler.",
      flow: ["Tanışma Günü","1. Gece (ateş yok)","1. Gün (tartışma + oylama)","Ana Geceler (rol eylemleri)","Günler (sonuçlar + oylama)"],
      rules: ["Baba Dedektife (Atölye) negatif görünür","Danışman her gece bir oyuncunun yeteneğini engeller","Ninja sessizce eliyor · gece ölüm duyurulmuyor","Terörist gündüz oyla elenince birini yanında götürür","Sniper bir mermi var · Patronu vurursa şehir anında kazanır","Atölye her gece mafya hakkında bir bilgi alır"],
      quorum: [{range:"12–10 oyuncu",votes:"5 oy"},{range:"9–7 oyuncu",votes:"4 oy"},{range:"6–5 oyuncu",votes:"3 oy"},{range:"4 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyunu Başlat ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri"
    },
    roles: {
      mafia: [
        {name:"رئیس مافیا", fa:"رهبر تیم · استعلام کارآگاه برای او منفی است", en:"Team leader · Detective inquiry shows negative", tr:"Takım lideri · Dedektif sorgusu negatif çıkar", icon:"👑"},
        {name:"کانسور", fa:"مشاور تیم · هر شب توانایی یک بازیکن را مسدود می‌کند", en:"Team advisor · Blocks one player's ability each night", tr:"Takım danışmanı · Her gece bir oyuncunun yeteneğini engeller", icon:"🧠"},
        {name:"نینجا", fa:"قاتل خاموش · حذف می‌کند بدون اعلام کشته", en:"Silent killer · Eliminates without announcing the death", tr:"Sessiz katil · Ölümü duyurmadan eleyen", icon:"🥷"},
        {name:"تروریست", fa:"با رأی حذف در روز، یک بازیکن را همراه خود می‌برد", en:"When eliminated by vote, takes one player along", tr:"Gündüz oyla elenince bir oyuncuyu yanında götürür", icon:"💣"}
      ],
      citizen: [
        {name:"دکتر", fa:"نجات یک نفر در شب از تیر مافیا", en:"Save a player at night from mafia shot", tr:"Gece bir oyuncuyu mafya ateşinden kurtar", icon:"⚕️"},
        {name:"کارگاه", fa:"هر شب اطلاعاتی از تیم مافیا دریافت می‌کند", en:"Receives intel about the mafia team each night", tr:"Her gece mafya takımı hakkında bilgi alır", icon:"🔧"},
        {name:"اسنایپر", fa:"یک تیر دقیق · شلیک به رئیس مافیا = برد فوری شهر", en:"Precise shot · Shooting the boss = instant city win", tr:"Bir keskin atış · Patronu vurursa şehir anında kazanır", icon:"🎯"},
        {name:"بادیگارد", fa:"هر شب از یک بازیکن محافظت می‌کند · تیر مافیا را جذب می‌کند", en:"Guards a player each night · Absorbs mafia shot", tr:"Her gece bir oyuncuyu korur · Mafya ateşini emer", icon:"🛡️"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
      ]
    }
  },
  "هانیبال": {
    icon: "🃏",
    color: "#8b1a1a",
    fa: {
      title: "سناریو هانیبال", subtitle: "سبک روانشناختی · دستکاری · طراح: سامان گودرزی",
      intro: "هانیبال — مجرمی دیوانه، ثروتمند و مرموز که با خریدن رهبر مافیا از میان شهروندان و انداختن سایه بر ذهن‌ها، شهر را در تاریکی فرو می‌برد. در شب معارفه، هانیبال یک شهروند را برای رهبری تیم انتخاب می‌کند — قبول یا رد کردن، هر دو پیامدی جدی دارند.",
      flow: [
        "شب معارفه: هانیبال تنها بیدار → لایک سایه → پیشنهاد خرید رئیس به یک شهروند → موافقت یا مخالفت → طرفدار نقش می‌گیرد → معارفه تیم مافیا",
        "شب‌های اصلی (۱۰ نفره): قهرمان → سایه (تنها) → هانیبال → تیم مافیا → کاراگاه → دکتر → معمار → انتقام‌جو",
        "شب‌های اصلی (۱۲/۱۳ نفره): قهرمان → سایه (تنها) → هانیبال → تیم مافیا + ناتو → کاراگاه → اسنایپر الیت → دکتر → معمار → انتقام‌جو",
        "روزها: بحث · رأی‌گیری · اعلام ساید · ادامه بازی"
      ],
      rules: [
        "هانیبال: هر شب با رئیس مافیا یک بازیکن انتخاب می‌کند — شهروند ساده: هر دو خارج · نقش‌دار: هانیبال تنها خارج می‌شود",
        "سایه: یک شب در میان اکت می‌کند · اکت سایه و تیر شب نمی‌توانند همان شب روی یک نفر باشند",
        "اثر سایه روی کاراگاه: همه استعلام‌ها منفی · روی دکتر: سیو به خودش برمی‌گردد · روی معمار: کارت جلوی خودش می‌افتد · روی انتقام‌جو: تنها خارج می‌شود · روی اسنایپر الیت (۱۲ نفره): fireBack تیر اسنایپر",
        "طرفدار: اگر شهروند انتخاب‌شده قبول کند → طرفدار نقش آن شهروند را می‌گیرد · اگر رد کند یا هانیبال خود طرفدار را انتخاب کند → طرفدار اجباری رئیس مافیا می‌شود",
        "رد پیشنهاد: بازیکنی که درخواست هانیبال را رد کرده اگر در روز از آن صحبت کند → اخراج انضباطی",
        "رئیس مافیا (۱۰ نفره): می‌تواند یک شب به جای تیر از ناتویی استفاده کند",
        "رئیس مافیا (۱۲/۱۳ نفره): ناتویی فقط توسط خود ناتو انجام می‌شود",
        "دکتر: اگر به اجبار سیو ندهد (زره قهرمان / اکت انتقام‌جو) → شب بعد ۲ سیو دارد · در ۱۲/۱۳ نفره نمی‌تواند داوطلبانه سیو را رد کند",
        "معمار: یک‌بار در کل بازی کارت می‌گذارد · بازیکن هدف باید کسی را به دوئل دعوت کند · رأی مرگ بین دو نفر · در ۱۲/۱۳ نفره اگر هدف شات شود، می‌تواند مجدد کارت بگذارد · معمار نمی‌تواند شروع‌کننده رأی را خودش انتخاب کند",
        "انتقام‌جو: آخرین نفر بیدار می‌شود · لایک = شات شده · تیر به سایه یا هانیبال: هر دو خارج · تیر به رئیس مافیا یا شهروند: انتقام‌جو تنها خارج · همیشه با حمله شب از بازی خارج می‌شود",
        "قهرمان: قبل از سایه بیدار می‌شود · یک زره در برابر تیر شب · از نقش‌داران در برابر اکت سایه محافظت می‌کند · از دست دادن زره را متوجه نمی‌شود",
        "اسنایپر الیت (۱۲/۱۳ نفره): تیر شب اول → نتیجه ابتدای روز سوم · اگر همان شبی که تیر می‌زند سایه هم انتخابش کند → اسنایپر خارج می‌شود"
      ],
      quorum: [
        {range:"۱۲–۸ نفر", votes:"۴ رأی"},
        {range:"۷–۶ نفر", votes:"۳ رأی"},
        {range:"۵–۴ نفر", votes:"۲ رأی"}
      ],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "ترتیب بیداری", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های مافیا", citizenTitle: "نقش‌های شهروند"
    },
    en: {
      title: "Hannibal Scenario", subtitle: "Psychological Style · Manipulation · Designer: Saman Goodarzi",
      intro: "Hannibal — a notorious, wealthy and deranged criminal who corrupts city leadership from within and casts shadows on citizens' minds. On introduction night, Hannibal offers a citizen the role of Mafia Boss — acceptance or rejection both carry serious consequences.",
      flow: [
        "Intro Night: Hannibal alone → Shadow likes → Offer Boss role to a citizen → Accept/Reject → Fan receives role → Mafia team meets",
        "Main Nights (10p): Champion → Shadow (alone) → Hannibal → Mafia team → Detective → Doctor → Architect → Avenger",
        "Main Nights (12/13p): Champion → Shadow (alone) → Hannibal → Mafia+NATO → Detective → Elite Sniper → Doctor → Architect → Avenger",
        "Days: Discussion · Death vote · Side reveal · Continue"
      ],
      rules: [
        "Hannibal: picks a player each night with the Boss — Simple Citizen: both exit · Role-holder: only Hannibal exits",
        "Shadow: acts every other night · Shadow act and night shot cannot target same player on same night",
        "Shadow effects — Detective: all inquiries negative · Doctor: save redirects to himself · Architect: card falls on himself · Avenger: exits alone · Elite Sniper (12p): fireBack on sniper shot",
        "Fan: if chosen citizen accepts → Fan takes that citizen's role · if refused or Fan chosen directly → Fan becomes Boss by force",
        "Rejection: if the rejecting player discusses it during the day → disciplinary ejection",
        "Boss (10p): can use NATO once instead of night shot",
        "Boss (12/13p): only NATO can use NATO ability",
        "Doctor: if forced to skip → gets 2 saves next night · (12/13p: cannot voluntarily skip)",
        "Architect: places card once · target must challenge someone to a duel · death vote between two · (12/13p: can re-place card if target is shot)",
        "Avenger: last to wake · Like = was shot · shooting Shadow/Hannibal: both exit · shooting Boss/Citizen: Avenger exits alone · always exits when attacked at night",
        "Champion: wakes before Shadow · one armor against mafia shot · protects role-holders from Shadow · does not know when armor is lost",
        "Elite Sniper (12/13p): night 1 shot → result announced day 3 · if Shadow picks him the same night he shoots → Sniper exits"
      ],
      quorum: [
        {range:"12–8 players", votes:"4 votes"},
        {range:"7–6 players", votes:"3 votes"},
        {range:"5–4 players", votes:"2 votes"}
      ],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Wake Order", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Roles", citizenTitle: "Citizen Roles"
    },
    tr: {
      title: "Hannibal Senaryosu", subtitle: "Psikolojik Stil · Manipülasyon · Tasarımcı: Saman Goodarzi",
      intro: "Hannibal — Şehri karanlığa gömen, deli, zengin ve gizemli bir mafya suçlusu. Tanışma gecesi Hannibal bir vatandaşa Mafya Başkanlığı teklif eder — kabul veya ret, her ikisinin de ciddi sonuçları vardır.",
      flow: [
        "Tanışma Gecesi: Hannibal tek → Gölge beğeni → Bir vatandaşa Başkanlık teklifi → Kabul/Red → Taraftar rol alır → Mafya tanışır",
        "Ana Geceler (10k): Kahraman → Gölge (tek) → Hannibal → Mafya → Dedektif → Doktor → Mimar → İntikamcı",
        "Ana Geceler (12/13k): Kahraman → Gölge (tek) → Hannibal → Mafya+NATO → Dedektif → Elit Nişancı → Doktor → Mimar → İntikamcı",
        "Günler: Tartışma · Ölüm oyu · Taraf açıklaması · Devam"
      ],
      rules: [
        "Hannibal: her gece Başkanla bir oyuncu seçer — Sıradan Vatandaş: ikisi çıkar · Rol sahibi: sadece Hannibal çıkar",
        "Gölge: iki gecede bir · Gölge eylemi ve gece atışı aynı gecede aynı kişiyi hedef alamaz",
        "Gölge efektleri — Dedektif: hepsi negatif · Doktor: kurtarma kendine döner · Mimar: kart önüne düşer · İntikamcı: tek çıkar · Elit Nişancı (12k): geri ateş",
        "Taraftar: seçilen kabul ederse → Taraftar o rolü alır · reddedilirse → Taraftar zorla Başkan olur",
        "Red: reddeden oyuncu gündüz konuşursa → disiplin ihracı",
        "Başkan (10k): bir kez gece atışı yerine NATO kullanabilir",
        "Başkan (12/13k): NATO yeteneği sadece NATO tarafından kullanılır",
        "Doktor: atlamak zorunda kalırsa sonraki gece 2 kurtarma · (12/13k: gönüllü atlayamaz)",
        "Mimar: bir kez kart koyar · hedef düelloya davet eder · ikili ölüm oyu · (12/13k: hedef vurulursa tekrar koyabilir)",
        "İntikamcı: son uyanan · Beğeni = vuruldu · Gölge/Hannibal'a atarsa ikisi çıkar · Başkan/Vatandaş'a atarsa İntikamcı tek çıkar · saldırıda hep çıkar",
        "Kahraman: Gölgeden önce uyanır · bir zırh · rol sahiplerini Gölge'den korur · zırhını kaybettiğini bilmez",
        "Elit Nişancı (12/13k): 1. gece atışı → 3. gün başında sonuç · Gölge aynı gece onu seçerse → Nişancı çıkar"
      ],
      quorum: [
        {range:"12–8 oyuncu", votes:"4 oy"},
        {range:"7–6 oyuncu", votes:"3 oy"},
        {range:"5–4 oyuncu", votes:"2 oy"}
      ],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Uyanış Sırası", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Rolleri", citizenTitle: "Vatandaş Rolleri"
    },
    roles: {
      mafia: [
        {name:"هانیبال", fa:"در شب معارفه یک شهروند را برای رهبری مافیا انتخاب می‌کند · هر شب با رئیس یک نفر را هدف می‌گیرد · شهروند ساده: هر دو خارج", en:"Intro night: offers Boss role to a citizen · Each night targets a player with Boss · Simple Citizen: both exit", tr:"Tanışma: vatandaşa Başkanlık teklifi · Her gece Başkanla hedef seçer · Sıradan Vatandaş: ikisi çıkar", icon:"🃏"},
        {name:"سایه", fa:"یک شب در میان بیدار می‌شود و روی یک شهروند سایه می‌اندازد · اکت آن شهروند را معکوس می‌کند · قهرمان‌زده را نمی‌تواند انتخاب کند", en:"Acts every other night · Casts shadow on a citizen, reversing their ability · Cannot target a Champion-protected player", tr:"İki gecede bir uyanır · Vatandaşa gölge düşürür, yeteneği tersine çevirir · Kahraman korumasındakini seçemez", icon:"👤"},
        {name:"رئیس مافیا", fa:"فرمانده تیم · تیر شب مافیا · استعلام کاراگاه منفی است · در ۱۰ نفره می‌تواند یک شب به جای تیر از ناتویی استفاده کند", en:"Mafia leader · Night shot · Detective inquiry shows negative · In 10p can NATO once instead of shot", tr:"Mafya lideri · Gece atışı · Dedektif negatif · 10k'de bir kez NATO kullanabilir", icon:"👑"},
        {name:"ناتو", fa:"فقط در ۱۲/۱۳ نفره · می‌تواند به جای تیر شب، ناتویی (حدس نقش شهروند) انجام دهد", en:"Only in 12/13p · Can use NATO (guess citizen role) instead of night shot", tr:"Sadece 12/13k · Gece atışı yerine NATO (vatandaş rolü tahmini) kullanabilir", icon:"🔫"}
      ],
      citizen: [
        {name:"طرفدار", fa:"نقش مجهول · در شب معارفه رئیس مافیا می‌شود (مستقیم یا اجباری) · نقش شهروندِ انتخاب‌شده را می‌گیرد اگر آن شهروند قبول کرده باشد", en:"Unknown role · Becomes Mafia Boss on intro night (directly or by force) · Gets the chosen citizen's role if they accepted", tr:"Bilinmeyen rol · Tanışma gecesinde Mafya Başkanı olur · Kabul eden vatandaşın rolünü alır", icon:"❓"},
        {name:"قهرمان", fa:"قبل از سایه بیدار می‌شود · یک زره در برابر تیر مافیا · از نقش‌داران شهروند در برابر اکت سایه محافظت می‌کند · از دست دادن زره را در شب متوجه نمی‌شود", en:"Wakes before Shadow · One armor against night shot · Protects citizen role-holders from Shadow act · Doesn't know when armor is lost", tr:"Gölgeden önce uyanır · Gece atışına karşı zırh · Rol sahiplerini Gölge'den korur · Zırhını kaybettiğini bilmez", icon:"🦸"},
        {name:"دکتر", fa:"هر شب یک نفر را سیو می‌دهد · اگر به اجبار سیو ندهد، شب بعد ۲ سیو دارد · در ۱۲/۱۳ نفره نمی‌تواند داوطلبانه سیو را رد کند", en:"Saves one player per night · If forced to skip, gets 2 saves next night · In 12/13p cannot voluntarily skip a save", tr:"Her gece bir oyuncu kurtarır · Zorla atlarsa sonraki gece 2 kurtarma · 12/13k'de gönüllü atlayamaz", icon:"⚕️"},
        {name:"کاراگاه", fa:"هر شب استعلام مافیا بودن یک بازیکن · رئیس مافیا برای او منفی است · اگر سایه روی او باشد، همه استعلام‌ها منفی می‌شوند", en:"Each night inquires if a player is mafia · Boss shows negative · If shadowed, all inquiries return negative", tr:"Her gece mafya sorgusu · Başkan negatif · Gölgelenince tüm sorgular negatif", icon:"🕵️"},
        {name:"معمار", fa:"یک‌بار در کل بازی کارت می‌گذارد · بازیکن هدف باید کسی را به دوئل دعوت کند · رأی مرگ دو طرفه · شروع رأی‌گیری توسط معمار انتخاب می‌شود · در ۱۲/۱۳ نفره اگر هدف شات شود می‌تواند دوباره کارت بگذارد", en:"Places card once total · Target challenges someone to duel · Bilateral death vote · Voting starter chosen by Architect · In 12/13p: can re-place if target is shot", tr:"Toplam bir kez kart koyar · Hedef birini düelloya davet eder · İki yönlü ölüm oyu · 12/13k: hedef vurulursa tekrar koyabilir", icon:"📐"},
        {name:"انتقام‌جو", fa:"آخرین بیدار · لایک = شات شده → می‌تواند انتقام بگیرد · تیر به سایه/هانیبال: هر دو خارج · تیر به رئیس/شهروند: انتقام‌جو تنها خارج · همیشه با حمله شب خارج می‌شود", en:"Last to wake · Like = was shot → can retaliate · Shoot Shadow/Hannibal: both exit · Shoot Boss/Citizen: Avenger alone exits · Always exits when attacked at night", tr:"Son uyanan · Beğeni = vuruldu → intikam alabilir · Gölge/Hannibal: ikisi çıkar · Başkan/Vatandaş: İntikamcı tek çıkar · Gece saldırısında hep çıkar", icon:"⚔️"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز · اگر هانیبال در روز خارج شود، شهروند ساده‌ای که هانیبال انتخاب کرده هم خارج می‌شود", en:"Day analysis and voting · If Hannibal is eliminated during day, the Simple Citizen Hannibal selected also exits", tr:"Gündüz analiz ve oylama · Hannibal gündüz çıkarsa seçtiği Sıradan Vatandaş da çıkar", icon:"😇"},
        {name:"اسنایپر الیت", fa:"فقط ۱۲/۱۳ نفره · یک تیر در کل بازی · شب اول تیر بزند: نتیجه ابتدای روز سوم اعلام می‌شود · اگر همان شبی که تیر می‌زند سایه انتخابش کند، خودش خارج می‌شود", en:"Only 12/13p · One shot per game · Night 1 shot: result announced start of day 3 · If Shadow picks him the same night he shoots, Sniper exits", tr:"Sadece 12/13k · Oyun başına bir atış · 1. gece: sonuç 3. gün başında · Aynı gece Gölge onu seçerse Nişancı çıkar", icon:"🎯"}
      ]
    }
  },
  "شاهنامه": {
    icon: "📜",
    color: "#1f8a5f",
    fa: {
      title: "سناریو شاهنامه", subtitle: "روایت اهریمن و روشنایی · ۱۰ نفره",
      intro: "سناریوی شاهنامه روایتی از نبرد اهریمن و روشنایی را در قالب بازی مافیا بازآفرینی می‌کند. تیم اهریمن (ضحاک، بوف، افراسیاب) در برابر تیم روشنایی به رهبری نقش‌های حماسی شاهنامه (سیمرغ، جاماسب، کاوه، رستم، آرش) قرار می‌گیرد.",
      flow: ["بازی بدون روز معارفه آغاز می‌شود","روز یک به‌صورت نبرد یک‌به‌یک برگزار می‌شود (هرکس به نوبت می‌گوید به کی رأی می‌دهد)","شب‌های اصلی (اجرای نقش‌ها)","روزها (بحث + رأی‌گیری)"],
      rules: ["اعضای انجمن (ضحاک، رستم، کاوه) باید حداقل دو تایید برای تشکیل هر نبرد بدهند","گرداننده فقط اعلام می‌کند «شما پر دارید» بدون تعیین نوع آن","پر سیمرغ بر پر زهرآلود بوف اولویت دارد","بوف یک پر زهرآلود دارد؛ تیم اهریمن باید شب میان شلیک یا این پر یکی را انتخاب کند","افراسیاب می‌تواند به یاران اهریمن زره بدهد؛ اگر رستم را درست حدس بزند هر دو خارج می‌شوند","جاماسب استعلامی گمراه‌کننده دارد: افراسیاب و بوف مثبت نشان داده می‌شوند و سیمرغ به‌اشتباه مثبت کاذب است","اگر کاوه خارج شود و ضحاک هنوز زنده باشد، شلیک شب بعد متوقف می‌شود"],
      quorum: [{range:"۱۰–۸ نفر",votes:"۴ رأی"},{range:"۷–۶ نفر",votes:"۳ رأی"},{range:"۵–۴ نفر",votes:"۲ رأی"}],
      proceed: "ادامه — انتخاب تعداد بازیکنان ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های اهریمن", citizenTitle: "نقش‌های روشنایی"
    },
    en: {
      title: "Shahnameh Scenario", subtitle: "Tale of Darkness and Light · 10 Players",
      intro: "The Shahnameh scenario reimagines the battle between darkness and light as a Mafia game. The Ahriman (evil) team — Zahhak, the Owl, Afrasiab — faces the team of Light led by epic Shahnameh heroes: Simorgh, Jamasp, Kaveh, Rostam and Arash.",
      flow: ["The game begins with no introduction day","Day 1 is held as sequential one-on-one duels (each player states in turn who they vote against)","Main nights (role actions)","Days (discussion + voting)"],
      rules: ["Council members (Zahhak, Rostam, Kaveh) must give at least two approvals for each duel to proceed","The narrator only announces \"you have a feather\" without stating its type","Simorgh's feather takes priority over the Owl's poisoned feather","The Owl has one poisoned feather; the Ahriman team must choose between a shot or this feather each night","Afrasiab can give armor to allies; correctly guessing Rostam eliminates both","Jamasp's inquiry is misleading: Afrasiab and the Owl show positive, and Simorgh shows a false positive","If Kaveh is eliminated while Zahhak is still alive, the next night's shot is blocked"],
      quorum: [{range:"10–8 players",votes:"4 votes"},{range:"7–6 players",votes:"3 votes"},{range:"5–4 players",votes:"2 votes"}],
      proceed: "Continue — Select Player Count ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Ahriman Roles", citizenTitle: "Roles of Light"
    },
    tr: {
      title: "Şehname Senaryosu", subtitle: "Karanlık ve Işık Hikayesi · 10 Oyuncu",
      intro: "Şehname senaryosu, karanlık ile ışık savaşını Mafia oyunu biçiminde yeniden canlandırır. Ehrimen (kötülük) takımı — Zahhak, Baykuş, Afrasyab — Şehname'nin destansı kahramanları Simurg, Jamasp, Kave, Rüstem ve Araş'ın önderliğindeki Işık takımına karşı çıkar.",
      flow: ["Oyun tanışma günü olmadan başlar","1. Gün sıralı birebir düellolar şeklinde geçer (herkes sırayla kime oy verdiğini söyler)","Ana Geceler (rol eylemleri)","Günler (tartışma + oylama)"],
      rules: ["Meclis üyeleri (Zahhak, Rüstem, Kave) her düellonun kurulması için en az iki onay vermelidir","Anlatıcı sadece \"tüyünüz var\" der, türünü belirtmez","Simurg'un tüyü Baykuş'un zehirli tüyünden önceliklidir","Baykuş'un bir zehirli tüyü vardır; Ehrimen takımı her gece ateş ile bu tüy arasında seçim yapmalı","Afrasyab müttefiklerine zırh verebilir; Rüstem'i doğru tahmin ederse ikisi de çıkar","Jamasp'ın sorgusu yanıltıcıdır: Afrasyab ve Baykuş pozitif görünür, Simurg ise yanlış pozitif gösterir","Kave elenirse ve Zahhak hâlâ hayattaysa, bir sonraki gece ateşi engellenir"],
      quorum: [{range:"10–8 oyuncu",votes:"4 oy"},{range:"7–6 oyuncu",votes:"3 oy"},{range:"5–4 oyuncu",votes:"2 oy"}],
      proceed: "Devam — Oyuncu Sayısı Seç ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Ehrimen Rolleri", citizenTitle: "Işık Rolleri"
    },
    roles: {
      mafia: [
        {name:"ضحاک", fa:"رئیس گروه اهریمن · صادرکننده دستور شلیک · در برابر سایه رستم محفوظ است", en:"Ahriman leader · Issues the shot order · Protected against Rostam's shadow", tr:"Ehrimen lideri · Ateş emrini verir · Rüstem'in gölgesine karşı korumalı", icon:"🐍"},
        {name:"بوف", fa:"دارای یک پر زهرآلود · تیم اهریمن باید شب میان شلیک یا این پر یکی را انتخاب کند", en:"Has one poisoned feather · The team must choose between a shot or this feather each night", tr:"Bir zehirli tüyü var · Takım her gece ateş ile bu tüy arasında seçmeli", icon:"🦉"},
        {name:"افراسیاب", fa:"می‌تواند به یاران زره بدهد · اگر رستم را درست حدس بزند هر دو خارج می‌شوند", en:"Can give armor to allies · Correctly guessing Rostam eliminates both", tr:"Müttefiklerine zırh verebilir · Rüstem'i doğru tahmin ederse ikisi de çıkar", icon:"👹"}
      ],
      citizen: [
        {name:"یار", fa:"یار روشنایی بدون توانایی شبانه · تحلیل و رأی‌گیری در روز", en:"Companion of Light with no night ability · Day analysis and voting", tr:"Gece yeteneği olmayan Işık müttefiki · Gündüz analiz ve oylama", icon:"😇"},
        {name:"سیمرغ", fa:"دارای ۵ پر نجات از شلیک شب", en:"Has 5 feathers to save from a night shot", tr:"Gece atışından kurtaran 5 tüyü var", icon:"🦅"},
        {name:"جاماسب", fa:"استعلام‌گیر با نتایج گمراه‌کننده؛ افراسیاب و بوف مثبت، سیمرغ مثبت کاذب", en:"Inquirer with misleading results; Afrasiab and the Owl show positive, Simorgh shows a false positive", tr:"Yanıltıcı sonuçlar veren sorgucu; Afrasyab ve Baykuş pozitif, Simurg yanlış pozitif", icon:"🔮"},
        {name:"کاوه", fa:"می‌تواند زره بدهد؛ اگر خارج شود و ضحاک زنده باشد، شلیک شب بعد متوقف می‌شود", en:"Can give armor; if eliminated while Zahhak is alive, next night's shot is blocked", tr:"Zırh verebilir; elenirse ve Zahhak hayattaysa sonraki gece ateşi engellenir", icon:"🛡️"},
        {name:"رستم", fa:"قهرمان نامیرا با یک سایه تایید‌شونده", en:"Immortal hero with one confirmable shadow", tr:"Doğrulanabilir bir gölgeye sahip ölümsüz kahraman", icon:"⚔️"},
        {name:"آرش کمانگیر", fa:"دارای یک تیر برای شلیک در روز", en:"Has one arrow to shoot during the day", tr:"Gündüz atmak için bir oku var", icon:"🏹"}
      ]
    }
  },
  "دنتیست": {
    icon: "🦷",
    color: "#0ea5e9",
    fa: {
      title: "سناریو دنتیست", subtitle: "جنگ سه‌جانبه · ۱۲ نفره",
      intro: "دنتیست یک نبرد سه‌جانبه است. در کنار تیم مافیا و تیم شهروند، یک نقش مستقل (دنتیست) هر شب دهان یک نفر را «سایلنت» می‌کند؛ آن فرد فردای آن روز تحت هیچ شرایطی حق صحبت، گرفتن چالش، اشاره یا نوشتن روی کاغذ ندارد. دنتیست تنها برای خودش بازی می‌کند و باید کاری کند مافیا و شهروند یکدیگر را حذف کنند.",
      flow: ["روز معارفه","شب اول (بدون شلیک)","روز اول (بحث + رأی‌گیری)","شب‌های اصلی (اجرای نقش‌ها + سکوت دنتیست)","روزها (اعلام نتایج + رأی‌گیری)"],
      rules: [
        "دنتیست هر شب یک نفر را سایلنت می‌کند؛ آن فرد فردا حق صحبت، چالش‌گرفتن، اشاره یا نوشتن روی کاغذ ندارد",
        "ناتو اگر نقش دقیق یک شهروند را حدس بزند، او را حذف می‌کند",
        "پزشک هر شب یک نفر را از شلیک شب نجات می‌دهد",
        "تک‌تیرانداز حرفه‌ای شب‌ها به مافیا شلیک می‌کند؛ در صورت خطا خودش حذف می‌شود",
        "گانسمیت یک تفنگ جنگی (یک اسلحه مشکی) بین بازیکنان پخش می‌کند",
        "دنتیست عضو هیچ تیمی نیست و برد او مستقل از برد مافیا یا شهروند است",
        "شرط برد دنتیست: زنده ماندن تا ۳ نفر پایانی بازی"
      ],
      quorum: [{range:"۱۲–۱۰ نفر",votes:"۵ رأی"},{range:"۹–۷ نفر",votes:"۴ رأی"},{range:"۶–۵ نفر",votes:"۳ رأی"},{range:"۴ نفر به پایین",votes:"۲ رأی"}],
      proceed: "ادامه — شروع بازی ➜",
      flowTitle: "روند بازی", rulesTitle: "قوانین کلیدی", quorumTitle: "حد نصاب آرا", mafiaTitle: "نقش‌های تیم مافیا", citizenTitle: "نقش‌های تیم شهروند", independentTitle: "نقش مستقل"
    },
    en: {
      title: "Dentist Scenario", subtitle: "Three-Way War · 12 Players",
      intro: "Dentist is a three-way battle. Alongside the mafia and citizen teams, an independent role (the Dentist) silences one player every night; that person may not speak, take a challenge, gesture, or write on paper the following day under any circumstance. The Dentist plays only for themself and must engineer the mafia and citizens into eliminating each other.",
      flow: ["Introduction Day","Night 1 (no shot)","Day 1 (discussion + voting)","Main Nights (role actions + Dentist's silence)","Days (announce results + voting)"],
      rules: [
        "The Dentist silences one player every night; that person cannot speak, take a challenge, gesture, or write the next day",
        "NATO eliminates a citizen if he correctly guesses their exact role",
        "The Doctor saves one player from the night shot each night",
        "The Professional Sniper shoots the mafia at night; a wrong shot eliminates himself",
        "The Gunsmith distributes one war rifle (a black gun) among the players",
        "The Dentist belongs to no team; his win is independent of the mafia's or citizens'",
        "Dentist win condition: survive to the final 3 players"
      ],
      quorum: [{range:"12–10 players",votes:"5 votes"},{range:"9–7 players",votes:"4 votes"},{range:"6–5 players",votes:"3 votes"},{range:"4 or less",votes:"2 votes"}],
      proceed: "Continue — Start Game ➜",
      flowTitle: "Game Flow", rulesTitle: "Key Rules", quorumTitle: "Vote Quorum", mafiaTitle: "Mafia Team Roles", citizenTitle: "Citizen Team Roles", independentTitle: "Independent Role"
    },
    tr: {
      title: "Dişçi Senaryosu", subtitle: "Üç Taraflı Savaş · 12 Oyuncu",
      intro: "Dişçi, üç taraflı bir savaştır. Mafya ve vatandaş takımlarının yanında, bağımsız bir rol olan Dişçi her gece bir oyuncuyu \"susturur\"; o kişi ertesi gün hiçbir koşulda konuşamaz, meydan okuyamaz, işaret edemez veya kağıda yazamaz. Dişçi yalnızca kendisi için oynar ve mafya ile vatandaşların birbirini elemesini sağlamalıdır.",
      flow: ["Tanışma Günü","1. Gece (ateş yok)","1. Gün (tartışma + oylama)","Ana Geceler (rol eylemleri + Dişçi'nin susturması)","Günler (sonuçlar + oylama)"],
      rules: [
        "Dişçi her gece bir oyuncuyu susturur; o kişi ertesi gün konuşamaz, meydan okuyamaz, işaret edemez veya yazamaz",
        "NATO bir vatandaşın rolünü doğru tahmin ederse onu eler",
        "Doktor her gece bir oyuncuyu gece ateşinden kurtarır",
        "Profesyonel Keskin Nişancı geceleri mafyaya ateş eder; yanlış atış kendini eler",
        "Silahçı oyuncular arasında bir savaş tüfeği (siyah bir silah) dağıtır",
        "Dişçi hiçbir takıma ait değildir; galibiyeti mafya veya vatandaşlarınkinden bağımsızdır",
        "Dişçi galibiyet şartı: oyunun son 3 oyuncusuna kadar hayatta kalmak"
      ],
      quorum: [{range:"12–10 oyuncu",votes:"5 oy"},{range:"9–7 oyuncu",votes:"4 oy"},{range:"6–5 oyuncu",votes:"3 oy"},{range:"4 ve altı",votes:"2 oy"}],
      proceed: "Devam — Oyunu Başlat ➜",
      flowTitle: "Oyun Akışı", rulesTitle: "Temel Kurallar", quorumTitle: "Oy Nisabı", mafiaTitle: "Mafya Takımı Rolleri", citizenTitle: "Vatandaş Takımı Rolleri", independentTitle: "Bağımsız Rol"
    },
    roles: {
      mafia: [
        {name:"پدرخوانده", fa:"رئیس گروه · شلیک نهایی شب با اوست · استعلامش منفی است", en:"Group leader · Makes the final night-shot call · Shows negative on inquiry", tr:"Grup lideri · Gece ateşine son kararı verir · Sorguda negatif çıkar", icon:"👑"},
        {name:"ناتو", fa:"اگر نقش دقیق یک شهروند را حدس بزند، او را حذف می‌کند", en:"Eliminates a citizen if he guesses their exact role", tr:"Bir vatandaşın rolünü doğru tahmin ederse onu eler", icon:"🔫"},
        {name:"مافیا ساده", fa:"بازوی اجرایی و رأی تیم مافیا", en:"The mafia team's executive arm and vote", tr:"Mafya takımının uygulayıcı kolu ve oyu", icon:"😈"}
      ],
      citizen: [
        {name:"کارآگاه", fa:"استعلام مثبت یا منفی بودن بازیکنان را در شب می‌گیرد", en:"Gets a positive/negative inquiry on players each night", tr:"Her gece oyuncular hakkında pozitif/negatif sorgu alır", icon:"🕵️"},
        {name:"پزشک", fa:"هر شب یک نفر را از شلیک شب نجات می‌دهد", en:"Saves one player from the night shot each night", tr:"Her gece bir oyuncuyu gece ateşinden kurtarır", icon:"⚕️"},
        {name:"تک‌تیرانداز", fa:"شلیک به مافیا در شب · در صورت خطا خودش حذف می‌شود", en:"Shoots the mafia at night · a wrong shot eliminates himself", tr:"Gece mafyaya ateş eder · yanlış atış kendini eler", icon:"🎯"},
        {name:"گانسمیت", fa:"یک تفنگ جنگی (یک اسلحه مشکی) بین بازیکنان پخش می‌کند", en:"Distributes one war rifle (a black gun) among the players", tr:"Oyuncular arasında bir savaş tüfeği (siyah silah) dağıtır", icon:"🛠️"},
        {name:"شهروند ساده", fa:"بدون قابلیت شب · تکیه‌گاه منطق روز", en:"No night ability · the backbone of day reasoning", tr:"Gece yeteneği yok · gündüz akıl yürütmenin dayanağı", icon:"😇"}
      ],
      independent: [
        {name:"دنتیست", fa:"هر شب دهان یک نفر را سایلنت می‌کند؛ آن فرد فردا حق صحبت ندارد · هدفش این است که مافیا و شهروند یکدیگر را حذف کنند · برد: زنده ماندن تا ۳ نفر پایانی", en:"Silences one player each night; that person cannot speak the next day · aims to make mafia and citizens eliminate each other · wins by surviving to the final 3", tr:"Her gece bir oyuncuyu susturur; o kişi ertesi gün konuşamaz · amacı mafya ile vatandaşların birbirini elemesini sağlamak · son 3'e kadar hayatta kalarak kazanır", icon:"🦷"}
      ]
    }
  }
};

function openScenarioOverlay(group) {
  const info = SCENARIO_INFO[group];
  if (!info) return;
  const L = info[currentLang] || info.fa;
  const overlay = document.getElementById("scenarioOverlay");
  const content = document.getElementById("scenarioContent");

  content.innerHTML = `
    <div class="scn-header" style="--scn-color:${info.color}">
      <div class="scn-icon">${info.icon}</div>
      <h2 class="scn-title">${L.title}</h2>
      <p class="scn-subtitle">${L.subtitle}</p>
    </div>
    <p class="scn-intro">${L.intro}</p>

    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.flowTitle}
      </button>
      <div class="scn-expand">
        <ol class="scn-flow">${L.flow.map(f => `<li>${f}</li>`).join("")}</ol>
      </div>
    </div>

    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.rulesTitle}
      </button>
      <div class="scn-expand">
        <ul class="scn-rules">${L.rules.map(r => `<li>${r}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.quorumTitle}
      </button>
      <div class="scn-expand">
        <div class="scn-quorum">
          ${L.quorum.map(q => `<div class="scn-q-item"><span class="scn-q-range">${q.range}</span><span class="scn-q-votes">${q.votes}</span></div>`).join("")}
        </div>
      </div>
    </div>

    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.mafiaTitle}
      </button>
      <div class="scn-expand">
        <div class="scn-roles mafia-roles">
          ${info.roles.mafia.map(r => `
            <div class="scn-role-card mafia-rc">
              <span class="scn-role-icon">${r.icon}</span>
              <div class="scn-role-info">
                <div class="scn-role-name">${translateRole(r.name)}</div>
                <div class="scn-role-desc">${r[currentLang] || r.fa}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>

    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.citizenTitle}
      </button>
      <div class="scn-expand">
        <div class="scn-roles citizen-roles">
          ${info.roles.citizen.map(r => `
            <div class="scn-role-card citizen-rc">
              <span class="scn-role-icon">${r.icon}</span>
              <div class="scn-role-info">
                <div class="scn-role-name">${translateRole(r.name)}</div>
                <div class="scn-role-desc">${r[currentLang] || r.fa}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>

    ${info.roles.independent ? `
    <div class="scn-section">
      <button class="scn-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="scn-toggle-icon">▶</span> ${L.independentTitle || (currentLang==='en'?'Independent Role':currentLang==='tr'?'Bağımsız Rol':'نقش مستقل')}
      </button>
      <div class="scn-expand">
        <div class="scn-roles independent-roles">
          ${info.roles.independent.map(r => `
            <div class="scn-role-card independent-rc">
              <span class="scn-role-icon">${r.icon}</span>
              <div class="scn-role-info">
                <div class="scn-role-name">${translateRole(r.name)}</div>
                <div class="scn-role-desc">${r[currentLang] || r.fa}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>` : ""}

    <div class="scn-btn-row">
      <button class="scn-back-btn" onclick="goBackFromScenario()">
        ◀ ${currentLang==='en'?'Back':currentLang==='tr'?'Geri':'بازگشت'}
      </button>
      <button class="scn-proceed-btn" onclick="closeScenarioOverlay()">
        ${L.proceed}
      </button>
    </div>
  `;

  overlay.classList.add("show");
}

function closeScenarioOverlay() {
  document.getElementById("scenarioOverlay").classList.remove("show");
  if (state.group && state.group !== "دلخواه" && SCENARIO_INFO[state.group]) {
    openCountOverlay(state.group);
  }
}

function goBackFromScenario() {
  document.getElementById("scenarioOverlay").classList.remove("show");
  state.group = null;
  state.count = null;
  document.querySelectorAll(".group-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("countCard").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
}

function getGroupCounts(group, count) {
  const groupData = ROLES_DATA[group] && ROLES_DATA[group][count];
  if (groupData) {
    return {
      mafia: groupData.mafia.length,
      citizen: groupData.citizen.length,
      independent: (groupData.independent || []).length
    };
  }
  return { mafia: ROLE_MAP[count].mafia, citizen: ROLE_MAP[count].citizen, independent: 0 };
}

function openCountOverlay(group) {
  const info = SCENARIO_INFO[group];
  if (!info) return;
  const L = info[currentLang] || info.fa;
  const overlay = document.getElementById("countOverlay");
  const content = document.getElementById("countOverlayContent");
  const counts = Object.keys(ROLES_DATA[group] || {}).map(Number);
  if (!counts.length) return;

  const titleByLang = { fa: "انتخاب تعداد بازیکنان", en: "Select Player Count", tr: "Oyuncu Sayısı Seç" };
  const subtitleByLang = { fa: "تعداد بازیکنان را انتخاب کنید", en: "Choose number of players", tr: "Oyuncu sayısını seçin" };
  const personsByLang = { fa: "نفر", en: "players", tr: "oyuncu" };
  const mafiaByLang = { fa: "مافیا", en: "Mafia", tr: "Mafya" };
  const citizenByLang = { fa: "شهروند", en: "Citizen", tr: "Vatandaş" };
  const independentByLang = { fa: "مستقل", en: "Independent", tr: "Bağımsız" };
  const backByLang = { fa: "بازگشت", en: "Back", tr: "Geri" };
  const startByLang = { fa: "شروع بازی", en: "Start Game", tr: "Oyunu Başlat" };

  content.innerHTML = `
    <div class="scn-header" style="--scn-color:${info.color}">
      <div class="scn-icon">${info.icon}</div>
      <h2 class="scn-title">${L.title}</h2>
      <p class="scn-subtitle">${subtitleByLang[currentLang] || subtitleByLang.fa}</p>
    </div>
    <div class="cnt-section">
      <h3 class="cnt-section-title">👥 ${titleByLang[currentLang] || titleByLang.fa}</h3>
      <div class="cnt-grid">
        ${counts.map(c => { const gc = getGroupCounts(group, c); return `
          <button class="cnt-btn" data-cnt="${c}" onclick="selectCountFromOverlay(${c})" style="--scn-color:${info.color}">
            <span class="cnt-number">${toFarsiNum(c)}</span>
            <span class="cnt-label">${personsByLang[currentLang] || personsByLang.fa}</span>
            <span class="cnt-breakdown">
              <span class="cnt-m">${toFarsiNum(gc.mafia)} ${mafiaByLang[currentLang] || mafiaByLang.fa}</span>
              <span class="cnt-sep">·</span>
              <span class="cnt-c">${toFarsiNum(gc.citizen)} ${citizenByLang[currentLang] || citizenByLang.fa}</span>
              ${gc.independent ? `<span class="cnt-sep">·</span><span class="cnt-i">${toFarsiNum(gc.independent)} ${independentByLang[currentLang] || independentByLang.fa}</span>` : ""}
            </span>
          </button>`; }).join("")}
      </div>
    </div>
    <div class="scn-btn-row">
      <button class="scn-back-btn" onclick="goBackFromCount()">◀ ${backByLang[currentLang] || backByLang.fa}</button>
      <button class="scn-proceed-btn" id="cntProceedBtn" onclick="proceedFromCount()" disabled>${startByLang[currentLang] || startByLang.fa} ➜</button>
    </div>
  `;
  overlay.classList.add("show");
}

function selectCountFromOverlay(count) {
  state.count = count;
  const gc = getGroupCounts(state.group, count);
  state.mafiaCount = gc.mafia;
  state.citizenCount = gc.citizen + (gc.independent || 0);
  document.querySelectorAll("#countOverlayContent .cnt-btn").forEach(b => b.classList.remove("selected"));
  const btn = document.querySelector(`#countOverlayContent .cnt-btn[data-cnt="${count}"]`);
  if (btn) btn.classList.add("selected");
  const proceed = document.getElementById("cntProceedBtn");
  if (proceed) proceed.disabled = false;
}

function proceedFromCount() {
  if (!state.count) return;
  document.getElementById("countOverlay").classList.remove("show");
  selectCount(state.count);
}

function goBackFromCount() {
  document.getElementById("countOverlay").classList.remove("show");
  state.count = null;
  if (state.group && SCENARIO_INFO[state.group]) {
    openScenarioOverlay(state.group);
  }
}

function openStartOverlay() {
  if (!state.group || !state.count) return;
  const info = SCENARIO_INFO[state.group] || { icon: "🎭", color: "var(--accent2)" };
  const overlay = document.getElementById("startOverlay");
  const content = document.getElementById("startOverlayContent");
  if (!overlay || !content) return;

  const titles = {
    fa: { title: "آماده نبرد", subtitle: "نوع بازی را انتخاب کنید", scenario: "سناریو", players: "بازیکن", mafia: "مافیا", citizen: "شهروند", classic: "آغاز نبرد معمولی", classicDesc: "بازی حضوری با پخش کارت", digital: "آغاز نبرد دیجیتالی", digitalDesc: "بازی آنلاین، تشخیص نزدیکی", back: "بازگشت" },
    en: { title: "Ready for Battle", subtitle: "Choose your battle mode", scenario: "Scenario", players: "Players", mafia: "Mafia", citizen: "Citizen", classic: "Start Classic Battle", classicDesc: "Local game with card distribution", digital: "Start Digital Battle", digitalDesc: "Online game with proximity detection", back: "Back" },
    tr: { title: "Savaşa Hazır", subtitle: "Savaş modunu seçin", scenario: "Senaryo", players: "Oyuncu", mafia: "Mafya", citizen: "Vatandaş", classic: "Klasik Savaşı Başlat", classicDesc: "Kart dağıtımıyla yerel oyun", digital: "Dijital Savaşı Başlat", digitalDesc: "Yakınlık tespitli çevrimiçi oyun", back: "Geri" }
  };
  const T = titles[currentLang] || titles.fa;

  content.innerHTML = `
    <div class="st-hero" style="--scn-color:${info.color}">
      <div class="st-hero-bg"></div>
      <div class="st-hero-grid"></div>
      <div class="st-hero-content">
        <div class="st-hero-icon">
          <span class="st-hero-icon-glow"></span>
          <span class="st-hero-icon-emoji">${info.icon}</span>
        </div>
        <h2 class="st-hero-title">${T.title}</h2>
        <p class="st-hero-subtitle">${T.subtitle}</p>
      </div>
    </div>

    <div class="st-stats">
      <div class="st-stat">
        <div class="st-stat-icon">🎭</div>
        <div class="st-stat-text">
          <div class="st-stat-label">${T.scenario}</div>
          <div class="st-stat-value">${state.group}</div>
        </div>
      </div>
      <div class="st-stat">
        <div class="st-stat-icon">👥</div>
        <div class="st-stat-text">
          <div class="st-stat-label">${T.players}</div>
          <div class="st-stat-value">${toFarsiNum(state.count)}</div>
        </div>
      </div>
      <div class="st-stat st-stat-mafia">
        <div class="st-stat-icon">😈</div>
        <div class="st-stat-text">
          <div class="st-stat-label">${T.mafia}</div>
          <div class="st-stat-value">${toFarsiNum(state.mafiaCount)}</div>
        </div>
      </div>
      <div class="st-stat st-stat-citizen">
        <div class="st-stat-icon">😇</div>
        <div class="st-stat-text">
          <div class="st-stat-label">${T.citizen}</div>
          <div class="st-stat-value">${toFarsiNum(state.citizenCount)}</div>
        </div>
      </div>
    </div>

    <div class="st-divider"><span class="st-divider-text">⚡ ${T.subtitle} ⚡</span></div>

    <div class="st-modes">
      <button class="st-mega st-mega-classic" onclick="proceedClassicStart()" aria-label="${T.classic}">
        <div class="st-mega-glow"></div>
        <div class="st-mega-shine"></div>
        <div class="st-mega-content">
          <div class="st-mega-emblem">
            <span class="st-mega-ring"></span>
            <span class="st-mega-icon">⚔️</span>
          </div>
          <div class="st-mega-text">
            <div class="st-mega-title">${T.classic}</div>
            <div class="st-mega-desc">${T.classicDesc}</div>
            <div class="st-mega-tags">
              <span class="st-tag">🎴 پخش کارت</span>
              <span class="st-tag">👥 حضوری</span>
            </div>
          </div>
          <div class="st-mega-cta">
            <span class="st-mega-cta-text">شروع</span>
            <span class="st-mega-cta-arrow">◀</span>
          </div>
        </div>
      </button>

      <button class="st-mega st-mega-digital" onclick="proceedDigitalStart()" aria-label="${T.digital}">
        <div class="st-mega-glow"></div>
        <div class="st-mega-shine"></div>
        <div class="st-mega-content">
          <div class="st-mega-emblem">
            <span class="st-mega-ring"></span>
            <span class="st-mega-icon">📱</span>
          </div>
          <div class="st-mega-text">
            <div class="st-mega-title">${T.digital}</div>
            <div class="st-mega-desc">${T.digitalDesc}</div>
            <div class="st-mega-tags">
              <span class="st-tag">⚡ آنلاین</span>
              <span class="st-tag">📡 نزدیکی</span>
            </div>
          </div>
          <div class="st-mega-cta">
            <span class="st-mega-cta-text">شروع</span>
            <span class="st-mega-cta-arrow">◀</span>
          </div>
        </div>
      </button>
    </div>

    <div class="scn-btn-row">
      <button class="scn-back-btn" onclick="goBackFromStart()" style="width:100%">◀ ${T.back}</button>
    </div>
  `;
  overlay.classList.add("show");
}

function closeStartOverlay() {
  document.getElementById("startOverlay")?.classList.remove("show");
}

function goBackFromStart() {
  closeStartOverlay();
  if (state.group && ROLES_DATA[state.group]) openCountOverlay(state.group);
}

function proceedClassicStart() {
  closeStartOverlay();
  if (typeof startGame === "function") startGame();
}

function proceedDigitalStart() {
  closeStartOverlay();
  if (typeof startNearbyGame === "function") startNearbyGame();
}

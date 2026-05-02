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
        {name:"دکتر لکتر", fa:"نجات اعضای مافیا در شب · خودنجات یک‌بار", en:"Save mafia members at night · Self-save once", tr:"Gece mafya üyelerini kurtar · Kendini bir kez kurtar", icon:"🔪"},
        {name:"بمب‌گذار", fa:"بمب‌گذاری روی بازیکن · حذف هدف با حذف فرد", en:"Plant bomb on player · Target out when player out", tr:"Oyuncuya bomba yerleştir · Oyuncu çıkınca hedef çıkar", icon:"💣"},
        {name:"ناتو", fa:"حفاظت از رئیس · گمراه کردن شهروندان", en:"Protect the boss · Mislead citizens", tr:"Patronu koru · Vatandaşları yanılt", icon:"🔫"}
      ],
      citizen: [
        {name:"شهردار", fa:"حق وتو در رأی‌گیری · نقش کلیدی شهر", en:"Veto in voting · Key city role", tr:"Oylama veto hakkı · Kilit şehir rolü", icon:"🎩"},
        {name:"کارآگاه", fa:"استعلام شبانه · رئیس منفی نشان می‌دهد", en:"Night inquiry · Boss shows negative", tr:"Gece sorgulama · Patron negatif görünür", icon:"🕵️"},
        {name:"دکتر", fa:"نجات یک نفر در شب از تیر مافیا", en:"Save a player at night from mafia shot", tr:"Gece bir oyuncuyu mafya ateşinden kurtar", icon:"⚕️"},
        {name:"تکاور", fa:"۲ تیر · شلیک به شهروند = حذف خودش", en:"2 bullets · Shooting citizen = self elimination", tr:"2 mermi · Vatandaşa ateş = kendini ele", icon:"🎯"},
        {name:"قاضی", fa:"تغییر رأی نهایی دادگاه · صدور حکم", en:"Change final court vote · Issue ruling", tr:"Son mahkeme oyunu değiştir · Hüküm ver", icon:"⚖️"},
        {name:"وکیل", fa:"دفاع از یک نفر در برابر رأی‌گیری", en:"Defend a player against voting", tr:"Bir oyuncuyu oylamaya karşı savun", icon:"📜"},
        {name:"جان‌سخت", fa:"تیر اول مافیا اثر ندارد · ۲ استعلام از حذف‌شده‌ها", en:"Survives first mafia shot · 2 inquiries on eliminated", tr:"İlk mafya ateşinden sağ · Elenenlerden 2 sorgu", icon:"💪"},
        {name:"شهروند ساده", fa:"تحلیل و رأی‌گیری در روز", en:"Analysis and voting during day", tr:"Gündüz analiz ve oylama", icon:"😇"}
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
}

function goBackFromScenario() {
  closeScenarioOverlay();
  state.group = null;
  state.count = null;
  document.querySelectorAll(".group-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("countCard").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
}

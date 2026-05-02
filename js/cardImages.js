/* ── Card image mapping (img/cards/*.png) ── */

const CARD_IMAGES = {
  "رئیس مافیا":   "boss.png",
  "پدرخوانده":    "godfather.png",
  "ناتو":         "nato.png",
  "مافیا ساده":   "mafia.png",
  "گروگان‌گیر":   "hostage.png",
  "گروگان گیر":   "hostage.png",
  "هکر":          "hacker.png",
  "یاغی":         "rebel.png",
  "شیاد":         "trickster.png",
  "مذاکره‌کننده": "negotiator.png",
  "مذاکره کننده": "negotiator.png",
  "دکتر لکتر":    "lecter.png",
  "بمب‌گذار":     "bomber.png",
  "بمب گذار":     "bomber.png",
  "کارآگاه":      "detective.png",
  "دکتر":         "doctor.png",
  "تک‌تیرانداز":  "sniper.png",
  "تک تیرانداز":  "sniper.png",
  "تکاور":        "ranger.png",
  "تفنگدار":      "gunner.png",
  "نگهبان":       "guard.png",
  "محافظ":        "protector.png",
  "وکیل":         "lawyer.png",
  "مین‌گذار":     "miner.png",
  "مین گذار":     "miner.png",
  "راهنما":       "guide.png",
  "سرباز":        "soldier.png",
  "بازپرس":       "investigator.png",
  "هانتر":        "hunter.png",
  "رویین‌تن":     "invincible.png",
  "رویین تن":     "invincible.png",
  "زره‌پوش":      "armored.png",
  "زره پوش":      "armored.png",
  "خبرنگار":      "reporter.png",
  "روانشناس":     "psychologist.png",
  "شهردار":       "mayor.png",
  "قاضی":         "judge.png",
  "جان‌سخت":      "toughguy.png",
  "جان سخت":      "toughguy.png",
  "شاه کش":       "kingkiller.png"
};

const CITIZEN_VARIANT_FILES = [
  "citizen_1.png", "citizen_2.png", "citizen_3.png",
  "citizen_4.png", "citizen_5.png", "citizen_6.png", "citizen_7.png"
];

/**
 * Get the card image URL for a role.
 * For "شهروند ساده", uses citizenVariant index (0-6) to pick from 7 variants.
 * Returns null if no image is mapped.
 */
function getCardImage(roleName, citizenVariant) {
  if (!roleName) return null;
  if (roleName === "شهروند ساده") {
    const idx = (citizenVariant != null)
      ? Math.abs(citizenVariant) % CITIZEN_VARIANT_FILES.length
      : Math.floor(Math.random() * CITIZEN_VARIANT_FILES.length);
    return "img/cards/" + CITIZEN_VARIANT_FILES[idx];
  }
  const file = CARD_IMAGES[roleName];
  return file ? "img/cards/" + file : null;
}

const _ALL_CARD_FILES = Array.from(new Set(Object.values(CARD_IMAGES))).concat(CITIZEN_VARIANT_FILES);

/**
 * Deterministic random pick from all card images for a given seed string.
 * Same role name always maps to the same fallback image (stable per role).
 */
function _hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Resolves a role to { src, hasBakedName }.
 * - Known roles: returns the exact card image (name is baked into the picture).
 * - Unknown / custom roles: returns a stable random image and signals that
 *   the caller must overlay the role name on top to mask the baked-in name.
 */
function getCardImageOrFallback(roleName, citizenVariant) {
  const direct = getCardImage(roleName, citizenVariant);
  if (direct) return { src: direct, hasBakedName: true };
  const seed = _hashSeed(roleName || "_");
  const file = _ALL_CARD_FILES[seed % _ALL_CARD_FILES.length];
  return { src: "img/cards/" + file, hasBakedName: false };
}

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
 * Per-role head region for the breathing/eye-glow animation.
 * Coordinates are percentages of the card image (cover-fitted into the card).
 *   cx, cy   — head center
 *   rx, ry   — head ellipse half-axes (mask radius)
 *   eyeY     — vertical position of eyes (used by glow overlay)
 *   eyeDx    — horizontal half-distance between the two eyes
 *   tilt     — max rotation of the breathing animation in degrees
 *
 * Anything not listed falls back to DEFAULT_HEAD; tweak only when a card's
 * skull is noticeably off-center (large hats, crowns, helmets, etc.).
 */
const DEFAULT_HEAD = { cx: 50, cy: 30, rx: 27, ry: 22, eyeY: 30, eyeDx: 7, tilt: 1.3 };

const CARD_HEAD_REGIONS = {
  "رئیس مافیا":   { cx: 50, cy: 32, rx: 26, ry: 22, eyeY: 32, eyeDx: 7,   tilt: 1.2 },
  "پدرخوانده":    { cx: 50, cy: 30, rx: 26, ry: 22, eyeY: 30, eyeDx: 7,   tilt: 1.2 },
  "ناتو":         { cx: 50, cy: 30, rx: 26, ry: 22, eyeY: 32, eyeDx: 7,   tilt: 1.0 },
  "تکاور":        { cx: 50, cy: 30, rx: 26, ry: 22, eyeY: 32, eyeDx: 7,   tilt: 1.0 },
  "تفنگدار":      { cx: 50, cy: 32, rx: 26, ry: 22, eyeY: 32, eyeDx: 7,   tilt: 1.2 },
  "کارآگاه":      { cx: 50, cy: 28, rx: 27, ry: 22, eyeY: 30, eyeDx: 7,   tilt: 1.4 },
  "شاه کش":       { cx: 50, cy: 30, rx: 27, ry: 24, eyeY: 32, eyeDx: 7,   tilt: 1.5 },
  "دکتر لکتر":    { cx: 50, cy: 28, rx: 26, ry: 22, eyeY: 28, eyeDx: 6,   tilt: 1.2 },
  "روانشناس":     { cx: 50, cy: 28, rx: 26, ry: 22, eyeY: 28, eyeDx: 6,   tilt: 1.2 },
  "شهردار":       { cx: 50, cy: 32, rx: 26, ry: 22, eyeY: 33, eyeDx: 7,   tilt: 1.2 }
};

/**
 * Returns the head-region descriptor for a role (defaults if not overridden).
 */
function getHeadRegion(roleName) {
  return CARD_HEAD_REGIONS[roleName] || DEFAULT_HEAD;
}

/**
 * Builds the inline CSS-variables style string for a card's head animation.
 * Pass the result into the card-art element's style attribute.
 */
function getHeadStyle(roleName) {
  const r = getHeadRegion(roleName);
  return [
    `--head-cx:${r.cx}%`,
    `--head-cy:${r.cy}%`,
    `--head-rx:${r.rx}%`,
    `--head-ry:${r.ry}%`,
    `--eye-y:${r.eyeY}%`,
    `--eye-l-x:${50 - r.eyeDx}%`,
    `--eye-r-x:${50 + r.eyeDx}%`,
    `--head-tilt:${r.tilt}deg`
  ].join(';');
}

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

"""
Process all card images: standardize size, add Persian role label,
apply watermark logo + diagonal © YOTA pattern (anti-theft).

Output: img/cards/  +  img/cards/cards.json (mapping)
"""
import os, json, glob, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features

# Pillow's Raqm backend (HarfBuzz + FriBidi) handles Arabic/Persian shaping
# and bidi natively — far cleaner than arabic_reshaper + python-bidi which
# produce disconnected isolated forms with most fonts.
HAS_RAQM = features.check("raqm")

# --- paths ---
ROOT = "/Users/sir.sh/testdevops"
SRC = os.path.join(ROOT, "img", "untitled folder")
OUT = os.path.join(ROOT, "img", "cards")
LOGO_PATH = os.path.join(ROOT, "icon-192.png")

# --- output dimensions (2:3 ratio) ---
W, H = 900, 1350

# --- fonts (system) ---
# Tahoma has reliable Persian/Arabic shaping with Presentation Forms-B
# (including پ/چ/ژ/گ extensions) which gives properly joined letters.
FONT_BOLD = "/System/Library/Fonts/Supplemental/Tahoma Bold.ttf"
FONT_REG  = "/System/Library/Fonts/Supplemental/Tahoma.ttf"

# Source filename → (clean key, display Persian name)
ROLE_MAP = {
    "رئیس مافیا.png":   ("boss",         "رئیس مافیا"),
    "پدرخوانده.png":    ("godfather",    "پدرخوانده"),
    "ناتو.png":         ("nato",         "ناتو"),
    "مافیا ساده.png":   ("mafia",        "مافیا ساده"),
    "گروگان‌گیر.png":   ("hostage",      "گروگان‌گیر"),
    "هکر.png":          ("hacker",       "هکر"),
    "یاغی.png":         ("rebel",        "یاغی"),
    "شیاد.png":         ("trickster",    "شیاد"),
    "مذاکره‌کننده.png": ("negotiator",   "مذاکره‌کننده"),
    "دکتر لکتر.png":    ("lecter",       "دکتر لکتر"),
    "بمب گذار.png":     ("bomber",       "بمب‌گذار"),
    "کارگاه.png":       ("detective",    "کارآگاه"),
    "دکتر.png":         ("doctor",       "دکتر"),
    "تک‌تیرانداز.png":  ("sniper",       "تک‌تیرانداز"),
    "تکاور.png":        ("ranger",       "تکاور"),
    "تفنگدار.png":      ("gunner",       "تفنگدار"),
    "نگهبان.png":       ("guard",        "نگهبان"),
    "محافظ.png":        ("protector",    "محافظ"),
    "وکیل.png":         ("lawyer",       "وکیل"),
    "مین گذار.png":     ("miner",        "مین‌گذار"),
    "راهنما.png":       ("guide",        "راهنما"),
    "سرباز.png":        ("soldier",      "سرباز"),
    "بازپرس.png":       ("investigator", "بازپرس"),
    "هانتر.png":        ("hunter",       "هانتر"),
    "رویین‌تن.png":     ("invincible",   "رویین‌تن"),
    "زره‌پوش.png":      ("armored",      "زره‌پوش"),
    "خبرنگار.png":      ("reporter",     "خبرنگار"),
    "دکتر لکتر.png__alias": ("psychologist", "روانشناس"),
    "شهردار.png":       ("mayor",        "شهردار"),
    "قاضی.png":         ("judge",        "قاضی"),
    "جان سخت.png":      ("toughguy",     "جان‌سخت"),
    "شاه کش.png":       ("kingkiller",   "شاه کش"),
}

CITIZEN_VARIANTS = [
    ("شهروند ساده.png",  "citizen_1"),
    ("شهروند ساده۱.png", "citizen_2"),
    ("شهروند ساده۲.png", "citizen_3"),
    ("شهروند ساده۳.png", "citizen_4"),
    ("شهروند ساده۴.png", "citizen_5"),
    ("شهروند ساده۵.png", "citizen_6"),
    ("شهروند ساده۶.png", "citizen_7"),
]
CITIZEN_NAME = "شهروند ساده"


def _fallback_shape(s: str) -> str:
    """Best-effort Persian shaping when Raqm isn't available."""
    import arabic_reshaper
    from bidi.algorithm import get_display
    return get_display(arabic_reshaper.reshape(s))


def draw_fa(draw: ImageDraw.ImageDraw, xy, text: str, font, fill):
    """Draw Persian text using Raqm shaping when available, otherwise fallback."""
    if HAS_RAQM:
        draw.text(xy, text, font=font, fill=fill, direction="rtl", language="fa")
    else:
        draw.text(xy, _fallback_shape(text), font=font, fill=fill)


def fa_textbbox(draw: ImageDraw.ImageDraw, text: str, font):
    if HAS_RAQM:
        return draw.textbbox((0, 0), text, font=font, direction="rtl", language="fa")
    return draw.textbbox((0, 0), _fallback_shape(text), font=font)


def fit_to_canvas(img: Image.Image, w: int, h: int) -> Image.Image:
    """Resize keeping aspect ratio, then center on a black canvas of (w,h)."""
    img = img.convert("RGBA")
    scale = min(w / img.width, h / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (5, 5, 8, 255))
    canvas.paste(resized, ((w - nw) // 2, (h - nh) // 2), resized)
    return canvas


def add_label(img: Image.Image, persian_name: str) -> Image.Image:
    """Draw the Persian role name in a styled bottom banner."""
    draw = ImageDraw.Draw(img, "RGBA")

    band_h = 130
    band_y = H - band_h - 30  # leave 30px padding from bottom of card

    # Solid dark banner — borderless to keep the look clean
    overlay = Image.new("RGBA", (W, band_h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([(40, 0), (W - 40, band_h)], fill=(0, 0, 0, 220))
    img.alpha_composite(overlay, (0, band_y))

    # text — Raqm handles RTL + shaping automatically
    try:
        font = ImageFont.truetype(FONT_BOLD, 70)
    except Exception:
        font = ImageFont.truetype(FONT_REG, 70)
    bbox = fa_textbbox(draw, persian_name, font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (W - tw) // 2 - bbox[0]
    ty = band_y + (band_h - th) // 2 - bbox[1] - 4

    # shadow + main fill
    draw_fa(draw, (tx + 3, ty + 3), persian_name, font, (0, 0, 0, 220))
    draw_fa(draw, (tx, ty), persian_name, font, (255, 255, 255, 255))
    return img


def add_watermarks(img: Image.Image, logo: Image.Image) -> Image.Image:
    """Diagonal © YOTA pattern + corner site URL + logo stamp."""
    # 1) diagonal repeating pattern
    pat_w, pat_h = 400, 400
    pat = Image.new("RGBA", (pat_w, pat_h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pat)
    try:
        wfont = ImageFont.truetype(FONT_REG, 28)
    except Exception:
        wfont = ImageFont.load_default()
    pd.text((30, 180), "© SHOWSHUNG.COM", font=wfont, fill=(255, 255, 255, 28))
    pat = pat.rotate(-30, resample=Image.BICUBIC, expand=True)

    # tile across the card
    tile_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pw, ph = pat.size
    for y in range(-ph, H + ph, 220):
        for x in range(-pw, W + pw, 280):
            tile_layer.paste(pat, (x, y), pat)
    img.alpha_composite(tile_layer)

    # 2) site URL in top corners
    draw = ImageDraw.Draw(img, "RGBA")
    try:
        cfont = ImageFont.truetype(FONT_REG, 22)
    except Exception:
        cfont = ImageFont.load_default()
    BRAND = "showshung.com"
    draw.text((50, 30), BRAND, font=cfont, fill=(255, 255, 255, 140))
    bbox = draw.textbbox((0, 0), BRAND, font=cfont)
    tw = bbox[2] - bbox[0]
    draw.text((W - 50 - tw, 30), BRAND, font=cfont, fill=(255, 255, 255, 140))

    # 3) small logo stamp in bottom-right corner
    logo_size = 80
    small = logo.copy().resize((logo_size, logo_size), Image.LANCZOS)
    # tone down opacity
    if small.mode == "RGBA":
        a = small.split()[3].point(lambda p: int(p * 0.55))
        small.putalpha(a)
    img.alpha_composite(small, (W - logo_size - 30, H - logo_size - 30))
    img.alpha_composite(small, (30, H - logo_size - 30))
    return img


def process_one(src_path: str, out_key: str, persian_name: str, logo: Image.Image):
    img = Image.open(src_path)
    img = fit_to_canvas(img, W, H)
    img = add_watermarks(img, logo)
    img = add_label(img, persian_name)
    out_path = os.path.join(OUT, f"{out_key}.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def main():
    # Preserve hand-curated assets like the card-back image across re-runs.
    PRESERVE = {"back.png"}
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            if f in PRESERVE:
                continue
            os.remove(os.path.join(OUT, f))
    os.makedirs(OUT, exist_ok=True)

    logo = Image.open(LOGO_PATH).convert("RGBA")

    manifest = {"size": [W, H], "roles": {}, "citizen_variants": []}
    missing = []

    # main roles
    for src_name, (key, fa_name) in ROLE_MAP.items():
        # support "<file>__alias" syntax to reuse the same source for another role
        actual_src = src_name.split("__alias")[0]
        src = os.path.join(SRC, actual_src)
        if not os.path.exists(src):
            missing.append(actual_src)
            continue
        process_one(src, key, fa_name, logo)
        manifest["roles"][key] = {"file": f"{key}.png", "name_fa": fa_name}
        print(f"  ✓ {key:14s} ← {actual_src}")

    # citizen variants (random pool)
    for src_name, key in CITIZEN_VARIANTS:
        src = os.path.join(SRC, src_name)
        if not os.path.exists(src):
            missing.append(src_name)
            continue
        process_one(src, key, CITIZEN_NAME, logo)
        manifest["citizen_variants"].append(f"{key}.png")
        print(f"  ✓ {key:14s} ← {src_name}")

    # write manifest
    with open(os.path.join(OUT, "cards.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Output → {OUT}")
    print(f"Cards generated: {len(manifest['roles'])} roles + {len(manifest['citizen_variants'])} citizen variants")
    if missing:
        print(f"\n⚠ Missing source files ({len(missing)}):")
        for m in missing:
            print(f"  - {m}")


if __name__ == "__main__":
    main()

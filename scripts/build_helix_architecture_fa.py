"""Helix Labs — معماری شرکت  (Persian RTL edition, A4, 8 pages)."""
import math
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

# Register a Persian-capable font with proper presentation-form metrics.
# Geeza Pro ships with macOS as a TTC; subfontIndex=0 = Regular, =1 = Bold.
FA_FONT_PATH = "/System/Library/Fonts/GeezaPro.ttc"
pdfmetrics.registerFont(TTFont("GeezaPro", FA_FONT_PATH, subfontIndex=0))
pdfmetrics.registerFont(TTFont("GeezaPro-Bold", FA_FONT_PATH, subfontIndex=1))

FA = "GeezaPro"
FAB = "GeezaPro-Bold"
EN = "Helvetica"
ENB = "Helvetica-Bold"
ENI = "Helvetica-Oblique"

# ---- palette (same as English edition) ----
INDIGO   = HexColor("#1E1B4B")
INK      = HexColor("#0F172A")
SLATE    = HexColor("#475569")
MIST     = HexColor("#94A3B8")
SURFACE  = HexColor("#FFFFFF")
PAPER    = HexColor("#F7F4EC")
PANEL    = HexColor("#F1F5F9")
LINE     = HexColor("#E2E8F0")
HAIR     = HexColor("#A89E89")
FOREST   = HexColor("#1B4332")
ELECTRIC = HexColor("#3B82F6")
EMERALD  = HexColor("#10B981")
BRASS    = HexColor("#B08A3E")
VIOLET   = HexColor("#8B5CF6")
SKY      = HexColor("#0EA5E9")
ROSE     = HexColor("#F43F5E")
AMBER    = HexColor("#F59E0B")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

OUT = "/Users/sir.sh/testdevops/helix_architecture_fa.pdf"


_ZWNJ = "‌"
_HAIR = " "  # bidi-safe small gap that the font renders as a thin space


def fa(text):
    """Persian-aware reshape + bidi.

    - Replaces ZWNJ with hair space so compound words keep their visual break
      (python-bidi strips ZWNJ on display).
    - Shapes each whitespace-separated token in isolation so word boundaries
      get correct ISOLATED forms instead of leaking joining context across spaces.
    - Forces RTL base direction so trailing punctuation lands correctly.
    """
    if not text:
        return ""
    text = text.replace(_ZWNJ, _HAIR)
    parts = re.split(r"(\s+)", text)
    pieces = []
    for p in parts:
        if not p:
            continue
        if p.isspace():
            pieces.append(p)
        else:
            pieces.append(arabic_reshaper.reshape(p))
    return get_display("".join(pieces), base_dir="R")


# ---------- primitives ----------

def fill(c, color):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def hairline(c, x1, y1, x2, y2, color=LINE, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def fa_right(c, x_right, y, text, font=FA, size=10, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x_right, y, fa(text))


def fa_left(c, x, y, text, font=FA, size=10, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, fa(text))


def en_right(c, x_right, y, text, font=ENB, size=8, color=SLATE):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x_right, y, text)


def en_left(c, x, y, text, font=ENB, size=8, color=SLATE):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def fa_wrap_right(c, x_right, y, text, width, font=FA, size=10, leading=15, color=INK):
    """Wrap Persian text right-aligned. Splits on spaces, builds visual lines."""
    words = text.split()
    line_words = []
    c.setFillColor(color)
    c.setFont(font, size)
    for w in words:
        candidate = " ".join(line_words + [w])
        shaped = fa(candidate)
        if c.stringWidth(shaped, font, size) > width and line_words:
            shaped_line = fa(" ".join(line_words))
            c.drawRightString(x_right, y, shaped_line)
            y -= leading
            line_words = [w]
        else:
            line_words.append(w)
    if line_words:
        shaped_line = fa(" ".join(line_words))
        c.drawRightString(x_right, y, shaped_line)
        y -= leading
    return y


def page_chrome(c, page_no, total, fa_label, accent=INDIGO, on_dark=False):
    rule = HexColor("#2E2A6B") if on_dark else INK
    foot = HexColor("#2E2A6B") if on_dark else LINE
    main_text = SURFACE if on_dark else INK
    muted = MIST if on_dark else SLATE

    # top: brand left (English), section center (Persian), folio right
    en_left(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "HELIX LABS", font=ENB, size=8, color=main_text)
    c.setFillColor(accent)
    c.setFont(FA, 9)
    c.drawCentredString(PAGE_W / 2, PAGE_H - MARGIN + 2 * mm, fa(fa_label))
    en_right(c, PAGE_W - MARGIN, PAGE_H - MARGIN + 2 * mm, f"{page_no:02d} / {total:02d}", color=muted)
    hairline(c, MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN, color=rule, width=0.6)

    # bottom
    hairline(c, MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN, color=foot)
    c.setFillColor(muted)
    c.setFont(FA, 8)
    c.drawRightString(PAGE_W - MARGIN, MARGIN - 4 * mm, fa("هلیکس لبز  ·  معماری شرکت  ·  ویرایش یکم / ۲۰۲۶"))
    en_left(c, MARGIN, MARGIN - 4 * mm, "helixlabs.io", font=ENB, size=7.5, color=accent)


def helix_mark(c, cx, cy, r=10 * mm, colors=(FOREST, ELECTRIC, EMERALD)):
    c.setLineWidth(1.6)
    c.setLineCap(1)
    for i, col in enumerate(colors):
        c.setStrokeColor(col)
        offset_a = i * 120
        for a_deg in range(0, 360, 18):
            a = math.radians(a_deg + offset_a)
            a2 = math.radians(a_deg + offset_a + 18)
            x1 = cx + r * math.cos(a)
            y1 = cy + r * math.sin(a) * 0.55
            x2 = cx + r * math.cos(a2)
            y2 = cy + r * math.sin(a2) * 0.55
            if int((a_deg + offset_a) / 18) % 2 == 0:
                c.line(x1, y1, x2, y2)


def three_strand_band(c, x, y, w, h):
    n = 60
    for i in range(n):
        t = i / (n - 1)
        for k, col in enumerate([FOREST, ELECTRIC, EMERALD]):
            phase = k * (2 * math.pi / 3)
            yy = y + h / 2 + math.sin(t * 3 * math.pi + phase) * (h * 0.36)
            c.setStrokeColor(col)
            c.setLineWidth(0.8)
            xx = x + t * w
            xx2 = x + ((i + 1) / (n - 1)) * w
            yy2 = y + h / 2 + math.sin(((i + 1) / (n - 1)) * 3 * math.pi + phase) * (h * 0.36)
            c.line(xx, yy, xx2, yy2)


def kpi_tile_fa(c, x, y, w, h, label, value, delta, accent=EMERALD):
    c.setFillColor(SURFACE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, 2 * mm, fill=1, stroke=1)
    fa_right(c, x + w - 4 * mm, y + h - 6 * mm, label, font=FA, size=8, color=SLATE)
    c.setFillColor(INK)
    c.setFont(ENB, 18)
    c.drawRightString(x + w - 4 * mm, y + h - 16 * mm, value)
    c.setFillColor(accent)
    c.setFont(ENB, 8)
    c.drawRightString(x + w - 4 * mm, y + 4 * mm, f"▲ {delta}")


def line_chart(c, x, y, w, h, series, colors, fills=None, ymax=None):
    n = len(series[0])
    if ymax is None:
        ymax = max(max(s) for s in series)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.4)
    for i in range(4):
        gy = y + (i + 1) * (h / 4)
        c.line(x, gy, x + w, gy)
    hairline(c, x, y, x + w, y, color=SLATE, width=0.5)
    step = w / (n - 1)
    for si, s in enumerate(series):
        if fills and fills[si]:
            c.setFillColor(fills[si])
            p = c.beginPath()
            p.moveTo(x, y)
            for i, v in enumerate(s):
                p.lineTo(x + i * step, y + (v / ymax) * h)
            p.lineTo(x + w, y)
            p.close()
            c.drawPath(p, stroke=0, fill=1)
        c.setStrokeColor(colors[si])
        c.setLineWidth(1.4)
        p = c.beginPath()
        for i, v in enumerate(s):
            px = x + i * step
            py = y + (v / ymax) * h
            if i == 0:
                p.moveTo(px, py)
            else:
                p.lineTo(px, py)
        c.drawPath(p, stroke=1, fill=0)


def donut(c, cx, cy, r_outer, r_inner, segments, hole_color=SURFACE):
    start = 90
    for frac, col, _ in segments:
        end = start - frac * 360
        c.setFillColor(col)
        p = c.beginPath()
        p.moveTo(cx, cy)
        steps = max(2, int(abs(end - start) / 4))
        for i in range(steps + 1):
            a = math.radians(start + (end - start) * i / steps)
            p.lineTo(cx + r_outer * math.cos(a), cy + r_outer * math.sin(a))
        p.lineTo(cx, cy)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        start = end
    c.setFillColor(hole_color)
    c.circle(cx, cy, r_inner, fill=1, stroke=0)


def fa_heading(c, y_top, eyebrow, title, italic_tail=None, accent=INDIGO):
    """Right-aligned Persian heading."""
    fa_right(c, PAGE_W - MARGIN, y_top, eyebrow, font=FA, size=10, color=accent)
    y = y_top - 12 * mm
    c.setFillColor(INK)
    c.setFont(FA, 26)
    c.drawRightString(PAGE_W - MARGIN, y, fa(title))
    if italic_tail:
        title_w = c.stringWidth(fa(title), FA, 26)
        c.setFillColor(accent)
        c.drawRightString(PAGE_W - MARGIN - title_w - 4 * mm, y, fa(italic_tail))
    return y - 12 * mm


# ---------- pages ----------

def page_cover(c):
    fill(c, INDIGO)

    bar_h = 2.5 * mm
    c.setFillColor(FOREST);   c.rect(0, PAGE_H - bar_h * 1, PAGE_W, bar_h, fill=1, stroke=0)
    c.setFillColor(ELECTRIC); c.rect(0, PAGE_H - bar_h * 2, PAGE_W, bar_h, fill=1, stroke=0)
    c.setFillColor(EMERALD);  c.rect(0, PAGE_H - bar_h * 3, PAGE_W, bar_h, fill=1, stroke=0)

    # Brand mark — top right (RTL)
    helix_mark(c, PAGE_W - MARGIN - 12 * mm, PAGE_H - 38 * mm, r=10 * mm)
    fa_right(c, PAGE_W - MARGIN - 30 * mm, PAGE_H - 36 * mm, "هلیکس لبز", font=FA, size=12, color=SURFACE)
    fa_right(c, PAGE_W - MARGIN - 30 * mm, PAGE_H - 42 * mm, "سه رشته. یک استودیو.", font=FA, size=9, color=BRASS)

    # Eyebrow
    y = PAGE_H - 70 * mm
    fa_right(c, PAGE_W - MARGIN, y, "معماری شرکت  ·  ویرایش یکم  ·  ۲۰۲۶", font=FA, size=10, color=BRASS)

    # Title — Persian display
    y -= 18 * mm
    c.setFillColor(SURFACE)
    c.setFont(FA, 50)
    c.drawRightString(PAGE_W - MARGIN, y, fa("استودیویی"))
    y -= 16 * mm
    c.drawRightString(PAGE_W - MARGIN, y, fa("کاربردی برای"))
    y -= 16 * mm
    c.setFillColor(BRASS)
    c.drawRightString(PAGE_W - MARGIN, y, fa("پژوهش،"))
    y -= 16 * mm
    c.setFillColor(ELECTRIC)
    c.drawRightString(PAGE_W - MARGIN, y, fa("وب،"))
    y -= 16 * mm
    c.setFillColor(EMERALD)
    c.drawRightString(PAGE_W - MARGIN, y, fa("و داده."))

    three_strand_band(c, MARGIN, MARGIN + 38 * mm, PAGE_W - 2 * MARGIN, 28 * mm)

    # Bottom
    y2 = MARGIN + 18 * mm
    fa_right(c, PAGE_W - MARGIN, y2 + 8 * mm, "محتوای سند", font=FA, size=9, color=BRASS)
    c.setFillColor(SURFACE)
    c.setFont(FA, 11)
    c.drawRightString(PAGE_W - MARGIN, y2,
                      fa("برند · بخش‌ها · مدل کسب‌وکار · APIها · KPIها · راهبرد ترکیه · ساختار صفحه فرود."))

    c.setFillColor(MIST)
    c.setFont(FA, 8)
    c.drawString(MARGIN, MARGIN + 12 * mm, fa("تهیه‌شده توسط بنیان‌گذار"))
    c.drawString(MARGIN, MARGIN + 8 * mm, fa("برای استفاده داخلی و شرکا"))
    c.drawString(MARGIN, MARGIN + 4 * mm, fa("۸ صفحه  ·  A4"))


def page_brand(c):
    fill(c, PAPER)
    page_chrome(c, 2, 8, "§ ۰۱   برند و بخش‌ها", accent=BRASS)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "هویت برند", "سه رشته.", italic_tail="یک استودیو.", accent=BRASS)

    rows = [
        ("نام",        "هلیکس لبز  ·  Helix Labs"),
        ("شعار",       "سه رشته. یک استودیو."),
        ("جایگاه",     "استودیویی فنی، مقرون‌به‌صرفه، سریع و مبتنی بر شواهد."),
        ("لحن",        "آرام، فنی، کسب‌وکارمحور. نتیجه مهم‌تر از وعده است."),
        ("نشانه",      "سه رشته در هم تنیده — یک هلیکس واحد."),
    ]
    for label, val in rows:
        fa_right(c, PAGE_W - MARGIN, y, label, font=FA, size=9, color=BRASS)
        fa_right(c, PAGE_W - MARGIN - 28 * mm, y, val, font=FA, size=11, color=INK)
        y -= 7 * mm
        hairline(c, MARGIN, y + 2 * mm, PAGE_W - MARGIN, y + 2 * mm, color=HAIR)
        y -= 2 * mm

    y -= 6 * mm
    fa_right(c, PAGE_W - MARGIN, y, "سه بخش، یک تیم", font=FA, size=10, color=BRASS)
    y -= 12 * mm

    cards = [
        ("Helix Research", "هلیکس ریسرچ", FOREST,
         "پشتیبانی پژوهش پزشکی",
         "تحلیل آماری · پاک‌سازی داده · مشاوره روش‌شناسی · بصری‌سازی. کاملاً در چارچوب اخلاقی و قانونی.",
         "پژوهشگران · اساتید · آزمایشگاه‌ها"),
        ("Helix Build", "هلیکس بیلد", ELECTRIC,
         "توسعه وب فول‌استک",
         "وب‌سایت کسب‌وکار · فروشگاه آنلاین · سامانه رزرو · داشبورد · اپلیکیشن سفارشی · یکپارچه‌سازی API.",
         "KOBİ · کلینیک · فروشگاه · استارتاپ"),
        ("Helix Insight", "هلیکس اینسایت", EMERALD,
         "تحلیل داده و خودکارسازی",
         "استخراج داده از API · تحلیل فروش و مشتری · داشبورد · اسکریپت‌های خودکار · پیش‌بینی پایه.",
         "ای‌کامرس · خرده‌فروشی · D2C"),
    ]
    card_h = 64 * mm
    card_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 3
    for i, (en_name, fa_name, accent, kicker, desc, who) in enumerate(cards):
        cx = MARGIN + i * (card_w + 4 * mm)
        cy = y - card_h
        c.setFillColor(SURFACE)
        c.setStrokeColor(HAIR)
        c.setLineWidth(0.5)
        c.roundRect(cx, cy, card_w, card_h, 2 * mm, fill=1, stroke=1)
        c.setFillColor(accent)
        c.rect(cx, cy + card_h - 4 * mm, card_w, 4 * mm, fill=1, stroke=0)
        # title — Persian right, English subtitle right
        fa_right(c, cx + card_w - 4 * mm, cy + card_h - 13 * mm, fa_name, font=FA, size=14, color=INK)
        en_right(c, cx + card_w - 4 * mm, cy + card_h - 18 * mm, en_name, font=ENB, size=7.5, color=accent)
        fa_right(c, cx + card_w - 4 * mm, cy + card_h - 25 * mm, kicker, font=FA, size=9, color=accent)
        fa_wrap_right(c, cx + card_w - 4 * mm, cy + card_h - 32 * mm, desc, card_w - 8 * mm,
                      font=FA, size=9, leading=13, color=SLATE)
        c.setFillColor(accent)
        c.rect(cx + card_w - 6 * mm, cy + 5 * mm, 1.5 * mm, 4 * mm, fill=1, stroke=0)
        fa_right(c, cx + card_w - 9 * mm, cy + 6 * mm, who, font=FA, size=9, color=INK)


def page_business(c):
    fill(c, SURFACE)
    page_chrome(c, 3, 8, "§ ۰۲   مدل کسب‌وکار", accent=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "درآمد و قیمت‌گذاری", "چگونه درآمد می‌سازیم.", accent=INDIGO)

    fa_right(c, PAGE_W - MARGIN, y, "ترکیب درآمد هدف", font=FA, size=9, color=INDIGO)
    y -= 6 * mm

    # donut on left, legend on right (Persian)
    donut(c, MARGIN + 22 * mm, y - 22 * mm, 18 * mm, 9 * mm,
          [(0.40, INDIGO, ""),
           (0.25, EMERALD, ""),
           (0.30, ELECTRIC, ""),
           (0.05, BRASS, "")])

    legend = [
        ("اشتراک‌ها  ٪۴۰",   INDIGO,   "Insight + پلن مراقبت Build"),
        ("ریتینر    ٪۲۵",   EMERALD,  "ساعت‌های ماهانه پژوهش"),
        ("پروژه ثابت ٪۳۰",  ELECTRIC, "Build و پروژه‌های یک‌بار مصرف"),
        ("افزودنی‌ها  ٪۵",   BRASS,    "داشبورد اضافه، یکپارچه‌سازی، آموزش"),
    ]
    lx = MARGIN + 50 * mm
    ly = y - 6 * mm
    for label, col, note in legend:
        c.setFillColor(col)
        c.rect(lx, ly - 1 * mm, 4 * mm, 4 * mm, fill=1, stroke=0)
        fa_right(c, PAGE_W - MARGIN, ly, label, font=FA, size=10, color=INK)
        fa_right(c, PAGE_W - MARGIN - 30 * mm, ly, note, font=FA, size=9, color=SLATE)
        ly -= 7 * mm

    y -= 50 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 8 * mm

    fa_right(c, PAGE_W - MARGIN, y, "سطح‌های قیمت‌گذاری  ·  ₺ TRY  /  $ USD", font=FA, size=9, color=INDIGO)
    y -= 8 * mm

    # Pricing table — header (Insight | Build | Research | TIER) right-to-left
    headers = ["INSIGHT", "BUILD", "RESEARCH", "سطح"]
    rows = [
        ("پایه",
         "₺ ۸٬۰۰۰\nتحلیل تک",
         "₺ ۱۸٬۰۰۰\nسایت لندینگ، ۲ هفته",
         "₺ ۱۲٬۰۰۰\nیک داشبورد، هفتگی"),
        ("استاندارد",
         "₺ ۲۲٬۰۰۰\nخط لوله کامل + ویز",
         "₺ ۵۵٬۰۰۰\nچندصفحه‌ای / فروشگاه ≤۵۰",
         "₺ ۳۸K + ₺۶K/ماه\n۳ منبع، ۲ داشبورد"),
        ("پریمیوم",
         "₺ +۶۰K\nچندماهه + ML",
         "₺ +۱۲۰K\nاپ سفارشی / فروشگاه",
         "₺ ۹۵K + ₺۱۴K/ماه\nپیش‌بینی + QBR"),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 4
    c.setFillColor(INDIGO)
    c.rect(MARGIN, y - 7 * mm, PAGE_W - 2 * MARGIN, 7 * mm, fill=1, stroke=0)
    for i, h in enumerate(headers):
        # tier column at far right (i=3); divisions at i=0..2
        x_text = PAGE_W - MARGIN - i * col_w - 4 * mm
        if i == 3:
            fa_right(c, x_text, y - 4.5 * mm, h, font=FA, size=10, color=SURFACE)
        else:
            en_right(c, x_text, y - 4.5 * mm, h, font=ENB, size=9, color=SURFACE)
    y -= 7 * mm

    for ri, (tier, *cells) in enumerate(rows):
        rh = 18 * mm
        if ri % 2 == 0:
            c.setFillColor(PANEL)
            c.rect(MARGIN, y - rh, PAGE_W - 2 * MARGIN, rh, fill=1, stroke=0)
        # tier column (rightmost)
        fa_right(c, PAGE_W - MARGIN - 4 * mm, y - 8 * mm, tier, font=FA, size=12, color=INK)
        # cells: research, build, insight (left-to-right in our list, but right-to-left in layout)
        # cells order in tuple: research, build, insight
        for ci, cell in enumerate(cells):
            # ci=0 research → col index 2 from right; ci=1 build → 1; ci=2 insight → 0
            visual_col = 2 - ci  # 0..2 from right side
            x_right = PAGE_W - MARGIN - (visual_col + 1) * col_w - 4 * mm
            lines = cell.split("\n")
            fa_right(c, x_right, y - 6 * mm, lines[0], font=FA, size=10, color=INK)
            if len(lines) > 1:
                fa_right(c, x_right, y - 11 * mm, lines[1], font=FA, size=9, color=SLATE)
        y -= rh
        hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=LINE)

    y -= 6 * mm
    fa_right(c, PAGE_W - MARGIN, y, "پلن‌های مراقبت / ریتینر", font=FA, size=9, color=BRASS)
    fa_right(c, PAGE_W - MARGIN - 36 * mm, y,
             "₺ ۴٬۰۰۰ تا ۱۸٬۰۰۰ در ماه  ·  میزبانی، نگهداری، کارهای جزئی",
             font=FA, size=9, color=SLATE)


def page_apis(c):
    fill(c, SURFACE)
    page_chrome(c, 4, 8, "§ ۰۳   APIهای اصلی", accent=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "معماری APIمحور", "یک پلتفرم. پنج API.", accent=INDIGO)

    # conventions strip
    c.setFillColor(PANEL)
    c.roundRect(MARGIN, y - 16 * mm, PAGE_W - 2 * MARGIN, 14 * mm, 2 * mm, fill=1, stroke=0)
    fa_right(c, PAGE_W - MARGIN - 4 * mm, y - 5 * mm, "قراردادهای پایه", font=FA, size=9, color=INDIGO)
    en_left(c, MARGIN + 4 * mm, y - 11 * mm,
            "api.helixlabs.io/v1   ·   JSON   ·   JWT   ·   RFC 7807   ·   Idempotency-Key",
            font="Courier-Bold", size=9, color=INK)
    y -= 22 * mm

    apis = [
        ("۱.  Client Management API   ·   مدیریت مشتری", INDIGO,
         [("POST",  "/clients",                       "ایجاد مشتری"),
          ("GET",   "/clients/{id}",                  "جزئیات"),
          ("PATCH", "/clients/{id}",                  "ویرایش"),
          ("POST",  "/clients/{id}/projects",         "افزودن پروژه"),
          ("GET",   "/clients/{id}/timeline",         "خط زمانی فعالیت")]),
        ("۲.  Analytics API   ·   تحلیل داده", EMERALD,
         [("POST",  "/datasets",                      "بارگذاری CSV / منبع API"),
          ("POST",  "/datasets/{id}/clean",           "اجرای پاک‌سازی"),
          ("POST",  "/pipelines/{id}/run",            "اجرای خط لوله"),
          ("POST",  "/reports",                       "تولید گزارش"),
          ("GET",   "/dashboards/{id}/kpis",          "خوراک زنده KPI")]),
        ("۳.  Research Support API   ·   پژوهش", FOREST,
         [("POST",  "/research/cases",                "آغاز پروژه پژوهشی"),
          ("POST",  "/research/cases/{id}/datasets",  "بارگذاری داده ناشناس"),
          ("POST",  "/research/cases/{id}/requests",  "درخواست تحلیل"),
          ("GET",   "/research/cases/{id}/results",   "نتایج ساخت‌یافته"),
          ("GET",   "/research/cases/{id}/audit",     "مسیر اخلاقی (فقط خواندن)")]),
        ("۴.  Web Project API   ·   پروژه وب", ELECTRIC,
         [("POST",  "/projects",                      "ایجاد پروژه با تیر"),
          ("GET",   "/projects/{id}",                 "وضعیت و درصد پیشرفت"),
          ("POST",  "/projects/{id}/milestones",      "ثبت نقطه عطف"),
          ("GET",   "/projects/{id}/deployment",      "وضعیت استقرار، URL پیش‌نمایش")]),
        ("۵.  Automation API   ·   خودکارسازی", VIOLET,
         [("POST",  "/jobs",                          "ثبت کار زمان‌بندی‌شده"),
          ("POST",  "/jobs/{id}/run",                 "اجرای دستی"),
          ("GET",   "/jobs/{id}/runs",                "تاریخچه اجراها"),
          ("POST",  "/scrapers",                      "تنظیم اسکرپر")]),
    ]
    for title, accent, lines in apis:
        # title bar — Persian right
        fa_right(c, PAGE_W - MARGIN, y, title, font=FA, size=9, color=accent)
        y -= 6 * mm
        box_h = (len(lines) * 4 * mm) + 5 * mm
        c.setFillColor(HexColor("#0A1F36"))
        c.setStrokeColor(HexColor("#1F3658"))
        c.setLineWidth(0.4)
        c.roundRect(MARGIN, y - box_h, PAGE_W - 2 * MARGIN, box_h, 2 * mm, fill=1, stroke=1)
        cy = y - 4 * mm
        for verb, path, desc in lines:
            verb_color = {"GET": SKY, "POST": EMERALD, "PATCH": AMBER, "DELETE": ROSE}.get(verb, MIST)
            c.setFillColor(verb_color)
            c.setFont("Courier-Bold", 8)
            c.drawString(MARGIN + 4 * mm, cy, verb)
            c.setFillColor(SURFACE)
            c.drawString(MARGIN + 17 * mm, cy, path)
            # Persian description right-aligned
            fa_right(c, PAGE_W - MARGIN - 4 * mm, cy, desc, font=FA, size=8.5, color=MIST)
            cy -= 4 * mm
        y -= box_h + 4 * mm


def page_kpis(c):
    fill(c, SURFACE)
    page_chrome(c, 5, 8, "§ ۰۴   شاخص‌های کلیدی عملکرد", accent=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "KPIها", "آنچه اندازه می‌گیریم.", accent=INDIGO)

    cols = 3
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / cols
    div_h = 80 * mm

    divisions = [
        ("Helix Insight", "هلیکس اینسایت", EMERALD, [
            ("گزارش‌های تولیدشده / هفته", "+۲۵"),
            ("داشبوردهای فعال", "رشد ماهانه"),
            ("افزایش فروش مشتری", "٪۱۰+"),
            ("ریزش اشتراک ماهانه", "≤ ٪۴"),
        ]),
        ("Helix Build", "هلیکس بیلد", ELECTRIC, [
            ("پروژه تحویلی / ماه", "۳ تا ۶"),
            ("امتیاز Lighthouse", "≥ ۹۲"),
            ("نگهداشت پلن مراقبت", "≥ ٪۷۰"),
            ("تحویل به‌موقع", "≥ ٪۹۰"),
        ]),
        ("Helix Research", "هلیکس ریسرچ", FOREST, [
            ("پروژه فعال / ماه", "۴ تا ۸"),
            ("رضایت مشتری", "≥ ۴٫۵ / ۵"),
            ("دقت داده", "≥ ٪۹۹"),
            ("زمان میانگین تحویل", "≤ ۱۴ روز"),
        ]),
    ]
    for i, (en_name, fa_name, accent, kpis) in enumerate(divisions):
        cx = MARGIN + i * (col_w + 4 * mm)
        cy = y - div_h
        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.roundRect(cx, cy, col_w, div_h, 2 * mm, fill=1, stroke=1)
        c.setFillColor(accent)
        c.rect(cx, cy + div_h - 3 * mm, col_w, 3 * mm, fill=1, stroke=0)
        fa_right(c, cx + col_w - 4 * mm, cy + div_h - 12 * mm, fa_name, font=FA, size=12, color=INK)
        en_right(c, cx + col_w - 4 * mm, cy + div_h - 17 * mm, en_name, font=ENB, size=7.5, color=accent)
        rk = cy + div_h - 26 * mm
        for label, target in kpis:
            fa_right(c, cx + col_w - 4 * mm, rk, label, font=FA, size=9, color=SLATE)
            c.setFillColor(accent)
            c.setFont(ENB, 10)
            c.drawString(cx + 4 * mm, rk, target)
            rk -= 4 * mm
            hairline(c, cx + 4 * mm, rk + 1.5 * mm, cx + col_w - 4 * mm, rk + 1.5 * mm, color=LINE)
            rk -= 6 * mm

    y -= div_h + 12 * mm
    fa_right(c, PAGE_W - MARGIN, y, "KPIهای سطح شرکت  ·  هدف سال یکم", font=FA, size=9, color=INDIGO)
    y -= 10 * mm

    tiles = [
        ("MRR",                       "₺ ۱۸۰K",   "هدف سال یکم"),
        ("LTV : CAC",                 "≥ ۵ : ۱",  "سالم در سطح SaaS"),
        ("CAC",                       "≤ ₺ ۴٬۵۰۰", "هزینه جذب هر مشتری"),
        ("فروش متقاطع",                 "≥ ٪۲۵",   "مشتریان در ۲+ بخش"),
    ]
    tw = (PAGE_W - 2 * MARGIN - 9 * mm) / 4
    th = 30 * mm
    for i, (l, v, d) in enumerate(tiles):
        x = MARGIN + i * (tw + 3 * mm)
        c.setFillColor(SURFACE)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.roundRect(x, y - th, tw, th, 2 * mm, fill=1, stroke=1)
        # right-aligned label (for non-Latin)
        fa_right(c, x + tw - 4 * mm, y - 6 * mm, l, font=FA, size=8.5, color=SLATE)
        c.setFillColor(INK)
        c.setFont(ENB, 18)
        c.drawString(x + 4 * mm, y - 16 * mm, v)
        fa_right(c, x + tw - 4 * mm, y - th + 4 * mm, d, font=FA, size=8.5, color=EMERALD)

    y -= th + 12 * mm
    fa_right(c, PAGE_W - MARGIN, y, "پیش‌نمایش داشبورد داخلی  ·  MRR ۱۲ ماهه", font=FA, size=9, color=INDIGO)
    y -= 8 * mm
    chart_h = 28 * mm
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, y - chart_h, PAGE_W - 2 * MARGIN, chart_h, 2 * mm, fill=1, stroke=1)
    line_chart(c, MARGIN + 6 * mm, y - chart_h + 4 * mm, PAGE_W - 2 * MARGIN - 12 * mm, chart_h - 8 * mm,
               series=[[14, 22, 28, 36, 42, 56, 68, 82, 96, 118, 140, 184]],
               colors=[INDIGO],
               fills=[Color(0.12, 0.10, 0.30, alpha=0.18)])


def page_workflow(c):
    fill(c, SURFACE)
    page_chrome(c, 6, 8, "§ ۰۵   جریان کار و ابزارها", accent=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "نحوه کار", "از مشتری تا تحویل.", accent=INDIGO)

    # 6-step lifecycle (RTL: 1 starts on right)
    steps_fa = ["سرنخ", "مشاوره", "پیشنهاد", "قرارداد", "اجرا", "مراقبت"]
    cols = len(steps_fa)
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y - 8 * mm
    for i, t in enumerate(steps_fa):
        # In RTL, step 1 should be on the right
        visual_i = cols - 1 - i
        cx = MARGIN + visual_i * cw_col
        if i > 0:
            # arrow points right-to-left
            c.setStrokeColor(INDIGO)
            c.setLineWidth(0.6)
            c.line(cx + cw_col - 1 * mm, top - 6 * mm, cx + cw_col + 4 * mm, top - 6 * mm)
            c.line(cx + cw_col - 1 * mm, top - 5 * mm, cx + cw_col + 4 * mm - 2 * mm, top - 6 * mm + 1 * mm)
        c.setFillColor(INDIGO)
        c.circle(cx + cw_col / 2, top - 6 * mm, 4.5 * mm, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.setFont(ENB, 9)
        c.drawCentredString(cx + cw_col / 2, top - 7.5 * mm, str(i + 1))
        c.setFillColor(INK)
        c.setFont(FA, 11)
        c.drawCentredString(cx + cw_col / 2, top - 18 * mm, fa(t))

    y = top - 28 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
    col_l = MARGIN
    col_r_x = PAGE_W - MARGIN  # right-aligned column start

    # Right column: tools (placed on right since RTL)
    fa_right(c, col_r_x, y, "ابزارها  ·  سبک و مقرون‌به‌صرفه", font=FA, size=9, color=INDIGO)
    cy = y - 8 * mm
    tools = [
        ("CRM",            "HubSpot Free  →  Notion CRM"),
        ("مدیریت پروژه",   "Linear  /  Notion Projects"),
        ("اسناد / پیشنهاد", "Notion + PandaDoc"),
        ("ارتباط داخلی",   "Slack  ·  کانال هر بخش"),
        ("ارتباط با مشتری", "ایمیل + WhatsApp Business"),
        ("صورتحساب TR",     "iyzico / Paratika / Logo"),
        ("صورتحساب بین‌الملل", "Stripe + Wise"),
        ("کد و CI",        "GitHub + Actions"),
        ("تحلیل خودی",     "Plausible + Sentry"),
    ]
    for label, val in tools:
        fa_right(c, col_r_x, cy, label, font=FA, size=9, color=INDIGO)
        en_right(c, col_r_x - 32 * mm, cy, val, font=ENB, size=9, color=INK)
        cy -= 5 * mm
        hairline(c, col_r_x - col_w, cy + 1.8 * mm, col_r_x, cy + 1.8 * mm, color=LINE)
        cy -= 1 * mm

    # Left column: stage gates (Persian heading aligned right of its own column)
    col_l_right = MARGIN + col_w
    fa_right(c, col_l_right, y, "دروازه‌های مرحله‌ای", font=FA, size=9, color=INDIGO)
    cy = y - 8 * mm
    gates = [
        ("Discover → Design", "بریف امضا‌شده + ٪۵۰ پیش‌پرداخت"),
        ("Design → Build",    "تأیید مشتری روی موکاپ"),
        ("Build → QA",        "بازبینی کد + قبولی تست‌ها"),
        ("QA → Launch",       "تأیید UAT مشتری"),
        ("Launch → Care",     "قرارداد مراقبت امضا"),
    ]
    for trans, gate in gates:
        c.setFillColor(EMERALD)
        c.rect(col_l_right - 2 * mm, cy - 1 * mm, 2 * mm, 4 * mm, fill=1, stroke=0)
        fa_right(c, col_l_right - 5 * mm, cy + 1 * mm, gate, font=FA, size=9, color=INK)
        en_right(c, col_l_right - 5 * mm, cy - 4 * mm, trans, font=ENB, size=8.5, color=SLATE)
        cy -= 11 * mm

    # comms callout
    box_y = MARGIN + 8 * mm
    box_h = 22 * mm
    c.setFillColor(INDIGO)
    c.roundRect(MARGIN, box_y, PAGE_W - 2 * MARGIN, box_h, 2 * mm, fill=1, stroke=0)
    c.setFillColor(BRASS)
    c.rect(PAGE_W - MARGIN - 4 * mm, box_y, 4 * mm, box_h, fill=1, stroke=0)
    fa_right(c, PAGE_W - MARGIN - 8 * mm, box_y + box_h - 6 * mm, "نظم ارتباطی", font=FA, size=9, color=BRASS)
    fa_wrap_right(c, PAGE_W - MARGIN - 8 * mm, box_y + box_h - 12 * mm,
                  "هر مشتری یک کانال رسمی دارد (ایمیل یا واتس‌اپ). تمام تصمیم‌ها ظرف ۲۴ ساعت در نوشن ثبت می‌شوند. اسلک فقط تیمی است — مشتری هیچ‌وقت نمی‌بیند.",
                  PAGE_W - 2 * MARGIN - 16 * mm, font=FA, size=10, leading=14, color=SURFACE)


def page_market(c):
    fill(c, SURFACE)
    page_chrome(c, 7, 8, "§ ۰۶   راهبرد بازار ترکیه", accent=ELECTRIC)

    y = PAGE_H - MARGIN - 12 * mm
    y = fa_heading(c, y, "ترکیه نخست / جهانی دوم", "میدان برد ما.", accent=ELECTRIC)

    fa_right(c, PAGE_W - MARGIN, y, "برنامه ورود ۹۰ روزه", font=FA, size=9, color=ELECTRIC)
    y -= 10 * mm

    phases = [
        ("ساحل اول",     "روز ۰ تا ۳۰",   "دو عمودی (کلینیک + بوتیک ای‌کامرس). سه نمونه‌کار رایگان یا کم‌هزینه.", ELECTRIC),
        ("مرجع‌سازی",     "روز ۳۰ تا ۶۰",  "تبدیل نمونه‌کارها به توصیه‌نامه. صفحات لندینگ عمودی. ۵–۸ پست هفتگی لینکدین.", VIOLET),
        ("موتور فروش",   "روز ۶۰ تا ۹۰",  "آوت‌باند (۵۰ ایمیل/هفته + واتس‌اپ). پکیج‌های Klinik Dijital و E-Ticaret Sprint.", EMERALD),
    ]
    for name, when, action, col in phases:
        bx = MARGIN
        bw = PAGE_W - 2 * MARGIN
        bh = 18 * mm
        by = y - bh
        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.roundRect(bx, by, bw, bh, 2 * mm, fill=1, stroke=1)
        c.setFillColor(col)
        c.rect(bx + bw - 5 * mm, by, 5 * mm, bh, fill=1, stroke=0)
        fa_right(c, bx + bw - 9 * mm, by + bh - 6 * mm, name, font=FA, size=12, color=INK)
        fa_right(c, bx + bw - 9 * mm, by + bh - 11 * mm, when, font=FA, size=9, color=col)
        fa_right(c, bx + bw - 50 * mm, by + bh - 11 * mm, action, font=FA, size=9, color=SLATE)
        y -= bh + 3 * mm

    y -= 4 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Two cols: needs (right) + channels (left)
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
    col_r_right = PAGE_W - MARGIN

    fa_right(c, col_r_right, y, "نیازهای کسب‌وکارهای کوچک ترکیه", font=FA, size=9, color=ELECTRIC)
    cy = y - 8 * mm
    needs = [
        ("۰۱", "وب‌سایت مدرن با تبدیل بالا",   "بسیاری روی Wix / WordPress قدیمی مانده‌اند."),
        ("۰۲", "ای‌کامرس بومی‌سازی‌شده",       "iyzico، Paratika، KDV، یکپارچگی کارگو."),
        ("۰۳", "سامانه رزرو و وقت‌دهی",        "کلینیک‌ها، آرایشگاه‌ها، رستوران‌ها."),
        ("۰۴", "داشبورد فروش و موجودی",        "یک صفحه به‌جای چهار اکسل."),
        ("۰۵", "خودکارسازی",                  "حذف گزارش‌های دستی و بلست‌های واتس‌اپ."),
        ("۰۶", "محتوای دوزبانه TR / EN",      "آماده برای رشد بین‌المللی."),
    ]
    for n, t, d in needs:
        c.setFillColor(ELECTRIC)
        c.setFont(FA, 9)
        c.drawString(col_r_right - col_w + 2 * mm, cy, fa(n))
        fa_right(c, col_r_right, cy, t, font=FA, size=10, color=INK)
        fa_right(c, col_r_right, cy - 4 * mm, d, font=FA, size=8.5, color=SLATE)
        cy -= 11 * mm

    col_l_right = MARGIN + col_w
    fa_right(c, col_l_right, y, "کانال‌ها", font=FA, size=9, color=ELECTRIC)
    cy = y - 8 * mm
    channels = [
        ("لینکدین",            "محتوای هفتگی توسط بنیان‌گذار، TR + EN"),
        ("اجتماعات عمودی",      "گروه‌های KOBİ، واتس‌اپ صنفی، تلگرام"),
        ("کارمزد ارجاع",        "٪۱۰ از فاکتور اول هر معرفی موفق"),
        ("یوتیوب + شورت",      "محتوای پایدار سؤال‌محور"),
        ("آوت‌باند مستقیم",     "۵۰ ایمیل/هفته + Loom شخصی‌سازی‌شده"),
    ]
    for label, val in channels:
        fa_right(c, col_l_right, cy, label, font=FA, size=10, color=INK)
        fa_right(c, col_l_right, cy - 4 * mm, val, font=FA, size=9, color=SLATE)
        cy -= 11 * mm

    # speed advantage
    cy -= 2 * mm
    box_h = 18 * mm
    c.setFillColor(ELECTRIC)
    c.roundRect(MARGIN, cy - box_h + 4 * mm, col_w, box_h, 2 * mm, fill=1, stroke=0)
    fa_right(c, MARGIN + col_w - 4 * mm, cy - 2 * mm, "خندق سرعت", font=FA, size=9, color=SURFACE)
    fa_right(c, MARGIN + col_w - 4 * mm, cy - 8 * mm,
             "Build ۲ هفته  ·  Research ۱۴ روز  ·  Insight ۷ روز",
             font=FA, size=10, color=SURFACE)
    fa_right(c, MARGIN + col_w - 4 * mm, cy - 12 * mm,
             "سرعت، ارزان‌ترین مزیت رقابتی در ترکیه است.",
             font=FA, size=9, color=HexColor("#CFE2F3"))


def page_close(c):
    fill(c, INDIGO)
    page_chrome(c, 8, 8, "§ ۰۷   توصیف · گام بعدی · کلوفون", accent=BRASS, on_dark=True)

    y = PAGE_H - MARGIN - 12 * mm
    fa_right(c, PAGE_W - MARGIN, y, "توصیف آماده استفاده", font=FA, size=10, color=BRASS)
    y -= 12 * mm
    c.setFillColor(SURFACE)
    c.setFont(FA, 22)
    c.drawRightString(PAGE_W - MARGIN, y, fa("سه رشته."))
    y -= 11 * mm
    c.setFillColor(BRASS)
    c.drawRightString(PAGE_W - MARGIN, y, fa("یک استودیو."))
    y -= 14 * mm

    c.setFillColor(SURFACE)
    y = fa_wrap_right(c, PAGE_W - MARGIN, y,
                      "هلیکس لبز یک استودیوی فنی مستقر در ترکیه است که سه تخصص را در یک تیم گرد می‌آورد: پشتیبانی پژوهش پزشکی، توسعه وب فول‌استک، و تحلیل داده کسب‌وکار. ما به پژوهشگران در ارائه تحلیل قابل دفاع، به SMBها در ساخت سایت و فروشگاه آنلاین، و به کسب‌وکارها در تبدیل داده عملیاتی به تصمیم کمک می‌کنیم.",
                      PAGE_W - 2 * MARGIN, font=FA, size=12, leading=18, color=SURFACE)
    y -= 4 * mm
    y = fa_wrap_right(c, PAGE_W - MARGIN, y,
                      "پکیج‌های آماده از ₺ ۱۲٬۰۰۰ شروع می‌شود و تحویل از ۷ روز ممکن است. مشتریان بین‌المللی به دلار، مشتریان ترکیه به لیر و با فاکتور KDV پرداخت می‌کنند.",
                      PAGE_W - 2 * MARGIN, font=FA, size=12, leading=18, color=MIST)

    y -= 8 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=HexColor("#2E2A6B"))
    y -= 10 * mm

    fa_right(c, PAGE_W - MARGIN, y, "قواعد سیستم بصری", font=FA, size=9, color=BRASS)
    y -= 8 * mm
    rules = [
        "گرید یکسان (ریل + ۱۲ ستون) در همه بروشورها.",
        "سیستم فولیو یکسان: § ۰X / برچسب صفحه / شماره صفحه.",
        "خط مویی به جای کادر — هرگز سایه استفاده نمی‌شود.",
        "تنها رنگ بخش است که تغییر می‌کند.",
        "برند مادر هر سه رنگ را به‌صورت نوار رنگین فقط روی جلد می‌برد.",
    ]
    for r in rules:
        c.setFillColor(BRASS)
        c.rect(PAGE_W - MARGIN - 2 * mm, y + 1 * mm, 2 * mm, 2 * mm, fill=1, stroke=0)
        fa_right(c, PAGE_W - MARGIN - 5 * mm, y, r, font=FA, size=10, color=SURFACE)
        y -= 6 * mm

    y -= 6 * mm
    fa_right(c, PAGE_W - MARGIN, y, "تحویلی‌های پیشنهادی بعدی", font=FA, size=9, color=BRASS)
    y -= 8 * mm
    nexts = [
        ("۰۱", "Pitch Deck بنیان‌گذار",     "۱۲ اسلاید برای گفت‌وگوی سرمایه‌گذار / شراکت"),
        ("۰۲", "OpenAPI 3.1 Spec",         "اسپک ماشین‌خوان برای هر ۵ API"),
        ("۰۳", "بسته قالب نوشن",            "CRM · برد پروژه · پیشنهادها · داشبورد KPI"),
        ("۰۴", "تک‌برگ Helix Studio Plan",   "برگه فروش پکیج فروش متقاطع"),
    ]
    for n, t, d in nexts:
        c.setFillColor(BRASS)
        c.setFont(FA, 10)
        c.drawString(PAGE_W - MARGIN - 12 * mm, y, fa(n))
        fa_right(c, PAGE_W - MARGIN - 18 * mm, y, t, font=FA, size=10, color=SURFACE)
        fa_right(c, PAGE_W - MARGIN - 80 * mm, y, d, font=FA, size=9.5, color=MIST)
        y -= 6 * mm
        hairline(c, MARGIN, y + 2 * mm, PAGE_W - MARGIN, y + 2 * mm, color=HexColor("#2E2A6B"))
        y -= 1 * mm

    # Colophon
    cy = MARGIN + 16 * mm
    fa_right(c, PAGE_W - MARGIN, cy + 6 * mm, "کلوفون", font=FA, size=9, color=BRASS)
    fa_right(c, PAGE_W - MARGIN, cy,
             "حروف SF Arabic.  ·  سه لهجه: Forest، Electric، Emerald.  ·  Brass برای پریمیوم.  ·  © هلیکس لبز، ۲۰۲۶.",
             font=FA, size=9, color=MIST)
    helix_mark(c, MARGIN + 10 * mm, cy + 4 * mm, r=8 * mm)


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Helix Labs — معماری شرکت")
    c.setAuthor("Helix Labs")
    c.setSubject("Persian / Farsi edition")

    page_cover(c);     c.showPage()
    page_brand(c);     c.showPage()
    page_business(c);  c.showPage()
    page_apis(c);      c.showPage()
    page_kpis(c);      c.showPage()
    page_workflow(c);  c.showPage()
    page_market(c);    c.showPage()
    page_close(c);     c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

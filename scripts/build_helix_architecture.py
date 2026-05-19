"""Helix Labs — Company Architecture Document (A4, 12 pages).

Unified brand system:
- Indigo primary, ivory paper, brass premium accent
- Three division accents: Forest (Research) · Electric (Build) · Emerald (Insight)
- Same folio/rail/hairline grammar as the three division brochures
"""
import math
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ---- unified palette ----
INDIGO   = HexColor("#1E1B4B")
DEEP     = HexColor("#0F0E2E")
INK      = HexColor("#0F172A")
SLATE    = HexColor("#475569")
MIST     = HexColor("#94A3B8")
SURFACE  = HexColor("#FFFFFF")
PAPER    = HexColor("#F7F4EC")  # warm ivory for premium pages
PANEL    = HexColor("#F1F5F9")  # cool light gray
LINE     = HexColor("#E2E8F0")
HAIR     = HexColor("#A89E89")

# division accents
FOREST   = HexColor("#1B4332")  # Helix Research
ELECTRIC = HexColor("#3B82F6")  # Helix Build
EMERALD  = HexColor("#10B981")  # Helix Insight
BRASS    = HexColor("#B08A3E")
CORAL    = HexColor("#EF4444")
AMBER    = HexColor("#F59E0B")
SKY      = HexColor("#0EA5E9")
VIOLET   = HexColor("#8B5CF6")
ROSE     = HexColor("#F43F5E")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
RAIL_W = 22 * mm

OUT = "/Users/sir.sh/testdevops/helix_architecture.pdf"


# ---------- primitives ----------

def fill(c, color):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def hairline(c, x1, y1, x2, y2, color=LINE, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def wrap(c, x, y, text, width, font="Helvetica", size=10, leading=13.5, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    line = ""
    for w in text.split():
        trial = (line + " " + w).strip()
        if c.stringWidth(trial, font, size) > width:
            c.drawString(x, y, line)
            y -= leading
            line = w
        else:
            line = trial
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def smallcaps(c, x, y, text, size=7.5, tracking=1.4, color=SLATE, font="Helvetica-Bold"):
    c.setFillColor(color)
    c.setFont(font, size)
    out = ""
    for ch in text.upper():
        out += ch + (" " * int(tracking))
    c.drawString(x, y, out.rstrip())


def vtext(c, x, y, text, size=7.5, color=PAPER, tracking=2, font="Helvetica-Bold"):
    c.saveState()
    c.translate(x, y)
    c.rotate(90)
    c.setFillColor(color)
    c.setFont(font, size)
    spaced = (" " * tracking).join(list(text))
    c.drawString(0, 0, spaced)
    c.restoreState()


def page_chrome(c, page_no, total, label, section_color=INDIGO, on_dark=False):
    rule = HexColor("#2E2A6B") if on_dark else INK
    foot_rule = HexColor("#2E2A6B") if on_dark else LINE
    main_text = SURFACE if on_dark else INK
    muted = MIST if on_dark else SLATE

    c.setFillColor(main_text)
    smallcaps(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "Helix Labs", size=8, color=main_text)
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(section_color)
    c.drawCentredString(PAGE_W / 2, PAGE_H - MARGIN + 2 * mm, label.upper())
    c.setFillColor(muted)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 2 * mm, f"{page_no:02d} / {total:02d}")
    hairline(c, MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN, color=rule, width=0.6)

    hairline(c, MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN, color=foot_rule)
    c.setFillColor(muted)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, MARGIN - 4 * mm, "Helix Labs  ·  Company Architecture  ·  Edition I / 2026")
    c.setFillColor(section_color)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(PAGE_W - MARGIN, MARGIN - 4 * mm, "helixlabs.io")


def heading(c, y, eyebrow, title, italic_tail=None, accent=INDIGO):
    smallcaps(c, MARGIN, y, eyebrow, size=8, color=accent)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(MARGIN, y, title)
    if italic_tail:
        pre = c.stringWidth(title, "Helvetica-Bold", 26)
        c.setFont("Helvetica-BoldOblique", 26)
        c.setFillColor(accent)
        c.drawString(MARGIN + pre + 4 * mm, y, italic_tail)
    return y - 12 * mm


def helix_mark(c, cx, cy, r=10 * mm, colors=(FOREST, ELECTRIC, EMERALD)):
    """Three interlocking strands forming the Helix monogram."""
    c.setLineWidth(1.6)
    c.setLineCap(1)
    for i, col in enumerate(colors):
        c.setStrokeColor(col)
        # offset arc
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
    """Decorative 3-color sweeping bands — used on cover."""
    n = 60
    for i in range(n):
        t = i / (n - 1)
        # three sine waves at different phases
        for k, col in enumerate([FOREST, ELECTRIC, EMERALD]):
            phase = k * (2 * math.pi / 3)
            yy = y + h / 2 + math.sin(t * 3 * math.pi + phase) * (h * 0.36)
            c.setStrokeColor(col)
            c.setLineWidth(0.8)
            xx = x + t * w
            xx2 = x + ((i + 1) / (n - 1)) * w
            yy2 = y + h / 2 + math.sin(((i + 1) / (n - 1)) * 3 * math.pi + phase) * (h * 0.36)
            c.line(xx, yy, xx2, yy2)


# ---------- charts ----------

def kpi_tile(c, x, y, w, h, label, value, delta, accent=EMERALD, on_dark=False):
    bg = HexColor("#26235C") if on_dark else SURFACE
    border = HexColor("#3A3679") if on_dark else LINE
    fg_label = MIST if on_dark else SLATE
    fg_value = SURFACE if on_dark else INK

    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, 2 * mm, fill=1, stroke=1)
    smallcaps(c, x + 4 * mm, y + h - 6 * mm, label, size=7, color=fg_label)
    c.setFillColor(fg_value)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(x + 4 * mm, y + h - 16 * mm, value)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 4 * mm, y + 4 * mm, f"▲ {delta}")


def sparkline(c, x, y, w, h, color=EMERALD, points=None):
    if points is None:
        points = [0.30, 0.42, 0.38, 0.55, 0.48, 0.62, 0.58, 0.70, 0.66, 0.78, 0.74, 0.86]
    n = len(points)
    step = w / (n - 1)
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    p = c.beginPath()
    for i, v in enumerate(points):
        px = x + i * step
        py = y + v * h
        if i == 0:
            p.moveTo(px, py)
        else:
            p.lineTo(px, py)
    c.drawPath(p, stroke=1, fill=0)


def bar_chart(c, x, y, w, h, values, color=INDIGO, accent=EMERALD, accent_idx=None):
    n = len(values)
    gap = 1.5
    bar_w = (w - gap * (n - 1)) / n
    max_v = max(values)
    hairline(c, x, y, x + w, y, color=LINE)
    for i, v in enumerate(values):
        col = accent if (accent_idx is not None and i in accent_idx) else color
        c.setFillColor(col)
        bh = (v / max_v) * (h - 4 * mm)
        c.rect(x + i * (bar_w + gap), y, bar_w, bh, fill=1, stroke=0)


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


# ---------- pages ----------

def page_cover(c):
    fill(c, INDIGO)

    # Top rail bands — three division accents
    bar_h = 2.5 * mm
    c.setFillColor(FOREST);   c.rect(0, PAGE_H - bar_h * 1, PAGE_W, bar_h, fill=1, stroke=0)
    c.setFillColor(ELECTRIC); c.rect(0, PAGE_H - bar_h * 2, PAGE_W, bar_h, fill=1, stroke=0)
    c.setFillColor(EMERALD);  c.rect(0, PAGE_H - bar_h * 3, PAGE_W, bar_h, fill=1, stroke=0)

    # Brand mark
    helix_mark(c, MARGIN + 12 * mm, PAGE_H - 38 * mm, r=10 * mm)

    smallcaps(c, MARGIN + 30 * mm, PAGE_H - 38 * mm, "Helix Labs", size=10, color=SURFACE)
    smallcaps(c, MARGIN + 30 * mm, PAGE_H - 44 * mm, "Three strands · One studio", size=7, color=BRASS)

    # Eyebrow
    y = PAGE_H - 70 * mm
    smallcaps(c, MARGIN, y, "Company Architecture  ·  Edition I  ·  2026", size=8, color=BRASS)

    # Title — display
    y -= 18 * mm
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 50)
    c.drawString(MARGIN, y, "A practical")
    y -= 16 * mm
    c.drawString(MARGIN, y, "studio for")
    y -= 16 * mm
    c.setFillColor(BRASS)
    c.setFont("Helvetica-BoldOblique", 50)
    c.drawString(MARGIN, y, "research,")
    y -= 16 * mm
    c.setFillColor(ELECTRIC)
    c.drawString(MARGIN, y, "web, and")
    y -= 16 * mm
    c.setFillColor(EMERALD)
    c.drawString(MARGIN, y, "data.")

    # three-strand band decoration
    three_strand_band(c, MARGIN, MARGIN + 38 * mm, PAGE_W - 2 * MARGIN, 28 * mm)

    # Bottom — promise + meta
    y2 = MARGIN + 18 * mm
    smallcaps(c, MARGIN, y2 + 8 * mm, "What is inside", size=8, color=BRASS)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica", 10.5)
    c.drawString(MARGIN, y2,
                 "Brand · divisions · business model · APIs · KPIs · Türkiye strategy · landing structure.")

    # bottom-right meta block
    c.setFillColor(MIST)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(PAGE_W - MARGIN, MARGIN + 12 * mm, "PREPARED BY  ·  FOUNDER")
    c.drawRightString(PAGE_W - MARGIN, MARGIN + 8 * mm, "FOR INTERNAL & PARTNER USE")
    c.drawRightString(PAGE_W - MARGIN, MARGIN + 4 * mm, "12 PAGES  ·  A4")


def page_brand(c):
    fill(c, PAPER)
    page_chrome(c, 2, 12, "§ 01   Brand & Divisions", section_color=BRASS)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Brand identity", "Three strands.", italic_tail="One studio.", accent=BRASS)

    # brand identity table
    rows = [
        ("Name",        "Helix Labs"),
        ("Tagline",     "Three strands. One studio."),
        ("Positioning", "A practical technical studio — affordable, fast, evidence-driven."),
        ("Voice",       "Calm, technical, business-minded. Receipts > promises."),
        ("Mark",        "Three interlocking strands → one helix."),
    ]
    for label, val in rows:
        smallcaps(c, MARGIN, y, label, size=7.5, color=BRASS)
        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        c.drawString(MARGIN + 28 * mm, y, val)
        y -= 6 * mm
        hairline(c, MARGIN, y + 2 * mm, PAGE_W - MARGIN, y + 2 * mm, color=HAIR)
        y -= 2 * mm

    # divisions cards
    y -= 6 * mm
    smallcaps(c, MARGIN, y, "Three Divisions, One Team", size=8, color=BRASS)
    y -= 12 * mm

    cards = [
        ("Helix Research", FOREST,
         "Medical research support",
         "Statistical analysis · data cleaning · methodology · visualization. Operates strictly within ethical & legal frameworks.",
         "Researchers · faculty · labs"),
        ("Helix Build", ELECTRIC,
         "Full-stack web development",
         "Business sites · e-commerce · booking systems · admin dashboards · custom web apps · API integrations.",
         "KOBİ · clinics · shops · startups"),
        ("Helix Insight", EMERALD,
         "Business analytics & automation",
         "API extraction · sales & customer analysis · dashboards · automation scripts · light forecasting.",
         "E-commerce · retail · D2C SMBs"),
    ]
    card_h = 64 * mm
    card_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 3
    for i, (name, accent, kicker, desc, who) in enumerate(cards):
        cx = MARGIN + i * (card_w + 4 * mm)
        cy = y - card_h
        c.setFillColor(SURFACE)
        c.setStrokeColor(HAIR)
        c.setLineWidth(0.5)
        c.roundRect(cx, cy, card_w, card_h, 2 * mm, fill=1, stroke=1)
        # accent strip
        c.setFillColor(accent)
        c.rect(cx, cy + card_h - 4 * mm, card_w, 4 * mm, fill=1, stroke=0)
        # title
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(cx + 4 * mm, cy + card_h - 13 * mm, name)
        smallcaps(c, cx + 4 * mm, cy + card_h - 19 * mm, kicker, size=7, color=accent)
        wrap(c, cx + 4 * mm, cy + card_h - 26 * mm, desc, card_w - 8 * mm,
             font="Helvetica", size=9, leading=12, color=SLATE)
        # who
        c.setFillColor(accent)
        c.rect(cx + 4 * mm, cy + 5 * mm, 1.5 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(cx + 8 * mm, cy + 6 * mm, who)


def page_business_model(c):
    fill(c, SURFACE)
    page_chrome(c, 3, 12, "§ 02   Business Model", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Revenue & pricing", "How we earn.", accent=INDIGO)

    # Revenue mix — donut + legend
    smallcaps(c, MARGIN, y, "Revenue mix target", size=7.5, color=INDIGO)
    y -= 6 * mm
    donut(c, MARGIN + 22 * mm, y - 22 * mm, 18 * mm, 9 * mm,
          [(0.40, INDIGO, "Subscriptions"),
           (0.25, EMERALD, "Retainers"),
           (0.30, ELECTRIC, "Fixed projects"),
           (0.05, BRASS, "Add-ons")])
    legend = [
        ("Subscriptions  40%", INDIGO,   "Insight + Build care plans"),
        ("Retainers      25%", EMERALD,  "Research monthly hours buckets"),
        ("Fixed projects 30%", ELECTRIC, "Build & one-off Research"),
        ("Add-ons         5%", BRASS,    "Extra dashboards, integrations, training"),
    ]
    lx = MARGIN + 50 * mm
    ly = y - 6 * mm
    for label, col, note in legend:
        c.setFillColor(col)
        c.rect(lx, ly - 1 * mm, 4 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(lx + 6 * mm, ly, label)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 9)
        c.drawString(lx + 60 * mm, ly, note)
        ly -= 7 * mm

    y -= 50 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 8 * mm

    # Pricing table
    smallcaps(c, MARGIN, y, "Pricing tiers  ·  ₺ TRY  /  $ USD", size=7.5, color=INDIGO)
    y -= 8 * mm

    headers = ["TIER", "RESEARCH", "BUILD", "INSIGHT"]
    rows = [
        ("Basic",
         "₺ 8,000 / $250\nSingle analysis",
         "₺ 18,000 / $550\nLanding site, 2-week",
         "₺ 12,000 / $380\n1 dashboard, weekly"),
        ("Standard",
         "₺ 22,000 / $680\nFull pipeline + viz",
         "₺ 55,000 / $1,700\nMulti-page or shop ≤50",
         "₺ 38K + ₺6K/mo\n3 sources, 2 dashboards"),
        ("Premium",
         "₺ 60K+ / $1,800+\nMulti-month + ML",
         "₺ 120K+ / $3,700+\nCustom app / e-com",
         "₺ 95K + ₺14K/mo\nPredictive + QBR"),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 4
    # header row
    c.setFillColor(INDIGO)
    c.rect(MARGIN, y - 7 * mm, PAGE_W - 2 * MARGIN, 7 * mm, fill=1, stroke=0)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 8.5)
    for i, h in enumerate(headers):
        c.drawString(MARGIN + i * col_w + 4 * mm, y - 4.5 * mm, h)
    y -= 7 * mm

    for ri, (tier, *cells) in enumerate(rows):
        rh = 18 * mm
        if ri % 2 == 0:
            c.setFillColor(PANEL)
            c.rect(MARGIN, y - rh, PAGE_W - 2 * MARGIN, rh, fill=1, stroke=0)
        # tier
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(MARGIN + 4 * mm, y - 8 * mm, tier)
        # cells
        for ci, cell in enumerate(cells):
            cx = MARGIN + (ci + 1) * col_w + 4 * mm
            lines = cell.split("\n")
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawString(cx, y - 6 * mm, lines[0])
            if len(lines) > 1:
                c.setFillColor(SLATE)
                c.setFont("Helvetica", 8.5)
                c.drawString(cx, y - 11 * mm, lines[1])
        y -= rh
        hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=LINE)

    y -= 6 * mm
    smallcaps(c, MARGIN, y, "Care / retainer plans", size=7, color=BRASS)
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN + 36 * mm, y, "₺ 4,000 – 18,000 / month  ·  hosting · maintenance · minor work")


def page_crosssell_value(c):
    fill(c, SURFACE)
    page_chrome(c, 4, 12, "§ 03   Cross-sell & Value", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Cross-sell strategy", "One client. Three doors.", accent=INDIGO)

    # cross-sell flows — two columns
    flows = [
        ("Build → Insight → Build",
         ELECTRIC,
         [("Mo 0", "Build delivers e-commerce site"),
          ("Mo 3", "Offer Insight sales dashboard"),
          ("Mo 6", "Offer Insight automation pack"),
          ("Mo 9", "Build add-on: custom internal tool")]),
        ("Research → Insight → Build",
         FOREST,
         [("Mo 0", "Research one-off analysis"),
          ("Mo 2", "Insight retainer for lab data"),
          ("Mo 4", "Build lab/research-group website"),
          ("Mo 6", "Insight expansion: predictive")]),
    ]
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
    for i, (name, accent, steps) in enumerate(flows):
        cx = MARGIN + i * (col_w + 8 * mm)
        cy = y
        c.setFillColor(accent)
        c.rect(cx, cy - 1 * mm, col_w, 2 * mm, fill=1, stroke=0)
        cy -= 6 * mm
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(cx, cy, name)
        cy -= 8 * mm
        for j, (when, what) in enumerate(steps):
            c.setFillColor(accent)
            c.circle(cx + 3 * mm, cy + 2 * mm, 2.5 * mm, fill=1, stroke=0)
            c.setFillColor(SURFACE)
            c.setFont("Helvetica-Bold", 6.5)
            c.drawCentredString(cx + 3 * mm, cy + 0.8 * mm, str(j + 1))
            c.setFillColor(SLATE)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(cx + 8 * mm, cy + 3 * mm, when)
            c.setFillColor(INK)
            c.setFont("Helvetica", 9)
            c.drawString(cx + 24 * mm, cy + 3 * mm, what)
            cy -= 8 * mm
            if j < len(steps) - 1:
                c.setStrokeColor(accent)
                c.setLineWidth(0.6)
                c.setDash(1, 1.5)
                c.line(cx + 3 * mm, cy + 4 * mm, cx + 3 * mm, cy + 7 * mm)
                c.setDash()

    y -= 56 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Bundled package callout
    box_h = 26 * mm
    c.setFillColor(INDIGO)
    c.roundRect(MARGIN, y - box_h, PAGE_W - 2 * MARGIN, box_h, 2 * mm, fill=1, stroke=0)
    c.setFillColor(BRASS)
    c.rect(MARGIN, y - box_h, 4 * mm, box_h, fill=1, stroke=0)
    smallcaps(c, MARGIN + 10 * mm, y - 6 * mm, "The Helix Studio Plan", size=8, color=BRASS)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(MARGIN + 10 * mm, y - 13 * mm, "Site + Sales Dashboard + 3-month optimization")
    c.setFillColor(MIST)
    c.setFont("Helvetica", 9.5)
    c.drawString(MARGIN + 10 * mm, y - 19 * mm,
                 "Bundled 15% below sum  ·  designed to anchor SMBs into the Helix ecosystem.")

    y -= box_h + 12 * mm

    # Value prop — competitor matrix
    smallcaps(c, MARGIN, y, "Why us vs. competitors", size=7.5, color=INDIGO)
    y -= 8 * mm
    headers = ["VS.", "WE WIN ON"]
    matrix = [
        ("Freelancers",         "Multi-discipline team · accountable · written process"),
        ("Local agencies",      "Real engineering depth (Python, ML, APIs) — not WordPress shops"),
        ("International firms", "60–80% lower price · Turkish-fluent · faster cycles"),
        ("In-house hires",      "No HR overhead · immediate productivity · full stack covered"),
    ]
    c.setFillColor(INDIGO)
    c.rect(MARGIN, y - 7 * mm, PAGE_W - 2 * MARGIN, 7 * mm, fill=1, stroke=0)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN + 4 * mm, y - 4.5 * mm, "VERSUS")
    c.drawString(MARGIN + 50 * mm, y - 4.5 * mm, "WE WIN ON")
    y -= 7 * mm
    for ri, (vs, win) in enumerate(matrix):
        rh = 8 * mm
        if ri % 2 == 0:
            c.setFillColor(PANEL)
            c.rect(MARGIN, y - rh, PAGE_W - 2 * MARGIN, rh, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 4 * mm, y - 5.5 * mm, vs)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 9.5)
        c.drawString(MARGIN + 50 * mm, y - 5.5 * mm, win)
        y -= rh


def page_tech_arch(c):
    fill(c, INDIGO)
    page_chrome(c, 5, 12, "§ 04   Technical Architecture", section_color=BRASS, on_dark=True)

    # eyebrow + title in light
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "API-first studio platform", size=8, color=BRASS)
    y -= 12 * mm
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(MARGIN, y, "One platform.")
    pre = c.stringWidth("One platform.", "Helvetica-Bold", 26)
    c.setFont("Helvetica-BoldOblique", 26)
    c.setFillColor(BRASS)
    c.drawString(MARGIN + pre + 4 * mm, y, "Five APIs.")
    y -= 14 * mm

    # System diagram — boxes drawn explicitly
    diagram_top = y
    diagram_h = 110 * mm
    diagram_y = y - diagram_h

    # marketing site box
    msx = MARGIN + 60 * mm
    msy = diagram_top - 18 * mm
    msw = PAGE_W - 2 * MARGIN - 120 * mm
    msh = 12 * mm
    c.setFillColor(HexColor("#26235C"))
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.5)
    c.roundRect(msx, msy, msw, msh, 2 * mm, fill=1, stroke=1)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(msx + msw / 2, msy + 5 * mm, "Public Marketing Site (Next.js)")

    # platform container
    px = MARGIN
    py = diagram_top - 100 * mm
    pw = PAGE_W - 2 * MARGIN
    ph = 78 * mm
    c.setFillColor(HexColor("#1B1844"))
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.5)
    c.roundRect(px, py, pw, ph, 3 * mm, fill=1, stroke=1)
    smallcaps(c, px + 4 * mm, py + ph - 6 * mm, "Helix Platform (internal)", size=7, color=BRASS)

    # client portal
    cpx = px + 60 * mm
    cpy = py + ph - 22 * mm
    cpw = pw - 120 * mm
    cph = 10 * mm
    c.setFillColor(HexColor("#26235C"))
    c.roundRect(cpx, cpy, cpw, cph, 2 * mm, fill=1, stroke=1)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(cpx + cpw / 2, cpy + 4 * mm, "Client Portal (React SPA)")

    # API gateway
    gx = px + 8 * mm
    gy = py + ph - 38 * mm
    gw = pw - 16 * mm
    gh = 9 * mm
    c.setFillColor(BRASS)
    c.roundRect(gx, gy, gw, gh, 1.5 * mm, fill=1, stroke=0)
    c.setFillColor(INDIGO)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(gx + gw / 2, gy + 3.5 * mm, "API GATEWAY  ·  Django REST")

    # five api boxes
    apis = [
        ("Client",     INDIGO),
        ("Analytics",  EMERALD),
        ("Research",   FOREST),
        ("Web",        ELECTRIC),
        ("Automation", VIOLET),
    ]
    api_y = py + 18 * mm
    api_h = 12 * mm
    api_w = (gw - 4 * mm * 4) / 5
    for i, (label, col) in enumerate(apis):
        ax = gx + i * (api_w + 4 * mm)
        c.setFillColor(col)
        c.roundRect(ax, api_y, api_w, api_h, 1.5 * mm, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(ax + api_w / 2, api_y + api_h / 2 - 1, label.upper())
        # link from gateway to api
        c.setStrokeColor(BRASS)
        c.setLineWidth(0.4)
        c.line(ax + api_w / 2, api_y + api_h, ax + api_w / 2, gy)

    # storage row
    sy = py + 4 * mm
    sh = 9 * mm
    sw = (gw - 4 * mm) / 2
    c.setFillColor(HexColor("#26235C"))
    c.setStrokeColor(HexColor("#3A3679"))
    c.roundRect(gx, sy, sw, sh, 1.5 * mm, fill=1, stroke=1)
    c.roundRect(gx + sw + 4 * mm, sy, sw, sh, 1.5 * mm, fill=1, stroke=1)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(gx + sw / 2, sy + 3.5 * mm, "POSTGRES (core)  +  S3 (datasets)")
    c.drawCentredString(gx + sw + 4 * mm + sw / 2, sy + 3.5 * mm, "REDIS (queue)  +  CELERY (workers)")
    # connect APIs down to storage
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.3)
    for i in range(5):
        ax = gx + i * (api_w + 4 * mm) + api_w / 2
        c.line(ax, api_y, ax, sy + sh)

    # external services row at bottom
    ey = py - 14 * mm
    eh = 10 * mm
    c.setFillColor(HexColor("#0F0E2E"))
    c.setStrokeColor(BRASS)
    c.roundRect(MARGIN, ey, PAGE_W - 2 * MARGIN, eh, 2 * mm, fill=1, stroke=1)
    c.setFillColor(MIST)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(PAGE_W / 2, ey + 3.5 * mm,
                        "EXTERNAL  ·  Stripe  ·  iyzico  ·  Mailgun  ·  Sentry  ·  Cloudflare")

    # connection from marketing & portal to gateway
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.4)
    c.line(msx + msw / 2, msy, msx + msw / 2, gy + gh)
    c.line(cpx + cpw / 2, cpy, cpx + cpw / 2, gy + gh)

    # stack table on left/right of bottom
    sy = ey - 12 * mm
    smallcaps(c, MARGIN, sy, "Stack", size=7.5, color=BRASS)
    sy -= 6 * mm
    pairs = [
        ("Backend",    "Django + DRF (core), Flask (light services)"),
        ("Workers",    "Celery + Redis"),
        ("Frontend",   "React + Tailwind (portal) · Next.js / HTML (client sites)"),
        ("DB",         "PostgreSQL prod · SQLite proto"),
        ("Hosting",    "Cloudflare front · Hetzner EU app"),
        ("Monitoring", "Sentry · Plausible · Grafana"),
    ]
    for label, val in pairs:
        c.setFillColor(BRASS)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN, sy, label.upper())
        c.setFillColor(SURFACE)
        c.setFont("Helvetica", 9.5)
        c.drawString(MARGIN + 28 * mm, sy, val)
        sy -= 5 * mm


def api_endpoints(c, x, y, title, accent, lines):
    """Draws a small-caps API title and a code block of endpoint lines."""
    smallcaps(c, x, y, title, size=8, color=accent)
    y -= 8 * mm
    box_x = x
    box_w = PAGE_W - 2 * MARGIN
    box_h = (len(lines) * 4 * mm) + 6 * mm
    c.setFillColor(HexColor("#0A1F36"))
    c.setStrokeColor(HexColor("#1F3658"))
    c.setLineWidth(0.4)
    c.roundRect(box_x, y - box_h, box_w, box_h, 2 * mm, fill=1, stroke=1)
    cy = y - 5 * mm
    for verb, path, desc in lines:
        # verb badge
        verb_color = {"GET": SKY, "POST": EMERALD, "PATCH": AMBER, "DELETE": ROSE}.get(verb, MIST)
        c.setFillColor(verb_color)
        c.setFont("Courier-Bold", 8)
        c.drawString(box_x + 4 * mm, cy, verb)
        # path
        c.setFillColor(SURFACE)
        c.setFont("Courier-Bold", 8)
        c.drawString(box_x + 17 * mm, cy, path)
        # desc
        c.setFillColor(MIST)
        c.setFont("Helvetica", 8)
        c.drawRightString(box_x + box_w - 4 * mm, cy, desc)
        cy -= 4 * mm
    return y - box_h - 6 * mm


def page_apis_one(c):
    fill(c, SURFACE)
    page_chrome(c, 6, 12, "§ 05   Core APIs (1 / 2)", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Core APIs", "Endpoints, by division.", accent=INDIGO)

    # Common conventions strip
    c.setFillColor(PANEL)
    c.roundRect(MARGIN, y - 16 * mm, PAGE_W - 2 * MARGIN, 14 * mm, 2 * mm, fill=1, stroke=0)
    smallcaps(c, MARGIN + 4 * mm, y - 5 * mm, "Conventions", size=7, color=INDIGO)
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN + 4 * mm, y - 11 * mm,
                 "Base: api.helixlabs.io/v1   ·   JSON   ·   JWT auth   ·   RFC 7807 errors   ·   Idempotency-Key on POST")
    y -= 22 * mm

    # 1. Client API
    y = api_endpoints(c, MARGIN, y, "1.  Client Management API", INDIGO, [
        ("POST",  "/clients",                       "create client"),
        ("GET",   "/clients",                       "list (paginated, filtered)"),
        ("GET",   "/clients/{id}",                  "detail"),
        ("PATCH", "/clients/{id}",                  "update"),
        ("POST",  "/clients/{id}/projects",         "attach a new project"),
        ("GET",   "/clients/{id}/timeline",         "unified activity feed"),
    ])

    # 2. Analytics API
    y = api_endpoints(c, MARGIN, y, "2.  Analytics API   ·   Helix Insight", EMERALD, [
        ("POST",  "/datasets",                      "upload CSV / register API source"),
        ("GET",   "/datasets/{id}",                 "status, schema preview"),
        ("POST",  "/datasets/{id}/clean",           "run cleaning pipeline"),
        ("POST",  "/pipelines",                     "define ETL pipeline"),
        ("POST",  "/pipelines/{id}/run",            "trigger run"),
        ("POST",  "/reports",                       "generate report bundle"),
        ("GET",   "/reports/{id}/pdf",              "export PDF"),
        ("GET",   "/dashboards/{id}/kpis",          "live KPI feed for portal"),
    ])

    # 3. Research API
    y = api_endpoints(c, MARGIN, y, "3.  Research Support API   ·   Helix Research", FOREST, [
        ("POST",  "/research/cases",                "open a research engagement"),
        ("POST",  "/research/cases/{id}/datasets",  "upload anonymized dataset"),
        ("POST",  "/research/cases/{id}/requests",  "request analysis"),
        ("GET",   "/research/cases/{id}/results",   "structured results + figures"),
        ("GET",   "/research/cases/{id}/audit",     "ethics/compliance trail (read-only)"),
    ])

    # Compliance gate callout
    c.setFillColor(FOREST)
    c.roundRect(MARGIN, y, PAGE_W - 2 * MARGIN, 14 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(BRASS)
    c.rect(MARGIN, y, 4 * mm, 14 * mm, fill=1, stroke=0)
    smallcaps(c, MARGIN + 8 * mm, y + 9 * mm, "Compliance gate", size=7, color=BRASS)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN + 8 * mm, y + 4 * mm,
                 "Every research case requires ethics_approval_ref + consent_attested = true. Hard block in API.")


def page_apis_two(c):
    fill(c, SURFACE)
    page_chrome(c, 7, 12, "§ 05   Core APIs (2 / 2)", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Web & Automation", "The build/run side.", accent=INDIGO)

    # 4. Web Project API
    y = api_endpoints(c, MARGIN, y, "4.  Web Project API   ·   Helix Build", ELECTRIC, [
        ("POST",  "/projects",                      "create with brief, tier"),
        ("GET",   "/projects/{id}",                 "status, stages, % complete"),
        ("POST",  "/projects/{id}/milestones",      "mark milestone complete"),
        ("GET",   "/projects/{id}/deployment",      "build status, preview URL"),
        ("POST",  "/projects/{id}/feedback",        "client feedback per stage"),
        ("GET",   "/projects/{id}/files",           "deliverables (designs, code links)"),
    ])

    # 5. Automation API
    y = api_endpoints(c, MARGIN, y, "5.  Automation API", VIOLET, [
        ("POST",  "/jobs",                          "register scheduled job"),
        ("GET",   "/jobs",                          "list"),
        ("POST",  "/jobs/{id}/run",                 "manual trigger"),
        ("GET",   "/jobs/{id}/runs",                "run history (status, logs)"),
        ("POST",  "/scrapers",                      "register scraper config"),
        ("POST",  "/integrations",                  "attach external account"),
    ])

    # webhooks block
    smallcaps(c, MARGIN, y, "Webhooks", size=7.5, color=INDIGO)
    y -= 8 * mm
    hooks = [
        "helixlabs.client.created",
        "helixlabs.report.ready",
        "helixlabs.project.deployed",
        "helixlabs.research.results.ready",
        "helixlabs.job.failed",
    ]
    px = MARGIN
    py = y
    c.setFont("Courier-Bold", 9)
    for h in hooks:
        w = c.stringWidth(h, "Courier-Bold", 9) + 8 * mm
        if px + w > PAGE_W - MARGIN:
            px = MARGIN
            py -= 8 * mm
        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.roundRect(px, py - 5 * mm, w, 6 * mm, 1 * mm, fill=1, stroke=1)
        c.setFillColor(INDIGO)
        c.drawString(px + 3 * mm, py - 3.5 * mm, h)
        px += w + 3 * mm

    y = py - 14 * mm

    # data models snippet
    smallcaps(c, MARGIN, y, "Key data models", size=7.5, color=INDIGO)
    y -= 8 * mm
    models = [
        ("Client",   "id  ·  name  ·  email  ·  company  ·  country  ·  division_focus[]  ·  lifecycle_stage  ·  owner_id"),
        ("Project",  "id  ·  client_id  ·  tier  ·  stage [discover|design|build|qa|launch|care]  ·  preview_url  ·  repo_url"),
        ("Dataset",  "id  ·  client_id  ·  source_type [csv|api|sql]  ·  status  ·  rows  ·  schema_json  ·  last_refresh_at"),
        ("Case",     "id  ·  client_id  ·  ethics_approval_ref  ·  consent_attested  ·  status  ·  results_uri"),
        ("Job",      "id  ·  client_id  ·  handler  ·  cron  ·  params_json  ·  last_status  ·  next_run_at"),
    ]
    for label, fields in models:
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN, y, label)
        c.setFillColor(SLATE)
        c.setFont("Courier", 8.5)
        c.drawString(MARGIN + 22 * mm, y, fields)
        y -= 5 * mm
        hairline(c, MARGIN, y + 2 * mm, PAGE_W - MARGIN, y + 2 * mm)
        y -= 2 * mm


def page_kpis(c):
    fill(c, SURFACE)
    page_chrome(c, 8, 12, "§ 06   KPI System", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "KPIs", "What we measure.", accent=INDIGO)

    # Three division panels
    cols = 3
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / cols
    div_h = 80 * mm

    divisions = [
        ("Helix Research", FOREST, [
            ("Active projects / month", "4–8"),
            ("Client satisfaction", "≥ 4.5 / 5"),
            ("Data accuracy rate", "≥ 99 %"),
            ("Average turnaround", "≤ 14 days"),
        ]),
        ("Helix Build", ELECTRIC, [
            ("Projects delivered / month", "3–6"),
            ("Lighthouse perf score", "≥ 92"),
            ("Care-plan retention (12 mo)", "≥ 70 %"),
            ("On-time delivery", "≥ 90 %"),
        ]),
        ("Helix Insight", EMERALD, [
            ("Reports generated / week", "25 +"),
            ("Active dashboards", "Growing MoM"),
            ("Avg client uplift", "+ 10 % sales"),
            ("Subscription churn / mo", "≤ 4 %"),
        ]),
    ]
    for i, (name, accent, kpis) in enumerate(divisions):
        cx = MARGIN + i * (col_w + 4 * mm)
        cy = y - div_h
        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.roundRect(cx, cy, col_w, div_h, 2 * mm, fill=1, stroke=1)
        c.setFillColor(accent)
        c.rect(cx, cy + div_h - 3 * mm, col_w, 3 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(cx + 4 * mm, cy + div_h - 12 * mm, name)
        rk = cy + div_h - 22 * mm
        for label, target in kpis:
            c.setFillColor(SLATE)
            c.setFont("Helvetica", 9)
            c.drawString(cx + 4 * mm, rk, label)
            c.setFillColor(accent)
            c.setFont("Helvetica-Bold", 10)
            c.drawRightString(cx + col_w - 4 * mm, rk, target)
            rk -= 4 * mm
            hairline(c, cx + 4 * mm, rk + 1.5 * mm, cx + col_w - 4 * mm, rk + 1.5 * mm, color=LINE)
            rk -= 6 * mm

    y -= div_h + 12 * mm
    smallcaps(c, MARGIN, y, "Company-level KPIs  ·  Year 1 targets", size=7.5, color=INDIGO)
    y -= 10 * mm

    # 4 KPI tiles
    tiles = [
        ("MRR",        "₺ 180K",   "Year-1 target", EMERALD),
        ("LTV : CAC",  "≥ 5 : 1",  "Healthy SaaS-grade",   EMERALD),
        ("CAC",        "≤ ₺ 4,500", "Per new customer",     EMERALD),
        ("Cross-sell", "≥ 25 %",   "Customers in 2+ divs", EMERALD),
    ]
    tw = (PAGE_W - 2 * MARGIN - 9 * mm) / 4
    th = 28 * mm
    for i, (l, v, d, col) in enumerate(tiles):
        kpi_tile(c, MARGIN + i * (tw + 3 * mm), y - th, tw, th, l, v, d, accent=col)

    y -= th + 12 * mm

    # mini dashboard mock — line chart of MRR
    smallcaps(c, MARGIN, y, "Internal dashboard preview  ·  12-mo MRR", size=7.5, color=INDIGO)
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
    page_chrome(c, 9, 12, "§ 07   Workflow & Tools", section_color=INDIGO)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "How we work", "Lead to launch.", accent=INDIGO)

    # 6-step lifecycle horizontal
    steps = ["Lead", "Consult", "Proposal", "Contract", "Execution", "Care"]
    cols = len(steps)
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y - 8 * mm
    for i, t in enumerate(steps):
        cx = MARGIN + i * cw_col
        if i > 0:
            c.setStrokeColor(INDIGO)
            c.setLineWidth(0.6)
            c.line(cx - 6 * mm, top - 6 * mm, cx - 1 * mm, top - 6 * mm)
            c.line(cx - 3 * mm, top - 5 * mm, cx - 1 * mm, top - 6 * mm)
            c.line(cx - 3 * mm, top - 7 * mm, cx - 1 * mm, top - 6 * mm)
        c.setFillColor(INDIGO)
        c.circle(cx + 5 * mm, top - 6 * mm, 4.5 * mm, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(cx + 5 * mm, top - 7.5 * mm, str(i + 1))
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(cx, top - 18 * mm, t)

    y = top - 28 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Tools — left col / Stage gates — right col
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2

    # LEFT: tools
    smallcaps(c, MARGIN, y, "Tools  ·  lean & cheap", size=7.5, color=INDIGO)
    cy = y - 8 * mm
    tools = [
        ("CRM",            "HubSpot Free  →  Notion CRM"),
        ("Project mgmt",   "Linear  /  Notion Projects"),
        ("Docs / proposals", "Notion + PandaDoc (e-sign)"),
        ("Internal comms", "Slack  ·  channels per division"),
        ("Client comms",   "Email + WhatsApp Business"),
        ("Invoicing TR",   "iyzico / Paratika / Logo"),
        ("Invoicing intl", "Stripe + Wise"),
        ("Code & CI",      "GitHub + Actions"),
        ("Analytics (own)", "Plausible + Sentry"),
    ]
    for label, val in tools:
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(MARGIN, cy, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        c.drawString(MARGIN + 30 * mm, cy, val)
        cy -= 5 * mm
        hairline(c, MARGIN, cy + 1.8 * mm, MARGIN + col_w, cy + 1.8 * mm, color=LINE)
        cy -= 1 * mm

    # RIGHT: stage gates
    col_r = MARGIN + col_w + 8 * mm
    smallcaps(c, col_r, y, "Stage gates  ·  no project advances without", size=7.5, color=INDIGO)
    cy = y - 8 * mm
    gates = [
        ("Discover → Design", "signed brief + 50 % deposit"),
        ("Design → Build",    "client sign-off on mockups"),
        ("Build → QA",        "code review + test pass"),
        ("QA → Launch",       "client UAT sign-off"),
        ("Launch → Care",     "care contract signed"),
    ]
    for trans, gate in gates:
        c.setFillColor(EMERALD)
        c.rect(col_r, cy - 1 * mm, 2 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(col_r + 5 * mm, cy + 1 * mm, trans)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 9)
        c.drawString(col_r + 5 * mm, cy - 4 * mm, gate)
        cy -= 11 * mm

    # Comms callout box
    box_y = MARGIN + 8 * mm
    box_h = 22 * mm
    c.setFillColor(INDIGO)
    c.roundRect(MARGIN, box_y, PAGE_W - 2 * MARGIN, box_h, 2 * mm, fill=1, stroke=0)
    c.setFillColor(BRASS)
    c.rect(MARGIN, box_y, 4 * mm, box_h, fill=1, stroke=0)
    smallcaps(c, MARGIN + 8 * mm, box_y + box_h - 6 * mm, "Communication discipline", size=7, color=BRASS)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica", 10)
    wrap(c, MARGIN + 8 * mm, box_y + box_h - 12 * mm,
         "Every client has a single channel of record (email or WhatsApp). All decisions land in writing in Notion within 24h. "
         "Slack is for the team — clients never see it. This stops scope creep before it starts.",
         PAGE_W - 2 * MARGIN - 16 * mm, font="Helvetica", size=10, leading=13, color=SURFACE)


def page_market(c):
    fill(c, SURFACE)
    page_chrome(c, 10, 12, "§ 08   Türkiye Market Strategy", section_color=ELECTRIC)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Türkiye-first / global-second", "Where we win.", accent=ELECTRIC)

    # 90-day entry plan as stacked bar / timeline
    smallcaps(c, MARGIN, y, "90-day entry plan", size=7.5, color=ELECTRIC)
    y -= 10 * mm

    phases = [
        ("Beachhead",     "Days 0 – 30",  "Pick 2 verticals (clinics + boutique e-com). Ship 3 case studies — free or near-free.", ELECTRIC),
        ("Reference",     "Days 30 – 60", "Convert beachhead into testimonials. Vertical landing pages. 5–8 LinkedIn posts/week from founder.", VIOLET),
        ("Sales engine",  "Days 60 – 90", "Outbound (50 emails/wk + WhatsApp). Productized: Klinik Dijital Paketi, E-Ticaret Sprint.", EMERALD),
    ]
    for i, (name, when, action, col) in enumerate(phases):
        bx = MARGIN
        bw = PAGE_W - 2 * MARGIN
        bh = 18 * mm
        by = y - bh
        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.roundRect(bx, by, bw, bh, 2 * mm, fill=1, stroke=1)
        c.setFillColor(col)
        c.rect(bx, by, 5 * mm, bh, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(bx + 9 * mm, by + bh - 6 * mm, name)
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(bx + 9 * mm, by + bh - 11 * mm, when.upper())
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 9)
        c.drawString(bx + 50 * mm, by + bh - 11 * mm, action)
        y -= bh + 3 * mm

    y -= 4 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Two columns: needs + channels
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
    col_l = MARGIN
    col_r = MARGIN + col_w + 8 * mm

    smallcaps(c, col_l, y, "What Turkish SMBs need most", size=7.5, color=ELECTRIC)
    cy = y - 8 * mm
    needs = [
        ("01", "A modern website that converts",    "Stuck on Wix/WordPress from 2018."),
        ("02", "Localized e-commerce",              "iyzico, Paratika, KDV invoicing, kargo."),
        ("03", "Reservation / booking systems",     "Clinics, salons, restaurants."),
        ("04", "Sales & inventory dashboards",      "One screen, not four spreadsheets."),
        ("05", "Automation",                        "Replacing manual reports & WhatsApp blasts."),
        ("06", "Bilingual TR / EN content",         "International ambitions."),
    ]
    for n, t, d in needs:
        c.setFillColor(ELECTRIC)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_l, cy, n)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(col_l + 8 * mm, cy, t)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 8.5)
        c.drawString(col_l + 8 * mm, cy - 4 * mm, d)
        cy -= 10 * mm

    smallcaps(c, col_r, y, "Channels", size=7.5, color=ELECTRIC)
    cy = y - 8 * mm
    channels = [
        ("LinkedIn",            "Founder-led, weekly playbook posts TR + EN"),
        ("Vertical communities", "KOBİ FB groups · sector WhatsApp · Telegram"),
        ("Referral fee",        "10 % of first invoice for any closing intro"),
        ("YouTube + shorts",    "\"Klinik web sitesi nasıl olmalı?\" evergreen"),
        ("Direct outbound",     "50/week, Loom-personalized"),
    ]
    for label, val in channels:
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(col_r, cy, label)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 9)
        c.drawString(col_r, cy - 4 * mm, val)
        cy -= 10 * mm

    # Speed advantage callout
    cy -= 2 * mm
    box_h = 18 * mm
    c.setFillColor(ELECTRIC)
    c.roundRect(col_r, cy - box_h + 4 * mm, col_w, box_h, 2 * mm, fill=1, stroke=0)
    smallcaps(c, col_r + 4 * mm, cy - 2 * mm, "Fast-delivery moat", size=7, color=SURFACE)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(col_r + 4 * mm, cy - 8 * mm, "2-week Build  ·  14-day Research  ·  7-day Insight setup")
    c.setFillColor(HexColor("#CFE2F3"))
    c.setFont("Helvetica", 8.5)
    c.drawString(col_r + 4 * mm, cy - 12 * mm, "Speed is Türkiye's most under-priced moat.")


def page_landing(c):
    fill(c, SURFACE)
    page_chrome(c, 11, 12, "§ 09   Brand & Landing Structure", section_color=BRASS)

    y = PAGE_H - MARGIN - 12 * mm
    y = heading(c, y, "Landing page system", "Master + three children.", accent=BRASS)

    # Master landing structure — wireframe
    smallcaps(c, MARGIN, y, "helixlabs.io  ·  master landing", size=7.5, color=BRASS)
    y -= 8 * mm

    blocks = [
        ("HERO", "Three strands. One studio.",       INDIGO,  16 * mm),
        ("DIVISIONS",  "Helix Research  ·  Helix Build  ·  Helix Insight", PANEL, 14 * mm),
        ("PROOF STRIP", "Logos  ·  127 projects  ·  4.9★  ·  14-day avg",  PANEL, 10 * mm),
        ("HOW WE WORK", "Audit → Plan → Build → Care",                    PANEL, 10 * mm),
        ("PRICING TEASER", "Productized packages from ₺ 12,000",          PANEL, 10 * mm),
        ("FOUNDER NOTE", "1 paragraph + face. Builds TR-market trust.",   PANEL, 10 * mm),
        ("CTA + WHATSAPP", "Book a 20-min consult  ·  WhatsApp button",   INDIGO,  12 * mm),
    ]
    for label, content, bg, h in blocks:
        c.setFillColor(bg)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.roundRect(MARGIN, y - h, PAGE_W - 2 * MARGIN, h, 1.5 * mm, fill=1, stroke=1)
        is_dark = bg == INDIGO
        c.setFillColor(BRASS if is_dark else INDIGO)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(MARGIN + 4 * mm, y - h + h - 4 * mm, label)
        c.setFillColor(SURFACE if is_dark else INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(MARGIN + 4 * mm, y - h + 4 * mm, content)
        y -= h + 1.5 * mm

    y -= 6 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Per-division pages table
    smallcaps(c, MARGIN, y, "Per-division landing pages", size=7.5, color=BRASS)
    y -= 8 * mm

    headers = ["", "RESEARCH", "BUILD", "INSIGHT"]
    rows = [
        ("Hero",     "Defensible analysis for medical research.", "Modern web for growing businesses.", "Turn your data into growth."),
        ("Audience", "Researchers · Faculty · Labs",              "KOBİ · Clinics · Shops · Startups",  "E-com · Retail · D2C"),
        ("Specimen", "ECG line · scatter plot",                   "Browser mock · code block",          "KPI tiles · funnel · heatmap"),
        ("CTA",      "Methodology consult",                       "2-week sprint",                       "First dashboard in 7 days"),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 4
    accents = [SLATE, FOREST, ELECTRIC, EMERALD]
    # header
    c.setFillColor(INDIGO)
    c.rect(MARGIN, y - 7 * mm, PAGE_W - 2 * MARGIN, 7 * mm, fill=1, stroke=0)
    for i, h in enumerate(headers):
        c.setFillColor(BRASS if i == 0 else accents[i])
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(MARGIN + i * col_w + 4 * mm, y - 4.5 * mm, h)
    y -= 7 * mm
    for ri, (label, *cells) in enumerate(rows):
        rh = 9 * mm
        if ri % 2 == 0:
            c.setFillColor(PANEL)
            c.rect(MARGIN, y - rh, PAGE_W - 2 * MARGIN, rh, fill=1, stroke=0)
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN + 4 * mm, y - 5.5 * mm, label)
        for ci, cell in enumerate(cells):
            c.setFillColor(INK)
            c.setFont("Helvetica", 8.5)
            c.drawString(MARGIN + (ci + 1) * col_w + 4 * mm, y - 5.5 * mm, cell)
        y -= rh
        hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=LINE)


def page_close(c):
    fill(c, INDIGO)
    page_chrome(c, 12, 12, "§ 10   Description · Next · Colophon", section_color=BRASS, on_dark=True)

    # Big quote-style business description
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "Ready-to-use business description", size=8, color=BRASS)
    y -= 12 * mm
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN, y, "Three strands.")
    y -= 11 * mm
    c.setFont("Helvetica-BoldOblique", 22)
    c.setFillColor(BRASS)
    c.drawString(MARGIN, y, "One studio.")
    y -= 14 * mm

    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Oblique", 12)
    y = wrap(c, MARGIN, y,
             "Helix Labs is a Türkiye-based technical studio combining three disciplines under one team: "
             "medical research support, full-stack web development, and business data analytics. We help "
             "researchers ship defensible analysis, help SMBs build modern websites and online stores, "
             "and help businesses turn their raw operational data into decisions.",
             PAGE_W - 2 * MARGIN, font="Helvetica-Oblique", size=12, leading=16, color=SURFACE)
    y -= 4 * mm
    y = wrap(c, MARGIN, y,
             "Productized packages start at ₺ 12,000 with delivery in as little as 7 days. International "
             "clients pay in USD; Turkish clients pay in lira with KDV-compliant invoicing.",
             PAGE_W - 2 * MARGIN, font="Helvetica-Oblique", size=12, leading=16, color=MIST)

    y -= 8 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=HexColor("#2E2A6B"))
    y -= 10 * mm

    # Visual layout rules
    smallcaps(c, MARGIN, y, "Visual system rules", size=7.5, color=BRASS)
    y -= 8 * mm
    rules = [
        "Same grid (rail + 12-column content) across every brochure & deck.",
        "Same folio system: § 0X / page label / page number.",
        "Hairline rules instead of boxes — never use shadows.",
        "Division accent color is the only thing that changes.",
        "Parent brand uses all three accents as a stripe — only on master cover.",
    ]
    c.setFillColor(SURFACE)
    c.setFont("Helvetica", 10)
    for r in rules:
        c.setFillColor(BRASS)
        c.rect(MARGIN, y + 1 * mm, 2 * mm, 2 * mm, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.drawString(MARGIN + 5 * mm, y, r)
        y -= 5.5 * mm

    y -= 6 * mm
    # next deliverables
    smallcaps(c, MARGIN, y, "Suggested next deliverables", size=7.5, color=BRASS)
    y -= 8 * mm
    nexts = [
        ("01", "Founder pitch deck",      "12 slides for investor / partnership conversations"),
        ("02", "OpenAPI 3.1 spec",        "Machine-readable spec for all 5 APIs above"),
        ("03", "Notion template pack",    "CRM · project board · proposals · KPI dashboard"),
        ("04", "Helix Studio Plan one-pager", "Cross-sell bundle sales sheet"),
    ]
    for n, t, d in nexts:
        c.setFillColor(BRASS)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN, y, n)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 8 * mm, y, t)
        c.setFillColor(MIST)
        c.setFont("Helvetica", 9.5)
        c.drawString(MARGIN + 70 * mm, y, d)
        y -= 6 * mm
        hairline(c, MARGIN, y + 2 * mm, PAGE_W - MARGIN, y + 2 * mm, color=HexColor("#2E2A6B"))
        y -= 1 * mm

    # Colophon
    cy = MARGIN + 16 * mm
    smallcaps(c, MARGIN, cy + 6 * mm, "Colophon", size=7, color=BRASS)
    c.setFillColor(MIST)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, cy,
                 "Set in Helvetica.  ·  Three accents: Forest, Electric, Emerald.  ·  Brass for premium.  "
                 "·  © Helix Labs, MMXXVI.")
    helix_mark(c, PAGE_W - MARGIN - 10 * mm, cy + 4 * mm, r=8 * mm)


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Helix Labs — Company Architecture")
    c.setAuthor("Helix Labs")
    c.setSubject("Brand · divisions · business model · APIs · KPIs · Türkiye strategy")

    page_cover(c);              c.showPage()
    page_brand(c);              c.showPage()
    page_business_model(c);     c.showPage()
    page_crosssell_value(c);    c.showPage()
    page_tech_arch(c);          c.showPage()
    page_apis_one(c);           c.showPage()
    page_apis_two(c);           c.showPage()
    page_kpis(c);               c.showPage()
    page_workflow(c);           c.showPage()
    page_market(c);             c.showPage()
    page_landing(c);            c.showPage()
    page_close(c);              c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

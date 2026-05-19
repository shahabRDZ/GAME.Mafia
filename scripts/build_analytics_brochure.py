"""Business Data Analytics & Automation — premium brochure (A4, 4 pages).

Design language: executive analytics report.
References: Stripe annual report, McKinsey insights, modern fintech briefings.
- Indigo primary, light gray panels, white surface
- Data accent palette used purposefully on charts only
- Signature chart specimens on every page: KPI tiles, sparklines,
  bar / line / donut / heatmap, funnels
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
import math

# ---- analytics palette ----
INDIGO = HexColor("#1E1B4B")    # primary navy/indigo
DEEP = HexColor("#0F0E2E")      # darker tone
INK = HexColor("#0F172A")       # body text
SLATE = HexColor("#475569")     # muted body
MIST = HexColor("#94A3B8")      # tertiary
SURFACE = HexColor("#FFFFFF")   # white
PANEL = HexColor("#F1F5F9")     # light gray panel
LINE = HexColor("#E2E8F0")      # hairlines

# data accents
EMERALD = HexColor("#10B981")   # positive / growth
ROSE = HexColor("#F43F5E")      # negative / urgent
AMBER = HexColor("#F59E0B")     # attention
SKY = HexColor("#0EA5E9")       # info
VIOLET = HexColor("#8B5CF6")    # secondary series

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

OUT = "/Users/sir.sh/testdevops/analytics_brochure.pdf"


# ---------- primitives ----------

def fill(c, color):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def hairline(c, x1, y1, x2, y2, color=LINE, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def wrap(c, x, y, text, width, font="Helvetica", size=10, leading=14, color=INK):
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


def page_chrome(c, page_no, total, label, on_dark=False):
    base = SURFACE if on_dark else INK
    if on_dark:
        smallcaps(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "Insight Lab", size=8, color=SURFACE)
        c.setFillColor(MIST)
    else:
        smallcaps(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "Insight Lab", size=8, color=INK)
        c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 2 * mm, label.upper())
    rule_color = HexColor("#2E2A6B") if on_dark else INK
    hairline(c, MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN, color=rule_color, width=0.6)

    # bottom
    foot = HexColor("#2E2A6B") if on_dark else LINE
    hairline(c, MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN, color=foot)
    c.setFillColor(MIST if on_dark else SLATE)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, MARGIN - 4 * mm, "Insight Lab  ·  Analytics & Automation")
    c.drawRightString(PAGE_W - MARGIN, MARGIN - 4 * mm, f"{page_no:02d} / {total:02d}")


# ---------- chart specimens ----------

def kpi_tile(c, x, y, w, h, label, value, delta, positive=True, on_dark=False):
    """A KPI card — label, big value, delta with arrow + sparkline."""
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
    c.setFont("Helvetica-Bold", 22)
    c.drawString(x + 4 * mm, y + h - 18 * mm, value)

    arrow = "▲" if positive else "▼"
    color = EMERALD if positive else ROSE
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 4 * mm, y + 5 * mm, f"{arrow} {delta}")

    # inline sparkline
    spark_x = x + w - 30 * mm
    spark_y = y + 5 * mm
    spark_w = 24 * mm
    spark_h = 9 * mm
    sparkline(c, spark_x, spark_y, spark_w, spark_h, color=color, baseline=fg_label)


def sparkline(c, x, y, w, h, color=EMERALD, baseline=MIST, points=None):
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
    # end dot
    c.setFillColor(color)
    c.circle(x + (n - 1) * step, y + points[-1] * h, 1.2, fill=1, stroke=0)


def bar_chart(c, x, y, w, h, values, labels=None, color=INDIGO, accent=EMERALD, accent_idx=None):
    n = len(values)
    gap = 1.2
    bar_w = (w - gap * (n - 1)) / n
    max_v = max(values)
    # baseline
    hairline(c, x, y, x + w, y, color=LINE)
    for i, v in enumerate(values):
        col = accent if (accent_idx is not None and i in accent_idx) else color
        c.setFillColor(col)
        bh = (v / max_v) * (h - 8 * mm)
        c.rect(x + i * (bar_w + gap), y, bar_w, bh, fill=1, stroke=0)
    if labels:
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 6.5)
        for i, lbl in enumerate(labels):
            c.drawCentredString(x + i * (bar_w + gap) + bar_w / 2, y - 4 * mm, lbl)


def line_chart(c, x, y, w, h, series, colors, fills=None, ymax=None):
    """series: list of list of values (same length). One axis."""
    n = len(series[0])
    if ymax is None:
        ymax = max(max(s) for s in series)
    # gridlines
    c.setStrokeColor(LINE)
    c.setLineWidth(0.4)
    for i in range(4):
        gy = y + (i + 1) * (h / 4)
        c.line(x, gy, x + w, gy)
    # baseline
    hairline(c, x, y, x + w, y, color=SLATE, width=0.5)
    step = w / (n - 1)
    for si, s in enumerate(series):
        # area fill
        if fills and fills[si]:
            c.setFillColor(fills[si])
            p = c.beginPath()
            p.moveTo(x, y)
            for i, v in enumerate(s):
                p.lineTo(x + i * step, y + (v / ymax) * h)
            p.lineTo(x + w, y)
            p.close()
            c.drawPath(p, stroke=0, fill=1)
        # line
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
        # dots at ends
        c.setFillColor(colors[si])
        c.circle(x + (n - 1) * step, y + (s[-1] / ymax) * h, 1.6, fill=1, stroke=0)


def donut(c, cx, cy, r_outer, r_inner, segments, on_dark=False):
    """segments: list of (fraction, color, label)."""
    start = 90  # top
    for frac, col, _ in segments:
        end = start - frac * 360
        c.setFillColor(col)
        # build pie slice as path
        p = c.beginPath()
        p.moveTo(cx, cy)
        # outer arc
        steps = max(2, int(abs(end - start) / 4))
        for i in range(steps + 1):
            a = math.radians(start + (end - start) * i / steps)
            p.lineTo(cx + r_outer * math.cos(a), cy + r_outer * math.sin(a))
        p.lineTo(cx, cy)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        start = end
    # inner hole
    c.setFillColor(SURFACE if not on_dark else INDIGO)
    c.circle(cx, cy, r_inner, fill=1, stroke=0)


def heatmap(c, x, y, cell_w, cell_h, rows, cols, values, base=INDIGO):
    """values: 2D list of floats 0–1 controlling alpha."""
    for r in range(rows):
        for col in range(cols):
            v = values[r][col]
            color = Color(base.red, base.green, base.blue, alpha=0.10 + 0.85 * v)
            c.setFillColor(color)
            c.rect(x + col * (cell_w + 0.6),
                   y + (rows - 1 - r) * (cell_h + 0.6),
                   cell_w, cell_h, fill=1, stroke=0)


def funnel(c, x, y, w, h, steps):
    """steps: list of (label, value 0–1, color)."""
    n = len(steps)
    row_h = h / n
    for i, (label, val, col) in enumerate(steps):
        bw = w * val
        bx = x + (w - bw) / 2
        by = y + h - (i + 1) * row_h + 1
        c.setFillColor(col)
        c.rect(bx, by, bw, row_h - 2, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + w / 2, by + (row_h - 2) / 2 - 2, label)


# ---------- pages ----------

def page_one(c):
    fill(c, INDIGO)

    # subtle grid
    c.setStrokeColor(HexColor("#2A2660"))
    c.setLineWidth(0.3)
    for i in range(1, 12):
        gx = MARGIN + i * (PAGE_W - 2 * MARGIN) / 12
        c.line(gx, MARGIN + 6 * mm, gx, PAGE_H - MARGIN - 6 * mm)

    page_chrome(c, 1, 4, "Volume I  ·  2026", on_dark=True)

    # Brand mark — square with chart icon
    c.setFillColor(EMERALD)
    c.rect(MARGIN, PAGE_H - 36 * mm, 12 * mm, 12 * mm, fill=1, stroke=0)
    c.setFillColor(INDIGO)
    # tiny bar chart inside
    for i, h in enumerate([3, 5, 4, 7]):
        c.rect(MARGIN + 2 * mm + i * 2 * mm, PAGE_H - 34 * mm, 1.4 * mm, h * mm * 0.25 + 1.2 * mm, fill=1, stroke=0)

    # Eyebrow
    y = PAGE_H - 56 * mm
    smallcaps(c, MARGIN, y, "Business Data Analytics & Automation  ·  An Executive Brief", size=8, color=EMERALD)

    # Headline
    y -= 16 * mm
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 46)
    c.drawString(MARGIN, y, "Turn your data")
    y -= 14 * mm
    c.drawString(MARGIN, y, "into business")
    y -= 14 * mm
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-BoldOblique", 46)
    c.drawString(MARGIN, y, "growth.")

    # Subhead
    y -= 14 * mm
    wrap(c, MARGIN, y,
         "Smart analytics and automation for data-driven companies. "
         "We turn raw signal — sales, customers, operations — into decisions you can act on.",
         PAGE_W - 2 * MARGIN, font="Helvetica", size=12.5, leading=18, color=MIST)

    # KPI tiles strip
    y -= 30 * mm
    smallcaps(c, MARGIN, y + 10 * mm, "What clients see in 90 days", size=7.5, color=EMERALD)
    tile_w = (PAGE_W - 2 * MARGIN - 6 * mm) / 4
    tile_h = 30 * mm
    tiles = [
        ("REVENUE LIFT", "+18.4%", "vs prior 90d", True),
        ("HOURS SAVED / WK", "12.6", "automated", True),
        ("REPORT TURNAROUND", "−74%", "faster delivery", True),
        ("DECISION SPEED", "3.2×", "faster choices", True),
    ]
    tx = MARGIN
    for label, val, delta, pos in tiles:
        kpi_tile(c, tx, y - tile_h, tile_w, tile_h, label, val, delta, positive=pos, on_dark=True)
        tx += tile_w + 2 * mm

    # Bottom — promise band
    band_y = MARGIN + 4 * mm
    band_h = 14 * mm
    smallcaps(c, MARGIN, band_y + 8 * mm, "Identify  ·  Understand  ·  Optimize  ·  Automate  ·  Decide",
              size=8, color=SURFACE)
    c.setFillColor(MIST)
    c.setFont("Helvetica", 8.5)
    c.drawString(MARGIN, band_y + 2 * mm, "Built for SMBs, e-commerce, and growing teams.")
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(PAGE_W - MARGIN, band_y + 6 * mm, "insightlab.io")


def page_two(c):
    fill(c, SURFACE)
    page_chrome(c, 2, 4, "§ 02   Catalog of Services")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "Capabilities", size=8, color=EMERALD)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "Eight services.")
    c.setFont("Helvetica-BoldOblique", 28)
    c.setFillColor(SLATE)
    pre = c.stringWidth("Eight services.", "Helvetica-Bold", 28)
    c.drawString(MARGIN + pre + 6 * mm, y, "One outcome: clarity.")

    y -= 8 * mm
    wrap(c, MARGIN, y,
         "Engineered around the questions business owners actually ask: "
         "What's working? Why? What should we do next?",
         PAGE_W - 2 * MARGIN, font="Helvetica", size=10.5, leading=14, color=SLATE)

    # 4 × 2 grid with chart specimens
    services = [
        ("01", "Data Extraction via APIs", "Pull structured data from websites, CRMs, and platforms.", "spark"),
        ("02", "Sales & Revenue Analysis", "Cohorts, channels, and trends — what's growing, what's not.", "bar"),
        ("03", "Customer Behavior Analysis", "Segment, score, and surface the customers that matter.", "donut"),
        ("04", "Data Cleaning & Processing", "Python pipelines that turn mess into reliable tables.", "rows"),
        ("05", "Dashboards & Reporting", "Visual insights for owners — not data scientists.", "kpi"),
        ("06", "Performance Tracking", "Always-on KPI monitoring across the business.", "line"),
        ("07", "Automation Scripts", "Replace recurring manual reports with scheduled jobs.", "gear"),
        ("08", "Predictive Analysis", "Practical forecasting where the data supports it.", "forecast"),
    ]

    grid_top = y - 12 * mm
    cols = 4
    rows = 2
    gap_x = 4 * mm
    gap_y = 5 * mm
    grid_w = PAGE_W - 2 * MARGIN
    cell_w = (grid_w - (cols - 1) * gap_x) / cols
    cell_h = 64 * mm

    for idx, (n, title, desc, kind) in enumerate(services):
        col = idx % cols
        row = idx // cols
        cx = MARGIN + col * (cell_w + gap_x)
        cy = grid_top - cell_h - row * (cell_h + gap_y)

        c.setFillColor(PANEL)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.roundRect(cx, cy, cell_w, cell_h, 2 * mm, fill=1, stroke=1)

        # number
        c.setFillColor(EMERALD)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(cx + 4 * mm, cy + cell_h - 6 * mm, n)

        # chart specimen area
        sx = cx + 4 * mm
        sy = cy + cell_h - 36 * mm
        sw = cell_w - 8 * mm
        sh = 22 * mm

        c.setFillColor(SURFACE)
        c.setStrokeColor(LINE)
        c.roundRect(sx, sy, sw, sh, 1.5 * mm, fill=1, stroke=1)

        if kind == "spark":
            sparkline(c, sx + 3 * mm, sy + 4 * mm, sw - 6 * mm, sh - 8 * mm,
                      color=SKY, points=[0.20, 0.30, 0.28, 0.45, 0.40, 0.58, 0.55, 0.72, 0.68, 0.80, 0.78, 0.92])
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "API CALLS", size=6, color=SLATE)
        elif kind == "bar":
            bar_chart(c, sx + 3 * mm, sy + 4 * mm, sw - 6 * mm, sh - 7 * mm,
                      values=[42, 58, 51, 70, 62, 78, 85],
                      color=INDIGO, accent=EMERALD, accent_idx=[5, 6])
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "WEEKLY REVENUE", size=6, color=SLATE)
        elif kind == "donut":
            donut(c, sx + sw / 2 - 8 * mm, sy + sh / 2, 8 * mm, 4 * mm,
                  [(0.42, INDIGO, ""), (0.28, EMERALD, ""), (0.18, AMBER, ""), (0.12, ROSE, "")])
            # legend
            lx = sx + sw / 2 + 4 * mm
            ly = sy + sh - 6 * mm
            for col_, lbl in [(INDIGO, "VIP"), (EMERALD, "Repeat"), (AMBER, "New"), (ROSE, "Churn")]:
                c.setFillColor(col_)
                c.rect(lx, ly, 2 * mm, 2 * mm, fill=1, stroke=0)
                c.setFillColor(INK)
                c.setFont("Helvetica", 7)
                c.drawString(lx + 3 * mm, ly, lbl)
                ly -= 4 * mm
        elif kind == "rows":
            # data table preview
            for i in range(5):
                c.setFillColor(SURFACE if i % 2 == 0 else PANEL)
                c.rect(sx + 2 * mm, sy + 2 * mm + i * 3.5 * mm, sw - 4 * mm, 3.2 * mm, fill=1, stroke=0)
                c.setFillColor(INDIGO)
                c.rect(sx + 3 * mm, sy + 3.4 * mm + i * 3.5 * mm, 4 * mm, 1.4 * mm, fill=1, stroke=0)
                c.setFillColor(SLATE)
                c.rect(sx + 9 * mm, sy + 3.4 * mm + i * 3.5 * mm, 18 * mm, 1.4 * mm, fill=1, stroke=0)
                c.setFillColor(EMERALD if i % 2 else ROSE)
                c.rect(sx + sw - 10 * mm, sy + 3.4 * mm + i * 3.5 * mm, 6 * mm, 1.4 * mm, fill=1, stroke=0)
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "CLEAN ROWS", size=6, color=SLATE)
        elif kind == "kpi":
            # mini KPI
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 16)
            c.drawString(sx + 3 * mm, sy + sh - 10 * mm, "₺ 2.41M")
            c.setFillColor(EMERALD)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(sx + 3 * mm, sy + sh - 15 * mm, "▲ 14.2%")
            sparkline(c, sx + sw - 28 * mm, sy + 3 * mm, 26 * mm, sh - 6 * mm, color=EMERALD)
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "DASHBOARD", size=6, color=SLATE)
        elif kind == "line":
            line_chart(c, sx + 3 * mm, sy + 4 * mm, sw - 6 * mm, sh - 7 * mm,
                       series=[[20, 28, 32, 38, 36, 48, 52, 60],
                               [18, 22, 24, 28, 30, 34, 38, 42]],
                       colors=[INDIGO, VIOLET],
                       fills=[None, None])
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "KPI TREND", size=6, color=SLATE)
        elif kind == "gear":
            # workflow boxes connected
            box_w = (sw - 12 * mm) / 3
            for i, lbl in enumerate(["FETCH", "CLEAN", "REPORT"]):
                bx = sx + 3 * mm + i * (box_w + 2 * mm)
                by = sy + sh / 2 - 3 * mm
                c.setFillColor(INDIGO if i < 2 else EMERALD)
                c.roundRect(bx, by, box_w, 6 * mm, 1 * mm, fill=1, stroke=0)
                c.setFillColor(SURFACE)
                c.setFont("Helvetica-Bold", 6.5)
                c.drawCentredString(bx + box_w / 2, by + 2 * mm, lbl)
                if i < 2:
                    c.setStrokeColor(SLATE)
                    c.setLineWidth(0.6)
                    c.line(bx + box_w, by + 3 * mm, bx + box_w + 2 * mm, by + 3 * mm)
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "PIPELINE", size=6, color=SLATE)
        elif kind == "forecast":
            # historical + dashed forecast
            line_chart(c, sx + 3 * mm, sy + 4 * mm, (sw - 6 * mm) * 0.62, sh - 7 * mm,
                       series=[[18, 24, 22, 30, 32, 40, 42]],
                       colors=[INDIGO], fills=[None])
            # dashed forecast extension
            c.setStrokeColor(EMERALD)
            c.setLineWidth(1.2)
            c.setDash(2, 1.5)
            fpts = [42, 50, 56, 64, 72]
            fstep = (sw - 6 * mm) * 0.38 / (len(fpts) - 1)
            fx = sx + 3 * mm + (sw - 6 * mm) * 0.62
            fy = sy + 4 * mm
            fh = sh - 7 * mm
            ymax = 80
            p = c.beginPath()
            for i, v in enumerate(fpts):
                px = fx + i * fstep
                py = fy + (v / ymax) * fh
                if i == 0:
                    p.moveTo(px, py)
                else:
                    p.lineTo(px, py)
            c.drawPath(p, stroke=1, fill=0)
            c.setDash()
            smallcaps(c, sx + 3 * mm, sy + sh - 4 * mm, "FORECAST", size=6, color=SLATE)

        # title & description
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(cx + 4 * mm, cy + 14 * mm, title)
        wrap(c, cx + 4 * mm, cy + 9 * mm, desc, cell_w - 8 * mm,
             font="Helvetica", size=8.5, leading=11, color=SLATE)


def page_three(c):
    fill(c, SURFACE)
    page_chrome(c, 3, 4, "§ 03   Use Cases & Stack")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "Use cases", size=8, color=EMERALD)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "What we ship.")

    y -= 8 * mm
    wrap(c, MARGIN, y,
         "Five typical engagements, each anchored in a real artifact our clients use weekly.",
         PAGE_W - 2 * MARGIN, font="Helvetica", size=10.5, leading=14, color=SLATE)

    y -= 12 * mm

    # Two cards on top row
    card_w = (PAGE_W - 2 * MARGIN - 6 * mm) / 2
    card_h = 60 * mm

    # Card 1 — purchase pattern heatmap
    cx, cy = MARGIN, y - card_h
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(cx, cy, card_w, card_h, 2 * mm, fill=1, stroke=1)
    smallcaps(c, cx + 4 * mm, cy + card_h - 6 * mm, "Use case 01", size=7, color=EMERALD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(cx + 4 * mm, cy + card_h - 12 * mm, "Purchase pattern heatmap")
    wrap(c, cx + 4 * mm, cy + card_h - 17 * mm,
         "When do customers actually buy? A heatmap of orders by hour and day of week, "
         "to time campaigns and staff hours.",
         card_w - 8 * mm, font="Helvetica", size=9, leading=12, color=SLATE)
    # heatmap
    rows, cols = 7, 12
    vals = [[((r * 7 + col * 3 + 11) % 13) / 13 for col in range(cols)] for r in range(rows)]
    cell_w = (card_w - 32 * mm) / cols
    cell_h = 3.2 * mm
    heatmap(c, cx + 14 * mm, cy + 5 * mm, cell_w, cell_h, rows, cols, vals, base=INDIGO)
    # day labels
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 6.5)
    for i, d in enumerate(days):
        c.drawRightString(cx + 13 * mm, cy + 5 * mm + (rows - 1 - i) * (cell_h + 0.6) + 1 * mm, d)

    # Card 2 — sales tracker
    cx2 = MARGIN + card_w + 6 * mm
    cy2 = cy
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(cx2, cy2, card_w, card_h, 2 * mm, fill=1, stroke=1)
    smallcaps(c, cx2 + 4 * mm, cy2 + card_h - 6 * mm, "Use case 02", size=7, color=EMERALD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(cx2 + 4 * mm, cy2 + card_h - 12 * mm, "Daily / weekly / monthly sales tracker")
    wrap(c, cx2 + 4 * mm, cy2 + card_h - 17 * mm,
         "Always-on tracking with delta vs prior period and channel breakdown.",
         card_w - 8 * mm, font="Helvetica", size=9, leading=12, color=SLATE)
    # KPI row inside card
    kw = (card_w - 14 * mm) / 3
    kpi_data = [("DAILY", "₺18.2K", "+9%"), ("WEEKLY", "₺126K", "+14%"), ("MONTHLY", "₺541K", "+22%")]
    for i, (l, v, d) in enumerate(kpi_data):
        kx = cx2 + 4 * mm + i * (kw + 1 * mm)
        ky = cy2 + 22 * mm
        c.setFillColor(SURFACE)
        c.setStrokeColor(LINE)
        c.roundRect(kx, ky, kw, 12 * mm, 1.5 * mm, fill=1, stroke=1)
        smallcaps(c, kx + 2 * mm, ky + 8 * mm, l, size=6, color=SLATE)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(kx + 2 * mm, ky + 3 * mm, v)
        c.setFillColor(EMERALD)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(kx + kw - 2 * mm, ky + 3 * mm, d)
    # mini line at bottom of card
    line_chart(c, cx2 + 4 * mm, cy2 + 5 * mm, card_w - 8 * mm, 12 * mm,
               series=[[20, 28, 32, 38, 36, 48, 52, 60, 58, 70, 68, 82]],
               colors=[INDIGO], fills=[Color(0.12, 0.10, 0.30, alpha=0.18)])

    y = cy - 8 * mm

    # Bottom row — funnel + tech stack
    bottom_h = 56 * mm

    # Card 3 — funnel
    cx, cy = MARGIN, y - bottom_h
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(cx, cy, card_w, bottom_h, 2 * mm, fill=1, stroke=1)
    smallcaps(c, cx + 4 * mm, cy + bottom_h - 6 * mm, "Use case 03", size=7, color=EMERALD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(cx + 4 * mm, cy + bottom_h - 12 * mm, "Conversion funnel & drop-off")
    wrap(c, cx + 4 * mm, cy + bottom_h - 17 * mm,
         "Where customers leak out of the journey — and which step pays back fixing first.",
         card_w - 8 * mm, font="Helvetica", size=9, leading=12, color=SLATE)
    funnel(c, cx + 16 * mm, cy + 6 * mm, card_w - 32 * mm, 26 * mm,
           [("Visit  ·  100%", 1.00, INDIGO),
            ("Product View  ·  62%", 0.62, SKY),
            ("Add to Cart  ·  31%", 0.31, AMBER),
            ("Purchase  ·  14%", 0.14, EMERALD)])

    # Card 4 — tech stack
    cx2 = MARGIN + card_w + 6 * mm
    c.setFillColor(INDIGO)
    c.roundRect(cx2, cy, card_w, bottom_h, 2 * mm, fill=1, stroke=0)
    smallcaps(c, cx2 + 4 * mm, cy + bottom_h - 6 * mm, "Stack & Tools", size=7, color=EMERALD)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(cx2 + 4 * mm, cy + bottom_h - 14 * mm, "What's under the hood.")

    stacks = [
        ("LANGUAGE", "Python"),
        ("DATA", "Pandas · NumPy"),
        ("STORAGE", "SQL · PostgreSQL"),
        ("INTEGRATION", "REST APIs · Webhooks"),
        ("VISUALIZATION", "Power BI · Tableau · custom"),
    ]
    sy = cy + bottom_h - 24 * mm
    for label, items in stacks:
        smallcaps(c, cx2 + 4 * mm, sy, label, size=6.5, color=MIST)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(cx2 + 30 * mm, sy, items)
        sy -= 5 * mm
        c.setStrokeColor(HexColor("#3A3679"))
        c.setLineWidth(0.4)
        c.line(cx2 + 4 * mm, sy + 1.6 * mm, cx2 + card_w - 4 * mm, sy + 1.6 * mm)
        sy -= 1 * mm


def page_four(c):
    fill(c, SURFACE)
    page_chrome(c, 4, 4, "§ 04   Value · Process · Contact")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "The promise", size=8, color=EMERALD)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "Five outcomes")
    y -= 10 * mm
    c.setFont("Helvetica-BoldOblique", 28)
    c.setFillColor(EMERALD)
    c.drawString(MARGIN, y, "we measure for.")

    y -= 14 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=INK, width=0.6)
    y -= 10 * mm

    values = [
        ("01", "Opportunity", "Surface the growth lever you didn't see."),
        ("02", "Customers", "Understand who buys, why, and what's next."),
        ("03", "Sales", "Optimize pricing, channels, and timing."),
        ("04", "Time Back", "Replace manual reports with automation."),
        ("05", "Decisions", "Faster choices, backed by evidence."),
    ]
    cols = 5
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y
    for i, (n, t, d) in enumerate(values):
        cx = MARGIN + i * cw_col
        if i > 0:
            hairline(c, cx - 2 * mm, top, cx - 2 * mm, top - 36 * mm, color=LINE)
        c.setFillColor(EMERALD)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(cx, top - 8 * mm, n)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(cx, top - 16 * mm, t)
        wrap(c, cx, top - 22 * mm, d, cw_col - 4 * mm,
             font="Helvetica", size=9, leading=12, color=SLATE)

    y = top - 44 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Process — 4 step
    smallcaps(c, MARGIN, y, "How we work", size=7.5, color=EMERALD)
    y -= 10 * mm

    steps = [
        ("01", "Audit", "We map your data sources, gaps, and questions."),
        ("02", "Connect", "APIs, exports, and pipelines wired in days."),
        ("03", "Visualize", "Dashboards your team will actually open."),
        ("04", "Automate", "Recurring work scheduled and monitored."),
    ]
    cols = 4
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y
    for i, (n, t, d) in enumerate(steps):
        cx = MARGIN + i * cw_col
        if i > 0:
            c.setStrokeColor(EMERALD)
            c.setLineWidth(0.6)
            c.line(cx - 4 * mm, top - 8 * mm, cx - 1 * mm, top - 8 * mm)
            c.line(cx - 3 * mm, top - 7 * mm, cx - 1 * mm, top - 8 * mm)
            c.line(cx - 3 * mm, top - 9 * mm, cx - 1 * mm, top - 8 * mm)
        c.setFillColor(INDIGO)
        c.circle(cx + 6 * mm, top - 8 * mm, 5 * mm, fill=1, stroke=0)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(cx + 6 * mm, top - 9.6 * mm, n)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(cx, top - 22 * mm, t)
        wrap(c, cx, top - 28 * mm, d, cw_col - 6 * mm,
             font="Helvetica", size=9, leading=12, color=SLATE)

    y = top - 50 * mm

    # Market relevance band
    smallcaps(c, MARGIN, y, "Built for businesses not yet data-driven", size=7.5, color=EMERALD)
    y -= 8 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Oblique", 11.5)
    y = wrap(c, MARGIN, y,
             "Practical, affordable analytics for SMBs, e-commerce stores, and growing teams "
             "who want to stop guessing — without hiring a data team.",
             PAGE_W - 2 * MARGIN, font="Helvetica-Oblique", size=11.5, leading=15, color=INK)

    # CTA panel
    cta_h = 50 * mm
    cta_y = MARGIN + 4 * mm
    c.setFillColor(INDIGO)
    c.rect(MARGIN, cta_y, PAGE_W - 2 * MARGIN, cta_h, fill=1, stroke=0)
    c.setFillColor(EMERALD)
    c.rect(MARGIN, cta_y + cta_h - 1 * mm, PAGE_W - 2 * MARGIN, 1 * mm, fill=1, stroke=0)
    c.rect(MARGIN, cta_y, 4 * mm, cta_h, fill=1, stroke=0)

    smallcaps(c, MARGIN + 12 * mm, cta_y + cta_h - 8 * mm, "Let's begin", size=8, color=EMERALD)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN + 12 * mm, cta_y + cta_h - 18 * mm, "Start using your data")
    c.setFont("Helvetica-BoldOblique", 22)
    c.setFillColor(EMERALD)
    c.drawString(MARGIN + 12 * mm, cta_y + cta_h - 28 * mm, "to grow your business — today.")

    # contact
    cy = cta_y + 12 * mm
    pairs = [
        ("EMAIL", "hello@insightlab.io"),
        ("WEB", "www.insightlab.io"),
        ("BOOK A CALL", "cal.com/insightlab/intro"),
        ("LOCATION", "Remote  ·  Working globally"),
    ]
    col2 = (PAGE_W - 2 * MARGIN) / 2 + MARGIN
    for i, (lbl, val) in enumerate(pairs):
        col_x = MARGIN + 12 * mm if i % 2 == 0 else col2
        row_y = cy - (i // 2) * 8 * mm
        c.setFillColor(MIST)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(col_x, row_y + 3 * mm, lbl)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(col_x, row_y - 1 * mm, val)


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Insight Lab — Turn Your Data into Business Growth")
    c.setAuthor("Insight Lab")
    c.setSubject("Business Data Analytics & Automation")

    page_one(c); c.showPage()
    page_two(c); c.showPage()
    page_three(c); c.showPage()
    page_four(c); c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

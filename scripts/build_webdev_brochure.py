"""Full Stack Web Development — premium business brochure (A4, 4 pages).

Design language: modern tech business catalog.
- Deep navy + white + electric blue + Turkish coral
- Geometric icon system drawn from primitives
- Browser / dashboard / code specimens as signature graphics
- Strong visual hierarchy, generous whitespace
- Tailored for Turkish SMB / startup audience
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ---- modern tech palette ----
NAVY = HexColor("#0A1628")     # deep navy, primary surface
INK = HexColor("#0F172A")      # body text on light
SURFACE = HexColor("#FFFFFF")  # pure white
SNOW = HexColor("#F8FAFC")     # off-white panel
ELECTRIC = HexColor("#3B82F6") # electric blue accent
CORAL = HexColor("#EF4444")    # Turkish-red secondary accent
SLATE = HexColor("#64748B")    # muted body
LINE = HexColor("#E2E8F0")     # hairlines on light
DARKLINE = HexColor("#1E293B") # hairlines on navy
GRID = HexColor("#1A2A44")     # subtle grid on navy

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

OUT = "/Users/sir.sh/testdevops/webdev_brochure.pdf"


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


def dot_grid(c, x, y, w, h, step=4 * mm, color=GRID, r=0.4):
    c.setFillColor(color)
    cx = x
    while cx <= x + w:
        cy = y
        while cy <= y + h:
            c.circle(cx, cy, r, fill=1, stroke=0)
            cy += step
        cx += step


def page_frame(c, page_no, total, label):
    """Thin top + bottom rule + folio. Used on white pages."""
    hairline(c, MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN, color=INK, width=0.6)
    smallcaps(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "FullStack.Studio", size=7.5, color=INK)
    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 2 * mm, label.upper())

    # bottom
    hairline(c, MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN, color=LINE)
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, MARGIN - 4 * mm, "FullStack.Studio  ·  Web for Turkish Business")
    c.drawRightString(PAGE_W - MARGIN, MARGIN - 4 * mm, f"{page_no:02d} / {total:02d}")


# ---------- icons (geometric, from primitives) ----------

def icon_box(c, x, y, size=14 * mm, draw=None, bg=SNOW, stroke=LINE, accent=ELECTRIC):
    c.setFillColor(bg)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, size, size, 2 * mm, fill=1, stroke=1)
    if draw:
        draw(c, x, y, size, accent)


def i_person(c, x, y, s, accent):
    cx, cy = x + s / 2, y + s * 0.62
    c.setFillColor(accent)
    c.circle(cx, cy, s * 0.13, fill=1, stroke=0)
    p = c.beginPath()
    p.moveTo(cx - s * 0.28, y + s * 0.20)
    p.curveTo(cx - s * 0.28, y + s * 0.42, cx + s * 0.28, y + s * 0.42, cx + s * 0.28, y + s * 0.20)
    p.lineTo(cx - s * 0.28, y + s * 0.20)
    c.drawPath(p, stroke=0, fill=1)


def i_building(c, x, y, s, accent):
    c.setFillColor(accent)
    c.rect(x + s * 0.20, y + s * 0.18, s * 0.60, s * 0.62, fill=1, stroke=0)
    c.setFillColor(SNOW)
    for r in range(3):
        for col in range(3):
            c.rect(x + s * 0.27 + col * s * 0.18, y + s * 0.27 + r * 0.18 * s,
                   s * 0.10, s * 0.10, fill=1, stroke=0)


def i_cart(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1.4)
    c.line(x + s * 0.18, y + s * 0.72, x + s * 0.30, y + s * 0.72)
    c.line(x + s * 0.30, y + s * 0.72, x + s * 0.40, y + s * 0.32)
    c.line(x + s * 0.40, y + s * 0.32, x + s * 0.82, y + s * 0.32)
    c.line(x + s * 0.40, y + s * 0.32, x + s * 0.46, y + s * 0.50)
    c.line(x + s * 0.46, y + s * 0.50, x + s * 0.78, y + s * 0.50)
    c.setFillColor(accent)
    c.circle(x + s * 0.46, y + s * 0.24, s * 0.05, fill=1, stroke=0)
    c.circle(x + s * 0.72, y + s * 0.24, s * 0.05, fill=1, stroke=0)


def i_calendar(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    c.roundRect(x + s * 0.18, y + s * 0.20, s * 0.64, s * 0.58, 1.5, fill=0, stroke=1)
    c.line(x + s * 0.18, y + s * 0.62, x + s * 0.82, y + s * 0.62)
    c.setFillColor(accent)
    c.rect(x + s * 0.30, y + s * 0.74, s * 0.06, s * 0.10, fill=1, stroke=0)
    c.rect(x + s * 0.64, y + s * 0.74, s * 0.06, s * 0.10, fill=1, stroke=0)
    # marked day
    c.rect(x + s * 0.46, y + s * 0.34, s * 0.10, s * 0.10, fill=1, stroke=0)


def i_dashboard(c, x, y, s, accent):
    c.setFillColor(accent)
    c.rect(x + s * 0.22, y + s * 0.30, s * 0.10, s * 0.40, fill=1, stroke=0)
    c.rect(x + s * 0.40, y + s * 0.22, s * 0.10, s * 0.48, fill=1, stroke=0)
    c.rect(x + s * 0.58, y + s * 0.40, s * 0.10, s * 0.30, fill=1, stroke=0)
    c.rect(x + s * 0.76, y + s * 0.34, s * 0.04, s * 0.36, fill=1, stroke=0)


def i_window(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    c.roundRect(x + s * 0.18, y + s * 0.22, s * 0.64, s * 0.56, 1.5, fill=0, stroke=1)
    c.setFillColor(accent)
    c.line(x + s * 0.18, y + s * 0.66, x + s * 0.82, y + s * 0.66)
    c.circle(x + s * 0.24, y + s * 0.72, s * 0.025, fill=1, stroke=0)
    c.circle(x + s * 0.30, y + s * 0.72, s * 0.025, fill=1, stroke=0)
    c.circle(x + s * 0.36, y + s * 0.72, s * 0.025, fill=1, stroke=0)
    # content
    c.rect(x + s * 0.24, y + s * 0.34, s * 0.30, s * 0.04, fill=1, stroke=0)
    c.rect(x + s * 0.24, y + s * 0.46, s * 0.45, s * 0.04, fill=1, stroke=0)


def i_api(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    # two nodes connected by line
    c.circle(x + s * 0.30, y + s * 0.50, s * 0.08, fill=0, stroke=1)
    c.circle(x + s * 0.70, y + s * 0.50, s * 0.08, fill=0, stroke=1)
    c.line(x + s * 0.38, y + s * 0.50, x + s * 0.62, y + s * 0.50)
    c.setFillColor(accent)
    c.circle(x + s * 0.50, y + s * 0.50, s * 0.04, fill=1, stroke=0)


def i_speed(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1.2)
    # gauge arc
    p = c.beginPath()
    p.moveTo(x + s * 0.20, y + s * 0.40)
    p.curveTo(x + s * 0.20, y + s * 0.78, x + s * 0.80, y + s * 0.78, x + s * 0.80, y + s * 0.40)
    c.drawPath(p, stroke=1, fill=0)
    # needle
    c.line(x + s * 0.50, y + s * 0.40, x + s * 0.66, y + s * 0.62)
    c.setFillColor(accent)
    c.circle(x + s * 0.50, y + s * 0.40, s * 0.05, fill=1, stroke=0)


def i_responsive(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    # laptop
    c.roundRect(x + s * 0.16, y + s * 0.40, s * 0.42, s * 0.32, 1, fill=0, stroke=1)
    # phone
    c.roundRect(x + s * 0.62, y + s * 0.30, s * 0.18, s * 0.42, 1, fill=0, stroke=1)
    c.setFillColor(accent)
    c.rect(x + s * 0.66, y + s * 0.36, s * 0.10, s * 0.02, fill=1, stroke=0)


def i_seo(c, x, y, s, accent):
    c.setStrokeColor(accent)
    c.setLineWidth(1.2)
    # magnifier
    c.circle(x + s * 0.40, y + s * 0.56, s * 0.15, fill=0, stroke=1)
    c.line(x + s * 0.51, y + s * 0.45, x + s * 0.66, y + s * 0.30)
    # arrow up
    c.setFillColor(accent)
    c.setStrokeColor(accent)
    c.line(x + s * 0.32, y + s * 0.56, x + s * 0.36, y + s * 0.62)
    c.line(x + s * 0.36, y + s * 0.62, x + s * 0.42, y + s * 0.50)
    c.line(x + s * 0.42, y + s * 0.50, x + s * 0.48, y + s * 0.58)


# ---------- specimens ----------

def browser_specimen(c, x, y, w, h, on_dark=True):
    """A faux browser window with content lines."""
    bg = HexColor("#0F2742") if on_dark else SURFACE
    bar = HexColor("#152F4E") if on_dark else SNOW
    line_c = HexColor("#26456C") if on_dark else LINE
    text_c = HexColor("#3B5A82") if on_dark else SLATE

    c.setFillColor(bg)
    c.setStrokeColor(line_c)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 2 * mm, fill=1, stroke=1)
    # top bar
    c.setFillColor(bar)
    c.roundRect(x, y + h - 6 * mm, w, 6 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(bg)
    c.rect(x, y + h - 6 * mm, w, 3 * mm, fill=1, stroke=0)
    c.setFillColor(bar)
    c.rect(x, y + h - 6 * mm, w, 3 * mm, fill=1, stroke=0)
    # traffic lights
    for i, col in enumerate([CORAL, HexColor("#FBBF24"), HexColor("#22C55E")]):
        c.setFillColor(col)
        c.circle(x + 4 * mm + i * 3 * mm, y + h - 3 * mm, 1.0 * mm, fill=1, stroke=0)
    # url pill
    c.setFillColor(HexColor("#0A1F36") if on_dark else white)
    c.roundRect(x + 16 * mm, y + h - 5 * mm, w - 22 * mm, 3 * mm, 1 * mm, fill=1, stroke=0)
    # content lines
    c.setFillColor(ELECTRIC)
    c.rect(x + 4 * mm, y + h - 14 * mm, 28 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(text_c)
    for i in range(5):
        wline = w - 8 * mm - (i * 4 * mm if i % 2 else i * 2 * mm)
        c.rect(x + 4 * mm, y + h - 20 * mm - i * 4 * mm, wline, 1.2 * mm, fill=1, stroke=0)
    # CTA
    c.setFillColor(CORAL)
    c.roundRect(x + 4 * mm, y + 4 * mm, 22 * mm, 5 * mm, 1 * mm, fill=1, stroke=0)


def code_specimen(c, x, y, w, h):
    """A faux code block on dark surface."""
    c.setFillColor(HexColor("#0A1F36"))
    c.setStrokeColor(HexColor("#1F3658"))
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, 2 * mm, fill=1, stroke=1)
    # gutter
    c.setFillColor(HexColor("#0E2848"))
    c.rect(x, y, 7 * mm, h, fill=1, stroke=0)
    # line numbers
    c.setFillColor(HexColor("#3B5A82"))
    c.setFont("Courier", 7)
    rows = int(h / (4 * mm)) - 1
    for i in range(rows):
        c.drawRightString(x + 5.5 * mm, y + h - 5 * mm - i * 4 * mm, str(i + 1))
    # code lines (colored bars)
    palette = [HexColor("#7DD3FC"), HexColor("#A78BFA"), HexColor("#F472B6"),
               HexColor("#FCD34D"), HexColor("#34D399"), HexColor("#94A3B8")]
    widths_pattern = [
        [10, 28, 14], [4, 18], [8, 24, 10, 16], [18, 12], [4, 20, 30],
        [14, 8, 22], [4], [10, 28, 14], [4, 18], [8, 24, 10],
    ]
    for i in range(rows):
        bx = x + 9 * mm
        cols = widths_pattern[i % len(widths_pattern)]
        for j, cw in enumerate(cols):
            c.setFillColor(palette[(i + j) % len(palette)])
            c.rect(bx, y + h - 5 * mm - i * 4 * mm, cw * 0.8, 1.6 * mm, fill=1, stroke=0)
            bx += (cw * 0.8) + 2 * mm
            if bx > x + w - 4 * mm:
                break


def dashboard_specimen(c, x, y, w, h):
    """A faux analytics dashboard card."""
    c.setFillColor(SURFACE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 2 * mm, fill=1, stroke=1)
    # header
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 4 * mm, y + h - 6 * mm, "Sales · Last 30 days")
    c.setFillColor(ELECTRIC)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(x + 4 * mm, y + h - 14 * mm, "₺ 248,930")
    c.setFillColor(HexColor("#22C55E"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 36 * mm, y + h - 13 * mm, "▲ 12.4%")
    # bars
    bx = x + 4 * mm
    by = y + 4 * mm
    bw = w - 8 * mm
    bh = h - 22 * mm
    n = 14
    gap = 1.2
    bar_w = (bw - gap * (n - 1)) / n
    heights = [0.30, 0.45, 0.38, 0.62, 0.55, 0.70, 0.50, 0.78, 0.65, 0.82, 0.70, 0.88, 0.80, 0.95]
    for i, hr in enumerate(heights):
        c.setFillColor(ELECTRIC if i < n - 2 else CORAL)
        c.rect(bx + i * (bar_w + gap), by, bar_w, bh * hr, fill=1, stroke=0)


# ---------- pages ----------

def page_one(c):
    fill(c, NAVY)

    # decorative dot grid in lower band
    dot_grid(c, 0, 0, PAGE_W, 70 * mm, step=4.5 * mm, color=GRID, r=0.5)

    # top bar
    hairline(c, MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN, color=DARKLINE)
    smallcaps(c, MARGIN, PAGE_H - MARGIN + 2 * mm, "FullStack.Studio", size=8, color=SURFACE)
    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 2 * mm, "İSTANBUL  ·  ANKARA  ·  REMOTE")

    # Brand mark — square monogram
    c.setFillColor(ELECTRIC)
    c.rect(MARGIN, PAGE_H - 36 * mm, 12 * mm, 12 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(MARGIN + 6 * mm, PAGE_H - 32 * mm, "</>")

    # Eyebrow
    y = PAGE_H - 56 * mm
    smallcaps(c, MARGIN, y, "Full Stack Web Development  ·  2026 Catalog", size=8, color=ELECTRIC)

    # Headline — chunky display
    y -= 14 * mm
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 44)
    c.drawString(MARGIN, y, "Modern web")
    y -= 14 * mm
    c.drawString(MARGIN, y, "solutions for")
    y -= 14 * mm
    c.setFillColor(ELECTRIC)
    c.drawString(MARGIN, y, "growing ")
    pre = c.stringWidth("growing ", "Helvetica-Bold", 44)
    c.setFillColor(CORAL)
    c.setFont("Helvetica-BoldOblique", 44)
    c.drawString(MARGIN + pre, y, "businesses.")

    # subhead
    y -= 16 * mm
    wrap(c, MARGIN, y,
         "From business websites to online shops and custom software — "
         "we build digital platforms that work, sell, and scale.",
         PAGE_W - 2 * MARGIN - 70 * mm, font="Helvetica", size=12.5, leading=18, color=HexColor("#94A3B8"))

    # Browser specimen, anchored right
    spec_w = 80 * mm
    spec_h = 56 * mm
    spec_x = PAGE_W - MARGIN - spec_w
    spec_y = MARGIN + 60 * mm
    browser_specimen(c, spec_x, spec_y, spec_w, spec_h, on_dark=True)

    # Audience pills row
    pills_y = MARGIN + 38 * mm
    smallcaps(c, MARGIN, pills_y + 6 * mm, "Built For", size=7.5, color=ELECTRIC)
    audiences = ["KOBİ & SMEs", "Clinics", "Restaurants", "Shops", "Agencies", "Startups", "Personal brands"]
    px = MARGIN
    py = pills_y
    c.setFont("Helvetica-Bold", 9)
    for a in audiences:
        w = c.stringWidth(a, "Helvetica-Bold", 9) + 7 * mm
        if px + w > PAGE_W - MARGIN:
            px = MARGIN
            py -= 8 * mm
        c.setFillColor(NAVY)
        c.setStrokeColor(SURFACE)
        c.setLineWidth(0.5)
        c.roundRect(px, py, w, 6 * mm, 3 * mm, fill=1, stroke=1)
        c.setFillColor(SURFACE)
        c.drawString(px + 3.5 * mm, py + 1.8 * mm, a)
        px += w + 2.5 * mm

    # Bottom strip — promise
    band_y = MARGIN
    band_h = 18 * mm
    hairline(c, 0, band_y + band_h, PAGE_W, band_y + band_h, color=DARKLINE)
    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, band_y + 10 * mm, "Fast.  Secure.  Scalable.")
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, band_y + 4 * mm, "Türkiye'deki işletmeler için modern web çözümleri.")
    c.setFillColor(ELECTRIC)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(PAGE_W - MARGIN, band_y + 8 * mm, "fullstack.studio")
    c.setFillColor(SLATE)
    c.drawRightString(PAGE_W - MARGIN, band_y + 4 * mm, "01 / 04")


def page_two(c):
    fill(c, SURFACE)
    page_frame(c, 2, 4, "§ 02   Catalog of Services")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "Catalog", size=8, color=ELECTRIC)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "Ten services.")
    c.setFont("Helvetica-BoldOblique", 28)
    c.setFillColor(SLATE)
    pre = c.stringWidth("Ten services.", "Helvetica-Bold", 28)
    c.drawString(MARGIN + pre + 6 * mm, y, "One studio.")

    y -= 8 * mm
    wrap(c, MARGIN, y,
         "Everything a Turkish business needs to launch, sell, and scale online — "
         "delivered with practical pricing and production-grade engineering.",
         PAGE_W - 2 * MARGIN, font="Helvetica", size=10.5, leading=14, color=SLATE)

    # 5 cols × 2 rows grid
    services = [
        ("01", "Personal Website", "Portfolio sites for consultants, professionals, freelancers.", i_person),
        ("02", "Company Website", "Corporate sites with CMS, multilingual TR/EN, contact forms.", i_building),
        ("03", "E-commerce", "Online stores with payment, stock, shipping, KDV-ready invoicing.", i_cart),
        ("04", "Booking Systems", "Reservation & appointment platforms for clinics, salons, restaurants.", i_calendar),
        ("05", "Admin Dashboards", "Internal panels for inventory, orders, staff, and reporting.", i_dashboard),
        ("06", "Custom Web Apps", "Bespoke applications tailored to your specific workflow.", i_window),
        ("07", "API Development", "REST APIs and integrations with payment, SMS, and ERP systems.", i_api),
        ("08", "Redesign & Speed", "Modernize existing sites and dramatically improve load time.", i_speed),
        ("09", "Responsive Design", "Mobile-first layouts that look right on every device.", i_responsive),
        ("10", "Basic SEO Setup", "Technical SEO, meta, sitemap, schema — visible on Google from day one.", i_seo),
    ]

    grid_top = y - 10 * mm
    cols = 5
    rows = 2
    gap_x = 4 * mm
    gap_y = 6 * mm
    grid_w = PAGE_W - 2 * MARGIN
    cell_w = (grid_w - (cols - 1) * gap_x) / cols
    cell_h = 56 * mm

    for idx, (n, title, desc, icon) in enumerate(services):
        col = idx % cols
        row = idx // cols
        cx = MARGIN + col * (cell_w + gap_x)
        cy = grid_top - cell_h - row * (cell_h + gap_y)

        # cell border
        c.setFillColor(SNOW)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.roundRect(cx, cy, cell_w, cell_h, 2 * mm, fill=1, stroke=1)

        # number top-right
        c.setFillColor(SLATE)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(cx + cell_w - 3 * mm, cy + cell_h - 6 * mm, n)

        # icon
        icon_box(c, cx + 3 * mm, cy + cell_h - 18 * mm, size=14 * mm, draw=icon, bg=SURFACE, stroke=LINE, accent=ELECTRIC)

        # title
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(cx + 3 * mm, cy + cell_h - 26 * mm, title)

        # description
        wrap(c, cx + 3 * mm, cy + cell_h - 32 * mm, desc, cell_w - 6 * mm,
             font="Helvetica", size=8.2, leading=10.5, color=SLATE)


def page_three(c):
    fill(c, SURFACE)
    page_frame(c, 3, 4, "§ 03   Stack & Türkiye")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "Why & How", size=8, color=ELECTRIC)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "Why businesses choose us.")

    y -= 14 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y, color=INK, width=0.6)
    y -= 10 * mm

    # 5 value pillars
    values = [
        ("01", "Online Presence", "A professional storefront on the open web."),
        ("02", "Customer Trust", "Modern design that signals legitimacy."),
        ("03", "Sales & Leads", "Conversion-focused flows, not vanity pages."),
        ("04", "Operations", "Automate booking, billing, and stock work."),
        ("05", "Future-Ready", "Scalable code that grows with your business."),
    ]
    cols = 5
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y
    for i, (n, t, d) in enumerate(values):
        cx = MARGIN + i * cw_col
        if i > 0:
            hairline(c, cx - 2 * mm, top, cx - 2 * mm, top - 36 * mm, color=LINE)
        c.setFillColor(ELECTRIC)
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

    # Two columns: Stack (left) | Türkiye (right)
    col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
    col_l = MARGIN
    col_r = MARGIN + col_w + 8 * mm

    # LEFT — Tech stack with code specimen
    smallcaps(c, col_l, y, "Stack & Tools", size=7.5, color=ELECTRIC)
    cy = y - 10 * mm

    stacks = [
        ("Backend", "Python · Django · Flask"),
        ("Frontend", "JavaScript · React · HTML · CSS"),
        ("UI", "Bootstrap · Tailwind"),
        ("Database", "PostgreSQL · SQLite"),
        ("Integration", "REST APIs · Webhooks"),
    ]
    for label, items in stacks:
        c.setFillColor(SLATE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(col_l, cy, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(col_l + 26 * mm, cy, items)
        cy -= 6.5 * mm
        hairline(c, col_l, cy + 2 * mm, col_l + col_w, cy + 2 * mm, color=LINE)

    # code specimen at bottom of left col
    code_specimen(c, col_l, MARGIN + 50 * mm, col_w, 32 * mm)
    smallcaps(c, col_l, MARGIN + 84 * mm, "Fig. 01  ·  Production-grade code", size=7, color=SLATE)

    # RIGHT — Türkiye relevance
    smallcaps(c, col_r, y, "Türkiye Pazarı  ·  Made for Turkey", size=7.5, color=CORAL)
    cy = y - 10 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(col_r, cy, "Practical digital transformation —")
    cy -= 7 * mm
    c.drawString(col_r, cy, "for the way Turkish businesses work.")
    cy -= 8 * mm

    cy = wrap(c, col_r, cy,
              "Affordable, fast-to-launch websites and tools designed around the realities "
              "of Turkish SMBs: KDV-ready e-commerce, bilingual TR/EN content, payment "
              "processors used locally, SMS booking confirmations, and reservation flows "
              "that fit clinics, restaurants, and service shops.",
              col_w, font="Helvetica", size=10, leading=14, color=INK)

    cy -= 4 * mm
    # bullet list
    bullets = [
        "E-commerce ready for Turkish payment gateways",
        "Bilingual sites — Turkish & English",
        "Reservation & SMS confirmation flows",
        "Automation tools that cut operational time",
    ]
    for b in bullets:
        c.setFillColor(CORAL)
        c.rect(col_r, cy - 1.5 * mm, 2 * mm, 2 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        c.drawString(col_r + 5 * mm, cy - 1 * mm, b)
        cy -= 6 * mm

    # dashboard specimen at bottom of right col
    dashboard_specimen(c, col_r, MARGIN + 50 * mm, col_w, 32 * mm)
    smallcaps(c, col_r, MARGIN + 84 * mm, "Fig. 02  ·  Dashboards your team will use", size=7, color=SLATE)


def page_four(c):
    fill(c, SURFACE)
    page_frame(c, 4, 4, "§ 04   Process & Contact")

    # Heading
    y = PAGE_H - MARGIN - 12 * mm
    smallcaps(c, MARGIN, y, "How we work", size=8, color=ELECTRIC)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, y, "From idea to launch")
    y -= 10 * mm
    c.setFont("Helvetica-BoldOblique", 28)
    c.setFillColor(ELECTRIC)
    c.drawString(MARGIN, y, "in four steps.")

    y -= 14 * mm
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 12 * mm

    # Process — 4 steps
    steps = [
        ("01", "Discover", "We listen. Define goals, audience, and the metrics that matter."),
        ("02", "Design", "Mockups and prototypes you approve before any line of code."),
        ("03", "Build", "Production-grade engineering. Tested on real devices."),
        ("04", "Launch & Grow", "Deploy, monitor, iterate. Optional retainer for ongoing care."),
    ]
    cols = 4
    cw_col = (PAGE_W - 2 * MARGIN) / cols
    top = y
    for i, (n, t, d) in enumerate(steps):
        cx = MARGIN + i * cw_col
        # connector arrow between steps
        if i > 0:
            c.setStrokeColor(ELECTRIC)
            c.setLineWidth(0.6)
            c.line(cx - 4 * mm, top - 8 * mm, cx - 1 * mm, top - 8 * mm)
            c.line(cx - 3 * mm, top - 7 * mm, cx - 1 * mm, top - 8 * mm)
            c.line(cx - 3 * mm, top - 9 * mm, cx - 1 * mm, top - 8 * mm)
        # step number circle
        c.setFillColor(NAVY)
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
    hairline(c, MARGIN, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    # Mini FAQ row
    smallcaps(c, MARGIN, y, "Common questions", size=7.5, color=ELECTRIC)
    y -= 10 * mm
    faqs = [
        ("How long does a project take?", "From 2 weeks for a brochure site to 8–12 weeks for full e-commerce."),
        ("Do you work in Turkish?", "Yes. We deliver in Turkish and English, with bilingual content support."),
        ("Will I own the code?", "Yes. Full source code, repository access, and documentation are yours."),
    ]
    col_w = (PAGE_W - 2 * MARGIN - 12 * mm) / 3
    for i, (q, a) in enumerate(faqs):
        cx = MARGIN + i * (col_w + 6 * mm)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(cx, y, q)
        wrap(c, cx, y - 6 * mm, a, col_w, font="Helvetica", size=9, leading=12, color=SLATE)

    # CTA panel — navy with electric/coral
    cta_h = 56 * mm
    cta_y = MARGIN + 4 * mm
    c.setFillColor(NAVY)
    c.rect(MARGIN, cta_y, PAGE_W - 2 * MARGIN, cta_h, fill=1, stroke=0)

    # accent strip
    c.setFillColor(CORAL)
    c.rect(MARGIN, cta_y + cta_h - 1 * mm, PAGE_W - 2 * MARGIN, 1 * mm, fill=1, stroke=0)
    c.setFillColor(ELECTRIC)
    c.rect(MARGIN, cta_y, 4 * mm, cta_h, fill=1, stroke=0)

    # dot grid inside CTA
    dot_grid(c, MARGIN + 4 * mm, cta_y, PAGE_W - 2 * MARGIN - 4 * mm, cta_h, step=5 * mm, color=GRID, r=0.5)

    smallcaps(c, MARGIN + 12 * mm, cta_y + cta_h - 8 * mm, "Let's begin", size=8, color=ELECTRIC)

    c.setFillColor(SURFACE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN + 12 * mm, cta_y + cta_h - 18 * mm, "Let's build your digital presence —")
    c.setFont("Helvetica-BoldOblique", 22)
    c.setFillColor(CORAL)
    c.drawString(MARGIN + 12 * mm, cta_y + cta_h - 28 * mm, "and turn your website into a business asset.")

    # contact rows
    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 8)
    labels_x = MARGIN + 12 * mm
    cy = cta_y + cta_h - 40 * mm
    pairs = [
        ("EMAIL", "hello@fullstack.studio"),
        ("WEB", "www.fullstack.studio"),
        ("WHATSAPP", "+90 5XX XXX XX XX"),
        ("LOCATION", "İstanbul / remote across Türkiye"),
    ]
    col2_x = (PAGE_W - 2 * MARGIN) / 2 + MARGIN
    for i, (lbl, val) in enumerate(pairs):
        col_x = labels_x if i % 2 == 0 else col2_x
        row_y = cy - (i // 2) * 8 * mm
        c.setFillColor(SLATE)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(col_x, row_y + 3 * mm, lbl)
        c.setFillColor(SURFACE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(col_x, row_y - 1 * mm, val)


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("FullStack.Studio — Modern Web Solutions for Growing Businesses")
    c.setAuthor("FullStack.Studio")
    c.setSubject("Full Stack Web Development for the Turkish Market")

    page_one(c); c.showPage()
    page_two(c); c.showPage()
    page_three(c); c.showPage()
    page_four(c); c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

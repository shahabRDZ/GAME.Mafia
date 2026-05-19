"""MedResearch Analytics — premium catalog brochure (A4, 4 pages).

Design language: world-class catalog publishing.
References: Phaidon monographs, Hermès Le Monde, Nature, MIT Press.
- Deep forest green, brass accent, warm ivory paper
- Asymmetric grid, 6pt baseline rhythm
- Drop cap, small caps, oldstyle numerals via Helvetica-Light
- Custom monogram, refined ECG specimen, scatter "fig"
- Colophon back-page treatment
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ---- world-class palette ----
INK = HexColor("#0E1A14")     # deep forest-black, body text
FOREST = HexColor("#1B4332")  # primary, structural
DEEP = HexColor("#0A2A20")    # darker tone
BRASS = HexColor("#B08A3E")   # premium accent
PAPER = HexColor("#F2EBDD")   # warm ivory
SOFT = HexColor("#DCD3BF")    # paper shadow
MUTED = HexColor("#6B6256")   # warm grey for body
HAIR = HexColor("#A89E89")    # hairline rule

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
RAIL_W = 26 * mm

OUT = "/Users/sir.sh/testdevops/medresearch_brochure.pdf"


# ---------- primitives ----------

def fill_paper(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def hairline(c, x1, y1, x2, y2, color=HAIR, width=0.4):
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


def smallcaps(c, x, y, text, size=7.5, tracking=1.4, color=MUTED, font="Helvetica-Bold"):
    c.setFillColor(color)
    c.setFont(font, size)
    spaced = ""
    for ch in text.upper():
        spaced += ch + (" " * int(tracking))
    c.drawString(x, y, spaced.rstrip())


def vtext(c, x, y, text, size=7.5, color=PAPER, tracking=2, font="Helvetica-Bold"):
    c.saveState()
    c.translate(x, y)
    c.rotate(90)
    c.setFillColor(color)
    c.setFont(font, size)
    spaced = (" " * tracking).join(list(text))
    c.drawString(0, 0, spaced)
    c.restoreState()


# ---------- monogram & marks ----------

def monogram(c, cx, cy, r=10 * mm, color=BRASS, mark_color=PAPER):
    """A circular MR monogram — the brand mark."""
    c.setStrokeColor(color)
    c.setLineWidth(0.8)
    c.circle(cx, cy, r, fill=0, stroke=1)
    c.circle(cx, cy, r - 1.4 * mm, fill=0, stroke=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", r * 0.95)
    c.drawCentredString(cx, cy - r * 0.32, "M")
    c.setFont("Helvetica-BoldOblique", r * 0.55)
    c.drawCentredString(cx + r * 0.45, cy - r * 0.05, "r")


def ecg_specimen(c, x, y, w, color=BRASS, baseline=HAIR):
    """Refined ECG line — calmer, more elegant."""
    hairline(c, x, y, x + w, y, color=baseline, width=0.3)
    c.setStrokeColor(color)
    c.setLineWidth(0.9)
    p = c.beginPath()
    p.moveTo(x, y)
    p.lineTo(x + w * 0.30, y)
    # P
    p.curveTo(x + w * 0.32, y, x + w * 0.34, y + 1.6 * mm, x + w * 0.36, y)
    p.lineTo(x + w * 0.42, y)
    # QRS
    p.lineTo(x + w * 0.435, y - 1.5 * mm)
    p.lineTo(x + w * 0.45, y + 7 * mm)
    p.lineTo(x + w * 0.465, y - 3 * mm)
    p.lineTo(x + w * 0.48, y)
    p.lineTo(x + w * 0.62, y)
    # T
    p.curveTo(x + w * 0.64, y, x + w * 0.68, y + 2.4 * mm, x + w * 0.72, y)
    p.lineTo(x + w, y)
    c.drawPath(p, stroke=1, fill=0)


def scatter_field(c, x, y, w, h, color=FOREST, alpha=0.30):
    pts = [
        (0.06, 0.34), (0.12, 0.20), (0.16, 0.74), (0.18, 0.55), (0.22, 0.88),
        (0.24, 0.62), (0.25, 0.32), (0.28, 0.18), (0.30, 0.78), (0.32, 0.26),
        (0.34, 0.92), (0.36, 0.45), (0.38, 0.74), (0.40, 0.12), (0.42, 0.62),
        (0.44, 0.36), (0.46, 0.82), (0.48, 0.30), (0.50, 0.84), (0.52, 0.22),
        (0.54, 0.71), (0.56, 0.42), (0.58, 0.94), (0.60, 0.52), (0.62, 0.30),
        (0.64, 0.16), (0.66, 0.84), (0.68, 0.58), (0.70, 0.72), (0.72, 0.40),
        (0.74, 0.20), (0.76, 0.38), (0.78, 0.66), (0.80, 0.52), (0.82, 0.86),
        (0.84, 0.28), (0.86, 0.72), (0.88, 0.46), (0.90, 0.58), (0.92, 0.34),
        (0.94, 0.68),
    ]
    base = Color(0.10, 0.27, 0.20, alpha=alpha)
    c.setFillColor(base)
    for i, (rx, ry) in enumerate(pts):
        r = 0.7 + (i % 3) * 0.4
        c.circle(x + rx * w, y + ry * h, r, fill=1, stroke=0)


def index_rail(c, label_top, label_bottom, page_no):
    c.setFillColor(FOREST)
    c.rect(0, 0, RAIL_W, PAGE_H, fill=1, stroke=0)
    # inner brass hairline
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.4)
    c.line(RAIL_W - 1.2 * mm, MARGIN, RAIL_W - 1.2 * mm, PAGE_H - MARGIN)
    # rotated labels
    vtext(c, RAIL_W / 2 + 2.5, MARGIN + 8 * mm, label_top, size=7.5, color=PAPER, tracking=2)
    vtext(c, RAIL_W / 2 + 2.5, PAGE_H - 90 * mm, label_bottom, size=6.5, color=SOFT, tracking=1)
    # folio
    c.setFillColor(BRASS)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(RAIL_W / 2, PAGE_H - MARGIN - 4 * mm, f"{page_no:02d}")
    hairline(c, RAIL_W / 2 - 4 * mm, PAGE_H - MARGIN - 8 * mm,
             RAIL_W / 2 + 4 * mm, PAGE_H - MARGIN - 8 * mm, color=BRASS, width=0.5)
    # bottom mark
    c.setFillColor(PAPER)
    c.setFont("Helvetica", 6)
    c.drawCentredString(RAIL_W / 2, MARGIN, "MRA · 2026")


def top_meta(c, left, right):
    y = PAGE_H - MARGIN - 4 * mm
    smallcaps(c, RAIL_W + 10 * mm, y, left, size=7, color=MUTED)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    spaced = " ".join(list(right.upper()))
    c.drawRightString(PAGE_W - MARGIN, y, spaced)
    hairline(c, RAIL_W + 10 * mm, y - 3 * mm, PAGE_W - MARGIN, y - 3 * mm)


# ---------- pages ----------

def page_one(c):
    fill_paper(c)
    index_rail(c, "MEDRESEARCH ANALYTICS", "EDITION ONE / 2026", 1)

    cx0 = RAIL_W + 12 * mm
    cw = PAGE_W - cx0 - MARGIN

    top_meta(c, "A Brief for Researchers", "Volume I")

    # Monogram top-right
    monogram(c, PAGE_W - MARGIN - 12 * mm, PAGE_H - MARGIN - 24 * mm, r=10 * mm, color=BRASS)

    # Tag line
    y = PAGE_H - 50 * mm
    smallcaps(c, cx0, y, "On Method, Evidence, and the Quiet Work of Data", size=8, color=BRASS)

    # Display headline — large, refined
    y -= 18 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 44)
    c.drawString(cx0, y, "Empowering")
    y -= 14 * mm
    c.drawString(cx0, y, "Medical Research")
    y -= 14 * mm
    c.setFillColor(FOREST)
    c.drawString(cx0, y, "with ")
    pre = c.stringWidth("with ", "Helvetica-Bold", 44)
    c.setFont("Helvetica-BoldOblique", 44)
    c.setFillColor(BRASS)
    c.drawString(cx0 + pre, y, "Data & Technology.")

    # ECG specimen
    y -= 16 * mm
    ecg_specimen(c, cx0, y, cw, color=BRASS)

    # Subhead
    y -= 14 * mm
    wrap(c, cx0, y,
         "Advanced analytical and technical support for modern healthcare research — "
         "rigorous, ethical, and shaped to the way researchers actually work.",
         cw, font="Helvetica", size=12.5, leading=18, color=MUTED)

    # Lower band — pull quote (refined, no big curly mark)
    box_y = MARGIN + 8 * mm
    box_h = 44 * mm
    hairline(c, cx0, box_y + box_h, PAGE_W - MARGIN, box_y + box_h, color=HAIR, width=0.5)
    hairline(c, cx0, box_y, PAGE_W - MARGIN, box_y, color=HAIR, width=0.5)

    # left column — the quote
    qx = cx0
    qw = cw * 0.62
    smallcaps(c, qx, box_y + box_h - 8 * mm, "Operating Principle", size=7, color=BRASS)
    c.setFillColor(INK)
    c.setFont("Helvetica-Oblique", 14)
    wrap(c, qx, box_y + box_h - 16 * mm,
         "Better data discipline does not slow research down — "
         "it is the shortest path to evidence you can defend.",
         qw, font="Helvetica-Oblique", size=14, leading=18, color=INK)

    # right column — written for
    rx = cx0 + cw * 0.66
    rw = cw - cw * 0.66
    smallcaps(c, rx, box_y + box_h - 8 * mm, "Written For", size=7, color=BRASS)
    aud = ["Medical researchers", "Faculty & professors", "PhD & MSc candidates", "Labs & institutions"]
    ay = box_y + box_h - 16 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    for a in aud:
        c.drawString(rx, ay, "—  " + a)
        ay -= 6 * mm


def page_two(c):
    fill_paper(c)
    index_rail(c, "PREFACE  ·  ON OUR PRACTICE", "INTRODUCTION", 2)

    cx0 = RAIL_W + 12 * mm
    cw = PAGE_W - cx0 - MARGIN

    top_meta(c, "§ I   Preface", "On Our Practice")

    # Heading
    y = PAGE_H - 42 * mm
    smallcaps(c, cx0, y, "Preface", size=8, color=BRASS)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(cx0, y, "A quiet partner")
    y -= 10 * mm
    c.setFont("Helvetica-BoldOblique", 28)
    c.setFillColor(FOREST)
    c.drawString(cx0, y, "for loud data.")

    y -= 14 * mm
    hairline(c, cx0, y, PAGE_W - MARGIN, y)
    y -= 12 * mm

    # Two-column body with drop cap
    col_gap = 8 * mm
    col_w = (cw - col_gap) / 2
    col_l = cx0
    col_r = cx0 + col_w + col_gap

    # Drop cap "M"
    cap_size = 50
    c.setFillColor(BRASS)
    c.setFont("Helvetica-Bold", cap_size)
    c.drawString(col_l, y - cap_size * 0.78, "M")
    cap_w = c.stringWidth("M", "Helvetica-Bold", cap_size) + 2 * mm

    # First two lines flow around drop cap
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    leading = 14
    para_left = (
        "edical research lives or dies by the discipline of its data. We work alongside "
        "research teams to take on the analytical and technical weight — cleaning, modeling, "
        "visualizing, documenting — so the hours saved go back to the science."
    )
    # render around drop cap (first 3 lines indented, then full width)
    words = para_left.split()
    line = ""
    cy = y
    indented_lines = 0
    line_count = 0
    rendered = []
    avail_first = col_w - cap_w
    while words:
        avail = avail_first if line_count < 3 else col_w
        x_offset = cap_w if line_count < 3 else 0
        w = words[0]
        trial = (line + " " + w).strip()
        if c.stringWidth(trial, "Helvetica", 10) > avail:
            rendered.append((col_l + x_offset, cy, line))
            line = w
            cy -= leading
            line_count += 1
            words.pop(0)
        else:
            line = trial
            words.pop(0)
    if line:
        x_offset = cap_w if line_count < 3 else 0
        rendered.append((col_l + x_offset, cy, line))
        cy -= leading
    for (rx, ry, txt) in rendered:
        c.drawString(rx, ry, txt)

    cy -= 4 * mm
    cy = wrap(c, col_l, cy,
              "Our remit is technical, methodological, and editorial — never authorial. "
              "We sharpen the apparatus around your science; the science remains yours.",
              col_w, font="Helvetica", size=10, leading=14, color=INK)

    # Right column
    cy_r = y
    smallcaps(c, col_r, cy_r, "What We Believe", size=7, color=BRASS)
    cy_r -= 8 * mm
    beliefs = [
        ("Rigour", "Reproducibility is a feature, not a chore."),
        ("Restraint", "Less analysis, done well, beats more done loosely."),
        ("Respect", "The researcher is the author. We are the apparatus."),
        ("Receipts", "Every figure traceable to a script, a seed, a source."),
    ]
    for label, desc in beliefs:
        c.setFillColor(FOREST)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(col_r, cy_r, label)
        cy_r -= 5 * mm
        cy_r = wrap(c, col_r, cy_r, desc, col_w,
                    font="Helvetica", size=9.5, leading=12.5, color=MUTED)
        cy_r -= 3 * mm
        hairline(c, col_r, cy_r, col_r + col_w, cy_r, color=SOFT)
        cy_r -= 5 * mm

    # Bottom — figure with scatter
    sf_y = MARGIN + 8 * mm
    sf_h = 32 * mm
    hairline(c, cx0, sf_y + sf_h + 6 * mm, PAGE_W - MARGIN, sf_y + sf_h + 6 * mm)
    smallcaps(c, cx0, sf_y + sf_h + 1 * mm, "Fig. 01  ·  The shape of messy data", size=7, color=MUTED)
    scatter_field(c, cx0, sf_y, cw, sf_h, alpha=0.32)
    hairline(c, cx0, sf_y, PAGE_W - MARGIN, sf_y)


def page_three(c):
    fill_paper(c)
    index_rail(c, "CATALOGUE OF SERVICES", "WHAT WE DO", 3)

    cx0 = RAIL_W + 12 * mm
    cw = PAGE_W - cx0 - MARGIN

    top_meta(c, "§ II   Catalogue of Services", "Seven Entries")

    # Heading
    y = PAGE_H - 42 * mm
    smallcaps(c, cx0, y, "Catalogue", size=8, color=BRASS)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(cx0, y, "What we do, exactly.")

    y -= 12 * mm
    hairline(c, cx0, y, PAGE_W - MARGIN, y, color=INK, width=0.8)
    y -= 8 * mm

    services = [
        ("I", "Statistical Data Analysis",
         "SPSS · Python · R", "Rigorous quantitative analysis for clinical and biomedical studies."),
        ("II", "Data Cleaning & Preprocessing",
         "Pipelines · Audit", "Transform raw datasets into research-ready, audit-friendly tables."),
        ("III", "Research Methodology Consultation",
         "Design · Sampling", "Refine study design, sampling strategies, and analytical frameworks."),
        ("IV", "Visualization & Reporting",
         "Charts · Dashboards", "Publication-quality visuals and structured, journal-ready reports."),
        ("V", "Literature Structuring Assistance",
         "Reference · Index", "Organisational and reference-management support — non-writing."),
        ("VI", "Machine Learning for Medical Data",
         "Modeling · Inference", "Predictive modeling and pattern discovery, where scientifically appropriate."),
        ("VII", "Research Workflow Optimization",
         "Pipelines · Tooling", "Streamline data pipelines from collection through submission."),
    ]

    # Catalog rows: roman | title (+ tag) | description right-aligned
    row_h = 16 * mm
    for num, title, tag, desc in services:
        # roman numeral
        c.setFillColor(BRASS)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(cx0, y - 4 * mm, num)

        # title
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(cx0 + 12 * mm, y - 4 * mm, title)

        # tag (small caps under title)
        smallcaps(c, cx0 + 12 * mm, y - 9 * mm, tag, size=7, color=MUTED)

        # description — right column
        desc_x = cx0 + cw * 0.50
        wrap(c, desc_x, y - 4 * mm, desc, cw - cw * 0.50,
             font="Helvetica", size=9.5, leading=12.5, color=INK)

        y -= row_h
        hairline(c, cx0, y, PAGE_W - MARGIN, y, color=SOFT, width=0.5)


def page_four(c):
    fill_paper(c)
    index_rail(c, "VALUES  ·  TOOLS  ·  COLOPHON", "BACK MATTER", 4)

    cx0 = RAIL_W + 12 * mm
    cw = PAGE_W - cx0 - MARGIN

    top_meta(c, "§ III   The Promise & Colophon", "Back Matter")

    # Heading
    y = PAGE_H - 42 * mm
    smallcaps(c, cx0, y, "Why researchers stay", size=8, color=BRASS)
    y -= 12 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(cx0, y, "Four pillars.")

    y -= 14 * mm
    hairline(c, cx0, y, PAGE_W - MARGIN, y)
    y -= 10 * mm

    values = [
        ("01", "Accuracy", "Reproducible, peer-review-ready statistical outcomes."),
        ("02", "Velocity", "Faster data preparation and analysis turnaround."),
        ("03", "Readiness", "Outputs aligned with leading journal standards."),
        ("04", "Scale", "Confident handling of high-volume, multi-source data."),
    ]
    cw_col = cw / 4
    top = y
    for i, (n, title, desc) in enumerate(values):
        cx = cx0 + i * cw_col
        if i > 0:
            hairline(c, cx - 2 * mm, top - 1 * mm, cx - 2 * mm, top - 36 * mm, color=SOFT)
        c.setFillColor(BRASS)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(cx, top - 8 * mm, n)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(cx, top - 16 * mm, title)
        wrap(c, cx, top - 22 * mm, desc, cw_col - 4 * mm,
             font="Helvetica", size=9, leading=12, color=MUTED)

    y = top - 42 * mm
    hairline(c, cx0, y, PAGE_W - MARGIN, y)
    y -= 9 * mm

    # Tools — typographic
    smallcaps(c, cx0, y, "Tools & Technologies", size=7.5, color=BRASS)
    y -= 8 * mm

    tools = ["Python", "Pandas", "NumPy", "Scikit-learn", "SPSS", "R", "SQL", "Matplotlib", "Plotly", "Tableau"]
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    sep = "   ·   "
    line = ""
    sx, sy = cx0, y
    for t in tools:
        trial = (line + sep + t) if line else t
        if c.stringWidth(trial, "Helvetica-Bold", 13) > cw:
            c.drawString(sx, sy, line)
            sy -= 8 * mm
            line = t
        else:
            line = trial
    if line:
        c.drawString(sx, sy, line)
        sy -= 8 * mm

    y = sy - 4 * mm
    hairline(c, cx0, y, PAGE_W - MARGIN, y)
    y -= 9 * mm

    # Compliance
    smallcaps(c, cx0, y, "Ethics  ·  Legality  ·  Transparency", size=7.5, color=BRASS)
    y -= 9 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Oblique", 12)
    y = wrap(c, cx0, y,
             "We operate strictly within legal and ethical frameworks and do not engage "
             "in unauthorised or prohibited research activities. All collaborations align "
             "with institutional review standards, data-protection regulations, and "
             "scientific integrity principles.",
             cw, font="Helvetica-Oblique", size=11.5, leading=15.5, color=INK)

    # CTA / colophon block — inverted forest panel
    cta_h = 50 * mm
    cta_y = MARGIN + 6 * mm
    c.setFillColor(FOREST)
    c.rect(cx0, cta_y, cw, cta_h, fill=1, stroke=0)
    # brass inner hairline frame
    c.setStrokeColor(BRASS)
    c.setLineWidth(0.4)
    c.rect(cx0 + 3 * mm, cta_y + 3 * mm, cw - 6 * mm, cta_h - 6 * mm, fill=0, stroke=1)

    # monogram inside, top-right
    monogram(c, cx0 + cw - 14 * mm, cta_y + cta_h - 14 * mm, r=8 * mm, color=BRASS)

    # ecg
    ecg_specimen(c, cx0 + 8 * mm, cta_y + 14 * mm, cw - 36 * mm,
                 color=BRASS, baseline=HexColor("#3a5a4a"))

    smallcaps(c, cx0 + 8 * mm, cta_y + cta_h - 9 * mm, "Let us begin", size=7.5, color=BRASS)

    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(cx0 + 8 * mm, cta_y + cta_h - 20 * mm, "Collaborate to accelerate")
    c.setFont("Helvetica-BoldOblique", 22)
    c.setFillColor(BRASS)
    c.drawString(cx0 + 8 * mm, cta_y + cta_h - 30 * mm, "your research.")

    # Contact line
    c.setFillColor(SOFT)
    c.setFont("Helvetica", 9)
    c.drawString(cx0 + 8 * mm, cta_y + 6 * mm,
                 "contact@medresearch.example   ·   www.medresearch.example   ·   /in/medresearch")

    # Colophon micro-line under CTA
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(PAGE_W / 2, MARGIN - 2 * mm,
                        "COLOPHON  ·  Set in Helvetica.  Printed on warm ivory stock.  "
                        "© MedResearch Analytics, MMXXVI.")


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("MedResearch Analytics — A Brief for Researchers")
    c.setAuthor("MedResearch Analytics")
    c.setSubject("Medical Research Support and Data Analysis Services")

    page_one(c); c.showPage()
    page_two(c); c.showPage()
    page_three(c); c.showPage()
    page_four(c); c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

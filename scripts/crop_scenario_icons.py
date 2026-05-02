"""
Crop the 9 scenario tile icons out of the supplied reference sheet
(img/scenario-tiles-reference.png).

The sheet is 1536×1024 with row 1 = 7 tiles, row 2 = 2 tiles aligned
right. Tile crop boxes were measured visually; tweak ICON_BOXES if the
reference layout changes.

Output: img/scenario-icons/{key}.png  (transparent / dark edges)
"""
import os
from PIL import Image

SRC = "/Users/sir.sh/testdevops/img/scenario-tiles-reference.png"
OUT = "/Users/sir.sh/testdevops/img/scenario-icons"
os.makedirs(OUT, exist_ok=True)

# Visual order in the sheet, mapped to scenario keys we use in the UI.
# Row 1 (left → right):
#   custom · digital · bounty · negotiation · parliament · investigator · ranger
# Row 2 (left → right):
#   lab · chaos
ICON_BOXES = {
    # Pixel-precise boxes derived by scanning the supplied 1536×1024
    # reference for each tile's bright interior region (gold rim +
    # skull artwork). Tile widths vary 122–151 px so we keep each
    # box as wide as its real tile rather than forcing a uniform size.
    "custom":       (114, 175, 236, 330),   # دلخواه
    "digital":      (294, 175, 420, 330),   # بدون گرداننده
    "bounty":       (496, 175, 646, 330),   # جایزه سر رئیس
    "negotiation":  (703, 175, 830, 330),   # مذاکره
    "parliament":   (909, 175, 1038, 330),  # نماینده
    "investigator": (1092, 175, 1242, 330), # بازپرس
    "ranger":       (1318, 175, 1450, 330), # تکاور
    "lab":          (114, 480, 236, 635),   # آزمایش
    "chaos":        (294, 480, 420, 635),   # کپاس
}


def main():
    img = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC}  ({img.size[0]}×{img.size[1]})")
    for key, box in ICON_BOXES.items():
        crop = img.crop(box)
        out_path = os.path.join(OUT, f"{key}.png")
        crop.save(out_path, "PNG", optimize=True)
        print(f"  ✓ {key:14s} {box} → {crop.size}")
    print(f"\nDone → {OUT}")


if __name__ == "__main__":
    main()

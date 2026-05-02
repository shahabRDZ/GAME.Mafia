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
    # Centered crops — each tile's skull illustration centered in a
    # square. The CSS .group-btn renders its own gold frame around
    # the icon so we keep the artwork tight and centered here.
    "custom":       (148, 195, 268, 315),   # دلخواه
    "digital":      (335, 195, 455, 315),   # بدون گرداننده
    "bounty":       (522, 195, 642, 315),   # جایزه سر رئیس
    "negotiation":  (709, 195, 829, 315),   # مذاکره
    "parliament":   (896, 195, 1016, 315),  # نماینده
    "investigator": (1083, 195, 1203, 315), # بازپرس
    "ranger":       (1270, 195, 1390, 315), # تکاور
    "lab":          (148, 500, 268, 620),   # آزمایش
    "chaos":        (335, 500, 455, 620),   # کپاس
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

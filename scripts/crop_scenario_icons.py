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
    # Pixel-precise tile bounds — measured from the supplied 1536×1024
    # reference by profiling per-row brightness:
    #   row 1 tile rim: y=189–340  (label sits at y≈365)
    #   row 2 tile rim: y=510–660  (label at y≈685)
    # Widths come from the bright vertical bands per tile (122–151 px).
    # Earlier crops used y=175–330 which clipped a sliver of empty
    # space above the tile and cut the bottom rim — that's the
    # "white line at top" / off-center look that was reported.
    "custom":       (114, 189, 236, 340),   # دلخواه
    "digital":      (294, 189, 420, 340),   # بدون گرداننده
    "bounty":       (496, 189, 646, 340),   # جایزه سر رئیس
    "negotiation":  (703, 189, 830, 340),   # مذاکره
    "parliament":   (909, 189, 1038, 340),  # نماینده
    "investigator": (1092, 189, 1242, 340), # بازپرس
    "ranger":       (1318, 189, 1450, 340), # تکاور
    "lab":          (114, 510, 236, 660),   # آزمایش
    "chaos":        (294, 510, 420, 660),   # کپاس
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

"""
Detect and crop the white/light frame around card artwork.

Usage:
    python3 strip_white_frame.py <input_dir> <output_dir>
    python3 strip_white_frame.py path/to/card.png path/to/cleaned.png

Algorithm
---------
1. Convert the image to grayscale.
2. Build a binary mask of "non-frame" pixels — anything significantly
   darker than pure white. The threshold is auto-tuned per image so it
   handles cream/off-white frames as well as pure-white ones.
3. Project that mask onto the X and Y axes and find the first/last
   rows and columns whose dark-pixel ratio crosses a small minimum.
   Those bounds are the inner bounding-box of the actual artwork.
4. Crop to that box and re-save (RGBA preserved, PNG optimized).

The function is intentionally tolerant of vignettes, decorative inner
frames, and slight border-print bleed — it crops to where actual content
begins, not to the first non-white pixel.
"""
from __future__ import annotations
import os, sys, glob
from PIL import Image, ImageOps
import numpy as np


# pixel is "frame" if its grayscale value exceeds this fraction of 255
DEFAULT_WHITE_FRAC = 0.86

# minimum fraction of "non-frame" pixels in a row/column for it to count
# as part of the artwork (filters out one-pixel speckles and JPEG noise)
DEFAULT_CONTENT_RATIO = 0.04

# always leave this many pixels of margin around the cropped box
SAFETY_MARGIN = 2


def _content_bounds(arr: np.ndarray, white_frac: float, ratio: float):
    """Return (top, bottom, left, right) of the content bounding box."""
    h, w = arr.shape
    threshold = 255 * white_frac
    content = arr < threshold              # True where pixel is darker than frame

    rows = content.mean(axis=1)            # per-row content density
    cols = content.mean(axis=0)            # per-col content density

    # walk inward from each edge until density crosses the ratio
    def _first(arr_1d):
        for i, v in enumerate(arr_1d):
            if v >= ratio:
                return i
        return 0

    def _last(arr_1d):
        for i in range(len(arr_1d) - 1, -1, -1):
            if arr_1d[i] >= ratio:
                return i
        return len(arr_1d) - 1

    top    = max(_first(rows) - SAFETY_MARGIN, 0)
    bottom = min(_last(rows)  + SAFETY_MARGIN, h - 1)
    left   = max(_first(cols) - SAFETY_MARGIN, 0)
    right  = min(_last(cols)  + SAFETY_MARGIN, w - 1)
    return top, bottom, left, right


def strip_white_frame(
    img: Image.Image,
    white_frac: float = DEFAULT_WHITE_FRAC,
    content_ratio: float = DEFAULT_CONTENT_RATIO,
    inset_pct: float = 0.0,
) -> Image.Image:
    """Return a new Image with the surrounding white/light frame removed.

    inset_pct
      Additional percentage cropped from each side AFTER the auto-detected
      bbox. Use 0.05–0.08 to chop off an ornate inner decorative frame that
      lives inside the artwork (where there's no actual white margin to
      detect, but the design ends in a printed rectangle).
    """
    rgba = img.convert("RGBA")
    gray = np.asarray(rgba.convert("L"))
    top, bottom, left, right = _content_bounds(gray, white_frac, content_ratio)

    # Sanity guard — if detection fails the bbox might be the full image,
    # in which case we just return the original (no harm done).
    if right - left < gray.shape[1] * 0.5 or bottom - top < gray.shape[0] * 0.5:
        top, bottom, left, right = 0, gray.shape[0] - 1, 0, gray.shape[1] - 1

    if inset_pct > 0:
        h = bottom - top + 1
        w = right - left + 1
        dy = int(h * inset_pct)
        dx = int(w * inset_pct)
        top    += dy
        bottom -= dy
        left   += dx
        right  -= dx

    return rgba.crop((left, top, right + 1, bottom + 1))


def _process_one(in_path: str, out_path: str) -> None:
    img = Image.open(in_path)
    cleaned = strip_white_frame(img)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    cleaned.save(out_path, "PNG", optimize=True)
    pct = (1 - (cleaned.size[0] * cleaned.size[1]) /
                (img.size[0] * img.size[1])) * 100
    print(f"  ✓ {os.path.basename(in_path):40s} "
          f"{img.size} → {cleaned.size}  (-{pct:4.1f}%)")


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, dst = argv[1], argv[2]

    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        files = sorted(
            f for f in os.listdir(src)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        )
        for f in files:
            _process_one(os.path.join(src, f), os.path.join(dst, f))
        print(f"\nDone. {len(files)} image(s) → {dst}")
    else:
        _process_one(src, dst)


if __name__ == "__main__":
    main(sys.argv)

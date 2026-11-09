"""Builds the website artwork from the flat design image (design/reference.jpg).

Until the designer's layered files arrive, the site's artwork is cut from the
single 720x1280 design image:

  assets/card.jpg       the invitation card with all text, icons, flourishes
                        and the pink "و" painted out (text is live HTML on top),
                        upscaled 2x to 1440x2560
  assets/flourish.png   the copper scroll line above/below the names (transparent)
  assets/waw.png        the pink "و" between the names (transparent)
  assets/paper.jpg      seamless watercolour-paper tile for the rest of the page

usage:  Tools/.venv/Scripts/python Tools/design/make_assets.py [--debug DIR]
        --debug DIR also saves the text mask and before/after crops there.

Needs: pillow, numpy, opencv-python-headless (see Tools/requirements.txt).
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "design" / "reference.jpg"
OUT = ROOT / "assets"
DEBUG = Path(sys.argv[sys.argv.index("--debug") + 1]) if "--debug" in sys.argv else None

# Everything that is drawn as live HTML/SVG on the site, in design pixels
# (x0, y0, x1, y1). Only "ink" inside these boxes is painted out.
TEXT_BOXES = {
    "verse":      (200, 250, 545, 302),
    "paragraph":  (165, 328, 575, 440),
    "yatasharraf": (322, 466, 425, 494),
    "families":   (165, 498, 556, 574),
    "invite":     (250, 603, 486, 632),
    "flourish1":  (246, 648, 496, 674),
    "names":      (182, 672, 556, 800),
    "flourish2":  (246, 806, 496, 832),
    "mashee'a":   (252, 873, 468, 902),
    "icons":      (210, 898, 508, 952),
    "labels":     (192, 953, 542, 999),
    "closing":    (266, 1001, 462, 1031),
}

# A plain patch of paper (no flowers) used for the page texture
PAPER_PATCH = (200, 440, 520, 640)

# Elements kept as transparent images: (box, smoothing threshold)
CUTOUTS = {
    "flourish": (TEXT_BOXES["flourish1"], 0.18),
    "waw":      ((336, 698, 402, 798), 0.22),
}


def load():
    return cv2.imread(str(SRC), cv2.IMREAD_COLOR)  # BGR uint8


def background(img, k):
    """Paper/watercolour estimate without the ink: a wide median filter."""
    return cv2.medianBlur(img, k)


def ink_mask(img, bg, box, thresh=13):
    x0, y0, x1, y1 = box
    a = img[y0:y1, x0:x1].astype(np.int16)
    b = bg[y0:y1, x0:x1].astype(np.int16)
    diff = np.abs(a - b).max(axis=2)
    m = (diff > thresh).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    full = np.zeros(img.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = m
    return full


def clean_plate(img):
    bg_small = background(img, 31)
    bg_big = background(img, 71)
    mask = np.zeros(img.shape[:2], np.uint8)
    for name, box in TEXT_BOXES.items():
        bg = bg_big if name in ("names", "icons") else bg_small
        mask |= ink_mask(img, bg, box)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # keep the mask inside the boxes (dilation may spill over)
    keep = np.zeros_like(mask)
    for x0, y0, x1, y1 in TEXT_BOXES.values():
        keep[y0 - 2:y1 + 2, x0 - 2:x1 + 2] = 255
    mask &= keep
    out = cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA)
    # watercolour paper has a fine grain; the inpainted patches are too smooth,
    # so add back a matching amount of grain inside them
    # (measured on a plain, text-free patch of paper)
    patch = img[455:500, 440:520].astype(np.float32)
    sigma = float((patch - cv2.GaussianBlur(patch, (0, 0), 1.6)).std())
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, img.shape[:2]).astype(np.float32)
    noise = cv2.GaussianBlur(noise, (0, 0), 0.7)
    noise *= sigma / max(noise.std(), 1e-6)
    soft = cv2.GaussianBlur(mask, (0, 0), 2).astype(np.float32)[..., None] / 255
    out = np.clip(out.astype(np.float32) + noise[..., None] * soft, 0, 255).astype(np.uint8)
    return out, mask


def cutout(img, box, edge, scale=4):
    """Lift a coloured element off the paper as RGBA, upscaled `scale` times
    with clean, crisp edges."""
    x0, y0, x1, y1 = box
    pad = 4
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    crop = img[y0:y1, x0:x1].astype(np.float32)
    bg = background(img, 41)[y0:y1, x0:x1].astype(np.float32)
    # how far each pixel is from the paper, in any colour channel (catches pale pinks too)
    d = np.abs(bg - crop).max(axis=2)
    alpha = np.clip(d / max(np.percentile(d, 99.5), 1), 0, 1)
    # ink colour = un-mix the paper out of each pixel, then smooth
    a3 = np.maximum(alpha, 0.35)[..., None]
    ink = np.clip((crop - (1 - a3) * bg) / a3, 0, 255)
    ink = cv2.GaussianBlur(ink, (0, 0), 1.2)
    big = lambda arr, interp: cv2.resize(arr, None, fx=scale, fy=scale, interpolation=interp)
    alpha = big(alpha, cv2.INTER_CUBIC)
    # sharpen the soft upscaled edge into a clean stroke edge
    lo, hi = edge, edge + 0.42
    t = np.clip((alpha - lo) / (hi - lo), 0, 1)
    alpha = t * t * (3 - 2 * t)
    ink = big(ink, cv2.INTER_CUBIC)
    rgba = np.dstack([ink[..., 2], ink[..., 1], ink[..., 0], alpha * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")
    return im.crop(im.getbbox())


def paper_tile(plate):
    """A seamless watercolour-paper tile for the page below the card: a plain
    patch of the (text-free) card, evened out, mirrored 2x2 so its edges meet."""
    x0, y0, x1, y1 = PAPER_PATCH
    patch = plate[y0:y1, x0:x1].astype(np.float32)
    # keep the paper grain, drop the big colour drifts of the sky wash
    low = cv2.GaussianBlur(patch, (0, 0), 18)
    patch = (patch - low) * 0.5 + low.reshape(-1, 3).mean(axis=0)   # half-strength grain
    patch = np.clip(patch, 0, 255).astype(np.uint8)
    tile = np.vstack([np.hstack([patch, patch[:, ::-1]]),
                      np.hstack([patch[::-1], patch[::-1, ::-1]])])
    rgb = cv2.cvtColor(tile, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb).resize((tile.shape[1] * 2, tile.shape[0] * 2), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    img = load()
    plate, mask = clean_plate(img)

    rgb = cv2.cvtColor(plate, cv2.COLOR_BGR2RGB)
    big = Image.fromarray(rgb).resize((1440, 2560), Image.LANCZOS)
    big.save(OUT / "card.jpg", quality=86, optimize=True, progressive=True)

    for name, (box, edge) in CUTOUTS.items():
        cutout(img, box, edge).save(OUT / f"{name}.png", optimize=True)

    paper_tile(plate).save(OUT / "paper.jpg", quality=82, optimize=True)

    if DEBUG:
        DEBUG.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(DEBUG / "mask.png"), mask)
        side = np.hstack([img, plate])
        cv2.imwrite(str(DEBUG / "before-after.png"), side)
    print("saved", ", ".join(p.name for p in sorted(OUT.iterdir())))


if __name__ == "__main__":
    main()

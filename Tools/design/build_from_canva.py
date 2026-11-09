"""Builds the website artwork from the Canva design's own layers.

The layer files were downloaded from the Canva design into design/canva/.
Their positions below are copied from the Canva document (1080x1920 page,
in Canva's units). Run this again if the layers or positions change.

  The Canva card is split into three pieces for the site:
  assets/top.webp        first page: chandelier, flowers, curtains, top halves
                         of the pillars (fades out at the bottom)
  assets/pillar-left.webp, pillar-right.webp
                         a repeating piece of each pillar's shaft, run down the
                         sides of the whole site
  assets/bottom.webp     last page: grass, pillar bases, leaves (fades in at the top)
  assets/cloth.webp      the green satin cloth on its own (sits on the last page;
                         a separate layer so it can be animated)
  assets/waw.webp        the pink «و» between the names
  assets/flourish.svg    the copper scroll line (vector), coloured as in Canva
  assets/icon-*.svg      calendar / pin / clock icons (vector), coloured

usage:  Tools/.venv/Scripts/python Tools/design/build_from_canva.py
Needs: pillow (see Tools/requirements.txt).
"""
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "design" / "canva"
OUT = ROOT / "assets"

PAGE_W, PAGE_H = 1080, 1920          # Canva page size
S = 4 / 3                             # output scale → 1440x2560

# Each layer: element box on the page (left, top, width, height), and where the
# image sits inside that box (left, top, width, height) — Canva crops to the box.
BACKGROUND = dict(box=(0, 0, 1080, 1920), img=(-190.354, 0, 1461.608, 1948.811))
TOP_WASH = dict(box=(0, 0, 1080, 801.9), img=(0, 0, 1080, 801.9), opacity=0.8)
CURTAIN_R = dict(box=(901.180, -84.941, 362.582, 751.465))
CURTAIN_L = dict(box=(-232.294, -44.458, 391.236, 810.851), flip=True)
CHANDELIER = dict(box=(419.959, 0, 271.949, 357.827))
CLOTH = dict(box=(-8.767, 1324.446, 1097.534, 572.438), img=(-232.267, -44.579, 1562.068, 617.017))
TEXTURE = dict(box=(5.861, 0.915, 1080, 1920), img=(-540.760, 0, 2169.492, 1920), opacity=0.23)

# names group is scaled 1.335x in Canva; the «و» box and crop are in page units
NAMES_SCALE = 629.1434 / 471.2675
WAW = dict(box=(238.423 + 166.193 * NAMES_SCALE, 978.915 + 51.905 * NAMES_SCALE,
                127.817 * NAMES_SCALE, 115.490 * NAMES_SCALE),
           img=(0, -7.314 * NAMES_SCALE, 127.817 * NAMES_SCALE, 130.117 * NAMES_SCALE))

SVG_COLOURS = {
    "flourish.svg": ("flourish.svg", "#a97541"),
    "icon-venue.svg": ("icon-calendar.svg", "#972726"),   # (named by download order)
    "icon-a.svg": ("icon-pin.svg", "#972726"),
    "icon-b.svg": ("icon-clock.svg", "#972726"),
}


def px(v, scale=S):
    return int(round(v * scale))


def layer(name, spec, scale=S, canvas_size=None, origin=(0, 0)):
    """Render one layer into a transparent canvas.
    canvas_size/origin: the canvas area in page units (default: the whole page)."""
    cw, ch = canvas_size or (PAGE_W, PAGE_H)
    ox, oy = origin
    canvas = Image.new("RGBA", (px(cw, scale), px(ch, scale)), (0, 0, 0, 0))
    im = Image.open(SRC / name).convert("RGBA")
    bx, by, bw, bh = spec["box"]
    ix, iy, iw, ih = spec.get("img", (0, 0, bw, bh))
    im = im.resize((max(1, px(iw, scale)), max(1, px(ih, scale))), Image.LANCZOS)
    if spec.get("flip"):
        im = ImageOps.mirror(im)
    # place the image, then clip it to its element box
    placed = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    placed.paste(im, (px(bx + ix - ox, scale), px(by + iy - oy, scale)))
    clip = Image.new("L", canvas.size, 0)
    clip.paste(255, (px(bx - ox, scale), px(by - oy, scale), px(bx + bw - ox, scale), px(by + bh - oy, scale)))
    a = placed.getchannel("A")
    a = Image.composite(a, Image.new("L", a.size, 0), clip)
    if spec.get("opacity", 1) != 1:
        a = a.point(lambda v: int(v * spec["opacity"]))
    placed.putalpha(a)
    canvas.alpha_composite(placed)
    return canvas


# Where the card is cut (Canva page units, y from the top)
TOP_END, TOP_FADE = 1160, 120          # first page art ends here, fading out over the last 120
BOTTOM_START, BOTTOM_FADE = 1150, 90   # last page art starts here (just above the grass)
# a clean stretch of each pillar's shaft (no grass, no leaves), repeated down the page
SHAFT_ROWS = (1425, 1595)
PILLAR_L = dict(x=(0, 150), solid=(0, 122))      # strip width, and the part that stays solid
PILLAR_R = dict(x=(968, 1080), solid=(998, 1080))


def fade_rows(img, start, length, fade_in):
    """Fade an RGBA image's alpha over `length` rows from `start` (canvas px)."""
    a = np.asarray(img).copy()
    ramp = np.linspace(0, 1, length) if fade_in else np.linspace(1, 0, length)
    a[start:start + length, :, 3] = (a[start:start + length, :, 3] * ramp[:, None]).astype("uint8")
    if not fade_in:
        a[start + length:, :, 3] = 0
    return Image.fromarray(a, "RGBA")


def pillar_strip(card, spec):
    """A seamless vertical tile of one pillar: the clean shaft rows, mirrored so
    the tile's top and bottom match, with the inner edge fading out."""
    x0, x1 = (px(v) for v in spec["x"])
    s0, s1 = (px(v) for v in spec["solid"])
    y0, y1 = (px(v) for v in SHAFT_ROWS)
    piece = np.asarray(card.crop((x0, y0, x1, y1))).astype(np.float32)
    # even out the slow light/dark drift down the shaft so the repeats don't show
    # (keeps the fluting and the paper grain; removes the watercolour blotches)
    k = 81
    pad = np.pad(piece[..., :3], ((k // 2, k // 2), (0, 0), (0, 0)), mode="reflect")
    csum = np.cumsum(pad, axis=0)
    csum = np.concatenate([np.zeros_like(csum[:1]), csum], axis=0)
    trend = (csum[k:] - csum[:-k]) / k
    piece[..., :3] = piece[..., :3] - trend + trend.mean(axis=0, keepdims=True)
    piece = np.clip(piece, 0, 255).astype(np.uint8)
    tile = np.concatenate([piece, piece[::-1]], axis=0)
    w = x1 - x0
    alpha = np.ones(w)
    if s0 > x0:                                   # right pillar: fade towards the page centre (left)
        alpha[: s0 - x0] = np.linspace(0, 1, s0 - x0)
    if s1 < x1:                                   # left pillar: fade towards the centre (right)
        alpha[s1 - x0:] = np.linspace(1, 0, x1 - s1)
    tile[..., 3] = (tile[..., 3] * alpha[None, :]).astype("uint8")
    return Image.fromarray(tile, "RGBA")


def main():
    OUT.mkdir(exist_ok=True)

    # the card art (everything that never moves and sits under the text)
    card = Image.new("RGBA", (px(PAGE_W), px(PAGE_H)), (255, 255, 255, 255))
    for name, spec in [("background.png", BACKGROUND), ("top-wash.png", TOP_WASH),
                       ("curtain.png", CURTAIN_R), ("curtain.png", CURTAIN_L),
                       ("chandelier.png", CHANDELIER)]:
        card.alpha_composite(layer(name, spec))
    # Canva lays a faint paper grain over the whole card: bake it into the art
    card.alpha_composite(layer("texture.png", TEXTURE))

    # first page: from the top down to the pillars' middles, fading out
    top = card.crop((0, 0, px(PAGE_W), px(TOP_END)))
    top = fade_rows(top, px(TOP_END - TOP_FADE), px(TOP_FADE), fade_in=False)
    top.save(OUT / "top.webp", quality=86, method=6)

    # last page: grass, pillar bases and leaves, fading in at the top
    bottom = card.crop((0, px(BOTTOM_START), px(PAGE_W), px(PAGE_H)))
    bottom = fade_rows(bottom, 0, px(BOTTOM_FADE), fade_in=True)
    bottom.save(OUT / "bottom.webp", quality=86, method=6)

    # the pillars' shafts, repeated down both sides of the site
    pillar_strip(card, PILLAR_L).save(OUT / "pillar-left.webp", quality=88, method=6)
    pillar_strip(card, PILLAR_R).save(OUT / "pillar-right.webp", quality=88, method=6)

    # the cloth, cut to its own box (it hangs a little past the page edges)
    bx, by, bw, bh = CLOTH["box"]
    cloth = layer("cloth.png", dict(CLOTH, box=(bx, by, bw, bh)), canvas_size=(bw, bh), origin=(bx, by))
    cloth.save(OUT / "cloth.webp", quality=88, method=6)

    # the «و», cut to its box at 3x page resolution (it is small on screen)
    bx, by, bw, bh = WAW["box"]
    layer("waw.png", dict(WAW), scale=3, canvas_size=(bw, bh), origin=(bx, by)) \
        .save(OUT / "waw.webp", quality=90, method=6)

    # vectors: Canva draws them black and recolours them; bake the colour in
    for src, (dst, colour) in SVG_COLOURS.items():
        svg = (SRC / src).read_text(encoding="utf-8")
        svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg)
        svg = re.sub(r"<svg\b", f'<svg fill="{colour}"', svg, count=1)
        (OUT / dst).write_text(svg, encoding="utf-8")

    print("saved", ", ".join(sorted(p.name for p in OUT.iterdir() if p.is_file())))


if __name__ == "__main__":
    main()

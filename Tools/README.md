# Tools

Scripts used to make the site's images and check the page. None of them are
needed by the website itself.

| File | What it does |
|---|---|
| `design/build_from_canva.py` | Builds the site artwork from the Canva design's own layers in `design/canva/` → `assets/` (card art, cloth, paper grain, «و», flourish and icons) |
| `make-video.mjs` | Records the portrait 1080×1920 video of the site → `video/invitation-vN.mp4` (next free number) |
| `video/storyboard.js` | Scene order and timing: smoke opening → each marked part of the page alone → QR scene |
| `video/video-mode.css` | Look of the video: one fixed background with the strips, one scene at a time, fades |
| `cdp-shots.mjs` | Opens pages in headless Edge/Chrome and saves screenshots, following a plan file in `plans/` |
| `make_qr.py` | Creates the styled QR code SVG (rounded dots, rounded corner eyes, incense-burner emblem) |
| `verify_qr.py` | Confirms the QR images really scan (full size, shrunk, grayscale) and the background slot is empty |
| `og-image/og-source.html` | Design of the link-preview image (`og-image.jpg`, 1200×630) |
| `qr-card/card.html` | Design of the QR card (1500×2100). `?qr=0` hides the QR, `?src=` sets the QR image |
| `qr-card/qr-only.html` | Shows the QR alone, used for the transparent `qr-code.png` |
| `plans/*.json` | Step lists for `cdp-shots.mjs` (`og-image`, `qr-card`, `page-check`) |

## Requirements

- **Node.js 22+** (uses the built-in `WebSocket`)
- **Microsoft Edge or Google Chrome** (found automatically; or set `BROWSER=<path>`)
- **ffmpeg** on PATH (only for the video; or set `FFMPEG=<path>`)
- **Python 3** with the packages in `requirements.txt` (for the QR and artwork scripts)
- **Internet**, for the Google Fonts used in the designs

One-time Python setup, run from the project folder:

```bash
python -m venv Tools/.venv
```

```bash
Tools/.venv/Scripts/python -m pip install -r Tools/requirements.txt
```

(On macOS/Linux the Python path is `Tools/.venv/bin/python`.)

## Recipes

Run these from the project folder.

**Site artwork** → `assets/top.webp` (first page), `pillar-left.webp` /
`pillar-right.webp` (repeated down the sides), `bottom.webp` and `cloth.webp`
(last page), `waw.webp`, `flourish.svg`, `icon-*.svg`. Built from the layer files
saved from the Canva design in `design/canva/`. Re-run it if those files change:

```bash
Tools/.venv/Scripts/python Tools/design/build_from_canva.py
```

The layer positions at the top of the script are copied from the Canva document
(1080×1920 page), and so are the cut lines between the three pieces. The text on the card is not in these images: it is live text
placed with the same Canva boxes in `index.html`. `assets/curtain.svg` (the
opening's fabric) is hand-made. The self-hosted font in `assets/fonts/` (XB Shafigh,
for the verse) was converted from its free release with fontTools (`pyftsubset … --flavor=woff2`);
its licence is next to it.

**Video** → `video/invitation-vN.mp4` (1080×1920, 30 fps, no sound). Each run
saves the next version number (v3, v4, …) so earlier videos are kept. Re-run
it after any change to the site. Uses the local preview server on port 5173
by default:

```bash
node Tools/make-video.mjs
```

Or record the live site, or choose another output file:

```bash
node Tools/make-video.mjs --site https://khidir-amal.ahmedelnour.com --out video/final.mp4
```

How it works: the page opens in "video mode" — one fixed background with the
top and bottom strips — and each part of the page is shown alone, centred,
fading out before the next one fades in. It starts with the smoke opening
(no tap hint) and ends on a QR scene built from `qr/qr-code.svg`, the names
in `config.js` and the address in the page's canonical link.

The scenes are chosen in `index.html` with these attributes (they have no
effect on the website itself):

| Attribute | Meaning |
|---|---|
| `data-video-scene="name"` | Show this element alone as one scene. Scenes play in page order. |
| `data-video-hold="4000"` | How long the scene stays on screen, in milliseconds (default 4000). |
| `data-video-hide` | Hide this element in the video (the buttons, the tap hint). |

So to drop a part from the video, remove its `data-video-scene`; to add a new
section, give it one. The opening, smoke, fade and QR timings are at the top
of `video/storyboard.js`. A scene that is too tall for the screen is shrunk to
fit, and the names in the QR scene are lined up by the middle of their letters.

Rendering takes about 3 minutes: the page clock is advanced one frame at a
time and each frame is a full-resolution screenshot, so the result is smooth
and sharp on any computer.

**Link-preview image** → `og-image.jpg` (edit `og-image/og-source.html` first if needed):

```bash
node Tools/cdp-shots.mjs . Tools/plans/og-image.json
```

**QR code and card** → `qr/` (change the URL if the site moves):

```bash
Tools/.venv/Scripts/python Tools/make_qr.py https://khidir-amal.ahmedelnour.com/ qr/qr-code.svg
```

```bash
node Tools/cdp-shots.mjs qr Tools/plans/qr-card.json
```

```bash
Tools/.venv/Scripts/python Tools/verify_qr.py qr https://khidir-amal.ahmedelnour.com/
```

**Check the site on a phone-sized screen** → screenshots in `Tools/out/`
(needs the local preview server on port 5173, or set `SITE=https://khidir-amal.ahmedelnour.com`):

```bash
node Tools/cdp-shots.mjs Tools/out Tools/plans/page-check.json
```

## Notes

- In plan files, `{TOOLS}`, `{PROJECT}` and `{SITE}` are filled in automatically.
- The QR slot on the card is at **x = 440, y = 670, 620 × 620 px** (see `qr/README.md`).
- If the names change, update the text in `og-image/og-source.html` and
  `qr-card/card.html`, then re-run the recipes above.

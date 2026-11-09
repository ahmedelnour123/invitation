# Tools

Scripts used to make the site's images and check the page. None of them are
needed by the website itself.

| File | What it does |
|---|---|
| `design/build_from_canva.py` | Builds the site artwork from the Canva design's own layers in `design/canva/` → `assets/` (card art, cloth, paper grain, «و», flourish and icons) |
| `make-audio.mjs` | Turns any audio/video file into the site's background music → `assets/audio/NAME.webm` (Opus) + `NAME.m4a` (AAC) |
| `make-video.mjs` | Records the portrait 1080×1920 video of the site → `video/invitation-vN.mp4` (next free number) |
| `video/storyboard.js` | The video's animation and timing: decorations drawing in → cover text line by line → change to the grass and cloth → details line by line → QR |
| `video/video-mode.css` | Look of the video: the cover's pieces, the second page's frame, the details and QR pages |
| `video/layers/` | The cover's art in separate pieces (flowers, curtains, chandelier, paper grain) for the video's opening |
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

**Background music** → `assets/audio/NAME.webm` + `NAME.m4a`. Give it any
audio or video file; it drops the video, trims silence at both ends, brings the
loudness down to a gentle background level (-18 LUFS, so it isn't loud on
iPhones, where a page can't lower the volume) and fades the ends so the loop is
smooth. Opus is the smallest music format on the web; AAC is the fallback for
iPhones that can't play it. The page lists both and each phone loads one:

```bash
node Tools/make-audio.mjs path/to/song.mp3
```

Then set `music.src` in `config.js` to the printed path (without the
extension). Options: `--name`, `--start`/`--end` (seconds, to use part of a
song), `--loudness -20` (quieter), `--mono` (about half the size), `--fade 0`.
The music plays only on the link with `?m` (e.g. `https://khidir-amal.ahmedelnour.com/?m`);
the plain link is silent, with no music button and no audio download.

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

How it works: the page opens in "video mode" and plays like a classic
animated invitation, in four parts:

1. **Cover** — on plain paper the flowers bleed in from the top corners like
   watercolour, the curtains slide in, the chandelier lowers and swings to
   rest, the pillars draw down; then the verse, the opening words, the names
   and the date appear one line at a time, and the page holds.
2. **Change** — the text fades, the chandelier lifts away, the curtains slide
   out; the pillars run the full height and the grass and cloth bleed in.
3. **Details** — the host families, the invitation, the couple, then the date,
   time and venue (each with its icon) and the closing words, line by line.
4. **QR** — the names and the QR code from `qr/qr-code.svg`, with the address
   from the page's canonical link.

All the text comes from the page itself (so from `config.js`); nothing in
`index.html` needs changing. The timings are at the top of
`video/storyboard.js`. The cover's decoration pieces are in `video/layers/`
(made by `design/build_from_canva.py` along with the site's art). The details
page shrinks to fit if the text gets longer. The countdown and the map are
left out.

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

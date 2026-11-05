# Tools

Scripts used to make the site's images and check the page. None of them are
needed by the website itself.

| File | What it does |
|---|---|
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
- **Python 3** with the packages in `requirements.txt` (only for the QR scripts)
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

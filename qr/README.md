# QR card

| File | What it is |
|---|---|
| `qr-card.png` | Finished card (background + QR), 1500 × 2100 px — 5×7 in at 300 dpi |
| `qr-background.png` | The card with an **empty** cream slot, for placing a new QR |
| `qr-code.svg` | The QR code alone, vector, transparent background, no margin |
| `qr-code.png` | The QR code alone, 1200 × 1200 px, transparent background, no margin |

QR content: `https://khidir-amal.ahmedelnour.com/` (error correction H, version 5).

## Replacing the QR

Place the new QR on `qr-background.png` inside this square:

- **x = 440 px, y = 670 px** (from the top-left corner)
- **size = 620 × 620 px**

Use a QR **without** its own white margin; the cream panel around the slot
already provides the quiet zone. Keep the modules dark (the slot is cream
`#FBF6EC`) — light-on-dark QR codes don't scan on many phones.

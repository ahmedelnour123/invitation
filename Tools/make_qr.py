"""Builds the styled QR code SVG (rounded burgundy dots, rounded corner eyes,
mabkhara emblem in the centre; transparent background, no quiet zone).
usage: python Tools/make_qr.py <url> <out.svg>
   e.g. python Tools/make_qr.py https://khidir-amal.ahmedelnour.com/ qr/qr-code.svg
"""
import sys
import segno
from segno import consts

url, out = sys.argv[1], sys.argv[2]
qr = segno.make(url, error="h", micro=False, boost_error=False)
print("version", qr.version, "error", qr.error, "size", qr.symbol_size(border=0))

rows = [list(r) for r in qr.matrix_iter(scale=1, border=0, verbose=True)]
n = len(rows)
M = 10                      # module size in SVG units
DOT = "#3A1219"             # data modules
EYE = "#5C1620"             # finder / alignment
GOLD = "#B88A3E"

FINDER = {consts.TYPE_FINDER_PATTERN_DARK, consts.TYPE_FINDER_PATTERN_LIGHT, consts.TYPE_SEPARATOR}
ALIGN = {consts.TYPE_ALIGNMENT_PATTERN_DARK, consts.TYPE_ALIGNMENT_PATTERN_LIGHT}

def dark(t):
    return t in (consts.TYPE_FINDER_PATTERN_DARK, consts.TYPE_ALIGNMENT_PATTERN_DARK,
                 consts.TYPE_TIMING_DARK, consts.TYPE_FORMAT_DARK, consts.TYPE_VERSION_DARK,
                 consts.TYPE_DATA_DARK, consts.TYPE_DARKMODULE)

# centre emblem: keep a clear circle of modules free
c = n / 2
EMBLEM_R = 4.6              # in modules
def in_emblem(x, y):
    return ((x + .5 - c) ** 2 + (y + .5 - c) ** 2) ** .5 < EMBLEM_R + .35

parts = []
# data / timing / format modules as rounded dots
for y, row in enumerate(rows):
    for x, t in enumerate(row):
        if t in FINDER or t in ALIGN or not dark(t) or in_emblem(x, y):
            continue
        parts.append(f'<circle cx="{x*M+M/2}" cy="{y*M+M/2}" r="{M*0.46:.2f}"/>')
dots = f'<g fill="{DOT}">' + "".join(parts) + "</g>"

# finder patterns (rounded)
eyes = []
for fx, fy in [(0, 0), (n - 7, 0), (0, n - 7)]:
    X, Y = fx * M, fy * M
    eyes.append(f'<rect x="{X+M/2}" y="{Y+M/2}" width="{6*M}" height="{6*M}" rx="{1.9*M}" fill="none" stroke="{EYE}" stroke-width="{M}"/>')
    eyes.append(f'<rect x="{X+2*M}" y="{Y+2*M}" width="{3*M}" height="{3*M}" rx="{0.95*M}" fill="{EYE}"/>')

# alignment patterns: centre = alignment-dark module with light orthogonal neighbours
for y in range(1, n - 1):
    for x in range(1, n - 1):
        if rows[y][x] == consts.TYPE_ALIGNMENT_PATTERN_DARK and all(
            rows[y + dy][x + dx] == consts.TYPE_ALIGNMENT_PATTERN_LIGHT for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]
        ):
            cx, cy = x * M + M / 2, y * M + M / 2
            eyes.append(f'<rect x="{cx-2*M}" y="{cy-2*M}" width="{4*M}" height="{4*M}" rx="{1.3*M}" fill="none" stroke="{EYE}" stroke-width="{M}"/>')
            eyes.append(f'<circle cx="{cx}" cy="{cy}" r="{M*0.55}" fill="{EYE}"/>')

# emblem: cream disc, gold ring, mabkhara
R = EMBLEM_R * M
C = c * M
emblem = f'''
<g>
  <circle cx="{C}" cy="{C}" r="{R}" fill="#FBF6EC"/>
  <circle cx="{C}" cy="{C}" r="{R - 3}" fill="none" stroke="{GOLD}" stroke-width="2.2"/>
  <circle cx="{C}" cy="{C}" r="{R - 7}" fill="none" stroke="{GOLD}" stroke-width=".8" stroke-dasharray="2 3"/>
  <g transform="translate({C - 21} {C - 17}) scale(.42)">
    <path d="M50 -6 C 40 -20, 60 -30, 48 -44" stroke="{GOLD}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="50" cy="13" rx="22" ry="5" fill="#E0662A"/>
    <ellipse cx="50" cy="12" rx="13" ry="3" fill="#F2B14C"/>
    <path d="M18 14 H82 Q80 41 50 45 Q20 41 18 14Z" fill="#6B3324"/>
    <ellipse cx="50" cy="14" rx="32" ry="4.5" fill="none" stroke="#4A2117" stroke-width="3"/>
    <path d="M26 22 L32 28 L38 22 L44 28 L50 22 L56 28 L62 22 L68 28 L74 22" stroke="#D9BE86" stroke-width="2.2" fill="none"/>
    <rect x="44" y="44" width="12" height="20" fill="#5B2B1E"/>
    <path d="M26 82 Q50 56 74 82Z" fill="#6B3324"/>
    <rect x="22" y="80" width="56" height="6" rx="3" fill="#4A2117"/>
  </g>
</g>'''

size = n * M
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size*3}" height="{size*3}">'
       f'<title>QR: {url}</title>{dots}{"".join(eyes)}{emblem}</svg>')
open(out, "w", encoding="utf-8").write(svg)
print("wrote", out, "modules", n)

"""Checks that the QR images really scan (full size, shrunk, grayscale) and that
the background's slot is empty.
usage: python Tools/verify_qr.py <qr folder> [expected URL]
"""
import sys
from PIL import Image
import zxingcpp

d = sys.argv[1]
EXPECTED = sys.argv[2] if len(sys.argv) > 2 else "https://khidir-amal.ahmedelnour.com/"

def decode(img):
    res = zxingcpp.read_barcodes(img)
    return [r.text for r in res if r.format == zxingcpp.BarcodeFormat.QRCode]

def check(label, img):
    texts = decode(img)
    ok = EXPECTED in texts
    print(f"{'OK  ' if ok else 'FAIL'} {label:<38} {texts}")
    return ok

card = Image.open(f"{d}/qr-card.png").convert("RGB")
qr = Image.open(f"{d}/qr-code.png")
qr_on_white = Image.new("RGB", (qr.width + 200, qr.height + 200), "white")
qr_on_white.paste(qr, (100, 100), qr)
qr_on_cream = Image.new("RGB", qr_on_white.size, (251, 246, 236))
qr_on_cream.paste(qr, (100, 100), qr)

results = [
    check("card, full size 1500x2100", card),
    check("card at 40% (600x840)", card.resize((600, 840), Image.LANCZOS)),
    check("card at 22% (330x462)", card.resize((330, 462), Image.LANCZOS)),
    check("card, grayscale", card.convert("L")),
    check("QR png on white", qr_on_white),
    check("QR png on cream", qr_on_cream),
    check("QR png on cream at 20%", qr_on_cream.resize((280, 280), Image.LANCZOS)),
]

bg = Image.open(f"{d}/qr-background.png").convert("RGB")
slot_center = bg.getpixel((440 + 310, 670 + 310))
print("background slot centre pixel:", slot_center, "| decodes as QR:", decode(bg) or "nothing (empty slot)")
print("background size:", bg.size, "| card size:", card.size, "| QR png:", qr.size, qr.mode)
print("ALL PASS" if all(results) else "SOME FAILED")
sys.exit(0 if all(results) else 1)

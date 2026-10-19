"""عيّن ألوان خلايا كليشة المعلم من لقطة الشاشة المرجعية."""

import sys
from PIL import Image

PATHS = [
    r"C:\Users\User\Pictures\Screenshots\Screenshot 2026-10-15 190505.png",
]

# نطلب من المستخدم لصق مسار اللقطة الأحدث
if len(sys.argv) > 1:
    PATHS = sys.argv[1:]

for path in PATHS:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    print(f"\n{path}  ({w}×{h})")
    # شبكة عيّنة — نطبع الألوان المتكرّرة فقط
    from collections import Counter
    cnt = Counter()
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            cnt[im.getpixel((x, y))] += 1
    for (r, g, b), n in cnt.most_common(14):
        print(f"  #{r:02X}{g:02X}{b:02X}  rgb({r},{g},{b})  ×{n}")
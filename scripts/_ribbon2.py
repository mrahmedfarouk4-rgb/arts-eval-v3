"""
استخراج الشريط الزخرفي من الكليشة الرسمية — صفّاً بصفّ بلا خلط ألوان.

ثلاثة أخطاء وقعت في المحاولات الأولى، وهي مكتوبة هنا لتتكرّر:
  1. اختبار «التشبّع» وحده يُسقط الشرائط الداكنة (`#0E2636`) وهي جزء
     من التصميم لا فواصل — فنستخدم «ليس أبيض».
  2. أخذ لون الشريط الرفيع من منتصفه يخرج لوناً مخلوطاً — فنقرأ كل صف.
  3. القياس بغير التشبّع يلتقط الإطار الأسود للصفحة — فنقيس بالعرض فقط.
"""

import json
from collections import Counter

from PIL import Image

SRC = "assets/print/_ref/sheet_pdf.png"
im = Image.open(SRC).convert("RGB")
W, H = im.size
px = im.load()
MMY = 297.0 / H
MMX = 210.0 / W


def white(c):
    return c[0] > 238 and c[1] > 238 and c[2] > 238


def sat(c):
    return max(c) - min(c) > 20 and max(c) > 75


# ١) العرض الحقيقي — بأطول مقطع مشبع يبدأ من الحافة
run_w = []
for y in range(H):
    x = 0
    while x < 90 and sat(px[x, y]):
        x += 1
    run_w.append(x)
REAL_W = Counter([w for w in run_w if w]).most_common(1)[0][0]

# ٢) المدى الرأسي
span = [y for y in range(H) if run_w[y] >= REAL_W * 0.6]
TOP, BOT = span[0], span[-1]
print(f"{SRC}  {W}×{H}")
print(f"العرض {REAL_W}px = {round(REAL_W * MMX, 2)}مم · المدى y={TOP}..{BOT} "
      f"= {round((BOT - TOP + 1) * MMY, 2)}مم "
      f"({round(TOP / H * 100, 1)}%..{round(BOT / H * 100, 1)}%)")


def row_color(y):
    """
    لون الصف — وسيط أول ١٠ أعمدة (داخل القطعة دائماً، لأن حافتها مائلة).
    """
    xs = [x for x in range(0, 10) if not white(px[x, y])]
    if len(xs) < 7:
        return None
    samples = [px[x, y] for x in xs]
    n = len(samples)
    return tuple(sorted(s[j] for s in samples)[n // 2] for j in range(3))


rows = [row_color(y) for y in range(TOP, BOT + 1)]

# ٣) تجميع المتشابه — بهامش ٧ في كل قناة
segs, start, cur = [], None, None
for k, c in enumerate(rows):
    y = TOP + k
    if c is None:
        if start is not None:
            segs.append([start, y - 1, cur])
            start = None
        continue
    if start is None:
        start, cur = y, c
    elif max(abs(c[j] - cur[j]) for j in range(3)) <= 7:
        cur = tuple((cur[j] + c[j]) // 2 for j in range(3))
    else:
        segs.append([start, y - 1, cur])
        start, cur = y, c
if start is not None:
    segs.append([start, BOT, cur])

# ٤) صقل: احذف الشظايا ≤ ١ بكسل، وادمج ما يتجاور بفاصل ≤ ١ بكسل
tiny = [(a, b, c) for a, b, c in segs if b - a + 1 >= 2]
clean = []
for a, b, c in tiny:
    if clean and a - clean[-1][1] <= 1:
        clean[-1][1] = b
    else:
        clean.append([a, b, c])
segs = clean

print(f"عدد الشرائط: {len(segs)}")
# ٤) لكل شريط: لونُه الحقيقي (الأكثر تكراراً) والعرض الحقيقي لصفوفه —
#    لا متوسط متحرّك، فهو يخلط لون الشريط الرفيع بما يجاوره.
from collections import Counter as _C


def row_width(y):
    """
    العرض الفعلي لهذا الصف — أطول مقطع متّصل غير أبيض من الحافة.

    نحدّه عند REAL_W + ١٢ حتى لا يبتلعه الإطار الأسود للصفحة، فنقرأ
    الحافة اليمنى لكل قطعة على حقيقتها (وهي غير مستقيمة في الأصل).
    """
    x = 0
    limit = REAL_W + 12
    while x < limit and not white(px[x, y]):
        x += 1
    return min(x, REAL_W + 6)


out, prev = [], None
for a, b, c in segs:
    mode = _C(rows[a - TOP : b - TOP + 1]).most_common(1)[0][0]
    out.append(
        {
            "h": b - a + 1,
            "w": round(max(row_width(y) for y in range(a, b + 1)) * MMX, 2),
            "c": "#%02X%02X%02X" % mode,
            "g": (a - prev - 1) if prev is not None else 0,
        }
    )
    prev = b

print(f"عدد الشرائط: {len(out)}")
for i, s in enumerate(out, 1):
    g = f"gap={s['g']}" if s["g"] else ""
    print(f"  {i:2d}. {s['h']:3d}px ({s['h'] * MMY:5.2f}مم) w={s['w']:4.2f}مم  {s['c']}  {g}")

json.dump(out, open("assets/print/_ref/ribbon.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

crop = im.crop((0, TOP - 4, REAL_W + 2, BOT + 5))
crop.resize((crop.width * 5, crop.height), Image.NEAREST).save(
    "assets/print/_ref/ribbon_official.png"
)
print("\nمعاينة ×5 → assets/print/_ref/ribbon_official.png")



"""
يولّد ثابت RIBBON في lib/print-html.ts من استخراج الكليشة الرسمية.

المصدر: `_preview/media_image1.png` — صورة كليشة «أساسيات الرسم وحدة 1 -
مفرغ» بدقة 220dpi، ومنها شريط مربعات الألوان على الحافة اليسرى.

لماذا نرسمه CSS لا <img>:
  الشريط في الأصل نقطيّ (٤٤ بكسل عرضاً)، ولو صُغِّر كصورة لخرج مموّهاً عند
  الطباعة. أما المقاطع المرسومة كمستطيلات فيبقى كل حدّ حاداً على أي طابعة.

    python scripts/_ribbon2.py     ← استخراج من الكليشة → _preview/ribbon.json
    python scripts/gen_ribbon.py    ← ribbon.json → الثابت في print-html.ts
"""

import json
import re
from pathlib import Path

SEG = json.loads(Path("assets/print/_ref/ribbon.json").read_text(encoding="utf-8"))

# شريط بسمك ٣ بكسلات أو أقل (٠٫٣ مم) حدٌّ بين两块تين لا قطعة — نطويه فاصلاً.
# تركه يُظهر ألواناً انتقالية مخلوطة تلفت النظر في الطباعة.
_clean, _pending = [], 0
for s in SEG:
    if s["h"] <= 3:
        _pending += s["h"] + s.get("g", 0)
        continue
    _clean.append(dict(s, g=s.get("g", 0) + _pending))
    _pending = 0
SEG = _clean

# h و g بالبكسل (لتناسب الأوزان النسبية) · w بالمليمتر (كما يقيسه المستخرِج)
PX = 297.0 / 3508  # مم لكل بكسل عمودياً في صورة 2481×3508
FULL_H = round(sum(s["h"] + s["g"] for s in SEG) * PX, 2)
FULL_W = round(max(s["w"] for s in SEG), 2)

lines = []
for s in SEG:
    g = f", g: {s['g']}" if s["g"] else ""
    lines.append(f"  {{ h: {s['h']}, w: {s['w']}, c: '{s['c']}'{g} }},\n")

block = (
    "/**\n"
    " * الشريط الزخرفي — مقاطع **مستخرجة من الكليشة الرسمية**\n"
    " * (`أساسيات الرسم وحدة 1 - مفرغ`) لا مرسومة بالتخمين ولا بالنظر.\n"
    " *\n"
    f" * الأبعاد المقيسة: {FULL_W}مم عرضاً × {FULL_H}مم ارتفاعاً، على حافة اليسار.\n"
    " *\n"
    " * نرسمه مستطيلات CSS لا صورةً: الأصل نقطّي ضيّق، ولو صُغِّر كصورة\n"
    " * لخرج مموّهاً، أما المرسوم فيبقى كل حدّ فيه حادّاً على أي طابعة.\n"
    " *\n"
    " * ‏h = ارتفاع القطعة (بكسل الأصل) · w = عرضها بالمليمتر\n"
    " * ‏g = الفاصل الأبيض فوقها (بكسل الأصل)\n"
    " */\n"
    "const RIBBON: { h: number; w: number; c: string; g?: number }[] = [\n"
    + "".join(lines)
    + "];\n"
    "\n/** أبعاد الشريط بالمليمتر كما في الكليشة */\n"
    f"const RIBBON_W = {FULL_W};\n"
    f"const RIBBON_H = {FULL_H};\n"
)

DST = Path("lib/print-html.ts")
raw = DST.read_text(encoding="utf-8")
nl = "\r\n" if "\r\n" in raw else "\n"
src = raw.replace("\r\n", "\n")

pattern = re.compile(
    r"/\*\*\n \* الشريط الزخرفي[\s\S]*?const RIBBON_H = [\d.]+;\n(\s*/\*\* أبعاد[^\n]*\nconst RIBBON_W = [\d.]+;\nconst RIBBON_H = [\d.]+;\n)?",
)
if pattern.search(src):
    src = pattern.sub(block, src, count=1)
else:
    raise SystemExit("لم يُعثر على الثابت RIBBON في lib/print-html.ts")

DST.write_text(src.replace("\n", nl), encoding="utf-8")
print(f"✓ {len(SEG)} قطعة · {FULL_W}مم × {FULL_H}مم · كُتب في {DST}")

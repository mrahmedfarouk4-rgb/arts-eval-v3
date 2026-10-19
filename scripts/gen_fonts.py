"""
يبني خطَّ «سكال مجلّة» (Sakkal Majalla) مضمّناً للطباعة.

لماذا نضمّنه؟ التطبيق يطبع داخل الجهاز عبر expo-print، وجهاز Android لا
يحوي خط Office هذا — فنصيّر الورقة بخطٍّ مختلف عن الكليشة. تضمينه Base64
يجعلها مطابقة على أي جهاز: هاتف أو حاسوب.

الخَطُّ مستخرَج من ملف Word الرسمي على هذا الجهاز، ومقتطعٌ إلى المحارف
المستعملة في الاستمارات فقط (عربي + أرقام + لاتيني أساسي) ليصغُ حجمه
من ٨٤٠ كيلوبايت إلى أقل من ١٥٠.

    python scripts/gen_fonts.py
"""

import base64
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

# محارف عربية كاملة + أرقام + لاتيني + رموز استماراتنا
ARABIC = (
    "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي"
    "٠١٢٣٤٥٦٧٨٩"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    " .,:;/\\-+×÷=()[]{}<>%#@&*'\"_|~"
    "✓☐·—–…«»؟!٫،؛ـ"
)

# روابط المحارف: الهمزات والتشكيل يتغيّر موضعها حسب ما قبلها
UNICODES = ",".join(f"U+{ord(ch):04X}" for ch in ARABIC) + (
    ",U+FE70,U+FE71,U+FE72,U+FE73,U+FE74,U+FE75,U+FE76,U+FE77,U+FE78"
    ",U+FE79,U+FE7A,U+FE7B,U+FE7C,U+FE7D,U+FE7E,U+FE7F,U+0640,U+200C,U+200D"
    ",U+200E,U+200F,U+064B,U+064C,U+064D,U+064E,U+064F,U+0650,U+0651,U+0652"
)

OUT = Path("lib/print-fonts.ts")

SRC = {
    "regular": Path(r"C:\Windows\Fonts\majalla.ttf"),
    "bold": Path(r"C:\Windows\Fonts\majallab.ttf"),
}

parts = []
for name, src in SRC.items():
    if not src.exists():
        raise SystemExit(f"الخط غير موجود: {src}")

    font = TTFont(str(src))
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables += ["FFTM"]
    opts.layout_closure = False
    opts.glyph_names = False
    opts.legacy_kern = False
    opts.hinting = True

    sub = subset.Subsetter(options=opts)
    sub.populate(text=ARABIC)
    sub.populate(unicodes=[int(u[2:], 16) for u in UNICODES.split(",")])
    sub.subset(font)

    tmp = Path("_preview") / f"majalla-{name}.ttf"
    tmp.parent.mkdir(exist_ok=True)
    font.flavor = None
    font.save(str(tmp))

    data = base64.b64encode(tmp.read_bytes()).decode("ascii")
    parts.append((name, len(tmp.read_bytes()), data))
    print(f"  {name:8s} {src.stat().st_size:>7,} → {len(tmp.read_bytes()):>7,} بايت "
          f"→ {len(data):>7,} base64")

# نكتبها على أسطر حتى لا يطول السطر في المحرّر
block = ["/**\n"
         " * خطوط مضمّنة Base64 — تُطبع على أي جهاز بنفس شكل الكليشة.\n"
         " *\n"
         " * «سكال مجلّة» هو خط الاستمارات الرسمية في وثائق وزارة الثقافة،\n"
         " * وجهاز Android لا يحويه. تضمينه يجعل الطباعة من الجوال مطابقة\n"
         " * للطباعة من الحاسوب وللورقة الأصلية.\n"
         " *\n"
         " * مقتطع إلى محارف الاستمارات فقط (عربي + أرقام + لاتيني أساسي)،\n"
         " * فينزل من ٨٤٠ كيلوبايت إلى ما دون ١٥٠.\n"
         " *\n"
         " * المصدر: scripts/gen_fonts.py\n"
         " */\n"]

for name, size, data in parts:
    block.append(f"/** {name} — {size:,} بايت */\n")
    block.append(f"export const MAJALLA_{name.upper()}_DATA =\n")
    for i in range(0, len(data), 100):
        block.append(f"  '{data[i:i+100]}'\n")
    block.append(";\n\n")

OUT.write_text("".join(block), encoding="utf-8")
total = sum(len(d) for _, _, d in parts)
print(f"\n✓ كُتب {OUT.name} — {total:,} حرف base64 "
      f"({OUT.stat().st_size:,} بايت على القرص)")
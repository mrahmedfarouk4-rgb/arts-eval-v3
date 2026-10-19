"""
تمييز هوية النسخة المنفصلة — recolor أيقونات النسخة فقط.
===========================================================================
لماذا: `arts-eval-v2-copy` تطبيق مستقل يُثبَّت **جنب الأصل** على الهاتف،
فلولا تمييز الأيقونة لبانا المستخدم أيّهما فتح. فبدّلنا لون شعار الأكاديمية
من teal إلى عنّابي — وهو نفسه لون شريط «مستوى أداء المهارات» في الكليشة.

لا يلمس هذا الملف النسخة الأصلية إطلاقاً؛ يعمل داخل `arts-eval-v2-copy` فقط.

الألوان:
    الشعار   #014646 → #7B2D42
    الإطار   #A1D6CA → #E8B7BF
    الخلفية  تدرّج teal → تدرّج عنّابي (إزاحة hue 164°)

التشغيل: python scripts/rebrand-icon.py
"""

from PIL import Image
from colorsys import rgb_to_hsv, hsv_to_rgb
import os
import sys

EMBLEM_FROM = (0x01, 0x46, 0x46)
EMBLEM_TO = (0x7B, 0x2D, 0x42)
BORDER_FROM = (0xA1, 0xD6, 0xCA)
BORDER_TO = (0xE8, 0xB7, 0xBF)
HUE_SHIFT = 164 / 360  # teal ≈ 180° → maroon ≈ 344°

IMAGES = os.path.join("assets", "images")


def blend(a, b, t):
    """مزيج خطي بين لونين — t من 0 إلى 1"""
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def remap_two_color(im, pairs):
    """
    يعيد تلوين صورة ثنائية اللون مع حفظ تنعيم الحواف.

    كل بكسلlies على المستقيم بين لون الخلفية ولون الرسم، فنقيس موضعه
    على المستقيم ونضعه على المستقيم الجديد — فيبقى الحافة متدرّجة تماماً
    كما رسمها المصمّم.
    """
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            for src, dst in pairs:
                # أقرب مسافة للون المصدر
                d = (r - src[0]) ** 2 + (g - src[1]) ** 2 + (b - src[2]) ** 2
                if d <= 25 * 25:
                    px[x, y] = (*dst, a)
                    break
    return im


def remap_blend(im, src, dst, bg):
    """
    يعيد تلوين الأجزاء الممتزجة بين `src` ولون الخلفية `bg`.
    يقيس موضع البكسل على المستقيم bg→src ويضعه على bg→dst.
    """
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            num = sum((v - bg[i]) * (src[i] - bg[i]) for i, v in enumerate((r, g, b)))
            den = sum((src[i] - bg[i]) ** 2 for i in range(3)) or 1
            t = max(0.0, min(1.0, num / den))
            if t > 0.04:
                px[x, y] = (*blend(bg, dst, t), a)
    return im


def hue_shift(im, shift):
    """إزاحة تدرّج الل hue مع حفظ الإضاءة والتشبّع — الخلفية المتدرّجة"""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            hh, ss, vv = rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss > 0.01:
                hh = (hh + shift) % 1.0
                nr, ng, nb = hsv_to_rgb(hh, ss, vv)
                px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return im


def load(name):
    im = Image.open(os.path.join(IMAGES, name)).convert("RGBA")
    return im


def save(im, name):
    im.save(os.path.join(IMAGES, name))
    print(f"  ✓ {name}  {im.size[0]}×{im.size[1]}")


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    print(f"إعادة تلوين الأيقونات في: {root}")

    # الخلفية الفاتحة — رمز التطبيق والـ favicon وشاشة البداية
    for name, bg in (("icon.png", (0xF7, 0xFA, 0xFA)), ("favicon.png", (0xF7, 0xFA, 0xFA))):
        save(remap_blend(load(name), EMBLEM_FROM, EMBLEM_TO, bg), name)

    save(remap_blend(load("splash-icon.png"), EMBLEM_FROM, EMBLEM_TO, (255, 255, 255)),
         "splash-icon.png")

    # الأيقونة الأساسية فيها إطار فيزيائي مربّع بحواف مستديرة
    save(remap_two_color(load("icon.png"),
                         [(BORDER_FROM, BORDER_TO)]), "icon.png")

    # Adaptive icon — foreground على أبيض، background متدرّج داكن
    save(remap_blend(load("android-icon-foreground.png"),
                     EMBLEM_FROM, EMBLEM_TO, (255, 255, 255)),
         "android-icon-foreground.png")
    save(hue_shift(load("android-icon-background.png"), HUE_SHIFT),
         "android-icon-background.png")
    # monochrome صورة ظلّ سوداء واحدة — يتلوّنها النظام، تُترك كما هي

    print("تمّ.")


if __name__ == "__main__":
    sys.exit(main())
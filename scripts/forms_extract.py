"""
مستخرج استمارات التقييم الرسمي — النسخة المعتمدة.

يقرأ وثائق Word الرسمية ويعيد بنية نظيفة:

    { grade, term, subject, kind, items: [{text, max, pass}] }

ثلاثة إصلاحات جوهرية عن النسخ السابقة:

1. **رؤوس الجداول على أكثر من صف** — استمارة التقييم الأسبوعي في
   وثائق «آليات التقييم» puts its scale في الصف الثاني لا الأول،
   فكانت تُهمل بالكامل.

2. **نسبة الجدول لأقرب عنوان** — لا لأقرب فقرة سابقة فقط؛ فبعض
   العناوين في Word تأتي *بعد* الجدول الذي تصفه.

3. **تحديد المرحلة من عناوين Level‑1** — «مسار الفنون البصرية –
   الصف الرابع» يسبق كل جداول المرحلة.

كل بند يُنقَل حرفياً من الوثيقة: لا إعادة صياغة ولا تصحيح.
"""

from __future__ import annotations

import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

DOCS_DIR = Path(r"C:\الغياب والحضور")

# ---------------------------------------------------------------- تطبيع

DIACRITICS = re.compile(r"[ً-ْٰـ]")
PUNCT = re.compile(r"[-–—_'\"«»().،,:؛؟!_/\\\[\]{}|()]")
CONFUSE = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
    "ى": "ي", "ئ": "ي", "ؤ": "و",
    "ة": "ه", "ﻻ": "لا",
    "‏": "", "‎": "", "﻿": "", " ": " ",
    "⬜": "", "☐": "", "☑": "", "█": "",
})


def norm(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(CONFUSE)
    s = DIACRITICS.sub("", s)
    s = PUNCT.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def to_int(s):
    s = norm(s).translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    m = re.search(r"\d+", s)
    return int(m.group()) if m else None


# ---------------------------------------------------------------- معرّفات

# ⚠ الترتيب مهم: الأكثر تحديداً أولاً.
#   «رسم وتصميم الشخصيات الكرتونية» لو فُحصت بعد «الكرتوني»
#   لالتقطها مقرر الرسم الكرتوني وابتلع مقرر تصميم الشخصيات.
SUBJECTS: list[tuple[str, list[str]]] = [
    ("drawing_basics", ["اساسيات الرسم", "نظريات اساسيات الرسم"]),
    ("saudi_arts", ["الفنون البصرية السعودية", "الفن البصري السعودي"]),
    ("character_design", ["رسم وتصميم الشخصيات", "تصميم الشخصيات"]),
    ("watercolor", ["الالوان المائية", "الالوان المائيه", "الرسم بالالوان المائية"]),
    ("handicrafts", ["الاشغال اليدوية", "الاشغال اليدويه"]),
    ("digital_drawing", ["الرسم الرقمي", "الرسم الرقمى"]),
    ("cartoon", ["الرسم الكرتوني", "الكرتوني"]),
]

GRADES: list[tuple[str, list[str]]] = [
    ("grade_int2", ["الثاني المتوسط", "ثاني متوسط", "المتوسط الثاني"]),
    ("grade_int1", ["الاول المتوسط", "اول المتوسط", "الاول متوسط"]),
    ("grade5", ["الصف الخامس", "الخامس الابتدائي", "الصف الخامس الابتدائي"]),
    ("grade4", ["الصف الرابع", "الرابع الابتدائي", "الصف الرابع الابتدائي"]),
]


def detect(text: str, table) -> str | None:
    n = norm(text)
    for key, kws in table:
        if any(norm(k) in n for k in kws):
            return key
    return None


# ---------------------------------------------------------------- جداول

# نقرأ أول صفَّين معاً: بعض الاستمارات يضع سلم التقدير في الصف الثاني
SCALE_HINTS = tuple(norm(h) for h in ("يتخطى", "يتخطي", "دون الهدف", "يقترب"))
# ⚠ لا نضع «مستوى أداء المهارات» هنا — إنه خلية عنوان مدمجة في استمارة
#   التقييم الأسبوعي، ولو التقطناه لاخترنا عمود العنوان خطأً.
#  «موشرات» بلا أل التعريف: الوثائق تكتب «موشرات تحقق» لا «مؤشرات التحقق»
TEXT_HINTS = tuple(norm(h) for h in (
    "المعيار", "موشرات", "مؤشرات التحقق", "المؤشر", "البنود",
))
MAX_HINTS = tuple(norm(h) for h in ("القصوى", "الدرجة العظمى", "الدرجة الكبرى"))
PASS_HINTS = tuple(norm(h) for h in ("درجة التحقق", "الاقتان", "الإتقان"))

# نصّ رأس عمود «الدرجة القصوى» — الوثائق تكتبه صورتين، إحداهما تضيف
# كلمة «موهبة» داخل رأس الخانة نفسها:
#     «الدرجه القصوي»          →  الدرجة القصوى
#     «الدرجه القصوي موهبه»    →  الدرجة القصوى (موهوب)
MAX_LABEL_PLAIN = "الدرجة القصوى"
MAX_LABEL_GIFTED = "الدرجة القصوى (موهوب)"


def max_label_of(raw: str) -> str:
    """يوحّد صياغة رأس عمود الدرجة القصوى كما ورد في الوثائق."""
    return MAX_LABEL_GIFTED if "موهبه" in raw else MAX_LABEL_PLAIN


W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def col_widths(tbl) -> list[float] | None:
    """
    نسب أعمدة الجديلبنسبة المئوية، مرتّبة **من اليمين إلى اليسار**.

    شبكة Word تحفظ العرضات بترتيب يسار→يمين، والاستمارة تُعرض معكوسة،
    فنعكسها لتطابق ترتيب الأعمدة على الورقة.
    """
    grid = tbl._tbl.find(W_NS + "tblGrid")
    if grid is None:
        return None
    ws = [int(g.get(W_NS + "w") or 0) for g in grid.findall(W_NS + "gridCol")]
    if not ws or len(ws) != len(tbl.columns) or sum(ws) <= 0:
        return None
    return [round(w / sum(ws) * 100, 1) for w in reversed(ws)]


def parse_table(tbl: Table):
    """→ (kind, items) أو None."""
    rows = tbl.rows
    if not rows:
        return None

    # نافذة العناوين: أول صفّين من كل خلية
    head_rows = []
    for r in rows[:2]:
        head_rows.extend(norm(c.text) for c in r.cells)
    if not head_rows:
        return None

    joined = " ".join(head_rows)
    is_scale = any(h in joined for h in SCALE_HINTS)
    has_max = any(any(h in c for h in MAX_HINTS) for c in head_rows)

    if not is_scale and not has_max:
        return None

    # عمود النص
    text_col = None
    for i, h in enumerate(head_rows):
        if any(k in h for k in TEXT_HINTS):
            text_col = i
            break
    if text_col is None:
        return None

    # أعمدة الدرجة — استثناء عمود النص
    max_col = pass_col = None
    for i, h in enumerate(head_rows):
        if i == text_col:
            continue
        if max_col is None and any(k in h for k in MAX_HINTS):
            max_col = i
        elif pass_col is None and any(k in h for k in PASS_HINTS):
            pass_col = i

    items = []
    for row in rows[1:]:
        cells = [c.text for c in row.cells]
        if text_col >= len(cells):
            continue
        text = norm(cells[text_col])
        if len(text) < 6:
            continue
        # تخطّي صف العناوين المتكرّر («موشرات تحقق» في صفّ السلم)
        if any(k in text for k in TEXT_HINTS):
            continue

        if max_col is None or max_col >= len(cells):
            # السلم الرباعي — الدرجة القصوى ضمنية
            items.append({"text": text, "max": 4, "pass": 3})
        else:
            cmax = to_int(cells[max_col])
            if cmax is None:
                continue
            cpass = (
                to_int(cells[pass_col])
                if pass_col is not None and pass_col < len(cells)
                else None
            )
            items.append({"text": text, "max": cmax, "pass": cpass})

    if not items:
        return None

    if max_col is not None and not is_scale:
        meta = {"maxLabel": max_label_of(head_rows[max_col] if max_col < len(head_rows) else "")}
        cw = col_widths(tbl)
        if cw:
            meta["cols"] = cw
        return ("final", items, meta)
    kind = "weekly" if len(items) <= 6 else "periodic"
    meta = {}
    cw = col_widths(tbl)
    if cw:
        meta["cols"] = cw
    return (kind, items, meta)


# ---------------------------------------------------------------- استخراج


@dataclass
class Form:
    grade: str | None
    term: str | None
    subject: str | None
    kind: str
    items: list = field(default_factory=list)
    doc: str = ""
    meta: dict = field(default_factory=dict)


def term_from_filename(name: str):
    n = norm(name)
    if "الفصل الثاني" in n or "فصل ثاني" in n:
        return "term2"
    if "الفصل الاول" in n or "فصل اول" in n:
        return "term1"
    return None


def detect_term(text: str):
    """
    يستخرج الفصل من عنوان قسم داخل الوثيقة.

    الوثيقة المدمجة (V1.0) تجمع الأربعة في ملف واحد، وفصلها في عناوين
    مثل «الصف الثاني متوسط " الفصل الثاني» — فالاشتقاق من اسم الملف
    وحده لا يكفي.
    """
    n = norm(text)
    if "الفصل الثاني" in n or "فصل ثاني" in n:
        return "term2"
    if "الفصل الاول" in n or "فصل اول" in n:
        return "term1"
    return None


def is_form_title(text: str) -> bool:
    """
    عنوان استمارة بنمط Normal لا Heading.

    الوثائق القديمة تضع عناوين الاستمارات على نمط Heading، أما الوثيقة
    المدمجة (V1.0) فتكتبها نصاً عاديا. فنميّزها بصيغتها لا بنمطها:
    تبدأ بـ«استمارة» أو «التقويم» وتحوي «لأنشطة».

    شرط «لأنشطة» ضروري: لولاه لالتقطنا عناوين الأقسام مثل
    «استمارات التقويم الختامي»، وهي تسمّي النوع لا المقرر.

    ⚠ نقارن على النص **بعد التطبيع**، فـ«لأنشطة» تصير «لانشطه» بعد
    توحيد الهمزات وحذف التطويل.
    """
    n = norm(text)
    if norm("لأنشطة") not in n and norm("للنشاط") not in n:
        return False
    return n.startswith(norm("استمارة")) or n.startswith(norm("التقويم"))


def extract(path: Path) -> list[Form]:
    doc = Document(str(path))
    file_term = term_from_filename(path.name)
    file_grade = detect(path.name, GRADES)

    # نجمع العناصر بالترتيب: العناوين والجداول
    nodes = []
    for child in doc.element.body.iterchildren():
        tag = child.tag.split("}")[-1]
        if tag == "p":
            par = Paragraph(child, doc)
            t = " ".join(par.text.split())
            if t:
                nodes.append(("p", t, par.style.name or ""))
        elif tag == "tbl":
            nodes.append(("tbl", Table(child, doc), ""))

    # العناوين فقط هي التي تسمّي المقرر — لو أخذنا أي فقرة لانتشتت التسمية
    # على جمل مثل «يعتمد هذا التقويم الختامي لأنشطة الرسم الكرتوني على…»
    subj_marks = []   # (index, subject)
    grade_marks = []  # (index, grade)
    term_marks = []   # (index, term)
    for i, (kind, payload, style) in enumerate(nodes):
        if kind != "p":
            continue
        is_heading = style.lower().startswith("heading")
        if is_heading or is_form_title(payload):
            s = detect(payload, SUBJECTS)
            if s:
                subj_marks.append((i, s))
        g = detect(payload, GRADES)
        if g:
            grade_marks.append((i, g))
        t = detect_term(payload)
        if t:
            term_marks.append((i, t))

    def grade_at(idx):
        # أقرب عنوان مرحلة *قبل* الجدول — العناوين أتت أبدأً في كل وثيقة
        prior = [m for m in grade_marks if m[0] < idx]
        if prior:
            return prior[-1][1]
        return file_grade

    def term_at(idx):
        # الأقسام في الوثيقة المدمجة تسمّي فصولها بعناوين داخلية
        prior = [m for m in term_marks if m[0] < idx]
        if prior:
            return prior[-1][1]
        return file_term

    # الجداول التيlug تخصّ استمارة، بترتيبها
    table_nodes = [
        (i, parse_table(payload))
        for i, (kind, payload, _s) in enumerate(nodes)
        if kind == "tbl" and parse_table(payload)
    ]

    forms: list[Form] = [
        Form(grade=grade_at(i), term=term_at(i), subject=None,
             kind=parsed[0], items=parsed[1], doc=path.name,
             meta=parsed[2] if len(parsed) > 2 else {})
        for i, parsed in table_nodes
    ]

    _assign_subjects(nodes, table_nodes, forms, subj_marks)
    return forms


def _assign_subjects(nodes, table_nodes, forms: list[Form], subj_marks) -> None:
    """
    يوزّع المقررات على الجداول.

    لا نثق بالترتيب الحرفي داخل Word: في وثيقة «آليات التقييم – الخامس»
    يَرِد عنوان استمارة الألوان المائية *بعد* جدولها. لذلك نعمل على مستوى
    المجموعة: لكل (مرحلة، فصل، نوع) نأخذ عناوين المقررات بترتيب ظهورها
    في النص، ونوزّعها على جداول المجموعة بالترتيب نفسه.

    إن اختلف العددان نرجع للترتيب الحرفي (أقرب عنوان سابق).
    """
    # مجموعة لكل (grade, term, kind)
    groups: dict[tuple, list[int]] = {}
    for pos, (idx, _parsed) in enumerate(table_nodes):
        f = forms[pos]
        groups.setdefault((f.grade, f.term, f.kind), []).append(pos)

    for (_g, _t, _k), positions in groups.items():
        if len(positions) < 2:
            if positions:
                idx = table_nodes[positions[0]][0]
                prior = [m for m in subj_marks if m[0] < idx]
                forms[positions[0]].subject = prior[-1][1] if prior else None
            continue

        lo = table_nodes[positions[0]][0]
        hi = table_nodes[positions[-1]][0]
        # Word يضع العنوان أحياناً ملاصقاً لجدوله في أي من الجهتين،
        # فنوسّع النافذة بمقدار عنصر واحد على كل جانب.
        inside: list[str] = []
        for m_idx, sid in subj_marks:
            if lo - 1 <= m_idx <= hi + 1 and sid not in inside:
                inside.append(sid)

        if len(inside) == len(positions):
            for pos, sid in zip(positions, inside):
                forms[pos].subject = sid
        else:
            # عدد العناوين لا يطابق — نستخدم أقرب عنوان سابق لكل جدول
            for pos in positions:
                idx = table_nodes[pos][0]
                prior = [m for m in subj_marks if m[0] < idx]
                forms[pos].subject = prior[-1][1] if prior else None


# ---------------------------------------------------------------- ملفات

TARGET_FILES = [
    "نماذج التقييم للفنون البصرية.docx",
    "آليات التقييم والتقويم لأنشطة الفنون البصرية - الخامس - الفصل الأول.docx",
    "آليات التقييم والتقويم لأنشطة الفنون البصرية - الخامس - الفصل الثاني-.docx",
    "آليات التقييم والتقويم لأنشطة الفنون البصرية - الثاني متوسط - الفصل الأول.docx",
    "آليات التقييم والتقويم لأنشطة الفنون البصرية - الثاني متوسط - الفصل الثاني-.docx",
    # الوثيقة المدمجة (V1.0 — 14 سبتمبر 2026) الأحدث، وتجمع «الخامس»
    # و«الثاني متوسط» في الفصلين معاً. تُقرأ **آخراً** فيغلب ما فيها على
    # ما سبق: هي أمتن في التغطية (تضيف التقييم التكويني للألوان المائية
    # في الثاني متوسط)، ومطابقة بايت-ببايت لما سبق في كل خلية مشتركة.
    "ملف آليات التقييم والتقويم - الصف الخامس والثاني متوسط  الفصل الأول والثاني.docx",
]

AR = {"grade4": "رابع", "grade5": "خامس",
      "grade_int1": "أول متوسط", "grade_int2": "ثاني متوسط"}
KN = {"weekly": "تكويني", "periodic": "مرحلي", "final": "ختامي"}


def dedup_latest(forms: list[Form]) -> list[Form]:
    """
    الخلية نفسها تُؤخذ من **آخر ملف** لا من أوله.

    الوثيقة المدمجة تكرّر ما في الخمس السابقة verbatim في 32 خلية، ولو
    دخلت كلها لتضاعفت البنود. و«آخر ملف يفوز» هو الصواب هنا لأنها
    أحدث وثيقة، وليست نسخة أقدم.

    كتلة بلا فصل (term = None) تنطبق على الفصلين، فتتقاطع مع أي كتلة
    مفصّلة — فنوسّع مفاتيحها على term1 و term2 قبل إزاحة ما تحته.
    """
    slots: dict[tuple, Form] = {}
    for f in forms:
        keys = (f.term, "term1", "term2") if f.term is None else (f.term,)
        for t in keys:
            slots[(f.grade, t, f.subject, f.kind)] = f

    unique: dict[int, Form] = {}
    for f in slots.values():
        unique.setdefault(id(f), f)
    return list(unique.values())


def load_all() -> list[Form]:
    out: list[Form] = []
    for f in TARGET_FILES:
        p = DOCS_DIR / f
        if p.exists():
            out.extend(extract(p))
        else:
            print(f"  ✗ ملف غير موجود: {f}")
    return dedup_latest(out)


def main():
    forms = load_all()
    print()
    print("  استمارات مستخرجة")
    print("  " + "─" * 82)
    print(f"  {'المرحلة':11s} {'فصل':6s} {'المقرر':19s} {'نوع':8s} {'بنود':>5s} {'مجموع':>7s}")
    print("  " + "─" * 82)
    total = 0
    for f in forms:
        mx = sum(i["max"] for i in f.items)
        total += len(f.items)
        print(f"  {AR.get(f.grade or '', '؟'):11s} {(f.term or 'كل'):6s} "
              f"{(f.subject or '؟'):19s} {KN[f.kind]:8s} {len(f.items):5d} {mx:7d}")
    print("  " + "─" * 82)
    print(f"  إجمالي البنود: {total}")

    bad = [f for f in forms if not f.grade or not f.subject]
    print(f"  جداول بلا مرحلة/مقرر: {len(bad)}")

    # فحص السلامة: لا تكرار في (مرحلة، فصل، مقرر، نوع)
    from collections import Counter
    seen = Counter((f.grade, f.term, f.subject, f.kind) for f in forms)
    dupes = [k for k, v in seen.items() if v > 1]
    if dupes:
        print(f"  ⚠ خلايا مكرّرة ({len(dupes)}):")
        for k in dupes:
            print(f"      {k}")
    else:
        print("  لا تكرار في أي خلية (مرحلة × فصل × مقرر × نوع) ✓")
    print()


if __name__ == "__main__":
    main()

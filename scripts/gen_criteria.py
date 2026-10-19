"""
مولّد بنود التقييم الرسمية.

يقرأ الاستخراج النظيف من forms_extract.py ويكتب constants/criteria.data.ts.

⚠ الملف الناتج **مُولَّد** — لا تعدّله يدوياً. لتعديله عدّل الوثائق الأصلية
  ثم أعد تشغيل هذا السكربت، وشغّل verify_forms.py للتأكد.

    python scripts/gen_criteria.py

معرّفات البنود ثابتة بالشكل  {w|p|f}_{subject}_{n}  حتى لا تتأثر
التقييمات المسجَّلة مسبقاً (بنودها مرتبطة بهذه المعرّفات).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from forms_extract import load_all  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "constants" / "criteria.data.ts"

PREFIX = {"weekly": "w", "periodic": "p", "final": "f"}
ORDER = ["weekly", "periodic", "final"]

# ترتيب الكتل في الملف المولَّد
BLOCK_ORDER = [
    ("grade5", "term1"),
    ("grade5", "term2"),
    ("grade_int2", "term1"),
    ("grade_int2", "term2"),
    ("grade4", "all"),
    ("grade_int1", "all"),
]


def ts(s: str) -> str:
    """نص TypeScript بأقواس مفردة مع تهريب الشرطات"""
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


HEADER = """/**
 * بنود التقييم الرسمية — مُولَّدة آلياً من وثائق المشروع الرسمية.
 * ---------------------------------------------------------------------------
 * ⚠ لا تعدّل هذا الملف يدوياً. مصدره:
 *      python scripts/gen_criteria.py
 *    والتحقّق منه:
 *      python scripts/verify_forms.py
 *
 * المصادر (C:\\الغياب والحضور):
 *   • نماذج التقييم للفنون البصرية.docx            → الصف الرابع + الأول المتوسط
 *   • آليات التقييم … - الخامس     - الفصل الأول/الثاني
 *   • آليات التقييم … - الثاني متوسط - الفصل الأول/الثاني
 *
 * البنية:
 *   weekly  (التقييم التكويني الأسبوعي) : 5 بنود  × 4 درجات = 20
 *   periodic(التقويم المرحلي)            : 15 مؤشراً × 4 درجات = 60
 *   final   (التقويم الختامي)            : 6-10 بنود بدرجتين = 50
 *
 * حقول كل بند:
 *   max       الدرجة القصوى للبند
 *   pass      درجة التحقق المطلوبة
 *   maxLabel  نصّ رأس عمود «الدرجة القصوى» — يرد «الدرجة القصوى» أو
 *             «الدرجة القصوى (موهوب)» حسب كل استمارة في الوثائق (الختامية فقط)
 *
 * تنبيه التخطيط: الوثائق الرسمية مصدرها ملفّان بتنسيقين مختلفين:
 *   • source: 'doc06' → «نماذج التقييم للفنون البصرية» (رابع + أول متوسط)
 *       جدول فيه عمود ترقيم «#» ورأسه «المعيار».
 *   • source: 'doc05' → «آليات التقييم والتقويم» (خامس + ثاني متوسط)
 *       بلا عمود ترقيم، ورأسه «موشرات التحقق»، والتقييم الأسبوعي فيه
 *       صفّ رأس مُدمج بعنوان «مستوى أداء المهارات».
 *   راجع sheetLayout() في criteria.ts لاختيار تخطيط الطباعة المناسب.
 *
 * ملاحظة: ستّ استمارات ختامية في الوثائق الأصلية مجموع بنودها 44/48/49
 * لا 50. القيم منقولة حرفياً كما وردت، ويعرض التطبيق تنبيهاً للمعلم.
 */

export type CriteriaKind = 'weekly' | 'periodic' | 'final';

export interface Criterion {
  id: string;
  text: string;
  /** الدرجة القصوى للبند */
  max: number;
  /** درجة التحقق المطلوبة، أو null إذا لم ترد في الوثيقة */
  pass: number | null;
  /** نصّ رأس عمود الدرجة القصوى كما ورد في الوثيقة (الاستمارات الختامية فقط) */
  maxLabel?: string;
}

export type SubjectCriteria = Record<string, Criterion[]>;

export interface CriteriaBlock {
  key: string;
  grade: string;
  term: string;
  source: string;
  weekly: SubjectCriteria;
  periodic: SubjectCriteria;
  final: SubjectCriteria;
  /**
   * نسب عرض أعمدة كل جدول، **من اليمين إلى اليسار**، مقيسة من شبكة
   * جدول Word لا مقدَّرة. المفتاح الأول نوع التقييم والثاني معرّف المقرر.
   */
  cols: Record<string, Record<string, number[]>>;
}
"""


def main() -> int:
    forms = load_all()

    # تجميع: (grade, term) → kind → subject → (items, meta)
    # ملف «نماذج التقييم للفنون البصرية» يغطي المرحلتين في كل الفصول،
    # فنعتبر فصله 'all' (term = None).
    data: dict[tuple, dict] = {}
    cols: dict[tuple, dict] = {}
    for f in forms:
        if not f.grade or not f.subject:
            continue
        cell = data.setdefault((f.grade, f.term or "all"), {k: {} for k in ORDER})
        cell[f.kind].setdefault(f.subject, (f.items, f.meta))
        if f.meta.get("cols"):
            cols.setdefault((f.grade, f.term or "all"), {}).setdefault(f.kind, {})[
                f.subject
            ] = f.meta["cols"]

    missing = [k for k in BLOCK_ORDER if k not in data]
    if missing:
        print("  ✗ كتل بلا بيانات:", missing)
        return 1

    lines: list[str] = [HEADER]
    lines.append("")
    lines.append("export const CRITERIA_BLOCKS: CriteriaBlock[] = [")

    total = 0
    for grade, term in BLOCK_ORDER:
        cell = data[(grade, term)]
        key = grade if term == "all" else f"{grade}_{term}"
        source = "doc06" if term == "all" else "doc05"

        lines.append("  {")
        lines.append(f"    key: {ts(key)},")
        lines.append(f"    grade: {ts(grade)},")
        lines.append(f"    term: {ts(term)},")
        lines.append(f"    source: {ts(source)},")

        for kind in ORDER:
            lines.append(f"    {kind}: {{")
            subjects = sorted(cell[kind].keys())
            for subj in subjects:
                items, meta = cell[kind][subj]
                total += len(items)
                lines.append(f"      {subj}: [")
                for n, it in enumerate(items, start=1):
                    cid = f"{PREFIX[kind]}_{subj}_{n}"
                    p = "null" if it["pass"] is None else str(it["pass"])
                    ml = meta.get("maxLabel")
                    tail = f", maxLabel: {ts(ml)}" if ml else ""
                    lines.append(
                        f"        {{ id: {ts(cid)}, text: {ts(it['text'])}, "
                        f"max: {it['max']}, pass: {p}{tail} }},"
                    )
                lines.append("      ],")
            lines.append("    },")

        # نسب أعمدة كل جدول — مقيسة من شبكة Word (يمين ← يسار)
        cc = cols.get((grade, term), {})
        if cc:
            lines.append("    cols: {")
            for kind in ORDER:
                if kind not in cc:
                    continue
                lines.append(f"      {kind}: {{")
                for subj in sorted(cc[kind]):
                    vals = ", ".join(str(v) for v in cc[kind][subj])
                    lines.append(f"        {subj}: [{vals}],")
                lines.append("      },")
            lines.append("    },")

        lines.append("  },")

    lines.append("];")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print()
    print(f"  ✓ كُتب {OUT.name} — {total} بنداً في {len(BLOCK_ORDER)} كتلة")
    for grade, term in BLOCK_ORDER:
        cell = data[(grade, term)]
        parts = [
            f"{k}:{sum(len(v) for v in cell[k].values())}"
            for k in ORDER
        ]
        print(f"      {grade:12s} {term:6s}  " + "  ".join(parts))
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
مدقّق النماذج المعتمدة — يقارن الوثائق الرسمية بما هو مدمج في التطبيق.

    python scripts/verify_forms.py

يستخدم forms_extract.py (المستخرج المعتمد) فيقرأ الوثائق، ثم يقارن
بنودها ببنود constants/criteria.data.ts:

  • مطابقة تامة  — النص متطابق بعد التطبيع
  • اختلاف شكلي  — النص موجود بصياغة مختلفة
  • غير موجود    — بند في الوثائق لا يوجد في التطبيق (خطأ حقيقي)

كما ينبّه إن اختلف مجموع استمارة ختامية عن المجموع الرسمي.
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from forms_extract import load_all, norm  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
APP_DATA = ROOT / "constants" / "criteria.data.ts"

AR = {"grade4": "رابع", "grade5": "خامس",
      "grade_int1": "أول متوسط", "grade_int2": "ثاني متوسط"}
KN = {"weekly": "تكويني", "periodic": "مرحلي", "final": "ختامي"}
OFFICIAL = {"weekly": 20, "periodic": 60, "final": 50}
LINE = "─" * 78


def load_app_criteria() -> list[dict]:
    src = APP_DATA.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{\s*id:\s*'([^']+)'\s*,\s*text:\s*'((?:[^'\\]|\\.)*)'\s*,"
        r"\s*max:\s*(\d+)\s*,\s*pass:\s*(null|\d+)\s*\}",
        re.S,
    )
    out = []
    for m in pattern.finditer(src):
        raw = m.group(2).replace("\\'", "'").replace("\\\\", "\\")
        out.append({
            "text": norm(raw),
            "raw": raw,
            "max": int(m.group(3)),
            "pass": None if m.group(4) == "null" else int(m.group(4)),
        })
    return out


def main() -> int:
    print()
    print("  مدقّق النماذج المعتمدة")
    print("  الوثائق الرسمية  ↔  constants/criteria.data.ts")
    print("  " + LINE)

    forms = load_all()
    total = sum(len(f.items) for f in forms)
    print(f"  استمارات مستخرجة: {len(forms)}   بنود: {total}")
    print("  " + LINE)
    print(f"  {'المرحلة':11s} {'فصل':6s} {'المقرر':19s} {'نوع':8s} {'بنود':>5s} {'مجموع':>7s}")
    print("  " + LINE)
    for f in forms:
        mx = sum(i["max"] for i in f.items)
        print(f"  {AR.get(f.grade or '', '؟'):11s} {(f.term or 'كل'):6s} "
              f"{(f.subject or '؟'):19s} {KN[f.kind]:8s} {len(f.items):5d} {mx:7d}")
    print("  " + LINE)

    app = load_app_criteria()
    by_text: dict[str, list[dict]] = {}
    for c in app:
        by_text.setdefault(c["text"], []).append(c)

    exact = 0
    fuzzy: list[tuple[dict, dict, float]] = []
    missing: list[dict] = []
    max_diff: list[tuple[dict, dict]] = []

    for f in forms:
        for it in f.items:
            hits = by_text.get(it["text"])
            if hits:
                exact += 1
                if not any(h["max"] == it["max"] for h in hits):
                    max_diff.append((it, hits[0]))
                continue
            best, ratio = None, 0.0
            for c in app:
                r = SequenceMatcher(None, it["text"], c["text"]).ratio()
                if r > ratio:
                    ratio, best = r, c
            if best and ratio >= 0.80:
                fuzzy.append((it, best, ratio))
            else:
                missing.append(it)

    print()
    print(f"  بنود التطبيق: {len(app)}")
    print("  " + LINE)
    print(f"    مطابقة تامة    : {exact:4d} / {total}")
    print(f"    اختلاف شكلي    : {len(fuzzy):4d}")
    print(f"    غير موجودة     : {len(missing):4d}")
    print("  " + LINE)

    if fuzzy:
        print()
        print("  اختلافات شكلية:")
        for it, hit, r in sorted(fuzzy, key=lambda x: -x[2])[:10]:
            print(f"    [{r:.0%}] وثيقة: {it['text'][:50]}")
            print(f"            تطبيق : {hit['raw'][:50]}")

    if missing:
        print()
        print("  ⚠ بنود في الوثائق غير موجودة في التطبيق:")
        for it in missing[:25]:
            print(f"    · {it['text'][:70]}")
        if len(missing) > 25:
            print(f"    ... و{len(missing) - 25} بنداً آخر")

    if max_diff:
        print()
        print("  ⚠ اختلاف في الدرجة القصوى لنص متطابق:")
        for it, hit in max_diff[:10]:
            print(f"    · {it['text'][:46]}")
            print(f"      وثيقة max={it['max']}  |  تطبيق max={hit['max']}")

    # تكرار في التطبيق
    cells = Counter(
        (f.grade, f.term, f.subject, f.kind) for f in forms
    )
    dupes = [k for k, v in cells.items() if v > 1]
    if dupes:
        print()
        print("  ⚧ تكرار في الخلايا:", dupes)

    # مجموع الاستمارة الختامية
    print()
    print("  استمارات ختامية مجموعها لا يساوي 50 (كما وردت في الوثائق):")
    n_off = 0
    for f in forms:
        if f.kind != "final":
            continue
        mx = sum(i["max"] for i in f.items)
        if mx != OFFICIAL["final"]:
            n_off += 1
            print(f"    · {AR.get(f.grade or '', '؟'):11s} {(f.term or 'كل'):6s} "
                  f"{f.subject:19s} مجموع {mx}")
    if not n_off:
        print("    (لا شيء — كل الاستمارات الختامية 50)")

    ok = not missing and not max_diff and not dupes
    print()
    print("  " + LINE)
    print("  ✅ التطبيق مطابق تماماً للوثائق الرسمية المعتمدة"
          if ok else "  ⚠ راجع البنود أعلاه")
    print("  " + LINE)
    print()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

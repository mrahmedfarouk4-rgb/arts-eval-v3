"""بنية جدول التقويم الختامي بدقة — ترتيب الأعمدة وقيمها."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docx import Document
from docx.table import Table
from forms_extract import DOCS_DIR, norm, parse_table

FILE = "نماذج التقييم للفنون البصرية.docx"


def main():
    doc = Document(str(DOCS_DIR / FILE))
    for child in doc.element.body.iterchildren():
        if child.tag.split("}")[-1] != "tbl":
            continue
        tb = Table(child, doc)
        parsed = parse_table(tb)
        if not parsed or parsed[0] != "final":
            continue

        grid = tb._tbl.find(
            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tblGrid"
        )
        widths = [
            g.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w")
            for g in grid.findall(
                "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}gridCol"
            )
        ] if grid is not None else []

        print("═" * 80)
        print(f"جدول ختامي: {len(tb.columns)} أعمدة × {len(tb.rows)} صفوف")
        print("عرض الأعمدة (t twentieths):", widths)
        print("═" * 80)

        for r in range(min(5, len(tb.rows))):
            row = tb.rows[r]
            print(f"\n--- صف {r} ({len(row.cells)} خلية) ---")
            for i, c in enumerate(row.cells):
                t = norm(c.text)
                print(f"   [{i}] {t[:60]!r}")

        print()
        break


if __name__ == "__main__":
    main()

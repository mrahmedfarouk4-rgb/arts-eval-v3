import fitz
doc = fitz.open(r"C:\Users\User\Downloads\Afaq Academy Brand Guideline [Recovered].pdf")
print("صفحات:", doc.page_count)
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    pix.save(f"_brand_p{i+1}.png")
    txt = page.get_text().strip()
    print(f"--- صفحة {i+1} ({len(txt)} حرف) ---")
    print(txt[:500] if txt else "(فارغة نصياً)")
    print()

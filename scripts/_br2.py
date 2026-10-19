import fitz
doc = fitz.open(r"C:\Users\User\Downloads\Afaq Academy Brand Guideline [Recovered].pdf")
page = doc[0]
txt = page.get_text().strip()
print(txt)

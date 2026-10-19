"""
ثلاثة تصاميم مختلفة **بنيوياً** — لا اختلافاً في الألوان فقط.
===========================================================================
التصميمات السابقة (c1/c2/c3) كانت هيكلاً واحداً: ترويسة + تبويبات +
بانر + بطاقات بصورة. تغيّر اللون فقط. هذا خطأ.

هذه ثلاثة **أنماط معمارية** لكلٍّ سلالة مختلفة، وكلٌّ منها يُظهر
الشاشات التي تُميّز نمطه لا شاشات مشتركة:

  ١ · «لوحة العمل»  ←  Notion / Linear / Arc   نمط موزاييك
      الشاشة الرئيسية شبكة خلايا غير متساوية. لا صور ولا بانر ولا تبويبات
      علوية؛ التنقّل شريط أوامر + أيقونات. الشاشة الثانية جدول صفوف.

  ٢ · «الأسبوع»     ←  Google Calendar / Cal.com / Linear Cycles
      الشاشة الرئيسية أعمدة أيام. التقييم مفهومٌ زمنيّ، فالواجهة زمنيّة.
      الشاشة الثانية جدول أعمال ليوم واحد.

  ٣ · «الاستمارة»   ←  Typeform / Airtable / استمارة حكومية
      شاشة واحدة بعمود واحد: سؤال كبير + صفوف كبيرة + زر واحد.
      أقلّ زخرفة ممكنة، وأكبر مساحة لمس.

التشغيل:  python scripts/design-concepts2.py
الناتج:  _design/a.html  b.html  c.html
"""

import io
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_design")
ASSETS = os.path.join(OUT, "img")

SHELL = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl;--page:#20242B}
.wrap{display:flex;gap:24px;padding:24px;background:var(--page);min-height:100%;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:10px}
.phone{width:368px;height:812px;border-radius:36px;overflow:hidden;
  box-shadow:0 30px 70px rgba(0,0,0,.55);background:#fff;position:relative}
.cap-strip{display:flex;gap:10px;align-items:center;margin-bottom:12px}
.cap-strip b{color:#fff;font-size:13px}
.cap-strip span{color:rgba(255,255,255,.5);font-size:11px}
"""

# ==================================================================== 1
# «لوحة العمل» — نمط الموزاييك (Notion/Linear)
A_CSS = """
.cap-strip b{color:#E4E7EC}
.phone{background:#0F1115;color:#E4E7EC}
.cmd{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:11px;
  background:#171A21;border:1px solid #232833;margin:10px}
.cmd .k{width:20px;height:20px;border-radius:6px;background:#FBE122;flex:none;
  display:flex;align-items:center;justify-content:center;font-size:10px;color:#0F1115;font-weight:800}
.cmd .t{flex:1;color:#98A2B3;font-size:12.5px}
.cmd .s{font-size:10px;color:#5C6673;border:1px solid #2A2F3A;border-radius:5px;padding:2px 6px}
.rail{display:flex;gap:6px;padding:6px 14px 0}
.rail div{flex:1;text-align:center;font-size:10.5px;padding:8px 0;border-radius:9px;color:#7C8794}
.rail div.on{background:#1B1F27;color:#FBE122;font-weight:700}
.bento{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px 14px}
.tile{border-radius:14px;padding:13px;background:#171A21;border:1px solid #232833;
  display:flex;flex-direction:column;justify-content:space-between}
.tile.big{grid-column:span 2;min-height:132px}
.tile.k2{grid-row:span 2}
.tile h4{font-size:11px;color:#7C8794;font-weight:600}
.tile .n{font-size:30px;font-weight:800;letter-spacing:-.5px;line-height:1}
.tile .u{font-size:10px;color:#5C6673;margin-top:3px}
.tile .note{font-size:11px;color:#98A2B3;line-height:1.55}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.chipx{font-size:10.5px;padding:5px 10px;border-radius:999px;background:#1F2430;color:#C6CDD8}
.chipx.on{background:#FBE122;color:#0F1115;font-weight:700}
.ring{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:13px;font-weight:800}
.dotline{display:flex;gap:4px;margin-top:7px}
.dotline i{width:6px;height:6px;border-radius:3px;background:#2A2F3A}
.progress{height:5px;border-radius:3px;background:#232833;overflow:hidden;margin-top:8px}
.progress i{display:block;height:100%;background:#FBE122;border-radius:3px}
/* الشاشة ٢: جدول */
.tbl{padding:4px 14px 14px}
.trow{display:flex;align-items:center;gap:10px;padding:11px 4px;
  border-bottom:1px solid #1E232C}
.trow .cb{width:16px;height:16px;border-radius:5px;border:1.5px solid #39404C;flex:none}
.trow .cb.on{background:#FBE122;border-color:#FBE122}
.trow .tx{flex:1}
.trow .tx b{display:block;font-size:13px}
.trow .tx small{font-size:10.5px;color:#7C8794}
.trow .n{font-size:11px;color:#5C6673;font-variant-numeric:tabular-nums}
.tlab{font-size:10.5px;color:#7C8794;padding:12px 4px 6px;font-weight:700}
"""

A_BODY = """
<div class="wrap">
  <div class="col">
    <div class="cap-strip"><b>البوابة العمل</b><span>نمط الموزاييك — Notion / Linear / Arc</span></div>
    <div class="phone">
  <div class="cmd"><span class="k">أ</span><span class="t">ابحث عن طالب أو مقرر…</span><span class="s">⌘K</span></div>
  <div class="rail"><div class="on">العمل</div><div>الطلاب</div><div>السجل</div><div>المزيد</div></div>
  <div class="bento">
    <div class="tile big">
      <h4>اليوم · الأحد ١٨ أكتوبر</h4>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <span class="chipx on">ابدأ تقييماً</span>
        <span class="chipx">أضف طالباً</span>
        <span class="chipx">ولّد خطة الفصل</span>
      </div>
      <div class="note">٤ تقييمات توعتوعّد اليوم — أقربها ٠٩:٣٠</div>
    </div>
    <div class="tile"><h4>طلابك</h4><div><div class="n">٣٨</div><div class="u">في ٤ مراحل</div></div></div>
    <div class="tile"><h4>تقييمات اليوم</h4><div><div class="n">٤</div><div class="u">٢ مكتملة</div></div></div>
    <div class="tile big">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="ring" style="background:conic-gradient(#FBE122 0 66%,#232833 66% 100%)">
          <div style="width:42px;height:42px;border-radius:50%;background:#171A21;display:flex;align-items:center;justify-content:center">٦٦٪</div>
        </div>
        <div style="flex:1">
          <h4>هذا الأسبوع</h4>
          <div class="n" style="font-size:20px">١٢ <span style="font-size:12px;color:#5C6673">/ ١٨</span></div>
          <div class="progress"><i style="width:66%"></i></div>
        </div>
      </div>
    </div>
    <div class="tile k2">
      <h4>مقرراتك</h4>
      <div class="dotline"><i style="background:#007886"></i><i style="background:#007886"></i><i style="background:#1B7A42"></i><i style="background:#9056A1"></i><i style="background:#2A2F3A"></i><i style="background:#2A2F3A"></i><i style="background:#2A2F3A"></i></div>
      <div class="note" style="margin-top:9px">٧ مقررات · ٥٩٢ بنداً<br>٢٬٤٠٠ درجة متاحة هذا الفصل</div>
      <div style="display:flex;gap:5px;margin-top:10px">
        <span style="width:9px;height:9px;border-radius:3px;background:#007886"></span>
        <span style="width:9px;height:9px;border-radius:3px;background:#1B7A42"></span>
        <span style="width:9px;height:9px;border-radius:3px;background:#9056A1"></span>
        <span style="font-size:10px;color:#5C6673;margin-right:3px">أنواع التقييم</span>
      </div>
    </div>
    <div class="tile"><h4>متوسط الحضور</h4><div><div class="n">٩٢<small style="font-size:14px">٪</small></div><div class="u">هذا الشهر</div></div></div>
  </div>
</div>

<div class="phone">
  <div class="cmd"><span class="k">أ</span><span class="t">اختر المرحلة…</span></div>
  <div class="tbl">
    <div class="tlab">الصف الثاني المتوسط · الفصل الأول · ٣ مقررات</div>
    <div class="trow"><span class="cb on"></span><div class="tx"><b>أساسيات الرسم</b><small>تكويني · مرحلي · ختامي</small></div><span class="n">١٦ بنداً</span></div>
    <div class="trow"><span class="cb"></span><div class="tx"><b>الألوان المائية</b><small>تكويني · مرحلي · ختامي</small></div><span class="n">١٦ بنداً</span></div>
    <div class="trow"><span class="cb"></span><div class="tx"><b>الرسم الرقمي</b><small>تكويني · مرحلي · ختامي</small></div><span class="n">١٦ بنداً</span></div>
    <div class="tlab">اختيار متعدّد — ما ي选中 يُقيَّم فقط</div>
    <div class="trow"><span class="cb"></span><div class="tx"><b>توليد خطة الفصل الثاني</b><small>ينشئ ١١٤ استمارة فارغة</small></div><span class="n">×</span></div>
    <div class="trow" style="border:0"><span class="cb"></span><div class="tx"><b>تصدير نسخة احتياطية</b><small>JSON لكل الطلاب والتقييمات</small></div><span class="n">×</span></div>
  </div>
</div>
  </div>
</div>
"""

# ==================================================================== 2
# «الأسبوع» — نمط الجدول الزمني (Google Calendar / Cal.com)
B_CSS = """
.cap-strip b{color:#C6D6F0}
.phone{background:#FFFFFF;color:#15202B}
.whead{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}
.whead .mn{flex:1}
.whead .mn b{font-size:16px;display:block}
.whead .mn small{font-size:11px;color:#6B7785}
.navb{width:30px;height:30px;border-radius:9px;border:1px solid #DCE3EA;display:flex;
  align-items:center;justify-content:center;color:#5C6673;font-size:13px}
.strip{display:flex;align-items:center;gap:8px;margin:2px 14px 10px;padding:9px 12px;
  border-radius:11px;background:#EEF3F9}
.strip b{font-size:12px}
.strip small{font-size:10.5px;color:#5C6673;margin-right:auto}
.days{display:flex;gap:6px;padding:0 14px;overflow:hidden}
.day{flex:1;min-width:0}
.day .dh{text-align:center;font-size:10px;color:#6B7785;padding-bottom:6px}
.day .dn{text-align:center;font-size:16px;font-weight:800;padding:5px 0;border-radius:10px}
.day.today .dn{background:#0F2837;color:#fff}
.day .dn small{display:block;font-size:9px;font-weight:600;opacity:.6}
.col{margin-top:8px;background:#F6F8FA;border-radius:11px;padding:6px;min-height:392px;
  border:1px solid transparent}
.day.today .col{background:#F2F5F9;border-color:#0F2837}
.ev{background:#fff;border-radius:9px;padding:8px;margin-bottom:6px;
  border-right:3px solid #0F2837;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ev.g{border-right-color:#1B7A42}
.ev.v{border-right-color:#9056A1}
.ev b{font-size:11px;display:block}
.ev small{font-size:9.5px;color:#6B7785}
.ev .pill{display:inline-block;font-size:8.5px;padding:2px 6px;border-radius:999px;
  background:#FBE122;color:#0F2837;font-weight:700;margin-top:4px}
.ev .tally{margin-top:5px;height:3px;border-radius:2px;background:#E3E9EF;overflow:hidden}
.ev .tally i{display:block;height:100%;background:#0F2837}
.tabbar{display:flex;border-top:1px solid #E3E9EF;margin-top:auto}
.tabbar div{flex:1;text-align:center;font-size:10px;padding:11px 0;color:#6B7785}
.tabbar div.on{color:#0F2837;font-weight:800;border-top:2px solid #FBE122;margin-top:-1px}
/* جدول أعمال يوم */
.agenda{padding:6px 14px}
.ai{display:flex;gap:12px;padding:13px 0;border-bottom:1px solid #EDF1F5}
.ai .tm{width:52px;flex:none;font-size:11px;color:#6B7785;font-variant-numeric:tabular-nums}
.ai .bd{flex:1}
.ai .bd b{font-size:13.5px;display:block}
.ai .bd small{font-size:11px;color:#6B7785}
.ai .av{width:34px;height:34px;border-radius:9px;background:#EEF3F9;display:flex;
  align-items:center;justify-content:center;font-size:14px;flex:none}
.ai.done .bd b{text-decoration:line-through;color:#9AA6B2}
"""

B_BODY = """
<div class="wrap">
  <div class="col">
    <div class="cap-strip"><b>الأسبوع</b><span>نمط الجدول الزمني — Google Calendar / Cal.com</span></div>
    <div class="phone" style="display:flex;flex-direction:column">
  <div class="whead">
    <div class="mn"><b>الأسبوع ٤</b><small>١٨ – ٢٢ أكتوبر ٢٠٢٦</small></div>
    <div class="navb">›</div><div class="navb">‹</div>
  </div>
  <div class="strip"><b>١٢ من ١٨ مكتملة</b><small>الإنجاز ٦٦٪</small>
    <div style="width:74px;height:6px;border-radius:3px;background:#DCE3EA;overflow:hidden">
      <i style="display:block;height:100%;width:66%;background:#0F2837"></i></div></div>
  <div class="days">
    <div class="day today"><div class="dh">الأحد</div><div class="dn">١٨</div>
      <div class="col">
        <div class="ev"><b>سلمان · الرسم</b><small>٥ طلاب</small><span class="pill">تكويني</span>
          <div class="tally"><i style="width:60%"></i></div></div>
        <div class="ev g"><b>ندى · الرسم</b><small>٤ طلاب</small><span class="pill">مرحلي</span>
          <div class="tally"><i style="width:25%"></i></div></div>
      </div></div>
    <div class="day"><div class="dh">الاثنين</div><div class="dn">١٩</div>
      <div class="col"><div class="ev v"><b>فهد · أساسيات</b><small>٦ طلاب</small><span class="pill">ختامي</span>
        <div class="tally"><i style="width:0%"></i></div></div></div></div>
    <div class="day"><div class="dh">الثلاثاء</div><div class="dn">٢٠</div>
      <div class="col"><div class="ev"><b>ريم · ألوان</b><small>٥ طلاب</small><span class="pill">تكويني</span>
        <div class="tally"><i style="width:0%"></i></div></div></div></div>
    <div class="day"><div class="dh">الأربعاء</div><div class="dn">٢١</div>
      <div class="col"><div class="ev g"><b>ماجد · ختامي</b><small>٧ طلاب</small><span class="pill">ختامي</span>
        <div class="tally"><i style="width:0%"></i></div></div></div></div>
    <div class="day"><div class="dh">الخميس</div><div class="dn">٢٢</div>
      <div class="col"></div></div>
  </div>
  <div class="tabbar"><div class="on">الأسبوع</div><div>الطلاب</div><div>السجل</div><div>الإعدادات</div></div>
</div>
  </div>
  <div class="col">
    <div class="cap-strip"><b>الشاشة الثانية · جدول مختار</b><span>الشاشة الثانية · جدول مختار</span></div>
    <div class="phone" style="display:flex;flex-direction:column">
  <div class="whead"><div class="mn"><b>الأحد ١٨ أكتوبر</b><small>٤ تقييمات · ٢ مكتملة</small></div></div>
  <div class="agenda">
    <div class="ai done"><span class="tm">٠٩:٣٠</span><span class="av">✓</span>
      <div class="bd"><b>سلمان · أساسيات الرسم</b><small>التقييم التكويني · الوحدة الثانية · ١٨ من ٢٠</small></div></div>
    <div class="ai"><span class="tm">١٠:١٥</span><span class="av">✎</span>
      <div class="bd"><b>ندى · أساسيات الرسم</b><small>التقويم المرحلي · ٤ طلاب متبقّون</small></div></div>
    <div class="ai"><span class="tm">١١:٠٠</span><span class="av">🎨</span>
      <div class="bd"><b>فهد · الألوان المائية</b><small>التقويم الختامي · لم يبدأ</small></div></div>
    <div class="ai"><span class="tm">١٢:٣٠</span><span class="av">＋</span>
      <div class="bd"><b>إضافة تقييم</b><small>اختر طالباً ومقرراً</small></div></div>
  </div>
</div>
  </div>
</div>
"""

# ==================================================================== 3
# «الاستمارة» — النمط الخطّي (Typeform / Airtable / نموذج حكومي)
C_CSS = """
.cap-strip b{color:#7A3C12}
.phone{background:#FCFCFA;color:#15202B}
.prog{height:3px;background:#E8E4DC}
.prog i{display:block;height:100%;width:50%;background:#621244}
.head{padding:16px 22px 4px;display:flex;align-items:baseline;gap:8px}
.head b{font-size:11px;color:#8A7F6E;letter-spacing:.4px}
.head span{font-size:11px;color:#B3A894;margin-right:auto}
.q{padding:16px 22px 6px}
.q h2{font-size:27px;font-weight:700;line-height:1.25;letter-spacing:-.3px}
.q p{font-size:13px;color:#7A7267;margin-top:7px;line-height:1.6}
.rows{padding:6px 22px 0}
.row{display:flex;align-items:center;gap:12px;padding:15px 4px;
  border-bottom:1px solid #EAE5DC;cursor:default}
.row .ix{font-size:11px;color:#B3A894;width:16px;font-variant-numeric:tabular-nums}
.row .tx{flex:1}
.row .tx b{font-size:16px;font-weight:600;display:block}
.row .tx small{font-size:11.5px;color:#8A7F6E}
.row .go{color:#B3A894;font-size:17px}
.row.on{background:#FAF6EF;border-radius:12px;padding:15px 12px;border-bottom-color:transparent}
.row.on .ix{color:#621244;font-weight:700}
.row.on b{color:#621244}
.row.on .go{color:#621244}
.act{padding:16px 22px}
.btn{width:100%;padding:16px;border:0;border-radius:14px;background:#621244;color:#fff;
  font-size:16px;font-weight:700}
.btn.sec{background:transparent;color:#8A7F6E;font-size:13px;padding:11px;margin-top:8px}
.key{margin:14px 22px 0;padding:12px 14px;border-radius:12px;background:#F5F2EC;
  font-size:11.5px;color:#7A7267;line-height:1.7}
.key b{color:#621244}
"""

C_BODY = """
<div class="wrap">
  <div class="col">
    <div class="cap-strip"><b>الاستمارة</b><span>النمط الخطي — Typeform / Airtable</span></div>
    <div class="phone" style="display:flex;flex-direction:column">
  <div class="prog"><i></i></div>
  <div class="head"><b>الخطوة ٢ من ٤</b><span>أنصت ·المعلّم</span></div>
  <div class="q">
    <h2>أيّ مقرر تُقيِّم الآن؟</h2>
    <p>ستظهر لك هذه المقررات فقط — أسندها المشرف إلى اسمك.</p>
  </div>
  <div class="rows">
    <div class="row on"><span class="ix">١</span><div class="tx"><b>أساسيات الرسم</b><small>٣ أنواع تقييم · ١٦ بنداً</small></div><span class="go">‹</span></div>
    <div class="row"><span class="ix">٢</span><div class="tx"><b>الرسم الكرتوني</b><small>٣ أنواع تقييم · ١٦ بنداً</small></div><span class="go">‹</span></div>
    <div class="row"><span class="ix">٣</span><div class="tx"><b>الألوان المائية</b><small>٣ أنواع تقييم · ١٦ بنداً</small></div><span class="go">‹</span></div>
    <div class="row"><span class="ix">٤</span><div class="tx"><b>الرسم الرقمي</b><small>٣ أنواع تقييم · ١٦ بنداً</small></div><span class="go">‹</span></div>
  </div>
  <div class="key"><b>٣</b> مقررات أخرى في هذه المرحلة غير مسندة إليك —<br>راجع المشرف إن كنت تحتاجها.</div>
  <div style="flex:1"></div>
  <div class="act"><button class="btn">متابعة ←</button><button class="btn sec">رجوع</button></div>
</div>
  </div>
  <div class="col">
    <div class="cap-strip"><b>الشاشة الثانية · جدول مختار</b><span>الشاشة الثانية · جدول مختار</span></div>
    <div class="phone" style="display:flex;flex-direction:column">
  <div class="prog"><i style="width:75%;background:#C03944"></i></div>
  <div class="head"><b>الخطوة ٣ من ٤</b><span>أساسيات الرسم</span></div>
  <div class="q">
    <h2>أيّ نوع تقييم؟</h2>
    <p>لكل نوع كليشته المعتمدة في الوثائق الرسمية.</p>
  </div>
  <div class="rows">
    <div class="row on"><span class="ix">١</span><div class="tx"><b>التقييم التكويني</b><small>نهاية كل وحدة · من ٢٠ درجة</small></div><span class="go">‹</span></div>
    <div class="row"><span class="ix">٢</span><div class="tx"><b>التقويم المرحلي</b><small>بعد سبعة أسابيع · من ٦٠ درجة</small></div><span class="go">‹</span></div>
    <div class="row"><span class="ix">٣</span><div class="tx"><b>التقويم الختامي</b><small>نهاية الفصل · من ٥٠ درجة</small></div><span class="go">‹</span></div>
  </div>
  <div class="key">الوحدة الثانية من ٤ — <b>١٦ بنداً</b> موزّعة على أربعة مستويات.</div>
  <div style="flex:1"></div>
  <div class="act"><button class="btn">متابعة ←</button><button class="btn sec">رجوع</button></div>
</div>
  </div>
</div>
"""


def col(cap, sub, phone):
    return ('  <div class="col">\n'
            f'    <div class="cap-strip"><b>{cap}</b><span>{sub}</span></div>\n'
            f'    {phone}\n'
            '  </div>\n')


CAPS = {
    "A": ("الجدول الثاني — موزاييك",
          "نمط Notion / Linear / Arc",
          "الشاشة الثانية · جدول مختار"),
    "B": ("الأسبوع — جدول زمني",
          "نمط Google Calendar / Cal.com",
          "الشاشة الثانية · جدول أعمال"),
    "C": ("الاستمارة — عمود احد",
          "نمط Typeform / Airtable",
          "الشاشة الثالثة · إجراء تقييم"),
}

import json
BODIES = json.load(io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bodies.json"), encoding="utf-8"))


def write(name, title, css, key, page):
    body = '<div class="wrap">\n'
    body += col(CAPS[key][0], CAPS[key][1], BODIES[key][0])
    body += '  <div class="col">\n'
    body += f'    <div class="cap-strip"><b>{CAPS[key][2]}</b><span>{CAPS[key][1]}</span></div>\n'
    body += '    ' + BODIES[key][1] + '\n'
    body += '  </div>\n</div>\n'
    html = ("<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'>"
            f"<title>{title}</title><style>{SHELL}{css}</style></head><body>{body}</body></html>")
    io.open(os.path.join(OUT, name), "w", encoding="utf-8").write(html)
    print("  كُتب", name)


def main():
    os.makedirs(ASSETS, exist_ok=True)
    src = os.path.join(ROOT, "assets", "brand")
    for name in ("hero-bg.jpg", "hero-title.png", "afaq-logo.png", "moc-logo.png"):
        f = os.path.join(src, name)
        if os.path.exists(f):
            shutil.copy2(f, os.path.join(ASSETS, name))
    print(f"مجلد التصاميم: {OUT}")
    write("a.html", "a — لوحة العمل", A_CSS, "A", "#20242B")
    write("b.html", "b — الأسبوع", B_CSS, "B", "#F1F4F8")
    write("c.html", "c — الاستمارة", C_CSS, "C", "#EDEAE3")
    print("\nعنها 8099/a.html  b.html  c.html")


if __name__ == "__main__":
    main()

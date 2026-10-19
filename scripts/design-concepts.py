"""
ثلاثة تصاميم بديلة للمنصة — قوالب HTML للتصوير والمقارنة.
===========================================================================
الهدف: تغيير تصميم التطبيق من الجذور مع الحفاظ على هوية الأكاديمية
(كحلي #0F2837 · ذهبي #FBE122 · أرجواني #621244 · شعار الأكاديمية).

كل تصميم يعرض **نفس ثلاث شاشات** حتى تكون المقارنة منصفة:
   ١ · شاشة الدخول      ٢ · اختيار المرحلة      ٣ · بطاقات المقررات

التشغيل:  python scripts/design-concepts.py
الناتج:  _design/c1.html  c2.html  c3.html   ← صوّرها للمقارنة
"""

import io
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_design")
ASSETS = os.path.join(OUT, "img")


def prepare_assets():
    os.makedirs(ASSETS, exist_ok=True)
    src = os.path.join(ROOT, "assets", "brand")
    for name in ("hero-bg.jpg", "hero-title.png", "afaq-logo.png",
                 "moc-logo.png", "visual-boys.jpg"):
        s = os.path.join(src, name)
        if os.path.exists(s):
            shutil.copy2(s, os.path.join(ASSETS, name))


# ------------------------------------------------------------------ HTML

BODY = """
<div class="phones">

  <!-- ================= ١ · شاشة الدخول ================= -->
  <div class="phone">
    <div class="screen login">
      <img class="bg" src="img/hero-bg.jpg">
      <div class="veil"></div>
      <div class="login-in">
        <img class="hero-logo" src="img/hero-title.png">
        <div class="hero-title"><span>منصة تقييم الفنون البصرية</span><i class="ul"></i></div>
        <div class="stats">
          <div class="stat"><b>4</b><span>مراحل دراسية</span></div>
          <div class="stat"><b>7</b><span>مقررات فنية</span></div>
          <div class="stat"><b>592</b><span>بند تقييم</span></div>
        </div>
        <div class="card">
          <div class="logos"><img src="img/afaq-logo.png"><span class="sep"></span><img src="img/moc-logo.png"></div>
          <h2>تسجيل الدخول</h2>
          <p class="hint">المشرف يدخل باسمه، وكل معلم باسمه وكلمة سره الخاصة</p>
          <label class="field"><i>👤</i><input placeholder="اسم المستخدم"></label>
          <label class="field"><i>🔑</i><input placeholder="•••••"></label>
          <div class="seed">🔑 حساب المشرف: admin / admin — اضغط للتعبئة</div>
          <button class="cta">دخول ←</button>
          <button class="ghost">الدخول كضيف ←</button>
        </div>
        <div class="foot">أكاديمية آفاق للفنون والثقافة</div>
      </div>
    </div>
  </div>

  <!-- ================= ٢ · اختيار المرحلة ================= -->
  <div class="phone">
    <div class="screen app">
      <header class="top"><b>منصة تقييم الفنون البصرية</b><span>المشرف</span><i class="goldline"></i></header>
      <nav class="tabs"><span class="on">التقييم</span><span>الطلاب</span><span>السجل</span><span>الإعدادات</span></nav>
      <div class="body">
        <div class="hero-banner">
          <img class="bg" src="img/hero-bg.jpg">
          <div class="veil"></div>
          <div class="hb-in">
            <div class="eyebrow">منظومة الحضور والغياب — أكاديمية آفاق للفنون والثقافة</div>
            <h1><span>اختر المرحلة</span><i class="ul"></i></h1>
            <p>الصف والفصل ثم المقرر ونوع التقييم</p>
          </div>
        </div>
        <div class="cap">الخطوة ١ من ٤</div>
        <div class="grades">
          <div class="g"><i class="ic">🏫</i><div><b>الصف الرابع الابتدائي</b><small>ابتدائي · ف١ ٣ مقررات · ف٢ ٥ مقررات</small></div><span class="num">١</span></div>
          <div class="g"><i class="ic">🏫</i><div><b>الصف الخامس الابتدائي</b><small>ابتدائي · ف١ ٣ مقررات · ف٢ ٣ مقررات</small></div><span class="num">٢</span></div>
          <div class="g on"><i class="ic">🎨</i><div><b>الصف الأول المتوسط</b><small>متوسط · ف١ ٣ مقررات · ف٢ ٥ مقررات</small></div><span class="num">٣</span></div>
          <div class="g"><i class="ic">🎨</i><div><b>الصف الثاني المتوسط</b><small>متوسط · ف١ ٣ مقررات · ف٢ ٤ مقررات</small></div><span class="num">٤</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= ٣ · بطاقات المقررات ================= -->
  <div class="phone">
    <div class="screen app">
      <header class="top"><b>الصف الثاني المتوسط</b><span>المشرف</span><i class="goldline"></i></header>
      <nav class="tabs"><span class="on">التقييم</span><span>الطلاب</span><span>السجل</span><span>الإعدادات</span></nav>
      <div class="body">
        <div class="cap">الخطوة ٢ من ٤ · الفصل والمقرر</div>
        <div class="term"><span class="on">الفصل الأول</span><span>الفصل الثاني</span></div>
        <div class="subs">
          <div class="s"><div class="ph"><img src="img/visual-boys.jpg"><i class="badge">المحدّدة</i></div>
            <div class="sb"><i class="chip c1">✎</i><div><b>أساسيات الرسم</b><small>مهارات وقواعد الرسم والمنظور</small></div><span class="dots">•••</span></div></div>
          <div class="s"><div class="ph"><img src="img/visual-boys.jpg"></div>
            <div class="sb"><i class="chip c2">🖌</i><div><b>الألوان المائية</b><small>تقنيات ودمج الألوان المائية</small></div><span class="dots">•••</span></div></div>
          <div class="s"><div class="ph"><img src="img/visual-boys.jpg"></div>
            <div class="sb"><i class="chip c3">🎨</i><div><b>الرسم الرقمي</b><small>تقنيات وتطبيقات الرسم الرقمي</small></div><span class="dots">•••</span></div></div>
        </div>
      </div>
    </div>
  </div>

</div>
"""


COMMON = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl}
.phones{display:flex;gap:26px;padding:26px;background:var(--page-bg);min-height:100%}
.phone{width:372px;border-radius:34px;overflow:hidden;
  box-shadow:0 26px 60px rgba(0,0,0,.42);background:#000;position:relative}
.screen{height:800px;position:relative;overflow:hidden}
.login{display:flex;flex-direction:column}
.login .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-logo{width:230px;height:auto;display:block;margin:0 auto}
.login-in{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:22px;gap:14px}
.stats{display:flex;gap:8px;width:100%;margin-top:4px}
.stat{flex:1;text-align:center;padding:9px 4px;border-radius:12px}
.stat b{display:block;font-size:19px;line-height:1.1}
.stat span{font-size:10px;opacity:.85}
.card{width:100%;background:#fff;border-radius:20px;padding:22px}
.logos{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.logos img{height:34px;object-fit:contain}
.logos .sep{margin:0 4px}
.logos .sep{width:1px;height:24px;background:var(--sep)}
.card h2{font-size:19px;margin-bottom:2px}
.card .hint{font-size:11.5px;line-height:1.6;margin-bottom:14px}
.field{display:flex;align-items:center;gap:8px;border-radius:12px;padding:0 12px;
  height:46px;margin-bottom:9px}
.field i{font-style:normal;opacity:.5;font-size:14px}
.field input{border:0;background:transparent;flex:1;font-size:14px;outline:none;color:inherit}
.seed{font-size:10px;line-height:1.5;padding:6px 9px;border-radius:9px;margin-bottom:10px}
.cta,.ghost{width:100%;border:0;border-radius:999px;padding:12px;font-size:15px;
  font-weight:700;cursor:default;margin-bottom:8px;display:block}
.foot{font-size:10.5px;opacity:.8}
.top{position:relative;display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px}
.top b{font-size:14px}
.top span{font-size:11px;padding:4px 10px;border-radius:999px}
.top .goldline{position:absolute;left:0;right:0;bottom:0;height:3px;display:block}
.tabs{display:flex;gap:4px;padding:8px 12px}
.tabs span{flex:1;text-align:center;font-size:11.5px;padding:8px 0;border-radius:999px}
.tabs .on{font-weight:700}
.body{padding:12px 14px 20px;overflow:hidden;height:660px}
.cap{font-size:11px;margin:2px 0 10px;opacity:.75}
.hero-banner{position:relative;border-radius:20px;overflow:hidden;margin-bottom:14px}
.hero-banner .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-banner .veil{position:absolute;inset:0}
.hb-in{position:relative;padding:20px}
.eyebrow{font-size:9.5px;letter-spacing:.4px;font-weight:800;margin-bottom:6px}
.hb-in h1{font-size:24px;font-weight:800;position:relative;display:inline-block;padding-bottom:8px}
.hb-in h1 .ul{position:absolute;bottom:0;right:0;height:4px;border-radius:999px}
.hb-in p{font-size:11.5px;margin-top:6px}
.grades{display:flex;flex-direction:column;gap:10px}
.g{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;position:relative}
.g .ic{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;
  justify-content:center;font-style:normal;font-size:20px;flex:none}
.g b{display:block;font-size:14px}
.g small{font-size:10.5px;opacity:.8}
.g .num{font-size:11px;font-weight:800}
.term{display:flex;gap:8px;margin-bottom:12px}
.term span{flex:1;text-align:center;font-size:12px;padding:10px 0;border-radius:12px}
.term .on{font-weight:700}
.subs{display:flex;flex-direction:column;gap:12px}
.s{overflow:hidden;position:relative}
.s .ph{position:relative;height:104px}
.s .ph img{width:100%;height:100%;object-fit:cover;display:block}
.s .badge{position:absolute;top:8px;left:8px;font-size:9.5px;font-weight:800;
  padding:3px 9px;border-radius:999px;font-style:normal}
.s .sb{display:flex;align-items:center;gap:10px;padding:11px 12px}
.s .chip{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;
  justify-content:center;font-style:normal;font-size:16px;flex:none;border-width:1px;border-style:solid}
.s b{display:block;font-size:13.5px}
.s small{font-size:10px;opacity:.75;display:block;margin-top:1px}
.s .dots{font-size:13px;letter-spacing:2px;opacity:.6}
"""

# ------------------------------------------------------------------ C1
C1 = """
:root{
  --page-bg:#0C1C27;
  --navy:#0F2837; --navy-2:#16374C; --navy-3:#1E4560;
  --gold:#FBE122; --cream:#F4EFE2;
  --sep:rgba(255,255,255,.22);
}
body{background:var(--page-bg)}
.login{background:var(--navy)}
.login .veil{background:linear-gradient(180deg,rgba(15,40,55,.62),rgba(8,22,31,.92))}
.hero-logo{filter:drop-shadow(0 4px 18px rgba(0,0,0,.5))}
.hero-title{text-align:center;color:#fff;position:relative;display:inline-block;padding-bottom:7px;
  font-size:20px;font-weight:800;margin-top:2px}
.hero-title .ul{position:absolute;bottom:0;right:0;height:3px;background:var(--gold);
  border-radius:999px;width:62%}
.stat{background:rgba(255,255,255,.08);border:1px solid rgba(251,225,34,.22);color:#fff}
.card{border-radius:6px;border:1px solid rgba(251,225,34,.35);
  box-shadow:0 26px 60px rgba(0,0,0,.6)}
.card h2{color:var(--navy)}
.card .hint{color:#5A6B77}
.logos .sep{background:var(--navy)}
.field{background:#F1F4F6;border:1px solid #C9D6DF}
.field input{color:var(--navy)}
.seed{background:rgba(251,225,34,.16);color:#6B5B00;border-right:3px solid var(--gold)}
.cta{background:var(--gold);color:var(--navy)}
.ghost{background:transparent;color:var(--navy);border:1px solid #C9D6DF}
.foot{color:rgba(255,255,255,.7)}
.app{background:var(--navy);color:var(--cream)}
.top{background:var(--navy-2);color:#fff}
.top span{background:var(--gold);color:var(--navy)}
.top .goldline{background:var(--gold)}
.tabs{background:var(--navy)}
.tabs span{color:rgba(255,255,255,.66)}
.tabs .on{background:var(--gold);color:var(--navy)}
.hero-banner{background:var(--navy-2);border:1px solid rgba(251,225,34,.3)}
.hero-banner .veil{background:linear-gradient(90deg,rgba(15,40,55,.55),rgba(15,40,55,.92))}
.eyebrow{color:var(--gold)}
.hb-in h1{color:#fff}
.hb-in h1 .ul{background:var(--gold);width:65%}
.hb-in p{color:rgba(255,255,255,.82)}
.cap{color:rgba(255,255,255,.55)}
.g{background:var(--navy-2);border:1px solid rgba(255,255,255,.08)}
.g.on{border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)}
.g .ic{background:rgba(251,225,34,.14);color:var(--gold)}
.g b{color:#fff}
.g small{color:rgba(255,255,255,.62)}
.g .num{color:var(--gold)}
.term span{background:var(--navy-2);color:rgba(255,255,255,.7)}
.term .on{background:var(--gold);color:var(--navy)}
.s{background:var(--navy-2);border:1px solid rgba(255,255,255,.08);border-radius:10px}
.s.on{border-color:var(--gold)}
.s .badge{background:var(--gold);color:var(--navy)}
.s .sb b{color:#fff}
.s .sb small{color:rgba(255,255,255,.6)}
.s .chip{border-color:transparent}
.c1{background:rgba(251,225,34,.18);color:var(--gold)}
.c2{background:rgba(0,120,134,.28);color:#7FD3E0}
.c3{background:rgba(144,86,161,.3);color:#D2B4E4}
"""

# ------------------------------------------------------------------ C2
C2 = """
:root{
  --page-bg:#EDE8E1;
  --paper:#FBF8F3; --paper-2:#FFFDFA;
  --ink:#1C2733; --muted:#6E7C8A;
  --navy:#0F2837; --plum:#621244; --gold:#D9A400; --hair:#DDD4C7;
  --sep:#DDD4C7;
}
body{background:var(--page-bg)}
.login{background:var(--paper)}
.login .veil{background:linear-gradient(180deg,rgba(27,20,25,.20),rgba(27,20,25,.62))}
.hero-logo{width:200px;filter:brightness(0) invert(1);opacity:.96}
.hero-title{text-align:center;color:#fff;position:relative;display:inline-block;padding-bottom:7px;
  font-size:19px;font-weight:700;letter-spacing:.2px;margin-top:2px;font-family:Georgia,'Times New Roman',serif}
.hero-title .ul{position:absolute;bottom:0;right:0;height:2px;background:var(--gold);width:100%}
.stat{background:transparent;color:#fff;border-top:1px solid rgba(255,255,255,.45);border-bottom:1px solid rgba(255,255,255,.45);padding:8px 4px;border-radius:0}
.card{background:var(--paper-2);border-radius:2px;border:none;
  box-shadow:0 18px 44px rgba(60,45,35,.22);padding:24px;position:relative}
.card h2{color:var(--plum);font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:.2px}
.card .hint{color:var(--muted)}
.logos .sep{background:var(--hair)}
.field{background:transparent;border:none;border-bottom:1px solid var(--hair);border-radius:0;padding:0 2px}
.field i{opacity:.35}
.field input{color:var(--ink);font-family:Georgia,serif}
.seed{background:transparent;color:var(--plum);border-right:2px solid var(--gold);border-radius:0;padding:4px 8px}
.cta{background:var(--plum);color:#fff;border-radius:2px;letter-spacing:.3px}
.ghost{background:transparent;color:var(--plum);border:none;border-bottom:1px solid var(--plum);border-radius:0;padding:6px 0 10px}
.foot{color:rgba(255,255,255,.85);font-family:Georgia,serif;letter-spacing:.4px}
.app{background:var(--paper);color:var(--ink)}
.top{background:var(--paper);color:var(--navy);border-bottom:1px solid var(--hair)}
.top span{background:transparent;color:var(--muted);border:1px solid var(--hair);border-radius:2px}
.top .goldline{background:transparent}
.tabs{background:var(--paper);border-bottom:1px solid var(--hair)}
.tabs span{color:var(--muted);border-radius:2px}
.tabs .on{color:var(--plum);border-bottom:2px solid var(--plum)}
.hero-banner{border-radius:2px;background:var(--paper-2);border:1px solid var(--hair);
  box-shadow:0 14px 34px rgba(60,45,35,.14)}
.hero-banner .bg{filter:grayscale(.35) contrast(1.04)}
.hero-banner .veil{background:linear-gradient(90deg,rgba(251,248,243,.30),rgba(251,248,243,.94))}
.eyebrow{color:var(--plum)}
.hb-in h1{color:var(--navy);font-family:Georgia,serif}
.hb-in h1 .ul{background:var(--gold);width:58%;height:3px}
.hb-in p{color:var(--muted)}
.cap{color:var(--muted);font-family:Georgia,serif;letter-spacing:.5px}
.g{background:var(--paper-2);border:1px solid var(--hair);border-radius:2px}
.g.on{border-color:var(--plum);box-shadow:inset 3px 0 0 var(--plum)}
.g .ic{background:var(--paper);border:1px solid var(--hair)}
.g b{color:var(--navy)}
.g small{color:var(--muted)}
.g .num{color:var(--gold);font-family:Georgia,serif}
.term span{background:transparent;color:var(--muted);border:1px solid var(--hair);border-radius:2px}
.term .on{background:var(--plum);color:#fff;border-color:var(--plum)}
.s{background:var(--paper-2);border:1px solid var(--hair);border-radius:2px;
  box-shadow:0 10px 26px rgba(60,45,35,.10)}
.s .ph{height:118px}
.s .badge{background:var(--gold);color:#2A1F00;border-radius:2px}
.s .sb b{color:var(--navy)}
.s .sb small{color:var(--muted)}
.c1{background:#FDDCC8;color:#7A3C12;border-color:#D17E30}
.c2{background:#C0E1F7;color:#262674;border-color:#83C3EB}
.c3{background:#F5D7E8;color:#621244;border-color:#E5A1C8}
"""

# ------------------------------------------------------------------ C3
C3 = """
:root{
  --page-bg:#DDE3E8;
  --paper:#FFFFFF; --navy:#0F2837; --maroon:#9E2A2B;
  --ink:#152028; --muted:#5C6B78; --hair:#9AA7B2; --wash:#EEF2F5;
  --sep:#9AA7B2;
}
body{background:var(--page-bg)}
.login{background:var(--navy)}
.login .veil{background:
  repeating-linear-gradient(135deg,rgba(255,255,255,.022) 0 3px,transparent 3px 7px),
  linear-gradient(180deg,rgba(15,40,55,.80),rgba(15,40,55,.93))}
.hero-logo{filter:drop-shadow(0 2px 0 rgba(0,0,0,.4))}
.hero-title{text-align:center;color:#fff;position:relative;display:inline-block;padding-bottom:8px;
  font-size:19px;font-weight:800;margin-top:2px;letter-spacing:.3px}
.hero-title .ul{position:absolute;bottom:0;right:0;height:4px;background:#FBE122;width:100%}
.stat{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.34);border-radius:2px}
.card{border-radius:0;border:2px solid var(--navy);box-shadow:6px 6px 0 rgba(15,40,55,.22);
  background:var(--paper);padding:20px;position:relative}
.card:before{content:"";position:absolute;top:0;left:0;width:34px;height:6px;
  background:#FBE122;border-right:2px solid var(--navy);border-bottom:2px solid var(--navy)}
.card h2{color:var(--navy)}
.card .hint{color:var(--muted)}
.logos .sep{background:var(--hair)}
.field{background:var(--wash);border:1px solid var(--hair);border-radius:2px}
.field input{color:var(--ink)}
.seed{background:#FFF7D1;color:#6B5B00;border:1px dashed var(--gold,#FBE122);border-radius:2px}
.cta{background:var(--navy);color:#fff;border-radius:2px;box-shadow:4px 4px 0 rgba(158,42,43,.55)}
.ghost{background:var(--paper);color:var(--navy);border:1px solid var(--hair);border-radius:2px}
.foot{color:rgba(255,255,255,.75);letter-spacing:.3px}
.app{background:var(--wash);color:var(--ink)}
.top{background:var(--paper);color:var(--navy);border-bottom:2px solid var(--navy)}
.top span{background:var(--navy);color:#fff;border-radius:2px}
.top .goldline{background:var(--gold,#FBE122);height:4px}
.tabs{background:var(--paper);border-bottom:1px solid var(--hair)}
.tabs span{color:var(--muted);border-radius:2px}
.tabs .on{background:var(--navy);color:#fff;border-radius:2px}
.hero-banner{border-radius:0;border:2px solid var(--navy);box-shadow:5px 5px 0 rgba(15,40,55,.18)}
.hero-banner .veil{background:linear-gradient(90deg,rgba(15,40,55,.58),rgba(15,40,55,.90))}
.eyebrow{color:#FBE122}
.hb-in h1{color:#fff}
.hb-in h1 .ul{background:#FBE122;width:60%;height:5px}
.hb-in p{color:rgba(255,255,255,.85)}
.cap{color:var(--muted);font-weight:700;letter-spacing:.4px;border-right:4px solid var(--maroon);padding-right:8px}
.g{background:var(--paper);border:1px solid var(--hair);border-radius:2px}
.g.on{border:2px solid var(--navy);box-shadow:4px 4px 0 rgba(15,40,55,.16)}
.g .ic{background:var(--wash);border:1px solid var(--hair);border-radius:2px}
.g b{color:var(--navy)}
.g small{color:var(--muted)}
.g .num{color:var(--maroon)}
.term span{background:var(--paper);color:var(--muted);border:1px solid var(--hair);border-radius:2px}
.term .on{background:var(--maroon);color:#fff;border-color:var(--maroon)}
.s{background:var(--paper);border:1px solid var(--hair);border-radius:2px}
.s.on{border:2px solid var(--navy)}
.s .ph{height:100px;border-bottom:1px solid var(--hair)}
.s .badge{background:#FBE122;color:var(--navy);border-radius:2px;border:1px solid var(--navy)}
.s .sb b{color:var(--navy)}
.s .sb small{color:var(--muted)}
.c1{background:#FDE7C8;color:#7A3C12;border-color:#D17E30;border-radius:2px}
.c2{background:#D9EAFB;color:#262674;border-color:#83C3EB;border-radius:2px}
.c3{background:#FAE3EF;color:#621244;border-color:#E5A1C8;border-radius:2px}
"""


def write(name, title, css):
    html = (
        "<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'>"
        f"<title>{title}</title><style>{COMMON}{css}</style></head><body>{BODY}</body></html>"
    )
    with io.open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(html)
    print("  كُتب", name)


def main():
    prepare_assets()
    os.makedirs(OUT, exist_ok=True)
    print(f"مجلد التصاميم: {OUT}")
    write("c1.html", "تصميم ١ — البوابة الكحلية", C1)
    write("c2.html", "تصميم ٢ — المعرض", C2)
    write("c3.html", "تصميم ٣ — المختوم", C3)
    print("\nصوّرها:")
    print('  chrome --headless=new --window-size=1260,900 '
          '--screenshot=_design/c1.png _design/c1.html')


if __name__ == "__main__":
    main()
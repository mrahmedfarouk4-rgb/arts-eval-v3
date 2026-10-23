/**
 * استمارة «تقرير الستة أسابيع» — A4 بتدفّق مستمر وعدد صفحات مرن
 * ==============================================================
 * المحتوى يتوزّع تلقائياً على العدد الذي تحتاجه البيانات (صفحة أو أكثر)،
 * مع تكرار الشريط الزخرفي وشعار الوزارة والتذييل على كل صفحة.
 * الأقسام محمية من الانقسام في غير موضعها: العناوين تبقى مع محتواها،
 * والمقررات والتوقيعات لا تُقطع، وجدول المخرجات يكرّر رأسه عند امتداده.
 *
 * الشريط الزخرفي والشعار والتذييل منسوخة من كليشة print-html الرسمية
 * (نفس المقاسات والألوان) دون استيرادها، حتى تبقى استمارات التقييم
 * الأخرى معزولة عن أي تعديل هنا.
 *
 * لا درجات ولا مجموع — تقدير وصفي وملاحظات فقط.
 */

import { MAJALLA_REGULAR_DATA, MAJALLA_BOLD_DATA } from '@/lib/six-week-fonts';
import { MOC_LOGO_DATA_URI } from '@/lib/print-assets';
import { gradeName, gradeStage } from '@/constants/criteria';
import type { TermId } from '@/constants/criteria';
import {
  REPORT_CRITERIA, REPORT_RATINGS, REPORT_SUBJECTS, ratingLabel,
  type SixWeekReport,
} from '@/lib/six-week';

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const text = (s: string) => (s.trim() ? esc(s) : '&nbsp;');

/* --------------------------------------------------------------- */
/*  الأرقام والتاريخ                                                */
/* --------------------------------------------------------------- */

const AR_NUM: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};
const ar = (s: string) => String(s ?? '').replace(/\d/g, (d) => AR_NUM[d] ?? d);

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/** 2026-09-30 ← ٢٠٢٦/سبتمبر/٣٠ كما في النموذج */
function arDate(iso: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso.trim());
  if (!m) return ar(iso);
  const month = AR_MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${ar(m[1])}/${month}/${ar(m[3])}`;
}

function stageLabel(id: string): string {
  const stage = gradeStage(id);
  if (stage === 'متوسط') return 'المتوسطة';
  if (stage === 'ابتدائي') return 'الابتدائية';
  return stage;
}

function metaItem(label: string, value: string): string {
  return `<div class="meta-cell">
        <div class="meta-k">${esc(label)}</div>
        <div class="meta-v">${text(value)}</div>
      </div>`;
}

function gradeLabel(id: string): string {
  return gradeName(id).replace(/^الصف\s+/, '');
}

function termLabel(term: TermId): string {
  return term === 'term2' ? 'الثاني' : 'الأول';
}

/* --------------------------------------------------------------- */
/*  تجزيء النص إلى فقرات أو نقاط                                    */
/* --------------------------------------------------------------- */

function paragraphs(raw: string): string[] {
  return raw.split(/\r?\n+/).map((t) => t.trim()).filter(Boolean);
}

/**
 * نقاط القائمة: كل سطر نقطة، وإن كان السطر نصاً متصلاً يُجزَّأ
 * عند نهايات الجمل حتى تخرج القائمة كالنموذج. الترقيم اليدوي
 * في بداية السطر («1.» أو «-») يُحذف لأن النموذج يستخدم «•» وحدها.
 */
function bullets(raw: string): string[] {
  const out: string[] = [];
  for (const block of paragraphs(raw)) {
    const clean = block
      .replace(/^[\d٠-٩]+[.)-]\s*/, '')
      .replace(/^[-•*]\s*/, '')
      .trim();
    if (!clean) continue;
    const sentences = clean.split(/(?<=[.؟!])\s+/).map((t) => t.trim()).filter(Boolean);
    out.push(...(sentences.length > 1 ? sentences : [clean]));
  }
  return out;
}

/* --------------------------------------------------------------- */
/*  قطع ثابتة من الكليشة الرسمية                                    */
/* --------------------------------------------------------------- */

/** الشريط الزخرفي — نفس مقاطع كليشة print-html (4.99مم × 98.55مم) */
const RIBBON: { h: number; w: number; c: string; g?: number }[] = [
  { h: 24, w: 4.74, c: '#91B9B4' },
  { h: 6, w: 4.99, c: '#3F1231', g: 2 },
  { h: 18, w: 4.99, c: '#6E1946', g: 2 },
  { h: 4, w: 4.82, c: '#E64524', g: 18 },
  { h: 107, w: 4.57, c: '#EB5A3C', g: 1 },
  { h: 10, w: 4.99, c: '#FF9619', g: 14 },
  { h: 7, w: 4.66, c: '#B41932', g: 9 },
  { h: 56, w: 4.99, c: '#0F2837', g: 15 },
  { h: 16, w: 4.57, c: '#FAC39B', g: 3 },
  { h: 30, w: 4.66, c: '#B41932', g: 3 },
  { h: 4, w: 4.74, c: '#6E1946', g: 8 },
  { h: 102, w: 4.66, c: '#FF9619', g: 22 },
  { h: 6, w: 4.57, c: '#FAC39B', g: 18 },
  { h: 5, w: 4.74, c: '#8E8D6D', g: 2 },
  { h: 4, w: 4.74, c: '#91B9B4', g: 2 },
  { h: 43, w: 4.99, c: '#EB5A3C', g: 14 },
  { h: 9, w: 4.99, c: '#EB3506', g: 1 },
  { h: 18, w: 4.91, c: '#FF9619', g: 2 },
  { h: 26, w: 4.74, c: '#6E1946', g: 19 },
  { h: 107, w: 4.91, c: '#FAC39B', g: 16 },
  { h: 7, w: 4.74, c: '#0F2837', g: 16 },
  { h: 6, w: 4.74, c: '#0E0E0D', g: 1 },
  { h: 45, w: 4.99, c: '#6E1946', g: 18 },
  { h: 7, w: 4.99, c: '#3F1231', g: 1 },
  { h: 15, w: 4.91, c: '#91B9B4', g: 2 },
  { h: 7, w: 4.74, c: '#86412A', g: 2 },
  { h: 18, w: 4.4, c: '#EB5A3C', g: 2 },
  { h: 6, w: 4.4, c: '#FAC39B', g: 19 },
  { h: 6, w: 4.99, c: '#B0131E', g: 2 },
  { h: 100, w: 4.99, c: '#B41932', g: 1 },
  { h: 5, w: 4.99, c: '#FF9619', g: 19 },
  { h: 7, w: 4.74, c: '#0F2837', g: 8 },
  { h: 52, w: 4.74, c: '#91B9B4', g: 19 },
];

const RIBBON_W = 4.99;
const RIBBON_H = 98.55;

function ribbonHtml(): string {
  const out: string[] = [];
  RIBBON.forEach((s) => {
    out.push(`<i style="flex:${s.h} 0 0;width:${s.w}mm;background:${s.c}"></i>`);
    if (s.g) out.push(`<i class="gap" style="flex:${s.g} 0 0"></i>`);
  });
  return `<div class="page-ribbon" aria-hidden="true">${out.join('')}</div>`;
}

const CHROME = `
  ${ribbonHtml()}
  <img class="moc-logo" src="${MOC_LOGO_DATA_URI}" alt="" />`;

const FOOTER = `<div class="sheet-foot">
    <div class="foot-en">
      <b>Ministry of Culture</b><br />
      King Faisal Road, Al Dirriyah<br />
      P.O. Box 3424, Riyadh 13711<br />
      Kingdom of Saudi Arabia
    </div>
    <div class="foot-mid">
      T +966 11 836 3352 &#1605;<br />
      F +966 11 836 3333 &#1601;<br />
      moc.gov.sa
    </div>
    <div class="foot-ar">
      <b>وزارة الثقافة</b><br />
      طريق الملك فيصل، الدرعية<br />
      ص.ب. 3424، الرياض 13711<br />
      المملكة العربية السعودية
    </div>
  </div>`;

/* --------------------------------------------------------------- */
/*  قطع المحتوى                                                     */
/* --------------------------------------------------------------- */

function heading(title: string): string {
  return `<h2 class="sec"><span class="dot">•</span>${esc(title)}</h2>`;
}

function bulletsHtml(items: string[], tight = false): string {
  if (!items.length) return '';
  return `<ul class="bullets${tight ? ' tight' : ''}">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

function courseHtml(name: string, rating: string, note: string): string {
  return `<div class="course">
    <div class="course-name">مقرر: ${esc(name)}</div>
    ${bulletsHtml(bullets(note), true)}
    <div class="overall">التقدير العام: ${esc(rating)}</div>
  </div>`;
}

function criteriaTableHtml(report: SixWeekReport): string {
  const rows = REPORT_CRITERIA.map((c) => {
    const v = report.criteria[c.id];
    return `<tr>
      <td class="cell-criterion">${esc(c.name)}</td>
      <td class="cell-level">${esc(ratingLabel(v.rating))}</td>
      <td class="cell-notes">${text(v.note)}</td>
    </tr>`;
  }).join('');
  return `<table class="criteria-table">
    <thead>
      <tr>
        <th>معايير التقييم</th>
        <th>مستوى الإتقان</th>
        <th>ملاحظات المعلم</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* --------------------------------------------------------------- */
/*  المستند الكامل                                                  */
/* --------------------------------------------------------------- */

export function buildSixWeekReportHtml(report: SixWeekReport): string {
  const courses = REPORT_SUBJECTS
    .map((s) => ({ ...s, entry: report.courses.find((c) => c.subject_id === s.id) }))
    .filter((s) => !!s.entry);

  const summaryHtml = paragraphs(report.summary)
    .map((p) => `<p class="para">${esc(p)}</p>`)
    .join('');

  const metaHtml = [
    metaItem('المرحلة', stageLabel(report.grade_id)),
    metaItem('الصف', gradeLabel(report.grade_id)),
    metaItem('الفصل الدراسي', termLabel(report.term)),
    metaItem('التاريخ', arDate(report.report_date)),
    metaItem('اسم الطالب', report.student_name),
    metaItem('إعداد معلم المادة', report.teacher_name),
  ].join('');

  const coursesHtml = courses.length
    ? courses
        .map((c) => courseHtml(c.name, ratingLabel(c.entry!.rating), c.entry!.note))
        .join('')
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>تقرير الستة أسابيع — ${esc(report.student_name)}</title>
<style>
  @font-face {
    font-family: 'Sakkal Majalla';
    src: url(data:font/ttf;base64,${MAJALLA_REGULAR_DATA}) format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Sakkal Majalla';
    src: url(data:font/ttf;base64,${MAJALLA_BOLD_DATA}) format('truetype');
    font-weight: 700;
    font-style: normal;
  }

  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Sakkal Majalla', 'Calibri', 'Noto Naskh Arabic',
                 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    color: #1a1a1a;
    background: #ffffff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* الكليشة الثابتة — بإحداثيات الصفحة، تتكرر على كل صفحة */
  .page-ribbon {
    position: fixed;
    top: 99.2mm;
    left: 0;
    width: ${RIBBON_W}mm;
    height: ${RIBBON_H}mm;
    display: flex;
    flex-direction: column;
    direction: ltr;
    align-items: flex-start;
    z-index: 5;
  }
  .page-ribbon i { display: block; min-height: 0; }
  .page-ribbon i.gap { width: 0; background: none; }

  .moc-logo {
    position: fixed;
    top: 2mm;
    right: 12mm;
    height: 33mm;
    width: auto;
    object-fit: contain;
    z-index: 5;
  }

  .sheet-foot {
    position: fixed;
    bottom: 3mm;
    left: 0;
    width: 210mm;
    padding: 3mm 24.5mm 0;
    direction: ltr;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: start;
    column-gap: 4mm;
    font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
    font-size: 6.6pt;
    line-height: 1.45;
    color: #0F2837;
    background: #ffffff;
    z-index: 5;
  }
  .sheet-foot b { font-weight: 700; }
  .foot-en  { text-align: left;  direction: ltr; grid-column: 1; justify-self: start; }
  .foot-mid { text-align: center; direction: ltr; grid-column: 2; justify-self: center; }
  .foot-ar  { text-align: right; direction: rtl; grid-column: 3; justify-self: end; }

  /* تدفّق المستند — الحشو يُستنسخ على كل صفحة */
  .doc {
    width: 100%;
    padding: 40mm 24.5mm 22mm;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  /* العنوان والبيانات التعريفية */
  .doc-head { break-inside: avoid; }
  .doc-kicker {
    text-align: right;
    font-size: 10.5pt;
    font-weight: 700;
    color: #5A7380;
    letter-spacing: 0.1pt;
  }
  .doc-title {
    margin: 1.8mm 0 0 0;
    text-align: right;
    font-size: 22pt;
    font-weight: 700;
    color: #0F2837;
    line-height: 1.35;
  }
  .title-rule {
    width: 42mm;
    height: 1mm;
    margin: 3mm 0 0 auto;
    border-radius: 1mm;
    background: linear-gradient(90deg, #0F2837 0 65%, #D17E30 65% 100%);
  }

  .meta-grid {
    margin-top: 7mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 9mm;
    padding: 1.5mm 6mm 3mm;
    border-top: 1.1mm solid #0F2837;
    border-radius: 0 0 2mm 2mm;
    background: #F4F8FA;
    break-inside: avoid;
  }
  .meta-cell {
    padding: 3mm 0 2.4mm;
    border-bottom: 0.5pt solid #DCE6EB;
  }
  .meta-cell:nth-last-child(-n+2) { border-bottom: 0; }
  .meta-k {
    font-size: 9.5pt;
    font-weight: 700;
    color: #5A7380;
    line-height: 1.4;
  }
  .meta-v {
    margin-top: 0.8mm;
    font-size: 13pt;
    font-weight: 700;
    color: #0F2837;
    line-height: 1.45;
  }

  /* الأقسام — العنوان يبقى ملتصقاً بمحتواه */
  .sec {
    margin: 0;
    padding: 0 6.5mm 1.4mm 0;
    font-size: 16pt;
    font-weight: 700;
    color: #0F2837;
    line-height: 1.5;
    text-align: right;
    border-bottom: 0.4pt solid #D9E4EA;
    break-after: avoid;
  }
  .sec .dot { margin-left: 2mm; color: #D17E30; }

  .block { margin-top: 9mm; }
  .block.first { margin-top: 10mm; }
  .block .sub { margin-top: 8mm; }

  .para {
    margin: 3mm 0 0 0;
    font-size: 13pt;
    line-height: 1.62;
    text-align: right;
    orphans: 3;
    widows: 3;
  }
  .para + .para { margin-top: 2.6mm; }

  .bullets {
    margin: 2.4mm 0 0 0;
    padding: 0 18mm 0 0;
    list-style: none;
  }
  .bullets li {
    position: relative;
    font-size: 13pt;
    line-height: 1.6;
    text-align: right;
    break-inside: avoid;
  }
  .bullets li + li { margin-top: 2.6mm; }
  .bullets.tight li + li { margin-top: 0; }
  .bullets li::before {
    content: '•';
    position: absolute;
    right: -5.5mm;
    top: 0;
    font-weight: 700;
    color: #0F2837;
  }

  .course { margin-top: 5mm; break-inside: avoid; }
  .course + .course { padding-top: 4mm; border-top: 0.5pt solid #DCE6EB; }
  .course .bullets { margin-top: 2mm; }
  .course-name {
    font-size: 14pt;
    font-weight: 700;
    color: #0F2837;
    text-align: right;
  }
  .overall {
    margin-top: 3mm;
    padding-right: 18mm;
    font-size: 13pt;
    font-weight: 700;
    color: #0F2837;
    text-align: right;
  }

  .criteria-table {
    width: 100%;
    margin-top: 3mm;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .criteria-table thead { display: table-header-group; }
  .criteria-table tr { break-inside: avoid; }
  .criteria-table th, .criteria-table td {
    border: 0.75pt solid #B6C9D2;
    font-size: 12pt;
    vertical-align: middle;
  }
  .criteria-table th {
    padding: 1.6mm 2.5mm;
    color: #0F2837;
    font-weight: 700;
    text-align: center;
    background: #EFF5F8;
  }
  .criteria-table td { padding: 2.4mm 2.5mm; }
  .criteria-table th:nth-child(1), .criteria-table td:nth-child(1) { width: 40%; }
  .criteria-table th:nth-child(2), .criteria-table td:nth-child(2) { width: 32%; }
  .criteria-table th:nth-child(3), .criteria-table td:nth-child(3) { width: 28%; }
  .cell-criterion { text-align: right; }
  .cell-level { text-align: center; }
  .cell-notes { text-align: right; }

  .signatures {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 10mm;
    padding: 0 10mm;
    font-size: 14pt;
    font-weight: 700;
    break-inside: avoid;
  }
  .signatures .sig { width: 46%; }
  .signatures .sig:last-child { text-align: left; }
  .sig-space { height: 14mm; }

  @media screen {
    html, body { background: #eef1f2; }
    body { padding: 10mm 0; }
    .page-ribbon, .moc-logo, .sheet-foot { display: none; }
    .doc {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 40mm 24.5mm 22mm;
      background: #ffffff;
      box-shadow: 0 3mm 10mm rgba(15, 40, 55, 0.14);
    }
  }

  @media print {
    html, body { background: #ffffff; }
  }
</style>
</head>
<body>

${CHROME}

<div class="doc">
  <header class="doc-head">
    <div class="doc-kicker">أكاديمية آفاق للفنون والثقافة</div>
    <h1 class="doc-title">تقرير الستة أسابيع</h1>
    <div class="title-rule" aria-hidden="true"></div>
  </header>

  <div class="meta-grid">
    ${metaHtml}
  </div>

  <section class="block first">
    ${heading('الأداء العام للطالب')}
    ${summaryHtml || '<p class="para">&nbsp;</p>'}
  </section>

  <section class="block">
    ${heading('التقييم التفصيلي للأداء الفني والتعليمي للطالب')}
    ${coursesHtml || '<p class="para">&nbsp;</p>'}

    <div class="sub">
      ${heading('السلوك والانضباط')}
      ${bulletsHtml(bullets(report.behavior))}
    </div>
  </section>

  <section class="block">
    ${heading('الجوانب الشخصية والاجتماعية')}
    ${bulletsHtml(bullets(report.social))}
  </section>

  <section class="block">
    ${heading('ملخص مخرجات الطالب السلوكية والفنية')}
    ${criteriaTableHtml(report)}
  </section>

  <section class="block">
    ${heading('توصيات المعلم')}
    ${bulletsHtml(bullets(report.recommendations))}
  </section>

  <div class="signatures">
    <div class="sig">
      <div>توقيع المعلم:</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig">
      <div>ختم المدرسة:</div>
    </div>
  </div>
</div>

${FOOTER}

</body>
</html>`;
}

/** تقديرات النموذج كقائمة جاهزة لواجهة التحّرير */
export const RATING_OPTIONS = REPORT_RATINGS;

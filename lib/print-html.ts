/**
 * مولّد استمارة الطباعة — نسخة مطابقة للكليشة الرسمية
 * ===================================================================
 * المصدر المرجعي: كليشة «أساسيات الرسم وحدة 1 - مفرغ.docx» الرسمية
 * الصادرة عن وزارة الثقافة — صورة الصفحة كاملة بخلفية وشعار وتذييل.
 *
 * التعديلات المطلوبة على الكليشة (حسب تعليمات المعلم):
 *   ✓ الشريط الزخرفي (مربعات الألوان) على **يسار** الصفحة
 *   ✗ حُذف أرقام الهاتف والبريد والعنوان من التذييل
 *   ✓ أُبقي شعار وزارة الثقافة (مستخرج من الكليشة نفسها)
 *   ✓ جُدِّدت جداول التقييم: أعمدة أوضح، صفوف أطول، درجات بارزة
 *
 * التخطيط (من اليمين إلى اليسار):
 *   • الأسبوعي/المرحلي : موشرات التحقق | دون الهدف(1) | يقترب(2) | حقق(3) | يتخطى(4)
 *     — وثيقة «آليات التقييم» بلا عمود ترقيم، وبها صفّ رأس مُدمج
 *       «مستوى أداء المهارات» على التقييم الأسبوعي.
 *   • الختامي          : موشرات التحقق | درجة التحقق | الدرجة القصوى | درجة الطالب
 *
 * ملاحظة: التخطيط يتبع مرحلة الطالب — «نماذج التقييم» (رابع/أول متوسط)
 * فيها عمود «م» ورأس «المعيار»، و«آليات التقييم» (خامس/ثاني متوسط)
 * بلا عمود ترقيم وبرأس «موشرات التحقق». راجع sheetLayout() في criteria.ts.
 *
 * مطبوعة A4، خط Cairo، اتجاه RTL، تثبيت الألوان عند الطباعة.
 */

import {
  gradeName, subjectName, formTotals, sumScores, APP,
  sheetLayout, criteriaHeaderLabel, maxColumnLabel, tableColWidths,
} from '@/constants/criteria';
import type { GradeId, SheetLayout, SubjectId } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import type { Evaluation } from '@/lib/store';

/* --------------------------------------------------------------- */
/*  الأصول — Base64 مضمّنة تعمل بلا إنترنت                          */
/* --------------------------------------------------------------- */

import { RIBBON_DATA_URI, MOC_LOGO_DATA_URI } from '@/lib/print-assets';
import { MAJALLA_REGULAR_DATA, MAJALLA_BOLD_DATA } from '@/lib/print-fonts';

/* --------------------------------------------------------------- */
/*  لوحة الألوان — مطابقة للكليشة الرسمية                          */
/* --------------------------------------------------------------- */

/**
 * لوحة الألوان — **مقيسة رقمياً من كليشة المعلم نفسها** (ب PIXEL على الصورة)
 * لا مُقدَّرة بالعين، فلا نقارب بين لون ولون:
 *
 *   #0F2837  كحلي   «موشرات التحقق» + خانة «المجموع من 20»
 *   #6E1946  توتي   «مستوى أداء المهارات» + خانة «الفئة» + علامة ✓
 *   #B41932  قرمزي  رؤوس أعمدة السلم الرباعي
 *   #E3EEEC  رمادي مزرقّ  عمود البنود
 *   #F2D8DD  وردي   خلايا المربعات الفارغة ☐
 *   #FDF4F5  وردي باهت جداً  خلايا الفئات (يمين)
 *   #F7E7EA  وردي باهت  خلايا الفئات (يسار)
 */
const C = {
  pageBg: '#eef1f2',
  sheet: '#ffffff',

  /** الكحلي — «موشرات التحقق» ورأس «المجموع من 20» */
  navy: '#0F2837',

  /** التوتي — «مستوى أداء المهارات» ورأس «الفئة» وعلامة ✓ */
  maroon: '#6E1946',
  maroonBright: '#6E1946',

  /** القرمزي — رؤوس أعمدة السلم الرباعي */
  crimson: '#B41932',

  /** الورديات — خلايا الدرجات */
  pink: '#F2D8DD',
  pinkSoft: '#FDF4F5',
  pinkAlt: '#F7E7EA',
  /** رمادي مزرقّ — عمود البنود في كليشة التقييم التكويني */
  criteriaBg: '#E3EEEC',
  /** عمود الترقيم «م» */
  headPink: '#F2D8DD',
  headText: '#6E1946',

  text: '#1a1a1a',
  value: '#111',
  label: '#4a4a4a',
  border: '#9E8288',
  note: '#6E1946',
  muted: '#8a7a7d',
};

export interface PrintRow {
  student: { name: string; grade: string };
  evaluation: {
    id: string;
    date: string;
    label: string;
    scores: Record<string, number>;
    teacher: string;
  };
  kind: CriteriaKind;
  gradeId: GradeId;
  subjectId: SubjectId;
  subjectName: string;
  gradeName: string;
}

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** الأرقام العربية-الهندية كما في الكليشة */
const AR_NUM: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};
const ar = (n: number | string) =>
  String(n ?? '').replace(/\d/g, (d) => AR_NUM[d] ?? d);

const B = `0.75pt solid ${C.border}`;

/** سلم التقدير الرباعي — تسميات الكليشة الرسمية */
const SCALE = [
  { label: 'دون الهدف', n: 1 },
  { label: 'يقترب من الهدف', n: 2 },
  { label: 'حقق الهدف', n: 3 },
  { label: 'يتخطى الهدف', n: 4 },
];

const KIND_TITLE: Record<CriteriaKind, string> = {
  weekly: 'استمارة التقييم التكويني نهاية الوحدة لأنشطة',
  periodic: 'استمارة التقويم المرحلي لأنشطة',
  final: 'استمارة التقويم الختامي لأنشطة',
};

/** الشريط الزخرفي — مستطيلات حادّة الحواف على أي دقّة طباعة */
function ribbonHtml(): string {
  const out: string[] = [];
  RIBBON.forEach((s) => {
    out.push(`<i style="flex:${s.h} 0 0;width:${s.w}mm;background:${s.c}"></i>`);
    // الفاصل جزء من النسبة نفسها — لو تركناه بالبكسل-turned px لتخطّى الارتفاع
    if (s.g) out.push(`<i class="gap" style="flex:${s.g} 0 0"></i>`);
  });
  return `<div class="page-ribbon" aria-hidden="true">${out.join('')}</div>`;
}

/* --------------------------------------------------------------- */
/*  ملاحظات الوثائق الرسمية أسفل الجدول                             */
/* --------------------------------------------------------------- */

/**
 * سلّم فئات التقويم الختامي — الأربع بنود نفسها في كل استمارة ختامية
 * في وثائق «آليات التقييم»، وتأتي حرفية كما وردت.
 */
const FINAL_LEVEL_NOTES = [
  'أعلى من 40 درجة الطالب موهوب يحتاج برنامج فردي لتطوير موهبته',
  'من 36 إلى 40 درجة الطالب متقن يظهر إتقاناً للمهارات المطلوبة',
  'من 20 إلى 35 درجة الطالب اقترب من تحقيق الهدف يظهر أداء مقبولاً مع قابلية للتحسن',
  'أقل من 20 درجة الطالب دون الأهداف يحتاج خطة فردية للتطوير والمتابعة المستمرة',
];

/** قائمة الملاحظات الرسمية — تُطبع كما في الوثيقة */
function notesHtml(lines: string[]): string {
  return `<ol style="width:${lines.length > 1 ? '118mm' : '100mm'};margin:2.5mm 0 0 auto;padding-right:5.5mm;direction:rtl;font-size:9.5pt;line-height:1.65;color:${C.value}">
      ${lines.map((l) => `<li style="margin:0;padding:0">${esc(l)}</li>`).join('\n      ')}
    </ol>`;
}

/**
 * الشريط الزخرفي — مقاطع **مستخرجة من الكليشة الرسمية**
 * (`أساسيات الرسم وحدة 1 - مفرغ`) لا مرسومة بالتخمين ولا بالنظر.
 *
 * الأبعاد المقيسة: 4.99مم عرضاً × 98.55مم ارتفاعاً، على حافة اليسار.
 *
 * نرسمه مستطيلات CSS لا صورةً: الأصل نقطّي ضيّق، ولو صُغِّر كصورة
 * لخرج مموّهاً، أما المرسوم فيبقى كل حدّ فيه حادّاً على أي طابعة.
 *
 * ‏h = ارتفاع القطعة (بكسل الأصل) · w = عرضها بالمليمتر
 * ‏g = الفاصل الأبيض فوقها (بكسل الأصل)
 */
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

/** أبعاد الشريط بالمليمتر كما في الكليشة */
const RIBBON_W = 4.99;
const RIBBON_H = 98.55;

/* --------------------------------------------------------------- */
/*  جدول الفئات التفسيرية                                          */
/* --------------------------------------------------------------- */

function levelTableHtml(_total: number): string {
  /** جدول الفئات مرجعي محايد — بلا تظليل لدرجة الطالب */
  const rows: { label: string; range: string }[] = [
    { label: 'دون الهدف',            range: 'أقل من 8' },
    { label: 'يقترب من الهدف',       range: 'من 8 إلى أقل من 12' },
    { label: 'حقق الهدف',            range: 'من 12 إلى 15' },
    { label: 'يتخطى الهدف (موهوب)', range: 'أكثر من 15' },
  ];

  const tr = rows
    .map(
      (r) => `<tr style="height:19px">
        <td style="border:${B};padding:2px 6px;text-align:right;font-size:9pt;font-weight:400;background:${C.pinkSoft};color:${C.value};white-space:nowrap;line-height:1.2">${esc(r.label)}</td>
        <td style="border:${B};padding:2px 6px;text-align:right;font-size:9pt;font-weight:400;background:${C.pinkAlt};color:${C.value};white-space:nowrap;line-height:1.2">${esc(r.range)}</td>
      </tr>`
    )
    .join('');

  return `<div style="margin-top:9mm;display:flex;justify-content:center">
  <table style="width:86mm;border-collapse:collapse;direction:rtl;table-layout:fixed">
    <thead><tr style="height:20px">
      <th style="width:50%;background:${C.maroon};color:#ffffff;border:${B};padding:2px 7px;text-align:right;font-size:9.5pt;font-weight:900">الفئة</th>
      <th style="width:50%;background:${C.navy};color:#ffffff;border:${B};padding:2px 7px;text-align:center;font-size:9.5pt;font-weight:900;white-space:nowrap">المجموع من 20</th>
    </tr></thead>
    <tbody>${tr}</tbody>
  </table>
</div>`;
}

/* --------------------------------------------------------------- */
/*  جدول البنود                                                     */
/* --------------------------------------------------------------- */

function criteriaTableHtml(row: PrintRow, term: 'term1' | 'term2' | 'all'): string {
  const t = formTotals(row.kind, row.gradeId, row.subjectId, term);
  const isFinal = row.kind === 'final';
  const layout = sheetLayout(row.kind, row.gradeId, row.subjectId, term);

  /**
   * عمود الترقيم «م» موجود في وثيقة «نماذج التقييم» فقط (رابع + أول متوسط).
   * وثيقة «آليات التقييم» (خامس + ثاني متوسط) تُلغيه تماماً — والطباعة
   * بمخطّط غير مطابق يجعل الكليشة غير معتمدة.
   */
  const hasNum = layout === 'legacy';
  const textLabel = criteriaHeaderLabel(layout);

  const rowH = isFinal ? '7.5mm' : row.kind === 'periodic' ? '5.4mm' : '7mm';
  const txtFs = isFinal ? '10pt' : row.kind === 'periodic' ? '9.5pt' : '10.5pt';

  /**
   * نسب الأعمدة — **مقيسة من شبكة جدول Word** لا مقدَّرة.
   * الترتيب من اليمين، وقد يكون أوّله عمود ترقيم «م» إن كانت الوثيقة
   * التي جاءت منها المرحلة تحوي واحداً.
   */
  const w = tableColWidths(row.kind, row.gradeId, row.subjectId, hasNum, term);
  const o = hasNum ? 1 : 0;
  const wText = `${w[o]}%`;
  const wScaleCols = SCALE.map((_, i) => `${w[o + 1 + i]}%`);

  const txtPad = row.kind === 'periodic' ? '1px 5px' : '2px 7px';
  const txtLh = row.kind === 'periodic' ? 1.3 : 1.4;
  /**
   * خلفية عمود البنود — التقييم التكويني في كليشته أزرق باهت، بينما
   * المرحلي والختامي وردي كسائر خلايا الجدول.
   */
  const txtBg = row.kind === 'weekly' ? C.criteriaBg : C.pinkSoft;

  /**
   * خانة درجة الطالب.
   * السلم الرباعي: الدرجة 1-4 تحدّد عموداً واحداً فقط — الرقم أبيض على
   * عنّابي فيه، وبقية الأعمدة مربعات فارغة ☐ كما في الكليشة.
   */
  const mark = (v: number | undefined, w: string) => {
    const has = typeof v === 'number' && v > 0;
    return `<td style="width:${w};background:${has ? C.maroon : C.pink};border:${B};text-align:center;vertical-align:middle;padding:0;font-size:${has ? '13pt' : '11pt'};font-weight:900;color:${has ? '#ffffff' : '#9b757c'}">${has ? '&#10003;' : '&#9744;'}</td>`;
  };

  /**
   * خانة درجة الطالب في الاستمارة الختامية — **رقم** لا علامة.
   * السلم الرباعي يقبل العلامة ✓ لأنها تميّز مستوىً واحداً، أما الختامي
   * فدرجاته متغيّرة (٣..١٠) فلا يصلح أن نضع مكان الرقم علامة واحدة.
   */
  const markNum = (v: number | undefined, w: string) => {
    const has = typeof v === 'number' && v > 0;
    return `<td style="width:${w};background:${has ? C.maroon : C.pink};border:${B};text-align:center;vertical-align:middle;padding:0;font-size:${has ? '14pt' : '11pt'};font-weight:900;color:${has ? '#ffffff' : '#9b757c'}">${has ? v : '&#9744;'}</td>`;
  };

  // عمود «م» — ترقيم البنود، أول عمود على اليمين كما في الوثيقة التي فيها عمود
  const numHead = hasNum
    ? `<th style="width:4%;background:${C.navy};color:#ffffff;border:${B};padding:2px 1px;text-align:center;font-size:9.5pt;font-weight:900">م</th>`
    : '';
  const numCell = (i: number) =>
    hasNum
      ? `<td style="width:4%;background:${C.headPink};border:${B};text-align:center;vertical-align:middle;font-size:9.5pt;font-weight:900;color:${C.headText}">${ar(i + 1)}</td>`
      : '';

  const scaleHead = SCALE.map(
    (s, i) =>
      `<th style="width:${wScaleCols[i]};background:${C.crimson};color:#ffffff;border:${B};padding:2px 1px;text-align:center;font-size:9.5pt;font-weight:900;line-height:1.2">${esc(s.label)} (${s.n})</th>`
  ).join('');

  /** رأس جدول الختامي — موشرات التحقق · التحقق · القصوى · الطالب */
  const finalHeadHtml = (r: PrintRow, widths: number[]) => {
    const mx = maxColumnLabel(formTotals(r.kind, r.gradeId, r.subjectId, term).criteria);
    const cols: string[] = [];
    if (hasNum) cols.push(numHead);
    cols.push(
      `<th style="width:${widths[o]}%;background:${C.navy};color:#ffffff;border:${B};padding:3px 6px;text-align:right;font-size:11pt;font-weight:900">${esc(textLabel)}</th>`,
      `<th style="width:${widths[o + 1]}%;background:${C.navy};color:#ffffff;border:${B};padding:3px 3px;text-align:center;font-size:10pt;font-weight:900;line-height:1.25">درجة<br/>التحقق</th>`,
      `<th style="width:${widths[o + 2]}%;background:${C.navy};color:#ffffff;border:${B};padding:3px 3px;text-align:center;font-size:10pt;font-weight:900;line-height:1.25">${esc(mx)}</th>`,
      `<th style="width:${widths[o + 3]}%;background:${C.maroon};color:#ffffff;border:${B};padding:3px 3px;text-align:center;font-size:10pt;font-weight:900">درجة الطالب</th>`
    );
    return `<tr style="height:9mm">${cols.join('')}</tr>`;
  };

  /**
   * عرض الأعمدة يُكتب في <colgroup> لا في خلايا الرأس.
   *
   * السبب: مع table-layout:fixed يقيس المتصفّف الأعمدة من الصف الأول،
   * وخليط rowspan/colspan يجعل توزيعه غير موثوق — فينتشر عمود البنود
   * حتى ٣٪. و<col> هو المكان المعياري الذي يحترمه كل متصفّح.
   */
  const colgroup = `<colgroup>${
    hasNum ? '<col style="width:4%">' : ''
  }<col style="width:${wText}">${wScaleCols
    .map((x) => `<col style="width:${x}">`)
    .join('')}<col style="width:22%"><col style="width:28%"></colgroup>`;

  /**
   * «مستوى أداء المهارات» — الشريط العلوي لرأس جدول التقييم التكويني.
   * ---------------------------------------------------------------------------
   * مقيس من الكليشة الرسمية: الشريط يغطّي **أعمدة السلم الأربعة فقط**،
   * وعمود «موشرات التحقق» كتلٌةٌ كحلية تمتدّ رأسياً على الصفّين:
   *
   *   ┌───────────────────────────────┬──────────────┐
   *   │        مستوى أداء المهارات    │              │
   *   ├─────┬────┬──────┬─────┬───────┤ موشرات تحقق │
   *   │يتخطى٤│حقق٣│يقترب٢│دون١ │                  │
   *   └─────┴────┴──────┴─────┴───────┴──────────────┘
   *
   * ⚠ ول�� نُعيد البناء حرفياً بـ gridSpan=4 + vMerge يفسد توزيع الأعمدة
   *   تحت table-layout:fixed — جرّبناه وقِسنا: «موشرات التحقق» نزلت من
   *   212.5 إلى 187.9 بكسل و«دون الهدف» قفزت إلى 187.9 (المقياس 113.4).
   *   السبب أن الصف المدمج بلا خلية لـ«موشرات التحقق» يترك ذلك العمود
   *   بلا مرجع، فيوزّعه المتصفّح خطأً على عمود السلم المجاور.
   *
   * فنستخدم خليةً واحدة بامتداد الجدول كلها، ونرسم الحدّ الفاصل بتدرّج:
   *   ‎navy‎ عند أول `wText%` من اليمين، ثم عنّابي حتى الحافة اليسرى.
   * وبإخفاء الحدّ السفلي تحت عمود البنود (`border-bottom:none`) وبـ
   * `border-top:none` على خليته، تلتقي الكتلتان الكحليتان بلا خطّ بينهما,
   * فيصير عمود البنود مدمجاً رأسياً كما في الكليشة — والأعمدة مضبوطة.
   */
  const showGroupHead = layout === 'modern' && row.kind === 'weekly';

  /** عدد أعمدة الجدول — الخلية تمتدّ عليها كلها */
  const headCols = wScaleCols.length + (hasNum ? 1 : 0) + 1;

  const head = isFinal
    ? finalHeadHtml(row, w)
    : showGroupHead
      ? `<tr style="height:5mm"><th colspan="${headCols}" style="background:linear-gradient(to left, ${C.navy} 0%, ${C.navy} ${wText}, ${C.maroon} ${wText}, ${C.maroon} 100%);color:#ffffff;border:${B};border-bottom:none;padding:1.5px 0;font-size:10pt;font-weight:900;line-height:1.2"><span style="display:block;margin-right:${wText}">مستوى أداء المهارات</span></th></tr>
         <tr style="height:9mm">
           ${numHead}
           <th style="width:${wText};background:${C.navy};color:#ffffff;border:${B};border-top:none;padding:3px 7px;text-align:right;font-size:11pt;font-weight:900">${esc(textLabel)}</th>
           ${scaleHead}
           <th style="width:22%;background:${C.navy};color:#ffffff;border:${B};border-top:none;padding:3px 7px;text-align:center;font-size:11pt;font-weight:900">نسبة التحقق</th>
           <th style="width:28%;background:${C.navy};color:#ffffff;border:${B};border-top:none;padding:3px 7px;text-align:right;font-size:11pt;font-weight:900">ملاحظات المعلم/ـة</th>
         </tr>`
      : `<tr style="height:9mm">
          ${numHead}
          <th style="width:${wText};background:${C.navy};color:#ffffff;border:${B};padding:3px 7px;text-align:right;font-size:11pt;font-weight:900">${esc(textLabel)}</th>
          ${scaleHead}
          <th style="width:22%;background:${C.navy};color:#ffffff;border:${B};text-align:center;font-size:11pt;font-weight:900">نسبة التحقق</th>
          <th style="width:28%;background:${C.navy};color:#ffffff;border:${B};text-align:right;font-size:11pt;font-weight:900">ملاحظات المعلم/ـة</th>
        </tr>`;

  const body = t.criteria
    .map((crit, i) => {
      const v = row.evaluation.scores[crit.id];

      const text = `<td style="border:${B};background:${txtBg};padding:${txtPad};text-align:right;font-size:${txtFs};font-weight:700;color:${C.value};line-height:${txtLh};vertical-align:middle">${esc(crit.text)}</td>`;

      const cells = isFinal
        ? `<td style="width:${w[o + 1]}%;background:${C.pink};border:${B};text-align:center;vertical-align:middle;font-size:10.5pt;font-weight:900">${crit.pass ?? '—'}</td>
           <td style="width:${w[o + 2]}%;background:${C.pink};border:${B};text-align:center;vertical-align:middle;font-size:10.5pt;font-weight:900">${crit.max}</td>
           ${markNum(v, `${w[o + 3]}%`)}`
        : SCALE.map((s, i) => mark(v === s.n ? v : undefined, wScaleCols[i])).join('');

      // نسبة التحقق للعمود الجديد
      const pct = isFinal
        ? (typeof v === 'number' ? Math.round((v / crit.max) * 100) : 0)
        : (typeof v === 'number' ? Math.round((v / 4) * 100) : 0);

      const notesCell = `<td style="border:${B};padding:${txtPad};text-align:right;font-size:${txtFs};color:${C.value};line-height:${txtLh};vertical-align:middle;white-space:pre-line"></td>`;

      return `<tr style="height:${rowH}">${numCell(i)}${text}${cells}<td style="border:${B};padding:${txtPad};text-align:center;font-size:${txtFs};color:${C.value};background:${txtBg};vertical-align:middle">${pct > 0 ? ar(pct) : '—'}</td>${notesCell}</tr>`;
    })
    .join('');

  // صف المجموع في أسفل الجدول
  const totalRowTotal = sumScores(row.evaluation.scores, t.criteria);
  const totalRow = `<tr style="height:${rowH};background:${C.pinkAlt}">
    ${hasNum ? `<td style="border:${B};padding:${txtPad};text-align:center;font-weight:900;color:${C.value}"></td>` : ''}
    <td style="border:${B};padding:${txtPad};text-align:right;font-weight:900;color:${C.value}">المجموع</td>
    <td style="border:${B};padding:${txtPad};text-align:center;font-weight:900;color:${C.value}" colspan="${wScaleCols.length}"></td>
    <td style="border:${B};padding:${txtPad};text-align:center;font-weight:900;color:${C.value};background:${txtBg}">${ar(Math.round((totalRowTotal / t.actualMax) * 100))}</td>
    <td style="border:${B};padding:${txtPad};text-align:right;font-weight:900;color:${C.value}"></td>
  </tr>`;

  return `<table style="width:100%;border-collapse:collapse;direction:rtl;table-layout:fixed;border:1.25pt solid ${C.maroon}">
    ${colgroup}
    <thead>${head}</thead>
    <tbody>${body}${totalRow}</tbody>
  </table>`;
}

/* --------------------------------------------------------------- */
/*  صفحة واحدة                                                       */
/* --------------------------------------------------------------- */

/** لون العناوين — نفسه في عنوان الاستمارة وحقول البيانات (مقيس من PDF) */
const TITLE_INK = '#0F4761';

/**
 * سطر بيانات — العنوان أسود والقيمة بلون العنوان (#0F4761)، بلا خط فاصل.
 */
function fieldLine(label: string, value: string): string {
  return `<div style="display:flex;align-items:baseline;gap:5px;margin-top:4.5mm">
    <span style="font-size:12pt;font-weight:700;color:${C.text};white-space:nowrap">${esc(label)}</span>
    <span style="font-size:12pt;font-weight:700;color:${TITLE_INK};padding-bottom:1px">${esc(value || '—')}</span>
  </div>`;
}

function pageHtml(row: PrintRow, term: 'term1' | 'term2' | 'all'): string {
  const t = formTotals(row.kind, row.gradeId, row.subjectId, term);
  const total = sumScores(row.evaluation.scores, t.criteria);

  /* شريط المجموع — «المجموع: ١٩ من ٢٠» في سطر واحد، والرقم على النقاط */
  const capText = row.kind === 'weekly' ? '٢٠' : row.kind === 'final' ? '٥٠' : '٦٠';

  /** سطر المجموع الموحّد — الرقم يُكتب فوق النقاط نفسها بلا سطر ثانٍ */
  const sumRow = `<div style="display:flex;align-items:baseline;gap:5mm;margin-top:6mm;width:100%;margin-left:auto">
    <span style="font-size:11.5pt;font-weight:900;color:${C.value};white-space:nowrap">المجموع:</span>
    <span style="min-width:24mm;text-align:center;font-size:12.5pt;font-weight:900;color:${C.maroon};border-bottom:0.75pt dotted ${C.border}">${ar(total)}</span>
    <span style="font-size:11.5pt;font-weight:900;color:${C.value};white-space:nowrap">من ${capText}</span>
  </div>`;

  /** ملاحظات الوثيقة الرسمية — ختامية بعد المجموع، وتكوينية بعد جدول الفئات */
  const officialNotes =
    row.kind === 'final' ? notesHtml(FINAL_LEVEL_NOTES) : '';

  return `<div class="print-page">
  <!-- الشريط الزخرفي — مربعات ألوان الوزارة على يسار الصفحة -->
  ${ribbonHtml()}

  <!-- شعار وزارة الثقافة — مستخرج من الكليشة الرسمية -->
  <img class="moc-logo" src="${MOC_LOGO_DATA_URI}" alt="" />

  <!-- العنوان -->
  <h1 class="sheet-title">${esc(KIND_TITLE[row.kind])} ${esc(row.subjectName)}</h1>

  <!-- بيانات الطالب — عمودان كما في الكليشة -->
  <div class="sheet-fields">
    <div class="field-col">
      ${fieldLine('اسم المعلم:', row.evaluation.teacher)}
      ${fieldLine('التاريخ:', row.evaluation.date)}
    </div>
    <div class="field-col">
      ${fieldLine('اسم الطالب:', row.student.name)}
      ${
        /* «عنوان الوحدة الدراسية» للتقييم التكويني وحده — فالمرحلي والختامي
           يُنفَّذان على الفصل كلّه فلا وحدة لهما في الكليشة الرسمية. */
        row.kind === 'weekly'
          ? fieldLine('عنوان الوحدة الدراسية:', row.evaluation.label)
          : ''
      }
    </div>
  </div>

  <!-- جدول البنود -->
  ${criteriaTableHtml(row, term)}

  <!-- المجموع -->
  ${sumRow}

  <!-- جدول الفئات — للتقييم التكويني فقط (مقياس 20 درجة) -->
  ${row.kind === 'weekly' ? levelTableHtml(total) : ''}

  <!-- الملاحظات الرسمية — التقويم الختامي فقط -->
  ${officialNotes}

  <!-- قسم التوقيعات والملاحظات — كما في الورقة الرسمية -->
  <div style="margin-top:8mm;direction:rtl">
    <div style="text-align:right;font-size:12pt;font-weight:700;color:${TITLE_INK};margin-bottom:3mm">توقيع المعلم/ـة:</div>
    <div style="display:flex;justify-content:flex-end;gap:15mm;margin-bottom:8mm">
      <div style="text-align:right">
        <div style="border-bottom:0.75pt solid ${C.border};padding-bottom:1mm;width:45mm"></div>
        <div style="font-size:10pt;color:${C.value};margin-top:1mm">الاسم والتوقيع:</div>
      </div>
      <div style="text-align:right">
        <div style="border-bottom:0.75pt solid ${C.border};padding-bottom:1mm;width:45mm"></div>
        <div style="font-size:10pt;color:${C.value};margin-top:1mm">التاريخ:</div>
      </div>
    </div>

    <div style="text-align:right;font-size:12pt;font-weight:700;color:${TITLE_INK};margin-bottom:3mm">ملاحظات/targets:</div>
    <div style="border:${B};padding:6mm 8mm;text-align:right;font-size:11pt;color:${C.value};line-height:1.8;background:${C.pinkSoft};min-height:12mm;white-space:pre-line"></div>
  </div>

  <!-- التذييل — كما في الكليشة الرسمية: السطر الأول عريض والشريط الفاتح تحته -->
  <div class="sheet-foot">
    <div class="foot-en">
      <b>Ministry of Culture</b><br />
      King Faisal Road, Al Dirriyah<br />
      P.O. Box 3424, Riyadh 13711<br />
      Kingdom of Saudi Arabia
    </div>
    <div class="foot-mid">
      T +966 11 836 3352 م<br />
      F +966 11 836 3333 ف<br />
      moc.gov.sa
    </div>
    <div class="foot-ar">
      <b>وزارة الثقافة</b><br />
      طريق الملك فيصل، الدرعية<br />
      ص.ب. 3424، الرياض 13711<br />
      المملكة العربية السعودية
    </div>
  </div>
</div>`;
}

/* --------------------------------------------------------------- */
/*  المستند الكامل                                                   */
/* --------------------------------------------------------------- */

export function buildPrintHtml(
  rows: PrintRow[],
  term: 'term1' | 'term2' | 'all' = 'all'
): string {
  const pages = rows.map((r) => pageHtml(r, term)).join('\n');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>استمارة التقييم — ${esc(APP.title)}</title>
<style>
  /* ---------------------------------------------------------------
     الخط الرسمي: «سكال مجلّة» (Sakkal Majalla) — خط استمارات وزارة
     الثقافة. مضمّن Base64 لأن جهاز Android لا يحويه، فنضمن أن
     تُطبع الورقة من الجوال بنفس شكلها من الحاسوب.
     الأحجام والألوان مقيسة من ملف الـ PDF الرسمي:
       العنوان 14pt عريض · لون ‎#0F4761
       سطر المسار 14pt عريض · لون ‎#6E1946
       حقول الطالب 12pt · أسود
     --------------------------------------------------------------- */
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

  /* A4 بلا هوامش — الصفحة هي الكليشة نفسها */
  @page { size: A4 portrait; margin: 0; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${C.pageBg}; }

  body {
    font-family: 'Sakkal Majalla', 'Calibri', 'Noto Naskh Arabic',
                 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    color: ${C.text};
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-page {
    position: relative;
    width: 210mm;
    min-height: 297mm;                /* 페이지 تنمو إذا زاد المحتوى، ولا تُقصّ */
    padding: 11mm 12mm 8mm 14mm;      /* يسار أعرض لتفادي حافة الطباعة */
    margin: 0 0 8mm 0;                /* لا هوامش جانبية — الصفحة occupy العرض الكامل */
    background: ${C.sheet};
    overflow: visible;                /* لا تُقصّ المحتوى الزائد */
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
  }
  .print-page:last-child {
    page-break-after: auto;
    break-after: auto;
    margin-bottom: 0;                 /* الصفحة الأخيرة لا تضيف هامشاً سفلياً إضافياً */
  }

  /* الشريط الزخرفي — مربعات الألوان على حافة الصفحة اليسرى.
     الأبعاد من الكليشة الرسمية نفسها، ومرسوم مستطيلات لا صورة:
     يبقى كل حدّ حاداً مهما صغّره الطابع. */
  .page-ribbon {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: ${RIBBON_W}mm;
    height: ${RIBBON_H}mm;
    display: flex;
    flex-direction: column;
    /* ⚠ الصفحة كلها rtl، وflex-start في RTL ينحاذ إلى اليمين —
       فتصطف القطع من اليمين فتصير حافتها المستوية إلى الداخل.
       ltr هنا هو ما يجعل الحافة المستوية ملاصقة لحافة الصفحة، كما في الأصل. */
    direction: ltr;
    align-items: flex-start;
  }
  .page-ribbon i {
    display: block;
    min-height: 0;
  }
  .page-ribbon i.gap {
    width: 0;
    background: none;
  }

  /* شعار الوزارة أعلى اليمين */
  .moc-logo {
    position: absolute;
    top: 7mm;
    right: 11mm;
    height: 24mm;
    width: auto;
    object-fit: contain;
  }

  .sheet-title {
    margin: 19mm 0 0 0;
    text-align: center;
    font-size: 14pt;
    font-weight: 700;
    color: ${TITLE_INK};
    line-height: 1.45;
  }

  /* بيانات الطالب — عمودان كما في الكليشة.
     اتجاه الصفحة rtl يجعل أول عمود على اليمين، فنضع فيه المعلم والتاريخ. */
  .sheet-fields {
    margin-top: 5mm;
    margin-bottom: 9mm;
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 10mm;
    padding-right: 2mm;
  }
  .field-col { flex: 1; }

  table { page-break-inside: avoid; border-collapse: collapse; }
  tr    { page-break-inside: avoid; }
  th    { page-break-inside: avoid; }
  td    { page-break-inside: avoid; }

  /* التذييل — ثلاثة أعمدة كما في الكليشة: إنجليزي يسار · هاتف وسط · عربي يمين.
     اللون والحجم مقيسان من «أساسيات الرسم وحدة 1 - مفرغ» (الورقة الرسمية). */
  .sheet-foot {
    margin-top: auto;
    direction: ltr;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: start;
    column-gap: 4mm;
    padding: 3mm 3mm 0 3mm;
    font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
    font-size: 6.6pt;
    line-height: 1.45;
    color: ${C.navy};
  }
  .sheet-foot b { font-weight: 700; }

  .foot-en   { text-align: left;  direction: ltr; grid-column: 1; justify-self: start; }
  .foot-mid  { text-align: center; direction: ltr; grid-column: 2; justify-self: center; }
  .foot-ar   { text-align: right;  direction: rtl; grid-column: 3; justify-self: end; }


  @media print {
    .print-page { margin: 0 !important; box-shadow: none !important; }
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

/* --------------------------------------------------------------- */
/*  تحويل تقييمات التطبيق إلى صفوف طباعة                             */
/* --------------------------------------------------------------- */

export function toPrintRow(
  e: Evaluation,
  studentName: string,
  term: 'term1' | 'term2' | 'all' = 'all'
): PrintRow {
  return {
    student: { name: studentName, grade: e.grade_id },
    evaluation: {
      id: e.id,
      date: e.evaluation_date,
      label: e.label ?? '',
      scores: e.scores ?? {},
      teacher: e.teacher_name ?? '',
    },
    kind: e.evaluation_type,
    gradeId: e.grade_id,
    subjectId: e.subject_id,
    subjectName: subjectName(e.subject_id),
    gradeName: gradeName(e.grade_id),
  };
}

/** يُستخدم في المعاينة فقط */
export { RIBBON_DATA_URI };

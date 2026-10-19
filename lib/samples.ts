/**
 * أمثلة الاستمارات المطبوعة — لصفحة «الدخول كضيف».
 * ---------------------------------------------------------------------------
 * الزائر الذي لا يملك حساباً يرى ما سيحصل عليه: كليشة كل نوع تقييم
 * كما تُطبع تماماً، مبنية بنفس الدالة التي تبني ورقة المعلم.
 *
 * لماذا هذا مهم: كلمة «ضيف» تعني «لن assesses». فلو رأى شاشة فارغة
 * ظنّ أنّ التطبيق لا يعمل. أمّا هنا فيرى المنتج الحقيقي مطبوعاً
 * ويعرف ما الذي سيحصل بعد الدخول.
 *
 * الأرقام **مثالية لا عشوائية**: علامة على كل بند تُظهر عمل المعلم
 * كاملاً، ولون «يتخطى الهدف» يظهر في الورقة كما يظهر فعلياً.
 */

import { buildPrintHtml, type PrintRow } from '@/lib/print-html';
import {
  gradeName, subjectName, formTotals, sheetLayout, criteriaHeaderLabel,
} from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';

export interface SampleForm {
  /** مفتاح فريد للتنقّل */
  key: string;
  title: string;
  subtitle: string;
  /** وصف يشرح متى تُستخدم هذه الاستمارة */
  when: string;
  html: string;
}

/** طالب واحد يعرفه كل نموذج — أوضح للعين من أسماء مختلفة */
const DEMO_STUDENT = 'طالب / طالبة';

const DEMO_TEACHER = 'أ. أحمد فاروق';

/**
 * يبني علامة على كل بند: ٣ = «حقق الهدف».
 *
 * ولا نستخدم ٤ دائماً لأن ذلك يجعل كل الورقة بنفس اللون فيصير
 * المثال بلا تدرّج يُميَّز به.
 */
function demoScores(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  term: 'term1' | 'term2' | 'all'
): Record<string, number> {
  const t = formTotals(kind, gradeId, subjectId, term);
  const out: Record<string, number> = {};

  t.criteria.forEach((c, i) => {
    if (c.max > 4) {
      // الختامي: درجات تحقق رقمية — ندوّرها لتظهر كل المستويات
      out[c.id] = c.pass ?? 3;
      return;
    }
    // نوّع: ٣ غالباً، وواحد ٤ ليظهر «يتخطى الهدف» في موضع واحد
    out[c.id] = i === 1 ? 4 : 3;
  });

  return out;
}

function makeRow(
  gradeId: string,
  subjectId: string,
  kind: CriteriaKind,
  label: string,
  date: string,
  term: 'term1' | 'term2' | 'all'
): PrintRow {
  return {
    student: { name: DEMO_STUDENT, grade: gradeId },
    evaluation: {
      id: 'sample',
      date,
      label,
      scores: demoScores(kind, gradeId, subjectId, term),
      teacher: DEMO_TEACHER,
    },
    kind,
    gradeId: gradeId as never,
    subjectId: subjectId as never,
    subjectName: subjectName(subjectId),
    gradeName: gradeName(gradeId),
  };
}

/**
 * النماذج المعروضة.
 *
 * `grade_int2` (الصف الثاني المتوسط) للتissimo لأنها المرحلة التي يعمل
 * عليها أغلب المعلمين، و`grade_int1` لعرض التخطيط القديم — فالفرق
 * بينهما ليس في الشكل العام بل في رأس العمود الأول وعمود الترقيم،
 * ولا يُرى الفرق إلا بمقارنة نموذجين.
 */
const PLAN: {
  key: string;
  gradeId: string;
  subjectId: string;
  kind: CriteriaKind;
  title: string;
  when: string;
  label: string;
  date: string;
  term: 'term1' | 'term2';
}[] = [
  {
    key: 'weekly',
    gradeId: 'grade_int2',
    subjectId: 'drawing_basics',
    kind: 'weekly',
    title: 'استمارة التقييم التكويني',
    when: 'تُرصد في نهاية كل وحدة دراسية — درجتان أسبوعياً على مدى ١٥ أسبوعاً',
    label: 'الوحدة الأولى: أساسيات التحكم بالقلم والتقنيات اللونية في الرسم',
    date: '2026-09-24',
    term: 'term1',
  },
  {
    key: 'periodic',
    gradeId: 'grade_int2',
    subjectId: 'drawing_basics',
    kind: 'periodic',
    title: 'استمارة التقويم المرحلي',
    when: 'بعد مرور سبعة أسابيع — ١٥ مؤشراً تُقاس من ٦٠ وتُحوَّل إلى ٣٠',
    label: 'التقييم المرحلي',
    date: '2026-10-22',
    term: 'term1',
  },
  {
    key: 'final',
    gradeId: 'grade_int2',
    subjectId: 'drawing_basics',
    kind: 'final',
    title: 'استمارة التقويم الختامي',
    when: 'في نهاية الفصل — مشروع فني فردي يُقيَّم من ٥٠',
    label: 'التقييم الختامي',
    date: '2026-11-26',
    term: 'term1',
  },
  {
    key: 'legacy',
    gradeId: 'grade_int1',
    subjectId: 'drawing_basics',
    kind: 'weekly',
    title: 'التقييم التكويني — الصف الأول المتوسط',
    when: 'صيغة رابعة وأول متوسط: رأس العمود «المعيار» وعمود ترقيم «م»',
    label: 'الوحدة الأولى',
    date: '2026-09-24',
    term: 'term1',
  },
];

/** كل النماذج مع HTML جاهز للعرض */
let cache: SampleForm[] | null = null;

export function sampleForms(): SampleForm[] {
  if (cache) return cache;

  cache = PLAN.map((p) => {
    const row = makeRow(p.gradeId, p.subjectId, p.kind, p.label, p.date, p.term);
    const layout = sheetLayout(p.kind, p.gradeId, p.subjectId, p.term);
    const t = formTotals(p.kind, p.gradeId, p.subjectId, p.term);

    const subtitle = `${gradeName(p.gradeId)} · ${subjectName(p.subjectId)} · ${t.criteria.length} بند · ${t.actualMax} درجة`;

    return {
      key: p.key,
      title: p.title,
      subtitle,
      when: p.when,
      html: buildPrintHtml([row], p.term),
    };
  });

  return cache;
}

/** رأس العمود كما ورد في الوثيقة لذلك التخطيط — يُعرض تحت العنوان */
export function sampleHeaderLabel(key: string): string {
  const p = PLAN.find((x) => x.key === key);
  if (!p) return '';
  const layout = sheetLayout(p.kind, p.gradeId, p.subjectId, p.term);
  return criteriaHeaderLabel(layout);
}
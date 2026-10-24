/**
 * محرّك اختيار بنود التقييم + القواعد الرسمية للحساب
 * ---------------------------------------------------------------------
 * مبني على منطق التطبيق الأصلي (المستخرج من الـ APK) مع بنود الوثائق الرسمية.
 */

import { CRITERIA_BLOCKS, type CriteriaKind, type Criterion } from './criteria.data';

/* ------------------------------------------------------------------ */
/*  المراحل الدراسية                                                    */
/* ------------------------------------------------------------------ */

export const GRADES = [
  { id: 'grade4', name: 'الصف الرابع الابتدائي', stage: 'ابتدائي' },
  { id: 'grade5', name: 'الصف الخامس الابتدائي', stage: 'ابتدائي' },
  { id: 'grade_int1', name: 'الصف الأول المتوسط', stage: 'متوسط' },
  { id: 'grade_int2', name: 'الصف الثاني المتوسط', stage: 'متوسط' },
  /** معرّف قديم كان مستخدماً في التطبيق الأصلي — يُعامل كـ grade_int1 */
  { id: 'intermediate1', name: 'الصف الأول المتوسط (قديم)', stage: 'متوسط' },
] as const;

export type GradeId = (typeof GRADES)[number]['id'];

/** الوراثة: المرحلة ترث بنود المرحلة التي تسبقها */
const INHERITS: Record<string, string> = {
  grade5: 'grade4',
  grade_int2: 'grade_int1',
  intermediate1: 'grade_int1',
};

export const TERMS = [
  { id: 'term1', name: 'الفصل الدراسي الأول' },
  { id: 'term2', name: 'الفصل الدراسي الثاني' },
] as const;

export type TermId = (typeof TERMS)[number]['id'];

/* ------------------------------------------------------------------ */
/*  المقررات                                                            */
/* ------------------------------------------------------------------ */

export const SUBJECTS = [
  { id: 'drawing_basics', name: 'أساسيات الرسم', desc: 'مهارات وقواعد الرسم والمنظور والتظليل' },
  { id: 'saudi_arts', name: 'الفنون البصرية السعودية', desc: 'التراث والهوية التشكيلية السعودية' },
  { id: 'cartoon', name: 'الرسم الكرتوني', desc: 'رسم الشخصيات والتعابير الكرتونية' },
  { id: 'watercolor', name: 'الألوان المائية', desc: 'تقنيات ودمج الألوان المائية والشفافية' },
  { id: 'handicrafts', name: 'الأشغال اليدوية', desc: 'التشكيل والقص والأنشطة اليدوية' },
  { id: 'character_design', name: 'رسم وتصميم الشخصيات', desc: 'ابتكار وبناء الشخصيات الفنية' },
  { id: 'digital_drawing', name: 'الرسم الرقمي', desc: 'تقنيات وتطبيقات الرسم الرقمي (Procreate)' },
  { id: 'color_expression', name: 'التعبير اللوني', desc: 'التعبير بالألوان والتفكير اللوني' },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]['id'];

export function gradeName(id: string): string {
  return GRADES.find((g) => g.id === id)?.name ?? id;
}
export function subjectName(id: string): string {
  return SUBJECTS.find((s) => s.id === id)?.name ?? id;
}
export function gradeStage(id: string): string {
  return GRADES.find((g) => g.id === id)?.stage ?? '';
}

/**
 * خطة المقررات الرسمية — **مكتوبة يدوياً** كما وردت.
 * ---------------------------------------------------------------------------
 * كانت سابقاً *مشتقّة* من CRITERIA_BLOCKS، لكن الاشتقاق لا يميّز الفصل داخل
 * كتلة term = 'all'، فwere تُدرج «الفنون البصرية السعودية» في فصول لا
 * يدرّس فيها، ويُسقط «التعبير اللوني» لأنه بلا استمارة في الوثائق.
 *
 * الخطة الحقيقية مستقلة عن توفّر الاستمارات:
 *   • «التعبير اللوني» مقرر في رابع ف٢ وأول متوسط ف٢، ولا استمارة له في
 *     أي وثيقة — فيُدرَّس ولا يُقيَّم، ويعرض التطبيق ذلك صراحةً.
 *   • «الفنون البصرية السعودية» في رابع ف٢ وأول متوسط ف٢ فقط.
 */
const TERM_PLAN: Record<string, { term1: SubjectId[]; term2: SubjectId[] }> = {
  grade4: {
    term1: ['drawing_basics', 'cartoon', 'handicrafts'],
    term2: ['color_expression', 'drawing_basics', 'handicrafts', 'cartoon', 'saudi_arts'],
  },
  grade5: {
    term1: ['drawing_basics', 'cartoon', 'watercolor'],
    term2: ['watercolor', 'saudi_arts', 'drawing_basics'],
  },
  grade_int1: {
    term1: ['drawing_basics', 'digital_drawing', 'character_design'],
    term2: ['color_expression', 'drawing_basics', 'digital_drawing', 'saudi_arts', 'character_design'],
  },
  grade_int2: {
    term1: ['drawing_basics', 'digital_drawing', 'watercolor'],
    term2: ['watercolor', 'saudi_arts', 'drawing_basics', 'digital_drawing'],
  },
  // معرّف قديم كان مستخدماً في التطبيق الأصلي — يُعامل كـ grade_int1
  intermediate1: {
    term1: ['drawing_basics', 'digital_drawing', 'character_design'],
    term2: ['color_expression', 'drawing_basics', 'digital_drawing', 'saudi_arts', 'character_design'],
  },
};

/** خطة المقررات لكل (مرحلة × فصل) */
export const TERM_SUBJECTS = TERM_PLAN;

/** المقررات المتاحة لهذه المرحلة في فصل معيّن */
export function subjectsForGrade(
  gradeId: string,
  term: TermId | 'all' = 'all'
): SubjectId[] {
  const gid = normalizeGrade(gradeId);
  const plan = TERM_SUBJECTS[gid];
  if (plan) {
    return term === 'all' ? [...new Set([...plan.term1, ...plan.term2])] : plan[term];
  }
  // خطة غير موثّقة — نجمع مما وجدناه من بنود
  const set = new Set<SubjectId>();
  for (const blk of CRITERIA_BLOCKS) {
    if (blk.grade !== gid) continue;
    for (const kind of ['weekly', 'periodic', 'final'] as CriteriaKind[]) {
      for (const sid of Object.keys(blk[kind])) set.add(sid as SubjectId);
    }
  }
  if (set.size === 0) {
    const parent = INHERITS[gid];
    if (parent && TERM_SUBJECTS[parent]) return TERM_SUBJECTS[parent][term === 'all' ? 'term1' : term];
    return SUBJECTS.map((s) => s.id);
  }
  const arr = new Set(set);
  return SUBJECTS.map((s) => s.id).filter((id) => arr.has(id));
}

/** هل هذا المقرر يدرَّس في هذا الفصل لهذه المرحلة؟ */
export function subjectInTerm(gradeId: string, subjectId: string, term: TermId): boolean {
  const plan = TERM_SUBJECTS[normalizeGrade(gradeId)];
  if (!plan) return true;
  return plan[term].includes(subjectId as SubjectId);
}

/** اسم المقرر كما يظهر في تلك المرحلة (بعض المقررات لها اسم مختلف) */
export function subjectNameForGrade(gradeId: string, subjectId: string): string {
  const s = SUBJECTS.find((x) => x.id === subjectId);
  return s?.name ?? subjectId;
}

/* ------------------------------------------------------------------ */
/*  تخطيط الاستمارة الرسمي — يختلف بين ملفَّي الوثائق الرسميين         */
/* ------------------------------------------------------------------ */

/**
 * الوثائق الرسمية مصدرها ملفّان بتنسيقين مختلفين تماماً، والتطبيق يطبع
 * كل مرحلة بالتنسيق الذي جاءت منه بنودها في الوثيقة:
 *
 *   • source: 'doc06' — «نماذج التقييم للفنون البصرية» (رابع + أول متوسط)
 *       جدول فيه عمود ترقيم «#» على اليمين، ورأس العمود الأول «المعيار».
 *
 *   • source: 'doc05' — «آليات التقييم والتقويم» (خامس + ثاني متوسط)
 *       **بلا عمود ترقيم**، ورأس العمود الأول «موشرات التحقق»،
 *       والتقييم الأسبوعي فيه صفّ رأس مُدمج بعنوان «مستوى أداء المهارات».
 *
 * طباعة التخطيط الخاطئ يعني كليشة لا تطابق الوثيقة التي اعتمدها المعلم.
 */
export type SheetLayout = 'legacy' | 'modern';

/** الوثيقة التي جاءت منها بيانات كتلة معيّنة */
export function criteriaSource(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  term: TermId | 'all' = 'all'
): string {
  const gid = normalizeGrade(gradeId);

  const hit = (g: string): string | undefined => {
    for (const b of CRITERIA_BLOCKS) {
      if (b.grade !== g) continue;
      if (term !== 'all' && b.term !== term && b.term !== 'all') continue;
      if (b[kind]?.[subjectId]?.length) return b.source;
    }
    return undefined;
  };

  return hit(gid) ?? (INHERITS[gid] ? hit(INHERITS[gid]) : undefined) ?? 'doc05';
}

/**
 * التخطيط يتبع **مصدر البيانات** لا اسم المرحلة.
 *
 * الفارق ليس أكيداً: «آليات التقييم» بلا عمود ترقيم، و«نماذج التقييم»
 * فيه واحد. وثائق «آليات التقييم» لا تغطّي التقييم التكويني لثاني متوسط،
 * فيرثه التطبيق من «نماذج التقييم» — فتكون بنوده من THERE، فتُعرض
 * بتخطيطها (بعمود «م») لا بتخطيط المرحلة.
 */
export function sheetLayout(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  term: TermId | 'all' = 'all'
): SheetLayout {
  return criteriaSource(kind, gradeId, subjectId, term) === 'doc06' ? 'legacy' : 'modern';
}

/** عنوان عمود البنود كما ورد في الوثيقة لذلك التخطيط */
export function criteriaHeaderLabel(layout: SheetLayout): string {
  return layout === 'legacy' ? 'المعيار' : 'موشرات التحقق';
}

/** رأس عمود الدرجة القصوى — كل استمارة ختامية تحمل صياغتها الخاصة */
export function maxColumnLabel(criteria: Criterion[]): string {
  return criteria.find((c) => c.maxLabel)?.maxLabel ?? 'الدرجة القصوى';
}

/**
 * نسب عرض أعمدة جدول التقييم — **مقيسة من شبكة جداول Word** لا مقدَّرة،
 * ومرتّبة من اليمين إلى اليسار.
 *
 * كل استمارة في الوثائق لها عروض مختلفة فعلاً:
 *   • الختامي: موشرات التحقق بين 45.6% و 52.2% · الطالب بين 12.3% و 17.1%
 *   • المرحلي: المعيار 36.7–45.8% وأعمدة السلم غير متساوية (10–17.8%)
 *   • التكويني: المعيار 30.6% في «آليات التقييم» و 32.4% في «نماذج التقييم»
 * فليست أرقاماً ثابتة — ولهذا نجعلها من البيانات لا من CSS.
 *
 * المعامل `hasNum` يوافق المصفوفة مع التخطيط: فبعض الكتل بلا عمود ترقيم
 * (doc05) وبعضها به (doc06)، وقد تُورَث الكتلة من وثيقة غير التي تعود
 * إليها المرحلة — فنُسقط عمود «م» إن لم يُرسَم أو نضيفه إن كان مطلوباً.
 */
export function tableColWidths(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  hasNum: boolean,
  term: TermId | 'all' = 'all'
): number[] {
  const gid = normalizeGrade(gradeId);

  const find = (g: string): number[] | undefined => {
    for (const b of CRITERIA_BLOCKS) {
      if (b.grade !== g) continue;
      // الطلب لـ«كل الفصول» يمرّ على كل الكتل بلا استثناء
      if (term !== 'all' && b.term !== term && b.term !== 'all') continue;
      const c = b.cols?.[kind]?.[subjectId];
      if (c?.length) return c;
    }
    return undefined;
  };

  const cols = find(gid) ?? (INHERITS[gid] ? find(INHERITS[gid]) : undefined);
  if (!cols) return hasNum ? NUM_COL_FALLBACK[kind] : NO_NUM_FALLBACK[kind];

  // عدد الأعمدة بلا «م»: البنود + ٤ مستويات (تكويني ومرحلي)،
  // أو البنود + ٣ درجات (ختامي). عمود «م» إن وُجد فهو **الأول**
  // لأنه على يمين الجدول في النص العربي.
  const base = kind === 'final' ? 4 : 5;
  const core = cols.length > base ? cols.slice(cols.length - base) : cols;

  if (core.length === base) {
    if (!hasNum) return core;
    const sum = core.reduce((a, b) => a + b, 0) || 1;
    return [4.5, ...core.map((x) => Math.round((x / sum) * 95.5 * 10) / 10)];
  }
  const sum = core.reduce((a, b) => a + b, 0) || 1;
  return core.map((x) => Math.round((x / sum) * 100 * 10) / 10);
}

const NUM_COL_FALLBACK: Record<CriteriaKind, number[]> = {
  weekly: [4.5, 32.4, 15.8, 15.8, 15.8, 15.8],
  periodic: [4.3, 45.8, 12.5, 12.5, 12.5, 12.5],
  final: [4.5, 56.8, 12, 13.3, 13.3],
};

const NO_NUM_FALLBACK: Record<CriteriaKind, number[]> = {
  weekly: [30.6, 16.3, 19.3, 16.3, 17.5],
  periodic: [38, 13.8, 17.8, 14.3, 16],
  final: [51.5, 15.2, 16.2, 17.1],
};

/* ------------------------------------------------------------------ */
/*  أنواع التقييم                                                       */
/* ------------------------------------------------------------------ */

export const EVAL_KINDS = [
  {
    id: 'weekly' as CriteriaKind,
    name: 'التقييم التكويني',
    title: 'التقييم التكويني (التقييم الأسبوعي - 20 درجة)',
    officialMax: 20,
    scale: 4,
    description:
      'يُرصد أسبوعياً (درجتان أسبوعياً على مدى 15 أسبوعاً)، ويُحوَّل إلى درجة معيارية من 2.',
    scaleLabel: '1 = غير متقن · 2 = يقترب · 3 = حقق · 4 = تجاوز',
  },
  {
    id: 'periodic' as CriteriaKind,
    name: 'التقويم المرحلي',
    title: 'التقويم المرحلي (60 درجة)',
    officialMax: 60,
    scale: 4,
    description:
      'يُنفَّذ بعد مرور سبعة أسابيع لرصد أي تأخر مبكر في الأداء، ويُحوَّل إلى درجة من 30.',
    scaleLabel: '1 = دون الهدف · 2 = يقترب · 3 = حقق · 4 = يتخطى',
  },
  {
    id: 'final' as CriteriaKind,
    name: 'التقويم الختامي',
    title: 'التقويم الختامي (50 درجة)',
    officialMax: 50,
    scale: null,
    description:
      'يُنفَّذ في نهاية الوحدة أو الفصل اعتماداً على أنشطة تطبيقية عملية يقيس مستوى إتقان المهارات.',
    scaleLabel: 'درجة قصوى + درجة تحقق لكل بند',
  },
] as const;

export type EvalKindId = CriteriaKind;

export function kindMeta(id: CriteriaKind) {
  return EVAL_KINDS.find((k) => k.id === id)!;
}

/**
 * إجمالي بنود التقييم المضمّنة — يُحسب من البيانات لا يُكتب يدوياً،
 * حتى لا يتقدّم عدّاد الواجهة عن المحتوى الفعلي.
 */
export const CRITERIA_COUNT = CRITERIA_BLOCKS.reduce(
  (n, b) =>
    n +
    (['weekly', 'periodic', 'final'] as CriteriaKind[]).reduce(
      (m, k) => m + Object.values(b[k]).reduce((x, a) => x + a.length, 0),
      0
    ),
  0
);

/* ------------------------------------------------------------------ */
/*  اختيار البنود                                                       */
/* ------------------------------------------------------------------ */

function normalizeGrade(gradeId: string): string {
  return gradeId === 'intermediate1' ? 'grade_int1' : gradeId;
}

/**
 * يختار بنود التقييم المناسبة.
 * يطبّق الوراثة: grade_int2 يرث grade_int1، grade5 يرث grade4.
 */
export function resolveCriteria(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  term: TermId | 'all' = 'all'
): Criterion[] {
  const gid = normalizeGrade(gradeId);

  // 1) المرحلة + الفصل المحددان
  const exact = CRITERIA_BLOCKS.find(
    (b) => b.grade === gid && (b.term === term || b.term === 'all')
  );
  const hit = exact?.[kind]?.[subjectId];
  if (hit?.length) return hit;

  // 2) المرحلة نفسها في فصل آخر
  for (const b of CRITERIA_BLOCKS) {
    if (b.grade === gid && b[kind]?.[subjectId]?.length) return b[kind][subjectId];
  }

  // 3) الوراثة من المرحلة السابقة
  const parent = INHERITS[gid];
  if (parent) {
    for (const b of CRITERIA_BLOCKS) {
      if (b.grade === parent && b[kind]?.[subjectId]?.length) return b[kind][subjectId];
    }
  }

  return [];
}

/** هل تتوفر بنود لهذا المقرر؟ */
export function hasCriteria(kind: CriteriaKind, gradeId: string, subjectId: string): boolean {
  return resolveCriteria(kind, gradeId, subjectId).length > 0;
}

/* ------------------------------------------------------------------ */
/*  المجاميع والتحويل                                                   */
/* ------------------------------------------------------------------ */

export interface FormTotals {
  criteria: Criterion[];
  /** المجموع الفعلي لبنود الاستمارة */
  actualMax: number;
  /** المجموع الرسمي المذكور في الوثيقة (20 / 60 / 50) */
  officialMax: number;
  /** فرق بين المجموعين (0 إذا كان الاستمارة سليمة) */
  delta: number;
  /** مجموع درجات التحقق (للاستمارات الختامية) */
  passMax: number;
}

export function formTotals(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: string,
  term: TermId | 'all' = 'all'
): FormTotals {
  const criteria = resolveCriteria(kind, gradeId, subjectId, term);
  const actualMax = criteria.reduce((s, c) => s + c.max, 0);
  const passMax = criteria.reduce((s, c) => s + (c.pass ?? 0), 0);
  // نوع غير معروف (سجل قديم/تالف) لا يجب أن يُسقط الشاشة.
  const meta = EVAL_KINDS.find((k) => k.id === kind);
  const officialMax = meta ? meta.officialMax : actualMax;
  return { criteria, actualMax, officialMax, delta: actualMax - officialMax, passMax };
}

/** مجموع درجات الطالب من البنود */
export function sumScores(scores: Record<string, number | undefined>, criteria: Criterion[]): number {
  return criteria.reduce((s, c) => s + (scores[c.id] ?? 0), 0);
}

/** مجموع درجات التحقق المحققة */
export function sumPassScores(
  scores: Record<string, number | undefined>,
  criteria: Criterion[]
): number {
  return criteria.reduce((s, c) => {
    const v = scores[c.id] ?? 0;
    return s + (v >= (c.pass ?? c.max) ? (c.pass ?? c.max) : 0);
  }, 0);
}

/**
 * الدرجة المحوّلة من 30 للتقويم المرحلي.
 * المعادلة الرسمية: (درجة الطالب من 60 ÷ 45) × 30
 * مع السقف عند 30.
 */
export function convertTo30(score: number): number {
  return Math.min(30, Number(((score / 45) * 30).toFixed(2)));
}

/**
 * الدرجة المعيارية من 2 للتقييم التكويني.
 * المعادلة الرسمية: الدرجة ÷ 15 × 2، مع السقف عند 2.
 */
export function convertTo2(score: number): string {
  if (score >= 15) return '2.00';
  return (score * 0.1333).toFixed(2);
}

/* ------------------------------------------------------------------ */
/*  الفئات التفسيرية — مطابقة للوثائق                                   */
/* ------------------------------------------------------------------ */

export interface Level {
  key: 'gifted' | 'achieved' | 'approaching' | 'below';
  label: string;
  color: string;
  bg: string;
}

export function levelFor(kind: CriteriaKind, score: number): Level | null {
  if (score <= 0) return null;

  if (kind === 'weekly') {
    // المجموع من 20
    if (score > 15)
      return { key: 'gifted', label: 'يتخطى الهدف (موهوب)', color: '#9056A1', bg: '#F3ECF5' };
    if (score >= 12) return { key: 'achieved', label: 'حقق الهدف', color: '#1B7A42', bg: '#E2F1E7' };
    if (score >= 8) return { key: 'approaching', label: 'يقترب من الهدف', color: '#96650A', bg: '#F6EEDD' };
    return { key: 'below', label: 'دون الهدف', color: '#C03944', bg: '#FBEAEA' };
  }

  if (kind === 'periodic') {
    // المجموع من 60
    if (score > 45) return { key: 'gifted', label: 'يتخطى الهدف', color: '#9056A1', bg: '#F3ECF5' };
    if (score >= 39) return { key: 'achieved', label: 'حقق الهدف', color: '#1B7A42', bg: '#E2F1E7' };
    if (score >= 31) return { key: 'approaching', label: 'يقترب من الهدف', color: '#96650A', bg: '#F6EEDD' };
    return { key: 'below', label: 'لم يحقق الهدف', color: '#C03944', bg: '#FBEAEA' };
  }

  // final — المجموع من 50
  if (score > 40) return { key: 'gifted', label: 'موهوب — يحتاج برنامج فردي', color: '#9056A1', bg: '#F3ECF5' };
  if (score >= 36)
    return { key: 'achieved', label: 'متقن — يُظهر إتقاناً للمهارات', color: '#1B7A42', bg: '#E2F1E7' };
  if (score >= 20)
    return { key: 'approaching', label: 'اقترب من الهدف — أداء مقبول', color: '#96650A', bg: '#F6EEDD' };
  return { key: 'below', label: 'دون الأهداف — خطة فردية', color: '#C03944', bg: '#FBEAEA' };
}

/* ------------------------------------------------------------------ */
/*  جداول التحويل المرجعية (من الوثائق)                                  */
/* ------------------------------------------------------------------ */

/** التحويل من 20 إلى 2 — التقييم التكويني */
export const CONVERSION_20_2: { from20: number; to2: number; level: string }[] = [
  { from20: 0, to2: 0.0, level: 'دون الهدف' },
  { from20: 1, to2: 0.13, level: 'دون الهدف' },
  { from20: 2, to2: 0.27, level: 'دون الهدف' },
  { from20: 3, to2: 0.4, level: 'دون الهدف' },
  { from20: 4, to2: 0.53, level: 'دون الهدف' },
  { from20: 5, to2: 0.67, level: 'دون الهدف' },
  { from20: 6, to2: 0.8, level: 'دون الهدف' },
  { from20: 7, to2: 0.93, level: 'دون الهدف' },
  { from20: 8, to2: 1.07, level: 'يقترب من الهدف' },
  { from20: 9, to2: 1.2, level: 'يقترب من الهدف' },
  { from20: 10, to2: 1.33, level: 'يقترب من الهدف' },
  { from20: 11, to2: 1.47, level: 'يقترب من الهدف' },
  { from20: 12, to2: 1.6, level: 'حقق الهدف' },
  { from20: 13, to2: 1.73, level: 'حقق الهدف' },
  { from20: 14, to2: 1.87, level: 'حقق الهدف' },
  { from20: 15, to2: 2.0, level: 'حقق الهدف' },
  { from20: 16, to2: 2.0, level: 'يتخطى الهدف (موهوب)' },
  { from20: 17, to2: 2.0, level: 'يتخطى الهدف (موهوب)' },
  { from20: 18, to2: 2.0, level: 'يتخطى الهدف (موهوب)' },
  { from20: 19, to2: 2.0, level: 'يتخطى الهدف (موهوب)' },
  { from20: 20, to2: 2.0, level: 'يتخطى الهدف (موهوب)' },
];

/* ------------------------------------------------------------------ */
/*  إعدادات التطبيق                                                     */
/* ------------------------------------------------------------------ */

export const APP = {
  title: 'بوابة تقييم الفنون البصرية',
  subtitle: 'مشروع تشغيل المدارس الثقافية الحكومية',
  author: 'الأستاذ / أحمد فاروق',
  labelPlaceholder: 'مثال: الوحدة الأولى...',
} as const;

export const ROUND_OPTIONS = [
  { value: 'all', label: 'كل التقييمات المسجلة' },
  { value: 'latest', label: 'آخر تقييم فقط' },
  { value: 'التقييم الأول', label: 'التقييم الأول' },
  { value: 'التقييم الثاني', label: 'التقييم الثاني' },
  { value: 'التقييم الثالث', label: 'التقييم الثالث' },
] as const;

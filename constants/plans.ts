/**
 * خطة التقييم السنوية — توليد استمارات جاهزة مسبقاً.
 * ---------------------------------------------------------------------------
 * لكل (مقرر × فصل دراسي) يُولَّد لكل طالب:
 *
 *   • التقييم التكويني : وحدة لكل وحدة دراسية
 *   • التقويم المرحلي  : استمارة واحدة
 *   • التقويم الختامي  : استمارة واحدة
 *
 * الاستمارات تُولَّد فارغة (بلا علامات) فيدخل المعلم و Puttingها
 * في وقتها المناسب، ثم تُخرَج المطبوعة النهائية.
 *
 * عدد الوحدات مستنتج من التقييمات المرحَّلة من السيرفر القديم:
 *   • أساسيات الرسم : 4 وحدات (وحداته الأربع مسمّاة في السجل)
 *   • بقية المقررات : 3 وحدات (التقييم الأول / الثاني / الثالث)
 */

import type { SubjectId } from './criteria';

/* ------------------------------------------------------------------ */
/*  عدد الوحدات الدراسية لكل مقرر                                     */
/* ------------------------------------------------------------------ */

export const UNITS_PER_SUBJECT: Record<SubjectId, number> = {
  drawing_basics: 4,
  cartoon: 3,
  saudi_arts: 3,
  watercolor: 3,
  handicrafts: 3,
  character_design: 3,
  digital_drawing: 3,
  // مقرر بلا استمارة رسمية — الرقمي احتياط فقط
  color_expression: 3,
};

export function unitCount(subjectId: SubjectId): number {
  return UNITS_PER_SUBJECT[subjectId] ?? 3;
}

/* ------------------------------------------------------------------ */
/*  عناوين الوحدات                                                     */
/* ------------------------------------------------------------------ */

const ORDINAL = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];

/** عناوين مخصّصة لأساسيات الرسم — منقولة كما وردت في السجل المرحَّل */
const DRAWING_UNIT_TITLES: Record<number, string> = {
  1: 'أساسيات التحكم بالقلم والتقنيات اللونية في الرسم',
  2: 'رسم وتلوين ودمج الأشكال الهندسية',
  3: 'التظليل وتقنيات إبراز العمق في الرسم',
  4: 'الرسم من الواقع والطبيعة باستخدام التظليل',
};

export function unitLabel(subjectId: SubjectId, unit: number): string {
  if (subjectId === 'drawing_basics' && DRAWING_UNIT_TITLES[unit]) {
    return `الوحدة ${ORDINAL[unit] ?? unit}: ${DRAWING_UNIT_TITLES[unit]}`;
  }
  return `الوحدة ${ORDINAL[unit] ?? unit}`;
}

export const PERIODIC_LABEL = 'التقييم المرحلي';
export const FINAL_LABEL = 'التقييم الختامي';

/** عنوان الاستمارة المولَّدة حسب نوعها */
export function plannedLabel(
  kind: 'weekly' | 'periodic' | 'final',
  subjectId: SubjectId,
  unit: number
): string {
  if (kind === 'weekly') return unitLabel(subjectId, unit);
  return kind === 'periodic' ? PERIODIC_LABEL : FINAL_LABEL;
}

/* ------------------------------------------------------------------ */
/*  معرّف ثابت — يضمن عدم التكرار عند إعادة التوليد                    */
/* ------------------------------------------------------------------ */

export function plannedId(params: {
  studentId: string;
  gradeId: string;
  term: string;
  subjectId: string;
  kind: string;
  unit: number;
}): string {
  const { studentId, gradeId, term, subjectId, kind, unit } = params;
  const u = kind === 'weekly' ? `u${unit}` : 'x';
  return `plan:${gradeId}:${term}:${subjectId}:${kind}:${u}:${studentId}`;
}

/* ------------------------------------------------------------------ */
/*  مطابقة التقييمات القديمة بالوحدات                                  */
/* ------------------------------------------------------------------ */

/** يوحّد الكتابة: تشكيل، ألف بأشكالها، ى→ي، ة→ه، تطويل */
function stripArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * قاموس الكلمات الترتيبية — مكتوب بالشكل الموحّد بعد stripArabic.
 *   الأولى → الاولي   الثانية → الثانيه   الثالثة → الثالثه …
 */
const ORD_WORDS: Record<string, number> = {
  الاولي: 1, الثانيه: 2, الثالثه: 3, الرابعه: 4, الخامسه: 5,
  الاول: 1, الثاني: 2, الثالث: 3, الرابع: 4, الخامس: 5,
};

/** كلمات دالة على بداية الوصف —Shapes موحّدة */
const UNIT_WORDS = ['الوحده الدراسيه', 'الوحده', 'التقييم'];

/**
 * يستخرج رقم الوحدة من عنوان التقييم القديم.
 *
 * التقييمات المرحَّلة استعملت صيغاً مختلفة:
 *   «الوحدة الاولى» · «الوحده الثانيه» · «الوحده الثالثه » · «التقييم الأول»
 * وكلها تشير إلى الوحدة نفسها، فنوحّدها هنا حتى لا نولّد استمارة فارغة
 * بجانب تقييم قائم لنفس الوحدة.
 *
 * يعيد null إذا لم يُعرف رقم الوحدة.
 */
export function unitFromLabel(label: string): number | null {
  if (!label) return null;
  const s = stripArabic(label);

  for (const w of UNIT_WORDS) {
    const idx = s.indexOf(w);
    if (idx === -1) continue;
    const after = s.slice(idx + w.length).trim();
    const word = (after.split(/[\s:،,]/)[0] ?? '').trim();
    const n = ORD_WORDS[word];
    if (n) return n;
  }
  return null;
}
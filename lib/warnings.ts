/**
 * تنبيهات جودة البيانات
 * ---------------------------------------------------------------------------
 * بعض الاستمارات الواردة في الوثائق الرسمية تحتوي تناقضات رقمية:
 *   1) مجموع درجات البنود لا يساوي المجموع الرسمي (50).
 *   2) درجة التحقق أكبر من الدرجة القصوى في بند واحد.
 *
 * التطبيق لا يعدّل القيم — يعرضها كما وردت — لكن ينبّه المعلم عند فتح الاستمارة.
 * الحساب يستخدم المجموع الفعلي للبنود حتى لا يظهر الطالب درجة متناقضة.
 */

import { formTotals, levelFor, convertTo2, convertTo30, sumScores, type FormTotals } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import type { GradeId, SubjectId } from '@/constants/criteria';

export type WarningLevel = 'info' | 'warn' | 'error';

export interface DataWarning {
  level: WarningLevel;
  title: string;
  detail: string;
  /** اسم البند المسبب (إن وُجد) */
  criterionText?: string;
}

/** كل التنبيهات الخاصة باستمارة معيّنة */
export function formWarnings(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: SubjectId,
  term: 'term1' | 'term2' | 'all' = 'all'
): DataWarning[] {
  const t: FormTotals = formTotals(kind, gradeId, subjectId, term);
  const out: DataWarning[] = [];

  // 1) فرق المجموع
  if (t.delta !== 0) {
    const dir = t.delta < 0 ? 'أقل' : 'أعلى';
    out.push({
      level: 'warn',
      title: 'مجموع بنود الاستمارة لا يساوي المجموع الرسمي',
      detail:
        `مجموع درجات البنود في هذه الاستمارة ${t.actualMax} درجة، ` +
        `والمجموع الرسمي المذكور في الوثيقة ${t.officialMax} درجة ` +
        `(${Math.abs(t.delta)} ${dir}). ` +
        `سيتم اعتماد مجموع البنود الفعلي (${t.actualMax}) في حساب الطالب. ` +
        `يُنصح بمراجعة الوثيقة الرسمية.`,
    });
  }

  // 2) درجة تحقق أكبر من القصوى
  for (const c of t.criteria) {
    if (c.pass != null && c.pass > c.max) {
      out.push({
        level: 'error',
        title: 'درجة التحقق أكبر من الدرجة القصوى',
        detail:
          `البند «${c.text}» يحمل درجة قصوى ${c.max} ودرجة تحقق ${c.pass}. ` +
          `القيمة غير منطقية وقد تكون مقلوبة في الوثيقة (الصحيح ${c.pass} قصوى و ${c.max} تحقق). ` +
          `ستُستخدم الدرجة القصوى ${c.max} في احتساب الطالب.`,
        criterionText: c.text,
      });
    }
  }

  // 3) بنود بلا درجة تحقق في التقويم الختامي
  if (kind === 'final') {
    const missing = t.criteria.filter((c) => c.pass == null);
    if (missing.length) {
      out.push({
        level: 'info',
        title: 'بنود بلا درجة تحقق',
        detail: `${missing.length} من ${t.criteria.length} بنداً لا يذكر له في الوثيقة درجة تحقق. تم اعتماد الدرجة القصوى كدرجة تحقق لهذه البنود.`,
      });
    }
  }

  return out;
}

/** هل هناك تنبيه يمنع فتح الاستمارة؟ */
export function hasBlockingWarning(ws: DataWarning[]): boolean {
  return ws.some((w) => w.level === 'warn' || w.level === 'error');
}

/* ------------------------------------------------------------------ */
/*  نتيجة التقييم                                                       */
/* ------------------------------------------------------------------ */

export interface EvalResult {
  /** المجموع الفعلي لبنود الاستمارة */
  max: number;
  /** المجموع الرسمي من الوثيقة */
  officialMax: number;
  /** درجة الطالب */
  score: number;
  /** النسبة المئوية على المجموع الفعلي */
  percent: number;
  /** المستوى التفسيري */
  level: ReturnType<typeof levelFor>;
  /** الدرجة المحوّلة — فقط لأنواع التقييم التي لها تحويل */
  converted: { label: string; value: string } | null;
  /** عدد البنود التي لم تُقيَّم */
  unrated: number;
  warnings: DataWarning[];
}

export function evaluateForm(
  kind: CriteriaKind,
  gradeId: string,
  subjectId: SubjectId,
  scores: Record<string, number | undefined>,
  term: 'term1' | 'term2' | 'all' = 'all'
): EvalResult {
  const t = formTotals(kind, gradeId, subjectId, term);
  const score = sumScores(scores, t.criteria);
  const unrated = t.criteria.filter((c) => scores[c.id] === undefined || scores[c.id] === null).length;

  let converted: EvalResult['converted'] = null;
  if (kind === 'weekly') {
    converted = { label: 'الدرجة المعيارية من 2', value: convertTo2(score) };
  } else if (kind === 'periodic') {
    converted = { label: 'الدرجة المحوّلة من 30', value: convertTo30(score).toFixed(2) };
  }

  return {
    max: t.actualMax,
    officialMax: t.officialMax,
    score,
    percent: t.actualMax > 0 ? Math.round((score / t.actualMax) * 100) : 0,
    level: levelFor(kind, score),
    converted,
    unrated,
    warnings: formWarnings(kind, gradeId, subjectId, term),
  };
}

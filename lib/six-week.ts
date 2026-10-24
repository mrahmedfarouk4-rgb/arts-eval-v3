/**
 * تقرير الـ ٦ أسابيع — تقييم وصفي بلا درجات.
 * ---------------------------------------------------------------------------
 * تقرير واحد لكل طالب يجمع المقررات المختارة وتقديراً وصفياً وملاحظات،
 * مستقل عن تقييمات weekly/periodic/final ولا يدخل في أي مجموع.
 * يُحفظ محلياً في AsyncStorage بجانب بقية بيانات التطبيق.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeId, TermId } from '@/constants/criteria';

const KEY = '@v2/six_week_reports';
const DRAFT_KEY = '@v2/six_week_draft';

/** مفتاحا التخزين — تحتاجهما طبقة النسخ الاحتياطي في lib/store.ts */
export const SIX_WEEK_STORAGE_KEY = KEY;
export const SIX_WEEK_DRAFT_KEY = DRAFT_KEY;

export const REPORT_RATINGS = [
  { id: 'excellent', label: 'ممتاز' },
  { id: 'very_good', label: 'جيد جداً' },
  { id: 'good', label: 'جيد' },
  { id: 'acceptable', label: 'مقبول' },
  { id: 'special', label: 'تقييم خاص' },
] as const;

export type ReportRating = (typeof REPORT_RATINGS)[number]['id'];

export const REPORT_SUBJECTS = [
  { id: 'drawing_basics', name: 'أساسيات الرسم' },
  { id: 'character_design', name: 'رسم وتصميم الشخصيات' },
  { id: 'cartoon', name: 'الرسم الكرتوني' },
  { id: 'saudi_arts', name: 'الفنون البصرية السعودية' },
  { id: 'digital_drawing', name: 'أنشطة الرسم الرقمي' },
  { id: 'watercolor', name: 'الرسم بالألوان المائية' },
  { id: 'handicrafts', name: 'الأشغال الفنية' },
] as const;

export type ReportSubjectId = (typeof REPORT_SUBJECTS)[number]['id'];

/** معايير جدول «ملخص مخرجات الطالب» — بترتيب الاستمارة الرسمية */
export const REPORT_CRITERIA = [
  { id: 'skills', name: 'المهارات الفنية الإدراكية واليدوية والمعرفية' },
  { id: 'innovation', name: 'الابتكار والتعبير الفني' },
  { id: 'interaction', name: 'التفاعل أثناء الدرس' },
  { id: 'accuracy', name: 'الدقة والتركيز' },
  { id: 'commitment', name: 'الالتزام والانضباط' },
  { id: 'cooperation', name: 'التعاون مع الزملاء' },
] as const;

export type ReportCriterionId = (typeof REPORT_CRITERIA)[number]['id'];

export interface CourseAssessment {
  subject_id: ReportSubjectId;
  rating: ReportRating;
  note: string;
}

export interface CriterionAssessment {
  rating: ReportRating;
  note: string;
}

export type CriteriaMap = Record<ReportCriterionId, CriterionAssessment>;

export interface SixWeekReport {
  id: string;
  student_id: string;
  /** نسخة من الاسم وقت الحفظ — يبقى التقرير مقروءاً لو غُيّر اسم الطالب */
  student_name: string;
  grade_id: GradeId;
  report_date: string;
  term: TermId;
  teacher_name: string;
  summary: string;
  courses: CourseAssessment[];
  behavior: string;
  social: string;
  criteria: CriteriaMap;
  recommendations: string;
  updated_at: string;
}

export type SaveReportInput = Omit<SixWeekReport, 'id' | 'updated_at'> & {
  id?: string;
};

function newId(): string {
  return `sw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyCriteria(): CriteriaMap {
  return Object.fromEntries(
    REPORT_CRITERIA.map((c) => [c.id, { rating: 'excellent', note: '' }])
  ) as CriteriaMap;
}

/** تقارير محفوظة قبل إضافة المعايير الستة كانت تحمل skills/innovation فقط */
type StoredReport = Omit<SixWeekReport, 'criteria'> & {
  criteria?: Partial<CriteriaMap>;
  skills?: CriterionAssessment;
  innovation?: CriterionAssessment;
};

function normalizeReport(r: StoredReport): SixWeekReport {
  const criteria = emptyCriteria();
  for (const { id } of REPORT_CRITERIA) {
    const legacy = id === 'skills' ? r.skills : id === 'innovation' ? r.innovation : undefined;
    const v = r.criteria?.[id] ?? legacy;
    if (v) criteria[id] = { rating: v.rating ?? 'excellent', note: v.note ?? '' };
  }

  const rest = { ...r, criteria } as StoredReport;
  delete rest.skills;
  delete rest.innovation;
  return rest as SixWeekReport;
}

async function readAll(): Promise<SixWeekReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReport[];
    return Array.isArray(parsed) ? parsed.map(normalizeReport) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: SixWeekReport[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function listSixWeekReports(): Promise<SixWeekReport[]> {
  const all = await readAll();
  return all.sort((a, b) => {
    const byDate = b.report_date.localeCompare(a.report_date);
    return byDate !== 0 ? byDate : b.updated_at.localeCompare(a.updated_at);
  });
}

export async function getSixWeekReport(id: string): Promise<SixWeekReport | null> {
  const all = await readAll();
  return all.find((r) => r.id === id) ?? null;
}

export async function saveSixWeekReport(input: SaveReportInput): Promise<SixWeekReport> {
  const all = await readAll();
  const record: SixWeekReport = {
    ...input,
    id: input.id ?? newId(),
    updated_at: new Date().toISOString(),
  };

  const i = all.findIndex((r) => r.id === record.id);
  if (i >= 0) all[i] = record;
  else all.push(record);

  await writeAll(all);
  return record;
}

export async function deleteSixWeekReport(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((r) => r.id !== id));
}

/**
 * يدمج تقارير قادمة من ملف نسخة احتياطية — الأحدث لكل معرّف يفوز،
 * ولا يحذف شيئاً موجوداً. يُرجع عدد ما أُضيف أو حُدّث.
 */
export async function mergeSixWeekReports(incoming: SixWeekReport[]): Promise<number> {
  if (!incoming.length) return 0;
  const all = await readAll();
  const map = new Map(all.map((r) => [r.id, r]));
  let applied = 0;
  for (const raw of incoming) {
    const r = normalizeReport(raw);
    const cur = map.get(r.id);
    if (cur && cur.updated_at >= r.updated_at) continue;
    map.set(r.id, r);
    applied++;
  }
  if (applied) await writeAll([...map.values()]);
  return applied;
}

/* ------------------------------------------------------------------ */
/*  المسودة — محرر التقرير طويل، وفقدان ما كُتب أفقدٌ من حفظه           */
/* ------------------------------------------------------------------ */

export interface SixWeekDraftCourse {
  subject_id: ReportSubjectId;
  enabled: boolean;
  rating: ReportRating;
  note: string;
}

export interface SixWeekDraft {
  /** معرّف التقرير المحفوظ قيد التعديل — null لتقرير لم يُحفظ بعد */
  reportId: string | null;
  student_id: string | null;
  student_name: string;
  grade_id: GradeId | null;
  report_date: string;
  teacher_name: string;
  summary: string;
  courses: SixWeekDraftCourse[];
  behavior: string;
  social: string;
  criteria: CriteriaMap;
  recommendations: string;
  updated_at: string;
}

export async function loadSixWeekDraft(): Promise<SixWeekDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SixWeekDraft;
    if (!d || typeof d !== 'object' || !d.updated_at) return null;

    // مسودة قديمة قد تنقصها معايير مضافة لاحقاً
    const criteria = emptyCriteria();
    for (const { id } of REPORT_CRITERIA) {
      const v = d.criteria?.[id];
      if (v) criteria[id] = { rating: v.rating ?? 'excellent', note: v.note ?? '' };
    }
    return { ...d, criteria, courses: Array.isArray(d.courses) ? d.courses : [] };
  } catch {
    return null;
  }
}

export async function saveSixWeekDraft(
  draft: Omit<SixWeekDraft, 'updated_at'>
): Promise<string> {
  const at = new Date().toISOString();
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updated_at: at }));
  return at;
}

export async function clearSixWeekDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

/** هل في المسودة ما يستحق عرضها للمعلم؟ — الافتتاحيات الفارغة تُتجاهل */
export function draftHasContent(d: SixWeekDraft): boolean {
  return !!(
    d.student_id ||
    d.summary.trim() ||
    d.behavior.trim() ||
    d.social.trim() ||
    d.recommendations.trim() ||
    d.courses.some((c) => c.enabled || c.note.trim()) ||
    Object.values(d.criteria).some((v) => v.note.trim())
  );
}

export function ratingLabel(id: ReportRating | string): string {
  return REPORT_RATINGS.find((r) => r.id === id)?.label ?? '';
}

export function reportSubjectName(id: ReportSubjectId | string): string {
  return REPORT_SUBJECTS.find((s) => s.id === id)?.name ?? id;
}

/**
 * طبقة البيانات — محلية أولاً مع مزامنة اختيارية مع سيرفر
 * ---------------------------------------------------------------------------
 * يعمل التطبيق بالكامل بدون إنترنت. كل عملية تُحفظ في AsyncStorage فوراً،
 * وتُضاف إلى طابور المزامنة إن كان السيرفر مهيّأً.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CriteriaKind } from '@/constants/criteria.data';
import type { GradeId, SubjectId, TermId } from '@/constants/criteria';
import { subjectsForGrade, formTotals, EVAL_KINDS } from '@/constants/criteria';
import {
  unitCount, unitLabel, plannedLabel, plannedId, unitFromLabel,
  PERIODIC_LABEL, FINAL_LABEL,
} from '@/constants/plans';
import {
  SIX_WEEK_STORAGE_KEY, SIX_WEEK_DRAFT_KEY,
  listSixWeekReports, mergeSixWeekReports, type SixWeekReport,
} from '@/lib/six-week';
import { readSession } from '@/lib/accounts';

/* ------------------------------------------------------------------ */
/*  الأنواع                                                             */
/* ------------------------------------------------------------------ */

export interface Student {
  id: string;
  name: string;
  grade_id: GradeId | null;
  created_at: string;
  archived?: boolean;
}

export interface Evaluation {
  id: string;
  student_id: string;
  grade_id: GradeId;
  /** الفصل الدراسي — خطة المقررات تختلف بين الفصلين */
  term: TermId;
  subject_id: SubjectId;
  evaluation_type: CriteriaKind;
  evaluation_date: string; // YYYY-MM-DD — فارغة للاستمارات المهيّأة
  label: string; // "رقم / وصف التقييم"
  scores: Record<string, number>; // criterionId -> degree
  teacher_name: string | null;
  updated_at: string;
  deleted?: boolean;
  /**
   * استمارة مهيّأة مسبقاً من خطة العام — لم تُوضع علامات بعد.
   * تظهر في السجل بعلامة «لم يُقيَّم» وتختفي بمجرد حفظ المعلم الدرجات.
   */
  planned?: boolean;
  /** رقم الوحدة (للتقييم التكويني فقط) */
  unit?: number;
}

export interface Draft {
  key: string; // studentId|type|evaluationDate
  student_id: string;
  grade_id: GradeId;
  subject_id: SubjectId;
  evaluation_type: CriteriaKind;
  evaluation_date: string;
  label: string;
  scores: Record<string, number>;
  updated_at: string;
}

export interface Settings {
  teacher_name: string | null;
  edit_mode: boolean;
  sync_enabled: boolean;
  last_sync: string | null;
}

/* ------------------------------------------------------------------ */
/*  المفاتيح                                                           */
/* ------------------------------------------------------------------ */

const K = {
  students: '@v2/students',
  evaluations: '@v2/evaluations',
  drafts: '@v2/drafts',
  settings: '@v2/settings',
  syncQueue: '@v2/sync_queue',
  seeded: '@v2/seeded',
} as const;

/* ------------------------------------------------------------------ */
/*  البيانات المدمجة — ترحيل من التطبيق القديم                         */
/* ------------------------------------------------------------------ */

import SEED from '@/constants/data/seed.json';

interface SeedShape {
  students: Array<{ id: string; name: string; grade_id: GradeId | null; created_at: string }>;
  evaluations: Evaluation[];
  source?: string;
  exported_at?: string;
}

export interface SeedResult {
  ran: boolean;
  seeded: boolean;
  students: number;
  evaluations: number;
  duplicatesRemoved?: number;
  roundsArchived?: number;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/*  تنظيف التكرار في البيانات المرحَّلة                                */
/* ------------------------------------------------------------------ */

/**
 * الرقم التسلسلي في المعرّفlegacy-e<N> —越来越大 يعني إدراجاً لاحقاً.
 */
function seqOf(id: string): number {
  const m = id.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}

/**
 * مفتاح التطابق الكامل لتقييمين.
 *
 * نستخدم مفتاحاً صارماً يشمل العنوان والتاريخ ومجموعة البنود،
 * فلا نخلط بين «تقييمين مختلفين في نفس الخلية» وبين
 * «الحفظ مرتين لنفس التقييم».
 *
 * عيب معروف في التطبيق القديم: كل ضغطة «حفظ» كانت تُدرج صفاً جديداً
 * بدل تحديث الصف، فصارت 65 تقييماً محفوظاً مرتين
 * (كلها في مقرر أساسيات الرسم). الاختلاف في الدرجات يعكس أن المعلم
 * عدّل العلامات ثم حفظ مرتين.
 */
function dupKey(e: Evaluation): string {
  return [
    e.student_id,
    e.grade_id,
    e.term,
    e.subject_id,
    e.evaluation_type,
    (e.label ?? '').trim(),
    e.evaluation_date,
    Object.keys(e.scores ?? {}).sort().join(','),
  ].join('|');
}

/** يزيل الصفوف المكرّرة تماماً — يُبقي آخر حفظ (الأكبر رقماً في المعرّف) */
function dropExactDuplicates(list: Evaluation[]): { list: Evaluation[]; removed: number } {
  const best = new Map<string, Evaluation>();
  const dropped = new Set<string>();

  for (const e of list) {
    if (e.planned) continue;
    const k = dupKey(e);
    const prev = best.get(k);
    if (!prev) { best.set(k, e); continue; }
    // آخر حفظ يفوز
    if (seqOf(e.id) >= seqOf(prev.id)) { dropped.add(prev.id); best.set(k, e); }
    else dropped.add(e.id);
  }

  return { list: list.filter((e) => !dropped.has(e.id)), removed: dropped.size };
}

/**
 * يوحّد التقويم المرحلي والختامي: واحد فقط لكل (طالب × مقرر × فصل).
 *
 * التطبيق القديم كان يُجري التقويم المرحلي ثلاث مرات ويسمّيها
 * «التقييم الأول / الثاني / الثالث» — وهي في التطبيق الجديد تقييم واحد.
 * نُبقي الأحدث (آخر رصد) ونؤرشف الباقي بـ deleted، فلا تضيع درجاتها
 * ويمكن استرجاعها بـ listEvaluations(true).
 */
function collapseRounds(list: Evaluation[]): { list: Evaluation[]; archived: number } {
  const groups = new Map<string, Evaluation[]>();
  for (const e of list) {
    if (e.deleted || e.evaluation_type === 'weekly') continue;
    const k = `${e.student_id}|${e.grade_id}|${e.term}|${e.subject_id}|${e.evaluation_type}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  const archived = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // الأحدث أولاً، فالأحدث يُبقى
    const sorted = [...group].sort(
      (a, b) =>
        b.evaluation_date.localeCompare(a.evaluation_date) ||
        seqOf(b.id) - seqOf(a.id)
    );
    for (const e of sorted.slice(1)) archived.add(e.id);
  }

  return {
    list: list.map((e) => (archived.has(e.id) ? { ...e, deleted: true } : e)),
    archived: archived.size,
  };
}

/**
 * يوحّد عناوين التقييمات القديمة.
 *
 * البيانات المرحَّلة كانت تسمّي التقييم التكويني «التقييم الأول/الثاني/
 * الثالث» بدل «الوحدة الأولى…»، وتُبقي على عنوان الجولة في التقويم
 * المرحلي. النتيجة أن المعلم يرى ثلاث نسخ من «التقييم الثالث».
 *
 * هنا نعيد التسمية فقط — الدرجات والتواريخ لا تُمسّ.
 */
function normalizeLabels(list: Evaluation[]): { list: Evaluation[]; renamed: number } {
  let renamed = 0;
  const out = list.map((e) => {
    if (e.planned) return e;

    let next: string | undefined;
    if (e.evaluation_type === 'weekly') {
      const u = unitFromLabel(e.label ?? '');
      if (u !== null && u <= unitCount(e.subject_id)) {
        next = unitLabel(e.subject_id, u);
      }
    } else if (e.evaluation_type === 'periodic') {
      next = PERIODIC_LABEL;
    } else if (e.evaluation_type === 'final') {
      next = FINAL_LABEL;
    }

    if (next && next !== e.label) {
      renamed++;
      return { ...e, label: next };
    }
    return e;
  });
  return { list: out, renamed };
}

export interface CleanupResult {
  list: Evaluation[];
  /** صفوف محذوفة تماماً — كانت محفوظة مرتين */
  removed: number;
  /** جولات مرحلية مؤرشفة — محفوظة البيانات لكن خارج القوائم */
  archived: number;
  /** عناوين وُحّدت لتطابق بنود الاستمارة */
  renamed: number;
}

/** ينظّف التقييمات: يحذف المكرر، يؤرشف الجولات الزائدة، ويوحّد العناوين */
export function dedupeEvaluations(list: Evaluation[]): CleanupResult {
  const a = dropExactDuplicates(list);
  const b = collapseRounds(a.list);
  const c = normalizeLabels(b.list);
  return {
    list: c.list,
    removed: a.removed,
    archived: b.archived,
    renamed: c.renamed,
  };
}

/**
 * يُنفَّذ مرة واحدة عند أول تشغيل.
 * يزرع الطلاب والتقييمات المدمجة من التطبيق القديم — بشرط أن تكون المخازن فارغة
 * حتى لا يمسح أي بيانات أدخلها المستخدم.
 */
export async function runFirstRunSeed(): Promise<SeedResult> {
  if ((await AsyncStorage.getItem(K.seeded)) === 'done') {
    return { ran: false, seeded: false, students: 0, evaluations: 0, reason: 'سبق التشغيل' };
  }

  const existingStudents = await read<Student[]>(K.students, []);
  const existingEvals = await read<Evaluation[]>(K.evaluations, []);

  if (existingStudents.length > 0 || existingEvals.length > 0) {
    await AsyncStorage.setItem(K.seeded, 'done');
    return { ran: true, seeded: false, students: 0, evaluations: 0, reason: 'توجد بيانات مسبقاً' };
  }

  const seed = SEED as unknown as SeedShape;
  if (!seed?.students?.length) {
    await AsyncStorage.setItem(K.seeded, 'done');
    return { ran: true, seeded: false, students: 0, evaluations: 0, reason: 'لا توجد بيانات مدمجة' };
  }

  // التطبيق القديم كان يُدرج صفاً جديداً عند كل حفظ، وكان يُجري التقويم
  // المرحلي ثلاث مرات في الفصل — ننظّف الاثنين عند الزرع
  const { list, removed, archived } = dedupeEvaluations(seed.evaluations);

  await write(K.students, seed.students);
  await write(K.evaluations, list);
  await AsyncStorage.setItem(K.seeded, 'done');

  return {
    ran: true,
    seeded: true,
    students: seed.students.length,
    evaluations: list.length,
    duplicatesRemoved: removed,
    roundsArchived: archived,
  };
}

/**
 * ينظّف التقييمات الموجودة في التخزين.
 * يُستدعى عند كل إقلاع — آمن ولا يمسّ أي تقييم فريد، ولا درجة محفوظة.
 */
export async function cleanupDuplicates(): Promise<CleanupResult> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const res = dedupeEvaluations(all);
  if (res.removed > 0 || res.archived > 0) await write(K.evaluations, res.list);
  return res;
}

/** هل البيانات الحالية مدمجة من الترحيل؟ */
export async function isSeeded(): Promise<boolean> {
  return (await AsyncStorage.getItem(K.seeded)) === 'done';
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] فشل حفظ ${key}:`, e);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/*  توليد المعرّفات                                                     */
/* ------------------------------------------------------------------ */

export function newId(): string {
  // معرّف فريد يعتمد على الوقت + عشوائية
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}-${r}`;
}

/* ------------------------------------------------------------------ */
/* _SYNC_ طابور المزامنة                                                */
/* ------------------------------------------------------------------ */

export interface QueueItem {
  id: string;
  table: 'students' | 'evaluations';
  op: 'upsert' | 'delete';
  rowId: string;
  payload?: unknown;
  at: string;
  tries: number;
}

async function enqueue(item: Omit<QueueItem, 'id' | 'at' | 'tries'>): Promise<void> {
  const q = await read<QueueItem[]>(K.syncQueue, []);
  q.push({ ...item, id: newId(), at: new Date().toISOString(), tries: 0 });
  await write(K.syncQueue, q);
}

/* ------------------------------------------------------------------ */
/*  Supabase (اختياري)                                                  */
/* ------------------------------------------------------------------ */

let supabase: SupabaseClient | null = null;

function initSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    supabase = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { headers: { 'x-application-name': 'arts-eval-v2' } },
    });
  } catch (e) {
    console.error('[supabase] فشل التهيئة:', e);
    return null;
  }
  return supabase;
}

export function supabaseReady(): boolean {
  return initSupabase() !== null;
}

/* ------------------------------------------------------------------ */
/*  الإعدادات                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: Settings = {
  teacher_name: null,
  edit_mode: false,
  sync_enabled: false,
  last_sync: null,
};

export async function getSettings(): Promise<Settings> {
  return read<Settings>(K.settings, DEFAULT_SETTINGS);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await write(K.settings, next);
  return next;
}

/* ------------------------------------------------------------------ */
/*  الطلاب                                                             */
/* ------------------------------------------------------------------ */

export async function listStudents(includeArchived = false): Promise<Student[]> {
  const all = await read<Student[]>(K.students, []);
  const list = includeArchived ? all : all.filter((s) => !s.archived);
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listStudentsByGrade(gradeId: GradeId): Promise<Student[]> {
  const all = await listStudents();
  return all.filter((s) => s.grade_id === gradeId || s.grade_id === null);
}

export async function createStudent(name: string, gradeId: GradeId | null): Promise<Student> {
  const student: Student = {
    id: newId(),
    name: name.trim(),
    grade_id: gradeId,
    created_at: new Date().toISOString(),
  };
  const all = await read<Student[]>(K.students, []);
  all.push(student);
  await write(K.students, all);
  await enqueue({ table: 'students', op: 'upsert', rowId: student.id, payload: student });
  return student;
}

export async function renameStudent(id: string, name: string): Promise<void> {
  const all = await read<Student[]>(K.students, []);
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) throw new Error('الطالب غير موجود');
  all[i] = { ...all[i], name: name.trim() };
  await write(K.students, all);
  await enqueue({ table: 'students', op: 'upsert', rowId: id, payload: all[i] });
}

export async function archiveStudent(id: string, archived = true): Promise<void> {
  const all = await read<Student[]>(K.students, []);
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) throw new Error('الطالب غير موجود');
  all[i] = { ...all[i], archived };
  await write(K.students, all);
  await enqueue({ table: 'students', op: 'upsert', rowId: id, payload: all[i] });
}

export async function deleteStudent(id: string): Promise<void> {
  const all = await read<Student[]>(K.students, []);
  await write(
    K.students,
    all.filter((s) => s.id !== id)
  );
  // حذف تقييماته أيضاً
  const evals = await read<Evaluation[]>(K.evaluations, []);
  const removed = evals.filter((e) => e.student_id === id);
  await write(
    K.evaluations,
    evals.filter((e) => e.student_id !== id)
  );
  for (const e of removed) {
    await enqueue({ table: 'evaluations', op: 'delete', rowId: e.id });
  }
  await enqueue({ table: 'students', op: 'delete', rowId: id });
}

/* ------------------------------------------------------------------ */
/*  التقييمات                                                           */
/* ------------------------------------------------------------------ */

export async function listEvaluations(includeDeleted = false): Promise<Evaluation[]> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  // تجاهل أي سجل تالف أو بنوع تقييم غير معروف حتى لا يُسقط شاشة السجل.
  const valid = all.filter(
    (e) => !!e && EVAL_KINDS.some((k) => k.id === e.evaluation_type)
  );
  return includeDeleted ? valid : valid.filter((e) => !e.deleted);
}

export async function evaluationsForStudent(studentId: string): Promise<Evaluation[]> {
  const all = await listEvaluations();
  return all
    .filter((e) => e.student_id === studentId)
    .sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));
}

export async function evaluationsForCell(params: {
  gradeId: GradeId;
  subjectId: SubjectId;
  kind: CriteriaKind;
}): Promise<Evaluation[]> {
  const all = await listEvaluations();
  return all.filter(
    (e) =>
      e.grade_id === params.gradeId &&
      e.subject_id === params.subjectId &&
      e.evaluation_type === params.kind
  );
}

export async function countForStudentCell(
  studentId: string,
  gradeId: GradeId,
  subjectId: SubjectId,
  kind: CriteriaKind
): Promise<number> {
  const all = await listEvaluations();
  return all.filter(
    (e) =>
      e.student_id === studentId &&
      e.grade_id === gradeId &&
      e.subject_id === subjectId &&
      e.evaluation_type === kind
  ).length;
}

export interface SaveEvalInput {
  id?: string;
  student_id: string;
  grade_id: GradeId;
  term: TermId;
  subject_id: SubjectId;
  evaluation_type: CriteriaKind;
  evaluation_date: string;
  label: string;
  scores: Record<string, number>;
  teacher_name?: string | null;
}

export async function saveEvaluation(input: SaveEvalInput): Promise<Evaluation> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const now = new Date().toISOString();
  const settings = await getSettings();

  /**
   * اسم المعلم يُحفظ مع التقييم لا يُترك فارغاً.
   * كان الاعتماد على `settings.teacher_name` وحده، وهو فارغ لمن سجّل
   * دخوله بحساب معلم، فتُطبع الاستمارة لاحقاً بشرطة «—» مكان الاسم.
   * الترتيب: ما مرّرته الشاشة، ثم الإعداد، ثم اسم الحساب المسجّل.
   */
  let sessionName: string | null = null;
  try {
    sessionName = (await readSession())?.name ?? null;
  } catch {
    /* التخزين غير متاح — نكمل بالإعداد */
  }
  const teacherName =
    (input.teacher_name ?? '').trim() ||
    (settings.teacher_name ?? '').trim() ||
    (sessionName ?? '').trim() ||
    null;

  const record: Evaluation = {
    id: input.id ?? newId(),
    student_id: input.student_id,
    grade_id: input.grade_id,
    term: input.term,
    subject_id: input.subject_id,
    evaluation_type: input.evaluation_type,
    evaluation_date: input.evaluation_date,
    label: input.label.trim(),
    scores: input.scores,
    teacher_name: teacherName,
    updated_at: now,
    deleted: false,
  };

  const i = all.findIndex((e) => e.id === record.id);
  if (i >= 0) all[i] = record;
  else all.push(record);

  await write(K.evaluations, all);
  await enqueue({ table: 'evaluations', op: 'upsert', rowId: record.id, payload: record });

  // مسح المسودة المرتبطة
  await clearDraft(draftKey(record.student_id, record.evaluation_type, record.evaluation_date));

  return record;
}

export interface BulkFillTarget {
  studentId: string;
  /** معرّف الاستمارة المخطّطة أو المحفوظة — يُستخدم للتحديث في مكانها */
  evalId?: string;
  label: string;
}

export interface BulkFillInput {
  gradeId: GradeId;
  subjectId: SubjectId;
  term: TermId;
  kind: CriteriaKind;
  scores: Record<string, number>;
  targets: BulkFillTarget[];
  teacher_name?: string | null;
}

export async function bulkFillEvaluations(input: BulkFillInput): Promise<{ updated: number; created: number }> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);

  let sessionName: string | null = null;
  try { sessionName = (await readSession())?.name ?? null; } catch { /* ignore */ }
  const settings = await getSettings();
  const teacherName =
    (input.teacher_name ?? '').trim() ||
    (settings.teacher_name ?? '').trim() ||
    (sessionName ?? '').trim() ||
    null;

  const byId = new Map(all.map((e) => [e.id, e]));
  let updated = 0;
  let created = 0;

  for (const t of input.targets) {
    let existing: Evaluation | undefined;
    if (t.evalId) existing = byId.get(t.evalId);
    if (!existing) {
      existing = all.find(
        (e) =>
          e.student_id === t.studentId &&
          e.grade_id === input.gradeId &&
          e.subject_id === input.subjectId &&
          (e.term ?? 'term1') === input.term &&
          e.evaluation_type === input.kind &&
          (e.label ?? '') === t.label &&
          !e.deleted
      );
    }

    if (existing) {
      const merged: Evaluation = {
        ...existing,
        evaluation_date: existing.evaluation_date || today,
        label: t.label,
        scores: input.scores,
        teacher_name: teacherName,
        updated_at: now,
        deleted: false,
      };
      const idx = all.findIndex((e) => e.id === existing!.id);
      if (idx >= 0) all[idx] = merged;
      byId.set(existing.id, merged);
      await enqueue({ table: 'evaluations', op: 'upsert', rowId: existing.id, payload: merged });
      await clearDraft(draftKey(existing.student_id, input.kind, merged.evaluation_date));
      updated++;
    } else {
      const id = newId();
      const rec: Evaluation = {
        id,
        student_id: t.studentId,
        grade_id: input.gradeId,
        term: input.term,
        subject_id: input.subjectId,
        evaluation_type: input.kind,
        evaluation_date: today,
        label: t.label,
        scores: input.scores,
        teacher_name: teacherName,
        updated_at: now,
        deleted: false,
        planned: true,
        unit: input.kind === 'weekly' ? (unitFromLabel(t.label) ?? undefined) : undefined,
      };
      all.push(rec);
      byId.set(id, rec);
      await enqueue({ table: 'evaluations', op: 'upsert', rowId: id, payload: rec });
      await clearDraft(draftKey(t.studentId, input.kind, today));
      created++;
    }
  }

  await write(K.evaluations, all);
  return { updated, created };
}
export async function deleteEvaluation(id: string): Promise<void> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], deleted: true, updated_at: new Date().toISOString() };
  await write(K.evaluations, all);
  await enqueue({ table: 'evaluations', op: 'delete', rowId: id });
}

export async function restoreEvaluation(id: string): Promise<void> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], deleted: false, updated_at: new Date().toISOString() };
  await write(K.evaluations, all);
  await enqueue({ table: 'evaluations', op: 'upsert', rowId: id, payload: all[i] });
}

/* ------------------------------------------------------------------ */
/*  خطة التقييم السنوية — توليد استمارات فارغة جاهزة                    */
/* ------------------------------------------------------------------ */

export interface PlanResult {
  created: number;
  /** استمارات فارغة أُزيلت لأنها صارت مشغولة بتقييم حقيقي */
  pruned: number;
  /** خلايا مشغولة أصلاً بتقييم حقيقي — لم تُولَّد لها استمارة */
  skipped: number;
  total: number;
  byGrade: Record<string, number>;
}

function normalizeGradeId(id: string | null): GradeId | null {
  if (!id) return null;
  return (id === 'intermediate1' ? 'grade_int1' : id) as GradeId;
}

/**
 * يولّد كل استمارات العام الدراسي الفارغة للمقررات المعتمدة.
 *
 * لكل طالب في مرحلته، ولكل مقرر في كل فصل:
 *   • وحدات × تقييم تكويني  (أساسيات الرسم 4، والباقي 3)
 *   • 1 تقويم مرحلي
 *   • 1 تقويم ختامي
 *
 * ⚠ لا تُولَّد استمارة إذا كانت الخلية مشغولة بتقييم حقيقي:
 *   • التقييم التكويني: نقارن رقم الوحدة («الوحدة الاولى» = «التقييم الأول»)
 *   • المرحلي والختامي: وجود أي تقييم حقيقي في الخلية يمنع التوليد
 * لذلك لا تُحذف أي بيانات قائمة ولا تظهر استمارة مكررة.
 *
 * المعرّفات ثابتة (plannedId) فيمكن إعادة التشغيل بأمان.
 */
export async function generateYearPlan(): Promise<PlanResult> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const existing = new Set(all.map((e) => e.id));

  // الخلايا المشغولة فعلياً بتقييمات حقيقية (غير مخطّطة)
  const filledWeekly = new Set<string>();
  const filledOther = new Set<string>();
  for (const e of all) {
    if (e.planned || e.deleted) continue;
    const base = `${e.student_id}|${e.grade_id}|${e.subject_id}|${e.term}`;
    if (e.evaluation_type === 'weekly') {
      const u = unitFromLabel(e.label ?? '');
      if (u !== null) filledWeekly.add(`${base}|weekly|${u}`);
    } else {
      filledOther.add(`${base}|${e.evaluation_type}`);
    }
  }

  const students = await listStudents(true);
  const now = new Date().toISOString();

  const out = all.slice();
  const byGrade: Record<string, number> = {};
  let created = 0;
  let skipped = 0;

  // ── تنظيف: إزالة استمارات فارغة صارت مشغولة بتقييم حقيقي ───────────
  // قد تكون وُلّدت قبل إصلاح المنع، فنزيلها حتى لا تظهر مكررة.
  let pruned = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    const e = out[i];
    if (!e.planned || e.deleted) continue;
    if (Object.keys(e.scores ?? {}).length > 0) continue; // عبّأها المعلم — تُبقى

    const base = `${e.student_id}|${e.grade_id}|${e.subject_id}|${e.term}`;
    const occupied =
      e.evaluation_type === 'weekly'
        ? filledWeekly.has(`${base}|weekly|${e.unit ?? 1}`)
        : filledOther.has(`${base}|${e.evaluation_type}`);
    if (occupied) {
      out.splice(i, 1);
      pruned++;
    }
  }
  existing.clear();
  for (const e of out) existing.add(e.id);

  for (const st of students) {
    const gid = normalizeGradeId(st.grade_id);
    if (!gid) continue;

    for (const term of ['term1', 'term2'] as TermId[]) {
      for (const subjectId of subjectsForGrade(gid, term)) {
        // لا نولّد استمارات لمقرر لا تحوي الوثائق الرسمية نماذج معتمدة له.
        // مثال: «الألوان المائية» في الرابع والأول المتوسط.
        const hasForms = (['weekly', 'periodic', 'final'] as CriteriaKind[]).some(
          (k) => formTotals(k, gid, subjectId, term).criteria.length > 0
        );
        if (!hasForms) continue;

        for (const kind of ['weekly', 'periodic', 'final'] as CriteriaKind[]) {
          if (!formTotals(kind, gid, subjectId, term).criteria.length) continue;

          const units = kind === 'weekly' ? unitCount(subjectId) : 1;
          const base = `${st.id}|${gid}|${subjectId}|${term}`;

          for (let unit = 1; unit <= units; unit++) {
            // هل الخلية مشغولة فعلاً؟
            const occupied =
              kind === 'weekly'
                ? filledWeekly.has(`${base}|weekly|${unit}`)
                : filledOther.has(`${base}|${kind}`);
            if (occupied) { skipped++; continue; }

            const id = plannedId({
              studentId: st.id, gradeId: gid, term,
              subjectId, kind, unit,
            });
            if (existing.has(id)) continue;
            existing.add(id);

            out.push({
              id,
              student_id: st.id,
              grade_id: gid,
              term,
              subject_id: subjectId,
              evaluation_type: kind,
              evaluation_date: '',
              label: plannedLabel(kind, subjectId, unit),
              scores: {},
              teacher_name: null,
              updated_at: now,
              planned: true,
              unit: kind === 'weekly' ? unit : undefined,
            });
            created++;
          }
        }
      }
    }
    byGrade[gid] = (byGrade[gid] ?? 0) + 1;
  }

  if (created > 0 || pruned > 0) await write(K.evaluations, out);

  return {
    created,
    pruned,
    skipped,
    total: out.filter((e) => e.planned).length,
    byGrade,
  };
}

/** يحذف كل الاستمارات المهيّأة التي لم تُملأ بعد */
export async function clearEmptyPlan(): Promise<number> {
  const all = await read<Evaluation[]>(K.evaluations, []);
  const keep = all.filter((e) => !e.planned || Object.keys(e.scores ?? {}).length > 0);
  const removed = all.length - keep.length;
  if (removed > 0) await write(K.evaluations, keep);
  return removed;
}

/** تقييمات طالب في مقرر وفصل معيّنين — المخطّطة والحقيقية معاً */
export async function plannedForSubject(params: {
  studentId: string;
  gradeId: GradeId;
  subjectId: SubjectId;
  term: TermId;
  kind?: CriteriaKind;
}): Promise<Evaluation[]> {
  const all = await listEvaluations();
  return all
    .filter(
      (e) =>
        e.student_id === params.studentId &&
        e.grade_id === params.gradeId &&
        e.subject_id === params.subjectId &&
        (e.term ?? 'term1') === params.term &&
        // بلا هذا الشرط كانت شاشة الطلاب تعرض كل الجولات —
        // تكوينية ومرحلية وختامية — مهما كان النوع المختار في الخطوة ٣.
        (!params.kind || e.evaluation_type === params.kind)
    )
    .sort(
      (a, b) =>
        KIND_ORDER[a.evaluation_type] - KIND_ORDER[b.evaluation_type] ||
        (a.unit ?? 99) - (b.unit ?? 99)
    );
}

const KIND_ORDER: Record<CriteriaKind, number> = { weekly: 0, periodic: 1, final: 2 };

/** تقييم واحد بمعرّفه (للفتح المباشر من الخطة) */
export async function getEvaluationById(id: string): Promise<Evaluation | null> {
  const all = await listEvaluations();
  return all.find((e) => e.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/*  المسودات (حفظ تلقائي أثناء التقييم)                                 */
/* ------------------------------------------------------------------ */

function draftKey(studentId: string, kind: CriteriaKind, date: string): string {
  return `${studentId}|${kind}|${date}`;
}

export async function listDrafts(): Promise<Draft[]> {
  return read<Draft[]>(K.drafts, []);
}

export async function getDraft(studentId: string, kind: CriteriaKind, date: string): Promise<Draft | null> {
  const key = draftKey(studentId, kind, date);
  const all = await listDrafts();
  return all.find((d) => d.key === key) ?? null;
}

export async function saveDraft(draft: Omit<Draft, 'key' | 'updated_at'>): Promise<void> {
  const key = draftKey(draft.student_id, draft.evaluation_type, draft.evaluation_date);
  const all = await listDrafts();
  const record: Draft = { ...draft, key, updated_at: new Date().toISOString() };
  const i = all.findIndex((d) => d.key === key);
  if (i >= 0) all[i] = record;
  else all.push(record);
  await write(K.drafts, all);
}

export async function clearDraft(key: string): Promise<void> {
  const all = await listDrafts();
  await write(
    K.drafts,
    all.filter((d) => d.key !== key)
  );
}

/**
 * يمسح المسودة لاستمارة بعينها.
 * يُستدعى بعد الحفظ الناجح: لولا ذلك لفضّلَت شاشة الطباعة المسودة على
 * التقييم المحفوظ، فطبعَت درجات أقدم من المحفوظ.
 */
export async function clearDraftFor(
  studentId: string,
  kind: CriteriaKind,
  date: string
): Promise<void> {
  await clearDraft(draftKey(studentId, kind, date));
}

/* ------------------------------------------------------------------ */
/*  المزامنة                                                            */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: { students: number; evaluations: number };
  error?: string;
}

/**
 * يرفع الطابور إلى السيرفر ثم يسحب أي تغييرات جديدة.
 * لا يفعل شيئاً إذا لم يكن هناك URL/Key في متغيرات البيئة.
 */
export async function sync(): Promise<SyncResult> {
  const sb = initSupabase();
  if (!sb) {
    return { ok: false, pushed: 0, pulled: { students: 0, evaluations: 0 }, error: 'المزامنة غير مهيّأة' };
  }

  const settings = await getSettings();
  if (!settings.sync_enabled) {
    return { ok: false, pushed: 0, pulled: { students: 0, evaluations: 0 }, error: 'المزامنة معطّلة' };
  }

  try {
    const queue = await read<QueueItem[]>(K.syncQueue, []);
    let pushed = 0;

    // 1) رفع الطابور (التغييرات منذ آخر مزامنة)
    for (const item of queue) {
      const table = item.table;
      if (item.op === 'delete') {
        const { error } = await sb.from(table).delete().eq('id', item.rowId);
        if (!error) pushed++;
      } else {
        const { error } = await sb.from(table).upsert(item.payload as Record<string, unknown>);
        if (!error) pushed++;
      }
    }

    const localStudents = await read<Student[]>(K.students, []);
    const localEvals = await read<Evaluation[]>(K.evaluations, []);

    // 2) رفع ALL البيانات المحلية (فقط عند أول مزامنة — لضمان عدم فقدان بيانات أُنشئت قبل تفعيل المزامنة)
    const isFirstSync = !settings.last_sync;
    if (isFirstSync) {
      for (const s of localStudents) {
        const { error } = await sb.from('students').upsert(s as unknown as Record<string, unknown>);
        if (!error) pushed++;
      }
      for (const e of localEvals) {
        if (e.deleted) continue;
        const { error } = await sb.from('evaluations').upsert(e as unknown as Record<string, unknown>);
        if (!error) pushed++;
      }
    }

    // السحب
    const { data: rStudents } = await sb.from('students').select('*');
    const { data: rEvals } = await sb.from('evaluations').select('*');

    // دمج السحوبات محلياً
    const sMap = new Map(localStudents.map((s) => [s.id, s]));
    for (const s of (rStudents as Student[]) ?? []) sMap.set(s.id, s);

    const eMap = new Map(localEvals.map((e) => [e.id, e]));
    for (const e of (rEvals as Evaluation[]) ?? []) eMap.set(e.id, e);

    await write(K.students, [...sMap.values()]);
    await write(K.evaluations, [...eMap.values()]);

    if (queue.length) await write(K.syncQueue, []);

    await updateSettings({ last_sync: new Date().toISOString() });

    return {
      ok: true,
      pushed,
      pulled: {
        students: (rStudents ?? []).length,
        evaluations: (rEvals ?? []).length,
      },
    };
  } catch (e) {
    return {
      ok: false,
      pushed: 0,
      pulled: { students: 0, evaluations: 0 },
      error: e instanceof Error ? e.message : 'خطأ غير معروف',
    };
  }
}

export async function pendingSyncCount(): Promise<number> {
  return (await read<QueueItem[]>(K.syncQueue, [])).length;
}

/* ------------------------------------------------------------------ */
/*  النسخ الاحتياطي                                                      */
/* ------------------------------------------------------------------ */

export async function exportAll(): Promise<string> {
  const [students, evaluations, settings, drafts, sixWeekReports] = await Promise.all([
    read<Student[]>(K.students, []),
    read<Evaluation[]>(K.evaluations, []),
    getSettings(),
    listDrafts(),
    listSixWeekReports(),
  ]);
  return JSON.stringify(
    {
      app: 'arts-eval-v2',
      version: 3,
      exported_at: new Date().toISOString(),
      students,
      evaluations,
      settings,
      drafts,
      six_week_reports: sixWeekReports,
    },
    null,
    2
  );
}

export async function importAll(json: string): Promise<{
  students: number; evaluations: number; reports: number;
}> {
  const data = JSON.parse(json);
  if (data.app !== 'arts-eval-v2') throw new Error('الملف لا يخص هذا التطبيق');

  const students = (data.students ?? []) as Student[];
  const evaluations = (data.evaluations ?? []) as Evaluation[];

  const curS = await read<Student[]>(K.students, []);
  const sMap = new Map(curS.map((s) => [s.id, s]));
  for (const s of students) sMap.set(s.id, s);
  await write(K.students, [...sMap.values()]);

  const curE = await read<Evaluation[]>(K.evaluations, []);
  const eMap = new Map(curE.map((e) => [e.id, e]));
  for (const e of evaluations) eMap.set(e.id, e);
  await write(K.evaluations, [...eMap.values()]);

  if (data.settings) await write(K.settings, data.settings);
  if (data.drafts) await write(K.drafts, data.drafts);

  const reports = await mergeSixWeekReports((data.six_week_reports ?? []) as SixWeekReport[]);

  return { students: students.length, evaluations: evaluations.length, reports };
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(K.students),
    AsyncStorage.removeItem(K.evaluations),
    AsyncStorage.removeItem(K.drafts),
    AsyncStorage.removeItem(K.syncQueue),
    AsyncStorage.removeItem(K.seeded),
    AsyncStorage.removeItem(SIX_WEEK_STORAGE_KEY),
    AsyncStorage.removeItem(SIX_WEEK_DRAFT_KEY),
  ]);
  await write(K.settings, DEFAULT_SETTINGS);
}

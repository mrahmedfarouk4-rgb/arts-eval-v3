/**
 * محاكاة ما يراه المعلم في شاشة الطلاب لكل طالب × مقرر × فصل.
 * يكشف أي خلية يظهر فيها أكثر من تقييم لنفس الوحدة.
 */

import SEED from '../constants/data/seed.json';
import { unitCount, plannedId, plannedLabel } from '../constants/plans';
import { unitFromLabel } from '../constants/plans';
import { subjectsForGrade, formTotals } from '../constants/criteria';
import type { GradeId, SubjectId, TermId } from '../constants/criteria';

interface E {
  id: string; student_id: string; grade_id: string; term: string;
  subject_id: string; evaluation_type: string; label: string;
  scores: Record<string, number>; evaluation_date: string; planned?: boolean;
  unit?: number;
}
interface S { id: string; name: string; grade_id: string | null }

const students = SEED.students as unknown as S[];
const evals = SEED.evaluations as unknown as E[];

/* 1) تنظيف التكرار (نفس منطق التطبيق) */
function seqOf(id: string) {
  const m = id.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}
function dupKey(e: E) {
  return [
    e.student_id, e.grade_id, e.term, e.subject_id, e.evaluation_type,
    (e.label ?? '').trim(), e.evaluation_date,
    Object.keys(e.scores ?? {}).sort().join(','),
  ].join('|');
}
{
  const best = new Map<string, E>();
  const drop = new Set<string>();
  for (const e of evals) {
    const k = dupKey(e);
    const prev = best.get(k);
    if (!prev) { best.set(k, e); continue; }
    if (seqOf(e.id) >= seqOf(prev.id)) { drop.add(prev.id); best.set(k, e); }
    else drop.add(e.id);
  }
  for (const id of drop) {
    const i = evals.findIndex((e) => e.id === id);
    if (i >= 0) evals.splice(i, 1);
  }
}

/* 2) توحيد الجولات — نفس منطق التطبيق */
{
  const groups = new Map<string, E[]>();
  for (const e of evals) {
    if (e.evaluation_type === 'weekly') continue;
    const k = `${e.student_id}|${e.grade_id}|${e.term}|${e.subject_id}|${e.evaluation_type}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  const archived = new Set<string>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort(
      (a, b) => b.evaluation_date.localeCompare(a.evaluation_date) || seqOf(b.id) - seqOf(a.id)
    );
    for (const e of sorted.slice(1)) archived.add(e.id);
  }
  for (const e of evals) if (archived.has(e.id)) (e as E & { deleted?: boolean }).deleted = true;
  console.log(`  (أُرشفت ${archived.size} جولة مرحلية زائدة)`);
}

/* 3) توليد الخطة بنفس منطق التطبيق */
const filledWeekly = new Set<string>();
const filledOther = new Set<string>();
for (const e of evals) {
  if ((e as E & { deleted?: boolean }).deleted) continue;
  const base = `${e.student_id}|${e.grade_id}|${e.subject_id}|${e.term}`;
  if (e.evaluation_type === 'weekly') {
    const u = unitFromLabel(e.label ?? '');
    if (u !== null) filledWeekly.add(`${base}|weekly|${u}`);
  } else filledOther.add(`${base}|${e.evaluation_type}`);
}

for (const st of students) {
  const gid = st.grade_id as GradeId;
  if (!gid) continue;
  for (const term of ['term1', 'term2'] as TermId[]) {
    for (const subjectId of subjectsForGrade(gid, term)) {
      const hasForms = (['weekly', 'periodic', 'final'] as const).some(
        (k) => formTotals(k, gid, subjectId as SubjectId, term).criteria.length > 0
      );
      if (!hasForms) continue;

      for (const kind of ['weekly', 'periodic', 'final'] as const) {
        if (!formTotals(kind, gid, subjectId as SubjectId, term).criteria.length) continue;
        const units = kind === 'weekly' ? unitCount(subjectId as SubjectId) : 1;
        const base = `${st.id}|${gid}|${subjectId}|${term}`;

        for (let unit = 1; unit <= units; unit++) {
          const occupied =
            kind === 'weekly'
              ? filledWeekly.has(`${base}|weekly|${unit}`)
              : filledOther.has(`${base}|${kind}`);
          if (occupied) continue;
          const id = plannedId({
            studentId: st.id, gradeId: gid, term,
            subjectId: subjectId as SubjectId, kind, unit,
          });
          if (evals.some((e) => e.id === id)) continue;
          evals.push({
            id, student_id: st.id, grade_id: gid, term,
            subject_id: subjectId, evaluation_type: kind,
            label: plannedLabel(kind, subjectId as SubjectId, unit),
            scores: {}, evaluation_date: '', planned: true,
            unit: kind === 'weekly' ? unit : undefined,
          } as E);
        }
      }
    }
  }
}

/* 4) فحص: كم استمارة تظهر لكل خلية */
const visible = evals.filter((e) => !(e as E & { deleted?: boolean }).deleted);
const cells = new Map<string, E[]>();
for (const e of visible) {
  const k = `${e.student_id}|${e.grade_id}|${e.subject_id}|${e.term}`;
  if (!cells.has(k)) cells.set(k, []);
  cells.get(k)!.push(e);
}

let dupCells = 0;
const samples: string[] = [];
const dist: Record<string, number> = {};

for (const [k, list] of cells) {
  // نجمع حسب (النوع، رقم الوحدة)
  const byUnit = new Map<string, E[]>();
  for (const e of list) {
    let u: number;
    if (e.planned) u = e.unit ?? 0;
    else u = e.evaluation_type === 'weekly' ? (unitFromLabel(e.label) ?? 0) : 0;
    const key = `${e.evaluation_type}|u${u}`;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key)!.push(e);
  }
  for (const [key, group] of byUnit) {
    if (group.length > 1) {
      dupCells++;
      dist[key] = (dist[key] ?? 0) + 1;
      if (samples.length < 8) {
        const [sid, grade, subj, term] = k.split('|');
        const name = students.find((s) => s.id === sid)?.name ?? sid;
        samples.push(
          `    ${name} · ${subj} · ${term} · ${key} → ${group.length}:` +
          group.map((e) => `"${e.label}"(${e.evaluation_date}, ${Object.keys(e.scores).length} بند)`).join('  ,  ')
        );
      }
    }
  }
}

console.log();
console.log('  محاكاة شاشة الطلاب');
console.log('  ' + '─'.repeat(76));
console.log(`  إجمالي التقييمات بعد التنظيف والتوليد: ${evals.length}`);
console.log(`  خلايا يظهر فيها أكثر من تقييم لنفس الوحدة: ${dupCells}`);
console.log('  ' + '─'.repeat(76));
if (dupCells) {
  console.log('  حسب النوع:');
  Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`    ${k.padEnd(18)} ${v}`)
  );
  console.log();
  console.log('  أمثلة:');
  samples.forEach((s) => console.log(s));
} else {
  console.log('  ✅ لا تكرار — كل وحدة وكل نوع من التقييم يظهر مرة واحدة');
}
console.log();

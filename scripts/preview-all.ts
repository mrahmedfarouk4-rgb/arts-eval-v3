/**
 * معاينة الاستمارات الستّة — ثلاثة أنواع × تخطيطين official:
 *   • «آليات التقييم»  (grade_int2) → بلا عمود «م»، رأسه «موشرات التحقق»
 *   • «نماذج التقييم»  (grade_int1) → بعمود «م»، رأسه «المعيار»
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPrintHtml, type PrintRow } from '../lib/print-html';
import { subjectName, gradeName, formTotals } from '../constants/criteria';
import SEED from '../constants/data/seed.json';

type E = {
  id: string; student_id: string; grade_id: string; subject_id: string;
  evaluation_type: 'weekly' | 'periodic' | 'final';
  evaluation_date: string; label: string; scores: Record<string, number>;
  deleted?: boolean;
};

const all = (SEED.evaluations as unknown as E[]).filter((x) => !x.deleted);
const term: 'term1' | 'term2' | 'all' = 'all';

/** أول طالب لديه تقييمات في المرحلة المطلوبة */
function pickStudent(grade: string): string {
  const id = all.find((x) => x.grade_id === grade)?.student_id;
  return id ?? SEED.students[0].id;
}

function build(grade: string, subject: string, kind: 'weekly' | 'periodic' | 'final'): PrintRow | null {
  const sid = pickStudent(grade);
  const e = all.find(
    (x) =>
      x.student_id === sid && x.grade_id === grade &&
      x.subject_id === subject && x.evaluation_type === kind &&
      Object.keys(x.scores ?? {}).length > 0
  );
  if (!e) return null;

  const stu = SEED.students.find((s) => s.id === sid)!;

  const t = formTotals(kind, grade as never, subject as never, term);
  const scores: Record<string, number> = { ...e.scores };
  // املأ البنود الناقصة بقيمة متوسطة حتى تظهر كل خلايا الجدول في المعاينة
  for (const c of t.criteria) {
    if (typeof scores[c.id] !== 'number') scores[c.id] = c.max > 4 ? c.pass ?? 3 : 3;
  }

  return {
    student: { name: stu.name, grade },
    evaluation: {
      id: e.id, date: e.evaluation_date, label: e.label || '',
      scores, teacher: 'أ. أحمد فاروق',
    },
    kind, gradeId: grade as never, subjectId: subject as never,
    subjectName: subjectName(subject), gradeName: gradeName(grade),
  };
}

const rows: PrintRow[] = [];
for (const grade of ['grade_int2', 'grade_int1'] as const) {
  const subject = grade === 'grade_int2' ? 'drawing_basics' : 'drawing_basics';
  for (const kind of ['weekly', 'periodic', 'final'] as const) {
    const r = build(grade, subject, kind);
    if (r) rows.push(r);
  }
}

const out = join(process.cwd(), 'print-preview.html');
writeFileSync(out, buildPrintHtml(rows, term), 'utf8');
console.log(`كُتب ${out} — ${rows.length} استمارة`);
rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.gradeName} · ${r.subjectName} · ${r.kind}`));
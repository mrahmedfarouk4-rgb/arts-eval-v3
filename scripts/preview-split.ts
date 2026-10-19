/**
 * يولّد صفحة HTML منفصلة لكل استمارة — لالتقاط صورة لكلٍّ منها على حدة.
 *     python? لا — tsx scripts/preview-split.ts
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
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

function pickStudent(grade: string): string {
  return all.find((x) => x.grade_id === grade)?.student_id ?? SEED.students[0].id;
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

const PLAN: [string, string, 'weekly' | 'periodic' | 'final', string][] = [
  ['grade_int2', 'drawing_basics', 'weekly', 'modern-takoinii'],
  ['grade_int2', 'drawing_basics', 'periodic', 'modern-murshalii'],
  ['grade_int2', 'drawing_basics', 'final', 'modern-khitami'],
  ['grade_int1', 'drawing_basics', 'weekly', 'legacy-takoinii'],
  ['grade_int1', 'drawing_basics', 'final', 'legacy-khitami'],
];

const dir = join(process.cwd(), '_preview');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

for (const [grade, subject, kind, name] of PLAN) {
  const r = build(grade, subject, kind);
  if (!r) {
    console.log('  ✗ لا توجد استمارة:', grade, subject, kind);
    continue;
  }
  const html = buildPrintHtml([r], term);
  // خلفية رمادية خارج الصفحة كما في المتصفّح
  writeFileSync(join(dir, `${name}.html`), html, 'utf8');
  console.log(`  ✓ ${name}.html — ${r.gradeName} · ${r.subjectName} · ${kind}`);
}
console.log('في', dir);
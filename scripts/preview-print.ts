/** يولّد نموذج HTML لاستمارة واحدة ويحفظه للمعاينة البصرية */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPrintHtml, type PrintRow } from '../lib/print-html';
import { subjectName, gradeName } from '../constants/criteria';
import SEED from '../constants/data/seed.json';

const eval_ = (SEED.evaluations as unknown as Array<Record<string, unknown>>)
  .find((e) => e.evaluation_type === 'weekly' && Object.keys((e.scores ?? {}) as object).length >= 5);
const per = (SEED.evaluations as unknown as Array<Record<string, unknown>>)
  .find((e) => e.evaluation_type === 'periodic' && Object.keys((e.scores ?? {}) as object).length >= 15);

const mk = (e: Record<string, unknown> | undefined, kind: string): PrintRow | null => {
  if (!e) return null;
  const st = SEED.students.find((s) => s.id === e.student_id);
  return {
    student: { name: st?.name ?? 'طالب', grade: String(e.grade_id) },
    evaluation: {
      id: String(e.id),
      date: String(e.evaluation_date),
      label: String(e.label ?? ''),
      scores: (e.scores ?? {}) as Record<string, number>,
      teacher: 'أ. أحمد فاروق',
    },
    kind: kind as never,
    gradeId: String(e.grade_id) as never,
    subjectId: String(e.subject_id) as never,
    subjectName: subjectName(String(e.subject_id)),
    gradeName: gradeName(String(e.grade_id)),
  };
};

const rows = [mk(eval_, 'weekly'), mk(per, 'periodic')].filter(Boolean) as PrintRow[];
const html = buildPrintHtml(rows, 'term1');
const out = join(process.cwd(), 'print-preview.html');
writeFileSync(out, html, 'utf8');
console.log('كُتب ' + out + '  (' + rows.length + ' استمارة)');

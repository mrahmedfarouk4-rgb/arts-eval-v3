/**
 * جرد العام النماذج المعتمدة + حساب حجم «استمارات عام دراسي كامل».
 * يوضح للمستخدم ما هو جاهز وما الذي سينتج عن التوليد.
 */

import { CRITERIA_BLOCKS } from '../constants/criteria.data';
import {
  GRADES, SUBJECTS, TERMS, EVAL_KINDS, TERM_SUBJECTS,
  subjectsForGrade, formTotals, gradeName, subjectName,
} from '../constants/criteria';
import type { GradeId, SubjectId, TermId } from '../constants/criteria';
import SEED from '../constants/data/seed.json';

const line = (s = '') => console.log(s);
const bar = '─'.repeat(72);

/* ------------------------------------------------------------------ */
line();
line('  جرد نماذج التقييم المعتمدة — العام كامل');
line(`  ${new Date().toISOString().slice(0, 10)}`);
line(bar);

/* 1) البنود */
let totalCriteria = 0;
const perBlock: string[] = [];
for (const b of CRITERIA_BLOCKS) {
  let n = 0;
  for (const k of ['weekly', 'periodic', 'final'] as const) {
    for (const arr of Object.values(b[k])) n += arr.length;
  }
  totalCriteria += n;
  perBlock.push(`     ${b.grade.padEnd(12)} فصل ${b.term.padEnd(6)} → ${n} بند`);
}
line(`  1) بنود التقييم المعتمدة: ${totalCriteria} بند في ${CRITERIA_BLOCKS.length} كتل`);
perBlock.forEach((l) => line(l));

/* 2) الطلاب */
const students = SEED.students;
const byGrade = new Map<string, number>();
for (const s of students) {
  const g = (s.grade_id ?? 'null') as string;
  byGrade.set(g, (byGrade.get(g) ?? 0) + 1);
}
line();
line(`  2) الطلاب المرحَّلين: ${students.length}`);
for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  line(`     ${gradeName(g.id).padEnd(24)} ${byGrade.get(g.id) ?? 0} طالب`);
}

/* 3) المصفوفة الكاملة للعام */
line();
line('  3) استمارات العام الدراسي الكامل (كل مقرر × كل نوع × كل طالب):');
line();

type Row = {
  grade: string;
  term: TermId;
  subject: string;
  kind: string;
  criteria: number;
  max: number;
  count: number;
};

const rows: Row[] = [];
let totalForms = 0;
let totalCells = 0;

for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  const gid = g.id as GradeId;
  const nStudents = byGrade.get(gid) ?? 0;

  for (const t of TERMS) {
    const subjects = subjectsForGrade(gid, t.id);
    for (const sid of subjects) {
      for (const k of EVAL_KINDS) {
        const tot = formTotals(k.id, gid, sid as SubjectId, t.id);
        if (!tot.criteria.length) continue;
        const forms = nStudents;
        rows.push({
          grade: gradeName(gid),
          term: t.id,
          subject: subjectName(sid),
          kind: k.name,
          criteria: tot.criteria.length,
          max: tot.actualMax,
          count: forms,
        });
        totalForms += forms;
        totalCells += tot.criteria.length * forms;
      }
    }
  }
}

for (const t of TERMS) {
  const sub = rows.filter((r) => r.term === t.id);
  if (!sub.length) continue;
  line(`     — ${t.name} —`);
  for (const r of sub) {
    line(
      `       ${r.grade.padEnd(22)} ${r.subject.padEnd(24)} ${r.kind.padEnd(18)}` +
      ` ${String(r.criteria).padStart(3)} بند / ${String(r.max).padStart(3)} درجة  × ${r.count} طالب`
    );
  }
  line();
}

line(bar);
line(`  إجمالي الاستمارات المطلوبة: ${totalForms}`);
line(`  إجمالي خانات الدرجات المطلوبة: ${totalCells.toLocaleString('ar-EG')}`);
line(`  عدد المجموعات (مقرر+نوع): ${rows.length}`);
line(bar);

/* 4) التقييمات الموجودة فعلاً */
const existing = SEED.evaluations.length;
line();
line(`  التقييمات المسجّلة حالياً: ${existing}`);
line(` المحافظ من السجل: ${totalForms - existing}`);
line();
/**
 * مصفوفة بنود التقييم — للمراحل × المقررات × الفصول.
 * تُظهر لكل خلية: عدد البنود، مجموعها، والمقابل الرسمي.
 */

import {
  GRADES, TERMS, SUBJECTS, EVAL_KINDS, TERM_SUBJECTS,
  subjectsForGrade, formTotals, gradeName, subjectName,
} from '../constants/criteria';
import type { GradeId, SubjectId, TermId } from '../constants/criteria';
import { unitCount } from '../constants/plans';

const KN: Record<string, string> = {
  weekly: 'تكويني', periodic: 'مرحلي', final: 'ختامي',
};
const AR: Record<string, string> = {
  grade4: 'رابع', grade5: 'خامس',
  grade_int1: 'أول متوسط', grade_int2: 'ثاني متوسط',
};

const bar = '─'.repeat(78);
let problems = 0;
let cells = 0;

console.log();
console.log('  مصفوفة بنود التقييم');
console.log('  المرحلة · الفصل · المقرر · النوع');
console.log('  ' + bar);

for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  const gid = g.id as GradeId;

  for (const t of TERMS) {
    const subs = subjectsForGrade(gid, t.id);
    if (!subs.length) continue;

    console.log();
    console.log(`  ▌ ${gradeName(gid)} — ${t.name}`);
    console.log('  ' + bar);
    console.log(
      `  ${'المقرر'.padEnd(24)}${'الوحدات'.padStart(7)}` +
      `${'تكويني'.padStart(16)}${'مرحلي'.padStart(16)}${'ختامي'.padStart(18)}`
    );
    console.log('  ' + bar);

    for (const sid of subs) {
      const row: string[] = [];
      let rowOk = true;

      for (const k of EVAL_KINDS) {
        const ft = formTotals(k.id, gid, sid as SubjectId, t.id);
        if (!ft.criteria.length) {
          row.push('—'.padStart(k.id === 'final' ? 18 : 16));
          if (k.id === 'final') rowOk = false;
          continue;
        }
        cells++;
        const diff = ft.delta !== 0;
        if (diff) problems++;
        if (diff && k.id === 'final') rowOk = false;
        row.push(
          `${String(ft.criteria.length).padStart(3)}بند /${String(ft.actualMax).padStart(3)}` +
          (diff ? ` ⚠${ft.delta > 0 ? '+' : ''}${ft.delta}` : '')
        );
      }

      console.log(
        `  ${subjectName(sid).padEnd(24)}${String(unitCount(sid as SubjectId)).padStart(7)}` +
        `  ${row[0].padEnd(16)}${row[1].padEnd(16)}${row[2].padEnd(18)}` +
        (rowOk ? '' : '  ← راجع')
      );
    }
  }
}

console.log();
console.log('  ' + bar);
console.log(`  إجمالي خلايا التقييم المفحوصة: ${cells}`);
console.log(`  خلايا مجموعها يختلف عن الرسمي: ${problems}`);
console.log('  ' + bar);
console.log();
console.log('  ⚠  تعني أن مجموع بنود الاستمارة في الوثيقة الأصلية لا يساوي المجموع الرسمي.');
console.log('    التطبيق يعرض تنبيهاً للمعلم عند فتح هذه الاستمارة ويحسب على مجموع البنود الفعلي.');
console.log();
console.log('  وحدات كل مقرر (مولّدة في خطة العام):');
for (const s of SUBJECTS) {
  console.log(`    ${s.name.padEnd(28)} ${unitCount(s.id)} وحدات`);
}
console.log();
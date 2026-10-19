/** أي المقررات لها بنود فعلاً في كل مرحلة؟ */

import { CRITERIA_BLOCKS } from '../constants/criteria.data';
import {
  GRADES, SUBJECTS, TERMS, subjectsForGrade, formTotals,
} from '../constants/criteria';
import type { GradeId, SubjectId, TermId } from '../constants/criteria';

const bar = '─'.repeat(74);

console.log();
console.log('  المقررات المخططة × المتوفر من النماذج المعتمدة');
console.log('  ' + bar);
console.log(`  ${'المقرر'.padEnd(26)}${'رابع'.padStart(16)}${'خامس'.padStart(16)}${'أول متوسط'.padStart(16)}${'ثاني متوسط'.padStart(16)}`);
console.log('  ' + bar);

const grades: GradeId[] = ['grade4', 'grade5', 'grade_int1', 'grade_int2'];
const gaps: string[] = [];

for (const s of SUBJECTS) {
  const cells: string[] = [];
  for (const g of grades) {
    let mark = '·';
    for (const k of ['weekly', 'periodic', 'final'] as const) {
      const ft = formTotals(k, g, s.id as SubjectId, 'all');
      if (ft.criteria.length) { mark = '✓'; break; }
    }
    const taught = TERMS.some((t) =>
      subjectsForGrade(g, t.id).includes(s.id as SubjectId)
    );
    if (mark === '·' && taught) {
      mark = '✗';
      gaps.push(`${s.name} — ${g}`);
    }
    cells.push(mark.padStart(16));
  }
  console.log(`  ${s.name.padEnd(26)}${cells.join('')}`);
}

console.log('  ' + bar);
console.log('  ✓ فيه نماذج معتمدة    · غير مدرَّس    ✗ مدرَّس لكن بلا نماذج');
console.log();

if (gaps.length) {
  console.log('  مقررات مدرَّسة بلا نماذج معتمدة في الوثائق:');
  for (const g of gaps) console.log(`    ✗ ${g}`);
} else {
  console.log('  كل المقررات المدرَّسة لها نماذج معتمدة ✓');
}
console.log();

console.log('  كتل البنود المستخرجة من الوثائق:');
for (const b of CRITERIA_BLOCKS) {
  let n = 0;
  const subs = new Set<string>();
  for (const k of ['weekly', 'periodic', 'final'] as const) {
    for (const [sid, arr] of Object.entries(b[k])) {
      n += arr.length;
      subs.add(sid);
    }
  }
  console.log(`    ${b.grade.padEnd(12)} ${b.term.padEnd(6)} ${String(n).padStart(3)} بند   المقررات: ${[...subs].join(', ')}`);
}
console.log();
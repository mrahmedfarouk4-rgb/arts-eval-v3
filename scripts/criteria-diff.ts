/**
 * تقرير بنود التقييم لكل مقرر ونوع — لإثبات أن البنود مختلفة وليست موحّدة.
 */

import { CRITERIA_BLOCKS } from '../constants/criteria.data';
import {
  GRADES, TERMS, SUBJECTS, subjectsForGrade,
} from '../constants/criteria';
import type { CriteriaKind } from '../constants/criteria.data';

const AR: Record<string, string> = {
  grade4: 'رابع', grade5: 'خامس',
  grade_int1: 'أول متوسط', grade_int2: 'ثاني متوسط',
};
const KN: Record<CriteriaKind, string> = {
  weekly: 'تكويني', periodic: 'مرحلي', final: 'ختامي',
};
const KINDS: CriteriaKind[] = ['weekly', 'periodic', 'final'];

const bar = '─'.repeat(86);

/** أول ٦٠ حرفاً من البند الأول */
const head = (t: string) => (t.length > 58 ? `${t.slice(0, 58)}…` : t);

console.log();
console.log('  بنود كل مقرر — هل هي مختلفة فعلاً؟');
console.log('  ' + bar);

let totalSubjects = 0;
let sameAsFirst = 0;
const diffProof: { grade: string; term: string; kind: CriteriaKind; a: string; b: string }[] = [];

for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  for (const t of TERMS) {
    const subs = subjectsForGrade(g.id, t.id);
    if (!subs.length) continue;

    console.log();
    console.log(`  ▌ ${AR[g.id]} — ${t.name}`);
    console.log('  ' + bar);
    console.log(`  ${'المقرر'.padEnd(22)}${'النوع'.padStart(8)}${'بنود'.padStart(6)}   أول بند`);
    console.log('  ' + bar);

    for (const kind of KINDS) {
      const seen = new Map<string, string[]>();

      for (const sid of subs) {
        const blk = CRITERIA_BLOCKS.find(
          (b) => b.grade === g.id && (b.term === t.id || b.term === 'all')
        );
        const arr = blk?.[kind]?.[sid];
        const name = SUBJECTS.find((x) => x.id === sid)?.name ?? sid;

        if (!arr?.length) continue;
        totalSubjects++;

        const signature = arr.map((x) => x.text).join('||');
        if (!seen.has(signature)) seen.set(signature, []);
        seen.get(signature)!.push(name);

        console.log(
          `  ${name.padEnd(22)}${KN[kind].padStart(8)}${String(arr.length).padStart(6)}   ${head(arr[0].text)}`
        );
      }

      // كم مجموعة نصية مختلفة داخل هذا النوع؟
      if (seen.size === 1 && seen.values().next().value!.length > 1) {
        sameAsFirst++;
      }
      if (seen.size > 1) {
        const groups = [...seen.values()];
        diffProof.push({
          grade: AR[g.id], term: t.name, kind,
          a: groups[0].join('، '),
          b: groups[1].join('، '),
        });
      }
    }
  }
}

console.log();
console.log('  ' + bar);
console.log(`  مقررات × أنواع لها بنود: ${totalSubjects}`);
console.log(`  مجموعات تشترك في نفس النص بالضبط: ${sameAsFirst}`);
console.log('  ' + bar);

console.log();
console.log('  أمثلة على مقررات بنودها مختلفة داخل نفس النوع:');
for (const d of diffProof.slice(0, 6)) {
  console.log(`    ${d.grade} ${d.term} · ${KN[d.kind]}`);
  console.log(`       { ${d.a} }`);
  console.log(`       { ${d.b} }  ← مختلفة`);
}

console.log();
console.log('  ▌ خلاصة سلم التقييم التكويني (٥ بنود)');
console.log('  ' + bar);
const anyWeekly = CRITERIA_BLOCKS.flatMap((b) =>
  KINDS.map((k) => b[k]?.drawing_basics ?? [])
).find((a) => a.length === 5);
for (const c of anyWeekly ?? []) {
  console.log(`    ${c.id.padEnd(24)} ${c.text}`);
}
console.log('  ' + bar);
console.log();

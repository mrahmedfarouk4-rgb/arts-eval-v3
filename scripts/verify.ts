/**
 * فحص شامل للبنية والبنود — يُشغَّل بـ: npx tsx scripts/verify.ts
 * أو يُنفَّذ ضمنCI للتأكد من سلامة البيانات.
 */

import {
  GRADES,
  SUBJECTS,
  EVAL_KINDS,
  subjectsForGrade,
  resolveCriteria,
  formTotals,
  levelFor,
  convertTo2,
  convertTo30,
} from '../constants/criteria';
import { CRITERIA_BLOCKS } from '../constants/criteria.data';

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    console.log('  [FAIL] ' + msg);
    fail++;
  }
};

const SHORT_GRADE: Record<string, string> = {
  grade4: 'رابع',
  grade5: 'خامس',
  grade_int1: 'أول متوسط',
  grade_int2: 'ثاني متوسط',
  intermediate1: 'أول(قديم)',
};

const SHORT_KIND: Record<string, string> = {
  weekly: 'تكويني',
  periodic: 'مرحلي',
  final: 'ختامي',
};

console.log('='.repeat(70));
console.log('فحص بنود التقييم الرسمية');
console.log('='.repeat(70));

/* 1) إحصاء عام */
let totalCriteria = 0;
for (const b of CRITERIA_BLOCKS) {
  for (const k of ['weekly', 'periodic', 'final'] as const) {
    for (const arr of Object.values(b[k])) totalCriteria += arr.length;
  }
}
console.log(`\n1) إجمالي البنود: ${totalCriteria}`);
ok(totalCriteria === 532, `المتوقع 532 بند، الموجود ${totalCriteria}`);

console.log(`   الكتل: ${CRITERIA_BLOCKS.length}`);
ok(CRITERIA_BLOCKS.length === 6, `المتوقع 6 كتل، الموجود ${CRITERIA_BLOCKS.length}`);

/* 2) كل مرحلة لها مقررات */
console.log('\n2) المقررات المتاحة لكل مرحلة:');
for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  const subs = subjectsForGrade(g.id, 'all');
  console.log(`   ${g.name.padEnd(26)} ${subs.length} مقررات: ${subs.join(', ')}`);
  ok(subs.length > 0, `${g.name} بلا مقررات`);
}

/* 3) مجموع كل استمارة يطابق المتوقع (عدا الموثّق خطأً) */
console.log('\n3) مجموع بنود كل استمارة:');
const KNOWN_BAD = new Set([
  'grade4|final|drawing_basics',
  'grade4|final|saudi_arts',
  'grade4|final|handicrafts',
  'grade_int1|final|drawing_basics',
  'grade_int1|final|saudi_arts',
]);

let mismatches = 0;
for (const g of GRADES) {
  if (g.id === 'intermediate1') continue;
  for (const s of subjectsForGrade(g.id, 'all')) {
    for (const k of EVAL_KINDS) {
      const t = formTotals(k.id, g.id, s);
      const expect = k.officialMax;
      const key = `${g.id}|${k.id}|${s}`;
      const known = KNOWN_BAD.has(key);
      const good = t.actualMax === expect;
      if (!good && !known) mismatches++;
      const mark = good ? 'OK ' : known ? '!! ' : 'XX ';
      console.log(
        `   [${mark}] ${SHORT_GRADE[g.id].padEnd(8)} ${SHORT_KIND[k.id].padEnd(8)} ${s.padEnd(20)} ${String(t.actualMax).padStart(2)}/${expect}`
      );
    }
  }
}
ok(mismatches === 0, `${mismatches} استمارة غير متوقعة مجموعها مختلف`);

/* 4) الوراثة: grade_int2 يرث grade_int1، grade5 يرث grade4 */
console.log('\n4) الوراثة بين المراحل:');
const inherit1 = resolveCriteria('weekly', 'grade_int2', 'digital_drawing');
const base1 = resolveCriteria('weekly', 'grade_int1', 'digital_drawing');
console.log(`   grade_int2 / الرسم الرقمي: ${inherit1.length} بند`);
ok(inherit1.length > 0 || base1.length === 0, 'فشل الوراثة grade_int2 → grade_int1');
if (base1.length > 0) {
  ok(
    inherit1.length === base1.length,
    'grade_int2 لا يرث بنود grade_int1 بشكل صحيح'
  );
}

const inter1 = resolveCriteria('weekly', 'intermediate1', 'digital_drawing');
ok(
  inter1.length === base1.length,
  'intermediate1 (المعرّف القديم) لا يُعامَل كـ grade_int1'
);
console.log(`   intermediate1 (قديم) = grade_int1: ${inter1.length === base1.length ? 'صحيح' : 'خطأ'}`);

/* 5) قواعد التحويل الرسمية */
console.log('\n5) قواعد التحويل:');
const t20 = [
  [0, 0.0], [1, 0.13], [2, 0.27], [3, 0.4], [4, 0.53], [5, 0.67],
  [6, 0.8], [7, 0.93], [8, 1.07], [9, 1.2], [10, 1.33], [11, 1.47],
  [12, 1.6], [13, 1.73], [14, 1.87], [15, 2.0], [20, 2.0],
];
let bad2 = 0;
for (const [raw, expected] of t20) {
  const got = parseFloat(convertTo2(raw as number));
  if (Math.abs(got - (expected as number)) > 0.02) {
    console.log(`   [FAIL] تحويل 20 إلى 2: الدرجة ${raw} — المتوقع ${expected} — والناتج ${got}`);
    bad2++;
  }
}
ok(bad2 === 0, `${bad2} حالة خطأ في تحويل 20→2`);
console.log(`   20 → 2 : ${bad2 === 0 ? 'كل الحالات مطابقة للجدول المرجعي' : 'أخطاء'}`);

const t30: [number, number][] = [[0, 0], [15, 10], [30, 20], [45, 30], [50, 30], [60, 30]];
let bad30 = 0;
for (const [raw, expected] of t30) {
  const got = convertTo30(raw);
  if (Math.abs(got - expected) > 0.01) {
    console.log(`   [FAIL] تحويل 60 إلى 30: الدرجة ${raw} — المتوقع ${expected} — والناتج ${got}`);
    bad30++;
  }
}
ok(bad30 === 0, `${bad30} حالة خطأ في تحويل 60→30`);
console.log(`   60 → 30: ${bad30 === 0 ? 'المعادلة الرسمية (÷45×30) صحيحة' : 'أخطاء'}`);

/* 6) الفئات التفسيرية مطابقة للوثائق */
console.log('\n6) الفئات التفسيرية:');
const cases: [typeof EVAL_KINDS[number]['id'], number, string][] = [
  ['weekly', 7, 'دون الهدف'],
  ['weekly', 8, 'يقترب من الهدف'],
  ['weekly', 12, 'حقق الهدف'],
  ['weekly', 16, 'يتخطى الهدف (موهوب)'],
  ['periodic', 30, 'لم يحقق الهدف'],
  ['periodic', 31, 'يقترب من الهدف'],
  ['periodic', 39, 'حقق الهدف'],
  ['periodic', 46, 'يتخطى الهدف'],
  ['final', 19, 'دون الأهداف — خطة فردية'],
  ['final', 20, 'اقترب من الهدف — أداء مقبول'],
  ['final', 36, 'متقن — يُظهر إتقاناً للمهارات'],
  ['final', 41, 'موهوب — يحتاج برنامج فردي'],
];
let badLvl = 0;
for (const [kind, score, expectLabel] of cases) {
  const lv = levelFor(kind, score);
  if (!lv || !lv.label.includes(expectLabel.slice(0, 10))) {
    console.log(`   [FAIL] ${kind} — الدرجة ${score}: المتوقع "${expectLabel}" والناتج "${lv?.label ?? 'null'}"`);
    badLvl++;
  }
}
ok(badLvl === 0, `${badLvl} حالة خطأ في الفئات التفسيرية`);
console.log(`   ${cases.length} حالة: ${badLvl === 0 ? 'كلها مطابقة' : 'أخطاء'}`);

/* 7) سلامة النصوص */
console.log('\n7) سلامة النصوص العربية:');
let latin = 0, empty = 0, long = 0;
for (const b of CRITERIA_BLOCKS) {
  for (const k of ['weekly', 'periodic', 'final'] as const) {
    for (const [sid, arr] of Object.entries(b[k])) {
      for (const c of arr) {
        if (!c.text || c.text.trim().length < 8) empty++;
        if (c.text.length > 300) long++;
        if (/[\uFFFD]/.test(c.text)) latin++;
      }
    }
  }
}
ok(empty === 0, `${empty} بند بنص فارغ أو قصير`);
ok(long === 0, `${long} بند بنص طويل جداً`);
ok(latin === 0, `${latin} بند فيه محارف تالفة`);
console.log(`   نصوص سليمة: ${empty === 0 && long === 0 && latin === 0 ? 'نعم' : 'لا'}`);

/* النتيجة */
console.log('\n' + '='.repeat(70));
if (fail === 0) {
  console.log('✅ نجحت جميع الفحوص');
} else {
  console.log(`❌ فشل ${fail} فحص`);
}
console.log('='.repeat(70));

process.exit(fail === 0 ? 0 : 1);

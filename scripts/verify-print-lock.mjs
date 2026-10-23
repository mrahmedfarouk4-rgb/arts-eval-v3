#!/usr/bin/env node
/**
 * فحص قفل الورقة الطباعية الرسمية
 * ===================================================================
 * يشغّل هذا السكربت بصمات SHA-256 لملفات النموذج المعتمد ويقارنها
 * بالبصمات المحفوظة في scripts/print-lock.json.
 *
 * الاستخدام:
 *   node scripts/verify-print-lock.mjs            // فحص
 *   node scripts/verify-print-lock.mjs --update   // إعادة خط الأساس
 *
 * إعادة خط الأساس ممنوعة إلا بقرار صريح وبإصدار جديد معتمد.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = resolve(root, 'scripts/print-lock.json');
const update = process.argv.includes('--update');

const sha256 = (path) =>
  createHash('sha256')
    .update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex');

if (!existsSync(lockPath)) {
  console.error('✖ ملف القفل غير موجود: scripts/print-lock.json');
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const files = Object.keys(lock.files ?? {});

if (files.length === 0) {
  console.error('✖ ملف القفل لا يحتوي أي ملفات.');
  process.exit(1);
}

let bad = 0;
const current = {};

for (const rel of files) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`✖ ملف مشمول بالقفل غير موجود: ${rel}`);
    bad++;
    continue;
  }
  const hash = sha256(abs);
  current[rel] = hash;
  if (!update && hash !== lock.files[rel]) {
    console.error(`✖ تغيير مكتشف في: ${rel}`);
    console.error(`   المتوقع: ${lock.files[rel]}`);
    console.error(`   الحالي : ${hash}`);
    bad++;
  }
}

/* التحقق من الإصدار المعلن داخل الوحدة نفسها */
const lockSource = readFileSync(resolve(root, 'lib/print-lock.ts'), 'utf8');
const versionMatch = lockSource.match(/version:\s*'([^']+)'/);
if (versionMatch && versionMatch[1] !== lock.version) {
  console.error(
    `✖ إصدار النموذج غير متطابق: الملف ${versionMatch[1]} — القفل ${lock.version}`
  );
  bad++;
}

if (update) {
  const next = {
    ...lock,
    files: { ...lock.files, ...current },
  };
  writeFileSync(lockPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log('✔ أُعيد خطّ أساس القفل. لا تفعل هذا إلا بإصدار معتمد جديد.');
  process.exit(0);
}

if (bad) {
  console.error('');
  console.error('⛔ الورقة الطباعية الرسمية مجمّدة ولا يجوز تعديلها.');
  console.error('   إن كان التعديل معتمداً رسمياً، أصدر إصداراً جديداً ثم:');
  console.error('   node scripts/verify-print-lock.mjs --update');
  console.error('   راجع: PRINT-FORM-LOCK.md');
  process.exit(1);
}

console.log(
  `✔ الورقة الطباعية الرسمية سليمة — الإصدار ${lock.version} (${files.length} ملفات مقفلة)`
);

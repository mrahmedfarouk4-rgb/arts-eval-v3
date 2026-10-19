/**
 * فحص منطق الحسابات — يُشغَّل بـ: npx tsx scripts/verify-accounts.ts
 * ---------------------------------------------------------------------------
 * نحقن تخزيناً وهمياً بدل AsyncStorage الحقيقي، فنختبر المنطق وحده بلا جهاز.
 * يغطّي: الزرع · كلمة السر لكل حساب · إسناد المقررات · الترحيل · الجلسة.
 */

import Module from 'node:module';

/* ---------------- تخزين وهمي في الذاكرة ---------------- */

const mem = new Map<string, string>();

const stub = {
  getItem: async (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: async (k: string, v: string) => {
    mem.set(k, String(v));
  },
  removeItem: async (k: string) => {
    mem.delete(k);
  },
  clear: async () => {
    mem.clear();
  },
};

const STUB_ID = '\0stub-async-storage';
const origResolve = (Module as unknown as {
  _resolveFilename: (req: string, ...rest: unknown[]) => string;
})._resolveFilename;

(Module as unknown as { _resolveFilename: unknown })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request.includes('@react-native-async-storage/async-storage')) return STUB_ID;
  return origResolve.call(this, request, ...rest);
};

(require as unknown as { cache: Record<string, unknown> }).cache[STUB_ID] = {
  id: STUB_ID,
  filename: STUB_ID,
  loaded: true,
  exports: { default: stub, __esModule: true },
};

/* ---------------- الأدوات ---------------- */

// تُستدعى داخل main() بعد تركيب الوهمي، وإلا حُمّلت Accounts قبله
type SubjectId =
  | 'drawing_basics'
  | 'saudi_arts'
  | 'cartoon'
  | 'watercolor'
  | 'handicrafts'
  | 'character_design'
  | 'digital_drawing'
  | 'color_expression';

const ALL: SubjectId[] = [];

let pass = 0;
let fail = 0;

const ok = (cond: boolean, msg: string) => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log('  [FAIL] ' + msg);
  }
};

const eq = <T,>(a: T, b: T, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

const K = '@v2/accounts';
const reset = () => mem.clear();

/* ================================================================ */

async function main() {
  const A = await import('../lib/accounts');
  const { SUBJECTS } = await import('../constants/criteria');
  ALL.length = 0;
  for (const x of SUBJECTS) ALL.push(x.id);
  const { sha256Hex } = await import('../lib/sha256');

  console.log('='.repeat(70));
  console.log('فحص منطق الحسابات');
  console.log('='.repeat(70));

  /* 1) الزرع عند أول تشغيل */
  console.log('\n1) الزرع — admin / admin');
  {
    reset();
    const list = await A.listAccounts();
    ok(list.length === 1, `حساب واحد بالضبط، الموجود ${list.length}`);
    eq(list[0]?.username, 'admin', 'اسم المستخدم');
    eq(list[0]?.role, 'admin', 'الصلاحية');
    ok(await A.hasAdmin(), 'hasAdmin = true');

    const good = await A.authenticate('admin', 'admin');
    ok(good.ok, 'الدخول بـ admin/admin ينجح');
    const bad = await A.authenticate('admin', 'wrong');
    ok(!bad.ok && bad.reason === 'wrong-password', 'كلمة خاطئة تُرفض');
    const nobody = await A.authenticate('x', 'admin');
    ok(!nobody.ok && nobody.reason === 'not-found', 'مستخدم مجهول يُرفض');
  }

  /* 2) تغيير كلمة سر المشرف تصير كلمة سره هو */
  console.log('\n2) تغيير كلمة سر المشرف');
  {
    reset();
    const r = await A.setAccountPassword((await A.listAccounts())[0].id, 'sirr1234');
    ok(r.ok, r.error ?? 'تم التغيير');
    ok(!(await A.authenticate('admin', 'admin')).ok, 'الكلمة القديمة لم تعد تعمل');
    ok((await A.authenticate('admin', 'sirr1234')).ok, 'الكلمة الجديدة تعمل');
    ok(!(await A.isAdminPasswordDefault()), 'isAdminPasswordDefault = false بعد التغيير');
  }

  /* 3) كلمة سر مستقلة لكل معلم */
  console.log('\n3) كلمة سر خاصة بكل معلم');
  {
    reset();
    const t1 = await A.addAccount({
      username: 'salma', name: 'أ. سلمى', role: 'teacher',
      subjectIds: ['drawing_basics'], password: 'salma2026',
    });
    const t2 = await A.addAccount({
      username: 'khalid', name: 'أ. خالد', role: 'teacher',
      subjectIds: ['cartoon'], password: 'khalid2026',
    });
    ok(t1.ok && t2.ok, 'إضافة حسابين');

    ok((await A.authenticate('salma', 'salma2026')).ok, 'سلمى تدخل بكلمتها');
    ok((await A.authenticate('khalid', 'khalid2026')).ok, 'خالد يدخل بكلمته');
    ok(!(await A.authenticate('salma', 'khalid2026')).ok, 'كلمة خالد لا تفتح حساب سلمى');
    ok(!(await A.authenticate('khalid', 'salma2026')).ok, 'كلمة سلمى لا تفتح حساب خالد');

    const acc = await A.getAccountByUsername('salma');
    ok(acc?.subjectIds?.length === 1, 'سلمى لها مقرر واحد');
  }

  /* 4) إسناد المقررات — ما يراه المعلم */
  console.log('\n4) إسناد المقررات');
  {
    reset();
    await A.addAccount({
      username: 'nora', name: 'أ. نورة', role: 'teacher',
      subjectIds: ['drawing_basics', 'cartoon'], password: 'nora1234',
    });
    const r = await A.authenticate('nora', 'nora1234');
    ok(r.ok, 'دخول نورة');
    const user = r.ok ? r.account : null;

    eq(A.visibleSubjects(user, ALL), ['drawing_basics', 'cartoon'], 'المعلم يرى مقرراته فقط');
    eq(A.visibleSubjects({ role: 'admin', subjectIds: [] }, ALL).length, ALL.length, 'المشرف يرى الكل');
    eq(A.visibleSubjects(null, ALL).length, ALL.length, 'الزائر يرى الكل');
    eq(A.visibleSubjects({ role: 'teacher', subjectIds: [] }, ALL), [], 'معلم بلا مقررات يرى لا شيء');

    // ترتيب القائمة محفوظ — القائمة تُفلتر بالترتيب الرسمي
    const order = ALL.slice().reverse();
    eq(A.visibleSubjects({ role: 'teacher', subjectIds: ['cartoon', 'drawing_basics'] }, order),
      ['cartoon', 'drawing_basics'], 'الترتيب الرسمي محفوظ');
  }

  /* 5) كلمة سر مشتركة لكل المعلمين */
  console.log('\n5) كلمة سر مشتركة (ضبط سريع)');
  {
    reset();
    await A.addAccount({ username: 'acc1', name: 'أ. ١', role: 'teacher', subjectIds: [], password: 'aaaa1111' });
    await A.addAccount({ username: 'acc2', name: 'أ. ٢', role: 'teacher', subjectIds: [], password: 'bbbb2222' });
    const r = await A.setRolePassword('teacher', 'shared99');
    ok(r.ok, r.error ?? 'تم الضبط');
    ok((await A.authenticate('acc1', 'shared99')).ok, 'acc1 بالكلمة المشتركة');
    ok((await A.authenticate('acc2', 'shared99')).ok, 'acc2 بالكلمة المشتركة');
    ok(!(await A.authenticate('acc1', 'aaaa1111')).ok, 'الكلمة القديمة سقطت');
  }

  /* 6) قيود كلمة السر */
  console.log('\n6) قيود كلمة السر');
  {
    reset();
    const short = await A.addAccount({ username: 'zed', name: 'ز', role: 'teacher', subjectIds: [], password: 'ab' });
    ok(!short.ok && /قصير/.test(short.error ?? ''), 'أقل من ٤ خانات مرفوض');

    const same = await A.addAccount({ username: 'khaled', name: 'خ', role: 'teacher', subjectIds: [], password: 'Khaled' });
    ok(!same.ok && /نفس اسم المستخدم/.test(same.error ?? ''), `كلمة السر = اسم المستخدم مرفوضة — ${JSON.stringify(same)}`);

    const none = await A.addAccount({ username: 'zed', name: 'ز', role: 'teacher', subjectIds: [], password: '' });
    ok(!none.ok, 'حساب بلا كلمة سر مرفوض');

    const dup = await A.addAccount({ username: 'admin', name: 'x', role: 'teacher', subjectIds: [], password: 'abcd1234' });
    ok(!dup.ok && /مستخدم بالفعل/.test(dup.error ?? ''), 'اسم مستخدم مكرر مرفوض');
  }

  /* 7) الإيقاف والحذف */
  console.log('\n7) الإيقاف والحذف');
  {
    reset();
    const a = await A.addAccount({ username: 'majed', name: 'أ. ماجد', role: 'teacher', subjectIds: [], password: 'majed123' });
    ok(a.ok, 'إضافة');
    const acc = (await A.getAccountByUsername('majed'))!;
    await A.updateAccount(acc.id, { enabled: false });
    const off = await A.authenticate('majed', 'majed123');
    ok(!off.ok && off.reason === 'disabled', 'الحساب الموقوف لا يدخل');

    const admin = (await A.listAccounts()).find((x) => x.role === 'admin')!;
    const delLast = await A.deleteAccount(admin.id);
    ok(!delLast.ok && /آخر حساب مشرف/.test(delLast.error ?? ''), 'حذف آخر مشرف مرفوض');

    const demote = await A.updateAccount(admin.id, { role: 'teacher' });
    ok(!demote.ok && /بلا حساب مشرف/.test(demote.error ?? ''), 'تنزيل آخر مشرف مرفوض');

    await A.deleteAccount(acc.id);
    ok(!(await A.getAccountByUsername('majed')), 'الحساب حُذف');
  }

  /* 8) تحديث المقررات بلا إعادة دخول */
  console.log('\n8) تحديث المقررات بعد الدخول');
  {
    reset();
    await A.addAccount({ username: 'fares', name: 'أ. فارس', role: 'teacher', subjectIds: ['cartoon'], password: 'fares123' });
    const r = await A.authenticate('fares', 'fares123');
    const acc = (await A.getAccountByUsername('fares'))!;
    await A.persistSession(acc);

    let s = await A.readSession();
    eq(s?.subjectIds, ['cartoon'], 'الجلسة تحمل المقرر الأول');

    await A.updateAccount(acc.id, { subjectIds: ['cartoon', 'watercolor'] });
    s = await A.readSession();
    eq(s?.subjectIds, ['cartoon', 'watercolor'], 'الجلسة تحدّثت بلا إعادة دخول');

    // إيقاف الحساب ينهي الجلسة
    await A.updateAccount(acc.id, { enabled: false });
    s = await A.readSession();
    ok(s === null, 'الجلسة انتهت بإيقاف الحساب');
    ok(r.ok, 'كان الدخول ناجحاً قبل الإيقاف');
  }

  /* 9) الترحيل من الصيغة القديمة */
  console.log('\n9) الترحيل — حسابات بلا subjectIds وكلمة سر مشتركة');
  {
    reset();
    const legacy = {
      accounts: [
        {
          id: 'a1', username: 'admin', name: 'المشرف', role: 'admin',
          enabled: true, pwHash: '', createdAt: '',
        },
        {
          id: 'a2', username: 'old', name: 'أ. قديم', role: 'teacher',
          enabled: true, pwHash: '', createdAt: '',
        },
      ],
      teacherPwHash: '',
      adminPwHash: '',
    };
    // نضع التجزئات كما كانت: الكلمة المشتركة في حقول الدور
    const legacy2 = { ...legacy };
    legacy2.adminPwHash = sha256Hex('artseval.v2.' + '01020');
    legacy2.teacherPwHash = sha256Hex('artseval.v2.' + 'oldpw');
    mem.set(K, JSON.stringify(legacy2));

    ok((await A.authenticate('old', 'oldpw')).ok, 'المعلم القديم يدخل بالكلمة المشتركة');
    ok((await A.authenticate('admin', '01020')).ok, 'المشرف القديم يدخل');

    const after = await A.listAccounts();
    ok(after.every((x) => Array.isArray(x.subjectIds)), 'كل حساب صار له subjectIds');
    ok(after.every((x) => x.pwHash.length > 0), 'كل حساب صار له pwHash بعد الترحيل');

    // التبديل إلى per-account يبقى صالحاً
    const old = after.find((x) => x.username === 'old')!;
    await A.updateAccount(old.id, { subjectIds: ['handicrafts'] });
    ok((await A.authenticate('old', 'oldpw')).ok, 'الدخول ما زال يعمل بعد تعديل المقررات');
  }

  /* 10) لا نصّ صريح في التخزين */
  console.log('\n10)Storage — لا كلمة سر نصّية');
  {
    reset();
    await A.addAccount({ username: 'sara', name: 'أ. سارة', role: 'teacher', subjectIds: [], password: 'saraSecret9' });
    await A.persistSession((await A.getAccountByUsername('sara'))!);
    const dump = [...mem.values()].join('\n');
    ok(!dump.includes('saraSecret9'), 'كلمة السر لا تظهر نصّية في أي مخزن');
    ok(!dump.includes('saraSecret9'.slice(0, 4) + 'ecret'), 'لا جزء من الكلمة نصيًا');
  }

  /* 11) الضيوف بلا جلسة */
  console.log('\n11) الضيوف');
  {
    reset();
    ok((await A.readSession()) === null, 'لا جلسة لضيف');
    await A.clearSession();
    ok((await A.readSession()) === null, 'clearSession يمسح');
  }

  /* ---------------------------------------------------------------- */

  console.log('\n' + '='.repeat(70));
  console.log(`النتيجة: ${pass} نجح · ${fail} فشل`);
  console.log('='.repeat(70));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

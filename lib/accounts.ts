/**
 * حسابات المعلمين والمشرف — تُدار من داخل التطبيق.
 * ---------------------------------------------------------------------------
 * القرار المعتمد:
 *   • زرع حساب المشرف `admin` / `admin` عند أول تشغيل — كلمة المرور
 *     الأساسية التي طلبها المالك. بعد الدخول يغيّرها المشرف، فتصبح كلمة سره.
 *   • لكل حساب **كلمة سر خاصة به** — المعلم يدخل باسمه وكلمته، لا بواحدة
 *     يقاسمها الجميع. (سابقاً كانت المعلمين يتقاسمون كلمة واحدة.)
 *   • لكل حساب **مقررات مسندة** — المعلم لا يرى في التقييم إلا مقرراته.
 *     المشرف يرى كل المقررات.
 *   • ولكل حساب **مراحل مسندة** — المعلم لا يرى في لوحة العمل إلا الصفوف
 *     التي أسندها إليه المشرف. بلا إسناد يرى الكل (توافق الحسابات القديمة).
 *
 * ⚠ كلمة المرور الافتراضية `admin` تسافر مع التطبيق، فمن ملك نسخة APK
 *   يستطيع فتح لوحة المشرف. لذلك تُعرض تحذير ثابت في الإعدادات حتى
 *   تُغيَّر، وهذا لكطرك.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256Hex } from '@/lib/sha256';
import type { GradeId, SubjectId } from '@/constants/criteria';

const K_ACCOUNTS = '@v2/accounts';
const K_SESSION = '@v2/auth';

export type Role = 'admin' | 'teacher';

/** حساب المشرف المبدئي — يُزرع مرّة واحدة عند أول تشغيل */
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin',
  name: 'المشرف',
} as const;

export interface Account {
  id: string;
  /** اسم الدخول — فريد، بلا مسافات */
  username: string;
  /** الاسم الظاهر في «اسم المعلم» بالاستمارات */
  name: string;
  role: Role;
  enabled: boolean;
  /**
   * SHA-256 لكلمة سر **هذا الحساب**.
   * لا تُخزَّن نصّية أبداً — `exportAll` يصدّر كل البيانات في JSON يُرسل.
   */
  pwHash: string;
  /** المقررات المسندة — المعلم لا يرى غيرها. المشرف يتجاوز هذا الحد. */
  subjectIds: SubjectId[];
  /**
   * المراحل (الصفوف) المسندة — المعلم لا يرى غيرها في لوحة العمل.
   * مصفوفة فارغة = كل المراحل (توافق الحسابات التي سبقت هذا الخيار).
   */
  gradeIds?: GradeId[];
  createdAt: string;
  /**
   * آخر تعديل — تعتمد عليه المزامنة: الأحدث يفوز عند التعارض بين الأجهزة.
   * الحسابات القديمة قد لا تحمله، فتُعامل بـ `createdAt`.
   */
  updatedAt?: string;
  /**
   * حساب مُزرَع محلياً عند أول تشغيل (المشرف الافتراضي).
   * لا يُرفع إلى السحابة ولا يطمس حساباً حقيقياً بنفس اسم الدخول.
   */
  seeded?: boolean;
  /**
   * علامة حذف — لا نحذف الصف من الملف حتى يُحذف من السحابة أيضاً،
   * وإلا عاد من جهاز آخر في المزامنة التالية.
   */
  deleted?: boolean;
}

interface AccountsFile {
  accounts: Account[];
  /**
   * كلمتا سر قديمتان مشتركتان — باقيتان للترحيل فقط.
   * الحسابات المنقولة تأخذ منها `pwHash` مرّة واحدة ثم reliance تصير
   * على `Account.pwHash` وحدها.
   */
  teacherPwHash: string;
  adminPwHash: string;
}

const EMPTY: AccountsFile = { accounts: [], teacherPwHash: '', adminPwHash: '' };

/** ملح ثابت — يمنع أن يكون التجزئة لكلمة سر معروفة قابلةً للبحث العكسي */
const SALT = 'artseval.v2.';

function hashPassword(pw: string): string {
  return sha256Hex(SALT + pw);
}

/* ------------------------------------------------------------------ */
/*  التخزين                                                           */
/* ------------------------------------------------------------------ */

function newId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function save(f: AccountsFile): Promise<void> {
  await AsyncStorage.setItem(K_ACCOUNTS, JSON.stringify(f));
}

/**
 * يرفع ملف الحسابات القديم إلى الصيغة الحالية.
 *
 * الفرقان الجوهريان:
 *   1. `subjectIds` لم تكن موجودة → مصفوفة فارغة (المعلم لن يرى مقرراً
 *      حتى يُسنده المشرف، وهذا أأمن من منحه كل المقررات بلا قصد).
 *   2. `pwHash` كانت فارغة للمعلمين لأن كلمة سرهم مشتركة →
 *      ننسخ التجزئة المشتركة إلى كل حساب مرة واحدة.
 */
function migrate(f: AccountsFile): AccountsFile {
  let changed = false;

  const accounts = f.accounts.map((a) => {
    const subjectIds: SubjectId[] = Array.isArray(a.subjectIds) ? a.subjectIds : [];
    const gradeIds: GradeId[] = Array.isArray(a.gradeIds) ? a.gradeIds : [];
    let pwHash = a.pwHash ?? '';

    if (!pwHash) {
      const shared = a.role === 'admin' ? f.adminPwHash : f.teacherPwHash;
      if (shared) pwHash = shared;
    }
    if (pwHash !== (a.pwHash ?? '')) changed = true;
    if (subjectIds !== a.subjectIds) changed = true;
    if (gradeIds !== a.gradeIds) changed = true;

    return { ...a, pwHash, subjectIds, gradeIds };
  });

  return changed ? { ...f, accounts } : f;
}

function seedAdmin(): AccountsFile {
  const f: AccountsFile = { ...EMPTY, accounts: [] };
  f.accounts.push({
    id: newId(),
    username: DEFAULT_ADMIN.username,
    name: DEFAULT_ADMIN.name,
    role: 'admin',
    enabled: true,
    pwHash: hashPassword(DEFAULT_ADMIN.password),
    subjectIds: [],
    gradeIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seeded: true,
  });
  f.adminPwHash = hashPassword(DEFAULT_ADMIN.password);
  return f;
}

async function load(): Promise<AccountsFile> {
  let raw: AccountsFile = { ...EMPTY };

  try {
    const text = await AsyncStorage.getItem(K_ACCOUNTS);
    if (text) {
      const parsed = JSON.parse(text) as AccountsFile;
      raw = {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        teacherPwHash: parsed.teacherPwHash ?? '',
        adminPwHash: parsed.adminPwHash ?? '',
      };
    }
  } catch {
    // ملف تالف — نُعيد الزرع بدل أن نترك التطبيق بلا دخول
    const fresh = seedAdmin();
    await save(fresh);
    return fresh;
  }

  // أول تشغيل: زرع المشرف  admin / admin
  if (!raw.accounts.length) {
    const fresh = seedAdmin();
    await save(fresh);
    return fresh;
  }

  const migrated = migrate(raw);
  if (migrated !== raw) await save(migrated);
  return migrated;
}

/* ------------------------------------------------------------------ */
/*  القراءة                                                           */
/* ------------------------------------------------------------------ */

export async function listAccounts(): Promise<Account[]> {
  return (await load()).accounts.filter((a) => !a.deleted);
}

/** كل الحسابات بما فيها المحذوفة (علامة حذف) — للمزامنة فقط */
export async function allAccountsIncludingDeleted(): Promise<Account[]> {
  return (await load()).accounts;
}

/** هل يوجد حساب مشرف؟ — زرعُه يضمن وجوده دائماً */
export async function hasAdmin(): Promise<boolean> {
  return (await load()).accounts.some((a) => a.role === 'admin' && !a.deleted);
}

export async function getAccountByUsername(username: string): Promise<Account | null> {
  const u = normalizeUsername(username);
  return (await load()).accounts.find((a) => a.username === u && !a.deleted) ?? null;
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * هل ما زالت كلمة سر المشرف هي الافتراضية `admin`؟
 * تُستخدم لإظهار تحذير دائم في الإعدادات حتى تُغيَّر.
 */
export async function isAdminPasswordDefault(): Promise<boolean> {
  const f = await load();
  const admins = f.accounts.filter((a) => a.role === 'admin' && !a.deleted);
  if (!admins.length) return false;
  const def = hashPassword(DEFAULT_ADMIN.password);
  return admins.every((a) => a.pwHash === def);
}

/** المقررات التي يراها هذا الحساب — المشرف يرى كل شيء */
export function visibleSubjects(
  account: { role: Role; subjectIds?: SubjectId[] } | null,
  all: SubjectId[]
): SubjectId[] {
  if (!account) return all;
  if (account.role === 'admin') return all;
  const assigned = account.subjectIds ?? [];
  if (!assigned.length) return [];
  const set = new Set(assigned);
  return all.filter((id) => set.has(id));
}

/**
 * المراحل التي يراها هذا الحساب — المشرف والزائر يريان الكل.
 * المعلم بلا مراحل مسندة يرى الكل أيضاً، حتى لا يختفي التطبيق عن
 * الحسابات التي أُنشئت قبل إضافة هذا الخيار. بمجرّد إسناد مرحلة
 * واحدة يُقصَر على ما أُسند فقط.
 */
export function visibleGrades(
  account: { role: Role; gradeIds?: GradeId[] } | null,
  all: GradeId[]
): GradeId[] {
  if (!account) return all;
  if (account.role === 'admin') return all;
  const assigned = account.gradeIds ?? [];
  if (!assigned.length) return all;
  const set = new Set(assigned);
  return all.filter((id) => set.has(id));
}

/* ------------------------------------------------------------------ */
/*  إدارة الحسابات                                                    */
/* ------------------------------------------------------------------ */

function validateUsername(f: AccountsFile, username: string, exceptId?: string): string | null {
  if (!username) return 'اسم المستخدم مطلوب.';
  if (username.length < 3) return 'اسم المستخدم قصير جداً (٣ أحرف على الأقل).';
  if (f.accounts.some((a) => a.username === username && a.id !== exceptId && !a.deleted)) {
    return 'اسم المستخدم «' + username + '» مستخدم بالفعل.';
  }
  return null;
}

export async function addAccount(input: {
  username: string;
  name: string;
  role: Role;
  subjectIds: SubjectId[];
  /** المراحل المسندة — فارغة = كل المراحل */
  gradeIds?: GradeId[];
  /** كلمة سره الأولى — بلاها لا يستطيع الدخول */
  password?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const f = await load();
  const username = normalizeUsername(input.username);
  const name = input.name.trim();

  const bad = validateUsername(f, username);
  if (bad) return { ok: false, error: bad };
  if (!name) return { ok: false, error: 'الاسم الظاهر مطلوب.' };
  if (input.role === 'admin' && !f.accounts.some((a) => a.role === 'admin' && !a.deleted)) {
    return { ok: false, error: 'يجب إنشاء حساب مشرف أولاً.' };
  }
  if (!input.password) return { ok: false, error: 'كلمة سر الحساب مطلوبة.' };
  const weak = weakPassword(input.password, username);
  if (weak) return { ok: false, error: weak };

  f.accounts.push({
    id: newId(),
    username,
    name,
    role: input.role,
    enabled: true,
    pwHash: hashPassword(input.password),
    subjectIds: input.subjectIds ?? [],
    gradeIds: input.gradeIds ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await save(f);
  return { ok: true };
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<Account, 'username' | 'name' | 'role' | 'enabled' | 'subjectIds' | 'gradeIds'>>
): Promise<{ ok: boolean; error?: string }> {
  const f = await load();
  const i = f.accounts.findIndex((a) => a.id === id);
  if (i < 0) return { ok: false, error: 'الحساب غير موجود.' };

  let next = { ...patch };

  if (patch.username !== undefined) {
    const u = normalizeUsername(patch.username);
    const bad = validateUsername(f, u, id);
    if (bad) return { ok: false, error: bad };
    next.username = u;
  }
  if (patch.name !== undefined && !patch.name.trim()) {
    return { ok: false, error: 'الاسم الظاهر مطلوب.' };
  }
  // لا نترك التطبيق بلا مشرف إطلاقاً
  if (patch.role === 'teacher') {
    const a = f.accounts[i];
    if (a.role === 'admin' && !f.accounts.some((x) => x.id !== id && x.role === 'admin' && !x.deleted)) {
      return { ok: false, error: 'لا يمكن أن يبقى التطبيق بلا حساب مشرف.' };
    }
  }

  f.accounts[i] = {
    ...f.accounts[i],
    ...next,
    seeded: false,
    updatedAt: new Date().toISOString(),
  };
  await save(f);
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<{ ok: boolean; error?: string }> {
  const f = await load();
  const i = f.accounts.findIndex((a) => a.id === id);
  if (i < 0) return { ok: false, error: 'الحساب غير موجود.' };
  if (f.accounts[i].role === 'admin' && !f.accounts.some((a) => a.id !== id && a.role === 'admin' && !a.deleted)) {
    return { ok: false, error: 'لا يمكن حذف آخر حساب مشرف.' };
  }
  // علامة حذف لا حذفاً حقيقياً — حتى ينتقل الحذف إلى الأجهزة الأخرى
  f.accounts[i] = { ...f.accounts[i], deleted: true, enabled: false, updatedAt: new Date().toISOString() };
  await save(f);
  return { ok: true };
}

/**
 * دمج الحسابات القادمة من السحابة.
 * القاعدة: الأحدث (`updatedAt`) يفوز، والحذف يُعامل كتعديل عادي.
 * لا نترك التطبيق بلا حساب مشرف مهما حدث.
 */
export async function mergeAccountsFromRemote(remote: Account[]): Promise<number> {
  const f = await load();
  const byId = new Map<string, Account>(f.accounts.map((a) => [a.id, a]));
  const byUsername = new Map<string, Account>(
    f.accounts.filter((a) => !a.deleted).map((a) => [a.username, a])
  );
  const stamp = (a: Account): string => a.updatedAt || a.createdAt || '';
  let changed = 0;

  const normalize = (r: Account): Account => ({
    id: r.id,
    username: normalizeUsername(String(r.username)),
    name: r.name || r.username,
    role: r.role === 'admin' ? 'admin' : 'teacher',
    enabled: r.enabled !== false,
    pwHash: r.pwHash || '',
    subjectIds: Array.isArray(r.subjectIds) ? r.subjectIds : [],
    gradeIds: Array.isArray(r.gradeIds) ? r.gradeIds : [],
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
    seeded: false,
    deleted: r.deleted === true,
  });

  for (const raw of remote) {
    if (!raw?.id || !raw.username) continue;
    const r = normalize(raw);

    /**
     * نفس اسم الدخول بمعرّف مختلف = الجهاز أنشأ حساباً مستقلاً
     * (مثل المشرف المزروع آلياً عند أول تشغيل). نعتبرهما حساباً واحداً
     * ونُبقي المعرّف المحلي، وإلا تكرّر اسم الدخول في كل جهاز.
     */
    const local = byId.get(r.id) ?? byUsername.get(r.username);
    // الحساب المزروع لا يغلب الحساب الحقيقي مهما كان التاريخ
    const forced = !!local?.seeded && !r.deleted;
    if (local && !forced && stamp(r) <= stamp(local)) continue;

    const targetId = local?.id ?? r.id;
    byId.set(targetId, { ...r, id: targetId });
    if (local) byUsername.delete(local.username);
    if (!r.deleted) byUsername.set(r.username, { ...r, id: targetId });
    changed++;
  }

  if (!changed) return 0;

  let accounts = [...byId.values()];
  if (!accounts.some((a) => a.role === 'admin' && !a.deleted)) {
    for (const a of f.accounts.filter((x) => x.role === 'admin' && !x.deleted)) {
      const i = accounts.findIndex((x) => x.id === a.id);
      if (i >= 0) accounts[i] = { ...accounts[i], deleted: false, enabled: true };
      else accounts.push(a);
    }
  }

  await save({ ...f, accounts });
  return changed;
}

/* ------------------------------------------------------------------ */
/*  كلمات السر                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_PW_HASH = hashPassword(DEFAULT_ADMIN.password);

/** كلمة سر ضعيفة معروفة — نرفضها للحسابات الجديدة وننبّه على الموجود */
function weakPassword(pw: string, username: string): string | null {
  if (pw.length < 4) return 'كلمة السر قصيرة جداً (٤ خانات على الأقل).';
  if (pw.trim().toLowerCase() === username.trim().toLowerCase()) {
    return 'كلمة السر لا تكون نفس اسم المستخدم.';
  }
  return null;
}

/** هل كلمة السر هذه هي الافتراضية `admin`؟ */
export function isWeakDefault(pwHash: string): boolean {
  return pwHash === DEFAULT_PW_HASH;
}

/** كلمة سر **هذا الحساب** — المدخل الخاص به */
export async function setAccountPassword(
  id: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const f = await load();
  const a = f.accounts.find((x) => x.id === id);
  if (!a) return { ok: false, error: 'الحساب غير موجود.' };

  const bad = weakPassword(password, a.username);
  if (bad) return { ok: false, error: bad };

  a.pwHash = hashPassword(password);
  a.seeded = false;
  a.updatedAt = new Date().toISOString();
  // كلمة سر المشرف خ人人都يتها تاريخياً — نبقيها متزامنة
  if (a.role === 'admin') {
    f.adminPwHash = a.pwHash;
    f.accounts.forEach((x) => {
      if (x.role === 'admin' && x.id !== id) {
        x.pwHash = a.pwHash;
        x.seeded = false;
        x.updatedAt = new Date().toISOString();
      }
    });
  }
  await save(f);
  return { ok: true };
}

/** كلمة سر واحدة لكل حسابات دور معيّن — اختصار للإعداد السريع */
export async function setRolePassword(
  role: Role,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const f = await load();
  const targets = f.accounts.filter((a) => a.role === role);
  if (!targets.length) return { ok: false, error: 'لا حسابات بهذا الدور.' };

  const bad = weakPassword(password, targets[0].username);
  if (bad) return { ok: false, error: bad };

  const h = hashPassword(password);
  const now = new Date().toISOString();
  targets.forEach((a) => { a.pwHash = h; a.seeded = false; a.updatedAt = now; });
  if (role === 'admin') f.adminPwHash = h;
  else f.teacherPwHash = h;

  await save(f);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  الدخول                                                           */
/* ------------------------------------------------------------------ */

export type AuthFailure =
  | 'not-found'
  | 'disabled'
  | 'wrong-password'
  | 'no-password'
  | 'not-configured';

export type AuthResult =
  | { ok: true; account: Account }
  | { ok: false; reason: AuthFailure };

/**
 * يحاول الدخول بحساب معروف — **بكلمة سره الخاصة**.
 */
export async function authenticate(
  username: string,
  password: string
): Promise<AuthResult> {
  const f = await load();
  if (!f.accounts.length) return { ok: false, reason: 'not-configured' };

  const u = normalizeUsername(username);
  if (!u) return { ok: false, reason: 'not-found' };

  const acc = f.accounts.find((a) => a.username === u && !a.deleted);
  if (!acc) return { ok: false, reason: 'not-found' };
  if (!acc.enabled) return { ok: false, reason: 'disabled' };

  // الحسابات المنقولة قد تكون فارغة التجزئة — نعود للكلمة المشتركة
  const expected =
    acc.pwHash || (acc.role === 'admin' ? f.adminPwHash : f.teacherPwHash);
  if (!expected) return { ok: false, reason: 'no-password' };

  if (hashPassword(password) !== expected) return { ok: false, reason: 'wrong-password' };

  return {
    ok: true,
    account: {
      ...acc,
      subjectIds: acc.subjectIds ?? [],
      gradeIds: acc.gradeIds ?? [],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  الجلسة                                                           */
/* ------------------------------------------------------------------ */

export interface SessionData {
  accountId: string;
  username: string;
  name: string;
  role: Role;
  subjectIds: SubjectId[];
  gradeIds: GradeId[];
  at: string;
}

export async function persistSession(account: Account): Promise<void> {
  const s: SessionData = {
    accountId: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    subjectIds: account.subjectIds ?? [],
    gradeIds: account.gradeIds ?? [],
    at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(K_SESSION, JSON.stringify(s));
}

export async function readSession(): Promise<SessionData | null> {
  try {
    const raw = await AsyncStorage.getItem(K_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessionData;
    if (!s?.accountId) return null;

    const file = await load();
    /**
     * البحث بالمعرّف أولاً، وإن لم يوجد فباسم المستخدم: تكرار صفوف
     * الحساب نفسه في السحابة قد يغيّر المعرّف بعد الدمج، ولا نريد
     * إخراج المستخدم من جلسته لهذا السبب. لا نطبّق البديل إلا إذا
     * كان هناك حساب واحد فقط بهذا الاسم — حتى لا نلتبس بحساب آخر.
     */
    let acc = file.accounts.find((a) => a.id === s.accountId);
    if (!acc) {
      const same = file.accounts.filter((a) => a.username === s.username && !a.deleted);
      if (same.length === 1) acc = same[0];
    }
    // إن حُذف الحساب أو عُطّل بعد تسجيل الدخول نُنهي الجلسة
    if (!acc || !acc.enabled || acc.deleted) {
      await AsyncStorage.removeItem(K_SESSION);
      return null;
    }
    if (acc.id !== s.accountId) {
      // نُثبّت المعرّف الجديد كي لا يتكرر البحث في كل تشغيل
      await AsyncStorage.setItem(
        K_SESSION,
        JSON.stringify({ ...s, accountId: acc.id, subjectIds: acc.subjectIds ?? [], gradeIds: acc.gradeIds ?? [] })
      );
    }
    // نُبقي الاسم والمقررات محدَّثة — عدّلها المشرف بعد الدخول
    return {
      accountId: acc.id,
      username: acc.username,
      name: acc.name,
      role: acc.role,
      subjectIds: acc.subjectIds ?? [],
      gradeIds: acc.gradeIds ?? [],
      at: s.at,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(K_SESSION);
}
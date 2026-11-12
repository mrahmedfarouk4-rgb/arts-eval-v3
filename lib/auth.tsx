/**
 * المصادقة — حسابات حقيقية: المشرف وكلمة سره، وكل معلم باسمه وكلمته.
 * ---------------------------------------------------------------------------
 * قبل: أي اسم يمرّ بكلمة `01020`. ثم: حسابات + كلمة سر مشتركة للمعلمين.
 * الآن: كلمة سر **لكل حساب على حدة**، ولكل حساب مقررات مسندة لا يرى غيرها.
 *
 * حساب المشرف المبدئي `admin` / `admin` يُزرع عند أول تشغيل — انظر
 * `DEFAULT_ADMIN` في lib/accounts. الدخول كضيف ما زال متاحاً: تصفّح
 * وطباعة نماذج الاستمارات بلا تعديل.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  authenticate, clearSession, isAdminPasswordDefault, persistSession, readSession,
  type AuthFailure, type Role,
} from '@/lib/accounts';
import { sync } from '@/lib/store';
import type { SubjectId } from '@/constants/criteria';

// مُعاد التصدير: الجلسة تحتاج قراءة الحساب المحفوظ لتملأ «اسم المعلم»
export { readSession } from '@/lib/accounts';
export { DEFAULT_ADMIN } from '@/lib/accounts';

export type { AuthFailure, Role };

export interface AuthUser {
  accountId: string;
  username: string;
  /** الاسم الظاهر — يُستخدم في «اسم المعلم» */
  name: string;
  role: Role;
  /** المقررات المسندة — المشرف،规范 فارغاً ويرى الكل */
  subjectIds: SubjectId[];
  at: string;
}

interface AuthValue {
  ready: boolean;
  user: AuthUser | null;
  authenticated: boolean;
  isAdmin: boolean;
  /** ما زالت كلمة سر المشرف هي الافتراضية `admin` — ننبّه على تغييرها */
  adminPwIsDefault: boolean;
  /** رسالة عربية جاهزة للعرض عند فشل الدخول */
  loginError: (r: AuthFailure) => string;
  login: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; reason?: AuthFailure }>;
  logout: () => Promise<void>;
  skip: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

const MESSAGES: Record<AuthFailure, string> = {
  'not-found': 'اسم المستخدم غير موجود.',
  disabled: 'هذا الحساب موقوف. راجع المشرف.',
  'wrong-password': 'كلمة المرور غير صحيحة.',
  'no-password': 'لم تُضع كلمة سر لهذا الحساب بعد. راجع المشرف.',
  'not-configured': 'لم تُضبط الحسابات بعد.',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminPwIsDefault, setAdminPwIsDefault] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [session, def] = await Promise.all([readSession(), isAdminPasswordDefault()]);
        setUser(session);
        setAdminPwIsDefault(def);
      } catch {
        /* تجاهل */
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    let r = await authenticate(username, password);

    /**
     * الحساب قد يكون أُنشئ على جهاز آخر ولم يصل بعد إلى هذا الجهاز.
     * قبل أن نخبر المعلم «اسم المستخدم غير موجود» نسحب الحسابات مرة واحدة
     * ثم نعيد المحاولة — فلا يحتاج إلى مزامنة يدوية قبل الدخول.
     */
    if (!r.ok && (r.reason === 'not-found' || r.reason === 'not-configured')) {
      try {
        // force: قد تكون المزامنة معطّلة على جهاز جديد — نريد سحب الحسابات فقط
        await sync({ force: true });
      } catch {
        /* بلا اتصال: نكمل برسالة الفشل الأصلية */
      }
      r = await authenticate(username, password);
    }

    if (!r.ok) return { ok: false, reason: r.reason };
    const u: AuthUser = {
      accountId: r.account.id,
      username: r.account.username,
      name: r.account.name,
      role: r.account.role,
      subjectIds: r.account.subjectIds ?? [],
      at: new Date().toISOString(),
    };
    await persistSession(r.account);
    setUser(u);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const skip = useCallback(async () => {
    // الضيف لا يُحفظ في الجلسة — فإغلاق التطبيق يُنهي التصفّح الحر
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      user,
      authenticated: !!user,
      isAdmin: user?.role === 'admin',
      adminPwIsDefault,
      loginError: (r) => MESSAGES[r] ?? 'تعذّر تسجيل الدخول.',
      login,
      logout,
      skip,
    }),
    [ready, user, adminPwIsDefault, login, logout, skip]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
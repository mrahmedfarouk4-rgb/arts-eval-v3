import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { CriteriaKind } from '@/constants/criteria.data';
import type { GradeId, SubjectId, TermId } from '@/constants/criteria';
import { APP } from '@/constants/criteria';
import {
  getSettings,
  updateSettings,
  runFirstRunSeed,
  cleanupDuplicates,
  isSeeded,
  generateYearPlan,
  type Settings,
  type SeedResult,
  type PlanResult,
} from '@/lib/store';
import { readSession, type AuthUser } from '@/lib/auth';

interface SessionValue {
  ready: boolean;
  settings: Settings;

  // مسار التقييم الجاري
  gradeId: GradeId | null;
  term: TermId;
  subjectId: SubjectId | null;
  kind: CriteriaKind | null;

  setGrade: (g: GradeId) => void;
  setTerm: (t: TermId) => void;
  setSubject: (s: SubjectId | null) => void;
  setKind: (k: CriteriaKind | null) => void;

  resetFlow: () => void;

  // وضع التعديل
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  requestEditMode: () => Promise<void>;

  teacherName: string | null;
  setTeacherName: (n: string) => Promise<void>;

  /** نتيجة زرع البيانات المدمجة (أول تشغيل) */
  seedInfo: SeedResult | null;
  /** هل البيانات الحالية مدمجة؟ */
  seeded: boolean;
  /** إعادة زرع البيانات المدمجة */
  reseed: () => Promise<SeedResult>;

  /** خطة العام: توليد الاستمارات الفارغة الجاهزة */
  planInfo: PlanResult | null;
  /** إعادة توليد خطة العام (آمنة — لا تمسّ المعبّأ) */
  buildPlan: () => Promise<PlanResult>;

  refreshSettings: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // نقرأ الحساب مباشرة من التخزين، لا من useAuth — لأن AuthProvider
  // أعلى في الشجرة، وقراءته هنا تُحدث تحديثاً عند كل تسجيل دخول أو خروج.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    teacher_name: null,
    edit_mode: false,
    sync_enabled: false,
    last_sync: null,
  });

  const [gradeId, setGradeId] = useState<GradeId | null>(null);
  const [term, setTermState] = useState<TermId>('term1');
  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [kind, setKind] = useState<CriteriaKind | null>(null);

  const [seedInfo, setSeedInfo] = useState<SeedResult | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanResult | null>(null);

  const refreshSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    (async () => {
      // الحساب المحفوظ — يملأ «اسم المعلم» في التقارير
      try {
        setAuthUser(await readSession());
      } catch {
        /* تجاهل */
      }

      // زرع بيانات الترحيل قبل تحميل الإعدادات
      const result = await runFirstRunSeed();
      if (result.seeded) setSeedInfo(result);
      setSeeded(await isSeeded());

      // إزالة التكرار (عيب حفظ في التطبيق القديم) وأرشفة الجولات الزائدة
      try {
        const dup = await cleanupDuplicates();
        if (dup.removed || dup.archived || dup.renamed) {
          console.log(
            `[seed] حُذف ${dup.removed} مكرر · أُرشفت ${dup.archived} جولة · وُحّد ${dup.renamed} عنوان`
          );
        }
      } catch (e) {
        console.error('[seed] فشل تنظيف التكرار:', e);
      }

      // توليد خطة العام: استمارات فارغة جاهزة لكل المقررات
      try {
        setPlanInfo(await generateYearPlan());
      } catch (e) {
        console.error('[plan] فشل توليد خطة العام:', e);
      }

      await refreshSettings();
      setReady(true);
    })();
  }, [refreshSettings]);

  const reseed = useCallback(async () => {
    const result = await runFirstRunSeed();
    setSeedInfo(result);
    return result;
  }, []);

  const buildPlan = useCallback(async () => {
    const r = await generateYearPlan();
    setPlanInfo(r);
    return r;
  }, []);

  const setTerm = useCallback((t: TermId) => {
    setTermState(t);
    setSubjectId(null);
  }, []);

  const setGrade = useCallback((g: GradeId) => {
    setGradeId(g);
    setSubjectId(null);
    setKind(null);
  }, []);

  const resetFlow = useCallback(() => {
    setGradeId(null);
    setTermState('term1');
    setSubjectId(null);
    setKind(null);
  }, []);

  const setEditMode = useCallback(
    async (v: boolean) => {
      const s = await updateSettings({ edit_mode: v });
      setSettings(s);
    },
    []
  );

  /**
   * تفعيل وضع التعديل.
   *
   * كان يقارن بكلمة سر مشتركة `APP.editPassword` يقدر عليها كل من ملك
   * الجهاز. صار الحساب نفسه هو الإذن: من سجّل دخوله كمعلم أو مشرف قادر
   * للتعديل، والزائر لا يستطيع.
   */
  const requestEditMode = useCallback(async (): Promise<void> => {
    const s = await updateSettings({ edit_mode: true });
    setSettings(s);
  }, []);

  /**
   * اسم المعلم في التقارير.
   *
   * يليه حساب من سجّل دخوله: الدخول باسم «محمد» يملأ الخانة تلقائياً
   * فلا يُكتب في كل استمارة. ونُبقيه قابلاً للتعديل اليدوي لأن الاسم
   * في الورق الرسمي قد يكون الصيغة الرسمية لا اسم الدخول.
   */
  const setTeacherName = useCallback(async (n: string) => {
    const s = await updateSettings({ teacher_name: n.trim() || null });
    setSettings(s);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      settings,
      // الحساب يغلب على الإعداد القديم: فالحساب مصدر الحقيقة
      teacherName: authUser?.name ?? settings.teacher_name,
      gradeId,
      term,
      subjectId,
      kind,
      setGrade,
      setTerm,
      setSubject: setSubjectId,
      setKind,
      resetFlow,
      editMode: settings.edit_mode,
      setEditMode,
      requestEditMode,
      setTeacherName,
      seedInfo,
      seeded,
      reseed,
      planInfo,
      buildPlan,
      refreshSettings,
    }),
    [
      ready, settings, authUser, gradeId, term, subjectId, kind,
      setGrade, setTerm, resetFlow, setEditMode, requestEditMode, setTeacherName,
      refreshSettings, seedInfo, seeded, reseed, planInfo, buildPlan,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession يجب أن يُستخدم داخل SessionProvider');
  return v;
}

/** مفتاح فريد لتحديد موضع التقييم داخل الجلسة */
export function cellKey(gradeId: string, subjectId: string, kind: string): string {
  return `${gradeId}|${subjectId}|${kind}`;
}

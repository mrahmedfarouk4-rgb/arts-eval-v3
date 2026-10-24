import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GRADES, gradeName, type GradeId } from '@/constants/criteria';
import { c, sp, rad, fnt, fs, gradeColor } from '@/constants/brand';
import { Button, Empty, BrandBar } from '@/components/pro-ui';
import { confirmAction } from '@/lib/dialog';
import { emitHtml } from '@/lib/print-client';
import { buildSixWeekReportHtml } from '@/lib/six-week-print';
import { listStudents, type Student } from '@/lib/store';
import {
  listSixWeekReports, deleteSixWeekReport,
  type SixWeekReport,
} from '@/lib/six-week';

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/** 2026-10-24 ← 24 أكتوبر 2026 */
function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec((iso ?? '').trim());
  if (!m) return iso;
  const month = AR_MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** نسخة شفافة من لون hex — لتلوين البلاطات والشرائح */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
  const n = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** تحويل معامل المسار إلى مرحلة صالحة */
function gradeFromParam(value?: string): GradeId | null {
  return GRADES.some((g) => g.id === value) ? (value as GradeId) : null;
}

function SectionHead({
  title, hint, count,
}: {
  title: string;
  hint?: string;
  count?: number;
}) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      {count !== undefined ? (
        <View style={s.countPill}>
          <Text style={s.countPillText}>{count}</Text>
        </View>
      ) : hint ? (
        <Text style={s.secHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export default function SixWeeksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ grade?: string }>();
  const paramGrade = Array.isArray(params.grade) ? params.grade[0] : params.grade;

  const [reports, setReports] = useState<SixWeekReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradeId | null>(() => gradeFromParam(paramGrade));

  /** اختيار مرحلة: نحفظها في المسار لتعود عند الرجوع من التقرير */
  const selectGrade = (id: GradeId) => {
    setGrade(id);
    router.setParams({ grade: id } as never);
  };

  const clearGrade = () => {
    setGrade(null);
    router.setParams({ grade: undefined } as never);
  };

  /** مزامنة الصف مع المسار عند الرجوع/التقدّم في المتصفح */
  useEffect(() => {
    setGrade(gradeFromParam(paramGrade));
  }, [paramGrade]);

  const load = useCallback(async () => {
    try {
      const [r, st] = await Promise.all([listSixWeekReports(), listStudents()]);
      setReports(r);
      setStudents(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openNew = () => router.push('/six-week-report' as never);

  const openReport = (r: SixWeekReport) =>
    router.push({ pathname: '/six-week-report', params: { id: r.id } } as never);

  const startForStudent = (student: Student) =>
    router.push({
      pathname: '/six-week-report',
      params: {
        studentId: student.id,
        studentName: student.name,
        gradeId: student.grade_id ?? '',
      },
    } as never);

  const onPrint = async (r: SixWeekReport) => {
    setPrintingId(r.id);
    try {
      await emitHtml(buildSixWeekReportHtml(r));
    } catch (e) {
      Alert.alert('تعذّرت الطباعة', e instanceof Error ? e.message : 'حاول مرة أخرى');
    } finally {
      setPrintingId(null);
    }
  };

  const onDelete = async (r: SixWeekReport) => {
    const ok = await confirmAction(
      'حذف التقرير',
      `سيُحذف تقرير "${r.student_name}" نهائياً. هل أنت متأكد؟`,
      { confirmLabel: 'حذف', destructive: true }
    );
    if (!ok) return;
    await deleteSixWeekReport(r.id);
    await load();
  };

  /** صفوف المراحل — كل صف يعرض عدد الطلاب وعدد التقارير */
  const gradeRows = useMemo(() => {
    const base = GRADES.filter((g) => g.id !== 'intermediate1');
    const legacy = GRADES.find((g) => g.id === 'intermediate1');
    const hasLegacy = !!legacy && (
      students.some((st) => st.grade_id === 'intermediate1') ||
      reports.some((r) => r.grade_id === 'intermediate1')
    );
    return [...base, ...(hasLegacy && legacy ? [legacy] : [])].map((g) => ({
      id: g.id as GradeId,
      name: g.name,
      studentCount: students.filter((st) => st.grade_id === g.id).length,
      reportCount: reports.filter((r) => r.grade_id === g.id).length,
    }));
  }, [students, reports]);

  const gradeReports = useMemo(
    () => (grade ? reports.filter((r) => r.grade_id === grade) : []),
    [reports, grade]
  );

  const gradeStudents = useMemo(
    () => (grade ? students.filter((st) => st.grade_id === grade) : []),
    [students, grade]
  );

  const withoutReport = useMemo(() => {
    const has = new Set(gradeReports.map((r) => r.student_id));
    return gradeStudents.filter((st) => !has.has(st.id));
  }, [gradeReports, gradeStudents]);

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <BrandBar title="تقرير الستة أسابيع" />
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ────────────────────────────── تفاصيل المرحلة ────────────────────────────── */

  if (grade) {
    const tone = gradeColor(grade);
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <BrandBar
          title={gradeName(grade)}
          sub={`${gradeStudents.length} طالب · ${gradeReports.length} تقرير`}
          onBack={clearGrade}
        />

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: sp.sm }}>
            <SectionHead title="تقارير الصف" count={gradeReports.length} />
            {gradeReports.length === 0 ? (
              <View style={s.noneBox}>
                <Ionicons name="document-text-outline" size={20} color={c.text4} />
                <Text style={s.noneText}>لا توجد تقارير محفوظة لهذا الصف بعد.</Text>
              </View>
            ) : (
              gradeReports.map((r) => {
                const rTone = withAlpha(tone, 0.12);
                const initial = r.student_name.trim().charAt(0) || '؟';
                return (
                  <View key={r.id} style={s.reportCard}>
                    <View style={[s.edge, { backgroundColor: tone }]} />
                    <View style={s.reportInner}>
                      {/* زر يغطي الصف كاملاً لفتح التقرير، وأزرار الطباعة والحذف مستقلة فوقه */}
                      <Pressable
                        onPress={() => openReport(r)}
                        style={StyleSheet.absoluteFill}
                        accessibilityRole="button"
                        accessibilityLabel={`فتح تقرير ${r.student_name}`}
                      />
                      <View style={[s.tile, { backgroundColor: rTone }]} pointerEvents="none">
                        <Text style={[s.tileInitial, { color: tone }]}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }} pointerEvents="none">
                        <Text style={s.rowName} numberOfLines={1}>{r.student_name}</Text>
                        <Text style={s.rowMeta} numberOfLines={1}>
                          {dateLabel(r.report_date)} · {r.courses.length} مقرر
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => onPrint(r)}
                        hitSlop={6}
                        style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: c.bgLift }]}
                        accessibilityRole="button"
                        accessibilityLabel={`طباعة تقرير ${r.student_name}`}
                      >
                        {printingId === r.id ? (
                          <ActivityIndicator size="small" color={c.primary} />
                        ) : (
                          <Ionicons name="print-outline" size={17} color={c.text3} />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => onDelete(r)}
                        hitSlop={6}
                        style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: c.errBg }]}
                        accessibilityRole="button"
                        accessibilityLabel={`حذف تقرير ${r.student_name}`}
                      >
                        <Ionicons name="trash-outline" size={17} color={c.err} />
                      </Pressable>
                      <View pointerEvents="none">
                        <Ionicons name="chevron-back" size={16} color={c.text4} />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {withoutReport.length > 0 && (
            <View style={{ gap: sp.sm }}>
              <SectionHead title="طلاب بلا تقرير" count={withoutReport.length} />
              {withoutReport.map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() => startForStudent(st)}
                  style={({ pressed }) => [s.reportCard, pressed && { opacity: 0.9 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`بدء تقرير للطالب ${st.name}`}
                >
                  <View style={[s.edge, { backgroundColor: withAlpha(tone, 0.55) }]} />
                  <View style={s.reportInner}>
                    <View style={[s.tile, { backgroundColor: c.bgLift }]}>
                      <Text style={[s.tileInitial, { color: c.text3 }]}>
                        {st.name.trim().charAt(0) || '؟'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName} numberOfLines={1}>{st.name}</Text>
                      <Text style={[s.rowMeta, { color: c.text4 }]}>لم يُنشأ تقرير بعد</Text>
                    </View>
                    <View style={s.startPill}>
                      <Ionicons name="add" size={13} color={c.primary} />
                      <Text style={s.startPillText}>بدء</Text>
                    </View>
                    <Ionicons name="chevron-back" size={16} color={c.text4} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ──────────────────────────────── قائمة المراحل ──────────────────────────────── */

  const noData = students.length === 0 && reports.length === 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        title="تقرير الستة أسابيع"
        right={<Button label="تقرير جديد" icon="add" size="sm" onPress={openNew} />}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="sparkles-outline" size={15} color={c.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>تقييم وصفي بلا درجات</Text>
              <Text style={s.heroMsg}>
                اختر المرحلة ثم الطالب لإنشاء تقرير الستة أسابيع أو متابعة تقاريره المحفوظة.
              </Text>
            </View>
          </View>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroNum}>{students.length}</Text>
              <Text style={s.heroLabel}>طالب</Text>
            </View>
            <View style={s.heroRule} />
            <View style={s.heroStat}>
              <Text style={s.heroNum}>{reports.length}</Text>
              <Text style={s.heroLabel}>تقرير محفوظ</Text>
            </View>
          </View>
        </View>

        {noData ? (
          <Empty
            icon="school-outline"
            title="لا يوجد طلاب بعد"
            message="أضف الطلاب من تبويب «الطلاب» لتبدأ بإنشاء تقارير الستة أسابيع."
            action={
              <Button
                label="إدارة الطلاب"
                icon="people-outline"
                onPress={() => router.push('/students' as never)}
              />
            }
          />
        ) : (
          <>
            <SectionHead title="اختر المرحلة" hint="ثم اختر الطالب" />

            <View style={s.gradeList}>
              {gradeRows.map((g) => {
                const tone = gradeColor(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => selectGrade(g.id)}
                    style={({ pressed }) => [
                      s.gradeCard,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${g.name} — ${g.studentCount} طالب و${g.reportCount} تقرير`}
                  >
                    <View style={[s.edge, { backgroundColor: tone }]} />
                    <View style={s.gradeInner}>
                      <View style={[s.gradeTile, { backgroundColor: withAlpha(tone, 0.12) }]}>
                        <Ionicons name="school-outline" size={21} color={tone} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.gradeName} numberOfLines={1}>{g.name}</Text>
                        <Text style={s.gradeMeta} numberOfLines={1}>
                          {g.studentCount} طالب · {g.reportCount} تقرير
                        </Text>
                      </View>
                      <View style={[s.bubble, { backgroundColor: withAlpha(tone, 0.14) }]}>
                        <Text style={[s.bubbleText, { color: tone }]}>{g.reportCount}</Text>
                      </View>
                      <Ionicons name="chevron-back" size={17} color={c.text4} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: sp.lg, paddingBottom: sp.huge, gap: sp.md },

  /* ── البطاقة التعريفية ── */
  hero: {
    backgroundColor: 'rgba(131, 195, 235, 0.13)',
    borderRadius: rad.lg,
    borderWidth: 1,
    borderColor: 'rgba(131, 195, 235, 0.32)',
    padding: sp.lg,
    gap: sp.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
  heroIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  heroTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.primary },
  heroMsg: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text2, marginTop: 3, lineHeight: 19 },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: rad.md,
    paddingVertical: sp.md,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroNum: { fontFamily: fnt.bk, fontSize: fs.xxl, color: c.primary, lineHeight: 33 },
  heroLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 1 },
  heroRule: { width: 1, height: 34, backgroundColor: 'rgba(38, 38, 116, 0.12)' },

  /* ── عنوان قسم ── */
  secHead: {
    flexDirection: 'row', alignItems: 'baseline',
    marginTop: sp.xs,
  },
  secTitle: { fontFamily: fnt.eb, fontSize: fs.lg, color: c.text },
  secHint: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text4 },
  countPill: {
    minWidth: 26, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: rad.pill, backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  countPillText: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text3 },

  /* ── صفوف المراحل ── */
  gradeList: { gap: sp.sm },
  gradeCard: {
    backgroundColor: c.white,
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.line,
    overflow: 'hidden',
    shadowColor: '#0F2837',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  edge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4 },
  gradeInner: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingVertical: sp.md,
    paddingRight: sp.md, paddingLeft: sp.lg,
  },
  gradeTile: {
    width: 46, height: 46, borderRadius: rad.md,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeName: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  gradeMeta: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },
  bubble: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleText: { fontFamily: fnt.b, fontSize: fs.xs },

  /* ── صفوف التقارير والطلاب ── */
  reportCard: {
    backgroundColor: c.white,
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.line,
    overflow: 'hidden',
    shadowColor: '#0F2837',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  reportInner: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingVertical: sp.md,
    paddingRight: sp.md, paddingLeft: sp.lg,
  },
  tile: {
    width: 42, height: 42, borderRadius: rad.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tileInitial: { fontFamily: fnt.bk, fontSize: fs.lg },
  rowName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  rowMeta: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },
  iconBtn: {
    width: 30, height: 30, borderRadius: rad.sm,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  startPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: rad.pill,
    backgroundColor: c.primaryBg,
    borderWidth: 1, borderColor: c.primaryLine,
  },
  startPillText: { fontFamily: fnt.b, fontSize: 9.5, color: c.primary },

  noneBox: {
    alignItems: 'center', justifyContent: 'center', gap: sp.xs,
    paddingVertical: sp.lg,
    borderRadius: rad.md,
    borderWidth: 1, borderStyle: 'dashed', borderColor: c.lineHi,
    backgroundColor: c.bgAlt,
  },
  noneText: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text4 },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GRADES, gradeName } from '@/constants/criteria';
import { c, sp, rad, fnt, fs } from '@/constants/brand';
import { Button, Card, Badge, BrandBar, Empty, Stat } from '@/components/pro-ui';
import { confirmAction } from '@/lib/dialog';
import { emitHtml } from '@/lib/print-client';
import { buildSixWeekReportHtml } from '@/lib/six-week-print';
import { useSession } from '@/lib/session';
import { listStudentsByGrade, type Student } from '@/lib/store';
import {
  listSixWeekReports, deleteSixWeekReport, reportSubjectName,
  type SixWeekReport,
} from '@/lib/six-week';

/**
 * الخطوة ٢ من ٢ لتقرير الستة أسابيع — طلاب المرحلة المختارة.
 * كل طالب يُظهر تقاريره المحفوظة وزر «تقرير جديد»، تماماً كقائمة الطلاب
 * في التقييمات الأخرى (/roster).
 */
export default function SixWeekRosterScreen() {
  const router = useRouter();
  const { editMode } = useSession();
  const raw = useLocalSearchParams<{ gradeId?: string | string[] }>();
  const param = Array.isArray(raw.gradeId) ? raw.gradeId[0] : raw.gradeId;
  const gradeId = GRADES.find((g) => g.id === param)?.id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<SixWeekReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!gradeId) return;
    try {
      const [list, all] = await Promise.all([listStudentsByGrade(gradeId), listSixWeekReports()]);
      setStudents(list);
      setReports(all.filter((r) => r.grade_id === gradeId));
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const byStudent = useMemo(() => {
    const acc: Record<string, SixWeekReport[]> = {};
    for (const r of reports) {
      (acc[r.student_id] || (acc[r.student_id] = [])).push(r);
    }
    return acc;
  }, [reports]);

  const filtered = useMemo(
    () => students.filter((s) => (query.trim() ? s.name.includes(query.trim()) : true)),
    [students, query]
  );

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

  const openReport = (r: SixWeekReport) => {
    router.push({ pathname: '/six-week-report', params: { id: r.id } } as never);
  };

  const newReport = (stu: Student) => {
    router.push({
      pathname: '/six-week-report',
      params: { studentId: stu.id, studentName: stu.name, gradeId: gradeId! },
    } as never);
  };

  if (!gradeId) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <BrandBar title="تقرير الستة أسابيع" onBack={() => router.replace('/six-weeks' as never)} />
        <Empty
          icon="alert-circle-outline"
          title="لم تُحدَّد المرحلة"
          message="اختر مرحلة من شاشة تقرير الستة أسابيع."
          action={<Button label="اختر المرحلة" icon="school-outline" onPress={() => router.replace('/six-weeks' as never)} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        title={gradeName(gradeId)}
        sub="الخطوة ٢ من ٢ · الطلاب"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.statBar}>
          <Stat value={students.length} label="طالب" />
          <View style={s.vRule} />
          <Stat value={reports.length} label="تقرير محفوظ" color={c.okText} />
        </View>

        <View style={s.search}>
          <Ionicons name="search" size={16} color={c.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن طالب..."
            placeholderTextColor={c.text4}
            style={s.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={16} color={c.text4} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <Empty
            icon="people-outline"
            title={query ? 'لا نتائج' : 'لا يوجد طلاب'}
            message={
              query
                ? 'جرّب كلمة بحث أخرى'
                : editMode
                  ? 'أضف الطلاب من قسم «الطلاب» ثم عد هنا'
                  : 'فعّل وضع التعديل لإضافة الطلاب'
            }
            action={
              !query && editMode ? (
                <Button
                  label="إدارة الطلاب"
                  icon="people-outline"
                  onPress={() => router.push('/students' as never)}
                />
              ) : undefined
            }
          />
        ) : (
          <View style={{ gap: sp.sm }}>
            {filtered.map((stu, i) => {
              const own = byStudent[stu.id] ?? [];
              const open = openId === stu.id;
              const rowColor = [c.primary, c.brandSecondary, c.orange, c.mint, c.blueMid, c.pinkMid, c.peach][i % 7];

              return (
                <Card key={stu.id} padding={0}>
                  <Pressable
                    onPress={() => setOpenId(open ? null : stu.id)}
                    style={({ pressed }) => [s.head, { borderLeftWidth: 4, borderLeftColor: rowColor }, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <View style={[s.avatar, own.length > 0 && { backgroundColor: c.okBg }]}>
                      <Text style={[s.avatarText, own.length > 0 && { color: c.okText }]}>
                        {stu.name.charAt(0)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{stu.name}</Text>
                      <Text style={[s.sub, own.length === 0 && { color: c.warnText }]}>
                        {own.length === 0 ? 'لم يُنشأ له تقرير بعد' : `${own.length} تقرير في هذه المرحلة`}
                      </Text>
                    </View>

                    {own.length > 0 && (
                      <Badge label={`${own.length}`} color={c.okText} bg={c.okBg} />
                    )}
                    <Ionicons name={open ? 'chevron-down' : 'chevron-back'} size={17} color={c.text4} />
                  </Pressable>

                  {open && (
                    <View style={s.formsWrap}>
                      <Button
                        label="تقرير جديد"
                        icon="add"
                        size="sm"
                        onPress={() => newReport(stu)}
                        style={{ marginHorizontal: sp.md, marginTop: sp.sm, marginBottom: sp.xs }}
                      />

                      {own.length === 0 ? (
                        <Text style={s.noForms}>لا توجد تقارير محفوظة لهذا الطالب</Text>
                      ) : (
                        own.map((r) => (
                          <Pressable
                            key={r.id}
                            onPress={() => openReport(r)}
                            style={({ pressed }) => [s.formRow, pressed && { opacity: 0.75 }]}
                            accessibilityRole="button"
                            accessibilityLabel={`تقرير ${r.report_date} — ${r.courses.length} مقرر`}
                          >
                            <View style={[s.formDot, { backgroundColor: c.primary }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.formLabel}>{r.report_date}</Text>
                              <Text style={s.formMeta} numberOfLines={1}>
                                {r.courses.map((cr) => reportSubjectName(cr.subject_id)).join(' · ')}
                              </Text>
                            </View>
                            {r.teacher_name ? (
                              <Badge label={r.teacher_name} color={c.text2} bg={c.bgLift} />
                            ) : (
                              <Badge label="بلا معلم" color={c.warnText} bg={c.warnBg} />
                            )}
                            <Pressable
                              onPress={() => onPrint(r)}
                              hitSlop={8}
                              style={s.iconBtn}
                              accessibilityRole="button"
                              accessibilityLabel="طباعة التقرير"
                            >
                              {printingId === r.id ? (
                                <ActivityIndicator size="small" color={c.primary} />
                              ) : (
                                <Ionicons name="print-outline" size={17} color={c.primary} />
                              )}
                            </Pressable>
                            <Pressable
                              onPress={() => onDelete(r)}
                              hitSlop={8}
                              style={[s.iconBtn, { backgroundColor: c.errBg }]}
                              accessibilityRole="button"
                              accessibilityLabel="حذف التقرير"
                            >
                              <Ionicons name="trash-outline" size={17} color={c.errText} />
                            </Pressable>
                            <Ionicons name="chevron-back" size={16} color={c.text4} />
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => router.replace('/six-weeks' as never)}
          style={({ pressed }) => [s.changeBtn, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
        >
          <Ionicons name="swap-horizontal-outline" size={16} color={c.primary} />
          <Text style={s.changeText}>تغيير المرحلة</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.xxl, gap: sp.lg },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 42 },
  searchInput: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.sm,
    color: c.text, textAlign: 'right' },

  loading: { paddingVertical: sp.xxl, alignItems: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    padding: sp.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fnt.bk, fontSize: fs.lg, color: c.text3 },
  name: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  sub: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 3 },

  formsWrap: {
    borderTopWidth: 1, borderTopColor: c.line,
    backgroundColor: c.bg,
    paddingVertical: sp.xs },
  noForms: {
    fontFamily: fnt.r, fontSize: fs.xs, color: c.text4,
    padding: sp.md, textAlign: 'center' },
  formRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingHorizontal: sp.md, paddingVertical: sp.sm },
  formDot: { width: 10, height: 10, borderRadius: 5 },
  formLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text },
  formMeta: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 2 },
  iconBtn: {
    width: 32, height: 32, borderRadius: rad.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.primaryBg },

  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm,
    backgroundColor: c.primaryBg,
    borderWidth: 1, borderColor: c.primaryLine,
    borderRadius: rad.md,
    paddingVertical: sp.md },
  changeText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
});

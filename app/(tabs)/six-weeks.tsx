import { arabicDigits } from '@/components/count-up';
import { GradeStack, type GradeCardItem } from '@/components/grade-stack';
import { useToneVeil } from '@/components/motion';
import { PageHero, SectionHead } from '@/components/page-hero';
import { Empty, Stat } from '@/components/pro-ui';
import { BRAND_TONE, c, fnt, fs, gradeTone, rad, sh, sp } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import { GRADES, gradeName, type GradeId } from '@/constants/criteria';
import { visibleGrades } from '@/lib/accounts';
import { useAuth } from '@/lib/auth';
import { listSixWeekReports, type SixWeekReport } from '@/lib/six-week';
import { listStudents, type Student } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * الخطوة ١ من ٢ لتقرير الستة أسابيع — المرحلة الدراسية.
 * نفس ترتيب بقية التقييمات: مرحلة ← طلاب ← الاستمارة.
 */

const ACTIVE_GRADES = GRADES.filter((g) => g.id !== 'intermediate1');

export default function SixWeeksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<SixWeekReport[]>([]);
  const [loading, setLoading] = useState(true);

  /** المراحل المسندة لهذا الحساب — المعلم لا يرى غيرها */
  const grades = useMemo(() => {
    const allowed = new Set<string>(visibleGrades(user, ACTIVE_GRADES.map((g) => g.id)));
    return ACTIVE_GRADES.filter((g) => allowed.has(g.id));
  }, [user]);

  const load = useCallback(async () => {
    try {
      const [st, rp] = await Promise.all([listStudents(), listSixWeekReports()]);
      setStudents(st);
      setReports(rp);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** عدد طلاب كل مرحلة وتقاريرها المحفوظة — ليعرف المعلم أين يدخل */
  const counts = useMemo(() => {
    const acc: Record<string, { students: number; reports: number }> = {};
    for (const g of GRADES) acc[g.id] = { students: 0, reports: 0 };
    for (const s of students) {
      if (s.grade_id && acc[s.grade_id]) acc[s.grade_id].students++;
    }
    for (const r of reports) {
      if (acc[r.grade_id]) acc[r.grade_id].reports++;
    }
    return acc;
  }, [students, reports]);

  /** بطاقات الغلاف — نفس بيانات القائمة السابقة لكن بقراءة مجلّة */
  const covers = useMemo<GradeCardItem[]>(
    () => grades.map((g) => {
      const n = counts[g.id];
      return {
        id: g.id,
        title: gradeName(g.id),
        kicker: 'تقرير الستة أسابيع',
        meta: [`${arabicDigits(n.students)} طالب`, `${arabicDigits(n.reports)} تقرير`],
        badge: n.reports,
      };
    }),
    [counts, grades]
  );

  /** ستارة بلون المرحلة قبل فتح لائحة الطلاب */
  const { run: veilRun, style: veilStyle, color: veilColor, reset: veilReset } = useToneVeil(rad.xl);
  useFocusEffect(useCallback(() => { veilReset(); }, [veilReset]));

  const openStage = (id: string) =>
    veilRun(gradeTone(id).deep, () => openGrade(id as GradeId));

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={{ padding: sp.lg }}>
          <PageHero
            tone={BRAND_TONE}
            eyebrow="الخطوة ١ من ٢ · المرحلة الدراسية"
            title="تقرير الستة أسابيع"
            sub="تقييم وصفي بلا درجات"
            compact
          />
        </View>
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const openGrade = (gradeId: GradeId) => {
    router.push({ pathname: '/six-weeks-roster', params: { gradeId } } as never);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <PageHero
          tone={BRAND_TONE}
          eyebrow="الخطوة ١ من ٢ · المرحلة الدراسية"
          title="تقرير الستة أسابيع"
          sub="تقييم وصفي بلا درجات · اختر المرحلة ثم الطالب لإنشاء التقرير أو متابعة تقاريره المحفوظة."
        />

        <View style={s.statBar}>
          <Stat value={students.length} label="طالب" />
          <View style={s.vRule} />
          <Stat value={reports.length} label="تقرير محفوظ" color={c.okText} />
        </View>

        {students.length === 0 ? (
          <Empty
            icon="people-outline"
            title="لا يوجد طلاب بعد"
            message="أضف الطلاب من قسم «الطلاب» ثم عد لإنشاء التقارير."
            action={
              <Pressable
                onPress={() => router.push('/students' as never)}
                style={({ pressed }) => [s.changeBtn, pressed && { opacity: 0.75 }]}
                accessibilityRole="button"
              >
                <Ionicons name="people-outline" size={16} color={c.primary} />
                <Text style={s.changeText}>إدارة الطلاب</Text>
              </Pressable>
            }
          />
        ) : (
          <>
            <SectionHead
              title="اختر المرحلة"
              hint="اضغط بطاقة المرحلة لعرض طلابها وتقاريرهم"
              count={`${arabicDigits(covers.length)} مراحل`}
              tone={BRAND_TONE}
            />

            <GradeStack items={covers} onOpen={openStage} />
          </>
        )}
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: veilColor, zIndex: 40 }, veilStyle]}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { ...contentColumn, padding: sp.lg, paddingBottom: sp.xxl, gap: sp.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md, ...sh.sm },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  sectionTitle: {
    fontFamily: fnt.b, fontSize: fs.md, color: c.text,
    marginTop: sp.sm, marginBottom: 2, paddingHorizontal: 2 },

  railHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: sp.sm, paddingHorizontal: 2,
  },
  railHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.bgAlt, borderRadius: rad.pill,
    borderWidth: 1, borderColor: c.line,
    paddingVertical: 3, paddingHorizontal: sp.sm,
  },
  railHintText: { fontFamily: fnt.r, fontSize: 10, color: c.text3 },

  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm,
    backgroundColor: c.primaryBg,
    borderWidth: 1, borderColor: c.primaryLine,
    borderRadius: rad.md, paddingVertical: sp.md, paddingHorizontal: sp.xl },
  changeText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
});

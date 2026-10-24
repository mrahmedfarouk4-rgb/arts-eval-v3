import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GRADES, gradeName, type GradeId } from '@/constants/criteria';
import { c, sp, rad, fnt, fs, gradeTone } from '@/constants/brand';
import { BrandBar, Banner, Stat, Empty, Badge } from '@/components/pro-ui';
import { listStudents, type Student } from '@/lib/store';
import { listSixWeekReports, type SixWeekReport } from '@/lib/six-week';

/**
 * الخطوة ١ من ٢ لتقرير الستة أسابيع — المرحلة الدراسية.
 * نفس ترتيب بقية التقييمات: مرحلة ← طلاب ← الاستمارة.
 */

const ACTIVE_GRADES = GRADES.filter((g) => g.id !== 'intermediate1');

export default function SixWeeksScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<SixWeekReport[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <BrandBar title="تقرير الستة أسابيع" sub="الخطوة ١ من ٢ · المرحلة الدراسية" />
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
      <BrandBar title="تقرير الستة أسابيع" sub="الخطوة ١ من ٢ · المرحلة الدراسية" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Banner
          level="info"
          title="تقييم وصفي بلا درجات"
          message="اختر المرحلة ثم الطالب لإنشاء التقرير أو متابعة تقاريره المحفوظة."
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
          <View style={{ gap: sp.sm }}>
            <Text style={s.sectionTitle}>اختر المرحلة</Text>
            {ACTIVE_GRADES.map((g, i) => {
              const tone = gradeTone(g.id);
              const n = counts[g.id];
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(80 + i * 60).duration(450)}>
                  <Pressable
                    onPress={() => openGrade(g.id)}
                    style={({ pressed }) => [
                      s.gradeCard,
                      pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${gradeName(g.id)} — ${n.students} طالب · ${n.reports} تقرير`}
                  >
                    <View style={[s.gradeAccent, { backgroundColor: tone.base }]} />
                    <View style={[s.gradeIc, { backgroundColor: tone.tint }]}>
                      <Ionicons name="school-outline" size={18} color={tone.deep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gradeName} numberOfLines={1}>
                        {gradeName(g.id)}
                      </Text>
                      <Text style={s.gradeMeta}>
                        {n.students} طالب · {n.reports} تقرير
                      </Text>
                    </View>
                    {n.reports > 0 && (
                      <Badge label={`${n.reports}`} color={tone.onBase} bg={tone.base} />
                    )}
                    <View style={[s.gradeArrow, { backgroundColor: tone.tint }]}>
                      <Ionicons name="chevron-back" size={16} color={tone.deep} />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: sp.lg, paddingBottom: sp.xxl, gap: sp.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  sectionTitle: {
    fontFamily: fnt.b, fontSize: fs.md, color: c.text,
    marginTop: sp.sm, marginBottom: 2, paddingHorizontal: 2 },

  gradeCard: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    borderRadius: rad.lg, padding: sp.md, overflow: 'hidden',
    backgroundColor: c.tileBg, borderWidth: 1, borderColor: c.line,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  gradeAccent: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
    borderTopRightRadius: rad.lg, borderBottomRightRadius: rad.lg },
  gradeIc: {
    width: 42, height: 42, borderRadius: rad.md,
    alignItems: 'center', justifyContent: 'center' },
  gradeName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  gradeMeta: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 1 },
  gradeArrow: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center' },

  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm,
    backgroundColor: c.primaryBg,
    borderWidth: 1, borderColor: c.primaryLine,
    borderRadius: rad.md, paddingVertical: sp.md, paddingHorizontal: sp.xl },
  changeText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
});

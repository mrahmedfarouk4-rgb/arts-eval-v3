import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gradeName } from '@/constants/criteria';
import { c, sp, rad, fs } from '@/constants/brand';
import { Button, Card, Badge, Banner, Empty, BrandBar } from '@/components/pro-ui';
import { confirmAction } from '@/lib/dialog';
import { emitHtml } from '@/lib/print-client';
import { buildSixWeekReportHtml } from '@/lib/six-week-print';
import {
  listSixWeekReports, deleteSixWeekReport, ratingLabel, reportSubjectName,
  type SixWeekReport,
} from '@/lib/six-week';

export default function SixWeeksScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<SixWeekReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await listSixWeekReports());
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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        title="تقرير الستة أسابيع"
        right={<Button label="تقرير جديد" icon="add" size="sm" onPress={openNew} />}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Banner
          level="info"
          title="تقييم وصفي بلا درجات"
          message="تقرير شامل لكل طالب: ملخص الأداء، تحليل المقررات المختارة، السلوك والمهارات، والتوصيات."
        />

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : reports.length === 0 ? (
          <Empty
            icon="document-text-outline"
            title="لا توجد تقارير بعد"
            message="أنشئ أول تقرير من نوع «الستة أسابيع» لأي طالب."
            action={<Button label="إنشاء تقرير" icon="add" onPress={openNew} />}
          />
        ) : (
          <View style={{ gap: sp.md }}>
            <View style={s.listHead}>
              <Text style={s.listTitle}>التقارير المحفوظة</Text>
              <Badge label={`${reports.length}`} color={c.text2} bg={c.bgLift} />
            </View>

            {reports.map((r) => (
              <Card key={r.id} padding={sp.md}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{r.student_name}</Text>
                    <Text style={s.meta}>{gradeName(r.grade_id)} · {r.report_date}</Text>
                  </View>
                  <Badge label={`${r.courses.length} مقرر`} color={c.primary} bg={c.primaryBg} />
                </View>

                <View style={s.chips}>
                  {r.courses.map((cr) => (
                    <Badge
                      key={cr.subject_id}
                      label={`${reportSubjectName(cr.subject_id)}: ${ratingLabel(cr.rating)}`}
                      color={c.text2}
                      bg={c.bgLift}
                    />
                  ))}
                </View>

                <View style={s.actions}>
                  <Button
                    label="فتح"
                    icon="create-outline"
                    variant="soft"
                    size="sm"
                    onPress={() =>
                      router.push({ pathname: '/six-week-report', params: { id: r.id } } as never)
                    }
                  />
                  <Button
                    label="طباعة"
                    icon="print-outline"
                    variant="surface"
                    size="sm"
                    loading={printingId === r.id}
                    onPress={() => onPrint(r)}
                  />
                  <Pressable
                    onPress={() => onDelete(r)}
                    hitSlop={8}
                    style={s.trash}
                    accessibilityRole="button"
                    accessibilityLabel="حذف التقرير"
                  >
                    <Ionicons name="trash-outline" size={17} color={c.err} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: sp.lg, paddingBottom: sp.xxl, gap: sp.md },
  loading: { paddingVertical: sp.xxl, alignItems: 'center' },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.sm },
  listTitle: { flex: 1, fontSize: fs.sm, fontWeight: '700', color: c.text },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
  name: { fontSize: fs.md, fontWeight: '700', color: c.text },
  meta: { marginTop: 2, fontSize: fs.xs, color: c.text3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xxs, marginTop: sp.sm },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: sp.xs,
    marginTop: sp.md, paddingTop: sp.sm,
    borderTopWidth: 1, borderTopColor: c.line,
  },
  trash: {
    width: 34, height: 34, borderRadius: rad.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.errBg, marginRight: 'auto',
  },
});

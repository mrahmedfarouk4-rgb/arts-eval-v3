import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  EVAL_KINDS, gradeName, subjectName, formTotals, hasCriteria } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c, sp, rad, fnt, fs, kindTone, gradeTone, scaleBg, scaleFg } from '@/constants/brand';
import { Card, Badge, StepBar, ar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';

/** فوق لون المرحلة: فاتح من الأعلى وغامق من الأسفل — كما في شاشة الفصل */
const VEIL = ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.10)'] as const;

/**
 * الخطوة ٣ — نوع التقييم للمقرر المختار.
 * الضغط على نوع التقييم ينقل إلى شاشة الطلاب.
 */
export default function KindScreen() {
  const router = useRouter();
  const { gradeId, term, subjectId, setKind } = useSession();

  if (!gradeId || !subjectId) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.empty}>
          <Ionicons name="alert-circle-outline" size={40} color={c.text4} />
          <Text style={s.emptyTitle}>لم يُحدَّد المقرر بعد</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kinds = EVAL_KINDS.filter((k) => hasCriteria(k.id, gradeId, subjectId));

  /**
   * أنواع بلا استمارة معتمدة في الوثائق الرسمية لهذا المقرر.
   * مثال: «الألوان المائية» في الثاني المتوسط — الوثيقة فيها المرحلي
   * والختامي فقط، فلا يُخفى التكويني بلا تفسير.
   */
  const missing = EVAL_KINDS.filter((k) => !hasCriteria(k.id, gradeId, subjectId));

  const pickKind = (k: CriteriaKind) => {
    setKind(k);
    router.push('/roster' as never);
  };

  /** لون المرحلة يسري من شاشة الفصل إلى هذه الخطوة — والنص مقروء فوقه (AA) */
  const tone = gradeTone(gradeId);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Animated.View entering={FadeIn.duration(500)} style={[s.hero, { backgroundColor: tone.base, shadowColor: tone.base }]}>
        <LinearGradient colors={VEIL} style={StyleSheet.absoluteFill} />
        <View style={s.heroContent}>
          <Pressable
            onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: tone.onBase + '2E', borderColor: tone.onBase + '4D' }]}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Ionicons name="chevron-forward" size={20} color={tone.onBase} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroEyebrow, { color: tone.onBaseMuted }]}>الخطوة ٣ · نوع التقييم</Text>
            <Text style={[s.heroTitle, { color: tone.onBase }]} numberOfLines={1}>{subjectName(subjectId)}</Text>
            <Text style={[s.heroSub, { color: tone.onBaseMuted }]}>{gradeName(gradeId)} · اختر نوع التقييم</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* أنواع التقييم */}
        <View style={{ gap: sp.md }}>
          {kinds.map((k) => {
            const t = kindTone[k.id];
            const totals = formTotals(k.id, gradeId, subjectId, term);

            return (
              <Card key={k.id} onPress={() => pickKind(k.id)} padding={sp.lg} accent={t.c}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: t.bg }]}>
                    <Ionicons
                      name={
                        k.id === 'weekly' ? 'flash-outline'
                        : k.id === 'periodic' ? 'trending-up-outline'
                        : 'trophy-outline'
                      }
                      size={24}
                      color={t.c}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{k.name}</Text>
                    <Text style={s.desc} numberOfLines={2}>{ar(k.description)}</Text>
                  </View>

                  <View style={[s.chev, { backgroundColor: t.bg }]}>
                    <Ionicons name="chevron-back" size={16} color={t.c} />
                  </View>
                </View>

                {/* تفاصيل */}
                <View style={s.metaRow}>
                  <Badge label={`${ar(totals.criteria.length)} بند`} color={t.c} bg={t.bg} />
                  <Badge label={`${ar(totals.actualMax)} درجة`} color={t.c} bg={t.bg} />
                  {totals.delta !== 0 && (
                    <Badge
                      label={`الرسمي ${ar(totals.officialMax)}`}
                      color={c.warnText}
                      bg={c.warnBg}
                    />
                  )}
                </View>

                {/* سُلّم المستويات — نفس ألوان أزرار التصحيح في شاشة التقييم */}
                {!!k.scale && (
                  <View style={s.legend}>
                    {k.scaleLabel.split(' · ').map((lv, i) => (
                      <View key={lv} style={[s.legendChip, { backgroundColor: scaleBg[i] }]}>
                        <Text style={[s.legendText, { color: scaleFg[i] }]}>{ar(lv)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {kinds.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-outline" size={40} color={c.text4} />
            <Text style={s.emptyTitle}>لا توجد بنود لهذا المقرر</Text>
            <Text style={s.emptySub}>جرّئ مقرّراً آخر من الشاشة السابقة</Text>
          </View>
        )}

        {kinds.length > 0 && missing.length > 0 && (
          <View style={s.note}>
            <Ionicons name="information-circle-outline" size={16} color={c.infoText} />
            <Text style={s.noteText}>
              لا توجد استمارة معتمدة في الوثائق الرسمية لـ{' '}
              {missing.map((m) => `«${m.name}»`).join(' و')} في هذا المقرر — المتاح:{' '}
              {kinds.map((k) => `«${k.name}»`).join(' و')}.
            </Text>
          </View>
        )}

        <StepBar active={2} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  scroll: { paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.huge, gap: sp.xl },

  /* Hero — بلون المرحلة كما في شاشة الفصل */
  hero: { height: 170, borderRadius: rad.xl, overflow: 'hidden', marginBottom: sp.xs,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 5 },
  heroContent: { flex: 1, padding: sp.lg, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'flex-start', marginBottom: sp.sm },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, letterSpacing: 0.5 },
  heroTitle: { fontFamily: fnt.bk, fontSize: fs.xl, letterSpacing: -0.5, marginTop: 2 },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  icon: {
    width: 52, height: 52, borderRadius: rad.md,
    alignItems: 'center', justifyContent: 'center' },
  chev: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  desc: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 3, lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: sp.xs, marginTop: sp.md, flexWrap: 'wrap' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs, marginTop: sp.md },
  legendChip: { borderRadius: rad.sm, paddingHorizontal: sp.sm, paddingVertical: 3 },
  legendText: { fontFamily: fnt.m, fontSize: fs.xxs },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm,
    backgroundColor: c.infoBg, borderRadius: rad.md,
    borderWidth: 1, borderColor: c.infoLine,
    paddingHorizontal: sp.md, paddingVertical: sp.md },
  noteText: {
    flex: 1, fontFamily: fnt.r, fontSize: fs.xxs,
    color: c.infoText, lineHeight: 18 },

  empty: { alignItems: 'center', gap: sp.sm, paddingVertical: sp.huge },
  emptyTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text2 },
  emptySub: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3 } });
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
import { c, sp, rad, fnt, fs, kindTone, subjectColor } from '@/constants/brand';
import { Card, Badge, StepBar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';

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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Animated.View entering={FadeIn.duration(500)} style={s.hero}>
        <LinearGradient colors={[subjectColor(subjectId), subjectColor(subjectId)]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.42)']} style={StyleSheet.absoluteFill} />
        <View style={s.heroContent}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="رجوع">
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.heroEyebrow}>الخطوة ٣ · نوع التقييم</Text>
            <Text style={s.heroTitle}>{subjectName(subjectId)}</Text>
            <Text style={s.heroSub}>{gradeName(gradeId)} · اختر نوع التقييم</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* سياق مختصر */}
        <View style={s.context}>
          <View style={s.ctxItem}>
            <Ionicons name="school-outline" size={14} color={c.text3} />
            <Text style={s.ctxText} numberOfLines={1}>{gradeName(gradeId)}</Text>
          </View>
          <View style={s.ctxSep} />
          <View style={s.ctxItem}>
            <Ionicons name="brush-outline" size={14} color={c.text3} />
            <Text style={s.ctxText} numberOfLines={1}>{subjectName(subjectId)}</Text>
          </View>
        </View>

        {/* أنواع التقييم */}
        <View style={{ gap: sp.md }}>
          {kinds.map((k) => {
            const t = kindTone[k.id];
            const totals = formTotals(k.id, gradeId, subjectId, term);

            return (
              <Card
                key={k.id}
                onPress={() => pickKind(k.id)}
                padding={sp.lg}
                accent={t.c}
              >
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
                    <Text style={s.desc} numberOfLines={2}>{k.description}</Text>
                  </View>

                  <Ionicons name="chevron-back" size={18} color={c.text4} />
                </View>

                {/* تفاصيل */}
                <View style={s.metaRow}>
                  <Badge label={`${totals.criteria.length} بند`} color={t.c} bg={t.bg} />
                  <Badge label={`${totals.actualMax} درجة`} color={t.c} bg={t.bg} />
                  {totals.delta !== 0 && (
                    <Badge
                      label={`الرسمي ${totals.officialMax}`}
                      color={c.warn}
                      bg={c.warnBg}
                    />
                  )}
                </View>

                {k.scale && (
                  <View style={s.scaleHint}>
                    <Text style={s.scaleHintText}>{k.scaleLabel}</Text>
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
            <Ionicons name="information-circle-outline" size={16} color={c.text3} />
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

  /* Hero */
  hero: { height: 150, borderRadius: rad.xl, overflow: 'hidden', marginBottom: sp.sm,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 5 },
  heroContent: { flex: 1, padding: sp.lg, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: rad.sm, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignSelf: 'flex-start', marginBottom: sp.sm },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  heroTitle: { fontFamily: fnt.bk, fontSize: fs.xl, color: '#FFFFFF', letterSpacing: -0.5, marginTop: 2 },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  context: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, paddingVertical: sp.sm },
  ctxItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  ctxText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  ctxSep: { width: 1, height: 18, backgroundColor: c.line, marginHorizontal: sp.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  icon: {
    width: 52, height: 52, borderRadius: rad.md,
    alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  desc: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 3, lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: sp.xs, marginTop: sp.md, flexWrap: 'wrap' },

  scaleHint: {
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1, borderTopColor: c.line },
  scaleHintText: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3 },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm,
    backgroundColor: c.bgAlt, borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, paddingVertical: sp.md },
  noteText: {
    flex: 1, fontFamily: fnt.r, fontSize: fs.xxs,
    color: c.text3, lineHeight: 18 },

  empty: { alignItems: 'center', gap: sp.sm, paddingVertical: sp.huge },
  emptyTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text2 },
  emptySub: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3 } });
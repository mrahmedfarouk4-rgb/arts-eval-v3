import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  GRADES, subjectsForGrade, gradeName, CRITERIA_COUNT,
} from '@/constants/criteria';
import { c, sp, rad, fnt, fs } from '@/constants/brand';
import {
  Tile, WeekStrip,
  type WeekDay,
} from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { listEvaluations, listStudents, type Evaluation } from '@/lib/store';

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const weekNo = () => {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return Math.floor((now.getTime() - new Date(y, 8, 1).getTime()) / (7 * 86400000)) + 1;
};
const rangeLabel = () => {
  const start = weekStart(new Date());
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
};

const GRADE_COLORS = ['#004645', '#621244', '#83C3EB', '#D17E30', '#83D5C4', '#E5A1C8'];

export default function GradesScreen() {
  const router = useRouter();
  const { setGrade, resetFlow } = useSession();

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const [ev, st] = await Promise.all([listEvaluations(), listStudents()]);
      setEvals(ev);
      setStudents(st.length);
    } catch { /* تجاهل */ }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const week = useMemo(() => {
    const now = new Date();
    const start = weekStart(now);
    const days: WeekDay[] = DAY_LABELS.map((label, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const of = evals.filter((e) => e.evaluation_date === key);
      return {
        n: i + 1, label, day: date.getDate(), count: of.length,
        done: of.length ? of.filter((e) => Object.keys(e.scores ?? {}).length > 0).length / of.length : 0,
        today: sameDay(date, now),
      };
    });
    const inWeek = days.reduce((n, d) => n + d.count, 0);
    const doneWeek = days.reduce((n, d) => n + Math.round(d.done * d.count), 0);
    return { days, inWeek, doneWeek, pct: inWeek ? doneWeek / inWeek : 0 };
  }, [evals]);

  const subjectTotal = useMemo(() => {
    const set = new Set<string>();
    for (const g of GRADES) {
      if (g.id === 'intermediate1') continue;
      for (const sid of subjectsForGrade(g.id, 'all')) set.add(sid);
    }
    return set.size;
  }, []);

  const open = (gradeId: string) => {
    setGrade(gradeId as never);
    router.push('/term' as never);
  };
  const reset = () => {
    resetFlow();
    router.push('/' as never);
  };

  const ACTIONS = [
    { label: 'ابدأ تقييماً', icon: 'play', color: c.primary, onPress: reset },
    { label: 'أضف طالباً', icon: 'person-add-outline', color: c.brandSecondary, onPress: () => router.push('/students' as never) },
    { label: 'السجل', icon: 'albums-outline', color: c.orange, onPress: () => router.push('/records' as never) },
    { label: 'استمارة', icon: 'print-outline', color: c.mint, onPress: () => router.push('/samples' as never) },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={require('@/assets/brand/bg-main.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(250,250,250,0.78)' }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ===== Hero ===== */}
        <Animated.View entering={FadeIn.duration(700)} style={s.hero}>
          <Image source={require('@/assets/brand/bg-teal-dark.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,70,69,0.20)', 'rgba(0,70,69,0.95)']} style={StyleSheet.absoluteFill} />
          <View style={s.heroContent}>
            <View style={s.heroTop}>
              <Text style={s.heroEyebrow}>أكاديمية آفاق · الفنون البصرية</Text>
              <Text style={s.heroEyebrowEn}>AFAC — Fine Arts & Culture</Text>
            </View>
            <Text style={s.heroTitle}>تقييم.</Text>
            <Text style={s.heroTitle}>إبداع.</Text>
            <Text style={s.heroTitle}>تألق.</Text>
            <Text style={s.heroSub}>لوحة عمل المعلّم — كل ما تحتاجه بنظرة واحدة</Text>
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{ar(students)}</Text>
                <Text style={s.heroStatLabel}>طالب</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{ar(subjectTotal)}</Text>
                <Text style={s.heroStatLabel}>مقرر</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{ar(CRITERIA_COUNT)}</Text>
                <Text style={s.heroStatLabel}>بند</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{Math.round(week.pct * 100)}٪</Text>
                <Text style={s.heroStatLabel}>إنجاز</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== Quick actions (colorful cards) ===== */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <Text style={s.sectionTitle}>ابدأ بسرعة</Text>
          <View style={s.actionGrid}>
            {ACTIONS.map((a, i) => (
              <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [s.actionCardSolid, { backgroundColor: a.color }, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]} accessibilityRole="button">
                <View style={s.actionIconWrapSolid}>
                  <Ionicons name={a.icon as any} size={22} color="#FFFFFF" />
                </View>
                <Text style={s.actionLabelSolid}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ===== الأسبوع ===== */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Tile wide bg={require('@/assets/brand/bg-warm-light.jpg')} title={`الأسبوع ${weekNo()} · ${rangeLabel()}`}>
            <WeekStrip days={week.days} />
            <View style={s.meterRow}>
              <Text style={s.meterText}>{week.doneWeek} من {week.inWeek} مكتملة</Text>
              <View style={s.meterTrack}>
                <View style={[s.meterFill, { width: `${Math.round(week.pct * 100)}%` }]} />
              </View>
              <Text style={s.meterText}>{Math.round(week.pct * 100)}٪</Text>
            </View>
          </Tile>
        </Animated.View>

        {/* ===== How it works ===== */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <Text style={s.sectionTitle}>كيف يعمل التقييم؟</Text>
          <View style={s.stepsRow}>
            {[
              { n: '١', t: 'اختر المرحلة', d: 'ابتدائي · متوسط', c: c.primary },
              { n: '٢', t: 'اختر المقرر', d: 'فصل · مقرر · نوع', c: c.brandSecondary },
              { n: '٣', t: 'قيّم', d: '٥–١٥ بند', c: c.orange },
            ].map((st) => (
              <View key={st.n} style={[s.stepCard, { borderTopColor: st.c }]}>
                <Text style={[s.stepNum, { color: st.c }]}>{st.n}</Text>
                <Text style={s.stepTitle}>{st.t}</Text>
                <Text style={s.stepDesc}>{st.d}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ===== المراحل ===== */}
        <Animated.Text entering={FadeInDown.delay(360).duration(500)} style={s.sectionTitle}>اختر المرحلة</Animated.Text>
        <View style={{ gap: sp.sm }}>
          {GRADES.filter((g) => g.id !== 'intermediate1').map((g, i) => {
            const n1 = subjectsForGrade(g.id, 'term1').length;
            const n2 = subjectsForGrade(g.id, 'term2').length;
            const color = GRADE_COLORS[i % GRADE_COLORS.length];
            return (
              <Animated.View key={g.id} entering={FadeInDown.delay(420 + i * 60).duration(500)}>
                <Pressable onPress={() => open(g.id)} style={({ pressed }) => [s.gradeCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]} accessibilityRole="button">
                  <View style={[s.gradeAccent, { backgroundColor: color }]} />
                  <View style={[s.gradeIc, { backgroundColor: color + '18' }]}>
                    <Ionicons name="school-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.gradeName}>{gradeName(g.id)}</Text>
                    <Text style={s.gradeMeta}>ف١ · {ar(n1)} مقررات · ف٢ · {ar(n2)} مقررات</Text>
                  </View>
                  <View style={[s.gradeArrow, { backgroundColor: color + '14' }]}>
                    <Ionicons name="chevron-back" size={16} color={color} />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ===== CTA banner ===== */}
        <Animated.View entering={FadeInDown.delay(520).duration(500)} style={s.ctaBanner}>
          <Image source={require('@/assets/brand/bg-deep-dark.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,70,69,0.55)', 'rgba(0,70,69,0.92)']} style={StyleSheet.absoluteFill} />
          <View style={s.ctaBannerContent}>
            <Text style={s.ctaBannerTitle}>جاهز لتقييم إبداعاتك؟</Text>
            <Text style={s.ctaBannerSub}>ابدأ الآن — ٤ مراحل · ٧ مقررات · ٥٩٢ بند</Text>
            <Pressable onPress={reset} style={({ pressed }) => [s.ctaBannerBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]} accessibilityRole="button">
              <LinearGradient colors={[c.primary, c.primaryHi]} style={s.ctaBannerBtnGrad}>
                <Text style={s.ctaBannerBtnText}>ابدأ تقييماً</Text>
                <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>


        {/* ===== FAQ ===== */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text style={s.sectionTitle}>أسئلة شائعة</Text>
          <View style={{ gap: sp.sm }}>
            {[
              { q: 'ما هي منصة تقييم الفنون البصرية؟', a: 'نظام لتقييم وملاحظة الأداء الفني للطلاب (٤–٨) across ٧ مقررات و٥٩٢ بند.' },
              { q: 'كيف أبدأ تقييماً؟', a: 'اختر المرحلة → الفصل → المقرر → نوع التقييم → أدخل الدرجات → اطبع.' },
              { q: 'هل يمكن طباعة الاستمارات؟', a: 'نعم — نماذج A4 (٢١٠×٢٩٧) جاهزة للطباعة من شاشة "نماذج".' },
              { q: 'من يمكنه الدخول؟', a: 'المشرف (admin) والمعلمون (باسمهم وكلمة سرهم) والضيوف (نماذج فقط).' },
            ].map((f, i) => (
              <Pressable key={i} onPress={() => setOpenFaq(openFaq === i ? null : i)} style={s.faqCard} accessibilityRole="button">
                <View style={s.faqHead}>
                  <Text style={s.faqQ}>{f.q}</Text>
                  <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color={c.primary} />
                </View>
                {openFaq === i && <Text style={s.faqA}>{f.a}</Text>}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ===== Footer ===== */}
        <Animated.View entering={FadeInDown.delay(640).duration(500)} style={s.footer}>
          <LinearGradient colors={[c.primary, c.primaryDeep]} style={StyleSheet.absoluteFill} />
          <View style={s.footerContent}>
            <Text style={s.footerTitle}>أكاديمية آفاق للفنون والثقافة</Text>
            <Text style={s.footerSub}>منصة تقييم الفنون البصرية · ١٤٤٧هـ / ٢٠٢٥م</Text>
            <View style={s.footerLinks}>
              <Text style={s.footerLink}>الرئيسية</Text>
              <Text style={s.footerDot}>·</Text>
              <Text style={s.footerLink}>نماذج</Text>
              <Text style={s.footerDot}>·</Text>
              <Text style={s.footerLink}>خدماتنا</Text>
              <Text style={s.footerDot}>·</Text>
              <Text style={s.footerLink}>تواصل</Text>
            </View>
            <Text style={s.footerCopy}>© ٢٠٢٦ جميع الحقوق محفوظة</Text>
          </View>
        </Animated.View>

        {/* ===== FAB ===== */}
        <Pressable onPress={reset} style={s.fab} accessibilityRole="button">
          <LinearGradient colors={[c.primary, c.primaryHi]} style={s.fabGrad}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const ar = (n: number | string) =>
  String(n ?? '').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  scroll: { padding: sp.md, paddingBottom: 110, gap: sp.md },

  /* Hero */
  hero: { height: 230, borderRadius: rad.xl, overflow: 'hidden', marginBottom: sp.xs,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 8 },
  heroContent: { flex: 1, padding: sp.lg, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  heroEyebrowEn: { fontFamily: fnt.m, fontSize: 9.5, color: 'rgba(255,255,255,0.7)', marginLeft: sp.xs },
  heroTitle: { fontFamily: fnt.bk, fontSize: 40, color: '#FFFFFF', letterSpacing: -1, lineHeight: 42, marginTop: 4 },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: rad.md, paddingVertical: sp.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', marginTop: sp.sm },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontFamily: fnt.bk, fontSize: fs.lg, color: '#FFFFFF', letterSpacing: -0.5 },
  heroStatLabel: { fontFamily: fnt.r, fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  heroDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.25)' },

  sectionTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.text, marginTop: sp.sm, marginBottom: 2, paddingHorizontal: 2 },

  /* Quick actions grid */
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  actionCardSolid: { width: '47.6%', borderRadius: rad.lg, padding: sp.md, gap: sp.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.20, shadowRadius: 16, elevation: 5 },
  actionIconWrapSolid: { width: 42, height: 42, borderRadius: rad.md, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  actionLabelSolid: { fontFamily: fnt.b, fontSize: fs.sm, color: '#FFFFFF' },

  row: { flexDirection: 'row', gap: sp.md },
  big: { fontFamily: fnt.bk, fontSize: 30, color: c.primary, letterSpacing: -0.8, lineHeight: 34 },
  note: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 2 },

  meterRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 2 },
  meterText: { fontFamily: fnt.m, fontSize: 10, color: c.text3 },
  meterTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.meterTrack, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: c.primary, borderRadius: 3 },

  /* How it works */
  stepsRow: { flexDirection: 'row', gap: sp.sm },
  stepCard: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.md, borderWidth: 1, borderColor: c.tileBorder, borderTopWidth: 3, padding: sp.md, gap: 4,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  stepNum: { fontFamily: fnt.bk, fontSize: fs.xl, letterSpacing: -0.5 },
  stepTitle: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text },
  stepDesc: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3 },

  /* Grade rows */
  gradeCard: { flexDirection: 'row', alignItems: 'center', gap: sp.md, borderRadius: rad.lg, padding: sp.md, overflow: 'hidden', backgroundColor: '#FFFFFF',
    shadowColor: c.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: c.line },
  gradeAccent: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, borderTopRightRadius: rad.lg, borderBottomRightRadius: rad.lg },
  gradeIc: { width: 42, height: 42, borderRadius: rad.md, alignItems: 'center', justifyContent: 'center' },
  gradeName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  gradeMeta: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 1 },
  gradeArrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  /* CTA banner */
  ctaBanner: { height: 170, borderRadius: rad.xl, overflow: 'hidden', marginTop: sp.sm,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 6 },
  ctaBannerContent: { flex: 1, padding: sp.lg, justifyContent: 'center', gap: sp.sm },
  ctaBannerTitle: { fontFamily: fnt.bk, fontSize: fs.lg, color: '#FFFFFF', letterSpacing: -0.3 },
  ctaBannerSub: { fontFamily: fnt.r, fontSize: fs.xs, color: 'rgba(255,255,255,0.85)' },
  ctaBannerBtn: { alignSelf: 'flex-start', borderRadius: rad.pill, overflow: 'hidden', marginTop: sp.xs },
  ctaBannerBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingHorizontal: sp.lg, paddingVertical: 10 },
  ctaBannerBtnText: { fontFamily: fnt.b, fontSize: fs.sm, color: '#FFFFFF' },

  /* Gallery */
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  galleryItem: { width: '31.5%', aspectRatio: 1, borderRadius: rad.md, overflow: 'hidden', justifyContent: 'flex-end', padding: sp.xs },
  galleryLabel: { fontFamily: fnt.b, fontSize: 10, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  /* FAQ */
  faqCard: { backgroundColor: c.tileBg, borderRadius: rad.md, borderWidth: 1, borderColor: c.tileBorder, padding: sp.md, gap: sp.xs },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sp.sm },
  faqQ: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text, flex: 1 },
  faqA: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text2, lineHeight: 17, marginTop: sp.xs },

  /* Footer */
  footer: { borderRadius: rad.xl, overflow: 'hidden', marginTop: sp.sm },
  footerContent: { padding: sp.lg, gap: sp.xs, alignItems: 'center' },
  footerTitle: { fontFamily: fnt.bk, fontSize: fs.md, color: '#FFFFFF' },
  footerSub: { fontFamily: fnt.r, fontSize: fs.xxs, color: 'rgba(255,255,255,0.8)' },
  footerLinks: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xs, flexWrap: 'wrap', justifyContent: 'center' },
  footerLink: { fontFamily: fnt.m, fontSize: fs.xxs, color: 'rgba(255,255,255,0.9)' },
  footerDot: { color: 'rgba(255,255,255,0.5)' },
  footerCopy: { fontFamily: fnt.r, fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: sp.xs },

  /* FAB */
  fab: { position: 'absolute', bottom: 16, left: sp.md, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
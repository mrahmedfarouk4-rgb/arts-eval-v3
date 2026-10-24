import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  GRADES, subjectsForGrade, gradeName, CRITERIA_COUNT,
} from '@/constants/criteria';
import { c, sp, rad, fnt, fs, gradeTone } from '@/constants/brand';
import {
  Tile, WeekStrip, ar,
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

export default function GradesScreen() {
  const router = useRouter();
  const { setGrade, resetFlow } = useSession();

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const stagesY = useRef(0);

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

  /** بدء تقييم جديد: تصفير الاختيارات ثم الانتقال إلى قائمة المراحل */
  const startEvaluation = useCallback(() => {
    resetFlow();
    scrollRef.current?.scrollTo({ y: Math.max(0, stagesY.current - sp.md), animated: true });
  }, [resetFlow]);

  /** الإجراء الأساسي واحد (زرّ معبّأ)، والبقية بلاطات بيضاء بلون أيقونتها */
  const ACTIONS = [
    { label: 'أضف طالباً', sub: 'بيانات الطالب', icon: 'person-add-outline', ink: c.brandSecondary, tint: 'rgba(98, 18, 68, 0.10)', onPress: () => router.push('/students' as never) },
    { label: 'السجل', sub: 'تقييمات سابقة', icon: 'albums-outline', ink: c.blueDeep, tint: 'rgba(38, 38, 116, 0.10)', onPress: () => router.push('/records' as never) },
    { label: 'استمارة', sub: 'نماذج A4', icon: 'print-outline', ink: c.warmInk, tint: c.accentBg, onPress: () => router.push('/samples' as never) },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require('@/assets/brand/bg-school-gate.jpg')}
          style={s.bgPhoto}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(250,250,250,0.87)' }]} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ===== Hero ===== */}
        <Animated.View entering={FadeIn.duration(700)} style={s.hero}>
          <LinearGradient
            colors={[c.primarySoft, c.primary]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroContent}>
            <View style={s.heroBrand}>
              <Text style={s.heroEyebrow}>أكاديمية آفاق · الفنون البصرية</Text>
              <Text style={s.heroEyebrowEn}>AFAC — Fine Arts &amp; Culture</Text>
            </View>
            <Text style={s.heroTitle}>تقييم. إبداع. تألق.</Text>
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
                <Text style={s.heroStatValue}>{week.inWeek ? `${ar(Math.round(week.pct * 100))}٪` : '—'}</Text>
                <Text style={s.heroStatLabel}>إنجاز</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== Quick actions ===== */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={s.actionsBlock}>
          <Text style={s.sectionTitle}>ابدأ بسرعة</Text>
          <Pressable
            onPress={startEvaluation}
            style={({ pressed }) => [s.primaryAction, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="ابدأ تقييماً جديداً"
          >
            <LinearGradient colors={[c.primary, c.primaryHi]} style={StyleSheet.absoluteFill} />
            <View style={s.primaryActionIc}>
              <Ionicons name="play" size={19} color={c.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.primaryActionLabel}>ابدأ تقييماً</Text>
              <Text style={s.primaryActionSub}>المرحلة ← المقرر ← الدرجات</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <View style={s.actionGrid}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                style={({ pressed }) => [s.actionCard, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
                accessibilityRole="button"
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.tint }]}>
                  <Ionicons name={a.icon as any} size={19} color={a.ink} />
                </View>
                <Text style={s.actionLabel} numberOfLines={1}>{a.label}</Text>
                <Text style={s.actionSub} numberOfLines={1}>{a.sub}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ===== الأسبوع ===== */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Tile wide bg={require('@/assets/brand/bg-warm-light.jpg')} title={`الأسبوع ${ar(weekNo())} · ${ar(rangeLabel())}`}>
            <WeekStrip days={week.days} />
            {week.inWeek === 0 ? (
              <View style={s.weekEmpty}>
                <Ionicons name="calendar-outline" size={14} color={c.text3} />
                <Text style={s.meterText}>لا تقييمات هذا الأسبوع بعد</Text>
              </View>
            ) : (
              <View style={s.meterRow}>
                <Text style={s.meterText}>{ar(week.doneWeek)} من {ar(week.inWeek)} مكتملة</Text>
                <View style={s.meterTrack}>
                  <View style={[s.meterFill, { width: `${Math.round(week.pct * 100)}%` }]} />
                </View>
                <Text style={s.meterText}>{ar(Math.round(week.pct * 100))}٪</Text>
              </View>
            )}
          </Tile>
        </Animated.View>

        {/* ===== How it works ===== */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <Text style={s.sectionTitle}>كيف يعمل التقييم؟</Text>
          <View style={s.stepsRow}>
            {[
              { n: '١', t: 'اختر المرحلة', d: 'ابتدائي · متوسط', c: c.primary },
              { n: '٢', t: 'اختر المقرر', d: 'فصل · مقرر · نوع', c: c.brandSecondary },
              { n: '٣', t: 'قيّم', d: '٥–١٥ بند', c: c.warmInk },
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
        <View onLayout={(e) => { stagesY.current = e.nativeEvent.layout.y; }}>
          <Animated.Text entering={FadeInDown.delay(360).duration(500)} style={s.sectionTitle}>اختر المرحلة</Animated.Text>
          <View style={{ gap: sp.sm }}>
            {GRADES.filter((g) => g.id !== 'intermediate1').map((g, i) => {
              const n1 = subjectsForGrade(g.id, 'term1').length;
              const n2 = subjectsForGrade(g.id, 'term2').length;
              const tone = gradeTone(g.id);
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(420 + i * 60).duration(500)}>
                  <Pressable onPress={() => open(g.id)} style={({ pressed }) => [s.gradeCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]} accessibilityRole="button">
                    <View style={[s.gradeAccent, { backgroundColor: tone.base }]} />
                    <View style={[s.gradeIc, { backgroundColor: tone.tint }]}>
                      <Ionicons name="school-outline" size={18} color={tone.deep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gradeName}>{gradeName(g.id)}</Text>
                      <Text style={s.gradeMeta}>ف١ · {ar(n1)} مقررات · ف٢ · {ar(n2)} مقررات</Text>
                    </View>
                    <View style={[s.gradeArrow, { backgroundColor: tone.tint }]}>
                      <Ionicons name="chevron-back" size={16} color={tone.deep} />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ===== CTA banner ===== */}
        <Animated.View entering={FadeInDown.delay(520).duration(500)} style={s.ctaBanner}>
          <Image source={require('@/assets/brand/bg-deep-dark.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,70,69,0.55)', 'rgba(0,70,69,0.92)']} style={StyleSheet.absoluteFill} />
          <View style={s.ctaBannerContent}>
            <Text style={s.ctaBannerTitle}>جاهز لتقييم إبداعاتك؟</Text>
            <Text style={s.ctaBannerSub}>ابدأ الآن — ٤ مراحل · {ar(subjectTotal)} مقررات · {ar(CRITERIA_COUNT)} بند</Text>
            <Pressable onPress={startEvaluation} style={({ pressed }) => [s.ctaBannerBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]} accessibilityRole="button">
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
              { q: 'ما هي منصة تقييم الفنون البصرية؟', a: 'نظام لتقييم وملاحظة الأداء الفني للطلاب (٤–٨) عبر ٨ مقررات و٥٩٢ بند.' },
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
        <Pressable onPress={startEvaluation} style={s.fab} accessibilityRole="button" accessibilityLabel="ابدأ تقييماً">
          <LinearGradient colors={[c.primary, c.primaryHi]} style={s.fabGrad}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  bgPhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '116%' },
  scroll: { padding: sp.md, paddingBottom: 110, gap: sp.md },

  /* Hero — ارتفاعه حسب محتواه حتى لا تُقصّ صفوف الإحصاء */
  hero: { borderRadius: rad.xl, overflow: 'hidden',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 8 },
  heroContent: { padding: sp.lg, gap: sp.xs },
  heroBrand: { gap: 1 },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, color: 'rgba(255,255,255,0.9)' },
  heroEyebrowEn: { fontFamily: fnt.m, fontSize: 9.5, color: 'rgba(255,255,255,0.68)', letterSpacing: 0.3 },
  heroTitle: { fontFamily: fnt.bk, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 34, marginTop: sp.xs },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, color: 'rgba(255,255,255,0.84)' },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: rad.md, paddingVertical: sp.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', marginTop: sp.xs },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontFamily: fnt.bk, fontSize: fs.lg, color: '#FFFFFF', letterSpacing: -0.5 },
  heroStatLabel: { fontFamily: fnt.r, fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  heroDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  sectionTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.text, marginTop: sp.sm, marginBottom: 2, paddingHorizontal: 2 },

  /* Quick actions — إجراء أساسي واحد + ثلاث بلاطات بيضاء */
  actionsBlock: { gap: sp.sm },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: sp.md, borderRadius: rad.lg, padding: sp.md, overflow: 'hidden',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 6 },
  primaryActionIc: { width: 40, height: 40, borderRadius: rad.md, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  primaryActionLabel: { fontFamily: fnt.b, fontSize: fs.md, color: '#FFFFFF' },
  primaryActionSub: { fontFamily: fnt.r, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  actionGrid: { flexDirection: 'row', gap: sp.sm },
  actionCard: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.lg, borderWidth: 1, borderColor: c.line, padding: sp.md, gap: sp.xs,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  actionIconWrap: { width: 36, height: 36, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text },
  actionSub: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3 },

  meterRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  meterText: { fontFamily: fnt.m, fontSize: 10, color: c.text3 },
  meterTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.meterTrack, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: c.primary, borderRadius: 3 },
  weekEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.xs },

  /* How it works — ترقيم العربية والرقم على حافة واحدة */
  stepsRow: { flexDirection: 'row', gap: sp.sm },
  stepCard: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.md, borderWidth: 1, borderColor: c.tileBorder, borderTopWidth: 3, padding: sp.md, gap: 3,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  stepNum: { fontFamily: fnt.bk, fontSize: fs.xl, letterSpacing: -0.5, textAlign: 'right' },
  stepTitle: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text, textAlign: 'right' },
  stepDesc: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, textAlign: 'right' },

  /* Grade rows — بطاقة بيضاء وشريط بلون المرحلة على حافة السهم */
  gradeCard: { flexDirection: 'row', alignItems: 'center', gap: sp.md, borderRadius: rad.lg, padding: sp.md, overflow: 'hidden',
    backgroundColor: c.tileBg, borderWidth: 1, borderColor: c.line,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
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

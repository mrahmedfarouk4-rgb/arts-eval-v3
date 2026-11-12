import { CountUp } from '@/components/count-up';
import { GradeStack, type GradeCardItem } from '@/components/grade-stack';
import { LiftPressable, useToneVeil } from '@/components/motion';
import { useResponsive } from '@/hooks/use-responsive';
import {
    Tile, WeekStrip, ar,
    type WeekDay,
} from '@/components/pro-ui';
import { c, fnt, fs, gradeTone, rad, sp } from '@/constants/brand';
import {
    CRITERIA_COUNT,
    GRADES,
    gradeName,
    subjectsForGrade,
} from '@/constants/criteria';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { visibleGrades, visibleSubjects } from '@/lib/accounts';
import { listEvaluations, listStudents, type Evaluation } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    Extrapolation,
    FadeIn,
    FadeInDown,
    cancelAnimation,
    interpolate,
    useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue,
    withRepeat, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

/** المراحل الفعلية — المعرّف القديم `intermediate1` لا يُعرض */
const ACTIVE_GRADES = GRADES.filter((g) => g.id !== 'intermediate1');
const ACTIVE_GRADE_IDS = ACTIVE_GRADES.map((g) => g.id);

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

/**
 * سؤال شائع — السهم يدور والسطر ينزلق بدل الظهور المفاجئ.
 * ارتفاع البطاقة يتغيّر فوراً (لا LayoutAnimation) كي يبقى النقر تحت
 * الإصبع بلا تأخير.
 */
function FaqRow({
  q, a, open, onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const turn = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    turn.value = reduce ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: 180 });
  }, [open, reduce, turn]);

  const chevStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));

  return (
    <LiftPressable
      onPress={onToggle}
      lift={1.5}
      hoverScale={1.004}
      pressScale={0.99}
      shadow={{ opacity: 0, hoverOpacity: 0.10, radius: 0, hoverRadius: 16 }}
      style={s.faqCard}
      accessibilityLabel={q}
      accessibilityState={{ expanded: open }}
    >
      <View style={s.faqHead}>
        <Text style={s.faqQ}>{q}</Text>
        <Animated.View style={chevStyle}>
          <Ionicons name="chevron-down" size={16} color={c.primary} />
        </Animated.View>
      </View>
      {open && (
        <Animated.Text entering={FadeInDown.duration(190)} style={s.faqA}>
          {a}
        </Animated.Text>
      )}
    </LiftPressable>
  );
}

export default function GradesScreen() {
  const router = useRouter();
  const { setGrade, resetFlow } = useSession();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  const stagesY = useRef(0);

  /** تمويه بسيط: الهيرو يتحرك أبطأ من المحتوى والصور خلفه أبطأ منه */
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const heroMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 280], [0, 46], Extrapolation.CLAMP) },
    ],
  }));
  const bgMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 420], [0, -44], Extrapolation.CLAMP) },
    ],
  }));

  /** ترويسة مكثّفة — تظهر بعد تجاوز الهيرو فتبقى هوية الصفحة وإنجاز الأسبوع في النظر */
  const stickyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 210], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [120, 210], [-12, 0], Extrapolation.CLAMP) },
    ],
  }));

  /**
   * حيّوية خفيفة لا تُشتّت: وميض يمرّ على الهيرو كل سبع ثوانٍ، وهالة
   * تتنفّس خلف زرّ الإضافة. كلتاهما transform + opacity فقط، وتتوقّفان
   * تماماً عند طلب تقليل الحركة.
   */
  const reduceMotion = useReducedMotion();
  const sheen = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    sheen.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(sheen);
  }, [reduceMotion, sheen]);

  useEffect(() => {
    if (reduceMotion) return;
    halo.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    return () => cancelAnimation(halo);
  }, [reduceMotion, halo]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.18, 0.82, 1], [0, 0.16, 0.16, 0]),
    transform: [
      { translateX: interpolate(sheen.value, [0, 1], [-280, 560]) },
      { rotate: '16deg' },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 0.18, 1], [0, 0.32, 0]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [1, 1.65]) }],
  }));

  const reload = useCallback(async () => {
    try {
      const [ev, st] = await Promise.all([listEvaluations(), listStudents()]);
      // لا يُحصى ولا يُعرض إلا ما يخصّ مراحل الحساب المسندة
      const allowed = new Set<string>(visibleGrades(user, ACTIVE_GRADE_IDS));
      setEvals(ev.filter((e) => allowed.has(e.grade_id)));
      setStudents(st.filter((s) => !!s.grade_id && allowed.has(s.grade_id)).length);
    } catch { /* تجاهل */ }
  }, [user]);
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
    const allowed = new Set(visibleGrades(user, ACTIVE_GRADE_IDS));
    const set = new Set<string>();
    for (const g of ACTIVE_GRADES) {
      if (!allowed.has(g.id)) continue;
      for (const sid of visibleSubjects(user, subjectsForGrade(g.id, 'all'))) set.add(sid);
    }
    return set.size;
  }, [user]);

  /**
   * بيانات عمود المراحل — تُحسب مرّة واحدة، فالتصنيف ثابت.
   * نفس شكل بطاقات تقرير الستة أسابيع: رقم وتسمية وعنوان وعدّادات.
   * تُقصَر على المراحل المسندة للمعلم (المشرف والزائر يريان الكل).
   */
  const gradeCards = useMemo<GradeCardItem[]>(() => {
    const allowed = new Set(visibleGrades(user, ACTIVE_GRADE_IDS));
    return ACTIVE_GRADES.filter((g) => allowed.has(g.id)).map((g) => ({
      id: g.id,
      title: gradeName(g.id),
      kicker: 'المرحلة الدراسية',
      meta: [
        'فصلان',
        `${ar(
          visibleSubjects(user, subjectsForGrade(g.id, 'term1')).length +
            visibleSubjects(user, subjectsForGrade(g.id, 'term2')).length
        )} مقررات`,
      ],
    }));
  }, [user]);

  const open = (gradeId: string) => {
    setGrade(gradeId as never);
    router.push('/term' as never);
  };

  /**
   * انتقال الصفحة يبدأ من البطاقة نفسها: ستارة بلون المرحلة تنمو من
   * مركز الشاشة خلال ١٩٠مم، ثم يُدفع المسار، فيهبط هيرو الفصل باللون
   * ذاته. فيُقرأ الضغط كـ"فتح" للبطاقة لا كاستبدال مفاجئ للصفحة.
   *
   * لو فشل التنقّل لأي سبب تُعاد الستارة عند عودة التركيز للشاشة.
   */
  const { run: veilRun, style: veilStyle, color: veilColor, reset: veilReset } = useToneVeil(rad.xl);

  const openStage = (id: string) => veilRun(gradeTone(id).deep, () => open(id));

  useFocusEffect(useCallback(() => { veilReset(); }, [veilReset]));

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
        <Animated.View style={[StyleSheet.absoluteFill, bgMotion]}>
          <Image
            source={require('@/assets/brand/bg-school-gate.jpg')}
            style={s.bgPhoto}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(250,250,250,0.87)' }]} />
        </Animated.View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={isDesktop ? s.scrollDesktop : s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero ===== */}
        <Animated.View entering={FadeIn.duration(700)} style={[s.hero, heroMotion]}>
          <LinearGradient
            colors={[c.primarySoft, c.primary]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View pointerEvents="none" style={[s.sheen, sheenStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={s.heroContent}>
            <View style={s.heroBrand}>
              <Text style={s.heroEyebrow}>أكاديمية آفاق · الفنون البصرية</Text>
              <Text style={s.heroEyebrowEn}>AFAC — Fine Arts &amp; Culture</Text>
            </View>
            <Text style={s.heroTitle}>تقييم. إبداع. تألق.</Text>
            <Text style={s.heroSub}>لوحة عمل المعلّم — كل ما تحتاجه بنظرة واحدة</Text>
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <CountUp value={students} style={s.heroStatValue} />
                <Text style={s.heroStatLabel}>طالب</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <CountUp value={subjectTotal} style={s.heroStatValue} />
                <Text style={s.heroStatLabel}>مقرر</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <CountUp value={CRITERIA_COUNT} style={s.heroStatValue} />
                <Text style={s.heroStatLabel}>بند</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                {week.inWeek ? (
                  <CountUp
                    value={Math.round(week.pct * 100)}
                    suffix="٪"
                    style={s.heroStatValue}
                  />
                ) : (
                  <Text style={s.heroStatValue}>—</Text>
                )}
                <Text style={s.heroStatLabel}>إنجاز</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== Quick actions ===== */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={s.actionsBlock}>
          <Text style={s.sectionTitle}>ابدأ بسرعة</Text>
          <LiftPressable
            onPress={startEvaluation}
            lift={2}
            hoverScale={1.01}
            pressScale={0.985}
            shadow={{ opacity: 0.24, hoverOpacity: 0.34, radius: 20, hoverRadius: 30 }}
            style={s.primaryAction}
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
          </LiftPressable>
          <View style={s.actionGrid}>
            {ACTIONS.map((a) => (
              <LiftPressable
                key={a.label}
                onPress={a.onPress}
                lift={2}
                hoverScale={1.02}
                pressScale={0.965}
                shadow={{ opacity: 0.07, hoverOpacity: 0.16, radius: 12, hoverRadius: 22 }}
                style={s.actionCard}
                accessibilityLabel={a.label}
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.tint, borderColor: a.ink + '1F' }]}>
                  <Ionicons name={a.icon as any} size={19} color={a.ink} />
                </View>
                <Text style={s.actionLabel} numberOfLines={1}>{a.label}</Text>
                <Text style={s.actionSub} numberOfLines={1}>{a.sub}</Text>
              </LiftPressable>
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
              { n: '١', t: 'اختر المرحلة', d: 'ابتدائي · متوسط', c: c.primary, bg: c.primaryBg },
              { n: '٢', t: 'اختر المقرر', d: 'فصل · مقرر · نوع', c: c.brandSecondary, bg: c.brandSecondaryBg },
              { n: '٣', t: 'قيّم', d: '٥–١٥ بند', c: c.gold, bg: c.orangeBg },
            ].map((st, i) => (
              <Animated.View
                key={st.n}
                entering={FadeInDown.delay(320 + i * 70).duration(460)}
                style={[s.stepCard, { borderTopColor: st.c }]}
              >
                <View style={[s.stepNumWrap, { backgroundColor: st.bg }]}>
                  <Text style={[s.stepNum, { color: st.c }]}>{st.n}</Text>
                </View>
                <Text style={s.stepTitle}>{st.t}</Text>
                <Text style={s.stepDesc}>{st.d}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ===== المراحل — عمود من الأعلى إلى الأسفل ===== */}
        <View onLayout={(e) => { stagesY.current = e.nativeEvent.layout.y; }} style={s.railBlock}>
          <Animated.View entering={FadeInDown.delay(360).duration(500)} style={s.railHead}>
            <Text style={s.sectionTitle}>اختر المرحلة</Text>
            <View style={s.railHint}>
              <Ionicons name="layers-outline" size={12} color={c.text4} />
              <Text style={s.railHintText}>{ar(gradeCards.length)} مراحل</Text>
            </View>
          </Animated.View>
          <GradeStack items={gradeCards} onOpen={openStage} />
        </View>

        {/* ===== CTA banner ===== */}
        <Animated.View entering={FadeInDown.delay(520).duration(500)} style={s.ctaBanner}>
          <Image source={require('@/assets/brand/bg-deep-dark.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,70,69,0.55)', 'rgba(0,70,69,0.92)']} style={StyleSheet.absoluteFill} />
          <View style={s.ctaBannerContent}>
            <Text style={s.ctaBannerTitle}>جاهز لتقييم إبداعاتك؟</Text>
            <Text style={s.ctaBannerSub}>ابدأ الآن — {ar(gradeCards.length)} مراحل · {ar(subjectTotal)} مقررات · {ar(CRITERIA_COUNT)} بند</Text>
            <LiftPressable
              onPress={startEvaluation}
              lift={1.5}
              hoverScale={1.03}
              pressScale={0.965}
              style={s.ctaBannerBtn}
              accessibilityLabel="ابدأ تقييماً"
            >
              <LinearGradient colors={[c.primary, c.primaryHi]} style={s.ctaBannerBtnGrad}>
                <Text style={s.ctaBannerBtnText}>ابدأ تقييماً</Text>
                <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
              </LinearGradient>
            </LiftPressable>
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
              <FaqRow
                key={i}
                q={f.q}
                a={f.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
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

        {/* ===== FAB — للجوال فقط؛ على سطح المكتب تكفي الإجراءات الظاهرة ===== */}
        {!isDesktop && (
          <View style={s.fabWrap} pointerEvents="box-none">
            <Animated.View pointerEvents="none" style={[s.fabHalo, haloStyle]} />
            <LiftPressable
              onPress={startEvaluation}
              lift={3}
              hoverScale={1.08}
              pressScale={0.9}
              shadow={{ opacity: 0.30, hoverOpacity: 0.42, radius: 18, hoverRadius: 28 }}
              style={s.fab}
              accessibilityLabel="ابدأ تقييماً"
            >
              <LinearGradient colors={[c.primary, c.primaryHi]} style={s.fabGrad}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </LinearGradient>
            </LiftPressable>
          </View>
        )}
      </Animated.ScrollView>

      {/* ===== ترويسة مكثّفة عند التمرير ===== */}
      <Animated.View pointerEvents="none" style={[s.stickyHead, stickyStyle]}>
        <View style={s.stickyLogo}>
          <Text style={s.stickyLogoText}>آ</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.stickyTitle}>لوحة العمل</Text>
          <Text style={s.stickySub}>أكاديمية آفاق · الفنون البصرية</Text>
        </View>
        <View style={s.stickyStat}>
          <Text style={s.stickyStatValue}>
            {week.inWeek ? `${ar(Math.round(week.pct * 100))}٪` : '—'}
          </Text>
          <Text style={s.stickyStatLabel}>إنجاز الأسبوع</Text>
        </View>
      </Animated.View>

      {/* ستارة الانتقال — فوق الترويسة المكثّفة أيضاً */}
      <Animated.View
        pointerEvents="none"
        style={[s.veil, { backgroundColor: veilColor }, veilStyle]}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  bgPhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '116%' },
  scroll: { padding: sp.md, paddingBottom: 110, gap: sp.md },
  scrollDesktop: { width: '100%', padding: sp.lg, paddingBottom: 130, gap: sp.lg, maxWidth: 1100, alignSelf: 'center' },

  /* Hero — ارتفاعه حسب محتواه حتى لا تُقصّ صفوف الإحصاء */
  hero: { borderRadius: rad.xl, overflow: 'hidden',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 8 },
  sheen: { position: 'absolute', top: -90, bottom: -90, width: 150 },
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

  railBlock: { gap: sp.sm },
  railHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  railHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.bgAlt, borderRadius: rad.pill,
    borderWidth: 1, borderColor: c.line,
    paddingVertical: 3, paddingHorizontal: sp.sm,
  },
  railHintText: { fontFamily: fnt.r, fontSize: 10, color: c.text3 },

  /* Quick actions — أيقونة وسطية بهالة لونية كما في بطاقات المعرض */
  actionsBlock: { gap: sp.sm },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: sp.md, borderRadius: rad.lg, padding: sp.md, overflow: 'hidden',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 6 },
  primaryActionIc: { width: 40, height: 40, borderRadius: rad.md, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  primaryActionLabel: { fontFamily: fnt.b, fontSize: fs.md, color: '#FFFFFF' },
  primaryActionSub: { fontFamily: fnt.r, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  actionGrid: { flexDirection: 'row', gap: sp.sm },
  actionCard: { flex: 1, alignItems: 'center', backgroundColor: c.tileBg, borderRadius: rad.xl, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.lg, paddingHorizontal: sp.sm, gap: 3,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  actionIconWrap: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 1 },
  actionLabel: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text, textAlign: 'center' },
  actionSub: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, textAlign: 'center' },

  meterRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  meterText: { fontFamily: fnt.m, fontSize: 10, color: c.text3 },
  meterTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.meterTrack, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: c.primary, borderRadius: 3 },
  weekEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.xs },

  /* How it works — رقم داخل بلاطة لونية بدل رقم عائم */
  stepsRow: { flexDirection: 'row', gap: sp.sm },
  stepCard: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.xl, borderWidth: 1, borderColor: c.tileBorder, borderTopWidth: 3, padding: sp.md, gap: 3,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  stepNumWrap: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4, alignSelf: 'flex-start' },
  stepNum: { fontFamily: fnt.bk, fontSize: fs.md, letterSpacing: -0.5 },
  stepTitle: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text, textAlign: 'right' },
  stepDesc: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, textAlign: 'right' },

  /* Grade list — البطاقة نفسها في components/grade-stack.tsx */

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
  faqCard: { backgroundColor: c.tileBg, borderRadius: rad.md, borderWidth: 1, borderColor: c.tileBorder, padding: sp.md, gap: sp.xs, shadowColor: c.primary, shadowOffset: { width: 0, height: 6 } },
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

  /* FAB — الهالة تُرسم خلف الزرّ في الحاوية نفسها */
  fabWrap: { position: 'absolute', bottom: 16, left: sp.md, width: 56, height: 56 },
  fabHalo: { position: 'absolute', top: 0, left: 0, width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary },
  fab: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* ستارة الانتقال بين الصفحات */
  veil: { ...StyleSheet.absoluteFillObject, zIndex: 40 },

  /* ترويسة التمرير المكثّفة */
  stickyHead: {
    position: 'absolute', top: 0, left: 0, right: 0,
    /* ترتيب عربي على الويب: الشعار يميناً والإحصاءة يساراً */
    flexDirection: Platform.OS === 'web' ? 'row-reverse' : 'row',
    alignItems: 'center', gap: sp.md,
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
    backgroundColor: 'rgba(250,250,250,0.97)',
    borderBottomWidth: 1, borderBottomColor: c.line,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
    zIndex: 10,
  },
  stickyLogo: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
  },
  stickyLogoText: { fontFamily: fnt.b, fontSize: 15, color: '#FFFFFF' },
  stickyTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  stickySub: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, marginTop: 1 },
  stickyStat: { alignItems: 'flex-end' },
  stickyStatValue: { fontFamily: fnt.bk, fontSize: fs.md, color: c.primary },
  stickyStatLabel: { fontFamily: fnt.r, fontSize: 9, color: c.text3 },
});

import { useToneVeil } from '@/components/motion';
import {
    c,
    fnt, fs, gradeTone, subjectTone,
    rad,
    sp,
    type GradeTone,
} from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import {
    GRADES,
    TERMS,
    gradeName,
    subjectName,
    subjectsForGrade,
    type GradeId,
    type SubjectId,
} from '@/constants/criteria';
import { visibleGrades, visibleSubjects } from '@/lib/accounts';
import { useAuth } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Image,
    Pressable, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    Easing, Extrapolation,
    FadeIn,
    FadeInDown,
    ZoomIn,
    interpolate, interpolateColor,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSequence,
    withSpring, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * لون ثانوي مقروء فوق تدرّج الهيرو. نرفع تعبئة الحبر قليلاً عن
 * tone.onBaseMuted لأن التدرّج الجديد أكثر تشبعاً من اللون المسطّح السابق.
 */
function heroInkMuted(tone: GradeTone): string {
  return tone.onBase === '#171717'
    ? 'rgba(23, 23, 23, 0.88)'
    : 'rgba(255, 255, 255, 0.84)';
}

/** عنوان قسم بشريط تدرّج صغير — يربط الأسطح بلون المرحلة */
function SectionHead({ title, tone }: { title: string; tone: GradeTone }) {
  return (
    <View style={s.sectionHead}>
      <LinearGradient
        colors={[tone.vivid, tone.glow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.sectionMark}
      />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * بطاقة الفصل — تدرّج يظهر بتلاشٍ عند التحديد، نبضة خفيفة، وميلان 3D
 * أثناء الضغط مع ظل ملوّن يرفع البطاقة عن السطح.
 */
function TermCard({
  name, sub, on, tone, onPress,
}: {
  name: string;
  sub: string;
  on: boolean;
  tone: GradeTone;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const hover = useSharedValue(0);
  const sel = useSharedValue(on ? 1 : 0);
  const pulse = useSharedValue(1);
  const wasOn = useRef(on);

  useEffect(() => {
    sel.value = withTiming(on ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    if (on && !wasOn.current) {
      pulse.value = withSequence(
        withTiming(1.045, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 10, stiffness: 240 })
      );
    }
    wasOn.current = on;
  }, [on, sel, pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${interpolate(press.value, [0, 1], [0, 5])}deg` },
      { rotateY: `${interpolate(press.value, [0, 1], [0, -4])}deg` },
      { translateY: interpolate(press.value, [0, 1], [0, 2]) - hover.value * 3 },
      {
        scale: pulse.value
          * interpolate(press.value, [0, 1], [1, 0.97])
          * interpolate(hover.value, [0, 1], [1, 1.012]),
      },
    ],
    shadowOpacity:
      interpolate(sel.value, [0, 1], [0.07, 0.4], Extrapolation.CLAMP)
      * interpolate(press.value, [0, 1], [1, 0.45])
      + hover.value * 0.05,
    shadowRadius:
      interpolate(sel.value, [0, 1], [9, 19], Extrapolation.CLAMP)
      + hover.value * 4,
  }));

  const selectedFill = useAnimatedStyle(() => ({ opacity: sel.value }));
  const idleFill = useAnimatedStyle(() => ({ opacity: 1 - sel.value }));

  const titleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [c.text, tone.onBase]),
  }));
  const subStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [c.text3, tone.onBase]),
    opacity: interpolate(sel.value, [0, 1], [1, 0.9]),
  }));

  return (
    <Animated.View
      style={[s.termChip, { shadowColor: tone.glow }, cardStyle]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => {
          hover.value = withSpring(1, { damping: 20, stiffness: 220 });
        }}
        onHoverOut={() => {
          hover.value = withSpring(0, { damping: 20, stiffness: 220 });
        }}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={[s.termInner, { borderColor: on ? tone.vivid : tone.base + '38' }]}
        accessibilityRole="radio"
        accessibilityLabel={`${name} — ${sub}`}
        accessibilityState={{ selected: on }}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, idleFill]}>
          <LinearGradient
            colors={['#FFFFFF', tone.chipBg, tone.vivid + '1F']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, selectedFill]}>
          <LinearGradient
            colors={[tone.vivid, tone.base]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.termOrb, { backgroundColor: tone.glow, opacity: 0.25 }]} />
          <View style={[s.termSheen, { backgroundColor: tone.onBase + '0A' }]} />
        </Animated.View>

        <View style={s.termTop}>
          <View style={[s.termIc, { backgroundColor: on ? tone.onBase + '22' : tone.base + '14' }]}>
            <Ionicons name="calendar-outline" size={14} color={on ? tone.onBase : tone.base} />
          </View>
          <Animated.Text style={[s.termText, titleStyle]}>{name}</Animated.Text>
          {on && (
            <Animated.View
              entering={ZoomIn.duration(210)}
              style={[s.termCheck, {
                backgroundColor: tone.onBase + '30',
                borderColor: tone.onBase + '55',
              }]}
            >
              <Ionicons name="checkmark" size={11} color={tone.onBase} />
            </Animated.View>
          )}
        </View>
        <View style={s.termSubRow}>
          <Animated.Text style={[s.termSub, subStyle]}>{sub}</Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TermScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    gradeId, term, setTerm, setSubject,
    teacherName, setTeacherName, resetFlow } = useSession();

  const [teacherDraft, setTeacherDraft] = useState(teacherName ?? '');
  const [teacherMissing, setTeacherMissing] = useState(false);

  /**
   * تكبير خفيف عند الدخول (1.045 ← 1) — يوحي بأن بطاقة المرحلة
   * الملموسة هي التي تمدّدت إلى هذا الهيرو، بلا واجهة مشاركة عناصر
   * تجريبية. يسبق أي return شرطي حتى يبقى ترتيب الـhooks ثابتاً.
   */
  const reduceMotion = useReducedMotion();
  const heroIn = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      heroIn.value = 1;
      return;
    }
    heroIn.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, heroIn]);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(heroIn.value, [0, 1], [1.045, 1]) }],
  }));

  /** ستارة بلون المرحلة — الضغط على مقرر يفتح صفحة لا يستبدلها */
  const { run: veilRun, style: veilStyle, color: veilColor, reset: veilReset } = useToneVeil(rad.xl);

  useFocusEffect(useCallback(() => { veilReset(); }, [veilReset]));

  if (!gradeId) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.empty}>
          <Ionicons name="alert-circle-outline" size={48} color={c.text4} />
          <Text style={s.emptyTitle}>لم تُحدَّد المرحلة بعد</Text>
          <Text style={s.emptySub}>اختر مرحلة من لوحة العمل للبدء</Text>
          <Pressable onPress={() => router.replace('/')} style={s.emptyBtn} accessibilityRole="button">
            <LinearGradient colors={[c.primary, c.primaryHi]} style={s.emptyBtnGrad}>
              <Text style={s.emptyBtnText}>العودة للوحة</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const inTerm = subjectsForGrade(gradeId, term);
  const subjects = visibleSubjects(user, inTerm);
  const noneAssigned = !!user && user.role === 'teacher' && subjects.length === 0;

  /** المرحلة قد تكون من جلسة سابقة بعد أن غيّر المشرف الإسناد */
  const allowedGrades = visibleGrades(user, GRADES.map((g) => g.id) as GradeId[]);
  if (!allowedGrades.includes(gradeId)) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.empty}>
          <Ionicons name="lock-closed-outline" size={48} color={c.text4} />
          <Text style={s.emptyTitle}>هذه المرحلة غير مسندة إليك</Text>
          <Text style={s.emptySub}>راجع المشرف لإسناد الصفوف التي تدرّسها</Text>
          <Pressable
            onPress={() => { resetFlow(); router.replace('/' as never); }}
            style={s.emptyBtn}
            accessibilityRole="button"
          >
            <LinearGradient colors={[c.primary, c.primaryHi]} style={s.emptyBtnGrad}>
              <Text style={s.emptyBtnText}>العودة للوحة</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const tone = gradeTone(gradeId);
  const muted = heroInkMuted(tone);

  const pickSubject = (sid: SubjectId) => {
    veilRun(tone.deep, () => {
      setSubject(sid);
      router.push('/kind' as never);
    });
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: tone.chipBg }]} edges={['top']}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={require('@/assets/brand/bg-warm-mid.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(250,250,250,0.58)' }]} />
        <LinearGradient
          colors={[tone.vivid + '28', 'rgba(255,255,255,0)', tone.glow + '1F']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ===== Hero ===== */}
        <Animated.View
          entering={FadeIn.duration(600)}
          style={[s.hero, { shadowColor: tone.glow }, heroStyle]}
        >
          <LinearGradient
            colors={tone.hero}
            locations={[0, 0.56, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[tone.glow + '55', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={[s.heroRing, { borderColor: tone.onBase + '1F' }]} />

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
              <Text style={[s.heroEyebrow, { color: muted }]}>الخطوة ٢ · الفصل والمقرر</Text>
              <Text style={[s.heroTitle, { color: tone.onBase }]}>{gradeName(gradeId)}</Text>
              <Text style={[s.heroSub, { color: muted }]}>اختر الفصل ثم المقرر للتقييم</Text>
            </View>
          </View>
        </Animated.View>

        {/* ===== اسم المعلم (إذا لم يُحفظ) ===== */}
        {!teacherName && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(500)}
            style={[s.teacherBox, { borderColor: tone.base + '38' }]}
          >
            <LinearGradient
              colors={['#FFFFFF', tone.chipBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.teacherHead}>
              <View style={[s.teacherIc, { backgroundColor: tone.base }]}>
                <Ionicons name="person-outline" size={16} color={tone.onBase} />
              </View>
              <Text style={[s.teacherTitle, { color: tone.deep }]}>اسم المعلم</Text>
            </View>
            <Text style={s.teacherHint}>أدخل اسمك مرة واحدة — يُستخدم في جميع التقييمات</Text>
            <View style={s.teacherRow}>
              <TextInput
                value={teacherDraft}
                onChangeText={(v) => { setTeacherDraft(v); setTeacherMissing(false); }}
                placeholder="مثال: فاطمة الحربي"
                placeholderTextColor={c.text4}
                style={s.teacherInput}
              />
              <Pressable
                onPress={() => {
                  if (!teacherDraft.trim()) { setTeacherMissing(true); return; }
                  setTeacherName(teacherDraft.trim());
                }}
                style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                accessibilityRole="button"
              >
                <LinearGradient colors={[c.primary, c.primaryHi]} style={s.saveBtnGrad}>
                  <Text style={s.saveBtnText}>حفظ</Text>
                </LinearGradient>
              </Pressable>
            </View>
            {teacherMissing && <Text style={s.err}>أدخل اسم المعلم للمتابعة</Text>}
          </Animated.View>
        )}

        {/* ===== الفصول ===== */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <SectionHead title="اختر الفصل" tone={tone} />
          <View style={s.termRow}>
            {TERMS.map((t) => (
              <TermCard
                key={t.id}
                name={t.name}
                sub={t.id === 'term1' ? 'الفصل الأول' : 'الفصل الثاني'}
                on={term === t.id}
                tone={tone}
                onPress={() => setTerm(t.id)}
              />
            ))}
          </View>
        </Animated.View>

        {/* ===== المقررات ===== */}
        <Animated.View key={term} entering={FadeInDown.delay(80).duration(380)}>
          <SectionHead
            title={`المقررات · ${term === 'term1' ? 'الفصل الأول' : 'الفصل الثاني'}`}
            tone={tone}
          />
          {subjects.length === 0 ? (
            <View style={s.emptyAssigned}>
              <Ionicons name="information-circle-outline" size={28} color={c.text4} />
              <Text style={s.assignedText}>
                {noneAssigned ? 'لا توجد مقررات مُسندة لك في هذه المرحلة.' : 'لا توجد مقررات في هذا الفصل.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: sp.sm }}>
              {subjects.map((sid, i) => {
                const st = subjectTone(sid);
                return (
                  <Animated.View
                    key={sid}
                    entering={FadeInDown.delay(80 + i * 60).duration(420)}
                    style={[s.subjectCard, { shadowColor: st.ink }]}
                  >
                    <Pressable
                      onPress={() => pickSubject(sid)}
                      style={s.subjectCardInner}
                      accessibilityRole="button"
                      accessibilityLabel={`${subjectName(sid)} — جاهز للتقييم`}
                    >
                      <LinearGradient
                        colors={[st.ink + '14', 'rgba(255,255,255,0)']}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient colors={[st.base, st.ink]} style={s.subjectAccent} />
                      <View style={[s.subjectIc, { backgroundColor: st.tint, borderColor: st.ink + '22' }]}>
                        <Ionicons name="book-outline" size={18} color={st.ink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.subjectName}>{subjectName(sid)}</Text>
                        <Text style={s.subjectMeta}>جاهز للتقييم</Text>
                      </View>
                      <View style={[s.subjectArrow, { backgroundColor: st.tint, borderColor: st.ink + '1A' }]}>
                        <Ionicons name="chevron-back" size={16} color={st.ink} />
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ===== CTA ===== */}
        <Animated.View
          entering={FadeInDown.delay(420).duration(500)}
          style={[s.ctaBanner, { shadowColor: tone.glow }]}
        >
          <LinearGradient
            colors={tone.hero}
            locations={[0, 0.56, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[tone.glow + '40', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.ctaBannerContent}>
            <Text style={[s.ctaBannerTitle, { color: tone.onBase }]}>جاهز؟</Text>
            <Text style={[s.ctaBannerSub, { color: muted }]}>اختر مقرراً أعلاه للبدء في التقييم</Text>
          </View>
          <View pointerEvents="none" style={[s.ctaChevron, { borderColor: tone.onBase + '2A' }]}>
            <Ionicons name="arrow-back" size={18} color={tone.onBase} />
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: veilColor, zIndex: 40 }, veilStyle]}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  scroll: { ...contentColumn, padding: sp.md, paddingBottom: sp.huge, gap: sp.md },

  /* Hero — تدرّج مشبع وهالات ملوّنة */
  hero: {
    height: 192, borderRadius: rad.xl, overflow: 'hidden', marginBottom: sp.sm,
    shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.38, shadowRadius: 30, elevation: 12,
  },
  heroGloss: {
    position: 'absolute', width: 140, height: 320, top: -70, left: 38,
    transform: [{ rotate: '18deg' }],
  },
  heroRing: {
    position: 'absolute', width: 176, height: 176, borderRadius: 88,
    borderWidth: 1.5, bottom: -82, right: -44,
  },
  heroContent: { flex: 1, padding: sp.lg, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'flex-start', marginBottom: sp.sm },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, letterSpacing: 0.5 },
  heroTitle: { fontFamily: fnt.bk, fontSize: fs.xl, letterSpacing: -0.5, marginTop: 2 },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, marginTop: 2 },

  /* عنوان القسم مع شريط لوني */
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    marginTop: sp.sm, marginBottom: sp.sm, paddingHorizontal: 2,
  },
  sectionMark: { width: 5, height: 20, borderRadius: 3 },
  sectionTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },

  /* Teacher box */
  teacherBox: {
    backgroundColor: c.accentBg, borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.accentLine, padding: sp.lg, gap: sp.sm,
    overflow: 'hidden',
  },
  teacherHead: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  teacherIc: { width: 32, height: 32, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center' },
  teacherTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
  teacherHint: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text2 },
  teacherRow: { flexDirection: 'row', gap: sp.sm, alignItems: 'center' },
  teacherInput: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.sm, borderWidth: 1, borderColor: c.line, paddingHorizontal: sp.md, height: 44, fontFamily: fnt.m, fontSize: fs.sm, color: c.text, textAlign: 'right' },
  saveBtn: { borderRadius: rad.sm, overflow: 'hidden' },
  saveBtnGrad: { paddingHorizontal: sp.lg, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: fnt.b, fontSize: fs.xs, color: c.onPrimary },
  err: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.errText },

  /* Term cards — تدرّج عند التحديد وظل عائم */
  termRow: { flexDirection: 'row', gap: sp.sm },
  termChip: {
    flex: 1, borderRadius: rad.lg, backgroundColor: c.tileBg,
    shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 9, elevation: 3,
  },
  termInner: {
    paddingVertical: sp.md, paddingHorizontal: sp.md, borderRadius: rad.lg,
    gap: 2, borderWidth: 1.5, overflow: 'hidden', backgroundColor: c.tileBg,
  },
  termOrb: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
    top: -26, left: -18, opacity: 0.42,
  },
  termSheen: {
    position: 'absolute', width: 34, height: 180, top: -40, left: 34,
    opacity: 0.8, transform: [{ rotate: '20deg' }],
  },
  termText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text, flex: 1 },
  termTop: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
  termSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  termIc: { width: 28, height: 28, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center' },
  termSub: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3 },
  termCheck: {
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  /* Subject cards — عمود رأسي بظل ملوّن */
  subjectCard: {
    borderRadius: rad.lg, backgroundColor: c.tileBg, elevation: 5,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  subjectCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    padding: sp.md, borderRadius: rad.lg,
  },
  subjectAccent: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, borderTopRightRadius: rad.lg, borderBottomRightRadius: rad.lg },
  subjectIc: {
    width: 42, height: 42, borderRadius: rad.md, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', borderWidth: 1,
  },
  subjectName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  subjectMeta: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 1 },
  subjectArrow: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyAssigned: { backgroundColor: c.tileBg, borderRadius: rad.lg, borderWidth: 1, borderColor: c.line, padding: sp.lg, alignItems: 'center', gap: sp.sm },
  assignedText: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text2, lineHeight: 21, textAlign: 'center' },

  /* CTA banner — لون المرحلة وتوهج */
  ctaBanner: {
    height: 112, borderRadius: rad.xl, overflow: 'hidden', marginTop: sp.sm,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 22, elevation: 8,
  },
  ctaBannerContent: { flex: 1, padding: sp.lg, justifyContent: 'center', gap: 4 },
  ctaBannerTitle: { fontFamily: fnt.bk, fontSize: fs.lg },
  ctaBannerSub: { fontFamily: fnt.r, fontSize: fs.xs },
  ctaChevron: {
    position: 'absolute', width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    top: 37, left: sp.lg,
  },

  /* Empty state */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sp.md, padding: sp.xl },
  emptyTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text2 },
  emptySub: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3, textAlign: 'center' },
  emptyBtn: { marginTop: sp.sm, borderRadius: rad.md, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: sp.xl, paddingVertical: sp.md, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.onPrimary },
});

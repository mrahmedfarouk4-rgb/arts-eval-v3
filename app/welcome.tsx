import { LiftPressable, useFloatStyle } from '@/components/motion';
import { c, fnt, fs, ORG, rad, sp } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import { CRITERIA_COUNT } from '@/constants/criteria';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView, Platform,
    Pressable, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const HERO_BG = require('@/assets/brand/bg-school-gate.jpg');
const AFAQ_LOGO = require('@/assets/brand/afaq-logo.png');
const MOC_LOGO = require('@/assets/brand/moc-logo.png');

const ar = (n: number | string) =>
  String(n ?? '').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

/**
 * شاشة الدخول — بخلفية هيرو (Hero) بصورة الأكاديمية مع ستارة تدرج فوقها.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { login, skip, loginError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);

  /** البطاقة تطفو بهدوء، وتستقرّ فوراً حين يبدأ المستخدم بالكتابة */
  const floatStyle = useFloatStyle({ amplitude: 4, duration: 7000, enabled: !typing });

  const onLogin = async () => {
    setError('');
    if (!username.trim()) return setError('أدخل اسم المستخدم');
    if (!password) return setError('أدخل كلمة المرور');
    setBusy(true);
    try {
      const r = await login(username.trim(), password);
      if (r.ok) router.replace('/(tabs)');
      else setError(r.reason ? loginError(r.reason) : 'تعذّر تسجيل الدخول');
    } catch (e) {
      setError(e instanceof Error ? `تعذّر الاتصال: ${e.message}` : 'تعذّر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  /** ضغطة الزائر ← نماذج الاستمارات المطبوعة */
  const onGuest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await skip();
      router.replace('/samples' as never);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      {/* صورة الخلفية ── هيرو (داخل غلاف قصّ لتجنب توسيع الصفحة) */}
      <View style={s.heroWrap}>
        <Image source={HERO_BG} style={s.hero} resizeMode="cover" />
      </View>

      {/* ستارة تدرج فوق الصورة لضمان تباين النص */}
      <LinearGradient
        colors={[c.heroVeilTop, c.heroVeilBottom]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* الشريط العلوي — شعار الأكاديمية + وزارة الثقافة */}
            <View style={s.topBar}>
              <View style={s.logoRow}>
                <Image source={AFAQ_LOGO} style={s.topLogo} resizeMode="contain" />
                <View style={s.logoSep} />
                <Image source={MOC_LOGO} style={s.topLogo} resizeMode="contain" />
              </View>
            </View>

            {/* العنوان */}
            <Animated.View entering={FadeInDown.duration(600)} style={s.titleWrap}>
              <Text style={s.title}>{ORG.appTitle}</Text>
              <View style={s.underline} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.sub}>{ORG.appSub}</Animated.Text>

            {/* شريط إحصاء سريع */}
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={s.stats}>
              <Stat value={ar(4)} label="مراحل دراسية" />
              <Stat value={ar(7)} label="مقررات فنية" />
              <Stat value={ar(CRITERIA_COUNT)} label="بند تقييم" />
            </Animated.View>

            {/* بطاقة الدخول */}
            <Animated.View
              entering={FadeInDown.delay(250).duration(700)}
              style={[s.card, floatStyle]}
            >
              {/* الشعار في أعلى البطاقة — على نمط بوابة وزارة الثقافة */}
              <View style={s.cardLogos}>
                <Image source={AFAQ_LOGO} style={s.cardLogo} resizeMode="contain" />
                <View style={s.cardLogoSep} />
                <Image source={MOC_LOGO} style={s.cardLogo} resizeMode="contain" />
              </View>

              <Text style={s.cardTitle}>تسجيل الدخول</Text>
              <Text style={s.cardHint}>
                المشرف يدخل باسمه، وكل معلم باسمه وكلمة سره الخاصة
              </Text>

              <View style={s.form}>
                <View style={s.field}>
                  <Ionicons name="person-outline" size={16} color={c.text4} />
                  <TextInput
                    value={username}
                    onChangeText={(v) => { setUsername(v); setError(''); }}
                    placeholder="اسم المستخدم"
                    placeholderTextColor={c.text4}
                    style={s.input}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onFocus={() => setTyping(true)}
                    onBlur={() => setTyping(false)}
                  />
                </View>

                <View style={s.field}>
                  <Ionicons name="key-outline" size={16} color={c.text4} />
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    placeholder="•••••"
                    placeholderTextColor={c.text4}
                    style={s.input}
                    secureTextEntry={!showPass}
                    returnKeyType="go"
                    onSubmitEditing={onLogin}
                    onFocus={() => setTyping(true)}
                    onBlur={() => setTyping(false)}
                  />
                  <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10}>
                    <Ionicons
                      name={showPass ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={c.text4}
                    />
                  </Pressable>
                </View>

                {!!error && <Text style={s.err}>{error}</Text>}

                <LiftPressable
                  onPress={onLogin}
                  disabled={busy}
                  lift={1.5}
                  hoverScale={1.012}
                  pressScale={0.97}
                  accessibilityLabel="دخول"
                  accessibilityState={{ disabled: busy, busy }}
                >
                  <LinearGradient
                    colors={[c.primary, c.primaryHi]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cta}
                  >
                    <Text style={s.ctaText}>{busy ? 'جارٍ…' : 'دخول'}</Text>
                    <Ionicons name="arrow-back" size={17} color={c.onPrimary} />
                  </LinearGradient>
                </LiftPressable>

                <LiftPressable
                  onPress={onGuest}
                  disabled={busy}
                  lift={0}
                  hoverScale={1.01}
                  pressScale={0.97}
                  style={s.ghost}
                  accessibilityLabel="الدخول كضيف"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={s.ghostText}>الدخول كضيف</Text>
                  <Ionicons name="arrow-back" size={16} color={c.primary} />
                </LiftPressable>

                <Text style={s.guestHint}>
                  الدخول كضيف يعرض نماذج التقييمات المطبوعة فقط.
                </Text>
              </View>
            </Animated.View>

            <Text style={s.foot}>{ORG.academy}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/* ================================================================== */

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    ...contentColumn,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp.xl,
    paddingVertical: sp.xl,
    gap: sp.md,
  },

  /* ── هيرو ── */
  heroWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  hero: { width: '100%', height: '100%' },

  /* ── شريط علوي ── */
  topBar: { paddingHorizontal: sp.lg, paddingTop: sp.md, paddingBottom: sp.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  topLogo: { height: 36, width: 52 },
  logoSep: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.3)' },

  /* ── عنوان ── */
  titleWrap: { alignItems: 'center', marginTop: sp.lg },
  title: { fontFamily: fnt.b, fontSize: fs.xl, color: '#FFFFFF', textAlign: 'center' },
  underline: {
    width: 110, height: 3, borderRadius: 2,
    backgroundColor: c.gold, marginTop: 6,
  },
  sub: {
    fontFamily: fnt.r, fontSize: fs.sm,
    color: 'rgba(255,255,255,0.85)', textAlign: 'center',
  },

  /* ── إحصاء ── */
  stats: { flexDirection: 'row', gap: sp.sm, alignSelf: 'stretch', marginTop: sp.sm },
  stat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: rad.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: sp.sm, alignItems: 'center',
  },
  statValue: { fontFamily: fnt.bk, fontSize: fs.lg, color: '#FFFFFF' },
  statLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  /* ── بطاقة الدخول ── */
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: '#E8E4DF',
    padding: sp.xl,
    marginTop: sp.md,
    shadowColor: '#004645',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 6,
  },
  cardTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: '#004645', textAlign: 'center' },
  cardHint: {
    fontFamily: fnt.r, fontSize: fs.xxs, color: '#5D524A',
    textAlign: 'center', marginBottom: sp.md, lineHeight: 1.5,
  },

  /* شعارات أعلى البطاقة */
  cardLogos: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: sp.md, marginBottom: sp.md,
  },
  cardLogo: { height: 34, width: 49 },
  cardLogoSep: { width: 1, height: 26, backgroundColor: '#E8E4DF' },

  /* ── النموذج ── */
  form: { gap: sp.md },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: rad.pill,
    borderWidth: 2, borderColor: '#E8E4DF',
    paddingHorizontal: sp.md, height: 50,
  },
  input: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.md,
    color: '#2D2623', textAlign: 'right',
  },

  seedHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0, 70, 69, 0.06)',
    borderRadius: rad.sm,
    paddingHorizontal: sp.md, paddingVertical: 7,
  },
  seedHintText: { flex: 1, fontFamily: fnt.m, fontSize: 9.5, color: '#004645', lineHeight: 15 },

  err: { fontFamily: fnt.m, fontSize: fs.xs, color: '#C03944', textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, borderRadius: rad.pill, paddingVertical: 14, paddingHorizontal: sp.xl,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  ctaText: { fontFamily: fnt.b, fontSize: fs.md, color: '#FFFFFF' },

  ghost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, backgroundColor: '#FAF8F5',
    borderWidth: 1, borderColor: '#E8E4DF',
    borderRadius: rad.pill, paddingVertical: 13,
  },
  ghostText: { fontFamily: fnt.m, fontSize: fs.sm, color: '#004645' },

  guestHint: {
    fontFamily: fnt.r, fontSize: fs.xxs,
    color: '#8B7E6B', textAlign: 'center', lineHeight: 1.5,
  },

  foot: {
    fontFamily: fnt.r, fontSize: fs.xxs,
    color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: sp.md,
  },
});

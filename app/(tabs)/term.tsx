import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  TERMS,
  subjectsForGrade, gradeName, subjectName,
  type SubjectId,
} from '@/constants/criteria';
import { c, sp, rad, fnt, fs, gradeTone, subjectTone } from '@/constants/brand';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { visibleSubjects } from '@/lib/accounts';

/**
 * حجاب عمق فوق لون المرحلة. الطرفان معاً خفيفان بما يكفي ليبقى
 * tone.onBase مقروءاً على الفاتح والغامق من اللوحة.
 */
const VEIL = ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.10)'] as const;

export default function TermScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    gradeId, term, setTerm, setSubject,
    teacherName, setTeacherName } = useSession();

  const [teacherDraft, setTeacherDraft] = useState(teacherName ?? '');
  const [teacherMissing, setTeacherMissing] = useState(false);

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

  const pickSubject = (sid: SubjectId) => {
    setSubject(sid);
    router.push('/kind' as never);
  };

  const tone = gradeTone(gradeId);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={require('@/assets/brand/bg-warm-mid.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(250,250,250,0.80)' }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ===== Hero ===== */}
        <Animated.View entering={FadeIn.duration(600)} style={[s.hero, { backgroundColor: tone.base, shadowColor: tone.base }]}>
          <LinearGradient colors={VEIL} style={StyleSheet.absoluteFill} />
          <View style={s.heroContent}>
            <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: tone.onBase + '2E', borderColor: tone.onBase + '4D' }]} accessibilityRole="button" accessibilityLabel="رجوع">
              <Ionicons name="chevron-forward" size={20} color={tone.onBase} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroEyebrow, { color: tone.onBaseMuted }]}>الخطوة ٢ · الفصل والمقرر</Text>
              <Text style={[s.heroTitle, { color: tone.onBase }]}>{gradeName(gradeId)}</Text>
              <Text style={[s.heroSub, { color: tone.onBaseMuted }]}>اختر الفصل ثم المقرر للتقييم</Text>
            </View>
          </View>
        </Animated.View>

        {/* ===== اسم المعلم (إذا لم يُحفظ) ===== */}
        {!teacherName && (
          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={s.teacherBox}>
            <View style={s.teacherHead}>
              <View style={s.teacherIc}>
                <Ionicons name="person-outline" size={16} color={c.primary} />
              </View>
              <Text style={s.teacherTitle}>اسم المعلم</Text>
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
          <Text style={s.sectionTitle}>اختر الفصل</Text>
          <View style={s.termRow}>
            {TERMS.map((t, i) => {
              const on = term === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTerm(t.id)}
                  style={({ pressed }) => [s.termChip, { borderColor: tone.base }, on ? { backgroundColor: tone.base, shadowOpacity: 0.2, elevation: 3 } : { backgroundColor: tone.tint }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
                  accessibilityRole="button"
                >
                  <Text style={[s.termText, on && { color: tone.onBase }]}>{t.name}</Text>
                  <Text style={[s.termSub, on && { color: tone.onBaseMuted }]}>{t.id === 'term1' ? 'الفصل الأول' : 'الفصل الثاني'}</Text>
                  {on && (
                    <View style={[s.termCheck, { backgroundColor: tone.onBase + '33' }]}>
                      <Ionicons name="checkmark" size={12} color={tone.onBase} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ===== المقررات ===== */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <Text style={s.sectionTitle}>المقررات · {term === 'term1' ? 'الفصل الأول' : 'الفصل الثاني'}</Text>
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
                <Animated.View key={sid} entering={FadeInDown.delay(340 + i * 50).duration(450)}>
                  <Pressable
                    onPress={() => pickSubject(sid)}
                    style={({ pressed }) => [s.subjectCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
                    accessibilityRole="button"
                  >
                    <View style={[s.subjectAccent, { backgroundColor: st.base }]} />
                    <View style={[s.subjectIc, { backgroundColor: st.tint }]}>
                      <Ionicons name="book-outline" size={17} color={st.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.subjectName}>{subjectName(sid)}</Text>
                      <Text style={s.subjectMeta}>جاهز للتقييم</Text>
                    </View>
                    <View style={[s.subjectArrowLeft, { backgroundColor: st.tint }]}>
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
        <Animated.View entering={FadeInDown.delay(420).duration(500)} style={[s.ctaBanner, { backgroundColor: tone.base, shadowColor: tone.base }]}>
          <LinearGradient colors={VEIL} style={StyleSheet.absoluteFill} />
          <View style={s.ctaBannerContent}>
            <Text style={[s.ctaBannerTitle, { color: tone.onBase }]}>جاهز؟</Text>
            <Text style={[s.ctaBannerSub, { color: tone.onBaseMuted }]}>اختر مقرراً أعلاه للبدء في التقييم</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  scroll: { padding: sp.md, paddingBottom: sp.huge, gap: sp.md },

  /* Hero — لون المرحلة */
  hero: { height: 170, borderRadius: rad.xl, overflow: 'hidden', marginBottom: sp.xs,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 6 },
  heroContent: { flex: 1, padding: sp.lg, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: rad.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'flex-start', marginBottom: sp.sm },
  heroEyebrow: { fontFamily: fnt.m, fontSize: 10.5, letterSpacing: 0.5 },
  heroTitle: { fontFamily: fnt.bk, fontSize: fs.xl, letterSpacing: -0.5, marginTop: 2 },
  heroSub: { fontFamily: fnt.r, fontSize: fs.xs, marginTop: 2 },

  sectionTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.text, marginTop: sp.sm, marginBottom: 2, paddingHorizontal: 2 },

  /* Teacher box */
  teacherBox: { backgroundColor: c.accentBg, borderRadius: rad.lg, borderWidth: 1, borderColor: c.accentLine, padding: sp.lg, gap: sp.sm },
  teacherHead: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  teacherIc: { width: 32, height: 32, borderRadius: rad.sm, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' },
  teacherTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
  teacherHint: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text2 },
  teacherRow: { flexDirection: 'row', gap: sp.sm, alignItems: 'center' },
  teacherInput: { flex: 1, backgroundColor: c.tileBg, borderRadius: rad.sm, borderWidth: 1, borderColor: c.line, paddingHorizontal: sp.md, height: 44, fontFamily: fnt.m, fontSize: fs.sm, color: c.text, textAlign: 'right' },
  saveBtn: { borderRadius: rad.sm, overflow: 'hidden' },
  saveBtnGrad: { paddingHorizontal: sp.lg, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: fnt.b, fontSize: fs.xs, color: c.onPrimary },
  err: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.errText },

  /* Term chips */
  termRow: { flexDirection: 'row', gap: sp.sm },
  termChip: { flex: 1, paddingVertical: sp.md, paddingHorizontal: sp.md, borderRadius: rad.lg, gap: 2, borderWidth: 1,
    shadowColor: c.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  termText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  termSub: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3 },
  termCheck: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  /* Subject cards — بيضاء بشريط بلون المقرر */
  subjectCard: { flexDirection: 'row', alignItems: 'center', gap: sp.md, borderRadius: rad.lg, padding: sp.md, overflow: 'hidden',
    backgroundColor: c.tileBg, borderWidth: 1, borderColor: c.line,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  subjectAccent: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, borderTopRightRadius: rad.lg, borderBottomRightRadius: rad.lg },
  subjectIc: { width: 40, height: 40, borderRadius: rad.md, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  subjectMeta: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 1 },
  subjectArrowLeft: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  emptyAssigned: { backgroundColor: c.tileBg, borderRadius: rad.lg, borderWidth: 1, borderColor: c.line, padding: sp.lg, alignItems: 'center', gap: sp.sm },
  assignedText: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text2, lineHeight: 21, textAlign: 'center' },

  /* CTA banner — لون المرحلة */
  ctaBanner: { height: 110, borderRadius: rad.xl, overflow: 'hidden', marginTop: sp.sm,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 5 },
  ctaBannerContent: { flex: 1, padding: sp.lg, justifyContent: 'center', gap: 4 },
  ctaBannerTitle: { fontFamily: fnt.bk, fontSize: fs.lg },
  ctaBannerSub: { fontFamily: fnt.r, fontSize: fs.xs },

  /* Empty state */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sp.md, padding: sp.xl },
  emptyTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text2 },
  emptySub: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3, textAlign: 'center' },
  emptyBtn: { marginTop: sp.sm, borderRadius: rad.md, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: sp.xl, paddingVertical: sp.md, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.onPrimary },
});
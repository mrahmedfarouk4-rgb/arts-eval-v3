import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { c, sp, rad, fnt, fs, lh } from '@/constants/brand';
import { Button } from '@/components/pro-ui';
import { sampleForms, sampleHeaderLabel } from '@/lib/samples';
import { SamplePaper, FIT_W, FIT_H, PAPER_W, PAPER_H } from '@/components/sample-paper';

/**
 * نماذج الاستمارات المطبوعة — وجهة «الدخول كضيف».
 * ---------------------------------------------------------------------------
 * الغرض: من لا يملك حساباً يرى ما سيحصل عليه. النموذج المعروض هنا
 * مبنيٌّ بنفس الدالة التي تبني ورقة المعلم (`buildPrintHtml`) فليس
 * تصويراً توضيحياً — هو الكليشة نفسها.
 *
 * نحسب HTML مرة واحدة عند الإقلاع لا عند كل رسم، لأن كل نموذج فيه
 * خط سكال مجلّة مضمّن (≈٩٤ كيلوبايت) ومSERّ التكلفة.
 */

export default function SamplesScreen() {
  const router = useRouter();
  const forms = useMemo(() => sampleForms(), []);
  const [active, setActive] = useState(forms[0]?.key ?? '');
  const [full, setFull] = useState(false);
  const isWeb = Platform.OS === 'web';

  const form = forms.find((f) => f.key === active) ?? forms[0];
  if (!form) return null;

  const others = forms.filter((f) => f.key !== form.key);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* الترويسة */}
      <View style={s.head}>
        <Pressable
          onPress={() => (isWeb ? router.back() : router.replace('/welcome' as never))}
          hitSlop={12}
          accessibilityLabel="رجوع"
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={s.title}>نماذج التقييم المطبوعة</Text>
          <Text style={s.sub} numberOfLines={1}>
            هذه ما يُطبع فعلياً — الكليشة نفسها
          </Text>
        </View>

        <Pressable
          onPress={() => setFull((v) => !v)}
          style={({ pressed }) => [s.zoomBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={full ? 'تصغير النموذج' : 'تكبير النموذج'}
        >
          <Ionicons
            name={full ? 'contract-outline' : 'search-outline'}
            size={16}
            color={c.primary}
          />
          <Text style={s.zoomText}>{full ? 'ملء' : 'تكبير'}</Text>
        </Pressable>
      </View>

      {/* وصف النموذج */}
      <View style={s.metaBar}>
        <Text style={s.formTitle}>{form.title}</Text>
        <Text style={s.formSub}>{form.subtitle}</Text>
        <View style={s.tagRow}>
          <Tag label={`رأس عمود البنود: ${sampleHeaderLabel(form.key)}`} />
          <Tag label="مقاس A4 · ٢١٠ × ٢٩٧ مم" />
        </View>
        <Text style={s.when}>{form.when}</Text>
      </View>

      {/* الورقة */}
      <ScrollView
        style={s.viewer}
        contentContainerStyle={s.viewerInner}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal={!full}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={full ? s.paperFull : s.paperFit}
        >
          {/*
            الحاوية بأبعاد **البكسل** لا المليمتر، لأن نسخة الويب
            تحتاج بكسلاً الحقيقي ونسخة الجوال تحتاج ملّيمتر. والـ
            iframe يأخذ ١٠٠٪ من الحاوية فن馅له الحاوية تتحكم.
          */}
          <View
            style={
              isWeb
                ? { width: full ? 794 : 334, height: full ? 1123 : 472 }
                : full
                  ? s.slotFull
                  : s.slotFit
            }
          >
            <SamplePaper html={form.html} full={full} isWeb={isWeb} />
          </View>
        </ScrollView>
      </ScrollView>

      {/* نماذج أخرى */}
      {others.length > 0 && (
        <View style={s.others}>
          <Text style={s.othersLabel}>نماذج أخرى</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.othersRow}>
              {others.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => {
                    setActive(f.key);
                    setFull(false);
                  }}
                  style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
                  accessibilityRole="button"
                >
                  <Text style={s.chipText} numberOfLines={1}>
                    {f.title}
                  </Text>
                  <Text style={s.chipSub} numberOfLines={1}>
                    {f.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={s.foot}>
        <Text style={s.footText}>
          هذه النماذج أمثلة مبيانات تحتاجة. لطباعة استمارة باسم طالبك، سجّل الدخول.
        </Text>
        <Button
          label="سجّل الدخول"
          size="sm"
          icon="log-in-outline"
          onPress={() => router.replace('/welcome' as never)}
          style={{ marginTop: sp.xs }}
        />
      </View>
    </SafeAreaView>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={s.tag}>
      <Text style={s.tagText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  head: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    backgroundColor: c.bgAlt, borderBottomWidth: 1, borderBottomColor: c.line,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: rad.sm,
    backgroundColor: c.bgLift, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  sub: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 1 },
  zoomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg,
  },
  zoomText: { fontFamily: fnt.b, fontSize: fs.xs, color: c.primary },

  metaBar: { paddingHorizontal: sp.lg, paddingTop: sp.md, paddingBottom: sp.sm, gap: 4 },
  formTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text2 },
  formSub: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3 },
  tagRow: { flexDirection: 'row', gap: sp.xs, marginTop: sp.xs, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: sp.sm, paddingVertical: 3,
    borderRadius: rad.sm, backgroundColor: c.primaryBg,
  },
  tagText: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.primary },
  when: {
    fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3,
    marginTop: sp.xs, lineHeight: lh.snug,
  },

  viewer: { flex: 1 },
  viewerInner: { alignItems: 'center', justifyContent: 'center', padding: sp.md },
  paperFit: { alignItems: 'center', justifyContent: 'center' },
  paperFull: { alignItems: 'center', justifyContent: 'center' },

  /**
   * `transform` لا يغيّر التخطيط في React Native، فتبقى منطقة
   * فارغة بحجم الورقة الكاملة. لذا الحاوية بأبعاد ما بعد التصغير.
   */
  slotFit: { width: FIT_W, height: FIT_H },
  slotFull: { width: PAPER_W, height: PAPER_H },

  others: {
    paddingHorizontal: sp.lg, paddingTop: sp.sm,
    borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bgAlt,
  },
  othersLabel: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.text3, marginBottom: sp.xs },
  othersRow: { flexDirection: 'row', gap: sp.sm, paddingBottom: sp.md },
  chip: {
    width: 160,
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg,
  },
  chipText: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text2 },
  chipSub: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 1 },

  foot: {
    alignItems: 'center',
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bgAlt,
  },
  footText: {
    fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3,
    textAlign: 'center', lineHeight: lh.snug,
  },
});
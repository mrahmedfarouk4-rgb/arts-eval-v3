import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { c, sp, rad, fnt, fs, sh, ORG, BRAND } from '@/constants/brand';
import { Button, Section } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { CRITERIA_BLOCKS } from '@/constants/criteria.data';
import { EVAL_KINDS, APP } from '@/constants/criteria';

const LOGO = require('@/assets/brand/logo-horizontal.png');
const EMBLEM = require('@/assets/brand/logo-emblem.png');

export default function InfoScreen() {
  const router = useRouter();
  const { editMode, teacherName } = useSession();
  const { user, authenticated, logout } = useAuth();

  const criteriaCount = CRITERIA_BLOCKS.reduce(
    (n, b) =>
      n + (['weekly', 'periodic', 'final'] as const).reduce(
        (m, k) => m + Object.values(b[k]).flat().length,
        0
      ),
    0
  );

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#E8EEF4', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* الترويسة */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={20} color={c.text} />
          </Pressable>
          <Text style={s.headerTitle}>عن المنصة</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* الشعار */}
          <View style={s.logoBox}>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
          </View>
          <View style={{ alignItems: 'center', gap: 3 }}>
            <Text style={s.title}>{BRAND.academy}</Text>
            <Text style={s.titleEn}>{BRAND.academyEn}</Text>
          </View>

          {/* رابط المنصة */}
          <Pressable
            onPress={() => Linking.openURL(ORG.portal)}
            style={s.portalRow}
            accessibilityRole="link"
          >
            <View style={s.portalIcon}>
              <Ionicons name="globe" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.portalLabel}>المنصة الرسمية</Text>
              <Text style={s.portalUrl} numberOfLines={1}>
                {ORG.portal.replace('https://', '')}
              </Text>
            </View>
            <Ionicons name="open-outline" size={17} color={c.text3} />
          </Pressable>

          {/* الهوية */}
          <Section title="الهوية" hint="الشعار المعتمد للتطبيق">
            <View style={s.brandCard}>
              <View style={s.brandEmblemBox}>
                <Image source={EMBLEM} style={s.brandEmblem} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.brandName}>{BRAND.academy}</Text>
                <Text style={s.brandNameEn}>{BRAND.academyEn}</Text>
                <Text style={s.brandNote}>الشعار الرسمي حسب دليل الهوية</Text>
              </View>
            </View>
          </Section>

          {/* المحتوى */}
          <Section title="محتوى المنصة">
            <View style={s.statsRow}>
              <StatBox value={CRITERIA_BLOCKS.length} label="مجموعة بنود" />
              <StatBox value={criteriaCount} label="بند تقييم" />
              <StatBox value={EVAL_KINDS.length} label="نوع تقييم" />
            </View>
            <Text style={s.note}>
              بنود التقييم مستخرجة من وثيقة «آليات التقييم والتقويم لأنشطة الفنون
              البصرية» — متاحة داخل التطبيق بدون إنترنت.
            </Text>
          </Section>

          {/* المعلم */}
          <Section title="الجلسة">
            <Row icon="person-circle-outline" label="المعلم" value={teacherName ?? 'لم يُحدَّد'} />
            <Row
              icon={authenticated ? 'shield-checkmark-outline' : 'eye-outline'}
              label="الصلاحية"
              value={editMode ? 'وضع التعديل' : 'وضع العرض فقط'}
              color={editMode ? c.ok : undefined}
            />
            {!!user && (
              <Row icon="log-in-outline" label="المستخدم" value={user.username} />
            )}
          </Section>

          <View style={{ gap: sp.sm, marginTop: sp.sm }}>
            {authenticated && (
              <Button
                label="تسجيل الخروج"
                variant="ghost"
                icon="log-out-outline"
                onPress={() => { logout(); router.replace('/welcome'); }}
                full
              />
            )}
            <Button label="رجوع" variant="surface" onPress={() => router.back()} full />
          </View>

          <Text style={s.footer}>
            {APP.title} — {APP.subtitle}{'\n'}
            تصميم: {APP.author}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={18} color={c.text3} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: rad.sm,
    backgroundColor: c.bgAlt,
    borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text },

  scroll: { paddingHorizontal: sp.lg, paddingBottom: sp.huge, gap: sp.xl },

  logoBox: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: rad.xl,
    borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.xl,
    paddingVertical: sp.xl,
    ...sh.md,
  },
  logo: { width: 300, height: 89 },

  title: { fontFamily: fnt.eb, fontSize: fs.lg, color: c.text, textAlign: 'center' },
  titleEn: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text3, textAlign: 'center' },

  portalRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.line,
    padding: sp.md,
    ...sh.sm,
  },
  portalIcon: {
    width: 40, height: 40,
    borderRadius: rad.sm,
    backgroundColor: c.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  portalLabel: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  portalUrl: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },

  brandCard: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    padding: sp.md,
    ...sh.sm,
  },
  brandEmblemBox: {
    width: 52, height: 68,
    borderRadius: rad.sm,
    backgroundColor: c.bg,
    borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  brandEmblem: { width: 34, height: 52 },
  brandName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  brandNameEn: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.primary, marginTop: 2 },
  brandNote: { fontFamily: fnt.r, fontSize: 9.5, color: c.text4, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: sp.sm },
  statBox: {
    flex: 1,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md,
    alignItems: 'center',
  },
  statValue: { fontFamily: fnt.bk, fontSize: fs.xl, color: c.primary },
  statLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },

  note: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, lineHeight: 21, marginTop: sp.sm },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md,
    paddingVertical: sp.md,
    marginBottom: sp.xs,
  },
  rowLabel: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text3, flex: 1 },
  rowValue: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },

  footer: {
    fontFamily: fnt.r,
    fontSize: fs.xxs,
    color: c.text4,
    textAlign: 'center',
    marginTop: sp.lg,
    lineHeight: 18,
  },
});

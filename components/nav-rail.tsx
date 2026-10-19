import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, ScrollView, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { c, sp, rad, fnt, fs, sh, BRAND } from '@/constants/brand';
import { EMBLEM, HorizontalLogo } from '@/constants/logo';
import { useAuth } from '@/lib/auth';

const { width: W } = Dimensions.get('window');

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'التقييم', icon: 'clipboard-outline' },
  { href: '/students', label: 'الطلاب', icon: 'people-outline' },
  { href: '/records', label: 'السجل', icon: 'albums-outline' },
  { href: '/settings', label: 'الإعدادات', icon: 'options-outline' },
];

const RAIL_W = 72;
const RAIL_W_OPEN = Math.min(300, Math.round(W * 0.82));

/**
 * اتجاه الحاوية — مهم جداً.
 *
 * مع forceRTL تتحوّل left/right في React Native إلى خصائص منطقية
 * (start/end)، فيصبح right:0 يعني «اليسار» على أندرويد.
 * لذلك نثبّت الاتجاه صراحةً على كل حاوية. الويب لا يدعم هذه الخاصية
 * فنتجاهلها عليه (النتيجة هناك صحيحة بالترتيب الطبيعي).
 */
export const LTR = Platform.OS === 'web' ? {} : ({ direction: 'ltr' } as const);
export const RTL = Platform.OS === 'web' ? {} : ({ direction: 'rtl' } as const);

export { RAIL_W };

/* ================================================================== */
/*  الشريط الجانبي — يبقى ظاهراً دائماً على اليمين                    */
/* ================================================================== */

export function NavRail() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, authenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // إغلاق الدرج عند تغيير المسار
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname === '/(tabs)' : pathname.startsWith(href);

  const go = (href: string) => router.push(href as never);

  const onLogout = async () => {
    await logout();
    setOpen(false);
    router.replace('/welcome' as never);
  };

  return (
    <>
      {/* ---------- الشريط الضيّق الدائم ---------- */}
      <View
        style={[
          s.rail,
          { paddingTop: insets.top + sp.sm, paddingBottom: insets.bottom + sp.sm },
        ]}
      >
        {/* الشعار */}
        <Pressable
          onPress={() => go('/')}
          style={s.railLogo}
          accessibilityLabel="الصفحة الرئيسية"
        >
          <View style={s.emblemBox}>
            <EMBLEM style={s.emblemImg} resizeMode="contain" />
          </View>
        </Pressable>

        <View style={s.railRule} />

        {/* العناصر */}
        <View style={{ gap: sp.xxs }}>
          {NAV_ITEMS.map((item) => {
            const on = isActive(item.href);
            return (
              <Pressable
                key={item.href}
                onPress={() => go(item.href)}
                style={({ pressed }) => [s.railItem, on && s.railItemOn, pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
              >
                <View style={[s.railIconBox, on && s.railIconBoxOn]}>
                  <Ionicons
                    name={item.icon}
                    size={21}
                    color={on ? c.onPrimary : c.text3}
                  />
                </View>
                <Text style={[s.railLabel, on && s.railLabelOn]} numberOfLines={1}>
                  {item.label}
                </Text>
                {on && <View style={s.railTick} />}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* فتح الدرج */}
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [s.railMenu, pressed && { opacity: 0.7 }]}
          accessibilityLabel="القائمة"
        >
          <Ionicons name="menu" size={20} color={c.text2} />
        </Pressable>
      </View>

      {/* ---------- الدرج الموسّع ---------- */}
      {open && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={s.scrim} onPress={() => setOpen(false)} accessibilityLabel="إغلاق" />
          <View
            style={[
              s.drawer,
              { width: RAIL_W_OPEN, paddingTop: insets.top + sp.lg, paddingBottom: insets.bottom + sp.lg },
            ]}
          >
            <View style={s.drawerHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.drawerTitle}>القائمة</Text>
                <Text style={s.drawerSub} numberOfLines={1}>{BRAND.academy}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={s.drawerClose}>
                <Ionicons name="close" size={19} color={c.text2} />
              </Pressable>
            </View>

            <View style={s.drawerRule} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: sp.sm }}>
              {NAV_ITEMS.map((item, i) => {
                const on = isActive(item.href);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => go(item.href)}
                    style={({ pressed }) => [s.drawerItem, on && s.drawerItemOn, pressed && { opacity: 0.75 }]}
                    accessibilityRole="menuitem"
                  >
                    <View style={[s.drawerIcon, on && { backgroundColor: c.primaryBg }]}>
                      <Ionicons name={item.icon} size={19} color={on ? c.primary : c.text3} />
                    </View>
                    <Text style={[s.drawerLabel, on && { color: c.primary }]}>{item.label}</Text>
                    <Text style={s.drawerIdx}>{String(i + 1).padStart(2, '0')}</Text>
                  </Pressable>
                );
              })}

              <View style={s.drawerRule} />

              <Pressable
                onPress={() => { setOpen(false); router.push('/info' as never); }}
                style={({ pressed }) => [s.drawerItem, pressed && { opacity: 0.75 }]}
                accessibilityRole="menuitem"
              >
                <View style={s.drawerIcon}>
                  <Ionicons name="information-circle-outline" size={19} color={c.text3} />
                </View>
                <Text style={s.drawerLabel}>عن المنصة</Text>
              </Pressable>
              <Pressable
                onPress={() => { setOpen(false); router.push('/print' as never); }}
                style={({ pressed }) => [s.drawerItem, pressed && { opacity: 0.75 }]}
                accessibilityRole="menuitem"
              >
                <View style={s.drawerIcon}>
                  <Ionicons name="print-outline" size={19} color={c.text3} />
                </View>
                <Text style={s.drawerLabel}>الطباعة</Text>
              </Pressable>

              <View style={s.drawerRule} />

              {/* الخروج */}
              <Pressable
                onPress={onLogout}
                style={({ pressed }) => [s.drawerItem, s.drawerItemOut, pressed && { opacity: 0.75 }]}
                accessibilityRole="menuitem"
                accessibilityLabel="تسجيل الخروج"
              >
                <View style={[s.drawerIcon, { backgroundColor: c.errBg }]}>
                  <Ionicons name="log-out-outline" size={19} color={c.err} />
                </View>
                <Text style={[s.drawerLabel, { color: c.err, fontFamily: fnt.b }]}>
                  تسجيل الخروج
                </Text>
                <Ionicons name="chevron-back" size={15} color={c.text4} />
              </Pressable>
            </ScrollView>

            <View style={s.drawerFoot}>
              <View style={s.drawerUser}>
                <View style={[s.drawerIcon, { width: 30, height: 30 }]}>
                  <Ionicons
                    name={authenticated ? 'person-circle-outline' : 'person-outline'}
                    size={17}
                    color={c.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.drawerUserName} numberOfLines={1}>
                    {user?.username ?? 'ضيف'}
                  </Text>
                  <Text style={s.drawerUserRole}>
                    {authenticated ? 'معلّم مصادق' : 'وضع الضيف'}
                  </Text>
                </View>
              </View>
              <HorizontalLogo style={s.drawerLogo} resizeMode="contain" />
            </View>
          </View>
        </View>
      )}
    </>
  );
}

/* ================================================================== */

const s = StyleSheet.create({
  /* الشريط الدائم */
  rail: {
    width: RAIL_W,
    ...RTL,
    backgroundColor: c.tileBg,
    borderLeftWidth: 1,
    borderLeftColor: c.tileBorder,
    paddingHorizontal: sp.xs,
    alignItems: 'center',
    zIndex: 20,
  },
  railLogo: { padding: sp.xxs },
  emblemBox: {
    width: 40, height: 50,
    borderRadius: rad.sm,
    backgroundColor: c.bg,
    borderWidth: 1, borderColor: c.tileBorder,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  emblemImg: { width: 28, height: 42 },
  railRule: {
    width: 30, height: 1,
    backgroundColor: c.line,
    marginVertical: sp.md,
  },

  railItem: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: sp.xs,
    borderRadius: rad.md,
  },
  railItemOn: { backgroundColor: c.tileTint },
  railIconBox: {
    width: 40, height: 32,
    borderRadius: rad.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  railIconBoxOn: { backgroundColor: c.railActive },
  railLabel: { fontFamily: fnt.m, fontSize: 9, color: c.text3 },
  railLabelOn: { fontFamily: fnt.b, color: c.primary },
  /** خطّ ذهبيّ تحت الأيقونة النشطة — كشريط التبويب في التصميم د */
  railTick: {
    width: 18, height: 2.5, borderRadius: 2,
    backgroundColor: c.gold, marginTop: 2,
  },

  railMenu: {
    width: 44, height: 38,
    borderRadius: rad.sm,
    borderWidth: 1, borderColor: c.line,
    backgroundColor: c.bg,
    alignItems: 'center', justifyContent: 'center',
  },

  /* الدرج — scrim بـ ltr فيبقى right:0 فيزيائياً على اليمين */
  scrim: {
    ...StyleSheet.absoluteFillObject,
    ...LTR,
    backgroundColor: c.scrim,
    zIndex: 40,
  },
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    ...RTL,
    backgroundColor: c.tileBg,
    borderLeftWidth: 1,
    borderLeftColor: c.tileBorder,
    paddingHorizontal: sp.lg,
    zIndex: 41,
    ...sh.lg,
  },
  drawerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
  drawerTitle: { fontFamily: fnt.eb, fontSize: fs.xl, color: c.text },
  drawerSub: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },
  drawerClose: {
    width: 34, height: 34, borderRadius: rad.sm,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerRule: { height: 1, backgroundColor: c.line, marginVertical: sp.md },

  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingVertical: sp.md, paddingHorizontal: sp.sm,
    borderRadius: rad.md,
    marginBottom: 2,
  },
  drawerItemOn: { backgroundColor: c.primaryBg },
  drawerItemOut: { backgroundColor: c.errBg },
  drawerIcon: {
    width: 34, height: 34, borderRadius: rad.sm,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerLabel: { flex: 1, fontFamily: fnt.m, fontSize: fs.sm, color: c.text2 },
  drawerIdx: { fontFamily: fnt.eb, fontSize: fs.xs, color: c.text4 },

  drawerFoot: {
    alignItems: 'center',
    paddingTop: sp.md,
    marginTop: sp.sm,
    borderTopWidth: 1, borderTopColor: c.line,
  },
  drawerUser: {
    alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bg,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.sm, paddingVertical: sp.sm,
    marginBottom: sp.md,
  },
  drawerUserName: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text },
  drawerUserRole: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 1 },
  drawerLogo: { width: 180, height: 53 },
});
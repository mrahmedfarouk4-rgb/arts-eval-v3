import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Animated, Easing, BackHandler, useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { c, sp, rad, fnt, fs, sh, BRAND } from '@/constants/brand';
import { EMBLEM, HorizontalLogo } from '@/constants/logo';
import { useAuth } from '@/lib/auth';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'التقييم', icon: 'clipboard-outline' },
  { href: '/students', label: 'الطلاب', icon: 'people-outline' },
  { href: '/records', label: 'السجل', icon: 'albums-outline' },
  { href: '/six-weeks', label: '٦ أسابيع', icon: 'document-text-outline' },
  { href: '/settings', label: 'الإعدادات', icon: 'options-outline' },
];

const RAIL_W = 72;
/** أقصى عرض للدرج — العرض الفعلي يُحسب من أبعاد النافذة وقت العرض */
const DRAWER_MAX_W = 320;
const NATIVE_DRIVER = Platform.OS !== 'web';
/** العتمة تتلاشى، فلا بد من مكوّن متحرّك — opacity في Pressable عادي تُتجاهل */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

/** العنصر النشط — الرئيسية تلتقط مسار المجموعة أيضاً */
const isActiveHref = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' || pathname === '/(tabs)' : pathname.startsWith(href);

/* ================================================================== */
/*  حالة الدرج                                                        */
/* ================================================================== */

interface DrawerApi {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerCtx = createContext<DrawerApi | null>(null);

/**
 * يغلّف تخطيط التبويبات. يجب أن يُركّب `NavDrawer` داخل نفس الحاوية
 * التي يغلّفها، وإلا عاد الدرج محصوراً في عمود الشريط الضيّق.
 */
export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // تغيير المسار إغلاقٌ للدرج
  useEffect(() => { setOpen(false); }, [pathname]);

  const value = useMemo<DrawerApi>(
    () => ({ open, openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) }),
    [open],
  );

  return <DrawerCtx.Provider value={value}>{children}</DrawerCtx.Provider>;
}

function useDrawer(): DrawerApi {
  const ctx = useContext(DrawerCtx);
  if (!ctx) throw new Error('الدرج يحتاج NavDrawerProvider');
  return ctx;
}

/* ================================================================== */
/*  الشريط الجانبي — يبقى ظاهراً دائماً على اليمين                    */
/* ================================================================== */

export function NavRail() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();

  const isActive = (href: string) => isActiveHref(pathname, href);

  const go = (href: string) => router.push(href as never);

  return (
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
        onPress={openDrawer}
        style={({ pressed }) => [s.railMenu, pressed && { opacity: 0.7 }]}
        accessibilityLabel="القائمة"
      >
        <Ionicons name="menu" size={20} color={c.text2} />
      </Pressable>
    </View>
  );
}

/* ================================================================== */
/*  الدرج الموسّع — طبقة تغطي الشاشة كلها فوق الشريط                 */
/* ================================================================== */

export function NavDrawer() {
  const { open, closeDrawer } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, authenticated, logout } = useAuth();
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  // 0 = مطويّ خارج يمين الشاشة، 1 = مفتوح بالكامل
  const slide = useRef(new Animated.Value(open ? 1 : 0)).current;

  /** قياسات حيّة: الهواتف القصيرة تحصل على تباعد مضغوط بدل قصّ المحتوى */
  const drawerW = Math.min(DRAWER_MAX_W, Math.round(width * 0.86));
  const compact = height < 860;

  // زر الرجوع في أندرويد يغلق الدرج بدل مغادرة الشاشة
  useEffect(() => {
    if (Platform.OS !== 'android' || !open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });
    return () => sub.remove();
  }, [open, closeDrawer]);

  useEffect(() => {
    if (open) setMounted(true);
    const duration = open ? 260 : 200;
    const anim = Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    });
    anim.start(({ finished }) => {
      // لا نُفكّ التركيب إلا إذا اكتمل الخروج ولم يُفتح الدرج من جديد
      if (finished && !open) setMounted(false);
    });
    // المتصفح يجمّد requestAnimationFrame في التبويب المخفي فتتوقف الحركة
    // ويبقى الدرج معلّقاً مطويّاً — نُكمل الحالة النهائية بمؤقّت لا يعتمد على الرسم
    const settle = setTimeout(() => {
      slide.setValue(open ? 1 : 0);
      if (!open) setMounted(false);
    }, duration + 80);
    return () => { clearTimeout(settle); anim.stop(); };
  }, [open, slide]);

  if (!mounted) return null;

  const go = (href: string) => { closeDrawer(); router.push(href as never); };

  const onLogout = async () => {
    closeDrawer();
    await logout();
    router.replace('/welcome' as never);
  };

  return (
    <View style={s.overlay} pointerEvents="box-none">
      <AnimatedPressable
        style={[s.scrim, { opacity: slide }]}
        onPress={closeDrawer}
        accessibilityLabel="إغلاق القائمة"
      />
      <Animated.View
        style={[
          s.drawer,
          {
            width: drawerW,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            transform: [{
              translateX: slide.interpolate({
                inputRange: [0, 1],
                // أرقام لا نصوص: '320px' لا تدعمها حركة المحرّك الأصلي على أندرويد
                outputRange: [drawerW, 0],
              }),
            }],
          },
        ]}
      >
        <View style={[s.drawerInner, RTL]}>
          <View style={[s.drawerHead, compact && s.drawerHeadCompact]}>
            <View style={{ flex: 1 }}>
              <Text style={s.drawerTitle}>القائمة</Text>
              <Text style={s.drawerSub} numberOfLines={1}>{BRAND.academy}</Text>
            </View>
            <Pressable onPress={closeDrawer} hitSlop={10} style={s.drawerClose}>
              <Ionicons name="close" size={19} color={c.text2} />
            </Pressable>
          </View>

          <View style={[s.drawerRule, compact && s.drawerRuleCompact]} />

          <ScrollView
            style={s.drawerScroll}
            contentContainerStyle={s.drawerScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {NAV_ITEMS.map((item, i) => {
              const on = isActiveHref(pathname, item.href);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => go(item.href)}
                  style={({ pressed }) => [
                    s.drawerItem,
                    compact && s.drawerItemCompact,
                    on && s.drawerItemOn,
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityRole="menuitem"
                >
                  <View style={[s.drawerIcon, on && { backgroundColor: c.white }]}>
                    <Ionicons name={item.icon} size={19} color={on ? c.primary : c.text3} />
                  </View>
                  <Text style={[s.drawerLabel, on && { color: c.primary, fontFamily: fnt.b }]}>{item.label}</Text>
                  <Text style={s.drawerIdx}>{String(i + 1).padStart(2, '0')}</Text>
                </Pressable>
              );
            })}

            <View style={[s.drawerRule, compact && s.drawerRuleCompact]} />

            <Pressable
              onPress={() => go('/info')}
              style={({ pressed }) => [s.drawerItem, compact && s.drawerItemCompact, pressed && { opacity: 0.75 }]}
              accessibilityRole="menuitem"
            >
              <View style={s.drawerIcon}>
                <Ionicons name="information-circle-outline" size={19} color={c.text3} />
              </View>
              <Text style={s.drawerLabel}>عن المنصة</Text>
            </Pressable>
            <Pressable
              onPress={() => go('/print')}
              style={({ pressed }) => [s.drawerItem, compact && s.drawerItemCompact, pressed && { opacity: 0.75 }]}
              accessibilityRole="menuitem"
            >
              <View style={s.drawerIcon}>
                <Ionicons name="print-outline" size={19} color={c.text3} />
              </View>
              <Text style={s.drawerLabel}>الطباعة</Text>
            </Pressable>

            <View style={[s.drawerRule, compact && s.drawerRuleCompact]} />

            {/* الخروج */}
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [
                s.drawerItem,
                compact && s.drawerItemCompact,
                s.drawerItemOut,
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel="تسجيل الخروج"
            >
              <View style={[s.drawerIcon, { backgroundColor: c.white }]}>
                <Ionicons name="log-out-outline" size={19} color={c.errText} />
              </View>
              <Text style={[s.drawerLabel, { color: c.errText, fontFamily: fnt.b }]}>
                تسجيل الخروج
              </Text>
              <Ionicons name="chevron-back" size={15} color={c.text4} />
            </Pressable>

            {/* الفوتر داخل التمرير: الشاشات القصيرة تُمرّره بدل قصّه */}
            <View style={[s.drawerFoot, compact && s.drawerFootCompact]}>
              <View style={s.drawerUser}>
                <View style={[s.drawerIcon, { width: 30, height: 30, backgroundColor: c.white }]}>
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
              <HorizontalLogo
                style={[s.drawerLogo, compact && s.drawerLogoCompact]}
                resizeMode="contain"
              />
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
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

  /* الدرج */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    ...LTR,
    zIndex: 50,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    ...LTR,
    backgroundColor: c.scrimHard,
  },
  /** الحاوية المتحرّكة: ltr فيزيائية، فـ right:0 و translateX كلاهما على اليمين */
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    ...LTR,
    backgroundColor: c.tileBg,
    borderLeftWidth: 1,
    borderLeftColor: c.tileBorder,
    ...sh.lg,
  },
  drawerInner: {
    flex: 1,
    paddingHorizontal: sp.md,
  },
  drawerHead: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm,
    paddingHorizontal: sp.xs, paddingTop: sp.md,
  },
  drawerHeadCompact: { paddingTop: sp.sm },
  drawerTitle: { fontFamily: fnt.eb, fontSize: fs.xl, color: c.text },
  drawerSub: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },
  drawerClose: {
    width: 34, height: 34, borderRadius: rad.sm,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerRule: { height: 1, backgroundColor: c.line, marginVertical: sp.md },
  drawerRuleCompact: { marginVertical: sp.sm },
  drawerScroll: { flex: 1 },
  /** flexGrow يجعل الفوتر يلتصق بالأسفل عندما يكون المحتوى أقصر من الشاشة */
  drawerScrollContent: { flexGrow: 1 },

  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingVertical: sp.md, paddingHorizontal: sp.sm,
    borderRadius: rad.md,
    marginBottom: 2,
  },
  drawerItemCompact: { paddingVertical: sp.sm },
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
    marginTop: 'auto',
    borderTopWidth: 1, borderTopColor: c.line,
  },
  drawerFootCompact: { paddingTop: sp.sm },
  drawerUser: {
    alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgLift,
    borderRadius: rad.md,
    paddingHorizontal: sp.sm, paddingVertical: sp.sm,
    marginBottom: sp.md,
  },
  drawerUserName: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text },
  drawerUserRole: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 1 },
  drawerLogo: { width: 180, height: 53 },
  drawerLogoCompact: { width: 150, height: 44 },
});

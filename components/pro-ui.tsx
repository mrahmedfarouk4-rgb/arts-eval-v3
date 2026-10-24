import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Image,
  type ViewStyle, type StyleProp,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { c, sp, rad, fnt, fs, sh, scaleTone, scaleBg, scaleFg } from '@/constants/brand';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ================================================================== */
/*  Button                                                            */
/* ================================================================== */

type BtnVariant = 'primary' | 'surface' | 'ghost' | 'danger' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';

export function Button({
  label, onPress, variant = 'primary', size = 'md', icon,
  disabled, loading, full, style,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = BTN[variant];
  const sz = BTN_SIZE[size];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.bd },
        sz.box,
        full && { alignSelf: 'stretch' },
        variant === 'primary' && sh.glow,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {!!icon && <Ionicons name={icon} size={sz.icon} color={v.fg} />}
          <Text style={[styles.btnText, { color: v.fg, fontSize: sz.font }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const BTN: Record<BtnVariant, { bg: string; fg: string; bd: string }> = {
  primary: { bg: c.primary, fg: c.onPrimary, bd: c.primary },
  surface: { bg: c.bgAlt, fg: c.text, bd: c.lineHi },
  ghost:   { bg: 'transparent', fg: c.primary, bd: 'transparent' },
  soft:    { bg: c.primaryBg, fg: c.primary, bd: c.primaryLine },
  danger:  { bg: c.errBg, fg: c.errText, bd: c.errLine },
};

const BTN_SIZE = {
  sm: { box: { paddingVertical: sp.sm, paddingHorizontal: sp.md, minHeight: 36 }, font: fs.xs, icon: 14 },
  md: { box: { paddingVertical: sp.md, paddingHorizontal: sp.lg, minHeight: 46 }, font: fs.sm, icon: 17 },
  lg: { box: { paddingVertical: sp.lg, paddingHorizontal: sp.xl, minHeight: 54 }, font: fs.md, icon: 19 },
} as const;

/* ================================================================== */
/*  Card                                                              */
/* ================================================================== */

export function Card({
  children, onPress, padding = sp.lg, style, accent,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  const inner = (
    <View style={[styles.card, { padding }, style]}>
      {!!accent && <View style={[styles.accent, { backgroundColor: accent }]} />}
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.99 }], opacity: 0.92 }]}
      accessibilityRole="button"
    >
      {inner}
    </Pressable>
  );
}

/* ================================================================== */
/*  Badge                                                             */
/* ================================================================== */

/* ================================================================== */
/*  نمط الموزاييك + الأسبوع (التصميم د)                                  */
/* ================================================================== */

/**
 * بلاطة الموزاييك — خلية في شبكة متعادلة الأوزان.
 *
 * من التصميم «لوحة العمل»: الشاشة الرئيسية ليست قائمة بل شبكة،
 * كل خلية سؤال واحد يجيب عنه المعلم بنظرة: كم طالباً؟ كم تقييماً اليوم؟
 */
export function Tile({
  title, children, wide, onPress, style, bg, bgOpacity = 0.09,
}: {
  title?: string;
  children: React.ReactNode;
  /** تمتدّ على العمودين — للأزرار والرسوم الأسبوعية */
  wide?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** صورة خلفية (اختيارية) — تُعرض بتعتيم خفيف */
  bg?: any;
  bgOpacity?: number;
}) {
  const body = (
    <Animated.View entering={FadeInDown.duration(520)} style={[styles.tile, wide && styles.tileWide, style]}>
      {!!bg && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={bg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(255,255,255,${1 - bgOpacity})` }]} />
        </View>
      )}
      {!!title && <Text style={styles.tileTitle}>{title}</Text>}
      {children}
    </Animated.View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [wide && styles.tileWide, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

/** رقم كبير — اللبطة الأساسية في النمط */
export function TileStat({
  value, unit, note,
}: {
  value: string | number;
  unit?: string;
  note?: string;
}) {
  return (
    <View>
      <Text style={styles.tileStat}>
        {value}
        {!!unit && <Text style={styles.tileStatUnit}>{unit}</Text>}
      </Text>
      {!!note && <Text style={styles.tileStatNote}>{note}</Text>}
    </View>
  );
}

/**
 * بلاطة الأسبوع — خمسة أيام في صفّ واحد.
 *
 * خلية اليوم كحلية بيضاء، والباقي رماديّة على خلفية فاتحة. الشريط
 * الذهبيّ داخل خلية اليوم يوضّح نسبة إنجازه.
 */
export interface WeekDay {
  /** ١..٥ — الأحد أول يوم عمل */
  n: number;
  label: string;
  day: number;
  count: number;
  /** ٠..١ */
  done: number;
  today?: boolean;
}

export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <View style={styles.week}>
      {days.map((d) => (
        <View key={d.n} style={[styles.day, d.today && styles.dayOn]}>
          <Text style={[styles.dayLabel, d.today && styles.dayLabelOn]}>{d.label}</Text>
          <Text style={[styles.dayNum, d.today && styles.dayNumOn]}>{ar(d.day)}</Text>
          <Text style={[styles.dayCount, d.today && styles.dayCountOn]}>
            {d.count > 0 ? ar(d.count) : '—'}
          </Text>
          <View style={[styles.dayBar, d.today && styles.dayBarOn]}>
            {d.done > 0 && (
              <View
                style={[
                  styles.dayBarFill,
                  d.today && { backgroundColor: c.gold },
                ]}
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** أرقام عربية-هندية — كما في الكليشة (مُصدَّرة لكل شاشة تعرض رقماً داخل نص عربي) */
export const ar = (n: number | string) =>
  String(n ?? '').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

/**
 * صفّ تحقّق — نمط الجدول بدل البطاقة.
 *
 * «أي مقرر تقيّم؟» تُقرأ كأسماء لا كبطاقات مصوّرة. المربّع على
 * اليمين «محدَّد»|kioskوالأزرار على اليسار.
 */
export function CheckRow({
  title, sub, meta, checked, onPress, trailing, off,
}: {
  title: string;
  sub?: string;
  meta?: string;
  checked?: boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
  /** غير متاح — يُعتَّم فورياً */
  off?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.checkRow,
        off && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ checked: !!checked }}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked && <Ionicons name="checkmark" size={13} color={c.onPrimary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkTitle} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={styles.checkSub} numberOfLines={1}>{sub}</Text>}
      </View>
      {!!meta && <Text style={styles.checkMeta}>{meta}</Text>}
      {trailing}
    </Pressable>
  );
}

/** زرّ إجراء سريع — كبسولة خفيفة */
export function QuickChip({
  label, icon, on, onPress,
}: {
  label: string;
  icon?: IconName;
  on?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quick, on && styles.quickOn, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
    >
      {!!icon && <Ionicons name={icon} size={13} color={on ? c.onPrimary : c.text2} />}
      <Text style={[styles.quickText, on && styles.quickTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** شريط أوامر — بديل قائمة التنقّل العلوية */
export function CommandBar({
  hint, right, onPress,
}: {
  hint: string;
  right?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cmd, pressed && { opacity: 0.9 }]}
      accessibilityRole="search"
    >
      <View style={styles.cmdKey}>
        <Ionicons name="search" size={12} color={c.onPrimary} />
      </View>
      <Text style={styles.cmdHint} numberOfLines={1}>{hint}</Text>
      {!!right && <Text style={styles.cmdRight}>{right}</Text>}
    </Pressable>
  );
}

export function Badge({
  label, color = c.primary, bg = c.primaryBg, border, style,
}: {
  label: string;
  color?: string;
  bg?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border ?? 'transparent', borderWidth: border ? 1 : 0 }, style]}>
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ================================================================== */
/*  Section                                                           */
/* ================================================================== */

export function Section({
  title, hint, count, children,
}: {
  title: string;
  hint?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: sp.sm }}>
      <View style={styles.secHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.secTitle}>{title}</Text>
          {!!hint && <Text style={styles.secHint}>{hint}</Text>}
        </View>
        {count !== undefined && <Badge label={`${count}`} color={c.text2} bg={c.bgLift} />}
      </View>
      {children}
    </View>
  );
}

/* ================================================================== */
/*  Segmented                                                         */
/* ================================================================== */

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.seg, on && styles.segOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>{o.label}</Text>
            {!!o.sub && <Text style={[styles.segSub, on && { color: 'rgba(255,255,255,0.72)' }]}>{o.sub}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  Progress                                                          */
/* ================================================================== */

export function Progress({
  value, max, color = c.primary, height = 6,
}: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View style={[styles.progTrack, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/* ================================================================== */
/*  Banner                                                            */
/* ================================================================== */

export function Banner({
  level = 'info', title, message, onClose,
}: {
  level?: 'info' | 'warn' | 'error';
  title: string;
  message?: string;
  onClose?: () => void;
}) {
  const t = BANNER[level];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.bd }]}>
      <Ionicons name={t.icon} size={16} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: t.fg }]}>{title}</Text>
        {!!message && <Text style={styles.bannerMsg}>{message}</Text>}
      </View>
      {!!onClose && (
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="إغلاق">
          <Ionicons name="close" size={16} color={t.fg} />
        </Pressable>
      )}
    </View>
  );
}

const BANNER = {
  info:  { bg: c.infoBg,  bd: c.infoLine, fg: c.infoText,  icon: 'information-circle' as IconName },
  warn:  { bg: c.warnBg,  bd: c.warnLine, fg: c.warnText,  icon: 'warning' as IconName },
  error: { bg: c.errBg,   bd: c.errLine,  fg: c.errText,   icon: 'alert-circle' as IconName },
};

/* ================================================================== */
/*  ScaleRow — سلم الدرجات 1-4                                       */
/* ================================================================== */

const SCALE_LABELS = ['دون الهدف', 'يقترب', 'حقق', 'يتخطى'];

export function ScaleRow({
  value, onPick, disabled, compact,
}: {
  value?: number;
  onPick?: (v: number) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4].map((n) => {
        const on = value === n;
        return (
          <Pressable
            key={n}
            onPress={disabled ? undefined : () => onPick?.(n)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.scaleBtn,
              compact && { height: 44 },
              on && { backgroundColor: scaleBg[n - 1], borderColor: scaleTone[n - 1] },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled }}
            accessibilityLabel={`${SCALE_LABELS[n - 1]} — ${n}`}
          >
            <Text style={[styles.scaleNum, on && { color: scaleFg[n - 1] }]}>{n}</Text>
            {!compact && (
              <Text style={[styles.scaleLbl, on && { color: scaleFg[n - 1] }]} numberOfLines={1}>
                {SCALE_LABELS[n - 1]}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  Stat / Row / Empty / TopBar                                       */
/* ================================================================== */

export function Stat({
  value, label, color = c.primary, style, underline,
}: {
  value: string | number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** خط سفلي يميّز الخانة المُختارة كمرشِّح */
  underline?: boolean;
}) {
  return (
    <View style={[styles.stat, style]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {underline ? (
        <View style={[styles.statMark, { backgroundColor: color }]} />
      ) : null}
    </View>
  );
}

export function Row({
  icon, label, value, valueColor,
}: {
  icon: IconName;
  label: string;
  value?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={c.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {!!value && <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>{value}</Text>}
    </View>
  );
}

export function Empty({
  icon = 'file-tray-outline', title, message, action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={c.text4} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!message && <Text style={styles.emptyMsg}>{message}</Text>}
      {!!action && <View style={{ marginTop: sp.lg }}>{action}</View>}
    </View>
  );
}

export function TopBar({
  title, sub, right, onBack,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      {!!onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="رجوع">
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={styles.topSub} numberOfLines={1}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
}

/** ترويسة مع شعار الأكاديمية — الضغط على الشعار يعيد للصفحة الرئيسية */
export function BrandBar({
  title, sub, right, onBack, accent,
}: {
  title?: string;
  sub?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  accent?: string;
}) {
  const acc = accent ?? c.gold;
  return (
    <View style={styles.brandBar}>
      {!!onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="رجوع">
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </Pressable>
      )}

      <View style={{ flex: 1 }}>
        {!!title && <Text style={[styles.topTitle, { color: acc }]} numberOfLines={1}>{title}</Text>}
        <Text style={styles.brandName} numberOfLines={1}>
          {sub ?? 'أكاديمية آفاق للفنون والثقافة'}
        </Text>
      </View>

      <ModeToggle />

      {right}

      <View style={[styles.goldStrip, { backgroundColor: acc }]} />
    </View>
  );
}

/* ================================================================== */
/*  زر «عرض / تعديل» — متاح في كل شاشة                                */
/* ================================================================== */

/**
 * لم يعد يسأل عن كلمة سر، بل عن **حساب**.
 *
 * كلمة السر المشتركة `01020` كانت تعني أن من يملك الجهاز يقدر على التعديل.
 * الآن: الزائر يضغط فيُرسَل لشاشة الدخول، والمعلم المسجَّل يدخل مباشرة
 * ويمتلئ الزر إلى «تعديل» باسمه.
 */
export function ModeToggle() {
  const { editMode, setEditMode, requestEditMode } = useSession();
  const { user, authenticated } = useAuth();
  const router = useRouter();

  const onPress = async () => {
    if (editMode) {
      await setEditMode(false);
      return;
    }
    if (authenticated) {
      await requestEditMode();
      return;
    }
    // زائر: التعديل يتطلب تسجيل دخول، فنأخذه لشاشة الدخول
    router.push('/welcome' as never);
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, editMode && styles.chipOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: editMode }}
      accessibilityLabel={
        editMode
          ? 'وضع التعديل مفعّل — اضغط للعودة للعرض'
          : authenticated
            ? 'وضع العرض — اضغط للتعديل'
            : 'زائر — اضغط لتسجيل الدخول'
      }
    >
      <Ionicons
        name={authenticated ? (editMode ? 'lock-open' : 'lock-closed') : 'person-circle-outline'}
        size={13}
        color={editMode ? c.okText : authenticated ? c.text3 : c.warnText}
      />
      <Text
        style={[styles.chipText, editMode && { color: c.okText }]}
        numberOfLines={1}
      >
        {user ? user.name : editMode ? 'تعديل' : 'زائر'}
      </Text>
    </Pressable>
  );
}

/* ================================================================== */
/*  شارة وضع التعديل / العرض                                          */
/* ================================================================== */

export function EditChip({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="وضع التعديل"
    >
      <Ionicons name={on ? 'lock-open' : 'lock-closed'} size={13} color={on ? c.okText : c.text3} />
      <Text style={[styles.chipText, on && { color: c.okText }]}>{on ? 'تعديل' : 'عرض'}</Text>
    </Pressable>
  );
}

/* ================================================================== */
/*  شريط خطوات التنقّل بين المراحل                                    */
/* ================================================================== */

const STEP_LABELS = ['المرحلة', 'المقرر', 'التقييم', 'الطلاب'];

export function StepBar({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <View style={styles.steps}>
      {STEP_LABELS.map((t, i) => {
        const isOn = i === active;
        const isDone = i < active;
        return (
          <View key={t} style={styles.stepItem}>
            <View style={[styles.stepDot, isOn && styles.stepDotOn, isDone && styles.stepDotDone]}>
              <Text
                style={[
                  styles.stepDotText,
                  (isOn || isDone) && { color: c.onPrimary },
                ]}
              >
                {isDone ? '✓' : ar(i + 1)}
              </Text>
            </View>
            <Text style={[styles.stepText, isOn && { color: c.primary, fontFamily: fnt.b }]}>
              {t}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  شريط المقاسات والأنماط                                            */
/* ================================================================== */

const styles = StyleSheet.create({

  /* ── الموزاييك ── */
  tile: {
    width: '47.6%',
    backgroundColor: c.tileBg,
    borderRadius: 18,
    borderWidth: 1, borderColor: c.tileBorder,
    padding: sp.lg,
    gap: sp.sm,
    overflow: 'hidden',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  tileWide: { width: '100%' },
  tileTitle: { fontFamily: fnt.m, fontSize: 10.5, color: c.text3 },
  tileStat: { fontFamily: fnt.bk, fontSize: 28, color: c.primary, letterSpacing: -0.6, lineHeight: 32 },
  tileStatUnit: { fontFamily: fnt.b, fontSize: 14, color: c.primary },
  tileStatNote: { fontFamily: fnt.r, fontSize: 10, color: c.text3, marginTop: 2 },

  /* ── الأسبوع ── */
  week: { flexDirection: 'row', gap: 5 },
  day: {
    flex: 1,
    backgroundColor: c.dayCell,
    borderRadius: rad.sm,
    borderWidth: 1, borderColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: c.tileToday, borderColor: c.tileToday },
  dayLabel: { fontFamily: fnt.r, fontSize: 9, color: c.text3 },
  dayLabelOn: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { fontFamily: fnt.bk, fontSize: 17, color: c.text, lineHeight: 21 },
  dayNumOn: { color: c.onPrimary },
  dayCount: { fontFamily: fnt.m, fontSize: 8.5, color: c.text4 },
  dayCountOn: { color: 'rgba(255,255,255,0.7)' },
  dayBar: {
    width: '80%', height: 3, borderRadius: 2,
    backgroundColor: c.meterTrack, marginTop: 4, overflow: 'hidden',
  },
  dayBarOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayBarFill: { width: '100%', height: '100%', backgroundColor: c.primary, borderRadius: 2 },

  /* ── صفوف التحقّق ── */
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    backgroundColor: c.tileBg,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.tileBorder,
    paddingHorizontal: sp.md, paddingVertical: sp.md,
  },
  checkBox: {
    width: 19, height: 19, borderRadius: 6,
    borderWidth: 1.8, borderColor: c.lineHi,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: c.primary, borderColor: c.primary },
  checkTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  checkSub: { fontFamily: fnt.r, fontSize: 10.5, color: c.text3, marginTop: 1 },
  checkMeta: { fontFamily: fnt.m, fontSize: 11, color: c.text4 },

  /* ── أزرار سريعة ── */
  quick: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: rad.pill,
    backgroundColor: c.tileTint,
    borderWidth: 1, borderColor: c.tileBorder,
  },
  quickOn: { backgroundColor: c.primary, borderColor: c.primary },
  quickText: { fontFamily: fnt.m, fontSize: 10.5, color: c.text2 },
  quickTextOn: { color: c.onPrimary, fontFamily: fnt.b },

  /* ── شريط الأوامر ── */
  cmd: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.tileBg,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.tileBorder,
    paddingHorizontal: sp.md, paddingVertical: 10,
  },
  cmdKey: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cmdHint: { flex: 1, fontFamily: fnt.r, fontSize: fs.xs, color: c.text3 },
  cmdRight: {
    fontFamily: fnt.r, fontSize: 9, color: c.text4,
    backgroundColor: c.tileTint,
    borderWidth: 1, borderColor: c.tileBorder,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, borderRadius: rad.md, borderWidth: 1,
  },
  btnText: { fontFamily: fnt.b },

  /**
   * البطاقة — **بنمط `.card` في منصة التقييم القديمة**:
   *   background:#fff; border:1px solid #E2E8F0; border-radius:14px;
   *   box-shadow:0 10px 30px rgba(15,40,55,.10)
   *
   * الحدّ والظلّ معاً يعطيان عمقاً هادئاً؛ و`overflow:hidden` يبقي
   * الشريط اللوني على الحافة مقصوصاً بحدّ البطاقة لا طافياً عليها.
   * الظل بأحد ألوان العلامة عبر `sh.md` لا بلون خارج الدليل.
   */
  card: {
    backgroundColor: c.white,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line,
    overflow: 'hidden',
    ...sh.md,
  },
  accent: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 5 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: sp.sm, paddingVertical: 3,
    borderRadius: rad.pill,
  },
  badgeText: { fontFamily: fnt.b, fontSize: fs.xxs },

  secHead: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  secTitle: { fontFamily: fnt.eb, fontSize: fs.lg, color: c.text },
  secHint: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },

  segWrap: {
    flexDirection: 'row',
    backgroundColor: c.bgLift,
    borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line,
    padding: 4, gap: 4,
  },
  seg: { flex: 1, paddingVertical: sp.sm, borderRadius: rad.sm, alignItems: 'center' },
  segOn: { backgroundColor: c.primary },
  segText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  segTextOn: { color: '#FFF', fontFamily: fnt.b },
  segSub: { fontFamily: fnt.r, fontSize: 9, color: c.text4, marginTop: 1 },

  progTrack: { backgroundColor: c.line, overflow: 'hidden', width: '100%' },

  banner: {
    flexDirection: 'row', gap: sp.sm,
    padding: sp.md, borderRadius: rad.md, borderWidth: 1,
  },
  bannerTitle: { fontFamily: fnt.b, fontSize: fs.sm },
  bannerMsg: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text2, marginTop: 3, lineHeight: 19 },

  scaleRow: { flexDirection: 'row', gap: sp.sm },
  scaleBtn: {
    flex: 1, height: 52,
    borderRadius: rad.md,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.bg,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  scaleNum: { fontFamily: fnt.bk, fontSize: fs.lg, color: c.text4 },
  scaleLbl: { fontFamily: fnt.r, fontSize: 8, color: c.text4 },

  stat: { alignItems: 'center', flex: 1 },
  statMark: { width: 18, height: 2.5, borderRadius: 2, marginTop: 5 },
  statValue: { fontFamily: fnt.bk, fontSize: fs.xxl },
  statLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, paddingVertical: sp.md,
    marginBottom: sp.xs,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: rad.sm,
    backgroundColor: c.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: fnt.m, fontSize: fs.sm, color: c.text3 },
  rowValue: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },

  empty: { alignItems: 'center', paddingVertical: sp.huge, paddingHorizontal: sp.xl },
  emptyIcon: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: c.bgLift, borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center', marginBottom: sp.lg,
  },
  emptyTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text, textAlign: 'center' },
  emptyMsg: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3, textAlign: 'center', marginTop: sp.sm, lineHeight: 21 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    backgroundColor: c.bgAlt,
    borderBottomWidth: 1, borderBottomColor: c.line,
  },
  brandBar: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomWidth: 1, borderBottomColor: c.line,
    flexWrap: 'wrap',
  },
  /** شريط ذهبي — h-1 كما في منظومة الحضور */
  goldStrip: {
    position: 'absolute', left: 0, right: 0, bottom: -1,
    height: 3, backgroundColor: c.gold,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: rad.sm,
    backgroundColor: c.bgLift, borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text },
  topSub: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 1 },
  brandName: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.primary, marginTop: 1 },

  /* شارة وضع التعديل */
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: rad.pill,
    backgroundColor: c.bgLift,
    borderWidth: 1, borderColor: c.line,
  },
  chipOn: { backgroundColor: c.okBg, borderColor: c.okLine },
  chipText: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text3 },

  /* شريط الخطوات */
  steps: {
    flexDirection: 'row',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 5 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotOn: { backgroundColor: c.primary },
  stepDotDone: { backgroundColor: c.ok },
  stepDotText: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text3 },
  stepText: { fontFamily: fnt.m, fontSize: 9, color: c.text4 },

});

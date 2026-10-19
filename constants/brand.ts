/**
 * الهوية البصرية — أكاديمية آفاق للفنون والثقافة
 * ===================================================================
 * مستندة **حرفياً** إلى "Afaq Academy Brand Guideline" (1447هـ / 2025م).
 *
 * الألوان الرسمية (RGB للشاشات، CMYK للطباعة):
 *   Primary:      #004645  (RGB 0, 70, 69)     — اللون الأساسي للعلامة
 *   Secondary:    #621244  (RGB 98, 18, 68)    — بنفسجي داكن / ثانوي
 *   Accent:      #D17E30  (RGB 209, 126, 48)  — برتقالي دافئ (تمييز أساسي)
 *   (الأصفر أُلغي — استُبدل بـ Mint/Blue cheerful accents)
 *
 * لوحة الألوان الداعمة (من الدليل):
 *   Blues:    #262674, #83C3EB, #C0E1F7
 *   Greens:   #83D5C4, #C6EEE5
 *   Pinks:    #E5A1C8, #F5D7E8
 *   Warm:     #D17E30, #FDDCC8
 *   Deep:     #262674, #621244
 *
 * الشعار:
 *   - الأفقي: النسخة الأساسية (الأغلب استخداماً)
 *   - العمودي: بديل ثانوي للمساحات العمودية
 *
 * الأيقونات: مشتقة من عناصر الشعار البصري، تمثل القطاعات الثقافية والتعليمية.
 *
 * الخطوط: Cairo (Google Fonts) — أوزان 400-900 متوفرة.
 */

/* ================================================================== */
/*  الهوية                                                             */
/* ================================================================== */

export const BRAND = {
  academy: 'أكاديمية آفاق للفنون والثقافة',
  academyEn: 'Afaq Academy for Fine Arts & Culture',
} as const;

/* ================================================================== */
/*  الألوان الرسمية — مطابقة للدليل الرسمي تماماً                      */
/* ================================================================== */

export const c = {
  /* ===== الألوان الأساسية للعلامة (من الدليل الرسمي) ===== */
  /** اللون الأساسي للعلامة — #004645 (Dark Teal) */
  brandPrimary: '#004645',
  brandPrimaryHi: '#005A59',
  brandPrimaryDeep: '#003635',
  brandPrimarySoft: '#006E6D',
  brandPrimaryBg: 'rgba(0, 70, 69, 0.06)',
  brandPrimaryLine: 'rgba(0, 70, 69, 0.18)',
  onBrandPrimary: '#FFFFFF',

  /** اللون الثانوي — #621244 (Deep Purple/Maroon) */
  brandSecondary: '#621244',
  brandSecondaryHi: '#7A1A55',
  brandSecondaryDeep: '#4A0D33',
  brandSecondarySoft: '#8A2A55',
  brandSecondaryBg: 'rgba(98, 18, 68, 0.06)',
  brandSecondaryLine: 'rgba(98, 18, 68, 0.18)',
  onBrandSecondary: '#FFFFFF',

  /** البرتقالي للتمييز الأساسي — #D17E30 */
  gold: '#D17E30',
  goldHi: '#83D5C4',
  goldBg: 'rgba(209, 126, 48, 0.16)',
  goldLine: 'rgba(209, 126, 48, 0.55)',

  /* ===== الألوان الداعمة من الدليل الرسمي ===== */
  /** أزرق داكن — #262674 */
  blueDeep: '#262674',
  blueDeepBg: 'rgba(38, 38, 116, 0.06)',

  /** أزرق متوسط — #83C3EB */
  blueMid: '#83C3EB',
  blueMidBg: 'rgba(131, 195, 235, 0.10)',

  /** أزرق فاتح — #C0E1F7 */
  blueLight: '#C0E1F7',
  blueLightBg: 'rgba(192, 225, 247, 0.12)',

  /** أخضر نعناعي — #83D5C4 */
  mint: '#83D5C4',
  mintBg: 'rgba(131, 213, 196, 0.10)',

  /** أخضر فاتح جداً — #C6EEE5 */
  mintLight: '#C6EEE5',
  mintLightBg: 'rgba(198, 238, 229, 0.12)',

  /** وردي متوسط — #E5A1C8 */
  pinkMid: '#E5A1C8',
  pinkMidBg: 'rgba(229, 161, 200, 0.10)',

  /** وردي فاتح — #F5D7E8 */
  pinkLight: '#F5D7E8',
  pinkLightBg: 'rgba(245, 215, 232, 0.12)',

  /** برتقالي دافئ — #D17E30 */
  orange: '#D17E30',
  orangeBg: 'rgba(209, 126, 48, 0.10)',

  /** خوخي — #FDDCC8 */
  peach: '#FDDCC8',
  peachBg: 'rgba(253, 220, 200, 0.12)',

  /* ===== تدرجات رمادية محايدة ===== */
  neutral50: '#FAFAFA',
  neutral100: '#F5F5F5',
  neutral200: '#E5E5E5',
  neutral300: '#D4D4D4',
  neutral400: '#A3A3A3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  neutral950: '#0A0A0A',

  /* ===== نظام الألوان للتطبيق (مشتق من العلامة) ===== */

  /* الخلفيات */
  bg: '#FAFAFA',           // neutral50
  bgAlt: '#FFFFFF',        // white
  bgLift: '#F5F5F5',       // neutral100
  bgCard: '#FFFFFF',
  bgCardSolid: '#FFFFFF',
  bgGlass: 'rgba(255, 255, 255, 0.88)',
  bgGlassHi: 'rgba(255, 255, 255, 0.96)',

  /* الخطوط */
  line: '#E5E5E5',         // neutral200
  lineHi: '#D4D4D4',       // neutral300
  lineStrong: '#A3A3A3',   // neutral400

  /* النصوص */
  text: '#171717',         // neutral900
  text2: '#404040',        // neutral700
  text3: '#737373',        // neutral500
  text4: '#A3A3A3',        // neutral400

  /* اللون الأساسي للتطبيق = لون العلامة الأساسي */
  primary: '#004645',
  primaryHi: '#005A59',
  primaryDeep: '#003635',
  primarySoft: '#006E6D',
  primaryBg: 'rgba(0, 70, 69, 0.06)',
  primaryLine: 'rgba(0, 70, 69, 0.18)',
  onPrimary: '#FFFFFF',

  /** نصّ على زرّ الإجراء (ذهبي) — لون العلامة الأساسي للتباين */
  onAction: '#004645',

  /** البرتقالي = لون التمييز الأساسي (Accent) */
  accent: '#D17E30',
  accentHi: '#83D5C4',
  accentBg: 'rgba(209, 126, 48, 0.14)',
  accentLine: 'rgba(209, 126, 48, 0.50)',

  /** زر الإجراء الأساسي — يستخدم لون العلامة (Teal) للتباين والاحترافية */
  action: '#004645',
  actionHi: '#005A59',
  actionBg: 'rgba(0, 70, 69, 0.10)',
  onActionText: '#FFFFFF',

  /* التمييز/العلم */
  flag: '#D17E30',
  flagBg: 'rgba(209, 126, 48, 0.20)',

  /* حقول الإدخال */
  input: '#FFFFFF',
  inputLine: '#E5E5E5',

  /* الزر الشبح */
  ghostBg: '#F5F5F5',
  ghostLine: '#D4D4D4',

  /* خلفية الهيرو */
  heroVeilTop: 'rgba(0, 70, 69, 0.62)',
  heroVeilBottom: 'rgba(0, 70, 69, 0.86)',

  /* ===== أنواع التقييم — ألوان مميزة ومتمايزة ===== */
  /** التقييم التكويني — أزرق (Blue) من اللوحة الداعمة */
  weekly: '#83C3EB',
  weeklyBg: 'rgba(131, 195, 235, 0.18)',

  /** التقويم المرحلي — أخضر نعناعي من اللوحة الداعمة */
  periodic: '#83D5C4',
  periodicBg: 'rgba(131, 213, 196, 0.18)',

  /** التقويم الختامي — بنفسجي متوسط من اللوحة الداعمة */
  final: '#621244',
  finalBg: 'rgba(98, 18, 68, 0.12)',

  /* ===== المستويات ===== */
  gifted: '#621244',
  giftedBg: 'rgba(98, 18, 68, 0.11)',
  achieved: '#83D5C4',
  achievedBg: 'rgba(131, 213, 196, 0.11)',
  approaching: '#83D5C4',
  approachingBg: 'rgba(131, 213, 196, 0.12)',
  below: '#D17E30',
  belowBg: 'rgba(209, 126, 48, 0.11)',

  /* سلم الدرجات */
  s1: '#D17E30', s1Bg: 'rgba(209, 126, 48, 0.12)',
  s2: '#83D5C4', s2Bg: 'rgba(131, 213, 196, 0.12)',
  s3: '#83D5C4', s3Bg: 'rgba(131, 213, 196, 0.12)',
  s4: '#621244', s4Bg: 'rgba(98, 18, 68, 0.12)',

  /* دلالات */
  ok: '#83D5C4',
  okBg: 'rgba(131, 213, 196, 0.11)',
  warn: '#83C3EB',
  warnBg: 'rgba(131, 195, 235, 0.12)',
  err: '#D17E30',
  errBg: 'rgba(209, 126, 48, 0.09)',
  info: '#83C3EB',
  infoBg: 'rgba(131, 195, 235, 0.09)',

  /* الطبقات */
  scrim: 'rgba(0, 70, 69, 0.32)',
  scrimSoft: 'rgba(0, 70, 69, 0.12)',
  scrimHard: 'rgba(0, 70, 69, 0.48)',

  /* بلاطات الموزاييك */
  tileBg: '#FFFFFF',
  tileBorder: '#E5E5E5',
  tileTint: '#F5F5F5',
  tileToday: '#004645',
  tileTodayFg: '#FFFFFF',
  dayCell: '#F5F5F5',
  dayCellLine: '#D4D4D4',
  meterTrack: '#E5E5E5',
  railActive: '#004645',

  white: '#FFFFFF',
  accent2: '#83D5C4',
  surface: '#FFFFFF',
  surfaceHi: '#F5F5F5',
  bgElevated: '#F5F5F5',
  bgAlt2: '#FFFFFF',

  /* ===== شرائح الأدوار — من اللوحة الداعمة ===== */
  chipMintBg: '#83D5C4', chipMintFg: '#004645',
  chipBlueBg: '#83C3EB', chipBlueFg: '#262674', chipBlueLine: '#83C3EB',
  chipRoseBg: '#F5D7E8', chipRoseFg: '#621244', chipRoseLine: '#E5A1C8',
  chipPeachBg: '#FDDCC8', chipPeachFg: '#D17E30', chipPeachLine: '#D17E30',
  chipAdminBg: '#F5F5F5', chipAdminFg: '#404040',

  /* ===== تدرجات جاهزة ===== */
  GRAD: {
    deep: ['#004645', '#005A59'] as const,
    plum: ['#621244', '#4A0D33'] as const,
    gold: ['#D17E30', '#B86A22'] as const,
    soft: ['#F5F5F5', '#FAFAFA'] as const,
  } as const,
} as const;

export const ACCENT = '#D17E30' as const;

/* ================================================================== */
/*  المسافات والخطوط                                                  */
/* ================================================================== */

export const sp = { xxs: 4, xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, huge: 44 } as const;

export const rad = { sm: 8, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999 } as const;

export const fnt = {
  r: 'Cairo_400Regular',
  m: 'Cairo_500Medium',
  sb: 'Cairo_600SemiBold',
  b: 'Cairo_700Bold',
  eb: 'Cairo_800ExtraBold',
  bk: 'Cairo_900Black',
} as const;

export const fs = {
  xxs: 10, xs: 11, sm: 13, md: 15, lg: 18, xl: 22,
  xxl: 28, huge: 36, giant: 46,
} as const;

export const lh = { tight: 1.15, snug: 1.35, normal: 1.7 } as const;

/* ================================================================== */
/*  الظلال — بلون العلامة الأساسي                                      */
/* ================================================================== */

export const sh = {
  none: {},
  sm: { shadowColor: '#004645', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#004645', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.10, shadowRadius: 30, elevation: 4 },
  lg: { shadowColor: '#004645', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.14, shadowRadius: 44, elevation: 9 },
  glow: { shadowColor: '#D17E30', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 18, elevation: 7 },
} as const;

export const GRAD = {
  deep: ['#004645', '#005A59'] as const,
  plum: ['#621244', '#4A0D33'] as const,
  gold: ['#D17E30', '#B86A22'] as const,
  soft: ['#F5F5F5', '#FAFAFA'] as const,
} as const;

/* ================================================================== */
/*  النغمات                                                            */
/* ================================================================== */

export const kindTone = {
  weekly: { c: '#006E6D', bg: 'rgba(0, 110, 109, 0.10)' },
  periodic: { c: '#83D5C4', bg: 'rgba(131, 213, 196, 0.10)' },
  final: { c: '#621244', bg: 'rgba(98, 18, 68, 0.10)' },
} as const;

export const levelTone = {
  gifted: { c: '#621244', bg: 'rgba(98, 18, 68, 0.11)' },
  achieved: { c: '#83D5C4', bg: 'rgba(131, 213, 196, 0.11)' },
  approaching: { c: '#83D5C4', bg: 'rgba(131, 213, 196, 0.12)' },
  below: { c: '#D17E30', bg: 'rgba(209, 126, 48, 0.11)' },
} as const;

export const scaleTone = ['#D17E30', '#83D5C4', '#83C3EB', '#621244'] as const;
export const scaleBg = [
  'rgba(209, 126, 48, 0.12)',
  'rgba(131, 213, 196, 0.12)',
  'rgba(131, 213, 196, 0.12)',
  'rgba(98, 18, 68, 0.12)',
] as const;

/* ================================================================== */
/*  المطبوعة الرسمية (عنابي — وثيقة حكومية، لا علاقة لها بالهوية)       */
/* ================================================================== */

export const PRINT = {
  titleRed: '#9E2A2B',
  darkRed: '#962816',
  headPink: '#DFBCC8',
  softPink: '#FAEBE7',
  midPink: '#F8E2DA',
  warmPink: '#EDD0C0',
  highlight: '#FEF3C7',
  infoBg: '#FAF6F7',
  infoBorder: '#EBD8DC',
  tableBorder: '#777',
} as const;

/* ================================================================== */
/*  معلومات التطبيق                                                    */
/* ================================================================== */

export const ORG = {
  appTitle: 'منصة تقييم الفنون البصرية',
  appSub: 'إدارة التقييم والملاحظة الفنية',
  academy: 'أكاديمية آفاق للفنون والثقافة',
  portal: 'https://engage.moc.gov.sa/cultural-talents-schools',
} as const;

export const GRADE_COLORS = ['#004645', '#621244', '#83C3EB', '#D17E30', '#83D5C4', '#E5A1C8'] as const;

const GRADE_ORDER = ['primary4', 'primary5', 'primary6', 'intermediate1', 'intermediate2', 'intermediate3'];

export function gradeColor(gradeId: string): string {
  const idx = GRADE_ORDER.indexOf(gradeId);
  return GRADE_COLORS[idx >= 0 ? idx : 0];
}

export const SUBJECT_COLORS: Record<string, string> = {
  drawing_basics: '#83D5C4',   // تركواز (Mint)
  digital_drawing: '#621244',  // بنفسجي/نبيتي
  watercolor: '#D17E30',       // برتقالي
  cartoon: '#E5A1C8',          // لبني (Pink)
  saudi_arts: '#83C3EB',       // أزرق
  handicrafts: '#262674',      // أزرق داكن
  character_design: '#004645', // كحلي
  color_expression: '#FDDCC8', // خوخي
};

export function subjectColor(id: string): string {
  return SUBJECT_COLORS[id] ?? c.primary;
}

export default { BRAND, c, sp, rad, fnt, fs, lh, sh, GRAD, kindTone, levelTone, scaleTone, scaleBg, PRINT, ORG, GRADE_COLORS, gradeColor, SUBJECT_COLORS, subjectColor };
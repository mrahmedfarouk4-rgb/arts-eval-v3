/**
 * الهوية البصرية — أكاديمية آفاق للفنون والثقافة
 * ===================================================================
 * مستندة **حرفياً** إلى "Afaq Academy Brand Guideline" (1447هـ / 2025م).
 *
 * لوحة الألوان المعتمدة — ١٢ لوناً في أربع عائلات، كل عائلة: غامق → متوسط → فاتح
 *   Teal:   #004645 → #83D5C4 → #C6EEE5     Pink:   #621244 → #E5A1C8 → #F5D7E8
 *   Blue:   #262674 → #83C3EB → #C0E1F7     Warm:   #FBE122 → #D17E30 → #FDDCC8
 *
 * قاعدة الحبر: الدرجة الفاتحة للحشو والحدود والأشرطة فقط، وللنص درجة غامقة
 * من العائلة نفسها (أو onBase فوق لون المرحلة).
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

/**
 * لوحة الدليل الرسمي — ١٢ لوناً في أربع عائلات، كل عائلة: غامق → متوسط → فاتح.
 * هي المرجع الوحيد لكل لون في الواجهة (المطبوعة الرسمية لها PRINT).
 */
export const IDENTITY = {
  teal: ['#004645', '#83D5C4', '#C6EEE5'],
  pink: ['#621244', '#E5A1C8', '#F5D7E8'],
  blue: ['#262674', '#83C3EB', '#C0E1F7'],
  warm: ['#FBE122', '#D17E30', '#FDDCC8'],
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

  /** أصفر معتمد — #FBE122 (للخلفيات والدرجات الأعلى، لا كنص على أبيض) */
  sun: '#FBE122',
  sunBg: 'rgba(251, 225, 34, 0.22)',

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
  /** درجة العائلة الدافئة للحبر والأيقونات — accent نفسه 2.9:1 على أبيض فلا يحمل نصاً */
  warmInk: '#B86A22',

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

  /* دلالات — الحدود والنص مشتقة من عائلة اللون نفسه:
     الفاتح للحشو والأشرطة فقط، وللنص درجة غامقة مقروءة. */
  ok: '#83D5C4',
  okBg: 'rgba(131, 213, 196, 0.11)',
  okLine: 'rgba(131, 213, 196, 0.45)',
  okText: '#004645',
  warn: '#83C3EB',
  warnBg: 'rgba(131, 195, 235, 0.12)',
  warnLine: 'rgba(131, 195, 235, 0.50)',
  warnText: '#262674',
  err: '#D17E30',
  errBg: 'rgba(209, 126, 48, 0.09)',
  errLine: 'rgba(209, 126, 48, 0.32)',
  errText: '#621244',
  info: '#83C3EB',
  infoBg: 'rgba(131, 195, 235, 0.09)',
  infoLine: 'rgba(131, 195, 235, 0.45)',
  infoText: '#262674',

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
  weekly: { c: '#004645', bg: 'rgba(0, 70, 69, 0.10)' },
  periodic: { c: '#262674', bg: 'rgba(38, 38, 116, 0.10)' },
  final: { c: '#621244', bg: 'rgba(98, 18, 68, 0.10)' },
} as const;

/**
 * مستويات الأداء الأربعة — كل مستوى لون غامق معتمد على درجة فاتحة من عائلته.
 * التباين لكل زوج ≥ 8.5:1 (AA للنص الصغير).
 */
export const levelTone = {
  gifted: { c: '#621244', bg: '#F5D7E8' },
  achieved: { c: '#004645', bg: '#C6EEE5' },
  approaching: { c: '#262674', bg: '#C0E1F7' },
  below: { c: '#621244', bg: '#FDDCC8' },
} as const;

/** سُلّم الملاحظة من ١ (دون الهدف) إلى ٤ (يتخطى) — tone للحدود والحشو */
export const scaleTone = ['#D17E30', '#262674', '#004645', '#621244'] as const;
export const scaleBg = ['#FDDCC8', '#C0E1F7', '#C6EEE5', '#FBE122'] as const;
/** نص مقروء على scaleBg — اللون الفاتح وحده لا يكفي كنص صغير */
export const scaleFg = ['#621244', '#262674', '#004645', '#621244'] as const;

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

/**
 * لكل مرحلة لون خاص بها من اللوحة المعتمدة، بنفس ترتيب بطاقات المرحلة في
 * الرئيسية. قاعدة الدليل: الدرجة الفاتحة لا تحمل نصاً أبيض صغيراً، فللأزرق
 * والدافئ onBase داكن.
 */
export type GradeTone = {
  /** الشريط الجانبي والحدود والتعبئة */
  base: string;
  /** نهاية التدرج خلف base */
  deep: string;
  /** خلفية بلاطات الأيقونات والشرائح غير المحددة (شفافة فوق الصورة) */
  tint: string;
  /** نفس درجة tint لكن معتمة فوق الأبيض — لأسطح تحمل نصاً فوق صورة */
  chipBg: string;
  /** نص مقروء فوق base */
  onBase: string;
  /** نص ثانوي فوق base */
  onBaseMuted: string;
  /**
   * درجة أكثر تشبعاً من العائلة نفسها — تُستخدم في تدرّج الهيرو والبطاقة
   * المحددة. مشتقة من اللوحة وليست لوناً جديداً خارجها.
   */
  vivid: string;
  /** درجة توهج مشتقة من العائلة — لظلّ البطاقات العائمة والهالات */
  glow: string;
  /**
   * تدرّج الهيرو: الطرف المضيء أعلى اليمين، ثم base، ثم أفتح/أعمق درجة
   * أسفل اليسار — بحيث يبقى onBase مقروءاً في كل نقطة.
   */
  hero: readonly [string, string, string];
};

export const GRADE_TONES: Record<string, GradeTone> = {
  grade4: {
    base: '#004645', deep: '#003635', tint: 'rgba(0, 70, 69, 0.10)', chipBg: '#E6EDEC',
    onBase: '#FFFFFF', onBaseMuted: 'rgba(255, 255, 255, 0.78)',
    vivid: '#006B66', glow: '#2FB8A4',
    hero: ['#006B66', '#004645', '#003635'],
  },
  grade5: {
    base: '#621244', deep: '#4A0D33', tint: 'rgba(98, 18, 68, 0.10)', chipBg: '#EFE7EC',
    onBase: '#FFFFFF', onBaseMuted: 'rgba(255, 255, 255, 0.78)',
    vivid: '#8A1A60', glow: '#C2428D',
    hero: ['#8A1A60', '#621244', '#4A0D33'],
  },
  grade_int1: {
    base: '#83C3EB', deep: '#262674', tint: 'rgba(131, 195, 235, 0.18)', chipBg: '#E9F4FB',
    onBase: '#171717', onBaseMuted: 'rgba(23, 23, 23, 0.80)',
    vivid: '#2E93D4', glow: '#38BDF8',
    hero: ['#2E93D4', '#83C3EB', '#C0E1F7'],
  },
  grade_int2: {
    base: '#D17E30', deep: '#B86A22', tint: 'rgba(209, 126, 48, 0.14)', chipBg: '#F9EDE2',
    onBase: '#171717', onBaseMuted: 'rgba(23, 23, 23, 0.85)',
    vivid: '#D96A14', glow: '#F5A623',
    hero: ['#D96A14', '#D17E30', '#FDDCC8'],
  },
};

export function gradeTone(gradeId?: string | null): GradeTone {
  return GRADE_TONES[gradeId ?? ''] ?? GRADE_TONES.grade_int1;
}

export const GRADE_COLORS = ['#004645', '#621244', '#83C3EB', '#D17E30', '#83D5C4', '#E5A1C8'] as const;

const GRADE_MAP: Record<string, string> = {
  grade4: '#004645',
  grade5: '#621244',
  grade_int1: '#83C3EB',
  intermediate1: '#83C3EB',
  grade_int2: '#D17E30',
  intermediate2: '#D17E30',
};

export function gradeColor(gradeId: string): string {
  return GRADE_MAP[gradeId] ?? '#004645';
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

/**
 * نغمة المقرر لبطاقة بيضاء بشريط جانبي: base للشريط، وink للأيقونة وكل نص
 * فوق البلاطة — الفاتح من اللوحة لا يُقرأ حبراً فله غامق عائلته.
 */
const SUBJECT_INK: Record<string, string> = {
  drawing_basics: '#004645',
  digital_drawing: '#621244',
  watercolor: '#B86A22',
  cartoon: '#621244',
  saudi_arts: '#262674',
  handicrafts: '#262674',
  character_design: '#004645',
  color_expression: '#B86A22',
};

export type SubjectTone = { base: string; ink: string; tint: string };

export function subjectTone(id: string): SubjectTone {
  const ink = SUBJECT_INK[id] ?? c.primary;
  return { base: subjectColor(id), ink, tint: ink + '1A' };
}

export default { BRAND, c, sp, rad, fnt, fs, lh, sh, GRAD, kindTone, levelTone, scaleTone, scaleBg, scaleFg, PRINT, ORG, GRADE_COLORS, GRADE_TONES, gradeTone, gradeColor, SUBJECT_COLORS, subjectColor, subjectTone };
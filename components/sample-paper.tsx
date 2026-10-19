import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// cast بدل require المشروط: الأخير يجعل الوحدة null على الويب
// فيفشل الرسم كله بـ«Element type is invalid».
const Wv = WebView as unknown as React.ComponentType<{
  originWhitelist?: string[];
  source?: { html: string };
  scrollEnabled?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  style?: unknown;
}>;

/**
 * ورقة A4 تُعرض داخل التطبيق.
 * ---------------------------------------------------------------------------
 * **الجوال** — WebView يعرض الـ HTML، وهو ما سيُرسل للطابعة لاحقاً،
 * فما يراه الزائر هنا هو نفس ما سيخرج من الطابعة حرفياً.
 *
 * **الويب** — `react-native-webview` لا يعمل، فنستعمل `iframe` مباشرةً.
 * (`dangerouslySetInnerHTML` من React Native يُنشئ `<div>` بلا
 * `box-sizing`، فينهار تخطيط الورقة.) التحقق من الكليشة على الجهاز،
 * والويب للمراجعة السريعة أثناء التطوير.
 *
 * الأبعاد بالمليمتر لأن الـ CSS داخل الـ HTML يستخدم `mm`، فالجهة
 * الواحدة تقابل ٢١٠ مم من الورقة الحقيقية — وهذا مفتاح التطابق.
 */

/** التصغير في وضع «ملاءمة العرض» */
const SCALE = 0.42;

export const PAPER_W = 210;
export const PAPER_H = 297;
export const FIT_W = PAPER_W * SCALE;
export const FIT_H = PAPER_H * SCALE;

export function SamplePaper({
  html,
  full,
  isWeb,
}: {
  html: string;
  full: boolean;
  isWeb: boolean;
}) {
  if (isWeb) {
    return <WebPaper html={html} full={full} />;
  }

  return (
    <Wv
      originWhitelist={['*']}
      source={{ html }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      style={full ? styles.paperFull : styles.paper}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  نسخة الويب — iframe بالبكسل                                       */
/* ------------------------------------------------------------------ */

/** التقريب: ١ مم ≈ ٣٫٧٨ بكسل (٩٦dpi)، فنضرب فيه ونقرّب */
const MM_PX = 3.7795;

function WebPaper({ html, full }: { html: string; full: boolean }) {
  const frameW = Math.round(PAPER_W * MM_PX); // ≈٧٩٤ بكسل
  const frameH = Math.round(PAPER_H * MM_PX); // ≈١١٢٣ بكسل

  // نُمرّر العرض بـ zoom في CSS بدل تصغير العنصر: يبقى الخط حادّاً
  // ويُعيد المتصفّح حساب التخطيط كما لو كان بمقاسه الحقيقي.
  const src = useMemo(
    () =>
      html.replace(
        '</head>',
        `<style>html,body{margin:0;padding:0;background:#fff;}
         body{zoom:${full ? 1 : SCALE};}</style></head>`
      ),
    [html, full]
  );

  if (typeof document === 'undefined') {
    // الجوال لا يصل إلى هنا — لكنه يبقى احتياطاً-typesafe
    return <View style={{ width: FIT_W, height: FIT_H, backgroundColor: '#FFF' }} />;
  }

  return (
    <iframe
      title="نموذج الاستمارة"
      srcDoc={src}
      style={{
        width: full ? '100%' : `${Math.round(frameW * SCALE)}px`,
        height: full ? '100%' : `${Math.round(frameH * SCALE)}px`,
        border: 0,
        display: 'block',
        background: '#FFFFFF',
      }}
    />
  );
}

const styles = StyleSheet.create({
  /* الورقة بمقاسها الحقيقي — لا نُصغّر المحتوى أبداً */
  paper: {
    width: PAPER_W,
    height: PAPER_H,
    backgroundColor: '#FFFFFF',
    transform: [{ scale: SCALE }],
  },
  paperFull: {
    width: PAPER_W,
    height: PAPER_H,
    backgroundColor: '#FFFFFF',
  },
});
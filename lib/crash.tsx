import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * مُبلِّغ الانهيار — نسخة تشخيصية فقط.
 * ---------------------------------------------------------------------------
 * المشكلة: التطبيق يفتح ثم يختفي، ولا سبيل لقراءة logcat من جهاز غير موصول
 * بالحاسوب. فنجعل التطبيق **يقول السبب على شاشته**.
 *
 * يغطي حالتين:
 *   ١) خطأ JS — يلتقطه ErrorUtils ويعرض الرسالة والمكدّس كاملاً.
 *   ٢) انهيار أصلي (segfault) — لا يستطيع JS-catching رؤيته، لكن أثره يظهر
 *      عند الإقلاع التالي: العلامة التي يكتبها عند البدء تبقى موجودة.
 *
 * الفحص عند الإقلاع يعتمد على علامتين:
 *   boot:<ts>   يكتبها فور التشغيل، ويمسحها بعد إقلاع ناجح
 *   lastError   آخر خطأ JS
 */

const K_BOOT = 'crash:boot';
const K_ERR = 'crash:lastError';

export type CrashRecord = {
  kind: 'js' | 'native';
  message: string;
  stack?: string;
  at: string;
};

/* ------------------------------------------------------------------ */
/*  التثبيت قبل أي رسم                                                    */
/* ------------------------------------------------------------------ */

/**
 * يلتقط أخطاء JS غير المعالجة.
 *
 * يُستدعى **قبل** أي شيء آخر: أول استيراد سيئ قد يُسقط التطبيق، فالمصيدة
 * يجب أن تكون أول سطر يُنفَّذ في الحزمة.
 */
export function installGlobalHandler(): void {
  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (e: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (h: (e: unknown, isFatal?: boolean) => void) => void;
    };
  };
  const EU = g.ErrorUtils;
  if (!EU?.setGlobalHandler) return;

  const prev = EU.getGlobalHandler?.();
  EU.setGlobalHandler((err: unknown, isFatal?: boolean) => {
    const rec: CrashRecord = {
      kind: 'js',
      message: (err instanceof Error ? `${err.name}: ${err.message}` : String(err)) || 'خطأ غير معروف',
      stack: err instanceof Error && err.stack ? err.stack : undefined,
      at: new Date().toISOString(),
    };
    // لا ننتظر: التخزين غير متزامن وقد لا يُنجَز قبل الموت.
    void AsyncStorage.setItem(K_ERR, JSON.stringify(rec));
    try {
      prev?.(err, isFatal);
    } catch {
      /* لا شيء — نحن على وشك الخروج أصلاً */
    }
  });
}

/* ------------------------------------------------------------------ */
/*  الفحص عند الإقلاع                                                     */
/* ------------------------------------------------------------------ */

export type CrashReport = {
  /** انهيار أصلي: العلامة بقيت من تشغيل سابق */
  nativeCrash: boolean;
  /** آخر خطأ JS مسجَّل */
  lastError: CrashRecord | null;
};

/**
 * عمر يتجاوزه يُعتبر إقلاعاً سليماً لا انهياراً.
 *
 * ثلاث دقائق تكفي للاستخدام العادي؛ وبعدها نتّهم الدخان بالتقادم.
 */
const BOOT_MAX_AGE_MS = 3 * 60 * 1000;

export async function readCrashReport(): Promise<CrashReport> {
  try {
    const [boot, err] = await AsyncStorage.multiGet([K_BOOT, K_ERR]);
    let nativeCrash = false;
    if (boot[1]) {
      const at = Number(boot[1]);
      const age = Date.now() - (Number.isFinite(at) ? at : 0);
      nativeCrash = Number.isFinite(at) && age >= 0 && age < BOOT_MAX_AGE_MS;
      if (!nativeCrash) {
        // علامة قديمة أو تالفة — ننظّفها حتى لا تتكرّر
        await AsyncStorage.removeItem(K_BOOT);
      }
    }

    let lastError: CrashRecord | null = null;
    if (err[1]) {
      try {
        const rec = JSON.parse(err[1]) as CrashRecord;
        // خطأ قديم لا يهمّ بعد إقلاعٍ ناجح
        const age = Date.now() - new Date(rec.at).getTime();
        if (Number.isFinite(age) && age < BOOT_MAX_AGE_MS) lastError = rec;
      } catch {
        lastError = null;
      }
    }
    return { nativeCrash, lastError };
  } catch {
    return { nativeCrash: false, lastError: null };
  }
}

/** يُستدعى بعد إقلاع ناجح وعرض أول إطار */
export async function markBootOk(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([K_BOOT, K_ERR]);
  } catch {
    /* غير حرج */
  }
}

/**
 * يُستدعى في أبكر لحظة ممكنة.
 *
 * ⚠ نكتب **وقتاً لا مجرد وجود**، و`readCrashReport` يرفض ما تجاوز عمره
 *   ستّ دقائق. السبب: أي إغلاق مفاجئ (استدعاء من التبديل، انقطاع، أو
 *   نافذة تمنع الإقلاع الأول) كان يترك العلامة فيُبلَّغ عن انهيار لم
 *   يحدث.часовة  الاستدعاء من `MGLoder` يحدّث العلامة。
 */
export function markBootStarted(): void {
  void AsyncStorage.setItem(K_BOOT, String(Date.now()));
}

/* ------------------------------------------------------------------ */
/*  العرض                                                               */
/* ------------------------------------------------------------------ */

function Block({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{title}</Text>
      <ScrollView horizontal style={s.hScroll}>
        <Text style={s.mono} selectable>
          {body}
        </Text>
      </ScrollView>
    </View>
  );
}

export function CrashScreen({
  report,
  onReset,
}: {
  report: CrashReport;
  onReset: () => void;
}) {
  return (
    <View style={s.root}>
      <Text style={s.h1}>تقرير الانهيار</Text>

      {!report.nativeCrash && !report.lastError && (
        <Text style={s.ok}>لا يوجد انهيار مسجَّل.</Text>
      )}

      {report.nativeCrash && (
        <Block
          title="١) انهيار أصلي"
          body={
            'التطبيق استُدعي ولم يكتمل إقلاعه آخر مرة (العلامة بقيت).\n' +
            'هذا انهيار في الكود الأصلي (Native) لا في JavaScript،\n' +
            'لذلك لا يلتقطه ErrorUtils ولا يحمل مكدّساً.'
          }
        />
      )}

      {report.lastError && (
        <Block
          title={`${report.nativeCrash ? '٢' : '١'}) خطأ JavaScript`}
          body={[
            `الوقت: ${report.lastError.at}`,
            `الرسالة: ${report.lastError.message}`,
            report.lastError.stack ? `المكدّس:\n${report.lastError.stack}` : '(بلا مكدّس)',
          ].join('\n\n')}
        />
      )}

      <Pressable onPress={onReset} style={s.btn} accessibilityRole="button">
        <Text style={s.btnText}>مسح التقرير والمتابعة</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  الحاجز                                                               */
/* ------------------------------------------------------------------ */

type State = { error: Error | null; info: string | null };

export class CrashBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const rec: CrashRecord = {
      kind: 'js',
      message: `${error.name}: ${error.message}`,
      stack: error.stack,
      at: new Date().toISOString(),
    };
    void AsyncStorage.setItem(K_ERR, JSON.stringify(rec));
    // eslint-disable-next-line no-console
    console.error('[crash]', error, info.componentStack);
    this.setState({ info: info.componentStack ?? '' });
  }

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView style={s.root} contentContainerStyle={s.rootInner}>
        <Text style={s.h1}>خطأ أثناء العرض</Text>
        <Block title="الرسالة" body={`${error.name}: ${error.message}`} />
        <Block title="المكدّس" body={error.stack ?? '(بلا مكدّس)'} />
        {!!info && <Block title="شجرة المكوّنات" body={info} />}
      </ScrollView>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1B26', padding: 16 },
  rootInner: { paddingBottom: 40, gap: 12 },
  h1: { color: '#FF6B6B', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'right' },
  ok: { color: '#7FD1A6', fontSize: 15, textAlign: 'right' },
  block: {
    backgroundColor: '#132A38',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  blockTitle: { color: '#9FD3E8', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  hScroll: { maxHeight: 260 },
  mono: {
    color: '#E8F1F5',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'left',
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#1D7A8C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
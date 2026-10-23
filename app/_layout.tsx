import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, I18nManager } from 'react-native';
import { c, fnt } from '@/constants/brand';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { SessionProvider } from '@/lib/session';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  CrashBoundary, CrashScreen, installGlobalHandler,
  markBootOk, markBootStarted, readCrashReport, type CrashReport,
} from '@/lib/crash';

// أول سطر يُنفَّذ في الحزمة: أي استيراد سيئ بعده لن يُلتقط
installGlobalHandler();

/**
 * ⚠ `I18nManager.forceRTL` **لا يُستدعى هنا أبداً**.
 *
 * كان يُنفَّذ في النطاق العام — أي قبل أول رسم. وعلى أندرويد يطلب
 * forceRTL تهيئةً أصلية لتوجيه التخطيط، وهي تمرّ على مُرسِل React،
 * فتبطله قبل أن يبدأ الرسم الأول. النتيجة:
 *
 *   TypeError: Cannot read property 'useState' of null
 *       at RootLayout → useAppFonts → useRuntimeFonts (expo-font)
 *
 * أي أن أول hook في الجذر يجد مُرسِلاً فارغاً. كان يفشل ٥ مرات من ٦
 * (قِيس على جهاز حقيقي عبر adb) لأنّ فيه سباقاً زمنياً.
 *
 * الحل: `allowRTL` ثابت ولا خطر، فيبقى هنا؛ أما `forceRTL` فيُستدعى
 * من داخل `useEffect` بعد انتهاء الرسم الأول — وهو النمط الذي توصي به
 * React Native نفسه.
 */
I18nManager.allowRTL(true);

/** يطبّق RTL بعد أول إطار، فلا يزاحم مُرسِل React */
function RtlGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (I18nManager.isRTL) return;
    I18nManager.forceRTL(true);
  }, []);
  return <>{children}</>;
}

export const unstable_settings = {
  initialRouteName: 'welcome',
};

/**
 * بوابة التشخيص — شبكة أمان أثناء فترةテスト.
 *
 * ⚠ الترتيب هنا هو كل شيء: **نقرأ أولاً ثم نكتب**.
 * كان يُكتب قبل القراءة، فيقرأ المُبلِّغ علامته هو فيُبلّغ عن انهيار
 * لم يحدث أبداً — ويظهر التقرير في كل إقلاع على الويب حيث تقطع
 * النوافذ المنبثقة الإقلاع الأول.
 */
function CrashGate({ children }: { children: React.ReactNode }) {
  const [report, setReport] = useState<CrashReport | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const showing = !!report && !dismissed;

  useEffect(() => {
    let alive = true;

    // ١) اقرأ ما left من الإقلاع السابق قبل أن نطمسه
    void readCrashReport().then((r) => {
      // ٢) ثم ضع علامة هذا الإقلاع
      void markBootStarted();
      if (alive && (r.nativeCrash || r.lastError)) setReport(r);
    });

    return () => {
      alive = false;
    };
  }, []);

  // إقلاع ناجح: ننتظر ثانية ثم نمسح العلامات
  useEffect(() => {
    if (showing) return;
    const t = setTimeout(() => void markBootOk(), 1000);
    return () => clearTimeout(t);
  }, [showing]);

  if (showing) {
    return <CrashScreen report={report!} onReset={() => setDismissed(true)} />;
  }

  return <>{children}</>;
}

/** يحمي المسارات — يمنع الوصول للتطبيق قبل اختيار ترحيب/دخول */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    // شاشات الوصول العام — الزائر يصل إليها بلا حساب
    const openToAll =
      segments[0] === 'welcome' || segments[0] === 'info' || segments[0] === 'samples';
    if (!user && !openToAll) router.replace('/welcome');
    else if (user && segments[0] === 'welcome') router.replace('/(tabs)');
  }, [ready, user, segments, router]);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  // نمرّر المحتوى دائماً — التحويل يتم في useEffect
  return <>{children}</>;
}

export default function RootLayout() {
  const { loaded } = useAppFonts();

  if (!loaded) {
    return <View style={[styles.splash, { backgroundColor: c.bg }]} />;
  }

  return (
    <CrashBoundary>
      <RtlGate>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor={c.bg} />
          <CrashGate>
            <AuthProvider>
              <AuthGate>
                <SessionProvider>
                  <Stack
                    screenOptions={{
                      headerStyle: { backgroundColor: c.bgAlt },
                      headerTitleStyle: { fontFamily: fnt.b, color: c.text },
                      headerTintColor: c.primary,
                      contentStyle: { backgroundColor: c.bg },
                      animation: 'slide_from_left',
                    }}
                  >
                    <Stack.Screen name="welcome" options={{ headerShown: false }} />
                    <Stack.Screen name="info" options={{ headerShown: false }} />
                    {/* نماذج مطبوعة — رحلة الزائر */}
                    <Stack.Screen name="samples" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    {/* الشاشات التالية لها ترويسة خاصة داخلها */}
                    <Stack.Screen name="evaluate" options={{ headerShown: false }} />
                    <Stack.Screen name="student/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="print" options={{ headerShown: false, presentation: 'modal' }} />
                    {/* تقرير الستة أسابيع — شاشة تحرير بترويسة خاصة */}
                    <Stack.Screen name="six-week-report" options={{ headerShown: false }} />
                  </Stack>
                </SessionProvider>
              </AuthGate>
            </AuthProvider>
          </CrashGate>
        </SafeAreaProvider>
      </RtlGate>
    </CrashBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

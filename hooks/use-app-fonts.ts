import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { fnt } from '@/constants/brand';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * خطوط Cairo مضمّنة داخل الحزمة — يعمل التطبيق بدون إنترنت.
 */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    [fnt.r]: Cairo_400Regular,
    [fnt.m]: Cairo_500Medium,
    [fnt.sb]: Cairo_600SemiBold,
    [fnt.b]: Cairo_700Bold,
    [fnt.eb]: Cairo_800ExtraBold,
    [fnt.bk]: Cairo_900Black,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  return { loaded: loaded || !!error, error };
}

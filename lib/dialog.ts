/**
 * حوار التأكيد — يعمل بنفس السلوك على الجوال والويب.
 *
 * Alert.alert على الويب (react-native-web) لا يفعل شيئاً، فحوار التأكيد
 * لا يظهر أبداً عند اختبار التطبيق في المتصفح. نستعمل window.confirm هناك.
 */

import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message?: string,
  opts?: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
): Promise<boolean> {
  const confirmLabel = opts?.confirmLabel ?? 'موافق';
  const cancelLabel = opts?.cancelLabel ?? 'إلغاء';

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(text));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: opts?.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
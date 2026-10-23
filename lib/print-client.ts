/**
 * إخراج HTML للطباعة — نفس مسار شاشة الطباعة:
 *   ويب: نافذة جديدة تطبع الاستمارة نفسها، أو iframe إن مُنعت النوافذ.
 *   جوال: PDF عبر expo-print ثم مشاركة.
 */

import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function emitHtml(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      const go = () => setTimeout(() => { w.focus(); w.print(); }, 150);
      if (w.document.fonts) w.document.fonts.ready.then(go);
      else go();
      return;
    }

    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;top:0;right:100%;width:210mm;height:297mm;border:0;';
    f.srcdoc = html;
    f.addEventListener('load', () => {
      const win = f.contentWindow;
      if (win) setTimeout(() => win.print(), 150);
    });
    document.body.appendChild(f);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  } else {
    Alert.alert('تم', 'تم إنشاء ملف PDF.');
  }
}

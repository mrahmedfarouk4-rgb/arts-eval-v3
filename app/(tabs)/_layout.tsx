import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { c } from '@/constants/brand';
import { NavRail, RAIL_W, LTR, RTL } from '@/components/nav-rail';

/**
 * تخطيط التنقّل: الشريط الجانبي على اليمين + المحتوى.
 *
 * ⚠ ملاحظة مهمة حول RTL:
 * في React Native مع forceRTL تتحوّل خصائص left/right إلى منطقية
 * (start/end)، فيصبح right:0 يعني «اليسار» على أندرويد.
 * لذلك نثبّت اتجاه كل حاوية صراحةً بـ direction بدل الاعتماد على RTL.
 *
 *   root      → ltr  (ترتيب الأبناء فيزيائي: أول = يسار)
 *   content   → rtl  (حتى تبقى شاشات التطبيق عربية)
 *   railSlot  → ltr  (ليكون الشريط ثانياً = يميناً فيزيائياً)
 */
export default function RailLayout() {
  return (
    <View style={s.root}>
      <View style={s.content}>
        <Slot />
      </View>

      <View style={s.railSlot}>
        <NavRail />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    ...LTR,
    backgroundColor: c.bg,
  },
  content: {
    flex: 1,
    ...RTL,
    backgroundColor: c.bg,
    overflow: 'hidden',
  },
  railSlot: {
    width: RAIL_W,
    ...LTR,
  },
});
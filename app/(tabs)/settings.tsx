import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CRITERIA_BLOCKS } from '@/constants/criteria.data';
import { APP, EVAL_KINDS, CRITERIA_COUNT } from '@/constants/criteria';
import { c, sp, rad, fnt, fs, sh, BRAND } from '@/constants/brand';
import { Button, Card, Badge, Section, BrandBar } from '@/components/pro-ui';
import { TeachersPanel } from '@/components/TeachersPanel';
import { useSession } from '@/lib/session';
import { confirmAction } from '@/lib/dialog';
import { UNITS_PER_SUBJECT } from '@/constants/plans';
import { useAuth } from '@/lib/auth';
import {
  getSettings,
  updateSettings,
  pendingSyncCount,
  sync,
  exportAll,
  clearAll,
  clearEmptyPlan,
  supabaseReady,
  listStudents,
  listEvaluations,
  type Settings,
} from '@/lib/store';

export default function SettingsScreen() {
  const router = useRouter();
  const { teacherName, setTeacherName, editMode, setEditMode, refreshSettings,
        planInfo, buildPlan } = useSession();
  const { user, authenticated, logout, adminPwIsDefault } = useAuth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [teacherDraft, setTeacherDraft] = useState(teacherName ?? '');
  const [stats, setStats] = useState({ students: 0, evals: 0 });

  const refresh = async () => {
    const [s, p, st, ev] = await Promise.all([
      getSettings(),
      pendingSyncCount(),
      listStudents(true),
      listEvaluations(true),
    ]);
    setSettings(s);
    setPending(p);
    setStats({ students: st.length, evals: ev.length });
    setTeacherDraft(s.teacher_name ?? '');
  };

  useEffect(() => {
    refresh();
  }, []);


  const onSync = async () => {
    setBusy(true);
    try {
      const r = await sync();
      if (r.ok) {
        Alert.alert('تمت المزامنة', `تم رفع ${r.pushed} عنصر وتحديث البيانات.`);
      } else {
        Alert.alert('تعذرت المزامنة', r.error ?? 'خطأ غير معروف');
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const json = await exportAll();
      await Share.share({ message: json, title: `نسخة احتياطية — ${ORG_TITLE}` });
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّر التصدير');
    } finally {
      setBusy(false);
    }
  };

  const onClear = async () => {
    const ok = await confirmAction(
      'حذف كل البيانات',
      'سيتم حذف جميع الطلاب والتقييمات نهائياً من هذا الجهاز. هل أنت متأكد؟',
      { confirmLabel: 'حذف كل شيء', destructive: true }
    );
    if (!ok) return;
    await clearAll();
    await refreshSettings();
    await refresh();
    Alert.alert('تم', 'تم حذف جميع البيانات.');
  };

  const criteriaStats = CRITERIA_COUNT;

  const ready = supabaseReady();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar title="الإعدادات" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* تحذير كلمة سر المشرف الافتراضية */}
        {adminPwIsDefault && (
          <Card padding={sp.md} style={{ borderColor: 'rgba(178,58,58,0.28)', backgroundColor: c.errBg }}>
            <View style={s.row}>
              <Ionicons name="warning-outline" size={18} color={c.err} />
              <Text style={[s.cardHint, { color: c.err, flex: 1 }]}>
                كلمة سر المشرف ما زالت «admin» المعروفة. غيّرها من «إعداد المعلمين»
                حتى لا يفتح أحد هذه الشاشة.
              </Text>
            </View>
          </Card>
        )}

        {/* المعلم — يأتي من الحساب */}
        <Section
          title="المعلم"
          hint={user ? 'يملأه حسابك تلقائياً — عدّله إن أردت' : 'سجّل الدخول ليملأ اسمك في الاستمارات'}
        >
          {user ? (
            <Card padding={sp.md}>
              <View style={s.row}>
                <View style={s.rowIcon}>
                  <Ionicons name="person-circle-outline" size={18} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{user.name}</Text>
                  <Text style={s.cardHint}>
                    {user.username} · {user.role === 'admin' ? 'مشرف' : 'معلم'}
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <View style={s.inputRow}>
              <View style={s.inputBox}>
                <Ionicons name="person-outline" size={16} color={c.text4} />
                <TextInput
                  value={teacherDraft}
                  onChangeText={setTeacherDraft}
                  placeholder="اسم المعلم / المعلمة"
                  placeholderTextColor={c.text4}
                  style={s.input}
                />
              </View>
              <Button
                label="حفظ"
                size="sm"
                onPress={async () => {
                  await setTeacherName(teacherDraft);
                  await refresh();
                }}
              />
            </View>
          )}
        </Section>

        {/* وضع التعديل */}
        <Section
          title="وضع التعديل"
          hint={
            editMode
              ? 'مفعّل — يمكنك الحفظ والتعديل'
              : authenticated
                ? 'اضغط للتفعيل — أنت مسجّل الدخول'
                : 'يتطلب تسجيل دخول'
          }
        >
          <Card padding={sp.md}>
            <Pressable
              onPress={async () => {
                if (editMode) {
                  await setEditMode(false);
                  return;
                }
                if (!authenticated) {
                  router.push('/welcome' as never);
                  return;
                }
                await setEditMode(true);
                await refreshSettings();
              }}
              style={({ pressed }) => [s.toggleRow, pressed && { opacity: 0.8 }]}
              accessibilityRole="switch"
              accessibilityState={{ checked: editMode }}
            >
              <View style={[s.toggleIcon, editMode && { backgroundColor: c.okBg, borderColor: 'rgba(15,122,79,0.28)' }]}>
                <Ionicons
                  name={editMode ? 'lock-open' : authenticated ? 'lock-closed' : 'person-circle-outline'}
                  size={18}
                  color={editMode ? c.ok : authenticated ? c.text3 : c.warn}
                />
              </View>
              <Text style={[s.toggleLabel, editMode && { color: c.ok }]}>
                {editMode
                  ? 'وضع التعديل مُفعّل'
                  : authenticated
                    ? 'اضغط للتفعيل'
                    : 'سجّل الدخول للتفعيل'}
              </Text>
              <View style={[s.switch, editMode && s.switchOn]}>
                <View style={[s.knob, editMode && s.knobOn]} />
              </View>
            </Pressable>
          </Card>
        </Section>

        {/* إدارة المعلمين — للمشرف */}
        <TeachersPanel />

        {/* الجلسة */}
        <Section title="الجلسة">
          <Card padding={0}>
            <Line icon="person-circle-outline" label="المستخدم" value={user?.username ?? 'زائر'} />
            <Line
              icon={authenticated ? 'shield-checkmark-outline' : 'eye-outline'}
              label="الصلاحية"
              value={authenticated ? (user?.role === 'admin' ? 'مشرف — كل المقررات' : 'معلم — مقرراته المسندة') : 'بدون تسجيل دخول'}
              color={authenticated ? c.ok : c.text3}
            />
            <Line
              icon="albums-outline"
              label="النماذج المطبوعة"
              value="عرض"
              color={c.primary}
              last
              onPress={() => router.push('/samples' as never)}
            />
          </Card>
          {authenticated && (
            <Button
              label="تسجيل الخروج"
              variant="ghost"
              icon="log-out-outline"
              onPress={() => {
                logout();
                Alert.alert('تم', 'تم تسجيل الخروج.');
              }}
              full
            />
          )}
        </Section>

        {/* البيانات */}
        <Section title="البيانات على هذا الجهاز" count={stats.students + stats.evals}>
          <View style={s.statRow}>
            <StatBox value={stats.students} label="طالب" />
            <StatBox value={stats.evals} label="تقييم" />
            <StatBox value={pending} label="بانتظار المزامنة" tone={pending > 0 ? 'warn' : undefined} />
          </View>
        </Section>

        {/* المزامنة */}
        <Section title="المزامنة مع السيرفر">
          <Card padding={sp.lg}>
            <View style={s.row}>
              <View style={s.rowIcon}>
                <Ionicons name="cloud-outline" size={17} color={ready ? c.primary : c.text4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>
                  {ready ? 'المزامنة مهيّأة' : 'غير مهيّأة'}
                </Text>
                <Text style={s.cardHint}>
                  {ready
                    ? 'البيانات تُرفع عند توفر الإنترنت'
                    : 'التطبيق يعمل محلياً بالكامل بدون إنترنت'}
                </Text>
              </View>
              <Badge
                label={settings?.sync_enabled ? 'مفعّلة' : 'معطّلة'}
                color={settings?.sync_enabled ? c.ok : c.text3}
                bg={settings?.sync_enabled ? c.okBg : c.bgLift}
              />
            </View>

            {ready && (
              <Pressable
                onPress={async () => {
                  await updateSettings({ sync_enabled: !settings?.sync_enabled });
                  await refresh();
                }}
                style={({ pressed }) => [s.checkRow, pressed && { opacity: 0.75 }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!settings?.sync_enabled }}
              >
                <Text style={s.checkLabel}>تفعيل المزامنة</Text>
                <Ionicons
                  name={settings?.sync_enabled ? 'checkbox' : 'square-outline'}
                  size={21}
                  color={settings?.sync_enabled ? c.primary : c.text4}
                />
              </Pressable>
            )}

            <Button
              label="مزامنة الآن"
              variant="surface"
              icon="sync-outline"
              onPress={onSync}
              loading={busy}
              disabled={!ready}
              full
              style={{ marginTop: sp.md }}
            />
            {!!settings?.last_sync && (
              <Text style={s.note}>
                آخر مزامنة: {settings.last_sync.slice(0, 16).replace('T', ' ')}
              </Text>
            )}
          </Card>
        </Section>

        {/* خطة التقييم السنوية */}
        <Section
          title="خطة التقييم السنوية"
          hint="استمارات فارغة جاهزة لكل المقررات والفصول"
          count={planInfo?.total ?? 0}
        >
          <Card padding={sp.lg}>
            <View style={s.row}>
              <View style={s.rowIcon}>
                <Ionicons name="calendar-outline" size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>
                  {planInfo?.total
                    ? `${planInfo.total} استمارة جاهزة`
                    : 'لم تُولَّد الخطة بعد'}
                </Text>
                <Text style={s.cardHint}>
                  لكل طالب في كل مقرر: وحدات × تكويني + مرحلي + ختامي.
                  المعلم يدخل لاحقاً ويضع العلامات.
                </Text>
              </View>
            </View>

            <View style={s.statRow}>
              <StatBox value={UNITS_PER_SUBJECT.drawing_basics} label="وحدات الرسم" />
              <StatBox value={3} label="وحدات باقي المقررات" />
              <StatBox value={2} label="تقييم نهائي لكل مقرر" />
            </View>

            <Button
              label="توليد خطة العام"
              variant="surface"
              icon="download-outline"
              onPress={async () => {
                setBusy(true);
                try {
                  const r = await buildPlan();
                  await refresh();
                  Alert.alert(
                    r.created ? 'تمت الإضافة' : 'الخطة موجودة',
                    r.created
                      ? `أُضيفت ${r.created} استمارة فارغة. المجموع الآن ${r.total}.`
                      : `كل الاستمارات موجودة مسبقاً (${r.total}).`
                  );
                } finally {
                  setBusy(false);
                }
              }}
              loading={busy}
              full
              style={{ marginTop: sp.md }}
            />

            {editMode && (
              <Button
                label="حذف الاستمارات الفارغة"
                variant="danger"
                icon="trash-outline"
                onPress={async () => {
                  const ok = await confirmAction(
                    'حذف الاستمارات الفارغة',
                    'ستُحذف كل الاستمارات التي لم تُوضع فيها علامات. التقييمات المكتملة لن تتأثر.',
                    { confirmLabel: 'حذف', destructive: true }
                  );
                  if (!ok) return;
                  const n = await clearEmptyPlan();
                  await buildPlan();
                  await refresh();
                  Alert.alert('تم', `حُذفت ${n} استمارة فارغة.`);
                }}
                full
                style={{ marginTop: sp.sm }}
              />
            )}
          </Card>
        </Section>

        {/* بنود التقييم */}
        <Section title="بنود التقييم المضمّنة" count={criteriaStats}>
          <Card padding={sp.lg}>
            <Text style={s.cardHint}>
              مستخرجة من وثائق المشروع الرسمية — متاحة بدون إنترنت
            </Text>
            <View style={s.statRow}>
              <StatBox value={CRITERIA_BLOCKS.length} label="مجموعة" />
              <StatBox value={criteriaStats} label="بند" />
              <StatBox value={EVAL_KINDS.length} label="نوع تقييم" />
            </View>
          </Card>
        </Section>

        {/* النسخ الاحتياطي */}
        <Section title="النسخ الاحتياطي">
          <Card padding={sp.lg}>
            <Text style={s.cardHint}>
              تُصدَّر البيانات كنص JSON يمكن حفظه أو إرساله.
            </Text>
            <Button
              label="تصدير نسخة احتياطية"
              variant="surface"
              icon="download-outline"
              onPress={onExport}
              loading={busy}
              full
              style={{ marginTop: sp.md }}
            />
          </Card>
        </Section>

        {/* منطقة خطرة */}
        {editMode && (
          <Section title="منطقة الخطر">
            <Card padding={sp.lg} style={{ borderColor: 'rgba(178,58,58,0.25)', backgroundColor: c.errBg }}>
              <Text style={[s.cardHint, { color: c.err }]}>
                حذف جميع الطلاب والتقييمات من هذا الجهاز نهائياً.
              </Text>
              <Button
                label="حذف كل البيانات"
                variant="danger"
                icon="trash-outline"
                onPress={onClear}
                full
                style={{ marginTop: sp.md }}
              />
            </Card>
          </Section>
        )}

        <View style={s.footer}>
          <Text style={s.footerTitle}>{BRAND.academy}</Text>
          <Text style={s.footerLine}>{APP.title}</Text>
          <Text style={s.footerLine}>{APP.subtitle}</Text>
          <Text style={[s.footerLine, { color: c.primary }]}>تصميم: {APP.author}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ORG_TITLE = 'منصة تقييم الفنون البصرية';

/* ------------------------------------------------------------------ */

function StatBox({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: 'warn';
}) {
  const color = tone === 'warn' && value > 0 ? c.warn : c.primary;
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Line({
  icon,
  label,
  value,
  color,
  last,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.line, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={16} color={c.primary} />
      </View>
      <Text style={s.lineLabel}>{label}</Text>
      <Text style={[s.lineValue, color ? { color } : undefined]}>{value}</Text>
      {!!onPress && <Ionicons name="chevron-back" size={15} color={c.text4} />}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: sp.lg, paddingBottom: sp.huge, gap: sp.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  rowIcon: {
    width: 36, height: 36, borderRadius: rad.sm,
    backgroundColor: c.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  cardHint: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, lineHeight: 20 },

  inputRow: { flexDirection: 'row', gap: sp.sm, alignItems: 'center' },
  inputBox: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 42,
  },
  input: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.sm,
    color: c.text, textAlign: 'right',
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  toggleIcon: {
    width: 40, height: 40, borderRadius: rad.sm,
    backgroundColor: c.bgLift, borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { flex: 1, fontFamily: fnt.m, fontSize: fs.sm, color: c.text2 },

  switch: {
    width: 46, height: 27, borderRadius: 14,
    backgroundColor: c.lineHi, padding: 3, justifyContent: 'center',
  },
  switchOn: { backgroundColor: c.ok },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#FFF', ...sh.sm },
  knobOn: { alignSelf: 'flex-end' },

  line: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingHorizontal: sp.md, paddingVertical: sp.md,
    borderBottomWidth: 1, borderBottomColor: c.line,
  },
  lineLabel: { flex: 1, fontFamily: fnt.m, fontSize: fs.sm, color: c.text2 },
  lineValue: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },

  statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },
  statBox: {
    flex: 1,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md,
    alignItems: 'center',
  },
  statValue: { fontFamily: fnt.bk, fontSize: fs.xl },
  statLabel: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, marginTop: 2, textAlign: 'center' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: sp.md, paddingVertical: sp.sm,
  },
  checkLabel: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text },
  note: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, marginTop: sp.md },

  footer: { alignItems: 'center', gap: 3, paddingTop: sp.lg },
  footerTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text2, marginBottom: 3 },
  footerLine: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text4 },
});
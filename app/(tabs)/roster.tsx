import { LiftPressable, useToneVeil } from '@/components/motion';
import { PageHero, SectionHead } from '@/components/page-hero';
import { Badge, BrandBar, Button, Card, Empty, Stat, StepBar } from '@/components/pro-ui';
import { BottomSheet } from '@/components/sheet';
import { SkeletonRows } from '@/components/skeleton';
import { BRAND_TONE, c, fnt, fs, gradeTone, kindTone, rad, sh, sp } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import {
    formTotals,
    gradeName,
    kindMeta,
    subjectName,
    sumScores
} from '@/constants/criteria';
import { selectHaptic, tapHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import {
    listStudentsByGrade, plannedForSubject,
    bulkFillEvaluations, deleteEvaluation,
    type BulkFillTarget,
    type Evaluation,
    type Student
} from '@/lib/store';
import { confirmAction } from '@/lib/dialog';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    Alert,
    View
} from 'react-native';
import Animated, {
    Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * سهم الصف — يدور إلى الأسفل عند فتح الطالب.
 * الدوران على الغلاف لا على الأيقونة نفسها (Ionicons نصّ لا يقبل التحويل).
 */
function RowChevron({ open }: { open: boolean }) {
  const v = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(open ? 1 : 0, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [open, v]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${-90 * v.value}deg` }] }));
  return (
    <Animated.View style={a}>
      <Ionicons name="chevron-back" size={17} color={c.text4} />
    </Animated.View>
  );
}

/**
 * الخطوة ٤ — طلاب الخلية (مقرر + نوع تقييم).
 * الضغط على طالب يفتح الاستمارة.
 */
export default function RosterScreen() {
  const router = useRouter();
  const {
    gradeId, term, subjectId, kind, setSubject, setKind, editMode, teacherName } = useSession();

  const tone = gradeId ? gradeTone(gradeId) : BRAND_TONE;

  /** ستارة لون المرحلة قبل فتح الاستمارة — قبل أي return شرطي */
  const { run: veilRun, style: veilStyle, color: veilColor, reset: veilReset } = useToneVeil(rad.xl);
  useFocusEffect(useCallback(() => { veilReset(); }, [veilReset]));

  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Record<string, Evaluation[]>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const ready = !!(gradeId && subjectId);

  const load = useCallback(async () => {
    if (!gradeId || !subjectId) return;
    setLoading(true);
    try {
      const list = await listStudentsByGrade(gradeId);
      setStudents(list);
      const acc: Record<string, Evaluation[]> = {};
      await Promise.all(
        list.map(async (s) => {
          acc[s.id] = await plannedForSubject({
            studentId: s.id, gradeId, subjectId, term, kind: kind ?? undefined });
        })
      );
      setPlans(acc);
    } finally {
      setLoading(false);
    }
  }, [gradeId, subjectId, term, kind]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const [bulkBusy, setBulkBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () => students.filter((s) => (query.trim() ? s.name.includes(query.trim()) : true)),
    [students, query]
  );

  /**
   * مجموعات الاستمارات (حسب نوع + وحدة + عنوان) — لتعبئة جماعية
   * لكل الطلاب. تُستخرج من plans (كل طالب يحمل نفس المجموعة).
   */
  const formGroups = useMemo(() => {
    const groups = new Map<string, { key: string; kind: string; label: string; students: string[] }>();
    for (const stu of students) {
      const forms = plans[stu.id] ?? [];
      for (const f of forms) {
        if (kind && f.evaluation_type !== kind) continue;
        const key = `${f.evaluation_type}|${f.unit ?? ''}|${f.label ?? ''}`;
        let g = groups.get(key);
        if (!g) {
          g = { key, kind: f.evaluation_type, label: f.label ?? '', students: [] };
          groups.set(key, g);
        }
        if (!g.students.includes(stu.id)) g.students.push(stu.id);
      }
    }
    return [...groups.values()];
  }, [students, plans, kind]);

  const bulkFill = async (group: { kind: string; label: string; students: string[] }, value: number) => {
    if (!gradeId || !subjectId) return;
    const k = group.kind as 'weekly' | 'periodic' | 'final';
    const ft = formTotals(k, gradeId, subjectId, term);
    const scores: Record<string, number> = {};
    for (const x of ft.criteria) {
      if (k === 'final') {
        const max = x.max;
        const pass = x.pass ?? max;
        if (value === 4) scores[x.id] = max;
        else if (value === 3) scores[x.id] = pass;
        else if (value === 2) scores[x.id] = Math.max(1, pass - 1);
        else scores[x.id] = 1;
      } else {
        scores[x.id] = value;
      }
    }
    const levelLabel =
      value === 4 ? 'يتخطى' : value === 3 ? 'حقق' : value === 2 ? 'يقترب' : 'دون الهدف';
    const ok = await confirmAction(
      `تعبئة جماعية — ${levelLabel}`,
      `سيُطبَّق «${levelLabel}» على ${group.students.length} طالب في «${group.label}». هل تريد المتابعة؟`,
      { confirmLabel: 'تعبئة' }
    );
    if (!ok) return;
    setBulkBusy(group.kind + group.label);
    try {
      const targets: BulkFillTarget[] = group.students
        .map((sid) => {
          const ev = (plans[sid] ?? []).find(
            (f) => f.evaluation_type === group.kind && (f.label ?? '') === group.label
          );
          return ev ? { studentId: sid, evalId: ev.id, label: group.label } : null;
        })
        .filter(Boolean) as BulkFillTarget[];
      await bulkFillEvaluations({
        gradeId,
        subjectId,
        term,
        kind: k,
        scores,
        targets,
        teacher_name: teacherName,
      });
      await load();
      Alert.alert('تم', `تم تعبئة ${targets.length} استمارة بـ«${levelLabel}».`);
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّرت التعبئة');
    } finally {
      setBulkBusy(null);
    }
  };

  const bulkClear = async (group: { kind: string; label: string; students: string[] }) => {
    const ok = await confirmAction(
      'مسح تقييمات كل الطلاب',
      `سيُحذف تقييم «${group.label}» لـ ${group.students.length} طالب (لإعادة التقييم). هل تريد المتابعة؟`,
      { confirmLabel: 'مسح', destructive: true }
    );
    if (!ok) return;
    setBulkBusy(group.kind + group.label);
    try {
      for (const sid of group.students) {
        const ev = (plans[sid] ?? []).find(
          (f) => f.evaluation_type === group.kind && (f.label ?? '') === group.label
        );
        if (ev && !ev.planned) {
          await deleteEvaluation(ev.id);
        } else if (ev && ev.planned) {
          // planned empty entry: just clear scores via saveEvaluation with empty? 
          // Instead, leave as-is (already empty). Nothing to do.
        }
      }
      await load();
      Alert.alert('تم', 'تم المسح.');
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّر المسح');
    } finally {
      setBulkBusy(null);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <BrandBar title="اختر المقرر" onBack={() => router.replace('/')} />
        <Empty icon="alert-circle-outline" title="لم يكتمل الاختيار" />
      </SafeAreaView>
    );
  }

  /* إحصاء عام على كل المقررات المهيّأة للطالب في هذا الفصل */
  const allForms = Object.values(plans).flat();
  const filled = allForms.filter((f) => Object.keys(f.scores ?? {}).length > 0).length;

  /* الطالب المفتوح في اللوح السفلي */
  const active = openId ? students.find((x) => x.id === openId) ?? null : null;
  const activeForms = active ? plans[active.id] ?? [] : [];
  const activeDone = activeForms.filter((f) => Object.keys(f.scores ?? {}).length > 0).length;
  const nextForm = activeForms.find((f) => Object.keys(f.scores ?? {}).length === 0);

  const openForm = (stu: Student, ev: Evaluation) => {
    veilRun(tone.deep, () => {
      router.push({
        pathname: '/evaluate',
        params: {
          studentId: stu.id,
          studentName: stu.name,
          gradeId: gradeId!,
          subjectId: subjectId!,
          kind: ev.evaluation_type,
          evalId: ev.id,
          term: ev.term,
          from: '/roster' } });
    });
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHero
          tone={tone}
          eyebrow="الخطوة ٤ · الطلاب"
          title={subjectName(subjectId!)}
          sub={`${gradeName(gradeId!)}${kind ? ` · ${kindMeta(kind).name}` : ''}`}
          // الرجوع لا يمسح المقرر: الاختيار معلّق في الجلسة، ولو مسحناه
          // لعادت شاشة نوع التقييم تقول «لم يُحدَّد المقرر بعد» فور الرجوع.
          onBack={() => router.back()}
        />

        {/* إحصاء الخطة */}
        <View style={s.statBar}>
          <Stat value={students.length} label="طالب" />
          <View style={s.vRule} />
          <Stat value={filled} label="استمارة مُعبّأة" color={c.okText} />
          <View style={s.vRule} />
          <Stat value={allForms.length - filled} label="بانتظار المعلم" color={c.warnText} />
        </View>

        {/* بحث */}
        <View style={[s.search, focus && s.searchFocus]}>
          <Ionicons name="search" size={16} color={focus ? c.primary : c.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="ابحث عن طالب..."
            placeholderTextColor={c.text4}
            style={s.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.text4} />
            </Pressable>
          )}
        </View>

        {!loading && (
          <SectionHead
            title="الطلاب"
            hint="اضغط طالباً لعرض استماراته"
            count={filtered.length}
            tone={tone}
          />
        )}

        {loading ? (
          <SkeletonRows rows={4} />
        ) : filtered.length === 0 ? (
          <Empty
            icon="people-outline"
            title={query ? 'لا نتائج' : 'لا يوجد طلاب'}
            message={
              query
                ? 'جرّب كلمة بحث أخرى'
                : editMode
                  ? 'أضف الطلاب من قسم «الطلاب» ثم عد هنا'
                  : 'فعّل وضع التعديل لإضافة الطلاب'
            }
            action={
              !query && editMode ? (
                <Button
                  label="إدارة الطلاب"
                  icon="people-outline"
                  onPress={() => router.push('/students' as never)}
                />
              ) : undefined
            }
          />
        ) : (
          <View style={{ gap: sp.sm }}>
            {filtered.map((stu, i) => {
              const forms = plans[stu.id] ?? [];
              const open = openId === stu.id;
              const doneCount = forms.filter((f) => Object.keys(f.scores ?? {}).length > 0).length;
              const allDone = forms.length > 0 && doneCount === forms.length;
              const rowColor = [c.primary, c.brandSecondary, c.orange, c.mint, c.blueMid, c.pinkMid, c.peach][i % 7];

              return (
                <Animated.View
                  key={stu.id}
                  entering={FadeInDown.delay(Math.min(i * 45, 270)).duration(360)}
                >
                  <Card padding={0}>
                    {/* رأس الطالب — يفتح لوح الاستمارات */}
                    <Pressable
                      onPress={() => {
                        selectHaptic();
                        setOpenId(open ? null : stu.id);
                      }}
                      style={({ pressed }) => [s.head, { borderLeftWidth: 4, borderLeftColor: rowColor }, pressed && { opacity: 0.85 }]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={`${stu.name} — ${doneCount} من ${forms.length}`}
                    >
                      <View style={[s.avatar, doneCount > 0 && { backgroundColor: c.okBg }]}>
                        <Text style={[s.avatarText, doneCount > 0 && { color: c.okText }]}>
                          {stu.name.charAt(0)}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={s.name} numberOfLines={1}>{stu.name}</Text>
                        <Text style={[s.sub, doneCount === 0 && { color: c.warnText }]}>
                          {doneCount === 0
                            ? `${forms.length} استمارة جاهزة · لم يُقيَّم`
                            : `${doneCount} من ${forms.length} استمارة معبّأة`}
                        </Text>
                        {/* نقاط التقدّم — لمحة عن كل استمارة بلا فتح اللوح */}
                        {forms.length > 0 && (
                          <View style={s.dots}>
                            {forms.map((f) => {
                              const has = Object.keys(f.scores ?? {}).length > 0;
                              return (
                                <View
                                  key={f.id}
                                  style={[
                                    s.dot,
                                    { backgroundColor: has ? kindTone[f.evaluation_type].c : c.lineHi },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        )}
                      </View>

                      {allDone ? (
                        <Animated.View entering={ZoomIn.duration(320)} style={s.doneMark}>
                          <Ionicons name="checkmark" size={14} color={c.gold} />
                        </Animated.View>
                      ) : doneCount > 0 ? (
                        <Badge label={`${doneCount}/${forms.length}`} color={c.okText} bg={c.okBg} />
                      ) : null}
                      <RowChevron open={open} />
                    </Pressable>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* تعبئة جماعية — كل الطلاب */}
        {formGroups.length > 0 && (
          <SectionHead
            title="تعبئة جماعية — كل الطلاب"
            hint="اختر استمارة ومستوى لتطبيقه على جميع الطلاب"
            count={formGroups.length}
            tone={tone}
          />
        )}
        {formGroups.length > 0 && (
          <View style={{ gap: sp.sm }}>
            {formGroups.map((g) => {
              const kindLabel =
                g.kind === 'weekly' ? 'تكويني' : g.kind === 'periodic' ? 'مرحلي' : 'ختامي';
              const busy = bulkBusy === g.kind + g.label;
              return (
                <Card key={g.key} padding={sp.md}>
                  <View style={{ gap: sp.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
                      <View style={[s.kindDot, { backgroundColor: kindTone[g.kind as 'weekly'].c }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.name} numberOfLines={1}>{kindLabel} · {g.label}</Text>
                        <Text style={s.sub}>{g.students.length} طالب</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: sp.xs, flexWrap: 'wrap' }}>
                      {[
                        { v: 4, label: 'يتخطى', color: kindTone[g.kind as 'weekly'].c },
                        { v: 3, label: 'حقق', color: c.okText },
                        { v: 2, label: 'يقترب', color: c.warnText },
                        { v: 1, label: 'دون الهدف', color: c.errText },
                      ].map((o) => (
                        <Pressable
                          key={o.v}
                          disabled={!!bulkBusy}
                          onPress={() => bulkFill(g, o.v)}
                          style={({ pressed }) => [
                            s.bulkBtn,
                            { borderColor: o.color },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text style={[s.bulkBtnText, { color: o.color }]}>{o.label}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        disabled={!!bulkBusy}
                        onPress={() => bulkClear(g)}
                        style={({ pressed }) => [s.bulkBtn, { borderColor: c.text4 }, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[s.bulkBtnText, { color: c.text4 }]}>مسح</Text>
                      </Pressable>
                    </View>
                    {busy && (
                      <Text style={[s.sub, { color: c.primary }]}>جارٍ التعبئة...</Text>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* تغيير نوع التقييم / المقرر */}
        <View style={s.changeRow}>
          <LiftPressable
            onPress={() => router.replace('/kind' as never)}
            lift={0}
            hoverScale={1.02}
            pressScale={0.96}
            style={s.changeBtn}
            accessibilityLabel="تغيير نوع التقييم"
          >
            <Ionicons name="layers-outline" size={16} color={c.primary} />
            <Text style={s.changeText}>تغيير نوع التقييم</Text>
          </LiftPressable>

          <LiftPressable
            onPress={() => { setSubject(null); setKind(null); router.replace('/term' as never); }}
            lift={0}
            hoverScale={1.02}
            pressScale={0.96}
            style={s.changeBtn}
            accessibilityLabel="تغيير المقرر"
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={c.primary} />
            <Text style={s.changeText}>تغيير المقرر</Text>
          </LiftPressable>
        </View>

        <StepBar active={3} />
      </ScrollView>

      {/* ===== لوح استمارات الطالب ===== */}
      <BottomSheet
        visible={!!active}
        onClose={() => setOpenId(null)}
        title={active?.name}
        subtitle={
          active
            ? `${activeDone} من ${activeForms.length} استمارة معبّأة · ${kind ? kindMeta(kind).name : ''}`
            : undefined
        }
      >
        {activeForms.length === 0 ? (
          <Text style={s.noForms}>لا توجد استمارات مهيّأة لهذا المقرر</Text>
        ) : (
          activeForms.map((ev) => (
            <SheetFormRow
              key={ev.id}
              ev={ev}
              onOpen={() => {
                if (!active) return;
                setOpenId(null);
                tapHaptic();
                openForm(active, ev);
              }}
            />
          ))
        )}

        {!!active && !!nextForm && (
          <Button
            label="متابعة أول استمارة ناقصة"
            icon="play"
            full
            onPress={() => {
              if (!active || !nextForm) return;
              setOpenId(null);
              tapHaptic();
              openForm(active, nextForm);
            }}
            style={{ marginTop: sp.xs }}
          />
        )}

        <Text style={s.sheetHint}>اضغط أي استمارة لفتحها وتعبئة الدرجات</Text>
      </BottomSheet>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: veilColor, zIndex: 40 }, veilStyle]}
      />
    </SafeAreaView>
  );
}

/** صفّ استمارة داخل اللوح — هدف لمس كبير بدل صفّ مضغوط في القائمة */
function SheetFormRow({ ev, onOpen }: { ev: Evaluation; onOpen: () => void }) {
  const { gradeId, subjectId } = useSession();
  const t = formTotals(ev.evaluation_type, gradeId!, subjectId!, ev.term);
  const sum = sumScores(ev.scores ?? {}, t.criteria);
  const has = Object.keys(ev.scores ?? {}).length > 0;
  const tone = kindTone[ev.evaluation_type];
  const termLabel = ev.term === 'term2' ? 'ف٢' : 'ف١';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [s.sheetRow, pressed && { opacity: 0.82 }]}
      accessibilityRole="button"
      accessibilityLabel={`${ev.label} — ${has ? `${sum} من ${t.actualMax}` : 'لم يُقيَّم'}`}
    >
      <View style={[s.formDot, { backgroundColor: has ? tone.c : 'transparent', borderColor: tone.c }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.formLabel} numberOfLines={1}>{ev.label}</Text>
        <Text style={s.formMeta}>
          {termLabel} · {kindMeta(ev.evaluation_type).name} ·{' '}
          {t.criteria.length} بند · {t.actualMax} درجة
        </Text>
      </View>

      {has ? (
        <View style={[s.formScore, { backgroundColor: tone.bg }]}>
          <Text style={[s.formScoreText, { color: tone.c }]}>
            {sum}
            <Text style={s.formScoreMax}>/{t.actualMax}</Text>
          </Text>
        </View>
      ) : (
        <Badge label="لم يُقيَّم" color={c.warnText} bg={c.warnBg} />
      )}
      <Ionicons name="chevron-back" size={16} color={c.text4} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { ...contentColumn, paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.huge, gap: sp.lg },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md, ...sh.sm },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 42 },
  /** تركيز البحث: حدّ العلامة وظلّ خفيف بدل تغيير الحجم */
  searchFocus: {
    borderColor: c.primaryLine,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  searchInput: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.sm,
    color: c.text, textAlign: 'right' },

  /** نقاط تقدّم الاستمارات تحت اسم الطالب */
  dots: { flexDirection: 'row', gap: 4, marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  /** ختم الاكتمال — حلقة ذهبية تظهر مرة واحدة عند إكمال كل الاستمارات */
  doneMark: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: c.gold,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    padding: sp.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fnt.bk, fontSize: fs.lg, color: c.text3 },
  name: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  sub: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 3 },

  noForms: {
    fontFamily: fnt.r, fontSize: fs.xs, color: c.text4,
    padding: sp.md, textAlign: 'center' },
  /** صف داخل اللوح السفلي — سطح مستقل هدفه أكبر */
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bg,
    borderWidth: 1, borderColor: c.line, borderRadius: rad.md,
    paddingHorizontal: sp.md, paddingVertical: sp.md },
  sheetHint: {
    fontFamily: fnt.r, fontSize: fs.xxs, color: c.text4,
    textAlign: 'center', marginTop: sp.sm },
  formDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2 },
  formLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text },
  formMeta: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 2 },
  formScore: {
    paddingHorizontal: sp.sm, paddingVertical: 3,
    borderRadius: rad.sm },
  formScoreText: { fontFamily: fnt.bk, fontSize: fs.xs },
  formScoreMax: { fontFamily: fnt.b, fontSize: 8.5 },

  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm,
    backgroundColor: c.primaryBg,
    borderWidth: 1, borderColor: c.primaryLine,
    borderRadius: rad.md,
    paddingVertical: sp.md },
  changeText: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
  changeRow: { flexDirection: 'row', gap: sp.sm },
  kindDot: { width: 10, height: 10, borderRadius: 5 },
  bulkBtn: { paddingHorizontal: sp.md, paddingVertical: sp.xs, borderRadius: rad.pill, borderWidth: 1, backgroundColor: c.bg },
  bulkBtnText: { fontFamily: fnt.b, fontSize: fs.xs },
});
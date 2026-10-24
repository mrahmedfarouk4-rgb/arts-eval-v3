import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  gradeName, subjectName, kindMeta, formTotals, sumScores } from '@/constants/criteria';
import { c, sp, rad, fnt, fs, kindTone } from '@/constants/brand';
import { Button, Card, Badge, BrandBar, Empty, Stat, StepBar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import {
  listStudentsByGrade, plannedForSubject,
  type Student, type Evaluation } from '@/lib/store';

/**
 * الخطوة ٤ — طلاب الخلية (مقرر + نوع تقييم).
 * الضغط على طالب يفتح الاستمارة.
 */
export default function RosterScreen() {
  const router = useRouter();
  const {
    gradeId, term, subjectId, kind, setSubject, setKind, editMode } = useSession();

  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Record<string, Evaluation[]>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(
    () => students.filter((s) => (query.trim() ? s.name.includes(query.trim()) : true)),
    [students, query]
  );

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

  const openForm = (stu: Student, ev: Evaluation) => {
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
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        title={subjectName(subjectId!)}
        sub={`${gradeName(gradeId!)} · ${kind ? kindMeta(kind).name : ''} · الخطوة ٤ من ٤`}
        // الرجوع لا يمسح المقرر: الاختيار معلّق في الجلسة، ولو مسحناه
        // لعادت شاشة نوع التقييم تقول «لم يُحدَّد المقرر بعد» فور الرجوع.
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* إحصاء الخطة */}
        <View style={s.statBar}>
          <Stat value={students.length} label="طالب" />
          <View style={s.vRule} />
          <Stat value={filled} label="استمارة مُعبّأة" color={c.okText} />
          <View style={s.vRule} />
          <Stat value={allForms.length - filled} label="بانتظار المعلم" color={c.warnText} />
        </View>

        {/* بحث */}
        <View style={s.search}>
          <Ionicons name="search" size={16} color={c.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
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

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
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
              const rowColor = [c.primary, c.brandSecondary, c.orange, c.mint, c.blueMid, c.pinkMid, c.peach][i % 7];

              return (
                <Card key={stu.id} padding={0}>
                  {/* رأس الطالب */}
                  <Pressable
                    onPress={() => setOpenId(open ? null : stu.id)}
                    style={({ pressed }) => [s.head, { borderLeftWidth: 4, borderLeftColor: rowColor }, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <View
                      style={[
                        s.avatar,
                        doneCount > 0 && { backgroundColor: c.okBg },
                      ]}
                    >
                      <Text
                        style={[s.avatarText, doneCount > 0 && { color: c.okText }]}
                      >
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
                    </View>

                    {doneCount > 0 && (
                      <Badge label={`${doneCount}/${forms.length}`} color={c.okText} bg={c.okBg} />
                    )}
                    <Ionicons
                      name={open ? 'chevron-down' : 'chevron-back'}
                      size={17}
                      color={c.text4}
                    />
                  </Pressable>

                  {/* الاستمارات الجاهزة */}
                  {open && (
                    <View style={s.formsWrap}>
                      {forms.length === 0 ? (
                        <Text style={s.noForms}>لا توجد استمارات مهيّأة لهذا المقرر</Text>
                      ) : (
                        forms.map((ev) => {
                          const t = formTotals(ev.evaluation_type, gradeId!, subjectId!, ev.term);
                          const sum = sumScores(ev.scores ?? {}, t.criteria);
                          const has = Object.keys(ev.scores ?? {}).length > 0;
                          const tone = kindTone[ev.evaluation_type];
                          const term = ev.term === 'term2' ? 'ف٢' : 'ف١';

                          return (
                            <Pressable
                              key={ev.id}
                              onPress={() => openForm(stu, ev)}
                              style={({ pressed }) => [s.formRow, pressed && { opacity: 0.75 }]}
                              accessibilityRole="button"
                              accessibilityLabel={`${ev.label} — ${has ? `${sum} من ${t.actualMax}` : 'لم يُقيَّم'}`}
                            >
                              <View
                                style={[
                                  s.formDot,
                                  { backgroundColor: has ? tone.c : 'transparent', borderColor: tone.c },
                                ]}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={s.formLabel} numberOfLines={1}>
                                  {ev.label}
                                </Text>
                                <Text style={s.formMeta}>
                                  {term} · {kindMeta(ev.evaluation_type).name} ·{' '}
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
                        })
                      )}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* تغيير نوع التقييم / المقرر */}
        <View style={s.changeRow}>
          <Pressable
            onPress={() => router.replace('/kind' as never)}
            style={({ pressed }) => [s.changeBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
          >
            <Ionicons name="layers-outline" size={16} color={c.primary} />
            <Text style={s.changeText}>تغيير نوع التقييم</Text>
          </Pressable>

          <Pressable
            onPress={() => { setSubject(null); setKind(null); router.replace('/term' as never); }}
            style={({ pressed }) => [s.changeBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={c.primary} />
            <Text style={s.changeText}>تغيير المقرر</Text>
          </Pressable>
        </View>

        <StepBar active={3} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.huge, gap: sp.lg },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 42 },
  searchInput: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.sm,
    color: c.text, textAlign: 'right' },

  loading: { paddingVertical: sp.huge, alignItems: 'center' },

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

  formsWrap: {
    borderTopWidth: 1, borderTopColor: c.line,
    backgroundColor: c.bg,
    paddingVertical: sp.xs },
  noForms: {
    fontFamily: fnt.r, fontSize: fs.xs, color: c.text4,
    padding: sp.md, textAlign: 'center' },
  formRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingHorizontal: sp.md, paddingVertical: sp.sm },
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
  changeRow: { flexDirection: 'row', gap: sp.sm } });
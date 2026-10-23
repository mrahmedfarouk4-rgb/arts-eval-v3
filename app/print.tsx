import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  gradeName, subjectName, kindMeta, formTotals, sumScores, levelFor,
  convertTo2, convertTo30, EVAL_KINDS,
} from '@/constants/criteria';
import type { GradeId, SubjectId } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c as p, sp, rad, fnt, fs, kindTone } from '@/constants/brand';
import { Button, Card, Banner, Section, TopBar, Stat, Segmented } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { buildPrintHtml, toPrintRow, type PrintRow } from '@/lib/print-html';
import { getDraft, getEvaluationById, evaluationsForStudent, listStudents, listEvaluations, type Evaluation } from '@/lib/store';

export default function PrintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
    gradeId?: string;
    subjectId?: string;
    kind?: string;
    date?: string;
    label?: string;
    /** معرّف التقييم المحفوظ للتو — يُطبع هو بعينه بلا وساطة */
    evalId?: string;
    /** الشاشة التي جئنا منها — عودة صحيحة بلا الاعتماد على السجل */
    from?: string;
  }>();
  const { term, teacherName } = useSession();

  const goBack = () => {
    const from = params.from;
    if (from && router.canGoBack()) router.back();
    else router.replace((from ?? '/(tabs)') as never);
  };

  const [mode, setMode] = useState<'single' | 'batch'>(
    params.studentId ? 'single' : 'batch'
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [label, setLabel] = useState(params.label ?? '');
  const [date, setDate] = useState(params.date ?? todayISO());
  const [round, setRound] = useState<'all' | 'latest'>('all');
  const [busy, setBusy] = useState(false);

  const gradeId = (params.gradeId ?? '') as GradeId;
  const subjectId = (params.subjectId ?? '') as SubjectId;
  const kind = (params.kind ?? 'weekly') as CriteriaKind;

  /* ---------------- تحميل بيانات الوضع المفرد ---------------- */
  /**
   * كان التحميل مرتبطاً بـmode وحدها، فيبقى على الشاشة واحدة عند الانتقال
   * من استمارة إلى أخرى — فتُطبع درجات استمارة باسم استمارة.
   */
  const printKey =
    mode + '|' + (params.studentId ?? '') + '|' + (params.evalId ?? '') + '|' +
    gradeId + '|' + subjectId + '|' + kind + '|' +
    (params.label ?? '') + '|' + (params.date ?? '');

  useEffect(() => {
    const sid = params.studentId;
    if (mode !== 'single' || !sid) return;

    setScores({});
    setLabel(params.label ?? '');
    setDate(params.date ?? todayISO());

    (async () => {
      // أصدق مصدر: التقييم الذي حُفظ للتو — لا مسودة ولا «الأحدث».
      const justSaved = params.evalId
        ? await getEvaluationById(String(params.evalId))
        : null;
      if (justSaved) {
        setScores(justSaved.scores ?? {});
        setLabel(justSaved.label ?? '');
        setDate(justSaved.evaluation_date);
        return;
      }
      const d = await getDraft(sid, kind, date);
      if (d && Object.keys(d.scores).length) {
        setScores(d.scores);
        setLabel(d.label);
        return;
      }
      const list = await evaluationsForStudent(sid);
      const match = list
        .filter((e) => e.grade_id === gradeId && e.subject_id === subjectId && e.evaluation_type === kind)
        .sort((a: Evaluation, b: Evaluation) => b.evaluation_date.localeCompare(a.evaluation_date));
      if (match[0]) {
        setScores(match[0].scores ?? {});
        setLabel(match[0].label ?? '');
        setDate(match[0].evaluation_date);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printKey]);

  /* ---------------- تحميل بيانات الوضع الجماعي ---------------- */
  const [allEvals, setAllEvals] = useState<Evaluation[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const students = await listStudents(true);
      const n: Record<string, string> = {};
      students.forEach((s) => (n[s.id] = s.name));
      setNames(n);
      setAllEvals(await listEvaluations());
    })();
  }, []);

  // كل تقييمات الصف/المقرر المختار
  const cellEvals = useMemo(() => {
    if (!gradeId || !subjectId) return [];
    return allEvals
      .filter((e) => e.grade_id === gradeId && e.subject_id === subjectId && !e.deleted)
      .sort(
        (a, b) =>
          (names[a.student_id] ?? '').localeCompare(names[b.student_id] ?? '', 'ar') ||
          a.evaluation_date.localeCompare(b.evaluation_date)
      );
  }, [allEvals, gradeId, subjectId, names]);

  /** latest: آخر تقييم لكل طالب */
  const batchRows: PrintRow[] = useMemo(() => {
    let list = cellEvals;
    if (round === 'latest') {
      const latest = new Map<string, Evaluation>();
      for (const e of list) {
        const prev = latest.get(e.student_id);
        if (!prev || e.evaluation_date > prev.evaluation_date) latest.set(e.student_id, e);
      }
      list = [...latest.values()];
    }
    return list.map((e) => toPrintRow(e, names[e.student_id] ?? 'طالب', term));
  }, [cellEvals, round, names, term]);

  const totals = useMemo(
    () => (gradeId && subjectId ? formTotals(kind, gradeId, subjectId, term) : null),
    [kind, gradeId, subjectId, term]
  );

  /* ---------------- الطباعة ---------------- */

  const printSingle = async () => {
    setBusy(true);
    try {
      const row: PrintRow = {
        student: { name: params.studentName ?? '', grade: gradeId },
        evaluation: {
          id: 'preview',
          date,
          label,
          scores,
          teacher: teacherName ?? '',
        },
        kind,
        gradeId,
        subjectId,
        subjectName: subjectName(subjectId),
        gradeName: gradeName(gradeId),
      };
      await emit(buildPrintHtml([row], term));
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّر إنشاء الملف');
    } finally {
      setBusy(false);
    }
  };

  const printBatch = async () => {
    if (!batchRows.length) {
      Alert.alert('لا توجد بيانات', 'لا توجد تقييمات لهذا المقرر بعد.');
      return;
    }
    setBusy(true);
    try {
      await emit(buildPrintHtml(batchRows, term));
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّر إنشاء الملف');
    } finally {
      setBusy(false);
    }
  };

  const emit = async (html: string) => {
    /**
     * ⚠ على الويب يتجاهل expo-print وسيط html تماماً وينفّذ window.print()
     * على الصفحة الحالية — فتخرج شاشة المعاينة (البطاقة) بدل الاستمارة.
     * فنفتح نافذة مستقلة نكتب فيها HTML الاستمارة ثم نطبعها.
     */
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (!w) {
        Alert.alert(
          'تعذّر الطباعة',
          'منع المتصفح فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.'
        );
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      const doPrint = () => {
        if (w.closed) return;
        w.focus();
        w.print();
      };
      /* ننتظر تحميل الخطوط والشعار المضمّنين قبل فتح حوار الطباعة */
      if (w.document.readyState === 'complete') setTimeout(doPrint, 400);
      else w.addEventListener('load', () => setTimeout(doPrint, 400), { once: true });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } else {
      Alert.alert('تم', 'تم إنشاء ملف PDF.');
    }
  };

  /* ================= العرض ================= */

  const singleTotal = totals ? sumScores(scores, totals.criteria) : 0;
  const singleLv = totals ? levelFor(kind, singleTotal) : null;

  return (
    <SafeAreaView style={st.bg} edges={['bottom']}>
      <TopBar
        title="معاينة الطباعة"
        sub={mode === 'single' ? params.studentName : `${subjectName(subjectId)} · ${gradeName(gradeId)}`}
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* اختيار الوضع */}
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'single', label: 'استمارة واحدة' },
            { value: 'batch', label: 'دفعة كاملة' },
          ]}
        />

        {mode === 'single' ? (
          <>
            {/* معاينة مبسطة */}
            {totals && (
              <Card padding={sp.lg}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md, marginBottom: sp.md }}>
                  <View style={[st.kindIcon, { backgroundColor: kindTone[kind].bg }]}>
                    <Ionicons name="document-text" size={20} color={kindTone[kind].c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardTitle}>{params.studentName}</Text>
                    <Text style={st.cardHint}>
                      {gradeName(gradeId)} · {subjectName(subjectId)} · {kindMeta(kind).name}
                    </Text>
                  </View>
                </View>

                <View style={st.statRow}>
                  <Stat value={`${singleTotal}`} label={`من ${totals.actualMax}`} />
                  <View style={st.divider} />
                  <View style={st.lvCol}>
                    <Text
                      style={[st.lvText, { color: singleLv ? singleLv.color : p.text3 }]}
                      numberOfLines={2}
                    >
                      {singleLv ? singleLv.label : '—'}
                    </Text>
                    <Text style={st.lvLabel}>المستوى</Text>
                  </View>
                </View>

                {singleTotal > 0 && (
                  <View style={{ marginTop: sp.md, gap: 4 }}>
                    {kind === 'weekly' && (
                      <Text style={st.conv}>الدرجة المعيارية من 2: {convertTo2(singleTotal)}</Text>
                    )}
                    {kind === 'periodic' && (
                      <Text style={st.conv}>الدرجة المحوّلة من 30: {convertTo30(singleTotal).toFixed(2)}</Text>
                    )}
                  </View>
                )}
              </Card>
            )}

            {totals && totals.delta !== 0 && (
              <Banner
                level="warn"
                title="مجموع البنود يختلف عن المجموع الرسمي"
                message={`مجموع البنود ${totals.actualMax} والمجموع الرسمي ${totals.officialMax}. اعتُمد مجموع البنود في الطباعة.`}
              />
            )}

            <Banner
              level="info"
              title="الطباعة على النموذج الرسمي"
              message="تُطبع الاستمارة بالتخطيط والألوان والشعار وجدول المعايير وجدول الفئات كما في النموذج المعتمد."
            />

            <View style={st.lockRow}>
              <Ionicons name="lock-closed" size={13} color={p.text3} />
              <Text style={st.lockText}>
                نموذج معتمد — شكل الورقة المطبوعة مقفل ولا يمكن تعديله
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* اختيار نوع التقييم للدفعة */}
            <Section title="نوع التقييم" hint="دفعة واحدة لكل نوع">
              <View style={{ gap: sp.sm }}>
                {EVAL_KINDS.map((k) => {
                  const t = formTotals(k.id, gradeId, subjectId, term);
                  const count = cellEvals.filter((e) => e.evaluation_type === k.id).length;
                  const students = new Set(
                    cellEvals.filter((e) => e.evaluation_type === k.id).map((e) => e.student_id)
                  ).size;
                  const tone = kindTone[k.id];
                  return (
                    <Card
                      key={k.id}
                      padding={sp.md}
                      accent={count ? tone.c : undefined}
                      onPress={() => router.setParams({ kind: k.id })}
                      style={kind === k.id ? { borderColor: tone.c } : undefined}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
                        <View style={[st.kindIcon, { backgroundColor: tone.bg }]}>
                          <Ionicons
                            name={k.id === 'weekly' ? 'flash' : k.id === 'periodic' ? 'trending-up' : 'trophy'}
                            size={18}
                            color={tone.c}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.cardTitle}>{k.name}</Text>
                          <Text style={st.cardHint}>
                            {students} طالب · {count} استمارة · من {t.actualMax}
                          </Text>
                        </View>
                        {kind === k.id && <Ionicons name="checkmark-circle" size={19} color={tone.c} />}
                      </View>
                    </Card>
                  );
                })}
              </View>
            </Section>

            {/* الجولة */}
            <Section title="نطاق الطباعة">
              <Segmented
                value={round}
                onChange={setRound}
                options={[
                  { value: 'all', label: 'كل التقييمات' },
                  { value: 'latest', label: 'آخر تقييم فقط' },
                ]}
              />
            </Section>

            {/* معاينة القائمة */}
            <Section title="الاستمارات" count={batchRows.length}>
              {batchRows.length === 0 ? (
                <Card padding={sp.lg}>
                  <Text style={[st.cardHint, { textAlign: 'center' }]}>
                    لا توجد تقييمات لهذا المقرر بعد
                  </Text>
                </Card>
              ) : (
                <Card padding={0}>
                  {batchRows.slice(0, 40).map((r, i) => (
                    <View
                      key={r.evaluation.id}
                      style={[st.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: p.line }]}
                    >
                      <Text style={st.listIdx}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={st.listName}>{r.student.name}</Text>
                        <Text style={st.listMeta}>
                          {r.evaluation.date}
                          {r.evaluation.label ? ` · ${r.evaluation.label}` : ''}
                        </Text>
                      </View>
                      <Text style={[st.listScore, { color: kindTone[kind].c }]}>
                        {sumScores(r.evaluation.scores, formTotals(kind, gradeId, subjectId, term).criteria)}
                      </Text>
                    </View>
                  ))}
                  {batchRows.length > 40 && (
                    <View style={{ padding: sp.md }}>
                      <Text style={[st.cardHint, { textAlign: 'center' }]}>
                        و {batchRows.length - 40} استمارة أخرى
                      </Text>
                    </View>
                  )}
                </Card>
              )}
            </Section>
          </>
        )}

        {/* أزرار */}
        <View style={{ gap: sp.sm, marginTop: sp.sm }}>
          <Button
            label={mode === 'single' ? 'طباعة الاستمارة' : `طباعة ${batchRows.length} استمارة`}
            icon="print"
            size="lg"
            onPress={mode === 'single' ? printSingle : printBatch}
            loading={busy}
            disabled={mode === 'batch' && batchRows.length === 0}
            full
          />
          <Button label="رجوع" variant="ghost" onPress={goBack} full />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: p.bg },
  scroll: { paddingHorizontal: sp.lg, paddingBottom: sp.huge, gap: sp.lg },

  cardTitle: { fontFamily: fnt.b, fontSize: fs.md, color: p.text },
  cardHint: { fontFamily: fnt.r, fontSize: fs.xs, color: p.text3, marginTop: 2 },

  kindIcon: {
    width: 40,
    height: 40,
    borderRadius: rad.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.bgAlt,
    borderRadius: rad.md,
    paddingVertical: sp.md,
  },
  divider: { width: 1, height: 26, backgroundColor: p.line },

  lvCol: { flex: 1, alignItems: 'center', paddingHorizontal: sp.xs },
  lvText: { fontFamily: fnt.b, fontSize: fs.sm, textAlign: 'center', lineHeight: 20 },
  lvLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: p.text3, marginTop: 2 },

  conv: { fontFamily: fnt.b, fontSize: fs.sm, color: p.primary },

  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -sp.sm,
  },
  lockText: { fontFamily: fnt.r, fontSize: fs.xxs, color: p.text3 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.md,
  },
  listIdx: {
    width: 22,
    textAlign: 'center',
    fontFamily: fnt.b,
    fontSize: fs.xs,
    color: p.text4,
  },
  listName: { fontFamily: fnt.m, fontSize: fs.sm, color: p.text },
  listMeta: { fontFamily: fnt.r, fontSize: fs.xxs, color: p.text3, marginTop: 1 },
  listScore: { fontFamily: fnt.bk, fontSize: fs.md },
});

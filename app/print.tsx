import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  gradeName, subjectName, kindMeta, formTotals, sumScores, levelFor,
  convertTo2, convertTo30, EVAL_KINDS, GRADES, subjectsForGrade,
} from '@/constants/criteria';
import type { GradeId, SubjectId } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c as p, sp, rad, fnt, fs, kindTone } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import { Button, Card, Banner, Section, TopBar, Stat, Segmented } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { visibleGrades, visibleSubjects } from '@/lib/accounts';
import { buildPrintHtml, toPrintRow, type PrintRow } from '@/lib/print-html';
import { getDraft, getEvaluationById, evaluationsForStudent, listStudents, listEvaluations, type Evaluation } from '@/lib/store';

/** المراحل الفعّالة — يستثنى المعرّف القديم intermediate1 كما في بقية الشاشات */
const ACTIVE_GRADES = GRADES.filter((g) => g.id !== 'intermediate1');

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
  const { user } = useAuth();

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
  const [pickMode, setPickMode] = useState<'all' | 'specific'>('all');
  const [pickValue, setPickValue] = useState<'latest' | number>('latest');
  const [busy, setBusy] = useState(false);

  /**
   * اسم المعلم على الورقة.
   * -------------------------------------------------------------------
   * كان يُؤخذ من الجلسة وحدها، فإن كان حساب الضيف بلا اسم أو حُفظ
   * التقييم قديماً بلا `teacher_name` ظهرت في الطباعة شرطة «—».
   * صار قابلاً للكتابة/التعديل هنا، ويُرجَّح عليه اسم المعلم المحفوظ
   * مع التقييم ثم اسم الجلسة، فلا تُطبع ورقة بلا اسم معلم.
   */
  const [teacher, setTeacher] = useState(teacherName ?? '');
  /** اسم المعلم المحفوظ في التقييم المعروض (إن وُجد) */
  const [savedTeacher, setSavedTeacher] = useState('');
  /** هل عدّل المستخدم اسم المعلم يدوياً؟ (لمنع الاستمارة المحفوظة من إلغاء ما كُتب) */
  const teacherEditedRef = useRef(false);

  useEffect(() => {
    setTeacher((cur) => cur || teacherName || '');
  }, [teacherName]);

  /** الاسم الفعلي الذي سيُطبع — الحقل (إن عُدّل) ثم المحفوظ مع التقييم */
  const resolveTeacher = (saved?: string | null) =>
    teacher.trim() ||
    (saved ?? '').trim() ||
    savedTeacher.trim() ||
    (teacherName ?? '').trim();

  /** لا نسمح بالطباعة بلا اسم معلم — يُطبع مكانه شرطة في الكليشة */
  const requireTeacher = (saved?: string | null, allowLoaded = true): string | null => {
    const name = allowLoaded
      ? resolveTeacher(saved)
      : teacherEditedRef.current
        ? teacher.trim() || (saved ?? '').trim() || (teacherName ?? '').trim()
        : teacher.trim() || (saved ?? '').trim() || (teacherName ?? '').trim();
    if (name) return name;
    Alert.alert(
      'اسم المعلم مطلوب',
      'اكتب اسم المعلم في الحقل أعلى الشاشة ليظهر في الاستمارة المطبوعة.'
    );
    return null;
  };

  const gradeId = (params.gradeId ?? '') as GradeId;
  const subjectId = (params.subjectId ?? '') as SubjectId;
  const kind = (params.kind ?? 'weekly') as CriteriaKind;

  /* ---------------- اختيار المرحلة والمقرر (الوضع الجماعي) ---------------- */
  /**
   * «الطباعة» من القائمة الجانبية تفتح الشاشة بلا معاملات، فتظهر دفعة
   * بلا مرحلة ولا مقرر. نعرض منتقيات مقيّدة بما يراه الحساب — المعلم
   * لا يرى إلا مراحله ومقرراته المسندة، والمشرف يرى الكل — ولا تُعرض
   * أقسام الدفعة إلا بعد اختيار الاثنين.
   */
  const myGrades = useMemo(
    () => visibleGrades(user, ACTIVE_GRADES.map((g) => g.id)),
    [user]
  );
  const mySubjects = useMemo(
    () => (gradeId ? visibleSubjects(user, subjectsForGrade(gradeId, 'all')) : []),
    [user, gradeId]
  );

  /* ---------------- تحميل بيانات الوضع المفرد ---------------- */
  /**
   * كان التحميل مرتبطاً بـmode وحدها، فيبقى على الشاشة واحدة عند الانتقال
   * من استمارة إلى أخرى — فتُطبع درجات استمارة باسم استمارة.
   */
  const printKey =
    mode + '|' + (params.studentId ?? '') + '|' + (params.evalId ?? '') + '|' +
    gradeId + '|' + subjectId + '|' + kind + '|' +
    (params.label ?? '') + '|' + (params.date ?? '');

  const targetKey = (params.studentId ?? '') + '|' + (params.evalId ?? '') + '|' + gradeId + '|' + subjectId + '|' + kind;
  const prevTargetKeyRef = useRef(targetKey);
  useEffect(() => {
    if (prevTargetKeyRef.current !== targetKey) {
      prevTargetKeyRef.current = targetKey;
      teacherEditedRef.current = false;
    }
  }, [targetKey]);

  useEffect(() => {
    setSavedTeacher('');
  }, [printKey]);

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
        setSavedTeacher(justSaved.teacher_name ?? '');
        if (justSaved.teacher_name && !teacherEditedRef.current) setTeacher(justSaved.teacher_name);
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
        .filter((e) => e.grade_id === gradeId && e.subject_id === subjectId && e.evaluation_type === kind && isFilled(e))
        .sort((a: Evaluation, b: Evaluation) => evalDate(b).localeCompare(evalDate(a)));
      if (match[0]) {
        setScores(match[0].scores ?? {});
        setLabel(match[0].label ?? '');
        setDate(match[0].evaluation_date);
        setSavedTeacher(match[0].teacher_name ?? '');
        if (match[0].teacher_name && !teacherEditedRef.current) setTeacher(match[0].teacher_name);
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

  // تقييمات الصف/المقرر المختار — المعبّأة فقط (الاستمارة الفارغة ليست سجلاً يُطبع)
  const cellEvals = useMemo(() => {
    if (!gradeId || !subjectId) return [];
    return allEvals
      .filter((e) => e.grade_id === gradeId && e.subject_id === subjectId && !e.deleted && isFilled(e))
      .sort(
        (a, b) =>
          (names[a.student_id] ?? '').localeCompare(names[b.student_id] ?? '', 'ar') ||
          evalDate(a).localeCompare(evalDate(b))
      );
  }, [allEvals, gradeId, subjectId, names]);

  // تقييمات النوع المختار فقط — للطباعة
  const kindCellEvals = useMemo(
    () => cellEvals.filter((e) => e.evaluation_type === kind),
    [cellEvals, kind]
  );

  // أقصى عدد تقييمات لطالب واحد (للنوع المختار) — لبناء خيارات "تقييم n"
  const maxPick = useMemo(() => {
    const byStudent = new Map<string, number>();
    for (const e of kindCellEvals) {
      byStudent.set(e.student_id, (byStudent.get(e.student_id) ?? 0) + 1);
    }
    return byStudent.size ? Math.max(...byStudent.values()) : 0;
  }, [kindCellEvals]);

  /** اختيار التقييمات للطباعة */
  const batchRows: PrintRow[] = useMemo(() => {
    let list = kindCellEvals;
    if (pickMode === 'specific') {
      if (pickValue === 'latest') {
        const latest = new Map<string, Evaluation>();
        for (const e of kindCellEvals) {
          const prev = latest.get(e.student_id);
          if (!prev || e.evaluation_date > prev.evaluation_date) latest.set(e.student_id, e);
        }
        list = [...latest.values()];
      } else {
        const n = pickValue as number;
        const byStudent = new Map<string, Evaluation[]>();
        for (const e of kindCellEvals) {
          const arr = byStudent.get(e.student_id) ?? [];
          arr.push(e);
          byStudent.set(e.student_id, arr);
        }
        const picked: Evaluation[] = [];
        for (const arr of byStudent.values()) {
          const sorted = [...arr].sort((a, b) => evalDate(a).localeCompare(evalDate(b)));
          if (sorted[n - 1]) picked.push(sorted[n - 1]);
        }
        list = picked;
      }
    }
    return list.map((e) => {
      const row = toPrintRow(e, names[e.student_id] ?? 'طالب', term);
      /** 
       * إن عدّل المستخدم اسم المعلم في الحقل، يُطبَّق على جميع الأوراق.
       * وإلا: اسم الاستمارة المحفوظ، ثم الاسم المكتوب، ثم جلسة المستخدم.
       */
      const rowTeacher = teacher.trim() || row.evaluation.teacher || teacherName || '';
      return {
        ...row,
        evaluation: {
          ...row.evaluation,
          teacher: rowTeacher,
        },
      };
    });
  }, [kindCellEvals, pickMode, pickValue, names, term, teacher, teacherName]);

  const totals = useMemo(
    () => (gradeId && subjectId ? formTotals(kind, gradeId, subjectId, term) : null),
    [kind, gradeId, subjectId, term]
  );

  /* ---------------- الطباعة ---------------- */

  const printSingle = async () => {
    const teacherOnSheet = requireTeacher(savedTeacher);
    if (!teacherOnSheet) return;
    setBusy(true);
    try {
      const row: PrintRow = {
        student: { name: params.studentName ?? '', grade: gradeId },
        evaluation: {
          id: 'preview',
          date,
          label,
          scores,
          teacher: teacherOnSheet,
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
    if (!requireTeacher(null, false)) return;
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
        sub={
          mode === 'single'
            ? params.studentName
            : gradeId && subjectId
              ? `${subjectName(subjectId)} · ${gradeName(gradeId)}`
              : 'اختر المرحلة والمقرر'
        }
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* اسم المعلم — يُطبع في كل استمارة، فردية أو دفعة كاملة */}
        <View style={st.teacherCard}>
          <View style={st.teacherIcon}>
            <Ionicons name="person" size={16} color={p.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={st.teacherLabel}>اسم المعلم على الاستمارة</Text>
            <TextInput
              value={teacher}
              onChangeText={(v) => { setTeacher(v); teacherEditedRef.current = true; }}
              editable={!busy}
              placeholder="اكتب اسم المعلم"
              placeholderTextColor={p.text4}
              style={st.teacherInput}
              textAlign="right"
            />
            <Text style={st.teacherHint}>
              يُطبع في كل أوراق هذه الطباعة. وإن تركته فارغاً يُستخدم اسم الحساب أو الاسم المحفوظ مع التقييم.
            </Text>
          </View>
        </View>

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
        ) : !gradeId || !subjectId ? (
          <>
            {/* منتقيات المرحلة والمقرر — عند فتح الشاشة من القائمة بلا معاملات */}
            <Section title="المرحلة والمقرر" hint="اختر المرحلة ثم المقرر لعرض الدفعة">
              <Text style={st.pickLabel}>المرحلة</Text>
              <View style={st.chipWrap}>
                {myGrades.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => router.setParams({ gradeId: g, subjectId: '' })}
                    style={[st.chip, gradeId === g && st.chipActive]}
                  >
                    <Text style={[st.chipText, gradeId === g && st.chipTextActive]}>
                      {gradeName(g)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[st.pickLabel, { marginTop: sp.sm }]}>المقرر</Text>
              {gradeId && mySubjects.length > 0 ? (
                <View style={st.chipWrap}>
                  {mySubjects.map((sid) => (
                    <Pressable
                      key={sid}
                      onPress={() => router.setParams({ subjectId: sid })}
                      style={[st.chip, subjectId === sid && st.chipActive]}
                    >
                      <Text style={[st.chipText, subjectId === sid && st.chipTextActive]}>
                        {subjectName(sid)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={st.pickEmpty}>
                  {gradeId ? 'لا توجد مقررات لهذه المرحلة لحسابك' : 'اختر المرحلة أولاً لعرض مقرراتها'}
                </Text>
              )}
            </Section>
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
            <Section title="نطاق الطباعة" hint="اختر أي تقييم تطبع">
              <Segmented
                value={pickMode}
                onChange={setPickMode}
                options={[
                  { value: 'all', label: 'كل التقييمات' },
                  { value: 'specific', label: 'تقييم محدد' },
                ]}
              />
              {pickMode === 'specific' && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: sp.sm, paddingTop: sp.sm, flexDirection: 'row-reverse' }}
                >
                  <Pressable
                    onPress={() => setPickValue('latest')}
                    style={[st.chip, pickValue === 'latest' && st.chipActive]}
                  >
                    <Text style={[st.chipText, pickValue === 'latest' && st.chipTextActive]}>آخر تقييم</Text>
                  </Pressable>
                  {Array.from({ length: maxPick }, (_, i) => i + 1).map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setPickValue(n)}
                      style={[st.chip, pickValue === n && st.chipActive]}
                    >
                      <Text style={[st.chipText, pickValue === n && st.chipTextActive]}>تقييم {n}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
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

/**
 * تاريخ التقييم للفرز — الاستمارات المهيّأة وصفوف قديمة رأت المزامنة
 * قد تحمل التاريخ فارغاً (null)، فنفرّغه بدل أن ينفجر localeCompare
 * ويوقف الطباعة كلها.
 */
const evalDate = (e: Evaluation) => String(e.evaluation_date || '');

/** استمارة معبّأة فعلاً — الفارغة placeholder لا تُطبع ولا تُعدّ سجلاً */
const isFilled = (e: Evaluation) => Object.keys(e.scores ?? {}).length > 0;

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: p.bg },
  scroll: { ...contentColumn, paddingHorizontal: sp.lg, paddingBottom: sp.huge, gap: sp.lg },

  teacherCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
    backgroundColor: p.bgAlt,
    borderWidth: 1,
    borderColor: p.line,
    borderRadius: rad.md,
    padding: sp.md,
  },
  teacherIcon: {
    width: 32, height: 32, borderRadius: rad.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: p.bgLift,
  },
  teacherLabel: { fontFamily: fnt.b, fontSize: fs.xs, color: p.text },
  teacherInput: {
    fontFamily: fnt.m, fontSize: fs.sm, color: p.text,
    backgroundColor: p.bg,
    borderWidth: 1, borderColor: p.line, borderRadius: rad.sm,
    paddingHorizontal: sp.sm, paddingVertical: 8,
  },
  teacherHint: { fontFamily: fnt.r, fontSize: fs.xxs, color: p.text3, lineHeight: 15 },

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
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: rad.pill,
    backgroundColor: p.bgLift,
    borderWidth: 1,
    borderColor: p.line,
  },
  chipActive: { backgroundColor: p.primary, borderColor: p.primary },
  chipText: { fontFamily: fnt.m, fontSize: fs.xs, color: p.text2 },
  chipTextActive: { color: '#FFFFFF', fontFamily: fnt.b },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: sp.sm },
  pickLabel: { fontFamily: fnt.b, fontSize: fs.xs, color: p.text3, marginBottom: sp.xs },
  pickEmpty: { fontFamily: fnt.r, fontSize: fs.xs, color: p.text3 },
});

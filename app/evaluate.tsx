import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  gradeName, subjectName, kindMeta, formTotals, levelFor,
  convertTo2, convertTo30, sumScores, APP,
} from '@/constants/criteria';
import type { GradeId, SubjectId, TermId } from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c, sp, rad, fnt, fs, kindTone, scaleTone, scaleBg, subjectColor } from '@/constants/brand';
import { Button, Card, Badge, Banner, Progress, ModeToggle } from '@/components/pro-ui';
import { formWarnings } from '@/lib/warnings';
import { confirmAction } from '@/lib/dialog';
import { useSession } from '@/lib/session';
import {
  evaluationsForStudent, getDraft, saveDraft, saveEvaluation, deleteEvaluation,
  clearDraftFor,
  type Evaluation,
} from '@/lib/store';

/* ------------------------------------------------------------------ */
/*  سلم الدرجات                                                        */
/* ------------------------------------------------------------------ */

const SCALE = [
  { v: 1, label: 'دون الهدف' },
  { v: 2, label: 'يقترب' },
  { v: 3, label: 'حقق' },
  { v: 4, label: 'يتخطى' },
] as const;

export default function EvaluateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
    gradeId: string;
    subjectId: string;
    kind: string;
    /** معرّف استمارة محدّدة من الخطة الجاهزة */
    evalId?: string;
    /** الفصل الخاص بالاستمارة (يختلف عن الافتراضي) */
    term?: string;
    /** الشاشة التي جئنا منها — يضمن عودة صحيحة بلا الاعتماد على السجل */
    from?: string;
  }>();

  const { editMode, teacherName, term: sessionTerm } = useSession();

  const gradeId = (params.gradeId ?? '') as GradeId;
  const subjectId = (params.subjectId ?? '') as SubjectId;
  const kind = (params.kind ?? 'weekly') as CriteriaKind;
  const studentId = params.studentId ?? '';
  const studentName = params.studentName ?? '';
  const evalId = params.evalId ?? '';
  // الفصل يأتي من الرابط؛ فإن لم يمرّره المستدعي نأخذ فصل الجلسة،
  // وتثبيت «term1» دائماً كان يُنشئ تقييماً مكرراً في الفصل الثاني.
  const term = (params.term ?? sessionTerm ?? 'term1') as TermId;

  /**
   * العودة لا تعتمد على سجل التنقّل: لو فُتحت الاستمارة من «الطلاب»
   * فالسجل يقود إلى شاشة «اختر المقرر» الفارغة.
   * نعود للمصدر المرسَل في المعاملات، وإلا إلى قائمة الطلاب.
   */
  const goBack = useCallback(() => {
    const from = params.from;
    if (from && router.canGoBack()) router.back();
    else router.replace((from ?? '/(tabs)/students') as never);
  }, [params.from, router]);

  /* ---------------- الحالة ---------------- */
  const [scores, setScores] = useState<Record<string, number>>({});
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayISO());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [draftFound, setDraftFound] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [metaOpen, setMetaOpen] = useState(false);

  /**
   * هوية الاستمارة المعروضة. كان الحارس `loadedRef` عمّالاً مرّة واحدة
   * فقط، فلو أُعيد استخدام الشاشة بين الاستمارات (وهو ما يفعله Expo
   * Router عند تغيّر المعاملات) بقيت درجات الاستمارة السابقة معروضة
   * وبقي `editingId` عليها — فحفظنا في التقييم الخطأ.
   */
  const cellKey = `${studentId}|${gradeId}|${subjectId}|${kind}|${evalId}|${term}|${editMode}`;
  const loadedKeyRef = useRef('');

  const totals = useMemo(
    () => formTotals(kind, gradeId, subjectId, term),
    [kind, gradeId, subjectId, term]
  );
  const warnings = useMemo(
    () => formWarnings(kind, gradeId, subjectId, term),
    [kind, gradeId, subjectId, term]
  );

  const n = totals.criteria.length;
  const score = sumScores(scores, totals.criteria);
  const level = levelFor(kind, score);
  const ratedCount = totals.criteria.filter((x) => normalizedValue(scores[x.id]) !== undefined).length;
  const missing = n - ratedCount;
  const isFinal = kind === 'final';
  const tone = kindTone[kind];
  const subColor = subjectColor(subjectId);

  /** عدد البنود في كل مستوى — لمخطط الملخص */
  const dist = useMemo(
    () =>
      SCALE.map((o) => ({
        o,
        count: totals.criteria.filter((x) => normalizedValue(scores[x.id]) === o.v).length,
      })),
    [totals.criteria, scores]
  );

  const cellHistory = useMemo(
    () =>
      history.filter(
        (e) =>
          e.grade_id === gradeId && e.subject_id === subjectId && e.evaluation_type === kind
      ),
    [history, gradeId, subjectId, kind]
  );

  /* ---------------- تحميل السجل والمسودة ---------------- */
  const loadHistory = useCallback(async () => {
    setHistory(await evaluationsForStudent(studentId));
  }, [studentId]);

  useEffect(() => {
    if (loadedKeyRef.current === cellKey) return;
    loadedKeyRef.current = cellKey;

    // تصفير ما سبق فوراً حتى لا يظهر تقييمٌ آخر لثانية واحدة
    setScores({});
    setLabel('');
    setDate(todayISO());
    setEditingId(null);
    setDraftFound(false);

    (async () => {
      const list = await evaluationsForStudent(studentId);
      setHistory(list);

      // ١) استمارة محدّدة من الخطة الجاهزة — لها الأولوية
      if (evalId) {
        const target = list.find((e) => e.id === evalId);
        if (target) {
          setScores(target.scores ?? {});
          setLabel(target.label ?? '');
          setDate(target.evaluation_date || todayISO());
          setEditingId(target.id);
          return;
        }
      }

      // ٢) آخر تقييم محفوظ في نفس الخلية (وضع القراءة)
      const cell = list.filter(
        (e) =>
          e.grade_id === gradeId &&
          e.subject_id === subjectId &&
          e.evaluation_type === kind
      );

      if (cell.length) {
        const last = [...cell].sort((a: Evaluation, b: Evaluation) =>
          b.evaluation_date.localeCompare(a.evaluation_date)
        )[0];
        setScores(last.scores ?? {});
        setLabel(last.label ?? '');
        setDate(last.evaluation_date || todayISO());
        setEditingId(editMode ? last.id : null);
      }

      const d = await getDraft(studentId, kind, todayISO());
      if (d && Object.keys(d.scores).length) {
        setDraftFound(true);
        if (!cell.length) {
          setScores(d.scores);
          setLabel(d.label ?? '');
        }
      }
    })();
  }, [cellKey, studentId, gradeId, subjectId, kind, editMode, evalId, date]);

  /* ---------------- حفظ تلقائي للمسودة ---------------- */
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!editMode) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (Object.keys(scores).length === 0) return;
      saveDraft({
        student_id: studentId,
        grade_id: gradeId,
        subject_id: subjectId,
        evaluation_type: kind,
        evaluation_date: date,
        label,
        scores,
      }).catch(() => {});
    }, 1200);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [scores, label, date, editMode, studentId, gradeId, subjectId, kind]);

  /* ---------------- اختيار درجة بند ---------------- */
  const pick = (criterionId: string, value: number) => {
    if (!editMode) return;
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  /** يعبّئ كل البنود غير المقيّمة بدرجة واحدة */
  const fillRemaining = async (value: 1 | 2 | 3 | 4) => {
    const ok = await confirmAction(
      'تعبئة البنود المتبقية',
      `سيتم ضبط ${missing} بند على «${SCALE[value - 1].label}». هل تريد المتابعة؟`,
      { confirmLabel: 'تعبئة' }
    );
    if (!ok) return;
    setScores((prev) => {
      const next = { ...prev };
      for (const x of totals.criteria) {
        if (normalizedValue(next[x.id]) === undefined) next[x.id] = value;
      }
      return next;
    });
  };

  const clearAll = async () => {
    const ok = await confirmAction(
      'مسح الدرجات',
      'سيتم إلغاء جميع الدرجات المدخلة. هل تريد المتابعة؟',
      { confirmLabel: 'مسح', destructive: true }
    );
    if (!ok) return;
    setScores({});
  };

  /* ---------------- الحفظ ---------------- */
  const onSave = async (printAfter: boolean) => {
    if (!editMode) {
      Alert.alert('وضع العرض فقط', 'فعّل وضع التعديل للحفظ.');
      return;
    }
    if (ratedCount === 0) {
      Alert.alert('لم يتم التقييم', 'اختر درجة واحدة على الأقل قبل الحفظ.');
      return;
    }
    try {
      const saved = await saveEvaluation({
        id: editingId ?? undefined,
        student_id: studentId,
        grade_id: gradeId,
        term,
        subject_id: subjectId,
        evaluation_type: kind,
        evaluation_date: date || todayISO(),
        label,
        scores,
        teacher_name: teacherName,
      });
      // المسودة كانت تُقدَّم على التقييم المحفوظ في شاشة الطباعة،
      // فبعد الحفظ تُمحى وإلا طُبعت درجات أقدم من المحفوظ.
      await clearDraftFor(studentId, kind, saved.evaluation_date);
      await loadHistory();
      setEditingId(null);

      if (printAfter) {
        router.push({
          pathname: '/print',
          params: {
            studentId, studentName, gradeId, subjectId, kind, date, label,
            evalId: saved.id,
            from: '/evaluate',
          },
        });
      } else {
        Alert.alert('تم الحفظ', 'تم حفظ التقييم بنجاح.', [
          { text: 'متابعة التقييم', onPress: goBack },
        ]);
      }
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّر الحفظ');
    }
  };

  const onDelete = async (id: string) => {
    const ok = await confirmAction(
      'حذف التقييم',
      'هل تريد حذف هذا التقييم نهائياً؟',
      { confirmLabel: 'حذف', destructive: true }
    );
    if (!ok) return;
    await deleteEvaluation(id);
    await loadHistory();
    if (editingId === id) {
      setEditingId(null);
      setScores({});
      setLabel('');
    }
  };

  /* ================= العرض ================= */
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* ================= الترويسة الثابتة باللون المميز ================= */}
      <View style={[s.head, { backgroundColor: subColor }]}>
        <View style={s.headRow}>
          <Pressable onPress={goBack} hitSlop={10} style={s.headBtnSolid} accessibilityLabel="رجوع">
            <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={s.headNameSolid} numberOfLines={1}>{studentName || 'تقييم'}</Text>
            <Text style={s.headMetaSolid} numberOfLines={1}>
              {gradeName(gradeId)} · {subjectName(subjectId)} · {kindMeta(kind).name}
            </Text>
          </View>

          <View style={s.scoreChipSolid}>
            <Text style={[s.scoreValSolid, { color: subColor }]}>
              {score}
              <Text style={s.scoreMaxSolid}>/{totals.actualMax}</Text>
            </Text>
          </View>

          <Pressable
            onPress={() => setMetaOpen((v) => !v)}
            hitSlop={10}
            style={[
              s.headBtnSolid,
              metaOpen && { backgroundColor: '#FFFFFF' },
            ]}
            accessibilityLabel="بيانات الاستمارة"
          >
            <Ionicons
              name={metaOpen ? 'chevron-up' : 'ellipsis-vertical'}
              size={17}
              color={metaOpen ? subColor : '#FFFFFF'}
            />
          </Pressable>
        </View>

        {/* التقدّم */}
        <View style={s.progRow}>
          <Text style={s.progTextSolid}>
            {ratedCount} / {n} بند
          </Text>
          <View style={s.progSide}>
            {level ? (
              <View style={s.progLevelBadge}>
                <Text style={s.progLevelSolid} numberOfLines={1}>
                  {level.label}
                </Text>
              </View>
            ) : (
              <Text style={s.progNoneSolid}>لم يُقيَّم</Text>
            )}
            {/* مبدّل وضع التعديل */}
            <ModeToggle />
          </View>
        </View>
        <Progress
          value={ratedCount}
          max={n}
          color="#FFFFFF"
          height={6}
        />
      </View>

      {/* ================= اللوح الجانبي للبيانات ================= */}
      {metaOpen && (
        <View style={s.metaPanel}>
          {showWarnings && warnings.map((w, i) => (
            <Banner
              key={i}
              level={w.level}
              title={w.title}
              message={w.detail}
              onClose={() => setShowWarnings(false)}
            />
          ))}

          {draftFound && !editMode && (
            <Banner
              level="info"
              title="توجد مسودة غير محفوظة"
              message="فعّل وضع التعديل لعرضها ومتابعة التعبئة."
            />
          )}

          <View style={s.metaFields}>
            <View style={{ flex: 1 }}>
              <Text style={s.metaLabel}>التاريخ</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                editable={editMode}
                style={[s.metaInput, !editMode && s.metaLocked]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.text4}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={s.metaLabel}>رقم / وصف التقييم</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                editable={editMode}
                placeholder={APP.labelPlaceholder}
                placeholderTextColor={c.text4}
                style={[s.metaInput, !editMode && s.metaLocked]}
              />
            </View>
          </View>

          {editMode && (
            <View style={s.metaTools}>
              {missing > 0 && (
                <>
                  <ToolBtn
                    label={`تعبئة المتبقي (${missing})`}
                    icon="checkmark-done-outline"
                    tone={c.primary}
                    onPress={() => fillRemaining(3)}
                  />
                  <ToolBtn
                    label="تعيين 4"
                    icon="arrow-up-circle-outline"
                    tone={scaleTone[3]}
                    onPress={() => fillRemaining(4)}
                  />
                </>
              )}
              <ToolBtn
                label="مسح الكل"
                icon="refresh-outline"
                tone={c.err}
                onPress={clearAll}
              />
            </View>
          )}

          {cellHistory.length > 0 && (
            <View style={{ gap: sp.xs }}>
              <Text style={s.metaLabel}>تقييمات سابقة على نفس الخلية</Text>
              {cellHistory.map((e) => {
                const sum = sumScores(
                  e.scores ?? {},
                  formTotals(kind, gradeId, subjectId, term).criteria
                );
                const active = editingId === e.id;
                return (
                  <View key={e.id} style={[s.histChip, active && s.histChipOn]}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (!editMode) return;
                        setScores(e.scores ?? {});
                        setLabel(e.label ?? '');
                        setDate(e.evaluation_date);
                        setEditingId(e.id);
                      }}
                    >
                      <Text style={s.histLabel} numberOfLines={1}>{e.label || 'تقييم'}</Text>
                      <Text style={s.histDate}>
                        {e.evaluation_date}
                        {active ? ' · قيد التعديل' : ''}
                      </Text>
                    </Pressable>
                    <Text style={[s.histScore, { color: tone.c }]}>
                      {sum}
                      <Text style={s.histScoreMax}>/{totals.actualMax}</Text>
                    </Text>
                    {editMode && (
                      <Pressable onPress={() => onDelete(e.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={15} color={c.err} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ================= البنود — كلها في صفحة واحدة ================= */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ================= شريط الأدوات السريع ================= */}
          {editMode && (
            <View style={s.quickBar}>
              <Pressable
                onPress={() => fillRemaining(4)}
                style={({ pressed }) => [
                  s.quickBtn,
                  { backgroundColor: scaleTone[3] },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                <Text style={s.quickBtnText}>تعبئة يتخطى (٤)</Text>
              </Pressable>

              <Pressable
                onPress={() => fillRemaining(3)}
                style={({ pressed }) => [
                  s.quickBtn,
                  { backgroundColor: scaleTone[2] },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Ionicons name="checkmark-done" size={13} color="#FFFFFF" />
                <Text style={s.quickBtnText}>تعبئة حقق (٣)</Text>
              </Pressable>

              {ratedCount > 0 && (
                <Pressable
                  onPress={clearAll}
                  style={({ pressed }) => [
                    s.quickBtnClear,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={13} color={c.err} />
                  <Text style={s.quickBtnClearText}>مسح</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ترويسة الجدول */}
          <View style={s.tableHead}>
            <Text style={s.tableHeadTitle}>بنود التقييم</Text>
            <Badge label={`${n} بند`} color={tone.c} bg={tone.bg} />
          </View>

          {/* السطر لكل بند */}
          <View style={s.sheet}>
            {totals.criteria.map((x, idx) => (
              <CriterionRow
                key={x.id}
                index={idx}
                text={x.text}
                pass={isFinal ? (x.pass ?? undefined) : undefined}
                cmax={x.max}
                value={normalizedValue(scores[x.id])}
                isFinal={isFinal}
                editMode={editMode}
                onPick={(v) => pick(x.id, v)}
              />
            ))}
          </View>

          {/* الملخص */}
          {ratedCount > 0 && (
            <Card padding={sp.lg}>
              <View style={s.resRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.resLabel}>مجموع الدرجات</Text>
                  <Text style={s.resScore}>
                    {score}
                    <Text style={s.resScoreMax}> / {totals.actualMax}</Text>
                  </Text>
                </View>
                {level && (
                  <View style={[s.resLevel, { backgroundColor: level.bg }]}>
                    <Text style={[s.resLevelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                )}
              </View>

              {/* مخطط التوزيع */}
              <View style={{ gap: sp.xs, marginTop: sp.lg }}>
                {dist.map(({ o, count }) => {
                  const col = scaleTone[o.v - 1];
                  const pct = n > 0 ? (count / n) * 100 : 0;
                  return (
                    <View key={o.v} style={s.distRow}>
                      <Text style={[s.distLabel, { color: col }]}>{o.label}</Text>
                      <View style={s.distTrack}>
                        <View style={[s.distFill, { width: `${pct}%`, backgroundColor: col }]} />
                      </View>
                      <Text style={s.distCount}>{count}</Text>
                    </View>
                  );
                })}
                <View style={s.distRow}>
                  <Text style={[s.distLabel, { color: c.text4 }]}>بلا تقييم</Text>
                  <View style={s.distTrack}>
                    <View
                      style={[
                        s.distFill,
                        { width: `${n > 0 ? (missing / n) * 100 : 0}%`, backgroundColor: c.line },
                      ]}
                    />
                  </View>
                  <Text style={s.distCount}>{missing}</Text>
                </View>
              </View>

              {/* التحويل */}
              <View style={s.resMeta}>
                <Pill icon="checkmark-circle-outline" label={`${ratedCount} مقيَّم`} tone={c.ok} />
                {missing > 0 && (
                  <Pill icon="ellipse-outline" label={`${missing} بدون تقييم`} tone={c.warn} />
                )}
                {kind === 'weekly' && (
                  <Pill icon="swap-horizontal-outline" label={`معياري ${convertTo2(score)}`} tone={tone.c} />
                )}
                {kind === 'periodic' && (
                  <Pill
                    icon="swap-horizontal-outline"
                    label={`من 30: ${convertTo30(score).toFixed(2)}`}
                    tone={tone.c}
                  />
                )}
              </View>
            </Card>
          )}

          {!editMode && (
            <View style={s.viewNote}>
              <Ionicons name="eye-outline" size={14} color={c.warn} />
              <Text style={s.viewNoteText}>
                وضع العرض فقط — فعّل وضع التعديل من الإعدادات للحفظ
              </Text>
            </View>
          )}

          <View style={{ height: sp.lg }} />
        </ScrollView>

        {/* ================= شريط الحفظ ================= */}
        <View style={s.footer}>
          {editMode ? (
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              <Button
                label="حفظ"
                variant="surface"
                onPress={() => onSave(false)}
                style={{ flex: 1 }}
                full
              />
              <Button
                label="حفظ وطباعة"
                icon="print-outline"
                onPress={() => onSave(true)}
                style={{ flex: 1.4 }}
                full
              />
            </View>
          ) : (
            <View style={s.viewNote}>
              <Ionicons name="eye-outline" size={15} color={c.warn} />
              <Text style={s.viewNoteText}>وضع العرض فقط</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ================================================================== */
/*  سطر البند — نص + 4 خيارات مضغوطة                                   */
/* ================================================================== */

function CriterionRow({
  index, text, pass, cmax, value, isFinal, editMode, onPick,
}: {
  index: number;
  text: string;
  pass?: number;
  cmax: number;
  value?: 1 | 2 | 3 | 4;
  isFinal: boolean;
  editMode: boolean;
  onPick: (v: number) => void;
}) {
  const on = value !== undefined;
  const col = value !== undefined ? scaleTone[value - 1] : undefined;
  const passed = isFinal && pass != null && value !== undefined && value >= pass;
  const rowColor = [c.primary, c.brandSecondary, c.orange, c.mint, c.blueMid, c.pinkMid, c.peach][index % 7];

  return (
    <View style={[s.row, on && s.rowOn, on && col ? { borderColor: col } : null, { borderLeftWidth: 4, borderLeftColor: rowColor }]}>
      {/* السطر الأول: الرقم + النص + درجة التحقق */}
      <View style={s.rowTop}>
        <View style={[s.rowNum, on && col ? { backgroundColor: scaleBg[(value ?? 1) - 1] } : null]}>
          <Text style={[s.rowNumText, on && col ? { color: col } : null]}>{index + 1}</Text>
        </View>

        <Text style={[s.rowText, on && { color: c.text }]}>{text}</Text>

        {isFinal && pass != null && (
          <View style={[s.rowPass, passed && { backgroundColor: c.okBg, borderColor: c.ok }]}>
            <Text style={[s.rowPassText, passed && { color: c.ok }]}>
              {pass}/{cmax}
            </Text>
          </View>
        )}
      </View>

      {/* السطر الثاني: خيارات الدرجة */}
      <View style={s.rowOpts}>
        {SCALE.map((o) => {
          const sel = value === o.v;
          const kc = scaleTone[o.v - 1];
          return (
            <Pressable
              key={o.v}
              onPress={() => onPick(o.v)}
              disabled={!editMode}
              style={({ pressed }) => [
                s.opt,
                sel && { backgroundColor: kc, borderColor: kc },
                pressed && !editMode && { opacity: 0.6 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel, disabled: !editMode }}
              accessibilityLabel={`${o.label} — ${o.v} من ${cmax}`}
            >
              <Text style={[s.optNum, sel && s.optNumOn]}>{o.v}</Text>
              <Text style={[s.optLabel, sel && s.optLabelOn]} numberOfLines={1}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ================================================================== */

function ToolBtn({
  label, icon, tone, onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.toolBtn,
        { backgroundColor: tone + '14', borderColor: tone + '33' },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={13} color={tone} />
      <Text style={[s.toolText, { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

function Pill({
  icon, label, tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone: string;
}) {
  return (
    <View style={[s.pill, { backgroundColor: tone + '18' }]}>
      <Ionicons name={icon} size={12} color={tone} />
      <Text style={[s.pillText, { color: tone }]}>{label}</Text>
    </View>
  );
}

/* ================================================================== */

/** تاريخ اليوم بصيغة YYYY-MM-DD */
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * يوحّد قيمة البند إلى 1..4.
 * بعض التقييمات القديمة تحمل قيماً خارج النطاق (مثل 0) فتحتاج
 * معاملتها كـ«بلا تقييم» بدل كسر العرض.
 */
function normalizedValue(v: number | undefined): 1 | 2 | 3 | 4 | undefined {
  return v != null && v >= 1 && v <= 4 ? ((v as 1 | 2 | 3 | 4)) : undefined;
}

/* ================================================================== */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* الترويسة */
  head: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
    backgroundColor: c.bgAlt,
    borderBottomWidth: 1, borderBottomColor: c.line,
    gap: sp.sm,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  headBtn: {
    width: 36, height: 36, borderRadius: rad.sm,
    backgroundColor: c.bgLift, borderWidth: 1, borderColor: c.line,
    alignItems: 'center', justifyContent: 'center',
  },
  headBtnSolid: {
    width: 36, height: 36, borderRadius: rad.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headName: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  headNameSolid: { fontFamily: fnt.b, fontSize: fs.md, color: '#FFFFFF' },
  headMeta: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, marginTop: 2 },
  headMetaSolid: { fontFamily: fnt.m, fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scoreChip: { borderRadius: rad.sm, paddingHorizontal: sp.md, paddingVertical: 6 },
  scoreChipSolid: {
    borderRadius: rad.md, paddingHorizontal: sp.md, paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  scoreVal: { fontFamily: fnt.bk, fontSize: fs.md },
  scoreValSolid: { fontFamily: fnt.bk, fontSize: fs.md },
  scoreMax: { fontFamily: fnt.b, fontSize: fs.xs },
  scoreMaxSolid: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text3 },

  progRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progSide: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm, flex: 1,
    justifyContent: 'flex-end',
  },
  progText: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text2 },
  progTextSolid: { fontFamily: fnt.b, fontSize: fs.xs, color: '#FFFFFF' },
  progLevel: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text2 },
  progLevelBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: rad.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progLevelSolid: { fontFamily: fnt.b, fontSize: fs.xxs, color: '#FFFFFF' },
  progNone: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text4 },
  progNoneSolid: { fontFamily: fnt.r, fontSize: fs.xxs, color: 'rgba(255,255,255,0.75)' },

  quickBar: {
    flexDirection: 'row', alignItems: 'center', gap: sp.xs,
    paddingHorizontal: sp.lg, paddingVertical: sp.xs,
    backgroundColor: c.bgAlt, borderBottomWidth: 1, borderBottomColor: c.line,
    borderRadius: rad.lg,
  },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: rad.pill,
  },
  quickBtnText: { fontFamily: fnt.b, fontSize: 11, color: '#FFFFFF' },
  quickBtnClear: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: sp.sm, paddingVertical: 5,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.err + '40',
    backgroundColor: c.err + '10',
    marginLeft: 'auto',
  },
  quickBtnClearText: { fontFamily: fnt.m, fontSize: 10.5, color: c.err },

  /* اللوح الجانبي */
  metaPanel: {
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    backgroundColor: c.bg,
    borderBottomWidth: 1, borderBottomColor: c.line,
    gap: sp.sm,
  },
  metaFields: { flexDirection: 'row', gap: sp.sm },
  metaLabel: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.text2, marginBottom: 4 },
  metaInput: {
    backgroundColor: c.bgAlt,
    borderRadius: rad.sm, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 40,
    fontFamily: fnt.m, fontSize: fs.xs, color: c.text, textAlign: 'right',
  },
  metaLocked: { opacity: 0.6 },
  metaTools: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: sp.sm, paddingVertical: 5,
    borderRadius: rad.pill, borderWidth: 1,
  },
  toolText: { fontFamily: fnt.b, fontSize: 9.5 },

  histChip: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.sm, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
  },
  histChipOn: { borderColor: c.primary, backgroundColor: c.bgLift },
  histLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text },
  histDate: { fontFamily: fnt.r, fontSize: 9, color: c.text3, marginTop: 1 },
  histScore: { fontFamily: fnt.bk, fontSize: fs.sm },
  histScoreMax: { fontFamily: fnt.b, fontSize: 9, color: c.text3 },

  /* المحتوى */
  scroll: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.lg,
    paddingBottom: sp.xl,
    gap: sp.md,
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tableHeadTitle: { fontFamily: fnt.eb, fontSize: fs.md, color: c.text },

  /* ورقة البنود */
  sheet: {
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.line,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    gap: sp.sm,
  },
  rowOn: { backgroundColor: c.bgLift },

  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
  rowNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  rowNumText: { fontFamily: fnt.bk, fontSize: 10, color: c.text3 },
  rowText: { flex: 1, fontFamily: fnt.m, fontSize: fs.xs, color: c.text2, lineHeight: 19 },
  rowPass: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: rad.sm,
    backgroundColor: c.bgLift, borderWidth: 1, borderColor: 'transparent',
  },
  rowPassText: { fontFamily: fnt.b, fontSize: 9, color: c.text3 },

  rowOpts: { flexDirection: 'row', gap: 5, paddingRight: 30 },
  opt: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
    height: 34,
    borderRadius: rad.sm,
    borderWidth: 1.5, borderColor: c.line,
    backgroundColor: c.bg,
  },
  optNum: { fontFamily: fnt.bk, fontSize: fs.xs, color: c.text4 },
  optLabel: { fontFamily: fnt.m, fontSize: 9, color: c.text3 },
  optNumOn: { color: 'rgba(255,255,255,0.9)' },
  optLabelOn: { color: '#FFF', fontFamily: fnt.b },

  /* الملخص */
  resRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  resLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text3 },
  resScore: { fontFamily: fnt.bk, fontSize: fs.huge, color: c.text, marginTop: 2 },
  resScoreMax: { fontFamily: fnt.b, fontSize: fs.lg, color: c.text3 },
  resLevel: {
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
    borderRadius: rad.md, maxWidth: 160, alignItems: 'center',
  },
  resLevelText: { fontFamily: fnt.eb, fontSize: fs.xs, textAlign: 'center' },

  resMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs, marginTop: sp.lg },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: sp.sm, paddingVertical: 4,
    borderRadius: rad.pill,
  },
  pillText: { fontFamily: fnt.b, fontSize: 9.5 },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  distLabel: { fontFamily: fnt.b, fontSize: fs.xs, width: 64 },
  distTrack: {
    flex: 1, height: 8,
    backgroundColor: c.bgLift, borderRadius: 4, overflow: 'hidden',
  },
  distFill: { height: 8, borderRadius: 4 },
  distCount: {
    fontFamily: fnt.bk, fontSize: fs.xs, color: c.text2,
    width: 18, textAlign: 'center',
  },

  viewNote: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.warnBg,
    borderColor: 'rgba(168,115,11,0.24)',
    borderWidth: 1, borderRadius: rad.md,
    padding: sp.md,
  },
  viewNoteText: { flex: 1, fontFamily: fnt.m, fontSize: fs.xs, color: c.warn },

  footer: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.md,
    paddingBottom: sp.md,
    backgroundColor: c.bgAlt,
    borderTopWidth: 1, borderTopColor: c.line,
  },
});
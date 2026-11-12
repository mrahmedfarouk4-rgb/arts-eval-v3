import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GRADES, gradeName, type GradeId } from '@/constants/criteria';
import { c, sp, rad, fnt, fs } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import { Button, Card, Badge, Banner, Section, TopBar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { useAuth } from '@/lib/auth';
import { visibleGrades } from '@/lib/accounts';
import { confirmAction } from '@/lib/dialog';
import { listStudents, type Student } from '@/lib/store';
import { emitHtml } from '@/lib/print-client';
import { buildSixWeekReportHtml } from '@/lib/six-week-print';
import {
  REPORT_SUBJECTS, REPORT_RATINGS, REPORT_CRITERIA, emptyCriteria,
  getSixWeekReport, saveSixWeekReport,
  loadSixWeekDraft, saveSixWeekDraft, clearSixWeekDraft, draftHasContent,
  type CriteriaMap, type ReportCriterionId, type ReportRating, type ReportSubjectId,
  type SixWeekDraft,
} from '@/lib/six-week';
import {
  BEHAVIOR_TEMPLATES, COURSE_TEMPLATES, CRITERION_TEMPLATE_GROUPS,
  RECOMMENDATION_TEMPLATES, SOCIAL_TEMPLATES, SPECIAL_TEMPLATES,
  SUMMARY_TEMPLATES, TEMPLATE_LEVELS,
  type SixWeekTemplate,
} from '@/constants/six-week-templates';

type CourseDraft = { enabled: boolean; rating: ReportRating; note: string };
type CourseMap = Record<ReportSubjectId, CourseDraft>;

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** وقت محلي بصيغة 24h — لعرض «مسودة حُفظت 14:32» */
function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** إلحاق نموذج بما كتبه المعلم — لا يستبدل نصاً قائماً ولا يكرّر النموذج */
const appendText = (cur: string, text: string) =>
  cur.trim() ? `${cur.trim()}\n${text}` : text;

function emptyCourses(): CourseMap {
  return Object.fromEntries(
    REPORT_SUBJECTS.map((s) => [s.id, { enabled: false, rating: 'excellent', note: '' }])
  ) as CourseMap;
}

function RatingPicker({
  value, onChange,
}: {
  value: ReportRating;
  onChange: (v: ReportRating) => void;
}) {
  return (
    <View style={s.ratings}>
      {REPORT_RATINGS.map((r) => {
        const on = r.id === value;
        return (
          <Pressable
            key={r.id}
            onPress={() => onChange(r.id)}
            style={[s.rating, on && s.ratingOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[s.ratingText, on && s.ratingTextOn]}>{r.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TemplatePanel({
  title, templates, level = 'excellent', value, onInsert,
}: {
  title: string;
  templates: SixWeekTemplate[];
  level?: ReportRating;
  value: string;
  onInsert: (text: string) => void;
}) {
  const levels = TEMPLATE_LEVELS.filter((lv) => templates.some((t) => t.level === lv.id));
  const initial = levels.some((lv) => lv.id === level) ? level : (levels[0]?.id ?? 'excellent');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ReportRating>(initial);
  const active = levels.some((lv) => lv.id === picked) ? picked : (levels[0]?.id ?? 'excellent');
  const options = templates.filter((t) => t.level === active);

  if (!templates.length) return null;

  return (
    <View style={s.tpl}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [s.tplToggle, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name={open ? 'chevron-up' : 'sparkles-outline'} size={13} color={c.primary} />
        <Text style={s.tplToggleText}>{open ? 'إخفاء القوالب' : 'قوالب جاهزة'}</Text>
      </Pressable>

      {open && (
        <View style={s.tplBody}>
          <Text style={s.tplLabel}>{title}</Text>
          <View style={s.tplLevels}>
            {levels.map((lv) => {
              const on = lv.id === active;
              return (
                <Pressable
                  key={lv.id}
                  onPress={() => setPicked(lv.id)}
                  style={[s.tplLevel, on && s.tplLevelOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[s.tplLevelText, on && s.tplLevelTextOn]}>{lv.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {options.map((t) => {
            const used = value.includes(t.text);
            return (
              <Pressable
                key={t.id}
                onPress={() => onInsert(t.text)}
                style={({ pressed }) => [s.tplOption, used && s.tplOptionOn, pressed && { opacity: 0.9 }]}
                accessibilityRole="button"
                accessibilityLabel={`إضافة ${t.title}`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.tplTag}>{t.title}</Text>
                  <Text style={s.tplText}>{t.text}</Text>
                </View>
                <Ionicons
                  name={used ? 'checkmark-circle' : 'add-circle-outline'}
                  size={19}
                  color={used ? c.primary : c.text4}
                />
              </Pressable>
            );
          })}
          {options.length === 0 ? (
            <Text style={s.tplEmpty}>لا توجد قوالب في هذا المستوى.</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, minHeight = 76,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <View style={{ gap: sp.xs }}>
      <View style={s.fieldHead}>
        <Text style={[s.fieldLabel, { marginBottom: 0, flex: 1 }]}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.text4}
        multiline
        textAlignVertical="top"
        style={[s.textArea, { minHeight }]}
      />
    </View>
  );
}

export default function SixWeekReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    studentId?: string;
    studentName?: string;
    gradeId?: string;
  }>();
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const paramId = first(params.id);
  const paramStudentId = first(params.studentId);
  const paramStudentName = first(params.studentName);
  const paramGradeId = first(params.gradeId);
  const { teacherName, term } = useSession();
  const { user } = useAuth();

  const [reportId, setReportId] = useState<string | null>(paramId ?? null);
  const [loaded, setLoaded] = useState(!paramId);

  const [studentId, setStudentId] = useState<string | null>(paramStudentId ?? null);
  const [studentName, setStudentName] = useState(paramStudentName ?? '');
  const [gradeId, setGradeId] = useState<GradeId | null>(
    GRADES.some((g) => g.id === paramGradeId) ? (paramGradeId as GradeId) : null
  );
  const [date, setDate] = useState(todayISO());
  const [teacher, setTeacher] = useState(teacherName ?? '');

  const [summary, setSummary] = useState('');
  const [behavior, setBehavior] = useState('');
  const [social, setSocial] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [criteria, setCriteria] = useState<CriteriaMap>(emptyCriteria);
  const [courses, setCourses] = useState<CourseMap>(emptyCourses);

  const [students, setStudents] = useState<Student[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  /** تغييرات المستخدم لم تُحفظ كتقرير بعد — تشغّل الحفظ التلقائي وتنبيه الخروج */
  const [dirty, setDirty] = useState(false);
  const [draftAt, setDraftAt] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<SixWeekDraft | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await listStudents();
      // الطلاب داخل المراحل المسندة فقط — المعلم لا يرى غيره
      const allowed = new Set<string>(visibleGrades(user, GRADES.map((g) => g.id) as GradeId[]));
      if (alive) setStudents(list.filter((st) => !!st.grade_id && allowed.has(st.grade_id)));
    })();
    return () => { alive = false; };
  }, [user]);

  /** بدء تقرير من صف طالب: نستكمل الاسم والصف من سجل الطلاب إن لم يُمررا */
  useEffect(() => {
    if (paramId || !paramStudentId) return;
    const found = students.find((st) => st.id === paramStudentId);
    if (!found) return;
    if (!paramStudentName) setStudentName(found.name);
    if (!paramGradeId || !GRADES.some((g) => g.id === paramGradeId)) {
      setGradeId(found.grade_id);
    }
  }, [students, paramId, paramStudentId, paramStudentName, paramGradeId]);

  useEffect(() => {
    if (!paramId) return;
    let alive = true;
    (async () => {
      const r = await getSixWeekReport(paramId);
      if (!alive) return;
      if (r) {
        setReportId(r.id);
        setStudentId(r.student_id);
        setStudentName(r.student_name);
        setGradeId(r.grade_id);
        setDate(r.report_date);
        setTeacher(r.teacher_name);
        setSummary(r.summary);
        setBehavior(r.behavior);
        setSocial(r.social);
        setRecommendations(r.recommendations);
        setCriteria(r.criteria);
        const map = emptyCourses();
        for (const cr of r.courses) {
          if (map[cr.subject_id]) {
            map[cr.subject_id] = { enabled: true, rating: cr.rating, note: cr.note };
          }
        }
        setCourses(map);
      }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [paramId]);

  // مسودة سابقة لنفس السياق (تقرير جديد أو نفس المعرّف) — تُعرض للاسترجاع
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await loadSixWeekDraft();
      if (!alive || !d) return;
      if (d.reportId !== (paramId ?? null)) return;
      // مسودة طالب لا تُعرض عند فتح استمارة جديدة لطالب آخر
      if (!paramId && paramStudentId && (d.student_id ?? null) !== paramStudentId) return;
      if (!draftHasContent(d)) { await clearSixWeekDraft(); return; }
      setPendingDraft(d);
    })();
    return () => { alive = false; };
  }, [paramId, paramStudentId]);

  const draftPayload = useMemo<Omit<SixWeekDraft, 'updated_at'>>(() => ({
    reportId,
    student_id: studentId,
    student_name: studentName,
    grade_id: gradeId,
    report_date: date,
    teacher_name: teacher,
    summary,
    behavior,
    social,
    recommendations,
    criteria,
    courses: REPORT_SUBJECTS.map((sb) => ({
      subject_id: sb.id,
      enabled: courses[sb.id].enabled,
      rating: courses[sb.id].rating,
      note: courses[sb.id].note,
    })),
  }), [reportId, studentId, studentName, gradeId, date, teacher,
      summary, behavior, social, recommendations, criteria, courses]);

  useEffect(() => {
    if (!loaded || !dirty) return;
    const t = setTimeout(() => {
      saveSixWeekDraft(draftPayload).then(setDraftAt).catch((e) => {
        console.error('[six-week] فشل حفظ المسودة التلقائي:', e);
      });
    }, 800);
    return () => clearTimeout(t);
  }, [draftPayload, loaded, dirty]);

  const filteredStudents = useMemo(
    () => (query.trim()
      ? students.filter((s) => s.name.includes(query.trim()))
      : students),
    [students, query]
  );

  const selectedCount = REPORT_SUBJECTS.filter((s) => courses[s.id].enabled).length;

  const goBack = async () => {
    if (dirty) {
      const ok = await confirmAction(
        'تغييرات غير محفوظة',
        'لم تُحفظ التغييرات كتقرير، لكن احتفظنا بها كمسودة على هذا الجهاز —'
        + ' ستُعرض عليك عند فتح التقرير مرة أخرى.',
        { confirmLabel: 'خروج', cancelLabel: 'البقاء للمتابعة' }
      );
      if (!ok) return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/six-weeks' as never);
  };

  const pickStudent = (st: Student) => {
    setStudentId(st.id);
    setStudentName(st.name);
    setGradeId(st.grade_id);
    setPickerOpen(false);
    setQuery('');
    setDirty(true);
  };

  const restoreDraft = (d: SixWeekDraft) => {
    setReportId(d.reportId);
    setStudentId(d.student_id);
    setStudentName(d.student_name);
    setGradeId(d.grade_id);
    setDate(d.report_date);
    setTeacher(d.teacher_name);
    setSummary(d.summary);
    setBehavior(d.behavior);
    setSocial(d.social);
    setRecommendations(d.recommendations);
    setCriteria(d.criteria);
    const map = emptyCourses();
    for (const cr of d.courses) {
      if (map[cr.subject_id]) {
        map[cr.subject_id] = { enabled: cr.enabled, rating: cr.rating, note: cr.note };
      }
    }
    setCourses(map);
    setPendingDraft(null);
    setDirty(true);
  };

  const discardDraft = async () => {
    await clearSixWeekDraft();
    setPendingDraft(null);
    setDraftAt(null);
  };

  const toggleCourse = (id: ReportSubjectId) => {
    setCourses((m) => ({ ...m, [id]: { ...m[id], enabled: !m[id].enabled } }));
    setDirty(true);
  };

  const updateCourse = (id: ReportSubjectId, patch: Partial<CourseDraft>) => {
    setCourses((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setDirty(true);
  };

  const updateCriterion = (id: ReportCriterionId, patch: Partial<CriteriaMap[ReportCriterionId]>) => {
    setCriteria((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setDirty(true);
  };

  const onSave = async (printAfter: boolean) => {
    if (!studentId || !gradeId) {
      Alert.alert('اختر الطالب', 'يجب اختيار الطالب وصفّه قبل حفظ التقرير.');
      return;
    }
    const selected = REPORT_SUBJECTS
      .filter((s) => courses[s.id].enabled)
      .map((s) => ({
        subject_id: s.id,
        rating: courses[s.id].rating,
        note: courses[s.id].note.trim(),
      }));

    if (selected.length === 0) {
      Alert.alert('اختر مقرراً', 'حدد مقرراً واحداً على الأقل لتقييمه في التقرير.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveSixWeekReport({
        id: reportId ?? undefined,
        student_id: studentId,
        student_name: studentName,
        grade_id: gradeId,
        report_date: date.trim() || todayISO(),
        term,
        teacher_name: teacher.trim(),
        summary: summary.trim(),
        courses: selected,
        behavior: behavior.trim(),
        social: social.trim(),
        criteria,
        recommendations: recommendations.trim(),
      });
      setReportId(saved.id);
      await clearSixWeekDraft();
      setPendingDraft(null);
      setDraftAt(null);
      setDirty(false);
      if (printAfter) {
        await emitHtml(buildSixWeekReportHtml(saved));
      } else {
        Alert.alert('تم', 'حُفظ التقرير.');
      }
    } catch (e) {
      Alert.alert('تعذّر الحفظ', e instanceof Error ? e.message : 'حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <TopBar
        title="تقرير الستة أسابيع"
        sub={studentName ? `${studentName} · ${gradeName(gradeId ?? '')}` : 'اختر الطالب لبدء التقرير'}
        onBack={goBack}
        right={<Badge label="بدون درجات" color={c.primary} bg={c.primaryBg} />}
      />

      {!loaded ? (
        <View style={s.loading}><ActivityIndicator color={c.primary} /></View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {pendingDraft && (
              <Card padding={sp.md} accent={c.gold}>
                <View style={s.draftRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.draftTitle}>مسودة غير محفوظة</Text>
                    <Text style={s.draftSub}>
                      {pendingDraft.student_name ? `تقرير ${pendingDraft.student_name} — ` : ''}
                      {`حُفظت تلقائياً ${clockTime(pendingDraft.updated_at)}`}
                    </Text>
                  </View>
                  <Button
                    label="استرجاع"
                    icon="time-outline"
                    size="sm"
                    onPress={() => restoreDraft(pendingDraft)}
                  />
                  <Button label="تجاهل" size="sm" variant="soft" onPress={discardDraft} />
                </View>
              </Card>
            )}

            <Banner
              level="info"
              title="قوالب تقييم جاهزة"
              message="أسفل كل بند زر «قوالب جاهزة»: اختر مستوى التقدير، ثم أضف النص. يمكنك تعديل النص بعد إدراجه."
            />

            <Card padding={sp.md}>
              <View style={{ gap: sp.md }}>
                {studentId ? (
                  <View style={s.studentRow}>
                    <View style={s.studentIcon}>
                      <Ionicons name="person" size={18} color={c.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.studentName} numberOfLines={1}>{studentName}</Text>
                      <Text style={s.studentGrade}>{gradeName(gradeId ?? '')}</Text>
                    </View>
                    <Button label="تغيير" size="sm" variant="soft" onPress={() => setPickerOpen(true)} />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    style={({ pressed }) => [s.pickStudent, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="person-add-outline" size={20} color={c.primary} />
                    <Text style={s.pickStudentText}>اختيار الطالب</Text>
                    <Ionicons name="chevron-back" size={17} color={c.text4} />
                  </Pressable>
                )}

                <View style={s.metaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>التاريخ</Text>
                    <TextInput
                      value={date}
                      onChangeText={(v) => { setDate(v); setDirty(true); }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={c.text4}
                      style={s.input}
                    />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Text style={s.fieldLabel}>إعداد معلم المادة</Text>
                    <TextInput
                      value={teacher}
                      onChangeText={(v) => { setTeacher(v); setDirty(true); }}
                      placeholder="اسم المعلم"
                      placeholderTextColor={c.text4}
                      style={s.input}
                    />
                  </View>
                </View>
              </View>
            </Card>

            <Section title="أولاً: الأداء العام للطالب">
              <Field
                label="الأداء العام"
                value={summary}
                onChange={(v) => { setSummary(v); setDirty(true); }}
                placeholder="اكتب فقرة أو أكثر عن أداء الطالب وتطوره، وافصل بين الفقرات بسطر جديد..."
                minHeight={100}
              />
              <TemplatePanel
                title="قوالب الأداء العام"
                templates={SUMMARY_TEMPLATES}
                value={summary}
                onInsert={(t) => { setSummary((v) => appendText(v, t)); setDirty(true); }}
              />
            </Section>

            <Section
              title="ثانياً: التقييم التفصيلي للأنشطة والمقررات المعتمدة"
              hint="حدد المقررات التي تريد تقييم الطالب بها، ثم التقدير والملاحظات."
              count={selectedCount}
            >
              <View style={{ gap: sp.sm }}>
                {REPORT_SUBJECTS.map((sub) => {
                  const cr = courses[sub.id];
                  return (
                    <Card key={sub.id} padding={sp.md}>
                      <Pressable
                        onPress={() => toggleCourse(sub.id)}
                        style={s.courseHead}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: cr.enabled }}
                      >
                        <Ionicons
                          name={cr.enabled ? 'checkbox' : 'square-outline'}
                          size={21}
                          color={cr.enabled ? c.primary : c.text4}
                        />
                        <Text style={[s.courseName, cr.enabled && { color: c.primary }]}>
                          {sub.name}
                        </Text>
                      </Pressable>

                      {cr.enabled && (
                        <View style={{ gap: sp.sm, marginTop: sp.sm }}>
                          <Text style={s.fieldLabel}>التقدير</Text>
                          <RatingPicker
                            value={cr.rating}
                            onChange={(v) => updateCourse(sub.id, { rating: v })}
                          />
                          <Text style={s.fieldLabel}>الملاحظات</Text>
                          <TextInput
                            value={cr.note}
                            onChangeText={(v) => updateCourse(sub.id, { note: v })}
                            placeholder="ملاحظات المعلم على أداء الطالب في هذا المقرر..."
                            placeholderTextColor={c.text4}
                            multiline
                            textAlignVertical="top"
                            style={[s.textArea, { minHeight: 64 }]}
                          />
                          <TemplatePanel
                            title={`قوالب ${sub.name}`}
                            templates={[...COURSE_TEMPLATES[sub.id], ...SPECIAL_TEMPLATES]}
                            level={cr.rating}
                            value={cr.note}
                            onInsert={(t) => updateCourse(sub.id, { note: appendText(cr.note, t) })}
                          />
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            </Section>

            <Section title="ثالثاً: السلوك والانضباط">
              <Field
                label="الملاحظات"
                value={behavior}
                onChange={(v) => { setBehavior(v); setDirty(true); }}
                placeholder="الالتزام بالتعليمات، التعاون، المحافظة على أدوات المرسم..."
              />
              <TemplatePanel
                title="قوالب السلوك والانضباط"
                templates={[...BEHAVIOR_TEMPLATES, ...SPECIAL_TEMPLATES]}
                value={behavior}
                onInsert={(t) => { setBehavior((v) => appendText(v, t)); setDirty(true); }}
              />
            </Section>

            <Section title="رابعاً: الجوانب الشخصية والاجتماعية">
              <Field
                label="الملاحظات"
                value={social}
                onChange={(v) => { setSocial(v); setDirty(true); }}
                placeholder="الثقة بالنفس، العمل الجماعي، التعبير عن الأفكار..."
              />
              <TemplatePanel
                title="قوالب الجوانب الشخصية والاجتماعية"
                templates={[...SOCIAL_TEMPLATES, ...SPECIAL_TEMPLATES]}
                value={social}
                onInsert={(t) => { setSocial((v) => appendText(v, t)); setDirty(true); }}
              />
            </Section>

            <Section
              title="خامساً: ملخص مخرجات الطالب السلوكية والفنية"
              hint="تقدير مستوى الإتقان وملاحظة المعلم لكل معيار."
            >
              <View style={{ gap: sp.md }}>
                {REPORT_CRITERIA.map((cr) => (
                  <View key={cr.id} style={s.criterion}>
                    <Text style={s.criterionTitle}>{cr.name}</Text>
                    <RatingPicker
                      value={criteria[cr.id].rating}
                      onChange={(v) => updateCriterion(cr.id, { rating: v })}
                    />
                    <TextInput
                      value={criteria[cr.id].note}
                      onChangeText={(v) => updateCriterion(cr.id, { note: v })}
                      placeholder="ملاحظات المعلم..."
                      placeholderTextColor={c.text4}
                      multiline
                      textAlignVertical="top"
                      style={[s.textArea, { minHeight: 56 }]}
                    />
                    <TemplatePanel
                      title={`قوالب ${cr.name}`}
                      templates={CRITERION_TEMPLATE_GROUPS[cr.id]}
                      level={criteria[cr.id].rating}
                      value={criteria[cr.id].note}
                      onInsert={(t) =>
                        updateCriterion(cr.id, { note: appendText(criteria[cr.id].note, t) })
                      }
                    />
                  </View>
                ))}
              </View>
            </Section>

            <Section title="سادساً: توصيات المعلم">
              <Field
                label="التوصيات"
                value={recommendations}
                onChange={(v) => { setRecommendations(v); setDirty(true); }}
                placeholder="التوصيات المقترحة لدعم الطالب وتطوير أدائه..."
                minHeight={100}
              />
              <TemplatePanel
                title="قوالب التوصيات"
                templates={[...RECOMMENDATION_TEMPLATES, ...SPECIAL_TEMPLATES]}
                value={recommendations}
                onInsert={(t) => { setRecommendations((v) => appendText(v, t)); setDirty(true); }}
              />
            </Section>
          </ScrollView>

          <View style={s.footer}>
            {dirty && (
              <Text style={s.draftHint}>
                {draftAt
                  ? `مسودة محفوظة تلقائياً ${clockTime(draftAt)} — لم يُحفظ التقرير بعد`
                  : 'تغييرات لم تُحفظ'}
              </Text>
            )}
            <View style={s.footerRow}>
              <Button
                label="حفظ"
                icon="save-outline"
                variant="soft"
                loading={saving}
                onPress={() => onSave(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="حفظ وطباعة"
                icon="print-outline"
                loading={saving}
                onPress={() => onSave(true)}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={s.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>اختيار الطالب</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} accessibilityLabel="إغلاق">
                <Ionicons name="close" size={20} color={c.text2} />
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث باسم الطالب..."
              placeholderTextColor={c.text4}
              style={[s.input, { marginBottom: sp.sm }]}
            />

            {students.length === 0 ? (
              <Text style={s.modalEmpty}>لا يوجد طلاب. أضف الطلاب من قسم «الطلاب» أولاً.</Text>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 420 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => pickStudent(item)}
                    style={({ pressed }) => [s.studentItem, pressed && { backgroundColor: c.bgLift }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.studentItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.studentItemGrade}>{gradeName(item.grade_id ?? '')}</Text>
                    </View>
                    <Ionicons name="chevron-back" size={16} color={c.text4} />
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={s.modalEmpty}>لا نتائج مطابقة.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { ...contentColumn, padding: sp.lg, paddingBottom: sp.xxl, gap: sp.md },

  studentRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  studentIcon: {
    width: 40, height: 40, borderRadius: rad.md,
    backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  studentName: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  studentGrade: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },
  pickStudent: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    borderWidth: 1, borderStyle: 'dashed', borderColor: c.primaryLine,
    backgroundColor: c.primaryBg, borderRadius: rad.md, padding: sp.md,
  },
  pickStudentText: { flex: 1, fontFamily: fnt.sb, fontSize: fs.sm, color: c.primary },

  metaRow: { flexDirection: 'row', gap: sp.sm },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, marginBottom: 4 },
  fieldLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text3, marginBottom: 4 },
  input: {
    minHeight: 42, borderWidth: 1, borderColor: c.line, borderRadius: rad.sm,
    paddingHorizontal: sp.sm, paddingVertical: sp.xs,
    fontFamily: fnt.r, fontSize: fs.sm, color: c.text, backgroundColor: c.bgAlt,
  },
  textArea: {
    borderWidth: 1, borderColor: c.line, borderRadius: rad.sm,
    paddingHorizontal: sp.sm, paddingVertical: sp.sm,
    fontFamily: fnt.r, fontSize: fs.sm, color: c.text, backgroundColor: c.bgAlt,
    lineHeight: 21,
  },

  courseHead: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  courseName: { flex: 1, fontFamily: fnt.sb, fontSize: fs.sm, color: c.text },

  ratings: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs },
  rating: {
    paddingHorizontal: sp.sm, paddingVertical: 6,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.line,
    backgroundColor: c.bgAlt,
  },
  ratingOn: { backgroundColor: c.primary, borderColor: c.primary },
  ratingText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  ratingTextOn: { color: c.onPrimary, fontFamily: fnt.sb },

  criterion: {
    borderWidth: 1, borderColor: c.line, borderRadius: rad.md,
    padding: sp.md, gap: sp.sm, backgroundColor: c.bgAlt,
  },
  criterionTitle: { fontFamily: fnt.sb, fontSize: fs.sm, color: c.text },

  /* لوحة قوالب الصياغة — حدودها بارزة عن بطاقات الحقول وشرائحها مخطّطة
     لا معبّأة، حتى لا تُخلط بشرائح التقدير في الاستمارة */
  tpl: { gap: sp.xs },
  tplToggle: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5,
    paddingHorizontal: sp.sm, paddingVertical: 6,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.primaryLine,
    backgroundColor: c.primaryBg,
  },
  tplToggleText: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.primary },
  tplBody: {
    gap: sp.sm, padding: sp.sm, borderRadius: rad.md,
    borderWidth: 1, borderColor: c.line, backgroundColor: c.bgLift,
  },
  tplLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3 },
  tplLevels: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tplLevel: {
    paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: rad.pill,
    borderWidth: 1, borderColor: c.lineHi, backgroundColor: c.white,
  },
  tplLevelOn: { borderColor: c.primary, backgroundColor: c.primaryBg },
  tplLevelText: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.text3 },
  tplLevelTextOn: { fontFamily: fnt.sb, color: c.primary },
  tplOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm,
    padding: sp.sm, borderRadius: rad.sm, borderWidth: 1, borderColor: c.line,
    backgroundColor: c.white,
  },
  tplOptionOn: { borderColor: c.primaryLine, backgroundColor: c.primaryBg },
  tplTag: { fontFamily: fnt.sb, fontSize: fs.xxs, color: c.primary },
  tplText: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text2, lineHeight: 19 },
  tplEmpty: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, textAlign: 'center' },

  footer: {
    padding: sp.md, gap: sp.xs,
    borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg,
  },
  footerRow: { flexDirection: 'row', gap: sp.sm },
  draftHint: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, textAlign: 'center' },

  draftRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  draftTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  draftSub: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, marginTop: 2 },

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: c.bg, borderTopLeftRadius: rad.xl, borderTopRightRadius: rad.xl,
    padding: sp.lg, paddingBottom: sp.xl,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', marginBottom: sp.md },
  modalTitle: { flex: 1, fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  modalEmpty: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3, textAlign: 'center', padding: sp.lg },
  studentItem: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingVertical: sp.sm, paddingHorizontal: sp.xs,
    borderRadius: rad.sm,
  },
  studentItemName: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text },
  studentItemGrade: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 1 },
});

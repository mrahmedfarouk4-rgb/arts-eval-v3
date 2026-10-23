import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gradeName, type GradeId } from '@/constants/criteria';
import { c, sp, rad, fnt, fs } from '@/constants/brand';
import { Button, Card, Badge, Banner, Section, TopBar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { listStudents, type Student } from '@/lib/store';
import { emitHtml } from '@/lib/print-client';
import { buildSixWeekReportHtml } from '@/lib/six-week-print';
import {
  REPORT_SUBJECTS, REPORT_RATINGS, REPORT_CRITERIA, emptyCriteria,
  getSixWeekReport, saveSixWeekReport,
  type CriteriaMap, type ReportCriterionId, type ReportRating, type ReportSubjectId,
} from '@/lib/six-week';
import {
  BEHAVIOR_TEMPLATES, COURSE_TEMPLATES, CRITERION_TEMPLATE_GROUPS,
  RECOMMENDATION_TEMPLATES, SOCIAL_TEMPLATES, SPECIAL_TEMPLATES,
  SUMMARY_TEMPLATES, TEMPLATE_LEVELS,
  type SixWeekTemplate,
} from '@/constants/six-week-templates';

type TemplateTarget =
  | { kind: 'summary' }
  | { kind: 'behavior' }
  | { kind: 'social' }
  | { kind: 'recommendations' }
  | { kind: 'course'; subjectId: ReportSubjectId }
  | { kind: 'criterion'; criterionId: ReportCriterionId };

/** يجمع قوالب البند المطلوب، مع إتاحة قوالب ذوي الهمم لكل مقرر */
function templatesFor(target: TemplateTarget): { title: string; templates: SixWeekTemplate[] } {
  switch (target.kind) {
    case 'summary':
      return { title: 'قوالب الأداء العام', templates: SUMMARY_TEMPLATES };
    case 'behavior':
      return { title: 'قوالب السلوك والانضباط', templates: [...BEHAVIOR_TEMPLATES, ...SPECIAL_TEMPLATES] };
    case 'social':
      return {
        title: 'قوالب الجوانب الشخصية والاجتماعية',
        templates: [...SOCIAL_TEMPLATES, ...SPECIAL_TEMPLATES],
      };
    case 'recommendations':
      return { title: 'قوالب التوصيات', templates: [...RECOMMENDATION_TEMPLATES, ...SPECIAL_TEMPLATES] };
    case 'course': {
      const subject = REPORT_SUBJECTS.find((s) => s.id === target.subjectId);
      return {
        title: `قوالب ${subject?.name ?? 'المقرر'}`,
        templates: [...COURSE_TEMPLATES[target.subjectId], ...SPECIAL_TEMPLATES],
      };
    }
    case 'criterion': {
      const criterion = REPORT_CRITERIA.find((cr) => cr.id === target.criterionId);
      return {
        title: `قوالب ${criterion?.name ?? 'المعيار'}`,
        templates: CRITERION_TEMPLATE_GROUPS[target.criterionId],
      };
    }
  }
}

type CourseDraft = { enabled: boolean; rating: ReportRating; note: string };
type CourseMap = Record<ReportSubjectId, CourseDraft>;

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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

function TemplatesChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.templatesChip, pressed && { opacity: 0.65 }]}
      accessibilityRole="button"
      accessibilityLabel={`قوالب ${label}`}
    >
      <Ionicons name="sparkles-outline" size={12} color={c.primary} />
      <Text style={s.templatesChipText}>قوالب جاهزة</Text>
    </Pressable>
  );
}

function Field({
  label, value, onChange, placeholder, minHeight = 76, onTemplates, templatesLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  onTemplates?: () => void;
  templatesLabel?: string;
}) {
  return (
    <View style={{ gap: sp.xs }}>
      <View style={s.fieldHead}>
        <Text style={[s.fieldLabel, { marginBottom: 0, flex: 1 }]}>{label}</Text>
        {onTemplates ? (
          <TemplatesChip label={templatesLabel ?? label} onPress={onTemplates} />
        ) : null}
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
  const params = useLocalSearchParams<{ id?: string }>();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { teacherName, term } = useSession();

  const [reportId, setReportId] = useState<string | null>(paramId ?? null);
  const [loaded, setLoaded] = useState(!paramId);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [gradeId, setGradeId] = useState<GradeId | null>(null);
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
  const [templateTarget, setTemplateTarget] = useState<TemplateTarget | null>(null);
  const [templateLevel, setTemplateLevel] = useState<ReportRating>('excellent');

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await listStudents();
      if (alive) setStudents(list);
    })();
    return () => { alive = false; };
  }, []);

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

  const filteredStudents = useMemo(
    () => (query.trim()
      ? students.filter((s) => s.name.includes(query.trim()))
      : students),
    [students, query]
  );

  const selectedCount = REPORT_SUBJECTS.filter((s) => courses[s.id].enabled).length;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/six-weeks' as never);
  };

  const pickStudent = (st: Student) => {
    setStudentId(st.id);
    setStudentName(st.name);
    setGradeId(st.grade_id);
    setPickerOpen(false);
    setQuery('');
  };

  const toggleCourse = (id: ReportSubjectId) => {
    setCourses((m) => ({ ...m, [id]: { ...m[id], enabled: !m[id].enabled } }));
  };

  const updateCourse = (id: ReportSubjectId, patch: Partial<CourseDraft>) => {
    setCourses((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  };

  const updateCriterion = (id: ReportCriterionId, patch: Partial<CriteriaMap[ReportCriterionId]>) => {
    setCriteria((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  };

  const templateInfo = useMemo(
    () => (templateTarget ? templatesFor(templateTarget) : null),
    [templateTarget]
  );

  const availableLevels = useMemo(() => {
    const list = templateInfo?.templates ?? [];
    return TEMPLATE_LEVELS.filter((lv) => list.some((t) => t.level === lv.id));
  }, [templateInfo]);

  const visibleTemplates = useMemo(
    () => (templateInfo?.templates ?? []).filter((t) => t.level === templateLevel),
    [templateInfo, templateLevel]
  );

  const openTemplates = (target: TemplateTarget, level: ReportRating = 'excellent') => {
    const list = templatesFor(target).templates;
    setTemplateTarget(target);
    setTemplateLevel(list.some((t) => t.level === level) ? level : (list[0]?.level ?? 'excellent'));
  };

  const applyTemplate = (text: string, mode: 'append' | 'replace') => {
    if (!templateTarget) return;
    const merge = (current: string) =>
      mode === 'replace' || !current.trim() ? text : `${current.trim()}\n${text}`;

    switch (templateTarget.kind) {
      case 'summary':
        setSummary((v) => merge(v));
        break;
      case 'behavior':
        setBehavior((v) => merge(v));
        break;
      case 'social':
        setSocial((v) => merge(v));
        break;
      case 'recommendations':
        setRecommendations((v) => merge(v));
        break;
      case 'course': {
        const id = templateTarget.subjectId;
        setCourses((m) => ({ ...m, [id]: { ...m[id], note: merge(m[id].note) } }));
        break;
      }
      case 'criterion': {
        const id = templateTarget.criterionId;
        setCriteria((m) => ({ ...m, [id]: { ...m[id], note: merge(m[id].note) } }));
        break;
      }
    }
    setTemplateTarget(null);
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
            <Banner
              level="info"
              title="قوالب تقييم جاهزة"
              message="عند كل بند زر «قوالب جاهزة»: اختر مستوى التقدير، ثم أضف النص أو استبدله. يمكنك تعديل النص بعد إدراجه."
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
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={c.text4}
                      style={s.input}
                    />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Text style={s.fieldLabel}>إعداد معلم المادة</Text>
                    <TextInput
                      value={teacher}
                      onChangeText={setTeacher}
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
                onChange={setSummary}
                placeholder="اكتب فقرة أو أكثر عن أداء الطالب وتطوره، وافصل بين الفقرات بسطر جديد..."
                minHeight={100}
                onTemplates={() => openTemplates({ kind: 'summary' })}
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
                          <View style={s.fieldHead}>
                            <Text style={[s.fieldLabel, { marginBottom: 0, flex: 1 }]}>الملاحظات</Text>
                            <TemplatesChip
                              label={sub.name}
                              onPress={() => openTemplates({ kind: 'course', subjectId: sub.id }, cr.rating)}
                            />
                          </View>
                          <TextInput
                            value={cr.note}
                            onChangeText={(v) => updateCourse(sub.id, { note: v })}
                            placeholder="ملاحظات المعلم على أداء الطالب في هذا المقرر..."
                            placeholderTextColor={c.text4}
                            multiline
                            textAlignVertical="top"
                            style={[s.textArea, { minHeight: 64 }]}
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
                onChange={setBehavior}
                placeholder="الالتزام بالتعليمات، التعاون، المحافظة على أدوات المرسم..."
                onTemplates={() => openTemplates({ kind: 'behavior' })}
                templatesLabel="السلوك والانضباط"
              />
            </Section>

            <Section title="رابعاً: الجوانب الشخصية والاجتماعية">
              <Field
                label="الملاحظات"
                value={social}
                onChange={setSocial}
                placeholder="الثقة بالنفس، العمل الجماعي، التعبير عن الأفكار..."
                onTemplates={() => openTemplates({ kind: 'social' })}
                templatesLabel="الجوانب الاجتماعية"
              />
            </Section>

            <Section
              title="خامساً: ملخص مخرجات الطالب السلوكية والفنية"
              hint="تقدير مستوى الإتقان وملاحظة المعلم لكل معيار."
            >
              <View style={{ gap: sp.md }}>
                {REPORT_CRITERIA.map((cr) => (
                  <View key={cr.id} style={s.criterion}>
                    <View style={s.criterionHead}>
                      <Text style={[s.criterionTitle, { flex: 1 }]}>{cr.name}</Text>
                      <TemplatesChip
                        label={cr.name}
                        onPress={() =>
                          openTemplates(
                            { kind: 'criterion', criterionId: cr.id },
                            criteria[cr.id].rating
                          )
                        }
                      />
                    </View>
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
                  </View>
                ))}
              </View>
            </Section>

            <Section title="سادساً: توصيات المعلم">
              <Field
                label="التوصيات"
                value={recommendations}
                onChange={setRecommendations}
                placeholder="التوصيات المقترحة لدعم الطالب وتطوير أدائه..."
                minHeight={100}
                onTemplates={() => openTemplates({ kind: 'recommendations' })}
              />
            </Section>
          </ScrollView>

          <View style={s.footer}>
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

      {/* مكتبة القوالب الجاهزة — تُفتح من زر «قوالب جاهزة» عند أي بند */}
      <Modal
        visible={!!templateTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateTarget(null)}
      >
        <View style={s.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTemplateTarget(null)} />
          <View style={s.templateSheet}>
            <View style={s.modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{templateInfo?.title ?? 'قوالب جاهزة'}</Text>
                <Text style={s.modalSub}>
                  اختر المستوى، ثم أضف النص إلى الحقل أو استبدل ما فيه
                </Text>
              </View>
              <Pressable
                onPress={() => setTemplateTarget(null)}
                hitSlop={10}
                accessibilityLabel="إغلاق"
              >
                <Ionicons name="close" size={20} color={c.text2} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.levelRow}
            >
              {availableLevels.map((lv) => {
                const on = lv.id === templateLevel;
                return (
                  <Pressable
                    key={lv.id}
                    onPress={() => setTemplateLevel(lv.id)}
                    style={[s.levelChip, on && s.levelChipOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[s.levelChipText, on && s.levelChipTextOn]}>{lv.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
              {visibleTemplates.map((tpl) => (
                <View key={tpl.id} style={s.templateCard}>
                  <Text style={s.templateTitle}>{tpl.title}</Text>
                  <Text style={s.templateText}>{tpl.text}</Text>
                  <View style={s.templateActions}>
                    <Pressable
                      onPress={() => applyTemplate(tpl.text, 'append')}
                      style={({ pressed }) => [
                        s.templateBtn,
                        s.templateBtnPrimary,
                        pressed && { opacity: 0.75 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`إضافة ${tpl.title}`}
                    >
                      <Ionicons name="add-circle-outline" size={15} color={c.onPrimary} />
                      <Text style={[s.templateBtnText, { color: c.onPrimary }]}>إضافة</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => applyTemplate(tpl.text, 'replace')}
                      style={({ pressed }) => [s.templateBtn, pressed && { opacity: 0.75 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`استبدال بـ ${tpl.title}`}
                    >
                      <Ionicons name="swap-horizontal-outline" size={15} color={c.primary} />
                      <Text style={[s.templateBtnText, { color: c.primary }]}>استبدال</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {visibleTemplates.length === 0 ? (
                <Text style={s.modalEmpty}>لا توجد قوالب في هذا المستوى.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: sp.lg, paddingBottom: sp.xxl, gap: sp.md },

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
  templatesChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.primaryLine,
    backgroundColor: c.primaryBg,
  },
  templatesChipText: { fontFamily: fnt.m, fontSize: 10, color: c.primary },
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
  criterionHead: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
  criterionTitle: { fontFamily: fnt.sb, fontSize: fs.sm, color: c.text },

  footer: {
    flexDirection: 'row', gap: sp.sm, padding: sp.md,
    borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg,
  },

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: c.bg, borderTopLeftRadius: rad.xl, borderTopRightRadius: rad.xl,
    padding: sp.lg, paddingBottom: sp.xl,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', marginBottom: sp.md },
  modalTitle: { flex: 1, fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  modalSub: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },
  modalEmpty: { fontFamily: fnt.r, fontSize: fs.sm, color: c.text3, textAlign: 'center', padding: sp.lg },

  templateSheet: {
    backgroundColor: c.bg, borderTopLeftRadius: rad.xl, borderTopRightRadius: rad.xl,
    padding: sp.lg, paddingBottom: sp.xl, maxHeight: '88%',
  },
  levelRow: { flexDirection: 'row', gap: sp.xs, paddingBottom: sp.sm },
  levelChip: {
    paddingHorizontal: sp.sm, paddingVertical: 6,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.line,
    backgroundColor: c.bgAlt,
  },
  levelChipOn: { backgroundColor: c.primary, borderColor: c.primary },
  levelChipText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  levelChipTextOn: { color: c.onPrimary, fontFamily: fnt.sb },
  templateCard: {
    borderWidth: 1, borderColor: c.line, borderRadius: rad.md,
    backgroundColor: c.bgAlt, padding: sp.md, marginBottom: sp.sm, gap: sp.xs,
  },
  templateTitle: { fontFamily: fnt.b, fontSize: fs.sm, color: c.primary },
  templateText: { fontFamily: fnt.r, fontSize: fs.xs, color: c.text2, lineHeight: 20 },
  templateActions: { flexDirection: 'row', gap: sp.xs, marginTop: sp.xxs },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: sp.sm, paddingVertical: 6,
    borderRadius: rad.sm, borderWidth: 1, borderColor: c.primaryLine,
    backgroundColor: c.bg,
  },
  templateBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
  templateBtnText: { fontFamily: fnt.sb, fontSize: fs.xxs },
  studentItem: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingVertical: sp.sm, paddingHorizontal: sp.xs,
    borderRadius: rad.sm,
  },
  studentItemName: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text },
  studentItemGrade: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 1 },
});

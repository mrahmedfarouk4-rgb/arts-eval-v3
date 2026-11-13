import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  SUBJECTS, EVAL_KINDS, subjectsForGrade,
  gradeName, subjectName, kindMeta, formTotals, sumScores, levelFor,
  type GradeId,
} from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c, sp, rad, fnt, fs, gradeTone, kindTone } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import { PageHero, HeroStat, HeroDivider, SectionHead } from '@/components/page-hero';
import { Card, Badge, Empty, Progress, TopBar } from '@/components/pro-ui';
import { StudentReportCardModal } from '@/components/student-report-card';
import { evaluationsForStudent, listStudents, type Evaluation, type Student } from '@/lib/store';

interface Cell {
  subject: string;
  counts: Record<string, number>;
  last: Record<string, { score: number; max: number } | null>;
}

export default function StudentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string }>();

  const [student, setStudent] = useState<Student | null>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await listStudents(true);
        setStudent(all.find((s) => s.id === params.id) ?? null);
        setEvals(await evaluationsForStudent(params.id ?? ''));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const gradeId = (student?.grade_id ?? 'grade4') as GradeId;
  const tone = gradeTone(gradeId);

  /** مصفوفة: مقرّر × نوع تقييم — آخر نتيجة وعدد التسجيلات */
  const matrix = useMemo<Cell[]>(() => {
    return subjectsForGrade(gradeId, 'all').map((sid) => {
      const counts: Record<string, number> = {};
      const last: Record<string, { score: number; max: number } | null> = {};
      for (const k of EVAL_KINDS.map((x) => x.id)) {
        const t = formTotals(k, gradeId, sid, 'all');
        const list = evals
          .filter((e) => e.subject_id === sid && e.evaluation_type === k)
          // التاريخ فارغ في الاستمارات المهيّأة — نفرّغه بدل أن يُسقط الفرز
          .sort((a, b) =>
            String(b.evaluation_date || '').localeCompare(String(a.evaluation_date || ''))
          );
        counts[k] = list.length;
        last[k] = list.length
          ? { score: sumScores(list[0].scores ?? {}, t.criteria), max: t.actualMax }
          : null;
      }
      return { subject: sid, counts, last };
    });
  }, [evals, gradeId]);

  const open = (subjectId: string, kind: CriteriaKind) => {
    router.push({
      pathname: '/evaluate',
      params: {
        studentId: params.id ?? '',
        studentName: student?.name ?? params.name ?? '',
        gradeId,
        subjectId,
        kind,
        from: `/student/${params.id}`,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <TopBar title="الطالب" onBack={() => router.back()} />
        <Empty
          icon="person-outline"
          title="الطالب غير موجود"
          message="ربما تم حذف هذا الطالب"
        />
      </SafeAreaView>
    );
  }

  const ratedSubjects = matrix.filter((r) => EVAL_KINDS.some((k) => r.counts[k.id] > 0)).length;
  const recent = [...evals]
    // التاريخ فارغ في الاستمارات المهيّأة — نفرّغه بدل أن يُسقط الفرز
    .sort((a, b) => String(b.evaluation_date || '').localeCompare(String(a.evaluation_date || '')))
    .slice(0, 12);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <PageHero
          tone={tone}
          eyebrow="ملف الطالب"
          title={student.name}
          sub={`${gradeName(gradeId)} · ${evals.length} تقييم مسجل`}
          onBack={() => router.back()}
        >
          <HeroStat value={evals.length} label="إجمالي التقييمات" tone={tone} />
          <HeroDivider tone={tone} />
          <HeroStat value={ratedSubjects} label="مقررات مُقيَّمة" tone={tone} />
          <HeroDivider tone={tone} />
          <HeroStat value={matrix.length - ratedSubjects} label="مقررات متبقية" tone={tone} />
        </PageHero>

        {/* زر مشاركة التقرير الذكي */}
        <Pressable
          onPress={() => setReportVisible(true)}
          style={({ pressed }) => [
            s.reportBtn,
            { backgroundColor: tone.base, borderColor: tone.deep + '30' },
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="عرض ومشاركة بطاقة التقرير لولي الأمر"
        >
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={s.reportBtnText}>عرض ومشاركة بطاقة التقرير لولي الأمر</Text>
          <Ionicons name="share-social-outline" size={17} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
        </Pressable>

        {/* مصفوفة التقييمات */}
        <SectionHead title="التقييمات حسب المقرر" hint="اضغط الخانة لفتح الاستمارة" tone={tone} />
        <View style={{ gap: sp.sm, marginTop: -sp.md }}>
            {matrix.map((row) => {
              const subj = SUBJECTS.find((x) => x.id === row.subject);
              const total = EVAL_KINDS.reduce((a, k) => a + row.counts[k.id], 0);

              return (
                <Card
                  key={row.subject}
                  padding={sp.md}
                  accent={total > 0 ? tone.vivid : undefined}
                >
                  <View style={s.row}>
                    <View style={s.subjIcon}>
                      <Ionicons name="brush" size={16} color={c.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.subjName}>{subj?.name ?? row.subject}</Text>
                      <Text style={s.subjDesc} numberOfLines={1}>{subj?.desc ?? ''}</Text>
                    </View>
                    {total > 0 && <Badge label={`${total}`} color={c.ok} bg={c.okBg} />}
                  </View>

                  <View style={s.kindsRow}>
                    {EVAL_KINDS.map((k) => {
                      const n = row.counts[k.id];
                      const l = row.last[k.id];
                      const tone = kindTone[k.id];
                      const lv = l ? levelFor(k.id, l.score) : null;
                      const on = !!l;

                      return (
                        <Pressable
                          key={k.id}
                          onPress={() => open(row.subject, k.id)}
                          style={({ pressed }) => [
                            s.kindCell,
                            on && {
                              backgroundColor: lv?.bg ?? tone.bg,
                              borderColor: lv?.color ?? tone.c,
                            },
                            pressed && { opacity: 0.8 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${k.name} — ${n} تسجيل`}
                        >
                          <View style={s.kindHead}>
                            <View style={[s.kindDot, { backgroundColor: tone.c }]} />
                            <Text style={s.kindName} numberOfLines={1}>{k.name}</Text>
                          </View>

                          {l ? (
                            <>
                              <Text style={[s.kindScore, { color: lv?.color ?? tone.c }]}>
                                {l.score}
                                <Text style={s.kindScoreMax}>/{l.max}</Text>
                              </Text>
                              <Progress
                                value={l.score}
                                max={l.max}
                                color={lv?.color ?? tone.c}
                                height={4}
                              />
                              <Text style={s.kindCount}>{n} تسجيل</Text>
                            </>
                          ) : (
                            <Text style={s.kindNone}>لا يوجد</Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
        </View>

        {/* آخر التقييمات */}
        {recent.length > 0 && (
          <View style={{ gap: sp.sm }}>
            <SectionHead title="آخر التقييمات" count={recent.length} tone={tone} />
            <Card padding={0}>
              {recent.map((e, i) => {
                const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
                const sum = sumScores(e.scores ?? {}, t.criteria);
                const lv = levelFor(e.evaluation_type, sum);
                const tone = kindTone[e.evaluation_type];

                return (
                  <Pressable
                    key={e.id}
                    onPress={() => open(e.subject_id, e.evaluation_type)}
                    style={({ pressed }) => [
                      s.histRow,
                      i > 0 && s.histRowBorder,
                      pressed && { backgroundColor: c.bgLift },
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={[s.histDot, { backgroundColor: tone.c }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.histSubject} numberOfLines={1}>
                        {subjectName(e.subject_id)}
                      </Text>
                      <Text style={s.histMeta} numberOfLines={1}>
                        {kindMeta(e.evaluation_type).name} · {e.evaluation_date}
                        {e.label ? ` · ${e.label}` : ''}
                      </Text>
                    </View>
                    <Text style={[s.histScore, { color: lv?.color ?? tone.c }]}>
                      {sum}
                      <Text style={s.histScoreMax}>/{t.actualMax}</Text>
                    </Text>
                    <Ionicons name="chevron-back" size={15} color={c.text4} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}

        <View style={{ height: sp.xl }} />
      </ScrollView>

      <StudentReportCardModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        student={student}
        evaluations={evals}
        gradeId={gradeId}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  scroll: { ...contentColumn, paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.huge, gap: sp.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  bigAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  bigAvatarText: { fontFamily: fnt.bk, fontSize: fs.xxl, color: c.primary },
  heroName: { fontFamily: fnt.bk, fontSize: fs.lg, color: c.text },
  hRule: { height: 1, backgroundColor: c.line, marginVertical: sp.lg },

  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fnt.bk, fontSize: fs.xxl, color: c.primary },
  statLabel: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 3, textAlign: 'center' },
  vRule: { width: 1, height: 26, backgroundColor: c.line },

  subjIcon: {
    width: 36, height: 36, borderRadius: rad.sm,
    backgroundColor: c.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  subjName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  subjDesc: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },

  kindsRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },
  kindCell: {
    flex: 1,
    borderRadius: rad.md,
    borderWidth: 1.5, borderColor: c.line,
    backgroundColor: c.bg,
    padding: sp.sm,
    gap: 4,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kindDot: { width: 5, height: 5, borderRadius: 3 },
  kindName: { fontFamily: fnt.m, fontSize: 8.5, color: c.text3 },
  kindScore: { fontFamily: fnt.bk, fontSize: fs.lg },
  kindScoreMax: { fontFamily: fnt.b, fontSize: 9, color: c.text3 },
  kindCount: { fontFamily: fnt.r, fontSize: 8.5, color: c.text3 },
  kindNone: { fontFamily: fnt.r, fontSize: 10, color: c.text4 },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.md },
  histRowBorder: { borderTopWidth: 1, borderTopColor: c.line },
  histDot: { width: 7, height: 7, borderRadius: 4 },
  histSubject: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text },
  histMeta: { fontFamily: fnt.r, fontSize: 9.5, color: c.text3, marginTop: 2 },
  histScore: { fontFamily: fnt.bk, fontSize: fs.md },
  histScoreMax: { fontFamily: fnt.b, fontSize: 9.5, color: c.text3 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: sp.md,
    paddingVertical: 12,
    borderRadius: rad.md,
    borderWidth: 1,
    marginTop: -sp.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reportBtnText: {
    fontFamily: fnt.b,
    fontSize: fs.xs,
    color: '#FFFFFF',
  },
});
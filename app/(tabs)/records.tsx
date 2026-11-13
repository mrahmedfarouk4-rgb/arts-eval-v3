import { arabicDigits } from '@/components/count-up';
import { ExpandCard } from '@/components/expand-card';
import { GaugeTile } from '@/components/gauge';
import { PageHero, SectionHead } from '@/components/page-hero';
import { Badge, Empty, Stat } from '@/components/pro-ui';
import { SkeletonRows } from '@/components/skeleton';
import { BRAND_TONE, c, fnt, fs, kindTone, levelTone, rad, sh, sp } from '@/constants/brand';
import { contentColumn } from '@/constants/layout';
import {
    GRADES,
    formTotals,
    gradeName,
    kindMeta,
    subjectName,
    sumScores,
} from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { visibleGrades } from '@/lib/accounts';
import { useAuth } from '@/lib/auth';
import { listEvaluations, listStudents, type Evaluation } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** المراحل الفعلية — المعرّف القديم `intermediate1` لا يُعرض */
const ACTIVE_GRADES = GRADES.filter((g) => g.id !== 'intermediate1');
const ACTIVE_GRADE_IDS = ACTIVE_GRADES.map((g) => g.id);

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<CriteriaKind | null>(null);
  /** كل / مُقيَّم / جاهز للتعبئة */
  const [filterStatus, setFilterStatus] = useState<'all' | 'done' | 'ready'>('all');
  /** السجل المفولوج أمام الطالب — واحدة فقط تنفرج في المرّة */
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [e, s] = await Promise.all([listEvaluations(), listStudents(true)]);
        setEvals(e);
        const n: Record<string, string> = {};
        for (const st of s) n[st.id] = st.name;
        setNames(n);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** المراحل المسندة لهذا الحساب — تُستخدم في تصفية السجل ورقائق التصفية */
  const allowedGradeIds = useMemo(
    () => new Set<string>(visibleGrades(user, ACTIVE_GRADE_IDS)),
    [user]
  );

  /** التقييمات داخل المراحل المسندة لهذا الحساب فقط */
  const scopedEvals = useMemo(
    () => evals.filter((e) => allowedGradeIds.has(e.grade_id)),
    [evals, allowedGradeIds]
  );

  const scored = scopedEvals.filter((e) => Object.keys(e.scores ?? {}).length > 0);
  const pending = scopedEvals.length - scored.length;

  const filtered = useMemo(() => {
    let list = [...scopedEvals].sort((a, b) => {
      // الفارغ آخر القائمة دائماً (مرتّبة بالتاريخ)
      const ae = Object.keys(a.scores ?? {}).length > 0;
      const be = Object.keys(b.scores ?? {}).length > 0;
      if (ae !== be) return ae ? -1 : 1;
      // التاريخ فارغ في الاستمارات المهيّأة — نفرّغه بدل أن يُسقط الفرز
      return String(b.evaluation_date || '').localeCompare(String(a.evaluation_date || ''));
    });
    if (filterGrade) list = list.filter((e) => e.grade_id === filterGrade);
    if (filterKind) list = list.filter((e) => e.evaluation_type === filterKind);
    if (filterStatus !== 'all') {
      const wantFilled = filterStatus === 'done';
      list = list.filter(
        (e) => (Object.keys(e.scores ?? {}).length > 0) === wantFilled
      );
    }
    return list;
  }, [scopedEvals, filterGrade, filterKind, filterStatus]);

  const sections = useMemo(() => {
    const map = new Map<string, Evaluation[]>();
    for (const e of filtered) {
      // الاستمارات الفارغة بلا تاريخ — نجمعها في مجموعة واحدة
      const key = e.evaluation_date ? e.evaluation_date.slice(0, 7) : '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()]
      .sort((a, b) => {
        if (!a[0]) return 1;   // بلا تاريخ في النهاية
        if (!b[0]) return -1;
        return b[0].localeCompare(a[0]);
      })
      .map(([month, data]) => ({
        month,
        title: month ? monthLabel(`${month}-01`) : 'بانتظار التعبئة',
        data,
      }));
  }, [filtered]);

  const avg = useMemo(() => {
    const done = scopedEvals.filter((e) => Object.keys(e.scores ?? {}).length > 0);
    if (!done.length) return 0;
    let sum = 0;
    for (const e of done) {
      const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
      if (t.actualMax > 0) sum += sumScores(e.scores ?? {}, t.criteria) / t.actualMax;
    }
    return Math.round((sum / done.length) * 100);
  }, [scopedEvals]);

  /** متوسّط نسبة الدرجات لكل نوع تقييم — يُقرأ من المؤشّرات الدائرية */
  const kindRates = useMemo(() => {
    const acc = {
      weekly: { sum: 0, n: 0 },
      periodic: { sum: 0, n: 0 },
      final: { sum: 0, n: 0 },
    } as Record<CriteriaKind, { sum: number; n: number }>;
    for (const e of scopedEvals) {
      if (!Object.keys(e.scores ?? {}).length) continue;
      const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
      if (t.actualMax <= 0) continue;
      const cell = acc[e.evaluation_type];
      cell.sum += sumScores(e.scores ?? {}, t.criteria) / t.actualMax;
      cell.n += 1;
    }
    return acc;
  }, [scopedEvals]);

  /** رادار المتابعة الفردية — الطلاب الحاصلين على أقل من ٥٠٪ */
  const interventionList = useMemo(() => {
    const items: {
      id: string;
      studentId: string;
      studentName: string;
      gradeId: string;
      subjectId: string;
      score: number;
      max: number;
      pct: number;
      date: string;
    }[] = [];

    for (const e of scopedEvals) {
      if (!Object.keys(e.scores ?? {}).length) continue;
      const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
      if (t.actualMax <= 0) continue;
      const sum = sumScores(e.scores ?? {}, t.criteria);
      const pct = Math.round((sum / t.actualMax) * 100);
      if (pct < 50) {
        items.push({
          id: e.id,
          studentId: e.student_id,
          studentName: names[e.student_id] ?? 'طالب',
          gradeId: e.grade_id,
          subjectId: e.subject_id,
          score: sum,
          max: t.actualMax,
          pct,
          date: e.evaluation_date,
        });
      }
    }
    return items.slice(0, 6);
  }, [scopedEvals, names]);

  /** تحليل المهارات ونقاط القوة والضعف */
  const skillAnalytics = useMemo(() => {
    const counts: Record<string, { sum: number; n: number; text: string }> = {};

    for (const e of scopedEvals) {
      if (!Object.keys(e.scores ?? {}).length) continue;
      const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
      for (const crit of t.criteria) {
        const val = e.scores?.[crit.id];
        if (typeof val === 'number') {
          if (!counts[crit.id]) {
            counts[crit.id] = { sum: 0, n: 0, text: crit.text };
          }
          counts[crit.id].sum += val / (crit.max || 4);
          counts[crit.id].n += 1;
        }
      }
    }

    const ranked = Object.values(counts)
      .filter((c) => c.n >= 2)
      .map((c) => ({
        text: c.text,
        pct: Math.round((c.sum / c.n) * 100),
        evalCount: c.n,
      }))
      .sort((a, b) => b.pct - a.pct);

    const strengths = ranked.slice(0, 3);
    const focusAreas = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

    return { strengths, focusAreas };
  }, [scopedEvals]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <SectionList
        sections={loading ? [] : sections}
        keyExtractor={(e) => e.id}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            <PageHero
              tone={BRAND_TONE}
              eyebrow="سجل التقييمات"
              title="السجل"
              sub={`${scopedEvals.length} تقييم مسجل · ${scored.length} مُقيَّم · ${pending} بانتظار التعبئة`}
              compact
            />

            {/* إحصاء — اضغط أي خانة للتصفية */}
            <View style={s.statBar}>
        <Pressable
          style={s.statCell}
          onPress={() => setFilterStatus((v) => (v === 'done' ? 'all' : 'done'))}
          accessibilityRole="radio"
          accessibilityState={{ selected: filterStatus === 'done' }}
        >
          <Stat
            value={scored.length}
            label="مُقيَّم"
            color={c.okText}
            underline={filterStatus === 'done'}
          />
        </Pressable>
        <View style={s.vRule} />
        <Pressable
          style={s.statCell}
          onPress={() => setFilterStatus((v) => (v === 'ready' ? 'all' : 'ready'))}
          accessibilityRole="radio"
          accessibilityState={{ selected: filterStatus === 'ready' }}
        >
          <Stat
            value={pending}
            label="جاهز للتعبئة"
            color={c.warnText}
            underline={filterStatus === 'ready'}
          />
        </Pressable>
        <View style={s.vRule} />
        <View style={s.statCell}>
          <Stat value={`${avg}%`} label="متوسط النسبة" color={c.primary} />
        </View>
      </View>

      {/* ===== مؤشّر الإتقان — بطاقات دائرية، والضغط على واحدة يصفّي السجل ===== */}
      {!loading && scored.length > 0 && (
        <View style={s.gaugeCard}>
          <Text style={s.gaugeTitle}>مؤشّر الإتقان حسب النوع</Text>
          <View style={s.gaugeRow}>
            {(['weekly', 'periodic', 'final'] as CriteriaKind[]).map((k) => {
              const r = kindRates[k];
              const t = kindTone[k];
              return (
                <GaugeTile
                  key={k}
                  ratio={r.n ? r.sum / r.n : 0}
                  label={kindMeta(k).name}
                  detail={r.n ? `${arabicDigits(r.n)} تقييم` : 'لا نتائج بعد'}
                  color={t.c}
                  icon={k === 'weekly' ? 'flash-outline' : k === 'periodic' ? 'trending-up-outline' : 'trophy-outline'}
                  size={82}
                  onPress={() => setFilterKind((v) => (v === k ? null : k))}
                  style={filterKind === k ? { borderColor: t.c } : undefined}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ===== التحليل الذكي ورادار المهارات ===== */}
      {!loading && scored.length > 0 && (
        <View style={s.analyticsWrap}>
          <Pressable
            onPress={() => setShowAnalytics((v) => !v)}
            style={({ pressed }) => [
              s.analyticsToggle,
              showAnalytics && s.analyticsToggleActive,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
          >
            <View style={s.analyticsToggleIcon}>
              <Ionicons name="analytics" size={17} color={showAnalytics ? '#FFFFFF' : c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.analyticsToggleTitle, showAnalytics && { color: '#FFFFFF' }]}>
                التحليل الذكي ورادار مهارات الطلاب
              </Text>
              <Text style={[s.analyticsToggleSub, showAnalytics && { color: 'rgba(255,255,255,0.85)' }]}>
                نقاط القوة · المهارات المستهدفة · قائمة المتابعة
              </Text>
            </View>
            <Ionicons
              name={showAnalytics ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={showAnalytics ? '#FFFFFF' : c.text3}
            />
          </Pressable>

          {showAnalytics && (
            <View style={s.analyticsBody}>
              {/* نقاط القوة */}
              {skillAnalytics.strengths.length > 0 && (
                <View style={s.skillGroup}>
                  <View style={s.skillGroupHead}>
                    <Ionicons name="sparkles" size={15} color={c.ok} />
                    <Text style={s.skillGroupTitle}>أعلى المهارات إتقاناً (نقاط القوة)</Text>
                  </View>
                  {skillAnalytics.strengths.map((sk, idx) => (
                    <View key={idx} style={s.skillRow}>
                      <Text style={s.skillRank}>#{idx + 1}</Text>
                      <Text style={s.skillText} numberOfLines={2}>{sk.text}</Text>
                      <View style={s.skillPctBadge}>
                        <Text style={s.skillPctText}>{sk.pct}٪</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* مجالات التركيز والتدريب */}
              {skillAnalytics.focusAreas.length > 0 && (
                <View style={s.skillGroup}>
                  <View style={s.skillGroupHead}>
                    <Ionicons name="locate-outline" size={15} color={c.warnText} />
                    <Text style={s.skillGroupTitle}>مهارات يُوصى بالتركيز عليها بالحصة</Text>
                  </View>
                  {skillAnalytics.focusAreas.map((sk, idx) => (
                    <View key={idx} style={s.skillRow}>
                      <Text style={[s.skillRank, { color: c.warnText }]}>#{idx + 1}</Text>
                      <Text style={s.skillText} numberOfLines={2}>{sk.text}</Text>
                      <View style={[s.skillPctBadge, { backgroundColor: c.warnBg }]}>
                        <Text style={[s.skillPctText, { color: c.warnText }]}>{sk.pct}٪</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* رادار خطط الدعم الفردية */}
              <View style={s.skillGroup}>
                <View style={s.skillGroupHead}>
                  <Ionicons name="alert-circle-outline" size={15} color={c.err} />
                  <Text style={s.skillGroupTitle}>رادار المتابعة والرعاية الفردية (دون ٥٠٪)</Text>
                </View>
                {interventionList.length === 0 ? (
                  <View style={s.interEmpty}>
                    <Ionicons name="checkmark-done-circle" size={18} color={c.ok} />
                    <Text style={s.interEmptyText}>ممتاز! جميع الطلاب المحسوبين حققوا ٥٠٪ فأعلى.</Text>
                  </View>
                ) : (
                  interventionList.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/student/${item.studentId}` as never)}
                      style={({ pressed }) => [s.interRow, pressed && { backgroundColor: c.bgLift }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.interName}>{item.studentName}</Text>
                        <Text style={s.interMeta}>{gradeName(item.gradeId)} · {subjectName(item.subjectId)}</Text>
                      </View>
                      <View style={s.interScore}>
                        <Text style={s.interScoreText}>{item.pct}٪ ({item.score}/{item.max})</Text>
                        <Ionicons name="chevron-back" size={14} color={c.text4} />
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* تصفية */}
      <View style={s.filters}>
        <View style={s.chipRow}>
          <Pressable
            onPress={() => setFilterStatus('all')}
            style={[s.chip, filterStatus === 'all' && s.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: filterStatus === 'all' }}
          >
            <Text style={[s.chipText, filterStatus === 'all' && s.chipTextOn]}>
              الكل ({scopedEvals.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus('done')}
            style={[s.chip, filterStatus === 'done' && { backgroundColor: c.okBg, borderColor: c.ok }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: filterStatus === 'done' }}
          >
            <Text style={[s.chipText, filterStatus === 'done' && { color: c.okText, fontFamily: fnt.b }]}>
              مُقيَّم ({scored.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus('ready')}
            style={[s.chip, filterStatus === 'ready' && { backgroundColor: c.warnBg, borderColor: c.warn }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: filterStatus === 'ready' }}
          >
            <Text style={[s.chipText, filterStatus === 'ready' && { color: c.warnText, fontFamily: fnt.b }]}>
              جاهز ({pending})
            </Text>
          </Pressable>
        </View>

        <View style={[s.chipRow, { marginTop: sp.sm }]}>
          <Pressable
            onPress={() => setFilterGrade(null)}
            style={[s.chip, !filterGrade && s.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: !filterGrade }}
          >
            <Text style={[s.chipText, !filterGrade && s.chipTextOn]}>كل المراحل</Text>
          </Pressable>
          {ACTIVE_GRADES.filter((g) => allowedGradeIds.has(g.id)).map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setFilterGrade(filterGrade === g.id ? null : g.id)}
              style={[s.chip, filterGrade === g.id && s.chipOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: filterGrade === g.id }}
            >
              <Text style={[s.chipText, filterGrade === g.id && s.chipTextOn]}>
                {g.name.replace('الصف ', '').replace(' الابتدائي', '').replace(' المتوسط', '')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.chipRow, { marginTop: sp.sm }]}>
          <Pressable
            onPress={() => setFilterKind(null)}
            style={[s.chip, !filterKind && s.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: !filterKind }}
          >
            <Text style={[s.chipText, !filterKind && s.chipTextOn]}>كل الأنواع</Text>
          </Pressable>
          {(['weekly', 'periodic', 'final'] as CriteriaKind[]).map((k) => {
            const t = kindTone[k];
            const on = filterKind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setFilterKind(on ? null : k)}
                style={[
                  s.chip,
                  on && { backgroundColor: t.c, borderColor: t.c },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={[s.dot, { backgroundColor: on ? '#FFF' : t.c }]} />
                <Text style={[s.chipText, on && s.chipTextOn]}>{kindMeta(k).name}</Text>
              </Pressable>
            );
          })}
        </View>
          </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.skel}>
              <SkeletonRows rows={5} />
            </View>
          ) : (
            <Empty
              icon="time-outline"
              title="لا توجد تقييمات"
              message={
                scopedEvals.length
                  ? 'لا نتائج للتصفية الحالية'
                  : 'ابدأ بتسجيل تقييمات من تبويب «التقييم»'
              }
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <SectionHead
            title={section.title}
            count={section.data.length}
            tone={BRAND_TONE}
            style={{ marginTop: sp.lg, marginBottom: sp.sm }}
          />
        )}
        renderItem={({ item }) => {
            const t = formTotals(item.evaluation_type, item.grade_id, item.subject_id, item.term ?? 'all');
            const sum = sumScores(item.scores ?? {}, t.criteria);
            const tone = kindTone[item.evaluation_type];
            const scored = Object.keys(item.scores ?? {}).length > 0;
            const lv = scored
              ? levelTone[ratioLevel(sum, t.actualMax)]
              : null;
            const open = openId === item.id;

            /**
             * البنود مرتّبة بنسبة كل بند من حدّه — حتى تظهر القوة
             * في الأعلى والدون في الأسفل بلا قراءة الجدول كاملًا.
             */
            const bands = scored
              ? [...t.criteria]
                  .map((cr) => ({ cr, v: item.scores?.[cr.id] ?? 0 }))
                  .sort((a, b) => b.v / (b.cr.max || 1) - a.v / (a.cr.max || 1))
              : [];
            const edges = bands.length > 1 ? [bands[0], bands[bands.length - 1]] : bands;

            return (
              <ExpandCard
                style={s.rowCard}
                open={open}
                accent={scored ? tone.c : c.text3}
                label={open ? 'إخفاء تفاصيل الدرجات' : 'تفاصيل الدرجات'}
                onToggle={() => setOpenId(open ? null : item.id)}
                header={
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/evaluate',
                        params: {
                          studentId: item.student_id,
                          studentName: names[item.student_id] ?? 'طالب',
                          gradeId: item.grade_id,
                          subjectId: item.subject_id,
                          kind: item.evaluation_type,
                          evalId: item.id,
                          term: item.term,
                          from: '/records',
                        },
                      })
                    }
                    style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        s.avatar,
                        { backgroundColor: scored ? tone.bg : c.bgLift },
                      ]}
                    >
                      <Text
                        style={[s.avatarText, { color: scored ? tone.c : c.text4 }]}
                      >
                        {(names[item.student_id] ?? '؟').charAt(0)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>
                        {names[item.student_id] ?? 'طالب محذوف'}
                      </Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {gradeName(item.grade_id)} · {subjectName(item.subject_id)}
                      </Text>
                      <View style={s.badgeRow}>
                        <Badge label={kindMeta(item.evaluation_type).name} color={tone.c} bg={tone.bg} />
                        {!!item.label && (
                          <Badge label={item.label} color={c.text3} bg={c.bgLift} />
                        )}
                        {!scored ? (
                          <Badge label="لم يُقيَّم" color={c.warnText} bg={c.warnBg} />
                        ) : lv ? (
                          <Badge
                            label={ratioLevelName(item.evaluation_type, sum, t.actualMax)}
                            color={lv.c}
                            bg={lv.bg}
                          />
                        ) : null}
                      </View>
                    </View>

                    {scored ? (
                      <View style={s.scoreBox}>
                        <Text style={[s.score, { color: tone.c }]}>{sum}</Text>
                        <Text style={s.scoreMax}>/{t.actualMax}</Text>
                      </View>
                    ) : (
                      <Ionicons name="create-outline" size={19} color={c.warnText} />
                    )}
                    <Ionicons name="chevron-back" size={16} color={c.text4} />
                  </Pressable>
                }
              >
                {scored ? (
                  <View style={s.bd}>
                    <View style={s.bdFoot}>
                      <Text style={s.bdTitle}>أقوى بند وأضعف بند</Text>
                      <Text style={s.bdFootNum}>
                        {arabicDigits(t.criteria.length - edges.length)} بند آخر
                      </Text>
                    </View>
                    {edges.map(({ cr, v }, i) => (
                      <View key={cr.id} style={s.bdRow}>
                        <View style={s.bdTextWrap}>
                          <Text style={s.bdTag}>
                            {i === 0 ? 'الأقوى' : 'الأدون'}
                          </Text>
                          <Text style={s.bdText} numberOfLines={1}>{cr.text}</Text>
                        </View>
                        <View style={s.bdBar}>
                          <View
                            style={[
                              s.bdBarFill,
                              { width: `${Math.round((v / (cr.max || 1)) * 100)}%`, backgroundColor: tone.c },
                            ]}
                          />
                        </View>
                        <Text style={s.bdVal}>{v}<Text style={s.bdValMax}>/{cr.max}</Text></Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.bdEmpty}>
                    لم تُسجَّل أي درجة بعد — اضغط الصف لبدء التعبئة
                  </Text>
                )}
              </ExpandCard>
            );
          }}
        />
    </SafeAreaView>
  );
}

/** مستوى تقديري مبني على النسبة فقط — للمعاينة في السجل */
function ratioLevel(score: number, max: number) {
  if (max <= 0) return 'below' as const;
  const pct = score / max;
  if (pct >= 0.85) return 'gifted' as const;
  if (pct >= 0.7) return 'achieved' as const;
  if (pct >= 0.5) return 'approaching' as const;
  return 'below' as const;
}

const LEVEL_NAME = {
  gifted: 'موهوب',
  achieved: 'متقن',
  approaching: 'مقبول',
  below: 'دون الهدف',
} as const;

function ratioLevelName(_kind: CriteriaKind, score: number, max: number): string {
  return LEVEL_NAME[ratioLevel(score, max)];
}

const s = StyleSheet.create({
  analyticsWrap: {
    backgroundColor: c.tileBg,
    borderRadius: rad.xl,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: sp.xs,
  },
  analyticsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    padding: sp.md,
  },
  analyticsToggleActive: {
    backgroundColor: c.primary,
  },
  analyticsToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: rad.md,
    backgroundColor: c.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsToggleTitle: {
    fontFamily: fnt.b,
    fontSize: fs.xs,
    color: c.text,
  },
  analyticsToggleSub: {
    fontFamily: fnt.r,
    fontSize: fs.xxs,
    color: c.text3,
    marginTop: 1,
  },
  analyticsBody: {
    padding: sp.md,
    paddingTop: 0,
    gap: sp.md,
  },
  skillGroup: {
    gap: 6,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md,
    padding: sp.sm,
    borderWidth: 1,
    borderColor: c.line,
  },
  skillGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  skillGroupTitle: {
    fontFamily: fnt.b,
    fontSize: fs.xxs,
    color: c.text2,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.tileBg,
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    borderRadius: rad.sm,
  },
  skillRank: {
    fontFamily: fnt.bk,
    fontSize: fs.xxs,
    color: c.okText,
    width: 22,
  },
  skillText: {
    flex: 1,
    fontFamily: fnt.r,
    fontSize: 10.5,
    color: c.text,
    lineHeight: 16,
  },
  skillPctBadge: {
    backgroundColor: c.okBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rad.pill,
  },
  skillPctText: {
    fontFamily: fnt.bk,
    fontSize: 10,
    color: c.okText,
  },
  interEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: sp.sm,
  },
  interEmptyText: {
    fontFamily: fnt.m,
    fontSize: fs.xxs,
    color: c.okText,
  },
  interRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  interName: {
    fontFamily: fnt.b,
    fontSize: fs.xxs,
    color: c.text,
  },
  interMeta: {
    fontFamily: fnt.r,
    fontSize: 9,
    color: c.text3,
  },
  interScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interScoreText: {
    fontFamily: fnt.bk,
    fontSize: 10,
    color: c.err,
  },

  root: { flex: 1, backgroundColor: c.bg },
  skel: { paddingHorizontal: sp.lg, paddingTop: sp.md },

  header: { gap: sp.md, paddingTop: sp.md },
  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md, ...sh.sm,
  },

  /* بطاقات مؤشّر الإتقان */
  gaugeCard: {
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    paddingVertical: sp.md, paddingHorizontal: sp.sm, gap: sp.sm, ...sh.sm,
  },
  gaugeTitle: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text2, paddingHorizontal: sp.xs },
  gaugeRow: { flexDirection: 'row', gap: sp.xs },
  vRule: { width: 1, height: 26, backgroundColor: c.line },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filters: { paddingTop: sp.xs, paddingBottom: sp.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: rad.pill,
    borderWidth: 1.5, borderColor: c.line,
    backgroundColor: c.bgAlt,
  },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  chipTextOn: { color: c.onPrimary, fontFamily: fnt.b },
  dot: { width: 6, height: 6, borderRadius: 3 },

  list: { ...contentColumn, paddingHorizontal: sp.lg, paddingBottom: sp.huge },

  secHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: sp.lg, marginBottom: sp.sm,
  },
  secTitle: { fontFamily: fnt.eb, fontSize: fs.md, color: c.text },

  rowCard: {
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg,
    borderWidth: 1, borderColor: c.line,
    marginBottom: sp.sm,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fnt.bk, fontSize: fs.lg },
  name: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  meta: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontFamily: fnt.bk, fontSize: fs.lg },
  scoreMax: { fontFamily: fnt.b, fontSize: fs.xs, color: c.text3 },

  /* جسم البطاقة المنفرجة — توزيع الدرجات على البنود */
  bd: { paddingTop: sp.sm, gap: sp.xs },
  bdFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bdTitle: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text2 },
  bdFootNum: { fontFamily: fnt.r, fontSize: 9.5, color: c.text4 },
  bdRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  bdTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  bdTag: {
    fontFamily: fnt.b, fontSize: 9, color: c.text3,
    backgroundColor: c.bgLift, borderRadius: rad.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bdText: { flex: 1, fontFamily: fnt.r, fontSize: fs.xxs, color: c.text2 },
  bdBar: {
    flex: 0.9, height: 5, borderRadius: 3,
    backgroundColor: c.bgLift, overflow: 'hidden',
  },
  bdBarFill: { height: '100%', borderRadius: 3 },
  bdVal: { fontFamily: fnt.b, fontSize: fs.xxs, color: c.text, minWidth: 30, textAlign: 'center' },
  bdValMax: { fontFamily: fnt.r, fontSize: 9.5, color: c.text4 },
  bdEmpty: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, lineHeight: 18 },
});
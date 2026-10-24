import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  GRADES, gradeName, subjectName, kindMeta, formTotals, sumScores,
} from '@/constants/criteria';
import type { CriteriaKind } from '@/constants/criteria.data';
import { c, sp, rad, fnt, fs, kindTone, levelTone } from '@/constants/brand';
import { Badge, Empty, BrandBar, Stat } from '@/components/pro-ui';
import { listEvaluations, listStudents, type Evaluation } from '@/lib/store';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export default function RecordsScreen() {
  const router = useRouter();

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<CriteriaKind | null>(null);
  /** كل / مُقيَّم / جاهز للتعبئة */
  const [filterStatus, setFilterStatus] = useState<'all' | 'done' | 'ready'>('all');

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

  const scored = evals.filter((e) => Object.keys(e.scores ?? {}).length > 0);
  const pending = evals.length - scored.length;

  const filtered = useMemo(() => {
    let list = [...evals].sort((a, b) => {
      // الفارغ آخر القائمة دائماً (مرتّبة بالتاريخ)
      const ae = Object.keys(a.scores ?? {}).length > 0;
      const be = Object.keys(b.scores ?? {}).length > 0;
      if (ae !== be) return ae ? -1 : 1;
      return b.evaluation_date.localeCompare(a.evaluation_date);
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
  }, [evals, filterGrade, filterKind, filterStatus]);

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
    const done = evals.filter((e) => Object.keys(e.scores ?? {}).length > 0);
    if (!done.length) return 0;
    let sum = 0;
    for (const e of done) {
      const t = formTotals(e.evaluation_type, e.grade_id, e.subject_id, e.term ?? 'all');
      if (t.actualMax > 0) sum += sumScores(e.scores ?? {}, t.criteria) / t.actualMax;
    }
    return Math.round((sum / done.length) * 100);
  }, [evals]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        title="السجل"
        sub={`${evals.length} تقييم مسجل`}
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
              الكل ({evals.length})
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
          {GRADES.filter((g) => g.id !== 'intermediate1').map((g) => (
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

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : sections.length === 0 ? (
        <Empty
          icon="time-outline"
          title="لا توجد تقييمات"
          message={
            evals.length
              ? 'لا نتائج للتصفية الحالية'
              : 'ابدأ بتسجيل تقييمات من تبويب «التقييم»'
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={s.secHead}>
              <Text style={s.secTitle}>{section.title}</Text>
              <Badge
                label={`${section.data.length}`}
                color={c.text2}
                bg={c.bgLift}
              />
            </View>
          )}
          renderItem={({ item }) => {
            const t = formTotals(item.evaluation_type, item.grade_id, item.subject_id, item.term ?? 'all');
            const sum = sumScores(item.scores ?? {}, t.criteria);
            const tone = kindTone[item.evaluation_type];
            const scored = Object.keys(item.scores ?? {}).length > 0;
            const lv = scored
              ? levelTone[ratioLevel(sum, t.actualMax)]
              : null;

            return (
              <View style={s.rowCard}>
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
              </View>
            );
          }}
        />
      )}
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
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgAlt,
    borderRadius: rad.lg, borderWidth: 1, borderColor: c.line,
    marginHorizontal: sp.lg, marginTop: sp.md,
    paddingVertical: sp.md,
  },
  vRule: { width: 1, height: 26, backgroundColor: c.line },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filters: { paddingHorizontal: sp.lg, paddingTop: sp.md, paddingBottom: sp.sm },
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

  list: { paddingHorizontal: sp.lg, paddingBottom: sp.huge },

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
});
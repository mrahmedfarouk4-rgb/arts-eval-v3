import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GRADES, gradeName, type GradeId } from '@/constants/criteria';
import { c, sp, rad, fnt, fs, sh } from '@/constants/brand';
import { Button, Card, Badge, Empty, BrandBar } from '@/components/pro-ui';
import { useSession } from '@/lib/session';
import { confirmAction } from '@/lib/dialog';
import {
  listStudents,
  createStudent,
  deleteStudent,
  archiveStudent,
  listEvaluations,
  type Student,
} from '@/lib/store';

export default function StudentsScreen() {
  const router = useRouter();
  const { editMode } = useSession();

  const [students, setStudents] = useState<Student[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeId>('grade4');
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeId | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const [list, evals] = await Promise.all([listStudents(), listEvaluations()]);
      setStudents(list);
      const acc: Record<string, number> = {};
      for (const e of evals) acc[e.student_id] = (acc[e.student_id] ?? 0) + 1;
      setCounts(acc);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const byName = query.trim() ? s.name.includes(query.trim()) : true;
        const byGrade = gradeFilter === 'all' ? true : s.grade_id === gradeFilter;
        return byName && byGrade;
      }),
    [students, query, gradeFilter]
  );

  const onAdd = async () => {
    if (!name.trim()) return;
    try {
      await createStudent(name, grade);
      setName('');
      setShowAdd(false);
      await load();
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذّرت الإضافة');
    }
  };

  const onDelete = async (s: Student) => {
    const ok = await confirmAction(
      'حذف الطالب',
      `سيتم حذف "${s.name}" وجميع تقييماته نهائياً. هل أنت متأكد؟`,
      { confirmLabel: 'حذف نهائي', destructive: true }
    );
    if (!ok) return;
    await deleteStudent(s.id);
    await load();
  };

  const onArchive = async (s: Student) => {
    const ok = await confirmAction(
      'أرشفة الطالب',
      `سيُخفى "${s.name}" من القوائم. يمكنك إرجاعه لاحقاً.`,
      { confirmLabel: 'أرشفة' }
    );
    if (!ok) return;
    await archiveStudent(s.id, true);
    await load();
  };

  const activeGrades = GRADES.filter((g) => g.id !== 'intermediate1');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <BrandBar
        right={
          editMode ? (
            <Button label="إضافة" size="sm" icon="add" onPress={() => setShowAdd(true)} />
          ) : (
            <Badge label="وضع العرض" color={c.text3} bg={c.bgLift} />
          )
        }
      />

      {/* بحث */}
      <View style={s.searchWrap}>
        <View style={s.search}>
          <Ionicons name="search" size={16} color={c.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث باسم الطالب..."
            placeholderTextColor={c.text4}
            style={s.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.text4} />
            </Pressable>
          )}
        </View>
      </View>

      {/* تصفية المرحلة */}
      <View style={s.chipScroll}>
        <View style={s.chipRow}>
          <Pressable
            onPress={() => setGradeFilter('all')}
            style={[s.chip, gradeFilter === 'all' && s.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: gradeFilter === 'all' }}
          >
            <Text style={[s.chipText, gradeFilter === 'all' && s.chipTextOn]}>
              الكل ({students.length})
            </Text>
          </Pressable>
          {activeGrades.map((g) => {
            const n = students.filter((s) => s.grade_id === g.id).length;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGradeFilter(g.id)}
                style={[s.chip, gradeFilter === g.id && s.chipOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: gradeFilter === g.id }}
              >
                <Text style={[s.chipText, gradeFilter === g.id && s.chipTextOn]}>
                  {g.name.replace('الصف ', '').replace(' الابتدائي', '').replace(' المتوسط', '')}
                  {n > 0 ? ` (${n})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <Empty
          icon="people-outline"
          title={query || gradeFilter !== 'all' ? 'لا نتائج' : 'لا يوجد طلاب'}
          message={
            query || gradeFilter !== 'all'
              ? 'جرّب تعديل البحث أو التصفية'
              : editMode
                ? 'ابدأ بإضافة الطلاب لتبدأ بالتقييم'
                : 'فعّل وضع التعديل لإضافة الطلاب'
          }
          action={
            !query && gradeFilter === 'all' && editMode ? (
              <Button label="إضافة طالب" icon="add" onPress={() => setShowAdd(true)} />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: sp.sm }} />}
          renderItem={({ item }) => {
            const n = counts[item.id] ?? 0;
            return (
              <Card
                padding={sp.md}
                accent={n > 0 ? c.primary : undefined}
                onPress={() =>
                  router.push({
                    pathname: '/student/[id]',
                    params: { id: item.id, name: item.name },
                  })
                }
              >
                <View style={s.row}>
                  <View style={[s.avatar, n > 0 && { backgroundColor: c.primaryBg }]}>
                    <Text style={[s.avatarText, n > 0 && { color: c.primary }]}>
                      {item.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    <View style={s.metaRow}>
                      <Badge label={gradeName(item.grade_id ?? 'grade4')} color={c.primary} bg={c.primaryBg} />
                      <Text style={[s.meta, n === 0 && { color: c.text4 }]}>
                        {n > 0 ? `${n} ${n === 1 ? 'تقييم' : n === 2 ? 'تقييمان' : 'تقييمات'}` : 'لم يُقيَّم'}
                      </Text>
                    </View>
                  </View>
                  {editMode ? (
                    <View style={{ flexDirection: 'row', gap: sp.xs }}>
                      <Pressable onPress={() => onArchive(item)} hitSlop={8} style={s.iconBtn}>
                        <Ionicons name="archive-outline" size={17} color={c.text3} />
                      </Pressable>
                      <Pressable onPress={() => onDelete(item)} hitSlop={8} style={s.iconBtn}>
                        <Ionicons name="trash-outline" size={17} color={c.errText} />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons name="chevron-back" size={17} color={c.text4} />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* نافذة الإضافة */}
      {showAdd && (
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxWidth: 460, padding: sp.lg }}
          >
            <View style={s.modal}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>إضافة طالب جديد</Text>
                <Pressable onPress={() => setShowAdd(false)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={c.text3} />
                </Pressable>
              </View>

              <Text style={s.fieldLabel}>اسم الطالب</Text>
              <View style={s.field}>
                <Ionicons name="person-outline" size={16} color={c.text4} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="اكتب الاسم هنا..."
                  placeholderTextColor={c.text4}
                  style={s.input}
                  autoFocus
                />
              </View>

              <Text style={[s.fieldLabel, { marginTop: sp.lg }]}>المرحلة الدراسية</Text>
              <View style={s.gradeWrap}>
                {activeGrades.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setGrade(g.id)}
                    style={[s.chip, grade === g.id && s.chipOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: grade === g.id }}
                  >
                    <Text style={[s.chipText, grade === g.id && s.chipTextOn]}>
                      {g.name.replace('الصف ', '').replace(' الابتدائي', '').replace(' المتوسط', '')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: sp.sm, marginTop: sp.xl }}>
                <Button
                  label="إلغاء"
                  variant="surface"
                  onPress={() => setShowAdd(false)}
                  style={{ flex: 1 }}
                  full
                />
                <Button
                  label="إضافة"
                  onPress={onAdd}
                  disabled={!name.trim()}
                  style={{ flex: 1.4 }}
                  full
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingHorizontal: sp.lg, paddingTop: sp.md },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bgAlt,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 42,
  },
  searchInput: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.sm,
    color: c.text, textAlign: 'right',
  },

  chipScroll: { paddingTop: sp.md, paddingBottom: sp.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, paddingHorizontal: sp.lg },
  chip: {
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: rad.pill,
    borderWidth: 1.5, borderColor: c.line,
    backgroundColor: c.bgAlt,
  },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2 },
  chipTextOn: { color: c.onPrimary, fontFamily: fnt.b },

  list: { paddingHorizontal: sp.lg, paddingBottom: sp.huge },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fnt.bk, fontSize: fs.lg, color: c.text3 },
  name: { fontFamily: fnt.b, fontSize: fs.md, color: c.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 5 },
  meta: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3 },
  iconBtn: { padding: 4 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrim,
    alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    width: '100%',
    backgroundColor: c.bgAlt,
    borderRadius: rad.xl,
    borderWidth: 1,
    borderColor: c.line,
    padding: sp.lg,
    ...sh.lg,
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: sp.lg,
  },
  modalTitle: { fontFamily: fnt.eb, fontSize: fs.lg, color: c.text },
  fieldLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2, marginBottom: sp.sm },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: c.bg,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 46,
  },
  input: {
    flex: 1, fontFamily: fnt.m, fontSize: fs.md,
    color: c.text, textAlign: 'right',
  },
  gradeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
});
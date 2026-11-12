import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { c, sp, rad, fnt, fs } from '@/constants/brand';
import { Button, Card, Section } from '@/components/pro-ui';
import { confirmAction } from '@/lib/dialog';
import {
  listAccounts, addAccount, updateAccount, deleteAccount,
  setAccountPassword, setRolePassword, isWeakDefault,
  type Account, type Role,
} from '@/lib/accounts';
import { SUBJECTS, subjectName, type SubjectId } from '@/constants/criteria';
import { scheduleAutoSync } from '@/lib/store';
import { useAuth } from '@/lib/auth';

const ALL_SUBJECTS = SUBJECTS.map((x) => x.id) as SubjectId[];

/**
 * إعداد المعلمين ومقرراتهم وكلمات سرهم — للمشرف فقط.
 * ---------------------------------------------------------------------------
 * ما يتيحه هذا القسم:
 *   • حساب لكل معلم باسم دخول وكلمة سر **خاصة به** (لا يتقاسمها مع غيره)
 *   • إسناد المقررات: المعلم لا يرى في التقييم إلا مقرراته
 *   • إيقاف/تفعيل/حذف أي حساب بلا إعادة بناء للتطبيق
 *
 * القائمة محلية على الجهاز ولا تحتاج إعادة بناء، وهذا مقصود: كل معلم
 * جديد يُضاف من هنا في لحظ بدل دورة بناء كاملة.
 */

export function TeachersPanel({ onChanged }: { onChanged?: () => void }) {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const [pwFor, setPwFor] = useState<Role | null>(null);

  const reload = React.useCallback(async () => {
    setAccounts(await listAccounts());
    onChanged?.();
  }, [onChanged]);

  React.useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return (
      <Section title="إعداد المعلمين" hint="يعرضها المشرف فقط">
        <Card padding={sp.lg}>
          <View style={s.row}>
            <Ionicons name="lock-closed-outline" size={17} color={c.text4} />
            <Text style={s.hint}>
              إضافة المعلمين وإسناد مقرراتهم من صلاحية المشرف فقط. راجع «الإعدادات».
            </Text>
          </View>
        </Card>
      </Section>
    );
  }

  const teachers = (accounts ?? []).filter((a) => a.role === 'teacher');

  return (
    <Section
      title="إعداد المعلمين والمقررات"
      hint="أضف معلماً، أسند إليه مقرراته، وضع له كلمة سر خاصة"
      count={accounts?.length ?? 0}
    >
      {adding ? (
        <AccountForm
          title="حساب معلم جديد"
          onCancel={() => setAdding(false)}
          onSave={async (v) => {
            const r = await addAccount(v);
            if (!r.ok) return Alert.alert('تعذّرت الإضافة', r.error);
            setAdding(false);
            await reload();
            scheduleAutoSync(1200);
          }}
        />
      ) : editing ? (
        <AccountForm
          title={`تعديل: ${editing.name}`}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (v) => {
            const r = await updateAccount(editing.id, v);
            if (!r.ok) return Alert.alert('تعذّر التعديل', r.error);
            setEditing(null);
            await reload();
            scheduleAutoSync(1200);
          }}
          onSetPassword={async (pw) => {
            const r = await setAccountPassword(editing.id, pw);
            if (!r.ok) return Alert.alert('تعذّر تغيير كلمة السر', r.error);
            Alert.alert('تم', `كلمة سر «${editing.name}» حُدِّثت.`);
            await reload();
            scheduleAutoSync(1200);
          }}
          onDelete={async () => {
            const ok = await confirmAction(
              'حذف الحساب',
              `سيُحذف حساب «${editing.name}» ولن يعد قادراً على الدخول.`,
              { confirmLabel: 'حذف', destructive: true }
            );
            if (!ok) return;
            const r = await deleteAccount(editing.id);
            if (!r.ok) return Alert.alert('تعذّر الحذف', r.error);
            setEditing(null);
            await reload();
            scheduleAutoSync(1200);
          }}
        />
      ) : (
        <>
          <Card padding={0}>
            {(accounts ?? []).map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => setEditing(a)}
                style={({ pressed }) => [s.accRow, i > 0 && s.accRowBordered, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <View style={[s.accIcon, a.role === 'admin' && s.accIconAdmin]}>
                  <Ionicons
                    name={a.role === 'admin' ? 'shield-checkmark' : 'person'}
                    size={16}
                    color={a.role === 'admin' ? c.primary : c.text2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.accName}>{a.name}</Text>
                  <Text style={s.accMeta} numberOfLines={1}>
                    {a.username} · {a.role === 'admin' ? 'مشرف' : 'معلم'}
                    {!a.enabled ? ' · موقوف' : ''}
                  </Text>
                  <Text style={s.accMeta} numberOfLines={1}>
                    {a.role === 'admin'
                      ? 'يرى كل المقررات'
                      : a.subjectIds?.length
                        ? a.subjectIds.map(subjectName).join('، ')
                        : 'بلا مقررات مُسندة'}
                    {' · '}
                    {!a.pwHash ? 'بلا كلمة سر' : isWeakDefault(a.pwHash) ? 'كلمة سر ضعيفة' : 'له كلمة سر'}
                  </Text>
                </View>
                <Ionicons name="chevron-back" size={16} color={c.text4} />
              </Pressable>
            ))}
            {accounts?.length === 0 && (
              <View style={s.emptyRow}>
                <Text style={s.hint}>لا حسابات بعد.</Text>
              </View>
            )}
          </Card>

          <Button
            label="إضافة معلم"
            icon="person-add-outline"
            variant="surface"
            onPress={() => setAdding(true)}
            full
            style={{ marginTop: sp.md }}
          />

          {teachers.length > 1 && (
            <>
              <Text style={[s.hint, { marginTop: sp.lg, marginBottom: sp.xs }]}>
                ضبط سريع — كلمة واحدة لكل المعلمين (تتجاوز كلماتهم الفردية)
              </Text>
              <Button
                label="كلمة سر مشتركة لكل المعلمين"
                variant="ghost"
                icon="key-outline"
                onPress={() => setPwFor('teacher')}
                full
              />
            </>
          )}

          {pwFor && (
            <PasswordForm
              role={pwFor}
              onCancel={() => setPwFor(null)}
              onSave={async (pw) => {
                const r = await setRolePassword(pwFor, pw);
                setPwFor(null);
                if (!r.ok) return Alert.alert('تعذّر التغيير', r.error);
                Alert.alert('تم', 'حُدِّثت كلمة السر لكل الحسابات.');
                await reload();
              }}
            />
          )}
        </>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */

function AccountForm({
  title,
  initial,
  onCancel,
  onSave,
  onDelete,
  onSetPassword,
}: {
  title: string;
  initial?: Account;
  onCancel: () => void;
  onSave: (v: {
    username: string;
    name: string;
    role: Role;
    subjectIds: SubjectId[];
    password?: string;
    enabled?: boolean;
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onSetPassword?: (pw: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'teacher');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  // الحساب الجديد يبدأ بكل المقررات، ومن ثم يضيّقها المشرف
  const [subjects, setSubjects] = useState<SubjectId[]>(
    initial ? initial.subjectIds ?? [] : ALL_SUBJECTS
  );
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const toggleSubject = (id: SubjectId) =>
    setSubjects((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const submit = () =>
    onSave({
      username,
      name,
      role,
      subjectIds: subjects,
      ...(initial ? { enabled } : {}),
      // الحساب الجديد يأخذ كلمته عند الإنشاء؛ والتعديل له زر منفصل
      ...(initial ? {} : { password: pw }),
    });

  return (
    <Card padding={sp.lg}>
      <Text style={s.formTitle}>{title}</Text>

      <Text style={s.fieldLabel}>الاسم الظاهر (في «اسم المعلم»)</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="مثال: أ. محمد العتيبي"
        placeholderTextColor={c.text4}
        style={s.input}
      />

      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>اسم المستخدم للدخول</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="مثال: malotaibi"
        placeholderTextColor={c.text4}
        style={s.input}
        autoCapitalize="none"
      />

      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>الصلاحية</Text>
      <View style={s.roleRow}>
        <RoleChip label="معلم" active={role === 'teacher'} onPress={() => setRole('teacher')} />
        <RoleChip label="مشرف" active={role === 'admin'} onPress={() => setRole('admin')} />
      </View>

      {/* المقررات المسندة — المعلم لا يرى غيرها */}
      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>
        المقررات المسندة {role === 'admin' ? '(المشرف يرى الكل — لا تُهمَل)' : ''}
      </Text>
      <Text style={s.hint}>
        لن يرى المعلم إلا هذه المقررات في شاشة التقييم.
      </Text>
      <View style={s.subjGrid}>
        {SUBJECTS.map((x) => {
          const on = subjects.includes(x.id);
          return (
            <Pressable
              key={x.id}
              onPress={() => toggleSubject(x.id)}
              style={[s.subjChip, on && s.subjChipOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={13}
                color={on ? c.primary : c.text4}
              />
              <Text style={[s.subjChipText, on && { color: c.primary }]}>{x.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>
        {subjects.length === 0
          ? 'بلا مقررات — المعلم لن يرى شيئاً حتى تُسند إليه مقرراً.'
          : `${subjects.length} مقرر مُسند`}
      </Text>

      {/* كلمة السر */}
      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>
        كلمة السر {initial ? '' : '(للمعلم — يستعملها للدخول)'}
      </Text>
      {initial && !onSetPassword && (
        <Text style={s.hint}>اضغط زر «تغيير كلمة السر» أدناه.</Text>
      )}
      <View style={s.pwGrid}>
        <TextInput
          value={pw}
          onChangeText={setPw}
          placeholder="٤ خانات فأكثر"
          placeholderTextColor={c.text4}
          style={[s.input, { flex: 1 }]}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          value={pw2}
          onChangeText={setPw2}
          placeholder="تأكيد"
          placeholderTextColor={c.text4}
          style={[s.input, { flex: 1 }]}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {initial && (
        <Pressable
          onPress={() => setEnabled((v) => !v)}
          style={s.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: enabled }}
        >
          <Text style={s.checkLabel}>الحساب مفعّل</Text>
          <Ionicons
            name={enabled ? 'checkbox' : 'square-outline'}
            size={21}
            color={enabled ? c.primary : c.text4}
          />
        </Pressable>
      )}

      <View style={s.btnRow}>
        <Button label="إلغاء" variant="ghost" onPress={onCancel} full />
        <Button
          label="حفظ"
          onPress={() => {
            if (pw || pw2) {
              if (pw !== pw2) return Alert.alert('الكلمتان غير متطابقتين');
              if (pw.length < 4) return Alert.alert('كلمة السر ٤ خانات فأكثر');
            }
            if (!initial && !pw) {
              return Alert.alert('ضع كلمة سر للمعلم', 'لن يستطيع الدخول بدونها.');
            }
            return submit();
          }}
          full
        />
      </View>

      {initial && onSetPassword && (
        <Button
          label="تغيير كلمة السر"
          variant="surface"
          icon="key-outline"
          onPress={async () => {
            if (!pw) return Alert.alert('اكتب كلمة السر الجديدة');
            if (pw !== pw2) return Alert.alert('الكلمتان غير متطابقتين');
            if (pw.length < 4) return Alert.alert('كلمة السر ٤ خانات فأكثر');
            const ok = await confirmAction(
              'تغيير كلمة السر',
              `سيُغيَّر «${initial.username}» إلى كلمة السر الجديدة.`,
              { confirmLabel: 'تغيير' }
            );
            if (!ok) return;
            await onSetPassword(pw);
            setPw('');
            setPw2('');
          }}
          full
          style={{ marginTop: sp.sm }}
        />
      )}

      {onDelete && (
        <Button
          label="حذف الحساب"
          variant="danger"
          icon="trash-outline"
          onPress={onDelete}
          full
          style={{ marginTop: sp.sm }}
        />
      )}
    </Card>
  );
}

function PasswordForm({
  role,
  onCancel,
  onSave,
}: {
  role: Role;
  onCancel: () => void;
  onSave: (pw: string) => void | Promise<void>;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  return (
    <Card padding={sp.lg} style={{ marginTop: sp.md }}>
      <Text style={s.formTitle}>
        {role === 'admin' ? 'كلمة سر المشرف' : 'كلمة سر المعلمين'}
      </Text>
      <Text style={s.hint}>
        واحدة لكل الحسابات من هذا الدور — تتجاوز الكلمات الفردية.
      </Text>

      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>الكلمة الجديدة</Text>
      <TextInput
        value={a}
        onChangeText={setA}
        placeholder="٤ خانات فأكثر"
        placeholderTextColor={c.text4}
        style={s.input}
        secureTextEntry
        autoCapitalize="none"
      />

      <Text style={[s.fieldLabel, { marginTop: sp.md }]}>تأكيد الكلمة</Text>
      <TextInput
        value={b}
        onChangeText={setB}
        placeholder="أعد كتابتها"
        placeholderTextColor={c.text4}
        style={s.input}
        secureTextEntry
        autoCapitalize="none"
      />

      <View style={s.btnRow}>
        <Button label="إلغاء" variant="ghost" onPress={onCancel} full />
        <Button
          label="حفظ"
          onPress={() => {
            if (!a) return Alert.alert('أدخل كلمة السر');
            if (a !== b) return Alert.alert('الكلمتان غير متطابقتين');
            return onSave(a);
          }}
          full
        />
      </View>
    </Card>
  );
}

function RoleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && s.chipOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.chipText, active && { color: c.primary }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  hint: { flex: 1, fontFamily: fnt.r, fontSize: fs.xs, color: c.text3, lineHeight: 19 },

  accRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
  },
  accRowBordered: { borderTopWidth: 1, borderTopColor: c.line },
  accIcon: {
    width: 34, height: 34, borderRadius: rad.sm,
    backgroundColor: c.bgLift,
    alignItems: 'center', justifyContent: 'center',
  },
  accIconAdmin: { backgroundColor: c.primaryBg },
  accName: { fontFamily: fnt.b, fontSize: fs.sm, color: c.text },
  accMeta: { fontFamily: fnt.r, fontSize: fs.xxs, color: c.text3, marginTop: 1 },
  emptyRow: { padding: sp.lg },

  formTitle: { fontFamily: fnt.b, fontSize: fs.md, color: c.text, marginBottom: sp.md },
  fieldLabel: { fontFamily: fnt.m, fontSize: fs.xs, color: c.text2, marginBottom: sp.xs },
  input: {
    backgroundColor: c.bg,
    borderRadius: rad.md, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: sp.md, height: 44,
    fontFamily: fnt.m, fontSize: fs.sm, color: c.text, textAlign: 'right',
  },
  pwGrid: { flexDirection: 'row', gap: sp.sm },

  roleRow: { flexDirection: 'row', gap: sp.sm },
  chip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: sp.sm, borderRadius: rad.md,
    borderWidth: 1.5, borderColor: c.line, backgroundColor: c.bg,
  },
  chipOn: { borderColor: c.primary, backgroundColor: c.primaryBg },
  chipText: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text2 },

  subjGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: sp.sm },
  subjChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: rad.pill, borderWidth: 1, borderColor: c.line,
    backgroundColor: c.bg,
  },
  subjChipOn: { borderColor: c.primary, backgroundColor: c.primaryBg },
  subjChipText: { fontFamily: fnt.m, fontSize: fs.xxs, color: c.text2 },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: sp.md, paddingVertical: sp.sm,
  },
  checkLabel: { fontFamily: fnt.m, fontSize: fs.sm, color: c.text },

  btnRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
});
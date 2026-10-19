-- =====================================================================
--  بوابة تقييم الفنون البصرية — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- =====================================================================
--  التشغيل:
--    1) أنشئ مشروعاً في Supabase
--    2) الصق هذا الملف في SQL Editor ونفّذه
--    3) ضع المفاتيح في ملف .env:
--         EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--         EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
--    4) فعّل المزامنة من شاشة الإعدادات في التطبيق
--
--  ملاحظة: بنود التقييم (532 بنداً) مضمّنة داخل التطبيق ولا تحتاج قاعدة بيانات.
--  القاعدة تخزّن الطلاب والتقييمات فقط.
-- =====================================================================

-- ---------------------------------------------------------------------
--  جدول الطلاب
-- ---------------------------------------------------------------------
create table if not exists public.students (
  id          text primary key,
  name        text        not null,
  grade_id    text,
  created_at  timestamptz not null default now(),
  archived    boolean     not null default false
);

comment on table public.students is 'طلاب مسار الفنون البصرية';

create index if not exists students_grade_idx
  on public.students (grade_id)
  where archived = false;

-- ---------------------------------------------------------------------
--  جدول التقييمات
-- ---------------------------------------------------------------------
create table if not exists public.evaluations (
  id              text primary key,
  student_id      text        not null references public.students(id) on delete cascade,
  grade_id        text        not null,
  subject_id      text        not null,
  evaluation_type text        not null check (evaluation_type in ('weekly','periodic','final')),
  evaluation_date date        not null,
  label           text        not null default '',
  scores          jsonb       not null default '{}'::jsonb,
  teacher_name    text,
  updated_at      timestamptz not null default now(),
  deleted         boolean     not null default false
);

comment on table public.evaluations is 'تقييمات الطلاب — scores: {criterionId: degree}'
comment on column public.evaluations.evaluation_type is 'weekly=تكويني، periodic=مرحلي، final=ختامي';

create index if not exists evaluations_student_idx
  on public.evaluations (student_id);

create index if not exists evaluations_cell_idx
  on public.evaluations (grade_id, subject_id, evaluation_type)
  where deleted = false;

create index if not exists evaluations_date_idx
  on public.evaluations (evaluation_date desc);

-- ---------------------------------------------------------------------
--  صلاحيات الصفوف (Row Level Security)
--  الإعداد الافتراضي: قراءة للجميع، والكتابة تتطلب مفتاح صالح.
--  إن أردت قفلاً أضيق، فعّل المصادقة (auth) ثم عدّل السياسات.
-- ---------------------------------------------------------------------
alter table public.students    enable row level security;
alter table public.evaluations enable row level security;

drop policy if exists "students read"   on public.students;
drop policy if exists "students write"  on public.students;
drop policy if exists "evaluations read"  on public.evaluations;
drop policy if exists "evaluations write" on public.evaluations;

create policy "students read"   on public.students    for select using (true);
create policy "students write"  on public.students    for all using (true) with check (true);
create policy "evaluations read"  on public.evaluations for select using (true);
create policy "evaluations write" on public.evaluations for all using (true) with check (true);

-- ---------------------------------------------------------------------
--  دالة مساعدة: تحديث updated_at تلقائياً
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evaluations_touch on public.evaluations;
create trigger evaluations_touch
  before update on public.evaluations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  اختبار سريع (اختياري — احذفه بعد التأكد)
-- ---------------------------------------------------------------------
-- insert into public.students (id, name, grade_id)
-- values ('test-1', 'طالب تجريبي', 'grade5');
--
-- select s.name, count(e.id) as evaluations
-- from public.students s
-- left join public.evaluations e on e.student_id = s.id
-- group by s.name;

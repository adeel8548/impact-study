-- Revision schedules, series exams, and daily/weekly quizzes

create table if not exists public.revision_schedule (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  topic text not null,
  revision_date date not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_revision_schedule_class_date on public.revision_schedule (class_id, revision_date);
create index if not exists idx_revision_schedule_teacher on public.revision_schedule (teacher_id);

create table if not exists public.series_exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  start_date date not null,
  end_date date not null,
  duration_minutes integer,
  paper_given_date date,
  notes text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_series_exams_class_start on public.series_exams (class_id, start_date);
create index if not exists idx_series_exams_teacher on public.series_exams (teacher_id);

create table if not exists public.daily_quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  topic text not null,
  quiz_date date not null,
  duration_minutes integer,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_daily_quizzes_class_date on public.daily_quizzes (class_id, quiz_date);
create index if not exists idx_daily_quizzes_teacher on public.daily_quizzes (teacher_id);


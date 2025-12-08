-- Add approval/locking for teacher attendance leave reasons
alter table if exists public.teacher_attendance
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists reason_locked boolean default false;

create index if not exists idx_teacher_attendance_approved_by on public.teacher_attendance(approved_by);


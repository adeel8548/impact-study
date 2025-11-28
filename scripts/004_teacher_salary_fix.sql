BEGIN;

-- Ensure salary columns exist and enforce constraints
ALTER TABLE public.teacher_salary
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('paid', 'unpaid')),
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month SMALLINT NOT NULL DEFAULT (EXTRACT(MONTH FROM CURRENT_DATE)),
  ADD COLUMN IF NOT EXISTS year SMALLINT NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)),
  ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;

-- Keep a single row per teacher per month
ALTER TABLE public.teacher_salary
  ADD CONSTRAINT IF NOT EXISTS teacher_salary_unique_month
    UNIQUE (teacher_id, month, year);

CREATE INDEX IF NOT EXISTS idx_teacher_salary_teacher_status
  ON public.teacher_salary (teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher
  ON public.teacher_classes (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_class
  ON public.teacher_classes (class_id);

ALTER TABLE public.teacher_classes
  ALTER COLUMN class_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teacher_classes_teacher_id_class_id_key'
  ) THEN
    ALTER TABLE public.teacher_classes
      DROP CONSTRAINT teacher_classes_teacher_id_class_id_key;
  END IF;
END $$;

ALTER TABLE public.teacher_classes
  ADD CONSTRAINT IF NOT EXISTS teacher_classes_unique_teacher
    UNIQUE (teacher_id);

-- RLS for admins
ALTER TABLE public.teacher_salary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_salary_admin_access ON public.teacher_salary;

CREATE POLICY teacher_salary_admin_access
ON public.teacher_salary
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Monthly reset via pg_cron (runs midnight UTC on day 1)
SELECT
  cron.schedule(
    'reset-teacher-salaries',
    '0 0 1 * *',
    $$
      update public.teacher_salary
      set status = 'unpaid',
          reset_at = timezone('utc', now())
      where status = 'paid';
    $$
  );

COMMIT;


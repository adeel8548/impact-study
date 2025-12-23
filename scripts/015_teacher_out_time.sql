-- Add explicit out_time column to teacher_attendance to capture OUT event timestamp

ALTER TABLE IF EXISTS public.teacher_attendance
  ADD COLUMN IF NOT EXISTS out_time TIMESTAMPTZ;

-- Note: No destructive backfill is performed. Future OUT actions will populate this column.

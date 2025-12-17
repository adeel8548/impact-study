-- Add expected_time and late_reason fields to teacher_attendance table for late attendance tracking

-- Add expected_time column (time of day when teacher is expected)
ALTER TABLE IF EXISTS public.teacher_attendance
  ADD COLUMN IF NOT EXISTS expected_time TIME;

-- Add late_reason column (reason for late attendance)
ALTER TABLE IF EXISTS public.teacher_attendance
  ADD COLUMN IF NOT EXISTS late_reason TEXT;

-- Add is_late column (flag to mark attendance as late but present)
ALTER TABLE IF EXISTS public.teacher_attendance
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_is_late ON public.teacher_attendance(is_late);

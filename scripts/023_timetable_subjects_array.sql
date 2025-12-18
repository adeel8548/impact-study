-- Add subjects array to timetable and adjust uniqueness to per-slot

-- Add subjects array column (if not exists) with empty array default
ALTER TABLE teacher_timetable
  ADD COLUMN IF NOT EXISTS subjects UUID[] DEFAULT '{}'::uuid[];

-- Backfill: if subject_id exists and subjects is empty, seed with single value
UPDATE teacher_timetable
SET subjects = ARRAY[subject_id]
WHERE subject_id IS NOT NULL AND (subjects IS NULL OR cardinality(subjects) = 0);

-- Drop previous exact-duplicate unique constraint (from 022) if present
ALTER TABLE teacher_timetable
  DROP CONSTRAINT IF EXISTS unique_timetable_entry;

-- Enforce uniqueness per time-slot per teacher/class/day
ALTER TABLE teacher_timetable
  ADD CONSTRAINT unique_timetable_slot
  UNIQUE (teacher_id, class_id, day_of_week, start_time, end_time);

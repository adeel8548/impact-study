-- Relax timetable constraints to allow multiple subjects at the same time slot
-- Drops overlap trigger and narrow unique constraint; adds exact-duplicate unique key

-- Drop the old unique constraint that blocked same start_time for a teacher/day
ALTER TABLE teacher_timetable
  DROP CONSTRAINT IF EXISTS unique_teacher_time_slot;

-- Drop the overlap trigger and function so overlapping time ranges are allowed
DROP TRIGGER IF EXISTS check_time_overlap_before_insert_update ON teacher_timetable;
DROP FUNCTION IF EXISTS check_teacher_time_overlap();

-- Add a new unique constraint to prevent exact duplicates only
ALTER TABLE teacher_timetable
  ADD CONSTRAINT unique_timetable_entry
  UNIQUE (teacher_id, class_id, subject_id, day_of_week, start_time, end_time);

-- Helpful composite index for common lookups
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_day_time
  ON teacher_timetable(teacher_id, day_of_week, start_time, end_time);

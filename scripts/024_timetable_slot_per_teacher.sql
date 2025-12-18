-- Enforce one class per teacher per time slot

-- Replace per-slot uniqueness to exclude class_id
ALTER TABLE teacher_timetable
  DROP CONSTRAINT IF EXISTS unique_timetable_slot;

ALTER TABLE teacher_timetable
  ADD CONSTRAINT unique_timetable_slot
  UNIQUE (teacher_id, day_of_week, start_time, end_time);

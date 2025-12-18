-- Create teacher_timetable table to store lecture schedules
CREATE TABLE IF NOT EXISTS teacher_timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint to ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Unique constraint to prevent teacher from having overlapping lectures
  CONSTRAINT unique_teacher_time_slot UNIQUE (teacher_id, day_of_week, start_time)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON teacher_timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON teacher_timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON teacher_timetable(day_of_week);

-- Add RLS policies for teacher_timetable
ALTER TABLE teacher_timetable ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage timetable
CREATE POLICY "Admins can view timetable" ON teacher_timetable
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert timetable" ON teacher_timetable
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update timetable" ON teacher_timetable
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete timetable" ON teacher_timetable
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow teachers to view their own timetable
CREATE POLICY "Teachers can view their timetable" ON teacher_timetable
  FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Function to check for overlapping time slots for the same teacher
CREATE OR REPLACE FUNCTION check_teacher_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's an overlapping time slot for the same teacher on the same day
  IF EXISTS (
    SELECT 1 FROM teacher_timetable
    WHERE teacher_id = NEW.teacher_id
    AND day_of_week = NEW.day_of_week
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- Check if times overlap
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Teacher already has a lecture scheduled during this time on this day';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check overlapping times before insert/update
CREATE TRIGGER check_time_overlap_before_insert_update
  BEFORE INSERT OR UPDATE ON teacher_timetable
  FOR EACH ROW
  EXECUTE FUNCTION check_teacher_time_overlap();

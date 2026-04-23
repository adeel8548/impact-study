-- Create study_schedule table
CREATE TABLE study_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INTEGER NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  schedule_date DATE,
  start_time TIME,
  end_time TIME,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  max_marks NUMERIC(6,2) DEFAULT 100,
  description TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  series_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;

-- Admins can see all entries
CREATE POLICY admin_select ON study_schedule FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Admins can insert, update, delete
CREATE POLICY admin_insert ON study_schedule FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY admin_update ON study_schedule FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY admin_delete ON study_schedule FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Teachers can see entries assigned to them
CREATE POLICY teacher_select ON study_schedule FOR SELECT
  USING (
    teacher_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_study_schedule_teacher_id ON study_schedule(teacher_id);
CREATE INDEX idx_study_schedule_series_name ON study_schedule(series_name);
CREATE INDEX idx_study_schedule_day ON study_schedule(day);

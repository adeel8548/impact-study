-- Create quiz_results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  quiz_name VARCHAR(255) NOT NULL,
  obtained_marks DECIMAL(10, 2) NOT NULL,
  total_marks DECIMAL(10, 2) NOT NULL,
  quiz_date DATE NOT NULL,
  quiz_duration INTEGER DEFAULT 0, -- duration in minutes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_quiz_results_student_id ON quiz_results(student_id);
CREATE INDEX idx_quiz_results_teacher_id ON quiz_results(teacher_id);
CREATE INDEX idx_quiz_results_quiz_date ON quiz_results(quiz_date);
CREATE INDEX idx_quiz_results_student_quiz ON quiz_results(student_id, quiz_name, quiz_date);

-- Enable Row Level Security
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow admins to see all quiz results
CREATE POLICY admin_view_all_quiz_results ON quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Allow teachers to see quiz results they created
CREATE POLICY teacher_view_own_quiz_results ON quiz_results
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Allow admins to insert quiz results
CREATE POLICY admin_insert_quiz_results ON quiz_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Allow teachers to insert quiz results for their students
CREATE POLICY teacher_insert_quiz_results ON quiz_results
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
  );

-- RLS Policy: Allow admins to update quiz results
CREATE POLICY admin_update_quiz_results ON quiz_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Allow teachers to update their own quiz results
CREATE POLICY teacher_update_quiz_results ON quiz_results
  FOR UPDATE USING (
    teacher_id = auth.uid()
  );

-- RLS Policy: Allow admins to delete quiz results
CREATE POLICY admin_delete_quiz_results ON quiz_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Allow teachers to delete their own quiz results
CREATE POLICY teacher_delete_quiz_results ON quiz_results
  FOR DELETE USING (
    teacher_id = auth.uid()
  );

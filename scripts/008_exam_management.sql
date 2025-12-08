-- Create exam_chapters table for managing chapters within series exams
CREATE TABLE IF NOT EXISTS exam_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES series_exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_name TEXT NOT NULL,
  chapter_date DATE NOT NULL,
  max_marks DECIMAL(5, 2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exam_results table for storing student marks
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES exam_chapters(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  marks DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, chapter_id, class_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_chapters_exam_id ON exam_chapters(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_chapters_subject_id ON exam_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_chapter_id ON exam_results(chapter_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_class_id ON exam_results(class_id);

-- Enable RLS for exam_chapters
ALTER TABLE exam_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_chapters
CREATE POLICY "Enable read for authenticated users" ON exam_chapters
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON exam_chapters
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON exam_chapters
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON exam_chapters
  FOR DELETE USING (auth.role() = 'authenticated');

-- Enable RLS for exam_results
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_results
CREATE POLICY "Enable read for authenticated users" ON exam_results
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON exam_results
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON exam_results
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON exam_results
  FOR DELETE USING (auth.role() = 'authenticated');

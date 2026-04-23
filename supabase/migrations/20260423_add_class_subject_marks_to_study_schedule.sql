ALTER TABLE study_schedule
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS max_marks NUMERIC(6,2) DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_study_schedule_class_id ON study_schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_study_schedule_subject_id ON study_schedule(subject_id);

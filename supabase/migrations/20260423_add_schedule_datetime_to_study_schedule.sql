ALTER TABLE study_schedule
ADD COLUMN IF NOT EXISTS schedule_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS max_marks NUMERIC(6,2) DEFAULT 100;

-- Backfill existing rows with safe defaults where missing.
UPDATE study_schedule
SET schedule_date = CURRENT_DATE
WHERE schedule_date IS NULL;

UPDATE study_schedule
SET start_time = TIME '15:00:00'
WHERE start_time IS NULL;

UPDATE study_schedule
SET end_time = TIME '16:00:00'
WHERE end_time IS NULL;

-- Add quiz_id and class_id columns to quiz_results table for better filtering and relationship management

-- Add quiz_id column (references daily_quizzes table)
ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES public.daily_quizzes(id) ON DELETE SET NULL;

-- Add class_id column (references classes table via students)
ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS class_id UUID;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_class_id ON public.quiz_results(class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_and_class ON public.quiz_results(quiz_id, class_id);

-- Populate class_id from student's class_id (for existing records)
UPDATE public.quiz_results qr
SET class_id = s.class_id
FROM public.students s
WHERE qr.student_id = s.id AND qr.class_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.quiz_results.quiz_id IS 'Reference to the daily_quizzes record';
COMMENT ON COLUMN public.quiz_results.class_id IS 'Class ID for easier filtering (denormalized from students table)';

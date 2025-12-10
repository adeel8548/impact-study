-- Add total_marks column to daily_quizzes table
ALTER TABLE public.daily_quizzes ADD COLUMN IF NOT EXISTS total_marks integer;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_quizzes.total_marks IS 'Total marks for the quiz';

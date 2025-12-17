-- Fix quiz_results schema issues
-- 1. Change teacher_id to reference profiles instead of non-existent teachers table
-- 2. Add missing columns (quiz_id, class_id)
-- 3. Fix RLS policies

-- Step 1: Drop the incorrect foreign key constraint on teacher_id
ALTER TABLE public.quiz_results 
DROP CONSTRAINT IF EXISTS quiz_results_teacher_id_fkey;

-- Step 2: Recreate the foreign key correctly pointing to profiles
ALTER TABLE public.quiz_results
ADD CONSTRAINT quiz_results_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 3: Add missing columns if they don't exist
ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES public.daily_quizzes(id) ON DELETE SET NULL;

ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS class_id UUID;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_class_id ON public.quiz_results(class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_and_class ON public.quiz_results(quiz_id, class_id);

-- Step 5: Populate class_id from student records (for existing records)
UPDATE public.quiz_results qr
SET class_id = s.class_id
FROM public.students s
WHERE qr.student_id = s.id AND qr.class_id IS NULL;

-- Step 6: Fix RLS policies - drop incorrect ones
DROP POLICY IF EXISTS admin_view_all_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_view_own_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_insert_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_insert_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_update_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_update_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_delete_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_delete_quiz_results ON quiz_results;

-- Step 7: Create corrected RLS policies using profiles table
CREATE POLICY quiz_results_select_admin
  ON quiz_results FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY quiz_results_select_teacher
  ON quiz_results FOR SELECT
  USING (
    teacher_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

CREATE POLICY quiz_results_select_student
  ON quiz_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_id
      AND students.id = auth.uid()
    )
  );

CREATE POLICY quiz_results_insert
  ON quiz_results FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY quiz_results_update_admin
  ON quiz_results FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY quiz_results_update_teacher
  ON quiz_results FOR UPDATE
  USING (
    teacher_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

CREATE POLICY quiz_results_delete
  ON quiz_results FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
  );

-- Add documentation
COMMENT ON COLUMN public.quiz_results.quiz_id IS 'Reference to the daily_quizzes record';
COMMENT ON COLUMN public.quiz_results.class_id IS 'Class ID for easier filtering (denormalized from students table)';

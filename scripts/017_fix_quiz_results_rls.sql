-- Fix RLS Policies for quiz_results table
-- The original policies referenced a non-existent 'users' table
-- Update to use the correct 'profiles' table

-- First, drop the existing incorrect policies
DROP POLICY IF EXISTS admin_view_all_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_view_own_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_insert_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_insert_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_update_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_update_quiz_results ON quiz_results;
DROP POLICY IF EXISTS admin_delete_quiz_results ON quiz_results;
DROP POLICY IF EXISTS teacher_delete_quiz_results ON quiz_results;

-- Create corrected RLS policies using profiles table

-- Allow anyone to select quiz results for their school (based on school_id from student and teacher relationships)
CREATE POLICY quiz_results_select_school
  ON quiz_results FOR SELECT
  USING (
    -- Admin can see all
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Teacher can see results they created
    teacher_id = auth.uid()
    OR
    -- Student can see their own results
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_id
      AND students.school_id = (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow admins and teachers to insert quiz results
CREATE POLICY quiz_results_insert
  ON quiz_results FOR INSERT
  WITH CHECK (
    -- Admin can insert
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Teacher can insert
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Allow admins and teachers to update quiz results
CREATE POLICY quiz_results_update
  ON quiz_results FOR UPDATE
  USING (
    -- Admin can update all
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Teacher can update their own
    teacher_id = auth.uid()
  );

-- Allow admins to delete quiz results
CREATE POLICY quiz_results_delete
  ON quiz_results FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    teacher_id = auth.uid()
  );

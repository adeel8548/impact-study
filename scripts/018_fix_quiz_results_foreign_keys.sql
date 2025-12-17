-- Fix quiz_results table to use correct foreign key references
-- The table currently references non-existent 'teachers' table
-- Update to use 'profiles' table for teacher_id

-- First, we need to disable RLS temporarily to modify the table
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;

-- Drop the incorrect foreign key constraint if it exists
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_teacher_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Re-enable RLS
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

COMMENT ON CONSTRAINT quiz_results_teacher_id_fkey ON quiz_results 
  IS 'Reference to the teacher (profile) who entered the quiz result';

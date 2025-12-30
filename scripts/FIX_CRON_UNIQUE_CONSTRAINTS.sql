-- ============================================
-- FIX CRON JOB: Add Unique Constraints
-- ============================================
-- یہ SQL script Supabase SQL Editor میں run کریں
-- تاکہ monthly billing cron job کام کرے

-- ============================================
-- STEP 1: Clean up duplicates (اگر ہوں)
-- ============================================

-- student_fees میں duplicates remove کریں
DELETE FROM student_fees a USING student_fees b
WHERE a.id > b.id 
AND a.student_id = b.student_id 
AND a.month = b.month 
AND a.year = b.year;

-- teacher_salary میں duplicates remove کریں
DELETE FROM teacher_salary a USING teacher_salary b
WHERE a.id > b.id 
AND a.teacher_id = b.teacher_id 
AND a.month = b.month 
AND a.year = b.year;

-- ============================================
-- STEP 2: Add Unique Constraints
-- ============================================

-- student_fees unique constraint
ALTER TABLE student_fees 
ADD CONSTRAINT student_fees_unique_student_month_year 
UNIQUE (student_id, month, year);

-- teacher_salary unique constraint
ALTER TABLE teacher_salary 
ADD CONSTRAINT teacher_salary_unique_teacher_month_year 
UNIQUE (teacher_id, month, year);

-- ============================================
-- STEP 3: Create Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_student_fees_student_month_year 
ON student_fees(student_id, month, year);

CREATE INDEX IF NOT EXISTS idx_teacher_salary_teacher_month_year 
ON teacher_salary(teacher_id, month, year);

-- ============================================
-- VERIFY: Constraints add ہوئے یا نہیں
-- ============================================

SELECT 
  'student_fees' as table_name,
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'student_fees' 
AND constraint_type = 'UNIQUE'

UNION ALL

SELECT 
  'teacher_salary' as table_name,
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'teacher_salary' 
AND constraint_type = 'UNIQUE';

-- ============================================
-- ✅ SUCCESS MESSAGE
-- ============================================
-- اگر یہ script successfully run ہو گیا تو:
-- 1. Cron job اب کام کرے گا
-- 2. Duplicate entries prevent ہوں گے
-- 3. Upsert operation work کرے گا
-- ============================================

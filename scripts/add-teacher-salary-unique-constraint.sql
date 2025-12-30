-- Add unique constraint to teacher_salary table
-- This is required for the monthly billing cron job to work
-- Prevents duplicate salary entries for the same teacher/month/year

-- Step 1: Remove any duplicate entries first (if they exist)
DELETE FROM teacher_salary a USING teacher_salary b
WHERE a.id > b.id 
AND a.teacher_id = b.teacher_id 
AND a.month = b.month 
AND a.year = b.year;

-- Step 2: Add unique constraint
ALTER TABLE teacher_salary 
ADD CONSTRAINT teacher_salary_unique_teacher_month_year 
UNIQUE (teacher_id, month, year);

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_salary_teacher_month_year 
ON teacher_salary(teacher_id, month, year);

-- Verify the constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'teacher_salary' 
AND constraint_type = 'UNIQUE';

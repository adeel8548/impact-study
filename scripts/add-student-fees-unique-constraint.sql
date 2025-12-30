-- Add unique constraint to student_fees table
-- This is required for the monthly billing cron job to work
-- Prevents duplicate fee entries for the same student/month/year

-- Step 1: Remove any duplicate entries first (if they exist)
DELETE FROM student_fees a USING student_fees b
WHERE a.id > b.id 
AND a.student_id = b.student_id 
AND a.month = b.month 
AND a.year = b.year;

-- Step 2: Add unique constraint
ALTER TABLE student_fees 
ADD CONSTRAINT student_fees_unique_student_month_year 
UNIQUE (student_id, month, year);

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student_month_year 
ON student_fees(student_id, month, year);

-- Verify the constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'student_fees' 
AND constraint_type = 'UNIQUE';

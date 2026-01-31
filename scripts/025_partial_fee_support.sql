-- Add partial fee support for students joining mid-month
-- This migration adds fields to track partial fee calculation

-- Add fields to student_fees table
ALTER TABLE IF EXISTS public.student_fees
ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_days_in_month INTEGER,
ADD COLUMN IF NOT EXISTS payable_days INTEGER,
ADD COLUMN IF NOT EXISTS per_day_fee DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS full_fee DECIMAL(10, 2);

-- Add fields to fee_vouchers table
ALTER TABLE IF EXISTS public.fee_vouchers
ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_days_in_month INTEGER,
ADD COLUMN IF NOT EXISTS payable_days INTEGER,
ADD COLUMN IF NOT EXISTS per_day_fee DECIMAL(10, 4);

-- Add full_fee to students table (base monthly fee set by admin)
ALTER TABLE IF EXISTS public.students
ADD COLUMN IF NOT EXISTS full_fee DECIMAL(10, 2) DEFAULT 0;

-- Create index for faster partial fee queries
CREATE INDEX IF NOT EXISTS idx_student_fees_partial ON public.student_fees(student_id, is_partial);
CREATE INDEX IF NOT EXISTS idx_students_joining_date ON public.students(joining_date);

-- Add comments
COMMENT ON COLUMN public.student_fees.is_partial IS 'True if this is a partial fee for joining month';
COMMENT ON COLUMN public.student_fees.total_days_in_month IS 'Total days in the month for partial fee calculation';
COMMENT ON COLUMN public.student_fees.payable_days IS 'Number of days student attended (for partial fee)';
COMMENT ON COLUMN public.student_fees.per_day_fee IS 'Per-day fee rate (full_fee / total_days_in_month)';
COMMENT ON COLUMN public.student_fees.full_fee IS 'Full monthly fee amount before partial calculation';
COMMENT ON COLUMN public.students.full_fee IS 'Base monthly fee set by admin (used for all calculations)';

-- Update trigger to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_fees_timestamp ON public.student_fees;
CREATE TRIGGER update_student_fees_timestamp
BEFORE UPDATE ON public.student_fees
FOR EACH ROW
EXECUTE FUNCTION update_student_fees_updated_at();

-- Create fee_vouchers table for tracking printed fee vouchers
CREATE TABLE IF NOT EXISTS fee_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  monthly_fee DECIMAL(10, 2) DEFAULT 0,
  arrears DECIMAL(10, 2) DEFAULT 0,
  fines DECIMAL(10, 2) DEFAULT 0,
  annual_charges DECIMAL(10, 2) DEFAULT 0,
  exam_fee DECIMAL(10, 2) DEFAULT 0,
  other_charges DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  month VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on serial_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_fee_vouchers_serial_number ON fee_vouchers(serial_number DESC);

-- Create index on student_id for faster student-related queries
CREATE INDEX IF NOT EXISTS idx_fee_vouchers_student_id ON fee_vouchers(student_id);

-- Enable Row Level Security
ALTER TABLE fee_vouchers ENABLE ROW LEVEL SECURITY;

-- Create policies for fee_vouchers table
CREATE POLICY "Admins can view fee vouchers"
  ON fee_vouchers FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'authenticated'
  );

CREATE POLICY "Admins can insert fee vouchers"
  ON fee_vouchers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update fee vouchers"
  ON fee_vouchers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete fee vouchers"
  ON fee_vouchers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment to table
COMMENT ON TABLE fee_vouchers IS 'Stores records of printed fee vouchers for students';

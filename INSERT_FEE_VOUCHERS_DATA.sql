-- ============================================
-- fee_vouchers ٹیبل میں Data Insert کرنے کے لیے
-- ============================================

-- پہلے ایک student کی ID لیں (آپ اپنی ID ڈالیں)
-- یہ query چلائیں تاکہ student_id معلوم ہو:
SELECT id, name, roll_number FROM students LIMIT 5;

-- ============================================
-- OPTION 1: اگر آپ کے پاس student_id ہے
-- ============================================

INSERT INTO fee_vouchers (
  serial_number,
  student_id,
  issue_date,
  due_date,
  monthly_fee,
  arrears,
  fines,
  annual_charges,
  exam_fee,
  other_charges,
  total_amount,
  month
) VALUES (
  1,  -- serial_number
  'YOUR_STUDENT_ID_HERE',  -- student_id (UUID)
  CURRENT_DATE,  -- issue_date (آج کی تاریخ)
  '2025-12-12',  -- due_date (12 دسمبر)
  5000,  -- monthly_fee
  2000,  -- arrears
  0,  -- fines
  0,  -- annual_charges
  0,  -- exam_fee
  0,  -- other_charges
  7000  -- total_amount
);

-- ============================================
-- OPTION 2: متعدد Records ایک ساتھ Add کریں
-- ============================================

-- پہلے تمام students کی IDs اور names لیں
-- پھر یہ query adapt کریں:

INSERT INTO fee_vouchers (
  serial_number,
  student_id,
  issue_date,
  due_date,
  monthly_fee,
  arrears,
  fines,
  annual_charges,
  exam_fee,
  other_charges,
  total_amount,
  month
) 
SELECT 
  ROW_NUMBER() OVER (ORDER BY s.id) as serial_number,
  s.id as student_id,
  CURRENT_DATE as issue_date,
  '2025-12-12' as due_date,
  5000 as monthly_fee,
  1000 as arrears,
  0 as fines,
  0 as annual_charges,
  0 as exam_fee,
  0 as other_charges,
  6000 as total_amount,
  'December' as month
FROM students s
LIMIT 10;  -- صرف 10 students کے لیے

-- ============================================
-- OPTION 3: Student-specific Data (اردو مثال)
-- ============================================

-- اگر آپ کو ایک specific student کا data چاہیے:

-- پہلے student کی ID معلوم کریں:
SELECT id FROM students WHERE roll_number = '101' LIMIT 1;

-- پھر یہ query میں student_id replace کریں:
INSERT INTO fee_vouchers (
  serial_number,
  student_id,
  issue_date,
  due_date,
  monthly_fee,
  arrears,
  fines,
  annual_charges,
  exam_fee,
  other_charges,
  total_amount,
  month
) VALUES (
  1,
  (SELECT id FROM students WHERE roll_number = '101' LIMIT 1),
  CURRENT_DATE,
  '2025-12-12',
  5000,
  0,
  0,
  0,
  0,
  0,
  5000
);

-- ============================================
-- OPTION 4: Fine کے ساتھ Data Add کریں
-- ============================================

INSERT INTO fee_vouchers (
  serial_number,
  student_id,
  issue_date,
  due_date,
  monthly_fee,
  arrears,
  fines,
  annual_charges,
  exam_fee,
  other_charges,
  total_amount,
  month
) VALUES (
  2,
  (SELECT id FROM students LIMIT 1),
  CURRENT_DATE,
  '2025-12-12',
  5000,  -- monthly fee
  2000,  -- arrears
  160,   -- fines (8 دن × 20 روپے)
  500,   -- annual charges
  0,
  0,
  7660   -- total
);

-- ============================================
-- Data Verify کرنے کے لیے
-- ============================================

-- تمام fee vouchers دیکھیں:
SELECT 
  fv.serial_number,
  s.name,
  s.roll_number,
  fv.monthly_fee,
  fv.arrears,
  fv.fines,
  fv.total_amount,
  fv.issue_date,
  fv.month
FROM fee_vouchers fv
JOIN students s ON fv.student_id = s.id
ORDER BY fv.serial_number;

-- کتنے vouchers ہیں:
SELECT COUNT(*) as total_vouchers FROM fee_vouchers;

-- ============================================
-- اگر غلط data ہو تو Delete کریں
-- ============================================

-- تمام vouchers delete کریں:
DELETE FROM fee_vouchers;

-- ایک specific voucher delete کریں:
DELETE FROM fee_vouchers WHERE serial_number = 1;

-- ============================================
-- Custom Data کے ساتھ Update کریں
-- ============================================

UPDATE fee_vouchers
SET fines = 200, total_amount = 7200
WHERE serial_number = 1;

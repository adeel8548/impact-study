# 🚀 Partial Fee System - 5-Minute Quick Start

Get up and running with partial fee calculation in 5 minutes!

---

## Step 1️⃣: Run Migration (2 minutes)

### Copy & Paste in Supabase SQL Editor:

Open **Supabase Dashboard** → **SQL Editor** → **New Query** → Paste this:

```sql
-- Add partial fee support
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS joining_date DATE;

ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS total_days_in_month INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS payable_days INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS per_day_fee DECIMAL(10, 4);
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS full_fee DECIMAL(10, 2);

ALTER TABLE fee_vouchers ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE fee_vouchers ADD COLUMN IF NOT EXISTS total_days_in_month INTEGER;
ALTER TABLE fee_vouchers ADD COLUMN IF NOT EXISTS payable_days INTEGER;
ALTER TABLE fee_vouchers ADD COLUMN IF NOT EXISTS per_day_fee DECIMAL(10, 4);

CREATE INDEX IF NOT EXISTS idx_student_fees_partial ON student_fees(student_id, is_partial);
CREATE INDEX IF NOT EXISTS idx_students_joining_date ON students(joining_date);
```

Click **Run** ✅

---

## Step 2️⃣: Set Student Fees (1 minute)

```sql
-- Set full fee for all students (adjust amount as needed)
UPDATE students SET full_fee = 5000;

-- Optional: Set joining date for specific student (for testing)
UPDATE students 
SET joining_date = CURRENT_DATE - INTERVAL '15 days'
WHERE roll_number = 'TEST001';  -- Replace with actual roll number
```

---

## Step 3️⃣: Test It (2 minutes)

### Trigger Monthly Billing:

```bash
# Visit this URL in browser or use curl:
https://yourapp.vercel.app/api/cron/monthly-billing?secret=your-secret

# Or locally:
http://localhost:3000/api/cron/monthly-billing?secret=your-secret
```

### Check Results:

```sql
-- View partial fees
SELECT 
  s.name,
  s.joining_date,
  s.full_fee,
  sf.amount as calculated_fee,
  sf.is_partial,
  sf.payable_days,
  sf.total_days_in_month
FROM students s
JOIN student_fees sf ON s.id = sf.student_id
WHERE sf.is_partial = true
ORDER BY sf.created_at DESC
LIMIT 5;
```

---

## ✅ Done!

That's it! Your system now:
- ✅ Calculates partial fees for mid-month joiners
- ✅ Applies full fees from next month
- ✅ Handles all edge cases automatically

---

## 🎯 What Happens Now?

### For Students Joining Mid-Month:
```
Student joins: Jan 15
Full fee: Rs. 5,000
Days in Jan: 31

January fee: Rs. 2,741.93 (partial - 17 days)
February fee: Rs. 5,000.00 (full month)
March fee: Rs. 5,000.00 (full month)
... and so on
```

### For Students Joining on 1st:
```
Student joins: Jan 1
Full fee: Rs. 5,000

January fee: Rs. 5,000.00 (full month)
February fee: Rs. 5,000.00 (full month)
... and so on
```

---

## 📖 Next Steps

1. **Read Full Guide:** [PARTIAL_FEE_SYSTEM_GUIDE.md](PARTIAL_FEE_SYSTEM_GUIDE.md)
2. **Update Student Form:** Add `full_fee` and `joining_date` fields
3. **Customize Voucher Display:** Use `PartialFeeDisplay` component
4. **Set Up Cron:** Schedule for 1st of every month

---

## 🆘 Quick Help

**Fee showing as 0?**
→ Make sure `full_fee` is set: `UPDATE students SET full_fee = 5000;`

**Partial fee not calculating?**
→ Check: `joining_date` set? In current month? After 1st?

**Need more help?**
→ Check [PARTIAL_FEE_SYSTEM_GUIDE.md](PARTIAL_FEE_SYSTEM_GUIDE.md)

---

## 🎉 You're Ready!

The system is now automatically calculating partial fees. Just:
1. Set `full_fee` when registering new students
2. Set `joining_date` when they join
3. Let the cron job do the rest!

**No manual calculations ever again!** 🚀

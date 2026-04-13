# Migration Guide: Upgrading to Partial Fee System

This guide helps you upgrade your existing fee system to support partial fee calculations for students joining mid-month.

---

## Pre-Migration Checklist

Before running the migration:

- [ ] **Backup your database** (critical!)
- [ ] **Test on development/staging first**
- [ ] **Note current student count**
- [ ] **Document current fee structure**
- [ ] **Plan downtime (if needed)**

---

## Step 1: Backup Database

### Option A: Supabase Dashboard

1. Go to Database → Backups
2. Create manual backup
3. Download backup file

### Option B: Command Line

```bash
# Using pg_dump
pg_dump -U postgres -h db.yourproject.supabase.co -d postgres > backup_$(date +%Y%m%d).sql

# Verify backup
ls -lh backup_*.sql
```

---

## Step 2: Run Database Migration

### Method 1: Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy content from `scripts/025_partial_fee_support.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Verify "Success. No rows returned" message

### Method 2: Command Line

```bash
# If you have psql installed
psql -h db.yourproject.supabase.co \
     -U postgres \
     -d postgres \
     -f scripts/025_partial_fee_support.sql

# Enter your database password when prompted
```

### Method 3: Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Run migration
npx supabase db push
```

---

## Step 3: Verify Migration

Run these queries to verify the migration was successful:

```sql
-- Check new columns in students table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'students'
AND column_name IN ('full_fee', 'joining_date');

-- Expected output:
-- full_fee     | numeric
-- joining_date | date

-- Check new columns in student_fees table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_fees'
AND column_name IN ('is_partial', 'total_days_in_month', 'payable_days', 'per_day_fee', 'full_fee');

-- Expected output:
-- is_partial          | boolean
-- total_days_in_month | integer
-- payable_days        | integer
-- per_day_fee         | numeric
-- full_fee            | numeric

-- Check new columns in fee_vouchers table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'fee_vouchers'
AND column_name IN ('is_partial', 'total_days_in_month', 'payable_days', 'per_day_fee');

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('students', 'student_fees')
AND indexname LIKE '%partial%' OR indexname LIKE '%joining%';
```

---

## Step 4: Set Full Fee for Existing Students

You need to set `full_fee` for all existing students. Choose the method that fits your situation:

### Scenario A: All Students Have Same Fee

```sql
-- Set same fee for all students (e.g., Rs. 5000)
UPDATE students
SET full_fee = 5000
WHERE full_fee IS NULL OR full_fee = 0;

-- Verify
SELECT COUNT(*) as total_students,
       COUNT(CASE WHEN full_fee > 0 THEN 1 END) as with_fee,
       COUNT(CASE WHEN full_fee IS NULL OR full_fee = 0 THEN 1 END) as without_fee
FROM students;
```

### Scenario B: Fee Varies by Class

```sql
-- Set fee based on class
UPDATE students s
SET full_fee = CASE
  WHEN c.name LIKE 'Class 1%' THEN 3000
  WHEN c.name LIKE 'Class 2%' THEN 3500
  WHEN c.name LIKE 'Class 3%' THEN 4000
  WHEN c.name LIKE 'Class 4%' THEN 4500
  WHEN c.name LIKE 'Class 5%' THEN 5000
  WHEN c.name LIKE 'Class 6%' THEN 5500
  WHEN c.name LIKE 'Class 7%' THEN 6000
  WHEN c.name LIKE 'Class 8%' THEN 6500
  WHEN c.name LIKE 'Class 9%' THEN 7000
  WHEN c.name LIKE 'Class 10%' THEN 7500
  ELSE 5000  -- default
END
FROM classes c
WHERE s.class_id = c.id
AND (s.full_fee IS NULL OR s.full_fee = 0);

-- Verify
SELECT c.name, s.full_fee, COUNT(*) as student_count
FROM students s
JOIN classes c ON s.class_id = c.id
GROUP BY c.name, s.full_fee
ORDER BY c.name;
```

### Scenario C: Use Current Fee from student_fees Table

```sql
-- Copy most recent fee amount from student_fees to students.full_fee
WITH latest_fees AS (
  SELECT
    student_id,
    amount,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY year DESC, month DESC) as rn
  FROM student_fees
)
UPDATE students s
SET full_fee = lf.amount
FROM latest_fees lf
WHERE s.id = lf.student_id
AND lf.rn = 1
AND (s.full_fee IS NULL OR s.full_fee = 0);

-- Verify
SELECT
  COUNT(*) as total,
  AVG(full_fee) as avg_fee,
  MIN(full_fee) as min_fee,
  MAX(full_fee) as max_fee
FROM students
WHERE full_fee > 0;
```

---

## Step 5: Set Joining Dates (Optional but Recommended)

### Option A: Set All to NULL (No Partial Fee)

```sql
-- If you don't want partial fee for existing students
UPDATE students
SET joining_date = NULL;
```

### Option B: Set to School Start Date

```sql
-- Set all existing students to start of school year (full fee always)
UPDATE students
SET joining_date = '2024-04-01'  -- Adjust to your school's start date
WHERE joining_date IS NULL;
```

### Option C: Set Based on First Fee Record

```sql
-- Set joining date to first month they have fee record
WITH first_fee AS (
  SELECT
    student_id,
    MIN(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as first_month
  FROM student_fees
  GROUP BY student_id
)
UPDATE students s
SET joining_date = ff.first_month
FROM first_fee ff
WHERE s.id = ff.student_id
AND s.joining_date IS NULL;
```

### Option D: Manual Entry (Most Accurate)

If you have actual joining dates in a spreadsheet:

```sql
-- Import from CSV or manual updates
UPDATE students SET joining_date = '2025-09-15' WHERE id = 'student-id-1';
UPDATE students SET joining_date = '2026-01-10' WHERE id = 'student-id-2';
-- ... etc
```

---

## Step 6: Update Existing Fee Records (Optional)

If you want to retroactively apply partial fees to students who joined recently:

```sql
-- Example: Update January 2026 fees for students who joined mid-month
UPDATE student_fees sf
SET
  is_partial = TRUE,
  total_days_in_month = 31,
  payable_days = (31 - EXTRACT(DAY FROM s.joining_date)::INTEGER + 1),
  per_day_fee = s.full_fee / 31,
  amount = (s.full_fee / 31) * (31 - EXTRACT(DAY FROM s.joining_date)::INTEGER + 1),
  full_fee = s.full_fee
FROM students s
WHERE sf.student_id = s.id
AND sf.month = 1
AND sf.year = 2026
AND s.joining_date IS NOT NULL
AND EXTRACT(YEAR FROM s.joining_date) = 2026
AND EXTRACT(MONTH FROM s.joining_date) = 1
AND EXTRACT(DAY FROM s.joining_date) > 1;

-- Verify updated records
SELECT
  s.name,
  s.joining_date,
  sf.amount,
  sf.is_partial,
  sf.payable_days
FROM student_fees sf
JOIN students s ON sf.student_id = s.id
WHERE sf.month = 1 AND sf.year = 2026
AND sf.is_partial = TRUE;
```

---

## Step 7: Test the System

### 7.1 Create Test Student

```sql
-- Create a test student with mid-month joining
INSERT INTO students (
  name,
  roll_number,
  class_id,
  school_id,
  full_fee,
  joining_date
)
VALUES (
  'Test Student - Partial Fee',
  'TEST001',
  (SELECT id FROM classes LIMIT 1),  -- Use existing class
  (SELECT school_id FROM students LIMIT 1),  -- Use existing school_id
  5000,
  CURRENT_DATE - INTERVAL '15 days'  -- Joined 15 days ago
);
```

### 7.2 Trigger Cron Job Manually

```bash
# Using curl
curl -X POST "https://yourapp.vercel.app/api/cron/monthly-billing?secret=your-secret"

# Or visit in browser:
# https://yourapp.vercel.app/api/cron/monthly-billing?secret=your-secret
```

### 7.3 Verify Fee Calculation

```sql
-- Check if partial fee was calculated correctly
SELECT
  s.name,
  s.joining_date,
  s.full_fee,
  sf.amount as calculated_fee,
  sf.is_partial,
  sf.total_days_in_month,
  sf.payable_days,
  sf.per_day_fee,
  (sf.per_day_fee * sf.payable_days) as manual_calc_check
FROM students s
JOIN student_fees sf ON s.id = sf.student_id
WHERE s.name = 'Test Student - Partial Fee'
ORDER BY sf.year DESC, sf.month DESC
LIMIT 1;
```

### 7.4 Generate Test Voucher

Use your admin panel to generate a fee voucher for the test student and verify:

- ✅ Partial fee breakdown is shown
- ✅ Calculation is correct
- ✅ Total days and payable days are accurate

---

## Step 8: Deploy Code Changes

### 8.1 Update Your Codebase

```bash
# Pull latest changes (if using git)
git pull origin main

# Or manually copy these files:
# - lib/utils/partial-fee-calculator.ts
# - app/api/cron/monthly-billing/route.ts (updated)
# - lib/actions/fee-vouchers.ts (updated)
# - components/fees/PartialFeeDisplay.tsx (new)
```

### 8.2 Install Dependencies (if needed)

```bash
npm install
# or
pnpm install
```

### 8.3 Deploy to Production

```bash
# Vercel
vercel --prod

# Or via GitHub (if auto-deploy is enabled)
git push origin main
```

---

## Step 9: Monitor First Month

After deployment, monitor the system for the first month:

### Week 1: Check Fee Generation

```sql
-- Verify fees are being created with correct partial/full flags
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN is_partial THEN 1 END) as partial_fees,
  COUNT(CASE WHEN NOT is_partial THEN 1 END) as full_fees
FROM student_fees
WHERE month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
```

### Week 2: Check Voucher Generation

```sql
-- Verify vouchers are being created correctly
SELECT
  COUNT(*) as total_vouchers,
  COUNT(CASE WHEN is_partial THEN 1 END) as partial_vouchers
FROM fee_vouchers
WHERE month = TO_CHAR(CURRENT_DATE, 'Month');
```

### Week 3: Verify Payment Processing

- Check if partial fee students can pay successfully
- Verify receipt shows correct breakdown

### Week 4: Prepare for Next Month

- Ensure cron job is scheduled correctly
- Verify students with partial fee this month will get full fee next month

---

## Rollback Plan (If Something Goes Wrong)

### Emergency Rollback

```sql
-- Restore from backup
psql -h db.yourproject.supabase.co \
     -U postgres \
     -d postgres \
     < backup_YYYYMMDD.sql

-- Or use Supabase Dashboard → Database → Backups → Restore
```

### Partial Rollback (Keep Migration, Reset Data)

```sql
-- Reset all new fields to default
UPDATE students SET full_fee = 0, joining_date = NULL;
UPDATE student_fees SET is_partial = FALSE, total_days_in_month = NULL,
                        payable_days = NULL, per_day_fee = NULL, full_fee = NULL;
UPDATE fee_vouchers SET is_partial = FALSE, total_days_in_month = NULL,
                         payable_days = NULL, per_day_fee = NULL;
```

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** Migration has already run. Skip Step 2.

### Issue: All fees showing as 0

**Solution:** Run Step 4 to set full_fee for students.

### Issue: Partial fee not calculating

**Checklist:**

- [ ] Is `full_fee` set? (Should be > 0)
- [ ] Is `joining_date` set?
- [ ] Is `joining_date` in current month?
- [ ] Did student join after 1st?

### Issue: Cron job not creating fees

**Solution:**

```bash
# Check cron job logs in Vercel Dashboard
# Or trigger manually and check response
curl -X POST "https://yourapp.vercel.app/api/cron/monthly-billing?secret=your-secret"
```

---

## Post-Migration Tasks

- [ ] Update admin documentation
- [ ] Train staff on partial fee display
- [ ] Update student registration form (add full_fee & joining_date fields)
- [ ] Set up monitoring/alerts for fee generation
- [ ] Schedule monthly review of partial fees
- [ ] Update fee policy documents

---

## Support

If you encounter issues:

1. **Check logs:** Vercel Dashboard → Logs → Filter by "cron"
2. **Verify data:** Run SQL queries in Supabase Dashboard
3. **Test in isolation:** Create test student with known values
4. **Rollback if critical:** Use backup from Step 1

---

## Summary

**Total Migration Time:** 30-60 minutes (depending on student count)

**Steps:**

1. ✅ Backup database
2. ✅ Run migration script
3. ✅ Verify schema changes
4. ✅ Set full_fee for all students
5. ✅ Set joining_date (optional)
6. ✅ Update existing fee records (optional)
7. ✅ Test with sample data
8. ✅ Deploy code changes
9. ✅ Monitor first month

**Files to Review:**

- [`PARTIAL_FEE_SYSTEM_GUIDE.md`](PARTIAL_FEE_SYSTEM_GUIDE.md) - Complete guide
- [`PARTIAL_FEE_QUICK_REFERENCE.md`](PARTIAL_FEE_QUICK_REFERENCE.md) - Quick reference
- [`scripts/025_partial_fee_support.sql`](scripts/025_partial_fee_support.sql) - Migration script

**Ready to go!** 🚀

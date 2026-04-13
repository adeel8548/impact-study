# Partial Fee Calculation System - Complete Guide

## Overview

This system automatically calculates partial fees for students who join school after the 1st of the month. The partial fee applies **ONLY for the joining month**, and full fees are automatically applied from the next month onward.

---

## Features

✅ **Automatic Partial Fee Calculation** - System calculates fees based on actual days attended  
✅ **Joining Month Only** - Partial fee logic applies only to the first month  
✅ **Full Fee from Next Month** - Automatically switches to full fee after joining month  
✅ **Edge Case Handling** - Handles February, leap years, joining on 1st, etc.  
✅ **Transparent Breakdown** - Shows detailed calculation on fee vouchers  
✅ **No Manual Intervention** - Admin sets full_fee once, system handles the rest

---

## How It Works

### Example Scenario

**Student Details:**

- Full Monthly Fee: Rs. 5,000
- Joining Date: January 15, 2026
- Total Days in January: 31

**Calculation:**

```
Per Day Fee = 5,000 ÷ 31 = Rs. 161.29
Payable Days = 31 - 15 + 1 = 17 days (from 15th to 31st, inclusive)
Partial Fee = 161.29 × 17 = Rs. 2,741.93
```

**Next Month (February):**

- Full Fee: Rs. 5,000 (no partial calculation)

---

## Database Schema

### 1. Students Table

```sql
ALTER TABLE students
ADD COLUMN full_fee DECIMAL(10, 2) DEFAULT 0,  -- Base monthly fee
ADD COLUMN joining_date DATE;                  -- Admission date
```

### 2. Student Fees Table

```sql
ALTER TABLE student_fees
ADD COLUMN is_partial BOOLEAN DEFAULT FALSE,           -- Is this a partial fee?
ADD COLUMN total_days_in_month INTEGER,                -- Total days in month
ADD COLUMN payable_days INTEGER,                       -- Days student attended
ADD COLUMN per_day_fee DECIMAL(10, 4),                 -- Per-day rate
ADD COLUMN full_fee DECIMAL(10, 2);                    -- Full fee amount
```

### 3. Fee Vouchers Table

```sql
ALTER TABLE fee_vouchers
ADD COLUMN is_partial BOOLEAN DEFAULT FALSE,
ADD COLUMN total_days_in_month INTEGER,
ADD COLUMN payable_days INTEGER,
ADD COLUMN per_day_fee DECIMAL(10, 4);
```

---

## Setup Instructions

### Step 1: Run Database Migration

```bash
# Apply the migration script
psql -U your_user -d your_database -f scripts/025_partial_fee_support.sql

# OR via Supabase Dashboard
# Go to SQL Editor → New Query → Paste migration content → Run
```

### Step 2: Set Full Fee for Students

**Option A: Via Database**

```sql
-- Set full fee for all students
UPDATE students
SET full_fee = 5000  -- Your monthly fee
WHERE class_id = 'some-class-id';

-- Set full fee for specific student
UPDATE students
SET full_fee = 5000, joining_date = '2026-01-15'
WHERE id = 'student-id';
```

**Option B: Via Admin Panel**
Update your student form to include:

- `full_fee` field (number input)
- `joining_date` field (date input)

### Step 3: Update Student Form (Optional)

Add fields to your student registration/edit form:

```tsx
// In your student form component
<div>
  <Label>Full Monthly Fee (Rs.)</Label>
  <Input
    type="number"
    name="full_fee"
    placeholder="5000"
    required
  />
</div>

<div>
  <Label>Joining Date</Label>
  <Input
    type="date"
    name="joining_date"
    required
  />
</div>
```

---

## How the System Calculates Fees

### Automatic Monthly Fee Generation (Cron Job)

The cron job runs on the **1st of every month** and:

1. **Fetches all students** with `joining_date` and `full_fee`
2. **For each student**, determines if partial fee should apply:
   - ✅ Is this the joining month?
   - ✅ Did student join after the 1st?
   - ❌ If no → Apply full fee
   - ✅ If yes → Calculate partial fee

3. **Creates fee record** in `student_fees` table with:
   - `amount` = calculated fee (partial or full)
   - `is_partial` = true/false
   - `total_days_in_month`, `payable_days`, `per_day_fee`

4. **Creates fee voucher** with breakdown details

### Calculation Logic

```typescript
// Utility function: lib/utils/partial-fee-calculator.ts

// Example: Student joins on Jan 15, full_fee = 5000
const result = calculateFeeForMonth(
  5000,              // full_fee
  '2026-01-15',      // joining_date
  1,                 // month (January)
  2026               // year
);

// Result:
{
  isPartial: true,
  fullFee: 5000,
  calculatedFee: 2741.93,
  totalDaysInMonth: 31,
  payableDays: 17,
  perDayFee: 161.29,
  month: 1,
  year: 2026
}

// Next month (February):
const febResult = calculateFeeForMonth(
  5000,
  '2026-01-15',
  2,                 // February
  2026
);

// Result:
{
  isPartial: false,    // ← Full fee now!
  calculatedFee: 5000,
  payableDays: 28,
  ...
}
```

---

## Edge Cases Handled

### 1. **Joining on 1st of Month**

```
Joining Date: Jan 1, 2026
Result: Full fee (no partial calculation)
```

### 2. **February (28/29 days)**

```
Joining Date: Feb 20, 2026 (non-leap year)
Total Days: 28
Payable Days: 9
Fee: (5000 ÷ 28) × 9 = Rs. 1,607.14
```

### 3. **Leap Year February**

```
Joining Date: Feb 20, 2024 (leap year)
Total Days: 29
Payable Days: 10
Fee: (5000 ÷ 29) × 10 = Rs. 1,724.14
```

### 4. **Joining at Month End**

```
Joining Date: Jan 31, 2026
Total Days: 31
Payable Days: 1
Fee: (5000 ÷ 31) × 1 = Rs. 161.29
```

### 5. **No Joining Date Set**

```
If joining_date is NULL:
Result: Full fee (defaults to full amount)
```

---

## Fee Voucher Display

### For Partial Fee (Joining Month)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEE VOUCHER - JANUARY 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Student: Ahmed Ali (Roll #123)
Class: Class 5-A
Joining Date: 15-Jan-2026

─────────────────────────────────────────
 PARTIAL FEE CALCULATION (Joining Month)
─────────────────────────────────────────

Full Monthly Fee:        Rs. 5,000.00
Total Days in Month:     31 days
Joining Day:             15th
Payable Days:            17 days (15th-31st)

Per Day Fee:             Rs. 161.29
Calculation:             161.29 × 17 days

Monthly Fee:             Rs. 2,741.93
Arrears:                 Rs. 0.00
─────────────────────────────────────────
TOTAL AMOUNT:            Rs. 2,741.93
─────────────────────────────────────────
```

### For Full Fee (Next Month)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEE VOUCHER - FEBRUARY 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Student: Ahmed Ali (Roll #123)
Class: Class 5-A

Monthly Fee:             Rs. 5,000.00
Arrears:                 Rs. 0.00
─────────────────────────────────────────
TOTAL AMOUNT:            Rs. 5,000.00
─────────────────────────────────────────
```

---

## Testing the System

### Test Case 1: Student Joins Mid-Month

```sql
-- Create test student
INSERT INTO students (name, roll_number, class_id, school_id, full_fee, joining_date)
VALUES ('Test Student', 'TEST001', 'class-id', 'school-id', 5000, '2026-01-15');

-- Run cron job manually
-- Visit: /api/cron/monthly-billing?secret=your-secret

-- Check fee record
SELECT
  amount,
  is_partial,
  total_days_in_month,
  payable_days,
  per_day_fee
FROM student_fees
WHERE student_id = 'student-id'
AND month = 1 AND year = 2026;

-- Expected Result:
-- amount: 2741.93
-- is_partial: true
-- total_days_in_month: 31
-- payable_days: 17
-- per_day_fee: 161.29
```

### Test Case 2: Next Month (Full Fee)

```sql
-- Simulate next month (February 1, 2026)
-- Run cron job again

-- Check February fee
SELECT
  amount,
  is_partial
FROM student_fees
WHERE student_id = 'student-id'
AND month = 2 AND year = 2026;

-- Expected Result:
-- amount: 5000.00
-- is_partial: false
```

### Test Case 3: Joining on 1st

```sql
INSERT INTO students (name, full_fee, joining_date)
VALUES ('Test Student 2', 5000, '2026-01-01');

-- Expected: Full fee (5000), is_partial = false
```

---

## Utility Functions

### Calculate Fee for Any Month

```typescript
import { calculateFeeForMonth } from "@/lib/utils/partial-fee-calculator";

const fee = calculateFeeForMonth(
  5000, // full_fee
  "2026-01-15", // joining_date
  1, // target month
  2026, // target year
);

console.log(fee.calculatedFee); // 2741.93
console.log(fee.isPartial); // true
```

### Get Days in Month

```typescript
import { getDaysInMonth } from "@/lib/utils/partial-fee-calculator";

getDaysInMonth(2026, 1); // 31 (January)
getDaysInMonth(2026, 2); // 28 (February, non-leap)
getDaysInMonth(2024, 2); // 29 (February, leap year)
```

### Calculate Payable Days

```typescript
import { calculatePayableDays } from "@/lib/utils/partial-fee-calculator";

calculatePayableDays("2026-01-15", 1, 2026); // 17 days
calculatePayableDays("2026-02-20", 2, 2026); // 9 days
```

### Format Breakdown

```typescript
import { formatPartialFeeBreakdown } from "@/lib/utils/partial-fee-calculator";

const fee = calculateFeeForMonth(5000, "2026-01-15", 1, 2026);
console.log(formatPartialFeeBreakdown(fee));

// Output:
// Partial Fee Calculation:
// Full Monthly Fee: Rs. 5000.00
// Total Days in Month: 31
// Per Day Fee: Rs. 161.29
// Payable Days: 17 (joined on 15)
// Calculated Fee: Rs. 161.29 × 17 = Rs. 2741.93
```

---

## Troubleshooting

### Issue: Partial fee not calculating

**Solution:**

1. Check if `joining_date` is set in students table
2. Verify `full_fee` is set (not 0 or NULL)
3. Confirm migration ran successfully
4. Check cron job logs

### Issue: Full fee showing for joining month

**Possible causes:**

- Student joined on 1st of month (expected behavior)
- `joining_date` is in a different month
- Migration not applied

### Issue: Fee amount is 0

**Solution:**

- Set `full_fee` in students table
- Previous month fees might be 0 (one-time setup needed)

---

## API Reference

### Cron Job Endpoint

```bash
# Trigger monthly billing
POST /api/cron/monthly-billing?secret=your-secret

# Response
{
  "success": true,
  "studentsProcessed": 150,
  "teachersProcessed": 20,
  "month": 1,
  "year": 2026
}
```

### Generate Fee Voucher

```typescript
import { getFeeVoucherData } from "@/lib/actions/fee-vouchers";

const { data, error } = await getFeeVoucherData(
  "student-id",
  false, // includeFine
  null, // serialNumber (auto-generated)
  false, // removeArrears
);

// Returns FeeVoucherData with partial fee info
console.log(data.isPartial); // true/false
console.log(data.monthlyFee); // calculated amount
console.log(data.payableDays); // days attended
```

---

## Best Practices

1. **Set full_fee at student registration** - Easier than bulk updates later
2. **Set joining_date accurately** - Determines partial fee calculation
3. **Test with past dates** - Verify system works for different scenarios
4. **Monitor first month** - Check partial fees are calculated correctly
5. **Document fee structure** - Keep records of fee changes

---

## Migration Checklist

- [ ] Run database migration (`025_partial_fee_support.sql`)
- [ ] Update all existing students with `full_fee`
- [ ] Set `joining_date` for existing students (or NULL for full fee)
- [ ] Test cron job in development
- [ ] Verify fee vouchers show partial breakdown correctly
- [ ] Update student registration form (if needed)
- [ ] Test edge cases (1st, February, leap year)
- [ ] Monitor first month fees after deployment

---

## FAQ

**Q: What if I change a student's full_fee mid-year?**  
A: New fee applies from next month onward. Previous months remain unchanged.

**Q: Can I manually override partial fee?**  
A: Yes, update `amount` in `student_fees` table directly.

**Q: What if joining_date is missing?**  
A: System defaults to full fee (safe fallback).

**Q: How do I disable partial fee for specific student?**  
A: Set `joining_date` to NULL or 1st of month.

**Q: Can I apply partial fee to existing students?**  
A: Set their `joining_date` retroactively, then regenerate fees for that month.

---

## Support

For issues or questions:

1. Check error logs in Supabase Dashboard
2. Review cron job execution logs
3. Verify database schema matches migration
4. Test utility functions in isolation

---

## Summary

This system provides **fully automatic partial fee calculation** with zero manual intervention required after initial setup. Admin sets `full_fee` once, system handles:

✅ Partial fee calculation for joining month  
✅ Automatic full fee from next month  
✅ All edge cases (February, leap years, etc.)  
✅ Transparent breakdown on vouchers  
✅ Complete audit trail in database

**Key Files:**

- Migration: [`scripts/025_partial_fee_support.sql`](scripts/025_partial_fee_support.sql)
- Utilities: [`lib/utils/partial-fee-calculator.ts`](lib/utils/partial-fee-calculator.ts)
- Cron Job: [`app/api/cron/monthly-billing/route.ts`](app/api/cron/monthly-billing/route.ts)
- Actions: [`lib/actions/fee-vouchers.ts`](lib/actions/fee-vouchers.ts)

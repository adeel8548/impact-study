# Partial Fee System - Quick Reference

## One-Page Cheatsheet

### Setup (One-Time)

```sql
-- 1. Run migration
\i scripts/025_partial_fee_support.sql

-- 2. Set full fee for students
UPDATE students SET full_fee = 5000;

-- 3. Set joining dates
UPDATE students SET joining_date = '2026-01-15' WHERE id = 'student-id';
```

---

### How It Works

| Scenario        | Joining Date | Month    | Fee Type    | Calculation                 |
| --------------- | ------------ | -------- | ----------- | --------------------------- |
| Mid-month join  | Jan 15       | January  | **Partial** | (5000÷31)×17 = Rs. 2,741.93 |
| Same student    | Jan 15       | February | **Full**    | Rs. 5,000.00                |
| Join on 1st     | Jan 1        | January  | **Full**    | Rs. 5,000.00                |
| No joining date | NULL         | Any      | **Full**    | Rs. 5,000.00                |

---

### Key Functions

```typescript
// Calculate fee for any month
import { calculateFeeForMonth } from "@/lib/utils/partial-fee-calculator";

const fee = calculateFeeForMonth(5000, "2026-01-15", 1, 2026);
// Returns: { isPartial: true, calculatedFee: 2741.93, ... }
```

---

### Database Fields

**students table:**

- `full_fee` - Base monthly fee (set by admin)
- `joining_date` - Admission date

**student_fees table:**

- `amount` - Calculated fee (partial or full)
- `is_partial` - Boolean flag
- `total_days_in_month` - e.g., 31, 28, 29
- `payable_days` - Days student attended
- `per_day_fee` - Daily rate

---

### Edge Cases

```
Joining on 1st     → Full fee
Joining on 31st    → 1 day fee
February (28 days) → Auto-calculated
Leap year Feb      → Auto-calculated (29 days)
NULL joining_date  → Full fee (default)
```

---

### Testing

```bash
# Manual trigger cron
curl -X POST "http://localhost:3000/api/cron/monthly-billing?secret=your-secret"

# Check fee calculation
SELECT amount, is_partial, payable_days FROM student_fees
WHERE student_id = 'id' AND month = 1 AND year = 2026;
```

---

### Example Calculation

**Student:** Ahmed Ali  
**Full Fee:** Rs. 5,000  
**Joining:** January 15, 2026  
**Days in Jan:** 31

```
Per day fee = 5000 ÷ 31 = Rs. 161.29
Payable days = 31 - 15 + 1 = 17 days
Partial fee = 161.29 × 17 = Rs. 2,741.93
```

**Next Month (Feb):** Rs. 5,000 (full fee)

---

### Troubleshooting

| Problem                   | Solution                                             |
| ------------------------- | ---------------------------------------------------- |
| Fee is 0                  | Set `full_fee` in students table                     |
| Full fee in joining month | Check if joined on 1st OR `joining_date` wrong month |
| Partial fee in next month | Bug - check cron logic                               |
| No fee generated          | Run cron job or check student exists                 |

---

### Files Modified

```
✅ scripts/025_partial_fee_support.sql       (migration)
✅ lib/utils/partial-fee-calculator.ts       (utilities)
✅ app/api/cron/monthly-billing/route.ts     (cron job)
✅ lib/actions/fee-vouchers.ts               (voucher gen)
```

---

### Cron Schedule

```
0 0 1 * *  → Runs 1st of every month at midnight
```

**What it does:**

1. Calculates partial/full fee for each student
2. Creates fee records with breakdown
3. Generates vouchers automatically

---

### Admin Workflow

1. Register student with `full_fee` + `joining_date`
2. Wait for cron (or trigger manually)
3. System auto-calculates fees
4. Print vouchers (shows partial breakdown if applicable)
5. Next month → Full fee automatically

**No manual intervention needed!** 🎉

---

### Quick Links

- Full Guide: [`PARTIAL_FEE_SYSTEM_GUIDE.md`](PARTIAL_FEE_SYSTEM_GUIDE.md)
- Migration: [`scripts/025_partial_fee_support.sql`](scripts/025_partial_fee_support.sql)
- Calculator: [`lib/utils/partial-fee-calculator.ts`](lib/utils/partial-fee-calculator.ts)

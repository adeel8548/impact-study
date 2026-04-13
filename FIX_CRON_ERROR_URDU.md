---
عنوان: Cron Job Error کا حل - Unique Constraint
---

# ❌ مسئلہ Problem

```
[Cron] Student fees upsert error: there is no unique
or exclusion constraint matching the ON CONFLICT specification
```

## کیا ہوا؟

**Cron job** چلانے پر یہ error آتا ہے کیونکہ:

- `student_fees` table میں **unique constraint** نہیں ہے
- `teacher_salary` table میں **unique constraint** نہیں ہے
- Upsert operation کو constraint چاہیے

---

# ✅ حل Solution

## چرण 1: Supabase میں SQL چلائیں

### A. Supabase Dashboard کھولیں

```
1. https://supabase.com/dashboard
2. اپنا Project select کریں
3. SQL Editor tab کھولیں (بائیں side)
```

### B. یہ Script چلائیں

📄 **File:** `scripts/FIX_CRON_UNIQUE_CONSTRAINTS.sql`

یہ کریں گے:

```
✅ Duplicate entries ہٹائیں (اگر ہوں)
✅ Unique constraints add کریں
✅ Performance indexes بنائیں
✅ Verify کریں کہ کام ہو گیا
```

---

## چرण 2: Script Copy Paste کریں

```sql
-- student_fees unique constraint
ALTER TABLE student_fees
ADD CONSTRAINT student_fees_unique_student_month_year
UNIQUE (student_id, month, year);

-- teacher_salary unique constraint
ALTER TABLE teacher_salary
ADD CONSTRAINT teacher_salary_unique_teacher_month_year
UNIQUE (teacher_id, month, year);
```

---

## چرण 3: Run دبائیں

Supabase SQL Editor میں:

```
1. Script paste کریں
2. "Run" button دبائیں (نیچے دائیں)
3. Success message دیکھیں ✅
```

**Expected Output:**

```
Success. No rows returned
```

---

# 🧪 Test کریں

## Cron Job Manually Trigger کریں

### Browser میں:

```
https://your-domain.vercel.app/api/cron/monthly-billing
```

### یا Terminal میں:

```bash
curl "https://your-domain.vercel.app/api/cron/monthly-billing"
```

**Success Response:**

```json
{
  "success": true,
  "message": "Successfully created monthly fees...",
  "studentsProcessed": 45,
  "teachersProcessed": 8
}
```

---

# 🔍 Verify کریں

## Supabase میں Table Editor کھولیں

### Check Constraints:

```sql
-- یہ query چلائیں
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('student_fees', 'teacher_salary')
AND constraint_type = 'UNIQUE';
```

**Expected Result:**

```
┌──────────────────────────────────────┬────────────┐
│ constraint_name                      │ type       │
├──────────────────────────────────────┼────────────┤
│ student_fees_unique_student_month... │ UNIQUE     │
│ teacher_salary_unique_teacher_mon... │ UNIQUE     │
└──────────────────────────────────────┴────────────┘
```

---

# 📊 کیا ہوگا اب

## پہلے (Before):

```
❌ Cron job error
❌ Duplicate entries possible
❌ Upsert fail
```

## اب (After):

```
✅ Cron job works
✅ No duplicates (student/month/year)
✅ Upsert works perfectly
✅ Monthly billing automatic
```

---

# 🚨 Troubleshooting

### Error: Constraint already exists

```
حل: Constraint پہلے سے ہے - OK ہے! Skip کریں
```

### Error: Duplicate key value

```
حل: پہلے duplicates delete کریں:

DELETE FROM student_fees a USING student_fees b
WHERE a.id > b.id
AND a.student_id = b.student_id
AND a.month = b.month
AND a.year = b.year;
```

### Error: Permission denied

```
حل: Admin rights چیک کریں Supabase میں
```

---

# ✅ Checklist

- [ ] Supabase SQL Editor کھولا
- [ ] FIX_CRON_UNIQUE_CONSTRAINTS.sql چلایا
- [ ] Success message آیا
- [ ] Constraints verify کیے
- [ ] Cron job manually test کیا
- [ ] Success response ملا

---

# 📞 Quick Commands

**Database Backup (optional):**

```sql
-- پہلے backup لے سکتے ہو
CREATE TABLE student_fees_backup AS
SELECT * FROM student_fees;

CREATE TABLE teacher_salary_backup AS
SELECT * FROM teacher_salary;
```

**Check Duplicates:**

```sql
-- Duplicates check کریں
SELECT student_id, month, year, COUNT(*)
FROM student_fees
GROUP BY student_id, month, year
HAVING COUNT(*) > 1;
```

**Remove Constraint (اگر ضرورت ہو):**

```sql
ALTER TABLE student_fees
DROP CONSTRAINT student_fees_unique_student_month_year;
```

---

**Last Updated:** December 30, 2025  
**Status:** ✅ READY TO FIX
**Time Required:** 2-3 منٹ

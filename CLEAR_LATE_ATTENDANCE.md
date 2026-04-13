# Clear Student Late Attendance (40 Minutes)

## Quick Fix - Supabase SQL

اگر کسی **STUDENT** کے 40 minutes late کو remove کرنا ہے:

### Option 1: صرف "late" status والے کو remove کریں

```sql
DELETE FROM student_attendance
WHERE
  status = 'late'
  AND date = CURRENT_DATE
LIMIT 1;
```

### Option 2: اگر معلوم ہے student کا نام

```sql
DELETE FROM student_attendance
WHERE
  student_id = (SELECT id FROM students WHERE name ILIKE '%student_name%')
  AND status = 'late'
  AND date = '2026-01-31'
LIMIT 1;
```

### Option 3: اگر معلوم ہے student کا ID

```sql
DELETE FROM student_attendance
WHERE
  student_id = 'student_uuid_here'
  AND status = 'late'
  AND date = '2026-01-31'
LIMIT 1;
```

---

## کیسے استعمال کریں:

1. **Supabase Dashboard** کھولو
2. **SQL Editor** میں جاؤ
3. اپنے scenario کے مطابق query کو copy کرو
4. تبدیلیاں کرو (تاریخ، teacher name/ID)
5. **RUN** پر click کرو

---

## Database میں سے data check کرنے کے لیے:

```sql
SELECT
  s.name as student_name,
  sa.date,
  sa.status,
  sa.remarks,
  sa.created_at
FROM student_attendance sa
LEFT JOIN students s ON sa.student_id = s.id
WHERE sa.status = 'late'
AND sa.date = CURRENT_DATE
ORDER BY sa.created_at DESC;
```

---

## ⚠️ Important

- Attendance record **delete** ہوگی (پورا ہٹ جائے گی)
- Status ہو گا `late` - یہ remove ہوگی
- Student present نہیں رہے گی، کوئی attendance نہیں ہوگی

---

## اگر صرف "late" status کو "present" میں change کرنا ہے تو:

```sql
UPDATE student_attendance
SET status = 'present'
WHERE
  student_id = 'student_uuid_here'
  AND status = 'late'
  AND date = '2026-01-31';
```

یہ student کو **present** mark کر دے گا۔

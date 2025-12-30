---
title: Cron Jobs Configuration & Monitoring
description: Complete guide to all automated cron jobs
---

# 🤖 Cron Jobs Configuration & Monitoring

## تمام Cron Jobs کا خلاصہ Summary

| Job | Schedule | وقت Time | مقصد Purpose |
|-----|----------|----------|-------------|
| **Auto Teacher OUT + ABSENT** | `0 14 * * *` | **7:00 PM PKT** | Auto out + Mark absent |
| **Monthly Billing** | `0 0 1 * *` | **5:00 AM PKT** (1st) | Fees + Salaries + Vouchers |

*Note: Combined into 1 cron job due to Vercel free plan limitation (max 2 crons)*

---

## ✅ Vercel Configuration

```json
// vercel.json (Free plan: max 2 crons)
{
  "crons": [
    {
      "path": "/api/cron/monthly-billing",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/auto-teacher-out",
      "schedule": "0 14 * * *"
    }
  ]
}
```

**Note:** auto-teacher-out اور auto-teacher-absent دونوں ایک ہی endpoint میں combined ہیں!

## 🤖 اب کیا ہوگا

### 7:00 PM PKT پر ایک ہی cron job دونوں کریں گے:

**Step 1: AUTO OUT**
```
جو teachers PRESENT/LATE ہیں لیکن out_time نہیں
→ out_time = 7:00 PM PKT set کریں
```

**Step 2: AUTO ABSENT**
```
جو teachers کا کوئی record نہیں
→ ABSENT mark کریں (remarks: auto_marked)
```

---

## 1️⃣ Combined Auto Teacher OUT + ABSENT (7 PM PKT)

### 📍 File
`app/api/cron/auto-teacher-out/route.ts` (COMBINED: OUT + ABSENT دونوں)

### ⏰ Schedule
```
UTC: 0 14 * * * (2:00 PM UTC = 7:00 PM PKT)
```

### 🎯 کام کرتا ہے
```
Step 1: Teachers جو PRESENT/LATE ہیں لیکن out_time نہیں ہے
        → out_time = 7:00 PM PKT set کریں

Step 2: Teachers جن کا کوئی attendance record نہیں
        → ABSENT mark کریں
```

### مثال Example:
```
Scenario: علی teacher نے 2 PM میں IN mark کیا
├─ 3 PM: Still no OUT marked
├─ 7 PM: Cron job چلتی ہے
└─ علی کو OUT: 7 PM مع status PRESENT marked ہوگا
```

### کیا ہوتا ہے:
```
teacher_attendance table میں:
┌────────────┬────────────┬──────────┬──────────┐
│ teacher_id │ date       │ in_time  │ out_time │
├────────────┼────────────┼──────────┼──────────┤
│ ali-123    │ 2025-12-30 │ 2:00 PM  │ 7:00 PM  │ ← Auto-added
└────────────┴────────────┴──────────┴──────────┘
```

---

## 2️⃣ Monthly Billing (1st of Month)

### 📍 File
`app/api/cron/monthly-billing/route.ts`

### ⏰ Schedule
```
UTC: 0 0 1 * * (12:00 AM UTC = 5:00 AM PKT on 1st of month)
```

### 🎯 کام کرتا ہے
```
Step 1: Student fees create کریں (current month)
Step 2: Fee vouchers auto-create کریں ✨
Step 3: Teacher salaries create کریں
Step 4: Expiration checks
```

### مثال Example:
```
1 January 2026 5:00 AM PKT
├─ 45 students کے fees create
├─ 45 vouchers auto-create
├─ 8 teachers کی salaries
└─ Vercel logs میں confirm message
```

---

## � Logs دیکھنے کے لیے

### Vercel Dashboard میں
```
1. https://vercel.com → Project select کریں
2. "Functions" tab → "Cron Jobs"
3. Latest executions دیکھو
```

### Expected Logs (ایک ہی execution میں):
```
[Auto Teacher Out] Running for date: 2025-12-30
[Auto Teacher Out] Auto-out set for 5 records
[Auto Teacher Out] Found 3 teachers without any attendance marked
[Auto Teacher Out] Successfully marked 3 teachers as absent
[Auto Teacher Out] Complete: 5 auto-out, 3 auto-absent
```

---

## 🧪 Manual Testing

### Auto Teacher Out/Absent
```bash
# GET request
curl "https://your-domain.com/api/cron/auto-teacher-out"

# POST request
curl -X POST "https://your-domain.com/api/cron/auto-teacher-out"

# With secret
curl "https://your-domain.com/api/cron/auto-teacher-out?secret=YOUR_CRON_SECRET"
```

### Response Example:
```json
{
  "success": true,
  "message": "Auto-out updated 5, auto-absent 3",
  "outTimeUpdated": 5,
  "absenceMarked": 3,
  "absentTeachers": [
    { "id": "teacher-1", "name": "Hassan Ali" },
    { "id": "teacher-2", "name": "Fatima Khan" }
  ],
  "date": "2025-12-30"
}
```

---

## 🐛 Troubleshooting

### مسئلہ: Cron job نہیں چل رہی

**حل 1: Vercel میں schedule verify کریں**
```
Vercel Dashboard → Settings → Cron Jobs
```

**حل 2: API endpoint manually test کریں**
```
GET /api/cron/auto-teacher-out
```

**حل 3: Logs چیک کریں**
```
Vercel → Functions → Recent executions
Look for [Cron] messages
```

---

### مسئلہ: Teachers marked نہیں ہو رہے

**حل 1: teacher_attendance table میں check کریں**
```sql
SELECT * FROM teacher_attendance 
WHERE date = TODAY() 
ORDER BY created_at DESC;
```

**حل 2: Profiles table میں teachers ہیں یا نہیں**
```sql
SELECT id, name FROM profiles WHERE role = 'teacher';
```

**حل 3: Database permissions check کریں**
- RLS policies enable ہیں؟
- admin role ہے؟

---

## 📊 Monitor کریں

### یہ check کریں Daily:
```
1. Vercel logs میں [Auto Teacher Out] messages
   - دونوں operations ایک execution میں
2. teacher_attendance table میں auto_marked entries
3. Monthly 1st کو fee_vouchers table
```

### SQL Queries for Monitoring:
```sql
-- آج کے cron updates
SELECT * FROM teacher_attendance 
WHERE date = TODAY() 
AND remarks = 'auto_marked';

-- Monthly vouchers check
SELECT COUNT(*) FROM fee_vouchers 
WHERE month = 'December';

-- Teachers without attendance
SELECT COUNT(DISTINCT p.id) FROM profiles p
WHERE p.role = 'teacher'
AND p.id NOT IN (
  SELECT teacher_id FROM teacher_attendance WHERE date = TODAY()
);
```

---

## ✨ Best Practices

1. **Monitor logs regularly** - Vercel Dashboard میں
2. **Test before month-end** - Auto billing verify کریں
3. **Backup RLS policies** - Database access secured رہے
4. **Document any changes** - Code changes track کریں
5. **Alert setup کریں** - Failed crons کی notification

---

## 📞 Quick Reference

**Auto OUT + ABSENT کو manually trigger کریں:**
```
GET /api/cron/auto-teacher-out?secret=YOUR_SECRET
```

**Monthly Billing کو manually trigger کریں:**
```
POST /api/cron/monthly-billing
Headers: Authorization: Bearer YOUR_CRON_SECRET
```

**Vercel Cron Editor:**
```
vercel.json میں صرف 2 schedules ہیں (free plan)
```

---

**Last Updated:** December 30, 2025  
**Cron Jobs:** 2 (Vercel free limit)
**Status:** ✅ OPTIMIZED FOR FREE PLAN

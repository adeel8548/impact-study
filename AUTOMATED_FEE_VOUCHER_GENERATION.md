---
title: خودکار فیس ووچر کی تیاری - Automated Fee Voucher Generation
language: Urdu/English
---

# Automated Fee Voucher Generation with Cron Job 🤖

## خصوصیات Features

✅ **Automatic Monthly**: ہر مہینے کی 1 تاریخ کو خودکار طور پر فیس ووچرز بنتے ہیں
✅ **No Manual Work**: کوئی manual INSERT SQL نہیں چلانا پڑے گا
✅ **Complete Integration**: Cron job student_fees اور fee_vouchers دونوں کو ایک ساتھ update کرتا ہے
✅ **Fine Auto-Calculation**: 12 تاریخ سے بعد fine خودکار محاسب ہوتی ہے
✅ **Arrears Tracking**: پچھلے مہینوں کے بقایا رقم خودکار شمار ہوتے ہیں

---

## Cron Job کیا کرتا ہے؟

جب **1st of every month** پر یہ cron job چلتا ہے:

```
📅 1st December 2025
├─ Step 1: Student fees create/update
├─ Step 2: 🆕 Fee vouchers auto-create ✨
├─ Step 3: Teacher salaries update
└─ Step 4: Fee expiration checks
```

### Step-by-Step Process

#### 1️⃣ **Student Fees بنتے ہیں**
```sql
-- Database میں add ہوتا ہے:
student_id: "uuid-123"
month: 12
year: 2025
amount: 5000
status: "unpaid"
```

#### 2️⃣ **Fee Vouchers خودکار بنتے ہیں** 🎯 (NEW!)
```sql
-- خودکار طور پر یہ insert ہوتا ہے:
serial_number: 101        -- خود incrementing
student_id: "uuid-123"
issue_date: "2025-12-01"
due_date: "2025-12-12"
monthly_fee: 5000         -- current month
arrears: 2000            -- previous unpaid
fines: 0                 -- ابھی 0 (12 سے پہلے)
total_amount: 7000
month: "December"
```

#### 3️⃣ **Arrears خودکار calculate ہوتے ہیں**
```
مثال: اگر November 2025 unpaid ہے
└─ automatic میں add ہوگا arrears میں
```

---

## Implementation Details

### File Modified
📄 **app/api/cron/monthly-billing/route.ts**

### Added Code Logic
```typescript
// Step 2: Auto-create fee vouchers for all students
console.log("[Cron] Creating fee vouchers for all students...");

// Loop through all students
for (const student of students) {
  // Get current month fees
  const monthlyFee = studentFees?.amount || 0;
  
  // Get previous unpaid amounts
  const arrears = (arrearsFees || []).reduce((sum, fee) => sum + fee.amount, 0);
  
  // Insert voucher record
  vouchersToInsert.push({
    serial_number: nextSerialNumber++,
    student_id: student.id,
    monthly_fee: monthlyFee,
    arrears: arrears,
    total_amount: monthlyFee + arrears,
    ...otherFields
  });
}
```

---

## How to Use / استعمال کیسے کریں

### Option A: Vercel Cron (Automatic)

پہلے سے setup ہے:
```json
// vercel.json میں:
{
  "crons": [
    {
      "path": "/api/cron/monthly-billing",
      "schedule": "0 0 1 * *"  // 1st of every month at 00:00
    }
  ]
}
```

**فائدے:**
- خودکار
- کوئی کام نہیں
- ہر مہینے یقینی

---

### Option B: Manual Trigger (Testing)

اگر آپ فوری test کرنا چاہیں:

#### 1️⃣ URL کال کریں:
```
GET /api/cron/monthly-billing?secret=YOUR_CRON_SECRET
```

#### 2️⃣ یا Postman میں:
```
Method: GET
URL: http://localhost:3000/api/cron/monthly-billing?secret=test-secret

OR

Method: POST
Headers:
  Authorization: Bearer test-secret
```

#### 3️⃣ Response ملے گا:
```json
{
  "success": true,
  "message": "Successfully created monthly fees and salaries for 12/2025",
  "studentsProcessed": 45,
  "teachersProcessed": 8,
  "month": 12,
  "year": 2025
}
```

---

## Vouchers خودکار کیسے Populate ہوتے ہیں

### پہلے (Before):
```
❌ Empty fee_vouchers table
❌ Manual SQL INSERT required
❌ طویل process
```

### اب (After):
```
✅ Auto-populated on 1st of month
✅ All students covered
✅ Arrears calculated
✅ Serial numbers auto-increment
✅ Just 1 cron job = done!
```

---

## Database Changes

### fee_vouchers Table
```sql
Column              Value
─────────────────────────────────────────
serial_number       1, 2, 3... (auto)
student_id          UUID (foreign key)
issue_date          2025-12-01
due_date            2025-12-12
monthly_fee         5000
arrears             2000
fines               0
annual_charges      0
exam_fee            0
other_charges       0
total_amount        7000
month               "December"
created_at          timestamp
updated_at          timestamp
```

---

## Fine Calculation (خودکار نہیں - Preview میں)

```
قائدہ Rule:
├─ Due Date: 12 تاریخ
├─ Fine: 20 روپے فی دن
├─ Start: 13 تاریخ سے
└─ Calculate: جب print کریں (UI میں)
```

**مثال:**
```
If today = Dec 20
└─ Days Late = 20 - 12 = 8 days
└─ Fine = 8 × 20 = Rs. 160
```

---

## Monitoring / نگرانی

### Logs دیکھیں:
```bash
# Vercel dashboard میں:
Functions → monthly-billing → Logs

# Output:
[Cron] Starting monthly billing process for 12/2025
[Cron] Created 45 fee vouchers
[Cron] Completed: 45 students, 8 teachers
```

### Database میں Check کریں:
```sql
-- کتنے vouchers بنے؟
SELECT COUNT(*) FROM fee_vouchers;

-- Latest month کے vouchers:
SELECT * FROM fee_vouchers 
WHERE month = 'December' 
ORDER BY serial_number;

-- خاص student کے vouchers:
SELECT fv.* FROM fee_vouchers fv
JOIN students s ON fv.student_id = s.id
WHERE s.roll_number = '101';
```

---

## Troubleshooting

### مسئلہ: Vouchers نہیں بن رہے

**حل 1: Check کریں student_fees table میں data ہے**
```sql
SELECT COUNT(*) FROM student_fees WHERE month = 12 AND year = 2025;
```

**حل 2: Check کریں cron job چل رہا ہے**
```
Vercel Dashboard → Functions → Logs
```

**حل 3: Manual trigger کریں**
```
GET /api/cron/monthly-billing?secret=YOUR_SECRET
```

---

### مسئلہ: Duplicate serial numbers

**حل: Database میں check کریں**
```sql
SELECT serial_number, COUNT(*) 
FROM fee_vouchers 
GROUP BY serial_number 
HAVING COUNT(*) > 1;
```

---

## Configuration

### Environment Variables
```bash
# .env.local میں set کریں:
CRON_SECRET=your-secure-secret-here
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_KEY=your-key
```

### Vercel Setup
```json
// vercel.json میں already configured
{
  "crons": [
    {
      "path": "/api/cron/monthly-billing",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

---

## خلاصہ Summary

| Feature | پہلے | اب |
|---------|------|-----|
| Manual Entry | ✅ | ❌ |
| Automation | ❌ | ✅ |
| Monthly Run | Manual | Auto 1st of month |
| Serial Numbers | Manual | Auto increment |
| Arrears | Manual calc | Auto calculated |
| Time Required | 30+ minutes | 0 seconds |

---

## Next Steps

1. **Deploy to Vercel** - Cron job automatically active
2. **Test on 1st of month** - Check logs
3. **Monitor vouchers** - View in Supabase
4. **Print as needed** - From UI بیلاتاخیری

---

**سوالات/Questions?** 
- Check logs in Vercel
- Review SQL in Supabase
- Test with GET endpoint manually

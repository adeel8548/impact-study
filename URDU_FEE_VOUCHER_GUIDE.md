# فیس ووچر سسٹم - قرآن کردہ مسائل اور خصوصیات

## حل شدہ مسائل ✅

### 1. Student Update میں Date Error

**مسئلہ**: Roll Number یا Fees update کرتے وقت "invalid input syntax for type date: ''" error آتا تھا

**حل**:

- `lib/actions/students.ts` میں خالی date string کو null میں تبدیل کیا
- اب joining_date خالی رہ سکتا ہے بغیر error کے

---

## نیا Features - Fee Voucher System 🎟️

### کیا ہے؟

ایک مکمل نظام جو students کے لیے خود کار fee vouchers پرنٹ کرتا ہے۔

### خصوصیات:

#### 1️⃣ Serial Number - خود کار

```
ہر voucher کو منفرد نمبر ملتا ہے
مثال: Serial No. 1, 2, 3... وغیرہ
```

#### 2️⃣ تاریخیں - خود کار

```
Issue Date: جس دن print ہو
Due Date: ہر مہینے کی 12 تاریخ
```

#### 3️⃣ جرمانہ (Fine) - خود کار حساب

```
حساب: 12 کے بعد ہر روز 20 روپے
مثال:
  12 تاریخ: کوئی جرمانہ نہیں
  13 تاریخ: 20 روپے
  20 تاریخ: 8 × 20 = 160 روپے
```

#### 4️⃣ ماضی کی فیس (Arrears) - خود کار

```
موجودہ مہینہ: Monthly Fee میں
گزرے ہوئے مہینے: Arrears میں

مثال:
جنوری میں نہیں دی: 500 Arrears
فروری میں نہیں دی: 500 Arrears
مارچ ہے: 500 Monthly Fee
کل: 1500
```

### استعمال کیسے کریں؟

#### ایک بچے کا Print کریں:

```
1. Admin Dashboard → Students
2. بچے کے row میں Printer icon دیکھیں
3. Click کریں
4. Fine کے ساتھ چاہیے یا بغیر؟
5. Print کریں
```

#### سب بچوں کا Print کریں:

```
1. "Print Fee Vouchers" button دیکھیں
2. All Students منتخب کریں
3. Generate Preview
4. Print All
```

#### کسی Class کے سب کا Print کریں:

```
1. "Print Fee Vouchers" button
2. By Class منتخب کریں
3. اپنی class منتخب کریں
4. Generate Preview
5. Print All
```

---

## Voucher میں کیا ہے؟

```
┌─────────────────────────────────┐
│    IMPACT STUDY INSTITUTE       │
│                                 │
│ Roll No.  | Fee A/C | Serial No.│
│ Issue Date| Due Date            │
│                                 │
│ Student Name: ___________       │
│ Father Name:  ___________       │
│ Class: _____ | Month: _____     │
│                                 │
│ Detail          | Amount        │
├─────────────────────────────────┤
│ Monthly Fee     | 5,000          │
│ Arrears         | 2,000          │
│ Fines           | 160            │
│ TOTAL           | 7,160          │
└─────────────────────────────────┘
```

---

## Advance Features

### Fine کے ساتھ Print

```
Checkbox لگائیں: "Include fine"
خود کار سے 20 روپے × دن بعد 12 تاریخ
```

### بغیر Fine کے Print

```
Checkbox خالی رکھیں
صرف Monthly Fee + Arrears دکھے گا
```

---

## Technical Files (Developers کے لیے)

```
lib/actions/fee-vouchers.ts
├── generateSerialNumber()
├── getFeeVoucherData()
├── getMultipleFeeVouchers()
└── saveFeeVoucher()

components/
├── fee-voucher.tsx (Voucher design)
└── modals/
    ├── fee-voucher-print-dialog.tsx (ایک کے لیے)
    └── bulk-fee-voucher-print-dialog.tsx (سب کے لیے)

students-client.tsx (نئے buttons)
├── Print icon (ایک کے لیے)
└── Print Fee Vouchers button (سب کے لیے)
```

---

## Database

```sql
fee_vouchers ٹیبل بنایا جائے گا جو:
- Serial numbers store کرے
- Student information رکھے
- Fee details محفوظ کرے
- Dates record کرے
```

---

## Customization

### جرمانہ کی رقم تبدیل کریں:

```typescript
// lib/actions/fee-vouchers.ts میں
const FINE_PER_DAY = 20; // 20 کو اپنی رقم سے بدلیں
```

### Due Date تبدیل کریں:

```typescript
// lib/actions/fee-vouchers.ts میں
const dueDate = new Date(currentYear, currentMonth - 1, 12);
// 12 کو اپنی تاریخ سے بدلیں (مثلاً 15)
```

---

## مسائل کا حل (Troubleshooting)

### Problem 1: Serial number نہیں بڑھ رہے

```
✓ Solution: fee_vouchers ٹیبل بن گیا ہے یقینی بنائیں
```

### Problem 2: Arrears غلط ہیں

```
✓ Solution: student_fees میں month/year درست ہیں چیک کریں
```

### Problem 3: Fine غلط ہے

```
✓ Solution: Server اور local date ایک جیسا ہے چیک کریں
```

### Problem 4: Print نہیں ہو رہا

```
✓ Solution: Browser کی print settings چیک کریں
```

---

## فوائل ✨

✅ خود کار Serial Numbers  
✅ خود کار Dates  
✅ خود کار Fine حساب  
✅ خود کار Arrears الگ الگ  
✅ ایک ایک بچے کا print  
✅ سب کا ایک ساتھ print  
✅ Class کے حساب سے print  
✅ Fine کے ساتھ یا بغیر print  
✅ دونوں copies (Head Office + Student)

---

## آگے بڑھانے کے لیے (Future)

- Email سے vouchers بھیجنا
- SMS notifications
- QR code payment tracking
- Payment history شامل کرنا
- اردو میں بھی لکھنا
- خصوصی discounts
- Multiple charges

---

**نصب کریں**: Database migration چلائیں اور ہو گئے!

```bash
# Database SQL چلائیں: scripts/create-fee-vouchers-table.sql
```

---

ہر سوال کے لیے: FEE_VOUCHER_SYSTEM_GUIDE.md کھولیں (English میں مکمل guide)

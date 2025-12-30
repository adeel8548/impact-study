# 🎫 Fee Voucher System - Quick Reference Card

## 🚀 Quick Setup (Just 1 Minute!)

```sql
1. Open Supabase → SQL Editor
2. Paste: scripts/create-fee-vouchers-table.sql
3. Click Run
4. Done! ✓
```

---

## 📌 Where to Find New Features

### In Admin Dashboard

```
Students Page
│
├── New Button: "Print Fee Vouchers" (Top Left)
│   └── Click to print: All / By Class
│
└── New Icon: [Printer] in Actions Column
    └── Click to print: Single Student
```

---

## 💡 What Gets Auto-Calculated

```
✓ Serial Number ............ 1, 2, 3, 4...
✓ Issue Date ............... Today's date
✓ Due Date ................. 12th of month
✓ Monthly Fee .............. Current month unpaid
✓ Arrears .................. Previous months unpaid
✓ Fine ..................... 20 Rs × (today - 12th)
✓ Total Amount ............. Fee + Arrears + Fine
```

---

## 🎯 How to Print

### One Student
```
[Printer Icon] → Check Fine? → Generate Preview → Print
```

### All Students
```
[Print Fee Vouchers] → All Students → Check Fine? → Generate → Print
```

### By Class
```
[Print Fee Vouchers] → By Class → Select Class → Check Fine? → Generate → Print
```

---

## 🔢 Fine Calculation

```
Rule: 20 Rs per day after 12th

Date    Days Late    Fine
12th    0            0 Rs
13th    1            20 Rs
20th    8            160 Rs
25th    13           260 Rs
```

---

## 💰 Arrears Example

```
Student owes:
  January .... 500 (Old)
  February ... 500 (Old)
  March ...... 500 (Current)

Voucher shows:
  Monthly Fee: 500
  Arrears: 1,000
  Total: 1,500
```

---

## ⚙️ Customize (2 Options)

### Option 1: Change Fine Amount
```
File: lib/actions/fee-vouchers.ts
Line: ~45
Change: const FINE_PER_DAY = 20;
To:     const FINE_PER_DAY = 30; (or your amount)
```

### Option 2: Change Due Date
```
File: lib/actions/fee-vouchers.ts
Line: ~68
Change: new Date(..., 12)  // 12th
To:     new Date(..., 15)  // 15th (or your date)
```

---

## 📋 Voucher Shows

```
┌────────────────────────────────┐
│ Roll No. | Serial | Issue Date │
│ Due Date: 12th                 │
│ Student Name: ___________      │
│ Father Name: ___________       │
│ Class: ____ | Month: ______    │
│ ┌────────────────────────────┐ │
│ │ Monthly Fee .... Rs. 5,000  │ │
│ │ Arrears ....... Rs. 2,000  │ │
│ │ Fines ......... Rs. 160    │ │
│ │ TOTAL ......... Rs. 7,160  │ │
│ └────────────────────────────┘ │
│ Prints as 2 copies:            │
│  [Head Office] [Student Copy]  │
└────────────────────────────────┘
```

---

## 🔄 Database

```
Table Created: fee_vouchers
Stores: Serial numbers, dates, amounts, student info
Security: Row Level Security enabled
```

---

## ✅ Checklist

- [ ] SQL migration executed
- [ ] "Print Fee Vouchers" button visible
- [ ] Printer icon visible in student rows
- [ ] Can print one student voucher
- [ ] Can print all students
- [ ] Can print by class
- [ ] Fine checkbox works
- [ ] Dates are correct
- [ ] Amounts are correct

---

## 🐛 Quick Fixes

| Issue | Fix |
|-------|-----|
| Print button missing | Refresh browser (F5) |
| Database error | Run SQL migration |
| Date error | Already fixed ✓ |
| Arrears wrong | Check student_fees table |
| Fine not showing | Today must be after 12th |

---

## 📚 Full Guides

- 📖 **English**: FEE_VOUCHER_SYSTEM_GUIDE.md
- 📖 **Urdu**: URDU_FEE_VOUCHER_GUIDE.md
- 📖 **Setup**: FEE_VOUCHER_SETUP.md

---

## 🎓 Features

```
✨ Auto Serial Numbers
✨ Auto Dates
✨ Auto Fine (20 Rs/day)
✨ Auto Arrears
✨ Print 1 Student
✨ Print All Students
✨ Print by Class
✨ With/Without Fine
✨ 2 Copies (Head Office + Student)
✨ Professional Design
```

---

**Version**: 1.0.0  
**Status**: ✅ Ready to Use  
**Setup Time**: 1 minute  
**Print Time**: < 30 seconds per student

---

## 🚀 Start Now!

1. Run SQL migration (1 minute)
2. Refresh browser
3. Click "Print Fee Vouchers"
4. Enjoy! 🎉

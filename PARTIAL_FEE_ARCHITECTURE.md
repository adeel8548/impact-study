# Partial Fee System - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTIAL FEE SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   STUDENTS   │       │ STUDENT_FEES │       │ FEE_VOUCHERS │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │───┐   │ id           │   ┌───│ id           │
│ name         │   │   │ student_id   │───┤   │ student_id   │
│ roll_number  │   └───│ month        │   │   │ serial_no    │
│ class_id     │       │ year         │   │   │ month        │
│ full_fee     │◄──────│ amount       │   │   │ monthly_fee  │
│ joining_date │       │ is_partial   │◄──┼───│ is_partial   │
└──────────────┘       │ payable_days │   │   │ payable_days │
                       │ per_day_fee  │   │   │ per_day_fee  │
                       └──────────────┘   └───│ total_amount │
                                              └──────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONTHLY CRON JOB                             │
│                  (1st of every month)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │  Fetch All Students                   │
        │  (with full_fee & joining_date)       │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │  For Each Student:                    │
        │  Calculate Fee for Current Month      │
        └───────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │  Is Joining Month?   │    │  Not Joining Month   │
    │  Joined after 1st?   │    │  OR Joined on 1st    │
    └──────────────────────┘    └──────────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │  PARTIAL FEE         │    │  FULL FEE            │
    │                      │    │                      │
    │  Calculate:          │    │  Fee = full_fee      │
    │  - Days in month     │    │                      │
    │  - Payable days      │    │  is_partial = false  │
    │  - Per day fee       │    └──────────────────────┘
    │  - Total fee         │                │
    │                      │                │
    │  is_partial = true   │                │
    └──────────────────────┘                │
                │                           │
                └─────────────┬─────────────┘
                              ▼
        ┌───────────────────────────────────────┐
        │  Insert into student_fees             │
        │  - amount (calculated)                │
        │  - is_partial                         │
        │  - payable_days                       │
        │  - per_day_fee                        │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │  Create Fee Voucher                   │
        │  - Include partial fee breakdown      │
        │  - Calculate total with arrears       │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │  Admin Prints Voucher                 │
        │  - Shows partial breakdown if needed  │
        └───────────────────────────────────────┘
```

---

## Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               PARTIAL FEE CALCULATION LOGIC                     │
└─────────────────────────────────────────────────────────────────┘

Input:
  • full_fee: Rs. 5,000
  • joining_date: 2026-01-15
  • current_month: January 2026
  • current_year: 2026

                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Step 1: Get Days in Month             │
        │ getDaysInMonth(2026, 1) = 31          │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Step 2: Check if Partial Fee Applies  │
        │                                       │
        │ Is joining_month == current_month?    │
        │ ✅ Yes (Jan == Jan)                   │
        │                                       │
        │ Is joining_day > 1?                   │
        │ ✅ Yes (15 > 1)                       │
        │                                       │
        │ → PARTIAL FEE APPLIES                 │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Step 3: Calculate Payable Days        │
        │ payable_days = 31 - 15 + 1 = 17       │
        │ (Inclusive: 15th, 16th ... 31st)      │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Step 4: Calculate Per Day Fee         │
        │ per_day_fee = 5000 ÷ 31 = 161.29      │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Step 5: Calculate Total Fee           │
        │ total_fee = 161.29 × 17 = 2,741.93    │
        └───────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────┐
        │ Output:                               │
        │ {                                     │
        │   isPartial: true,                    │
        │   fullFee: 5000,                      │
        │   calculatedFee: 2741.93,             │
        │   totalDaysInMonth: 31,               │
        │   payableDays: 17,                    │
        │   perDayFee: 161.29                   │
        │ }                                     │
        └───────────────────────────────────────┘
```

---

## Timeline Example

```
Student: Ahmed Ali
Full Fee: Rs. 5,000
Joining: Jan 15, 2026

┌────────────────────────────────────────────────────────────────┐
│                        TIMELINE                                │
└────────────────────────────────────────────────────────────────┘

Jan 1, 2026                                        Jan 31, 2026
    │                                                     │
    │           Student Joins ▼                          │
    │                     (Jan 15)                       │
    │                         │                          │
    ├─────────────────────────┼──────────────────────────┤
    │◄─ Not Payable (14 days)─►◄─ Payable (17 days) ───►│

    Fee: Rs. 0                Fee: Rs. 2,741.93
    (before joining)          (17 days × Rs. 161.29)


Feb 1, 2026                                        Feb 28, 2026
    │                                                     │
    ├─────────────────────────────────────────────────────┤
    │◄──────────────── Full Month Payable ───────────────►│

                    Fee: Rs. 5,000.00
                    (Full monthly fee)


Mar 1, 2026                                        Mar 31, 2026
    │                                                     │
    ├─────────────────────────────────────────────────────┤
    │◄──────────────── Full Month Payable ───────────────►│

                    Fee: Rs. 5,000.00
                    (Full monthly fee)

... and so on for every subsequent month
```

---

## Edge Cases Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                       EDGE CASES                                │
└─────────────────────────────────────────────────────────────────┘

Case 1: Joining on 1st
─────────────────────────
joining_date: Jan 1, 2026
    │
    ▼
Should Apply Partial? NO (joined on 1st)
    │
    ▼
Result: FULL FEE (Rs. 5,000)


Case 2: Joining on Last Day
───────────────────────────
joining_date: Jan 31, 2026
    │
    ▼
Payable Days: 31 - 31 + 1 = 1 day
    │
    ▼
Result: PARTIAL FEE (Rs. 161.29)


Case 3: February (Non-Leap)
───────────────────────────
joining_date: Feb 20, 2026
Days in month: 28
    │
    ▼
Payable Days: 28 - 20 + 1 = 9 days
Per Day Fee: 5000 ÷ 28 = 178.57
    │
    ▼
Result: PARTIAL FEE (Rs. 1,607.13)


Case 4: Leap Year February
──────────────────────────
joining_date: Feb 20, 2024
Days in month: 29 (leap year)
    │
    ▼
Payable Days: 29 - 20 + 1 = 10 days
Per Day Fee: 5000 ÷ 29 = 172.41
    │
    ▼
Result: PARTIAL FEE (Rs. 1,724.10)


Case 5: NULL Joining Date
─────────────────────────
joining_date: NULL
    │
    ▼
Should Apply Partial? NO (no date)
    │
    ▼
Result: FULL FEE (default fallback)


Case 6: Next Month After Joining
────────────────────────────────
joining_date: Jan 15, 2026
current_month: Feb 2026
    │
    ▼
Is joining_month == current_month? NO
    │
    ▼
Result: FULL FEE (Rs. 5,000)
```

---

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                  COMPONENT HIERARCHY                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Admin Fee Management Page      │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Generate Fee Voucher Button    │
│  ─ Calls getFeeVoucherData()        │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Fee Voucher Display            │
│  ─ Shows student info               │
│  ─ Shows fee breakdown              │
└─────────────────────────────────────┘
                 │
                 ├─────────────────┬──────────────────┐
                 ▼                 ▼                  ▼
    ┌────────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ PartialFeeDisplay  │ │ ArrearsInfo  │ │  TotalAmount │
    │                    │ │              │ │              │
    │ if (isPartial):    │ │              │ │              │
    │ • Show breakdown   │ │              │ │              │
    │ • Days attended    │ │              │ │              │
    │ • Per day rate     │ │              │ │              │
    │ • Calculation      │ │              │ │              │
    │                    │ │              │ │              │
    │ else:              │ │              │ │              │
    │ • Show full fee    │ │              │ │              │
    └────────────────────┘ └──────────────┘ └──────────────┘
```

---

## API Call Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  API REQUEST FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. Cron Trigger
───────────────
POST /api/cron/monthly-billing?secret=xxx
    │
    ▼
Verify Secret
    │
    ▼
Create Admin Client
    │
    ▼
Fetch All Students (with full_fee, joining_date)
    │
    ▼
For Each Student:
    │
    ├─► calculateFeeForMonth()
    │        │
    │        ├─► getDaysInMonth()
    │        ├─► shouldApplyPartialFee()
    │        └─► calculatePayableDays()
    │
    └─► Insert into student_fees
    │
    └─► Create fee_voucher
    │
    ▼
Return Success Response
    │
    ▼
{
  success: true,
  studentsProcessed: 150,
  month: 1,
  year: 2026
}


2. Get Fee Voucher
──────────────────
getFeeVoucherData(studentId)
    │
    ▼
Fetch Student Info
    │
    ▼
Fetch Current Month Fees
    │
    ├─► Get is_partial flag
    ├─► Get payable_days
    ├─► Get per_day_fee
    └─► Get total_days_in_month
    │
    ▼
Fetch Arrears
    │
    ▼
Calculate Fine (if enabled)
    │
    ▼
Return FeeVoucherData
    │
    ▼
{
  studentId,
  monthlyFee,
  isPartial: true/false,
  payableDays,
  perDayFee,
  totalAmount,
  ...
}
```

---

## Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│           FEE CALCULATION DECISION TREE                         │
└─────────────────────────────────────────────────────────────────┘

                     Start: Calculate Fee
                              │
                              ▼
                    ┌──────────────────┐
                    │ joining_date     │
                    │ provided?        │
                    └──────────────────┘
                         │       │
                      YES│       │NO
                         │       └────────► FULL FEE
                         ▼
                    ┌──────────────────┐
                    │ Is this the      │
                    │ joining month?   │
                    └──────────────────┘
                         │       │
                      YES│       │NO
                         │       └────────► FULL FEE
                         ▼
                    ┌──────────────────┐
                    │ Joined after     │
                    │ the 1st?         │
                    └──────────────────┘
                         │       │
                      YES│       │NO
                         │       └────────► FULL FEE
                         ▼
                    ┌──────────────────┐
                    │ CALCULATE        │
                    │ PARTIAL FEE      │
                    │                  │
                    │ 1. Get days      │
                    │ 2. Calc payable  │
                    │ 3. Calc per day  │
                    │ 4. Multiply      │
                    └──────────────────┘
                         │
                         ▼
                     PARTIAL FEE
```

---

## System States

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT FEE STATES                           │
└─────────────────────────────────────────────────────────────────┘

State 1: New Student (No Fee Record Yet)
─────────────────────────────────────────
students: { full_fee: 5000, joining_date: '2026-01-15' }
student_fees: (empty)
    │
    │ Cron job runs ▼
    │
student_fees: {
  amount: 2741.93,
  is_partial: true,
  payable_days: 17
}


State 2: First Month (Partial Fee)
───────────────────────────────────
Month: January 2026 (joining month)
student_fees: {
  amount: 2741.93,
  is_partial: true,
  status: 'unpaid'
}


State 3: Payment Made
─────────────────────
student_fees: {
  amount: 2741.93,
  is_partial: true,
  status: 'paid',
  paid_date: '2026-01-20'
}


State 4: Second Month (Full Fee)
─────────────────────────────────
Month: February 2026 (next month)
    │
    │ Cron job runs ▼
    │
student_fees: {
  amount: 5000.00,
  is_partial: false,
  payable_days: 28,
  status: 'unpaid'
}


State 5: All Subsequent Months
───────────────────────────────
March, April, May... (always full fee)
student_fees: {
  amount: 5000.00,
  is_partial: false,
  status: 'unpaid'
}
```

---

## Performance Considerations

```
Optimization Strategy:
─────────────────────

1. Database Indexes
   ✓ idx_students_joining_date
   ✓ idx_student_fees_partial
   ✓ idx_fee_vouchers_student_id

2. Query Optimization
   ✓ Batch inserts (all students at once)
   ✓ Single query for student fetch
   ✓ Minimal joins

3. Calculation Caching
   ✓ Store calculated values in DB
   ✓ No recalculation on voucher print
   ✓ Reuse per_day_fee, payable_days

4. Cron Scheduling
   ✓ Runs once per month
   ✓ Offloads from user requests
   ✓ Background processing
```

---

This visual guide helps understand:

- ✅ How data flows through the system
- ✅ When partial vs full fee is applied
- ✅ Edge case handling logic
- ✅ Component integration
- ✅ API call sequences

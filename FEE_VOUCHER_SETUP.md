# Fee Voucher System - Setup Instructions

## Installation Summary

All components have been created and installed. Here's what was done:

### 1. ✅ Fixed Date Error

**Issue**: "invalid input syntax for type date: ''" in student update
**File Modified**: `lib/actions/students.ts`
**Status**: FIXED ✓

### 2. ✅ Created API Actions

**Files Created**:

- `lib/actions/fee-vouchers.ts` - Server actions for voucher data

**Functions**:

```typescript
-generateSerialNumber() - // Get next serial number
  getFeeVoucherData() - // Get single student voucher data
  getMultipleFeeVouchers() - // Get multiple students' vouchers
  saveFeeVoucher(); // Save voucher to database
```

### 3. ✅ Created Components

**Files Created**:

- `components/fee-voucher.tsx` - Voucher display component
- `components/modals/fee-voucher-print-dialog.tsx` - Single student print
- `components/modals/bulk-fee-voucher-print-dialog.tsx` - Bulk print

### 4. ✅ Updated UI

**File Modified**: `components/students-client.tsx`
**Changes**:

- Added "Print Fee Vouchers" button in toolbar
- Added printer icon in each student's row
- Integrated print dialogs

### 5. ✅ Installed Dependencies

**Package Installed**: `react-to-print`

```bash
npm install react-to-print
```

### 6. 📊 Created Database Migration

**File Created**: `scripts/create-fee-vouchers-table.sql`
**Status**: Ready to execute

---

## Next Steps - Setup Database

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file: `scripts/create-fee-vouchers-table.sql`
4. Copy the entire SQL
5. Paste in Supabase SQL Editor
6. Click **Run**

**Expected Output**:

```
Query successful (no results)
```

### Step 2: Verify Table Creation

1. In Supabase, go to **Table Editor**
2. Refresh the page
3. You should see `fee_vouchers` table
4. Click on it to verify columns

---

## Usage Instructions

### Print Fee Vouchers

#### For Single Student:

1. Go to **Admin Dashboard → Students**
2. Find student in table
3. Click **Printer icon** (new icon in Actions column)
4. Check "Include fine" if you want fine included
5. Click **Generate Preview**
6. Review the voucher
7. Click **Print Voucher**

#### For All Students:

1. Go to **Admin Dashboard → Students**
2. Click **Print Fee Vouchers** button (near "Add Student")
3. Select "All Students"
4. Check "Include fine" if needed
5. Click **Generate Preview**
6. Click **Print All**

#### For Students in a Class:

1. Go to **Admin Dashboard → Students**
2. Click **Print Fee Vouchers** button
3. Select "By Class"
4. Choose the class
5. Check "Include fine" if needed
6. Click **Generate Preview**
7. Click **Print All**

---

## Voucher Features

### Auto-Generated Fields

| Field             | How It Works                           |
| ----------------- | -------------------------------------- |
| **Serial Number** | Automatically incremented (1, 2, 3...) |
| **Issue Date**    | Set to today's date                    |
| **Due Date**      | Always 12th of current month           |
| **Monthly Fee**   | Current month's unpaid fee             |
| **Arrears**       | Sum of all previous unpaid months      |
| **Fines**         | Rs. 20 × (today - 12th) if past 12th   |
| **Total Amount**  | Monthly Fee + Arrears + Fines          |

### Fine Calculation

```
Rule: Rs. 20 per day after 12th of month

Examples:
- On 12th: Fine = 0
- On 13th: Fine = 20 Rs
- On 20th: Fine = 8 × 20 = 160 Rs
- On 25th: Fine = 13 × 20 = 260 Rs
```

### Arrears Separation

The system automatically separates fees:

- **Current Month** → Shows as "Monthly Fee"
- **Previous Months** → Shows as "Arrears"

Example:

```
Student has unpaid:
- January: 500
- February: 500
- March (current): 500

Voucher shows:
Monthly Fee: 500
Arrears: 1000
Total: 1500
```

---

## Customization Options

### Change Fine Amount (Rs. 20)

Edit: `lib/actions/fee-vouchers.ts`

```typescript
// Line 45 - Change this value:
const FINE_PER_DAY = 20; // ← Change 20 to your amount
```

### Change Due Date (12th)

Edit: `lib/actions/fee-vouchers.ts`

```typescript
// Line 68 - Change 12 to your date:
const dueDate = new Date(currentYear, currentMonth - 1, 12);
                                                        ↑
                                                    Change this
```

### Change Voucher Design

Edit: `components/fee-voucher.tsx`

You can customize:

- Colors
- Font sizes
- Layout
- Logo (currently shows "ISI")
- Footer text in Urdu

---

## Troubleshooting

### Q: Serial numbers not incrementing?

**A**:

1. Check if `fee_vouchers` table exists
2. Verify table has data with `SELECT COUNT(*) FROM fee_vouchers;`
3. If empty, that's OK - it starts from 1

### Q: Arrears showing as 0?

**A**:

1. Ensure student has previous unpaid fees
2. Check `student_fees` table has correct month/year
3. Verify fee status is "unpaid"

### Q: Fine showing as 0?

**A**:

1. Check if today is after 12th of month
2. Verify system date/time is correct
3. If before 12th, fine will be 0 (correct behavior)

### Q: Print button not working?

**A**:

1. Check browser console for errors (F12)
2. Allow browser to show print dialog
3. Check if `react-to-print` is installed: `npm list react-to-print`
4. Try a different browser

### Q: Voucher looks wrong?

**A**:

1. Try printing as PDF (in print dialog)
2. Adjust browser zoom (Ctrl+0 for default)
3. Check if CSS is loading properly

---

## Database Migration SQL

If you need to manually run the migration:

```sql
-- Copy from: scripts/create-fee-vouchers-table.sql
-- Paste in Supabase SQL Editor
-- Click Run
```

---

## File Structure

```
project/
├── lib/actions/
│   ├── students.ts (FIXED ✓)
│   └── fee-vouchers.ts (NEW ✓)
│
├── components/
│   ├── fee-voucher.tsx (NEW ✓)
│   ├── students-client.tsx (UPDATED ✓)
│   └── modals/
│       ├── fee-voucher-print-dialog.tsx (NEW ✓)
│       └── bulk-fee-voucher-print-dialog.tsx (NEW ✓)
│
├── scripts/
│   └── create-fee-vouchers-table.sql (NEW ✓)
│
└── Documentation/
    ├── FEE_VOUCHER_SYSTEM_GUIDE.md (Detailed)
    ├── URDU_FEE_VOUCHER_GUIDE.md (Urdu)
    └── FEE_VOUCHER_SETUP.md (This file)
```

---

## Testing Checklist

- [ ] Database migration executed successfully
- [ ] "Print Fee Vouchers" button visible on Students page
- [ ] Printer icon visible in student Actions column
- [ ] Can open print dialog for single student
- [ ] Can generate preview for all students
- [ ] Can generate preview for class-wise
- [ ] Fine checkbox works
- [ ] Voucher displays correctly
- [ ] Print function works
- [ ] Serial numbers are unique
- [ ] Issue date is today
- [ ] Due date is 12th of month
- [ ] Arrears calculated correctly
- [ ] Fine calculated correctly

---

## Need Help?

1. Read detailed guide: `FEE_VOUCHER_SYSTEM_GUIDE.md`
2. Read Urdu guide: `URDU_FEE_VOUCHER_GUIDE.md`
3. Check troubleshooting above
4. Review browser console errors (F12)
5. Verify database table exists

---

## Summary of Changes

### What's New ✨

- ✅ Auto serial numbers for vouchers
- ✅ Auto fine calculation (20 Rs/day after 12th)
- ✅ Auto arrears separation
- ✅ Single student print
- ✅ Bulk print (all/by class)
- ✅ Optional fine inclusion
- ✅ Dual copy system (Head Office + Student)

### What's Fixed 🔧

- ✅ Date error in student update
- ✅ Joining date now accepts null values

### Ready to Use ✓

- ✅ All components created
- ✅ All functions written
- ✅ UI buttons integrated
- ✅ Dependencies installed

### Just Setup Database:

- ⏳ Run the SQL migration file

---

**Status**: Ready to Use! 🚀

Just run the database migration and you're all set!

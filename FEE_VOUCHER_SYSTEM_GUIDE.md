# Fee Voucher System - Complete Guide

## Overview
The Fee Voucher System allows admins to print professional fee vouchers for students with automatic serial numbers, arrears calculation, fine management, and flexible printing options.

## Features

### ✅ Implemented Features

1. **Auto Serial Number Generation**
   - Automatically generates unique serial numbers for each voucher
   - Sequential numbering maintained in database

2. **Issue & Due Date Management**
   - Issue Date: Automatically set to current date when printing
   - Due Date: Fixed to 12th of the month
   - Late fee calculation starts after 12th

3. **Fine Calculation**
   - Rs. 20 per day fine after 12th of the month
   - Optional: Can print with or without fine
   - Automatic calculation based on current date

4. **Arrears Management**
   - Current month fee shown in "Monthly Fee" field
   - Previous unpaid months shown in "Arrears" field
   - Automatic segregation of fees by month/year

5. **Print Options**
   - **Individual Print**: Print voucher for one student
   - **Class-wise Print**: Print vouchers for all students in a class
   - **Print All**: Print vouchers for all students

6. **Dual Copy System**
   - Head Office Copy
   - Student Copy
   - Both copies printed side-by-side

## File Structure

```
lib/actions/
  └── fee-vouchers.ts          # Server actions for voucher data

components/
  ├── fee-voucher.tsx          # Voucher component
  └── modals/
      ├── fee-voucher-print-dialog.tsx      # Individual print dialog
      └── bulk-fee-voucher-print-dialog.tsx # Bulk print dialog

scripts/
  └── create-fee-vouchers-table.sql  # Database migration
```

## Database Setup

### Run the SQL Migration

Execute the following SQL in your Supabase SQL editor:

```sql
-- Run the script from scripts/create-fee-vouchers-table.sql
```

This creates:
- `fee_vouchers` table
- Indexes for performance
- Row Level Security policies

## Usage Guide

### 1. Print Individual Student Voucher

1. Go to **Admin Dashboard → Students**
2. Find the student in the table
3. Click the **Printer icon** in the Actions column
4. Choose whether to include fine or not
5. Preview the voucher
6. Click **Print Voucher**

### 2. Print Bulk Vouchers

1. Go to **Admin Dashboard → Students**
2. Click **Print Fee Vouchers** button (top of page)
3. Select print type:
   - **All Students**: Prints for all students
   - **By Class**: Select a class to print
4. Check "Include fine" if needed
5. Click **Generate Preview**
6. Review vouchers
7. Click **Print All**

## Voucher Fields Explained

| Field | Description |
|-------|-------------|
| Serial No. | Auto-generated unique number |
| Roll No. | Student's roll number |
| Fee A/C | Fee account number (optional) |
| Issue Date | Date when voucher is printed |
| Due Date | Fixed to 12th of current month |
| Student Name | Full name of student |
| Father Name | Guardian/Father name |
| Class/Section | Student's class |
| Month | Current month name |
| Monthly Fee | Current month's fee amount |
| Arrears | Sum of all previous unpaid months |
| Fines | Late fee (Rs. 20 × days after 12th) |
| Annual Charges | Additional annual charges |
| Exam Fee | Examination fees |
| Other Charges | Miscellaneous charges |
| Total Amount | Sum of all above |

## Fine Calculation Logic

```typescript
Due Date: 12th of every month
Fine Rate: Rs. 20 per day
Start Date: After 12th

Example:
If today is 20th of the month:
Days Late = 20 - 12 = 8 days
Fine = 8 × 20 = Rs. 160
```

## Arrears Calculation

The system automatically:
1. Fetches all unpaid fees for the student
2. Separates current month from previous months
3. Current month → "Monthly Fee" field
4. Previous months → "Arrears" field

Example:
```
Student has unpaid fees:
- January: Rs. 500
- February: Rs. 500
- March (current): Rs. 500

Voucher shows:
Monthly Fee: Rs. 500 (March)
Arrears: Rs. 1,000 (January + February)
```

## API Functions

### `generateSerialNumber()`
Generates the next serial number for vouchers.

### `getFeeVoucherData(studentId, includeFine)`
Fetches all data needed for a single student's voucher.

Parameters:
- `studentId`: Student UUID
- `includeFine`: Boolean to include late fee

Returns:
- Voucher data with all calculated fields

### `getMultipleFeeVouchers(studentIds, includeFine)`
Fetches voucher data for multiple students.

Parameters:
- `studentIds`: Array of student UUIDs
- `includeFine`: Boolean to include late fee

Returns:
- Array of voucher data

### `saveFeeVoucher(voucherData)`
Saves voucher record to database.

## Customization

### Change Fine Amount
Edit in `lib/actions/fee-vouchers.ts`:
```typescript
const FINE_PER_DAY = 20; // Change this value
```

### Change Due Date
Edit in `lib/actions/fee-vouchers.ts`:
```typescript
const dueDate = new Date(currentYear, currentMonth - 1, 12);
// Change 12 to your preferred date
```

### Customize Voucher Design
Edit `components/fee-voucher.tsx` to modify:
- Layout
- Colors
- Logo
- Footer text

## Troubleshooting

### Issue: Serial numbers not incrementing
**Solution**: Check if `fee_vouchers` table exists and has data

### Issue: Arrears not showing correctly
**Solution**: Verify `student_fees` table has correct month/year values

### Issue: Fine calculation incorrect
**Solution**: Ensure server and client dates are synchronized

### Issue: Print not working
**Solution**: 
1. Check browser print permissions
2. Verify `react-to-print` is installed
3. Check console for errors

## Fixed Bugs

### ✅ Date Error in Student Update
**Problem**: "invalid input syntax for type date: ''" error when updating students

**Solution**: Modified `lib/actions/students.ts` to convert empty string to null:
```typescript
const sanitizedUpdates = {
  ...studentUpdates,
  joining_date: studentUpdates.joining_date || null,
};
```

## Future Enhancements

Potential improvements:
- Email vouchers to parents
- SMS notifications
- QR code for payment tracking
- Payment history on voucher
- Multi-language support (Urdu/English)
- Custom charges per student
- Discount management

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Verify database tables and data
4. Check Supabase policies

---

**Version**: 1.0.0  
**Last Updated**: December 30, 2024  
**Author**: Impact Study Institute Management System

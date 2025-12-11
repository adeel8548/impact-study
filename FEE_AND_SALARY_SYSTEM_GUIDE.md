# Complete Monthly Fee & Salary Management System

## Overview
A comprehensive monthly fee management system for students and teachers with automated cron jobs, payment tracking, and yearly summaries.

---

## 📋 Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Cron Job Setup](#cron-job-setup)
4. [Frontend Components](#frontend-components)
5. [How to Use](#how-to-use)
6. [Configuration](#configuration)

---

## Database Schema

### `student_fees` Table
```sql
CREATE TABLE student_fees (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL (FK to students),
  month INTEGER (1-12),
  year INTEGER,
  amount DECIMAL(10,2),
  status TEXT ('paid' | 'unpaid'),
  paid_date TIMESTAMP,
  school_id UUID NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(student_id, month, year)
);
```

### `teacher_salary` Table
```sql
CREATE TABLE teacher_salary (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL (FK to profiles),
  month INTEGER (1-12),
  year INTEGER,
  amount DECIMAL(10,2),
  status TEXT ('paid' | 'unpaid'),
  paid_date TIMESTAMP,
  school_id UUID NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(teacher_id, month, year)
);
```

---

## API Endpoints

### Student Fees API

#### 1. **GET `/api/fees`** - Fetch Student Fees
**Query Parameters:**
- `studentId` (optional) - Filter by specific student
- `month` (optional) - Filter by month (1-12)
- `year` (optional) - Filter by year
- `allMonths` (optional) - Set to 'true' to get all months (default: current month only)

**Response:**
```json
{
  "fees": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "month": 12,
      "year": 2025,
      "amount": 5000,
      "status": "unpaid",
      "paid_date": null
    }
  ],
  "success": true
}
```

#### 2. **GET `/api/fees/monthly`** - Fetch Fee for Specific Month
**Query Parameters:**
- `studentId` (required) - Student UUID
- `month` (required) - Month (1-12)
- `year` (required) - Year

**Response:**
```json
{
  "fee": {
    "id": "uuid",
    "student_id": "uuid",
    "month": 12,
    "year": 2025,
    "amount": 5000,
    "status": "unpaid",
    "paid_date": null
  },
  "success": true,
  "exists": true
}
```

#### 3. **PUT `/api/fees`** - Update Fee Status
**Request Body:**
```json
{
  "id": "fee-uuid",
  "status": "paid",
  "paid_date": "2025-12-15T10:30:00Z",
  "amount": 5000
}
```

#### 4. **POST `/api/fees`** - Create/Upsert Fee
**Request Body:**
```json
{
  "student_id": "uuid",
  "month": 12,
  "year": 2025,
  "amount": 5000,
  "school_id": "uuid"
}
```

---

### Teacher Salary API

#### 1. **GET `/api/salaries`** - Fetch Teacher Salaries
**Query Parameters:**
- `teacherId` (optional) - Filter by specific teacher
- `month` (optional) - Filter by month (1-12)
- `year` (optional) - Filter by year
- `allMonths` (optional) - Set to 'true' to get all months
- `status` (optional) - Filter by status ('paid' | 'unpaid')

**Response:** Same structure as fees

#### 2. **GET `/api/salaries/monthly`** - Fetch Salary for Specific Month
**Query Parameters:**
- `teacherId` (required) - Teacher UUID
- `month` (required) - Month (1-12)
- `year` (required) - Year

#### 3. **PUT `/api/salaries`** - Update Salary Status
**Request Body:**
```json
{
  "id": "salary-uuid",
  "status": "paid",
  "paid_date": "2025-12-15T10:30:00Z",
  "amount": 50000
}
```

#### 4. **POST `/api/salaries`** - Create/Upsert Salary
**Request Body:**
```json
{
  "teacher_id": "uuid",
  "month": 12,
  "year": 2025,
  "amount": 50000,
  "school_id": "uuid"
}
```

---

## Cron Job Setup

### Endpoint: `POST /api/cron/monthly-billing`

#### Purpose
Automatically creates monthly fee and salary entries on the 1st of each month.

#### Setup Instructions

**Option 1: Vercel Cron Jobs**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-billing",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Option 2: External Scheduler (Cron-job.org)**

1. Visit [cron-job.org](https://cron-job.org)
2. Create new job:
   - URL: `https://yourdomain.com/api/cron/monthly-billing`
   - Method: POST
   - Headers: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

**Option 3: Manual Trigger**
```bash
curl -X POST https://yourdomain.com/api/cron/monthly-billing \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Environment Variables
```env
CRON_SECRET=your-secret-key-here
```

#### What It Does
1. ✅ Fetches all students from the database
2. ✅ Creates a `student_fees` entry for the current month if not exists
3. ✅ Fetches all teachers from the database
4. ✅ Creates a `teacher_salary` entry for the current month if not exists
5. ✅ Preserves all previous months' data
6. ✅ Sets status to 'unpaid' and paid_date to null by default

#### Response
```json
{
  "success": true,
  "message": "Successfully created monthly fees and salaries for 12/2025",
  "studentsProcessed": 150,
  "teachersProcessed": 25,
  "month": 12,
  "year": 2025
}
```

---

## Frontend Components

### 1. **StudentFeesClient** Component
**Location:** `components/student-fees-client.tsx`

**Props:**
```typescript
interface StudentFeesClientProps {
  students: Student[];
}
```

**Features:**
- Student selector with grid layout
- Live payment status (Paid/Unpaid)
- Current month highlighted card
- Statistics cards (Total Paid, Unpaid, Collected, Pending)
- Monthly fees table
- Payment modal integration
- Yearly summary modal

**Usage:**
```tsx
import { StudentFeesClient } from "@/components/student-fees-client";

<StudentFeesClient students={students} />
```

---

### 2. **TeacherSalaryClient** Component
**Location:** `components/teacher-salary-client.tsx`

**Props:**
```typescript
interface TeacherSalaryClientProps {
  teachers: Teacher[];
}
```

**Features:**
- Teacher selector
- Salary status tracking
- Statistics cards
- Monthly salary table
- Payment modal integration
- Yearly summary modal

**Usage:**
```tsx
import { TeacherSalaryClient } from "@/components/teacher-salary-client";

<TeacherSalaryClient teachers={teachers} />
```

---

### 3. **FeePaymentModal** Component
**Location:** `components/modals/fee-payment-modal.tsx`

**Props:**
```typescript
interface FeePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName?: string;
  onPaymentSuccess?: () => void;
}
```

**Features:**
- Month/Year dropdown selection
- Auto-selects current month if all previous months paid
- Shows paid/unpaid status with badges
- Displays amount and payment date (current month only)
- "Mark as Paid" button (always enabled)
- Real-time status update

---

### 4. **SalaryPaymentModal** Component
**Location:** `components/modals/salary-payment-modal.tsx`

**Props:**
```typescript
interface SalaryPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName?: string;
  onPaymentSuccess?: () => void;
}
```

**Features:**
- Same as FeePaymentModal but for salaries

---

### 5. **YearlySummaryModal** Component
**Location:** `components/modals/yearly-summary-modal.tsx`

**Props:**
```typescript
interface YearlySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "fees" | "salary";
  entityId: string;
  entityName?: string;
}
```

**Features:**
- Year selector dropdown
- Summary statistics (Total, Paid, Unpaid counts)
- All 12 months in table format
- Paid/Unpaid badges for each month
- Payment dates (current month only)
- View-only mode (no editing)

---

### 6. **Updated Admin Pages**

#### Admin Fees Page
**Location:** `app/admin/fees/page.tsx`

- Fetches all students
- Integrates StudentFeesClient component
- Shows loading and error states

#### Admin Salaries Page
**Location:** `app/admin/salaries/page.tsx`

- Fetches all teachers
- Integrates TeacherSalaryClient component
- Shows loading and error states

---

## How to Use

### As an Admin - Student Fees

1. **Navigate to Fees Management**
   - Go to Admin Dashboard → Fees

2. **Select a Student**
   - Click on a student from the grid

3. **View Fee Status**
   - Current month status card shows paid/unpaid
   - Table displays all months

4. **Record Payment**
   - Click "Record Payment" button
   - Select month/year from dropdowns
   - Click "Mark as Paid"
   - System updates status immediately

5. **View Yearly Summary**
   - Click "View All Month Fees" button
   - Select year from dropdown
   - See all 12 months with payment status

---

### As an Admin - Teacher Salary

1. **Navigate to Salary Management**
   - Go to Admin Dashboard → Salaries

2. **Select a Teacher**
   - Click on a teacher from the grid

3. **View Salary Status**
   - Current month status card shows paid/unpaid
   - Table displays all months

4. **Record Payment**
   - Click "Record Payment" button
   - Select month/year from dropdowns
   - Click "Mark as Paid"
   - System updates status immediately

5. **View Yearly Summary**
   - Click "View All Month Salaries" button
   - Select year from dropdown
   - See all 12 months with payment status

---

## Configuration

### Utility Functions
**Location:** `lib/utils.ts`

```typescript
// Month names
getMonthName(month: number) → string
getMonthNameShort(month: number) → string

// Current date
getCurrentMonth() → number
getCurrentYear() → number

// Formatting
getMonthYear(month: number, year: number) → string
formatCurrency(amount: number) → string

// Helpers
generateYearOptions(yearsBack: number) → number[]
isCurrentMonth(month: number, year: number) → boolean
```

### Types
**Location:** `lib/types.ts`

```typescript
interface StudentFees {
  id: string;
  studentId: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paidDate?: Date;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TeacherSalary {
  id: string;
  teacherId: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paidDate?: Date;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Key Features

✅ **Automated Monthly Billing**
- Cron job runs automatically on 1st of month
- Creates entries for all students and teachers
- Preserves previous months' data

✅ **Month/Year Filtering**
- Dropdown selectors in modals
- Auto-selects current month if all previous paid
- Supports viewing any past or future month

✅ **Payment Status Tracking**
- Real-time status updates
- Badges show paid/unpaid status
- Payment dates stored for audit

✅ **Yearly Summaries**
- View all 12 months at once
- Statistics cards show summary
- Only current month payment dates displayed

✅ **Dynamic for Multiple Users**
- Works with any number of students/teachers
- Responsive UI with grid selectors
- Instant list updates on payment

✅ **Always-Enabled Buttons**
- Payment buttons never disabled
- Users can mark any month as paid
- Works for past, present, and future months

---

## Troubleshooting

### Cron Job Not Running
- Check CRON_SECRET is set in environment
- Verify Authorization header in requests
- Check Vercel/external scheduler configuration

### Modal Not Opening
- Ensure Dialog component is installed
- Check open/onOpenChange props
- Verify component is wrapped in client boundary ("use client")

### Fees/Salaries Not Showing
- Confirm student_id/teacher_id is correct
- Check month and year parameters
- Verify API endpoint is accessible

### Payment Not Updating
- Check network tab for API errors
- Verify fee/salary record exists
- Confirm status field is 'paid' or 'unpaid'

---

## Files Created/Modified

### New Files
- ✅ `app/api/cron/monthly-billing/route.ts`
- ✅ `app/api/fees/monthly/route.ts`
- ✅ `app/api/salaries/monthly/route.ts`
- ✅ `components/modals/fee-payment-modal.tsx`
- ✅ `components/modals/salary-payment-modal.tsx`
- ✅ `components/modals/yearly-summary-modal.tsx`
- ✅ `components/student-fees-client.tsx`
- ✅ `components/teacher-salary-client.tsx`

### Modified Files
- ✅ `app/api/fees/route.ts` - Enhanced with better filtering
- ✅ `app/api/salaries/route.ts` - Enhanced with better filtering
- ✅ `app/admin/fees/page.tsx` - Complete redesign
- ✅ `app/admin/salaries/page.tsx` - Complete redesign
- ✅ `lib/utils.ts` - Added month/year utilities

---

## Next Steps

1. **Test Cron Job**
   ```bash
   curl -X POST http://localhost:3000/api/cron/monthly-billing \
     -H "Authorization: Bearer your-secret-key" \
     -H "Content-Type: application/json"
   ```

2. **Add Sample Data**
   - Create students and teachers in the system
   - Cron job will automatically create monthly entries

3. **Test Payments**
   - Navigate to Fees/Salaries page
   - Select student/teacher
   - Test recording payments

4. **Deploy Cron Job**
   - Set `CRON_SECRET` in production environment
   - Configure Vercel crons or external scheduler
   - Monitor first execution

---

## Support

For issues or questions:
- Check the API response for error details
- Review browser console for frontend errors
- Verify database records exist
- Check server logs for cron execution

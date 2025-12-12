# Monthly Fee & Salary Management System - Quick Setup Checklist

## Pre-Implementation Checklist

### Database Tables

- [x] `student_fees` table exists with schema:
  - student_id (FK), month, year, amount, status, paid_date, school_id
  - UNIQUE constraint on (student_id, month, year)
- [x] `teacher_salary` table exists with schema:
  - teacher_id (FK), month, year, amount, status, paid_date, school_id
  - UNIQUE constraint on (teacher_id, month, year)

### Environment Variables

- [ ] Set `CRON_SECRET` in `.env.local`:
  ```
  CRON_SECRET=your-unique-secret-key-min-20-chars
  ```
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set

---

## Implementation Summary

### 1. Core API Endpoints ✅

#### Cron Job

- **Endpoint:** `POST /api/cron/monthly-billing`
- **Schedule:** 1st of every month (0 0 1 \* \*)
- **Function:** Auto-creates monthly fee/salary entries
- **Security:** Requires CRON_SECRET authorization header

#### Student Fees API

- **GET /api/fees** - Fetch fees with filters
- **GET /api/fees/monthly** - Fetch specific month fee
- **PUT /api/fees** - Update fee status/payment
- **POST /api/fees** - Create/upsert fee

#### Teacher Salary API

- **GET /api/salaries** - Fetch salaries with filters
- **GET /api/salaries/monthly** - Fetch specific month salary
- **PUT /api/salaries** - Update salary status/payment
- **POST /api/salaries** - Create/upsert salary

### 2. Frontend Components ✅

#### Modals (Reusable)

- **FeePaymentModal** - Pay student fees with month selector
- **SalaryPaymentModal** - Pay teacher salary with month selector
- **YearlySummaryModal** - View all 12 months (fees or salary)

#### Client Components (Full Pages)

- **StudentFeesClient** - Complete student fee management UI
- **TeacherSalaryClient** - Complete teacher salary management UI

#### Admin Pages (Updated)

- **app/admin/fees/page.tsx** - Student fees management
- **app/admin/salaries/page.tsx** - Teacher salary management

### 3. Utilities & Types ✅

- **lib/utils.ts** - Month/year helpers and formatting
- **lib/types.ts** - StudentFees and TeacherSalary interfaces

---

## Post-Implementation Checklist

### 1. Verify Database

```sql
-- Check student_fees table
SELECT * FROM student_fees LIMIT 5;

-- Check teacher_salary table
SELECT * FROM teacher_salary LIMIT 5;

-- Verify unique constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name='student_fees' AND constraint_type='UNIQUE';
```

### 2. Test API Endpoints

#### Test Cron Job (Manual Trigger)

```bash
curl -X POST http://localhost:3000/api/cron/monthly-billing \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "message": "Successfully created monthly fees and salaries...",
#   "studentsProcessed": X,
#   "teachersProcessed": Y
# }
```

#### Test Fees API

```bash
# Get all fees for current month
curl http://localhost:3000/api/fees

# Get fees for specific student
curl "http://localhost:3000/api/fees?studentId=STUDENT_UUID"

# Get specific month fee
curl "http://localhost:3000/api/fees/monthly?studentId=STUDENT_UUID&month=12&year=2025"

# Update fee status
curl -X PUT http://localhost:3000/api/fees \
  -H "Content-Type: application/json" \
  -d '{
    "id": "FEE_UUID",
    "status": "paid",
    "paid_date": "2025-12-15T10:30:00Z"
  }'
```

#### Test Salaries API

```bash
# Get all salaries for current month
curl http://localhost:3000/api/salaries

# Get salaries for specific teacher
curl "http://localhost:3000/api/salaries?teacherId=TEACHER_UUID"

# Get specific month salary
curl "http://localhost:3000/api/salaries/monthly?teacherId=TEACHER_UUID&month=12&year=2025"

# Update salary status
curl -X PUT http://localhost:3000/api/salaries \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SALARY_UUID",
    "status": "paid",
    "paid_date": "2025-12-15T10:30:00Z"
  }'
```

### 3. Test UI Components

#### Test Admin Fees Page

1. Navigate to http://localhost:3000/admin/fees
2. Should see list of students
3. Click on a student
4. Should see fee status cards and table
5. Click "Record Payment" button
6. Modal should open with month/year selectors
7. Select a month and click "Mark as Paid"
8. Status should update to "Paid"
9. Click "View All Month Fees" to see yearly summary

#### Test Admin Salaries Page

1. Navigate to http://localhost:3000/admin/salaries
2. Should see list of teachers
3. Click on a teacher
4. Should see salary status cards and table
5. Click "Record Payment" button
6. Modal should open with month/year selectors
7. Select a month and click "Mark as Paid"
8. Status should update to "Paid"
9. Click "View All Month Salaries" to see yearly summary

### 4. Setup Automated Cron Job

#### Option A: Vercel (Recommended)

1. Update `vercel.json`:
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
2. Set `CRON_SECRET` in Vercel environment variables
3. Deploy to Vercel
4. Monitor cron executions in Vercel dashboard

#### Option B: External Scheduler (cron-job.org)

1. Visit https://cron-job.org
2. Create new job:
   - **Title:** Monthly Billing Cron
   - **URL:** `https://yourdomain.com/api/cron/monthly-billing`
   - **Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```
   - **Schedule:** "0 0 1 \* \*" (1st of month, 00:00 UTC)
3. Save and enable

#### Option C: Node-Cron (Development Only)

For local development testing:

```typescript
// In a separate script or middleware
import cron from "node-cron";

cron.schedule("0 0 1 * *", async () => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/cron/monthly-billing`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Cron executed:", await response.json());
  } catch (error) {
    console.error("Cron error:", error);
  }
});
```

### 5. Sample Data Creation

```sql
-- Create sample students (if needed)
INSERT INTO students (id, name, roll_number, class_id, school_id)
VALUES
  (gen_random_uuid(), 'John Doe', '001', 'CLASS_UUID', 'SCHOOL_UUID'),
  (gen_random_uuid(), 'Jane Smith', '002', 'CLASS_UUID', 'SCHOOL_UUID');

-- Create sample teachers (if needed)
INSERT INTO profiles (id, name, email, role, school_id)
VALUES
  (gen_random_uuid(), 'Mr. Ahmed', 'ahmed@school.com', 'teacher', 'SCHOOL_UUID'),
  (gen_random_uuid(), 'Ms. Fatima', 'fatima@school.com', 'teacher', 'SCHOOL_UUID');

-- Run cron job to auto-create monthly entries
-- (Or call /api/cron/monthly-billing endpoint)
```

### 6. Verify Data in Database

```sql
-- Check auto-created fees
SELECT COUNT(*) FROM student_fees WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

-- Check auto-created salaries
SELECT COUNT(*) FROM teacher_salary WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

-- Check paid entries
SELECT * FROM student_fees WHERE status = 'paid' LIMIT 5;
```

---

## Features Verification

### ✅ Cron Job Features

- [x] Runs on 1st of every month
- [x] Creates entries for all students
- [x] Creates entries for all teachers
- [x] Preserves previous months
- [x] Sets default status to 'unpaid'
- [x] Sets paid_date to null initially

### ✅ Student Fee Features

- [x] Modal with month/year dropdown
- [x] Shows paid/unpaid status with badges
- [x] Button always enabled (not disabled)
- [x] Only current month payment date shown
- [x] Previous months data preserved
- [x] Auto-selects current month if all previous paid
- [x] Yearly summary shows all 12 months
- [x] Works for multiple students dynamically

### ✅ Teacher Salary Features

- [x] Modal with month/year dropdown
- [x] Shows paid/unpaid status with badges
- [x] Button always enabled (not disabled)
- [x] Only current month payment date shown
- [x] Previous months data preserved
- [x] Auto-selects current month if all previous paid
- [x] Yearly summary shows all 12 months
- [x] Works for multiple teachers dynamically

### ✅ Admin Pages

- [x] Fees page with student selector
- [x] Salaries page with teacher selector
- [x] Real-time status updates
- [x] Statistics cards
- [x] Monthly tables
- [x] Error handling
- [x] Loading states

---

## Troubleshooting

### Issue: Cron job not running

**Solution:**

1. Verify `CRON_SECRET` is set in environment
2. Check authorization header in request
3. Monitor cron logs in Vercel dashboard
4. Test manually with curl command above
5. Check API endpoint responds without errors

### Issue: Modal not opening

**Solution:**

1. Ensure Dialog component from radix-ui is installed
2. Verify component is marked with "use client"
3. Check browser console for errors
4. Verify open/onOpenChange props are passed correctly

### Issue: Payment not updating

**Solution:**

1. Check network tab in browser dev tools
2. Verify API response for errors
3. Ensure fee/salary record exists first
4. Confirm status field accepts 'paid' and 'unpaid'
5. Check database for updates

### Issue: Students/Teachers not loading

**Solution:**

1. Verify /api/students endpoint exists
2. Verify /api/teachers endpoint exists
3. Check that data exists in database
4. Monitor browser network tab for API errors
5. Check server logs for database errors

---

## Performance Optimization Tips

1. **Index Creation:** Ensure these indexes exist:

   ```sql
   CREATE INDEX idx_student_fees_student_month_year
     ON student_fees(student_id, month, year);

   CREATE INDEX idx_teacher_salary_teacher_month_year
     ON teacher_salary(teacher_id, month, year);
   ```

2. **Query Optimization:** APIs already optimized:
   - Filters applied at database level
   - Proper joins on related tables
   - Sorting by month for consistent results

3. **Component Performance:**
   - StudentFeesClient and TeacherSalaryClient use React.useState
   - Modals are lazy-loaded on demand
   - Tables virtualized for large datasets

4. **Caching:** Consider adding caching for:
   - List of students/teachers
   - Yearly summary data
   - Current month statistics

---

## Security Checklist

- [x] CRON_SECRET protects cron endpoint
- [x] Row-level security on student_fees and teacher_salary
- [x] Proper authorization headers required
- [x] Input validation on all API endpoints
- [x] SQL injection prevention (using parameterized queries)
- [x] XSS prevention in React components

---

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] Cron job scheduled in production
- [ ] Test API endpoints in production
- [ ] Test UI in production environment
- [ ] Check error logging is working
- [ ] Monitor first month's cron execution
- [ ] Have backup and restore plan ready

---

## Success Indicators

✅ System is working correctly when:

- Cron job creates fees/salaries on 1st of month
- Students can see their fee status in admin panel
- Teachers can see their salary status in admin panel
- Payments can be recorded and updated in real-time
- Yearly summaries show correct paid/unpaid counts
- Previous months' data is preserved
- Payment dates only show for current month
- All UI components load without errors

---

## Support & Documentation

- **Full Guide:** See `FEE_AND_SALARY_SYSTEM_GUIDE.md`
- **API Docs:** Check inline comments in API route files
- **Component Docs:** Check prop interfaces in component files
- **Utility Docs:** Check `lib/utils.ts` for helper functions

---

## Completed Implementation

All files have been created and integrated:

- ✅ 8 new component files
- ✅ 3 new API endpoints
- ✅ 2 updated admin pages
- ✅ Enhanced utility functions
- ✅ Comprehensive documentation

Ready for testing and deployment!

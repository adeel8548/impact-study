# Study Schedule System - Setup & Usage Guide

## Overview

Complete dynamic study schedule system where:
- **Admins** can create subjects, chapters, and series
- **Teachers** can be assigned to specific schedules
- **Teachers** can view their assigned study schedules in a book-style format
- Everything is integrated with the API

## Features

### Admin Panel (`/admin/study-schedule`)
- ✅ Create study schedule entries
- ✅ Auto-incrementing day numbers
- ✅ Series name (e.g., "Class 9 - First Term")
- ✅ Subject dropdown (8 pre-built subjects)
- ✅ Chapter name input
- ✅ Optional description
- ✅ Teacher assignment from dropdown
- ✅ Status tracking (Pending/In Progress/Completed)
- ✅ Export to CSV for Excel/Notion/ClickUp
- ✅ Delete entries
- ✅ Live statistics dashboard

### Teacher View (`/teacher/study-schedule`)
- 📖 Book-style schedule display
- 🏷️ Series selector when multiple series assigned
- 📊 Stats: Total chapters, Completed, In Progress, Pending
- 🎯 Color-coded status (Green=Done, Yellow=In Progress, Red=Pending)
- 📝 Shows description and subject details
- 🔒 Only shows schedules assigned to that teacher

## Setup Instructions

### 1. Create Database Table

Run the migration file in Supabase:

```bash
# Navigate to Supabase dashboard
# Go to SQL Editor
# Run the SQL from: supabase/migrations/create_study_schedule_table.sql
```

OR using Supabase CLI:

```bash
supabase db push
```

### 2. API Endpoints

The system uses these endpoints:

#### GET `/api/study-schedule`
Fetch all study schedule entries
```javascript
const res = await fetch("/api/study-schedule");
const { data } = await res.json();
```

#### POST `/api/study-schedule`
Create new entry
```javascript
const res = await fetch("/api/study-schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    day: 1,
    subject: "Mathematics",
    chapter: "Algebra Basics",
    description: "Introduction to algebra",
    status: "Pending",
    teacher_id: "uuid-of-teacher",
    series_name: "Class 9 - First Term"
  })
});
```

#### PUT `/api/study-schedule`
Update entry
```javascript
const res = await fetch("/api/study-schedule", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "entry-id",
    status: "In Progress",
    teacher_id: "new-teacher-id"
  })
});
```

#### DELETE `/api/study-schedule?id=entry-id`
Delete entry
```javascript
const res = await fetch("/api/study-schedule?id=entry-id", {
  method: "DELETE"
});
```

## Usage

### For Admins

1. **Navigate to** `/admin/study-schedule`
2. **Fill in the form:**
   - Series Name: e.g., "Class 9 - First Term"
   - Subject: Select from dropdown
   - Chapter: e.g., "Algebra Basics"
   - Description: Optional notes
   - Teacher: Assign from dropdown (optional)
3. **Click "Add Entry"** → Auto-increments day
4. **Manage entries:**
   - Change status via dropdown
   - Reassign teacher
   - Delete with trash icon
5. **Export:** Click "Export CSV" for Excel/Notion

### For Teachers

1. **Navigate to** `/teacher/study-schedule`
2. **View schedule:**
   - If multiple series: Select series from tabs
   - See all chapters with descriptions
   - View day numbers and subjects
3. **Track progress:**
   - Read chapter descriptions
   - See current status (Pending/In Progress/Completed)
   - Follow daily schedule

## Database Schema

```sql
study_schedule {
  id: UUID (Primary Key)
  day: INTEGER (Auto-incrementing)
  subject: TEXT (e.g., "Mathematics")
  chapter: TEXT (e.g., "Algebra Basics")
  description: TEXT (Optional)
  status: TEXT ('Pending', 'In Progress', 'Completed')
  teacher_id: UUID (References auth.users)
  series_name: TEXT (e.g., "Class 9 - First Term")
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Pre-built Subjects

The system includes these subjects:
- Mathematics
- English
- Physics
- Chemistry
- Biology
- History
- Geography
- Computer Science

Add more by editing `SUBJECTS` array in the admin page.

## Sample Data

5 dummy entries included for demonstration:
- Day 1: Math - Algebra Basics (Completed)
- Day 2: English - Grammar/Tenses (In Progress)
- Day 3: Physics - Motion and Forces (Pending)
- Day 4: Chemistry - Atomic Structure (Pending)
- Day 5: Math - Trigonometry (Pending)

All using "Class 9 - First Term" series.

## Security

✅ RLS (Row Level Security) enabled:
- Admins: Full access (SELECT, INSERT, UPDATE, DELETE)
- Teachers: Can only see entries assigned to them
- Public: No access

## Export Format (CSV)

Headers:
```
Day | Series | Subject | Chapter | Description | Status | Teacher
```

Compatible with:
- ✅ Excel
- ✅ Google Sheets
- ✅ Notion
- ✅ ClickUp

## Troubleshooting

**Q: Teachers can't see their schedule**
A: Make sure `teacher_id` is set correctly when creating entry. It should match teacher's UUID from `auth.users`.

**Q: Export doesn't include Series name**
A: Make sure you're using the latest version with `series_name` field.

**Q: Table not found error**
A: Run the migration SQL file in Supabase dashboard or use `supabase db push`.

## Future Enhancements

- [ ] Bulk upload from CSV
- [ ] Email notifications for teachers
- [ ] Progress tracking with timestamps
- [ ] Notes/comments on entries
- [ ] Print-friendly schedule view
- [ ] Mobile-optimized view
- [ ] Recurring schedules
- [ ] Calendar view integration

## File Locations

- Admin Page: `app/admin/study-schedule/page.tsx`
- Teacher Page: `app/teacher/study-schedule/page.tsx`
- API Route: `app/api/study-schedule/route.ts`
- Migration: `supabase/migrations/create_study_schedule_table.sql`

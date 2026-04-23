# Study Schedule - Quick Reference

## 🚀 Quick Start

### Admin
1. Go to `/admin/study-schedule`
2. Fill: Series Name → Subject → Chapter → Teacher (optional)
3. Click "Add Entry"
4. Manage & Export

### Teacher  
1. Go to `/teacher/study-schedule`
2. View assigned schedule
3. See book-style chapters with descriptions

---

## 📚 Column Explanation

| Column | What It Is | Example |
|--------|-----------|---------|
| Day | Auto-increment (1, 2, 3...) | Day 5 |
| Series | Study plan name | "Class 9 - First Term" |
| Subject | Topic area | "Mathematics" |
| Chapter | Specific lesson | "Algebra Basics" |
| Description | Optional notes | "Learn basic equations" |
| Teacher | Assigned instructor | "Mr. Ahmed" |
| Status | Progress state | Pending/In Progress/Completed |

---

## 🎯 Statuses

- 🔴 **Pending** - Not started
- 🟡 **In Progress** - Currently studying
- 🟢 **Completed** - Finished

---

## ✨ Key Features

✅ **Auto-increment Days** - Numbers increase automatically  
✅ **Teacher Dropdown** - Select from all teachers  
✅ **Series Management** - Group chapters by semester/term  
✅ **CSV Export** - Download for Excel/Notion  
✅ **Book View** - Teachers see like a textbook  
✅ **Color Coded** - Status visible at a glance  

---

## 🔧 Admin Actions

| Action | How |
|--------|-----|
| Add Entry | Fill form + click "Add Entry" |
| Change Status | Click status dropdown on row |
| Assign Teacher | Click teacher dropdown on row |
| Delete Entry | Click trash icon |
| Export All | Click "Export CSV" button |

---

## 📋 Sample Workflow

### Day 1: Setup
1. Admin creates "Class 9 - First Term" series
2. Adds chapters: Math, English, Physics, etc.
3. Assigns teachers

### Day 2: Teachers View
1. Teachers see schedule at `/teacher/study-schedule`
2. Follow chapters in order
3. Track progress

### Day 3: Monitor
1. Admin checks stats dashboard
2. Updates status as needed
3. Exports for records

---

## 🔌 API Routes

```
GET  /api/study-schedule          → Fetch all entries
POST /api/study-schedule          → Create entry
PUT  /api/study-schedule          → Update entry
DELETE /api/study-schedule?id=xxx → Delete entry
```

---

## 📂 Files

- Admin: `app/admin/study-schedule/page.tsx`
- Teacher: `app/teacher/study-schedule/page.tsx`
- API: `app/api/study-schedule/route.ts`
- DB: `supabase/migrations/create_study_schedule_table.sql`

---

## ⚠️ Important Notes

- Series name is **required**
- Teachers can only see **their assigned** schedules
- Days auto-increment based on total entries
- Status changes are instant
- CSV includes all data including series name

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Table not found | Run migration SQL |
| Teachers see nothing | Check teacher_id is set |
| Export missing data | Refresh page, try again |
| Dropdown empty | Teachers not created yet |

---

## 📞 Support

See full guide: `STUDY_SCHEDULE_SETUP.md`

# Exam Management System - Quick Start Guide

## 🚀 Getting Started

### Step 1: Run Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/008_exam_management.sql`
3. Run the SQL script
4. Verify tables were created: `exam_chapters` and `exam_results`

### Step 2: Verify Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Start the Application

```bash
npm run dev
```

### Step 4: Access the Page

```
http://localhost:3000/teacher/exam-management
```

---

## 📋 Quick Feature Reference

### Create Series Exam

1. Go to **Exams** tab
2. Fill: Exam Name, Start Date, End Date
3. Click **Create Exam**

### Create Chapter

1. Go to **Chapters** tab
2. Click **Create Chapter**
3. Fill: Chapter Name, Date, Max Marks
4. Click **Create**

### Enter Student Marks

1. Go to **Results** tab
2. Select Chapter from dropdown
3. Enter marks in table cells
4. Auto-saves when you click away

### Delete Result

1. Click the **trash icon** in Results table
2. Confirm deletion

### Delete Chapter

1. In **Chapters** tab, click **trash icon**
2. Confirm deletion

---

## 🎯 Typical Teacher Workflow

```
Login
  ↓
Select Class (dropdown)
  ↓
View Subjects (auto-filtered)
  ↓
Select or Create Series Exam
  ↓
Create Chapters (with dates & marks)
  ↓
Select Chapter
  ↓
Enter Marks (auto-saves)
  ↓
Done!
```

---

## 📊 Data Structure at a Glance

```
Series Exam (name, dates)
    ├── Chapter 1 (date, max_marks)
    │   ├── Student A → 85 marks
    │   ├── Student B → 92 marks
    │   └── Student C → 78 marks
    │
    └── Chapter 2 (date, max_marks)
        ├── Student A → 88 marks
        ├── Student B → 90 marks
        └── Student C → 81 marks
```

---

## 🔧 API Quick Reference

### Create Chapter

```javascript
POST /api/chapters
Body: {
  exam_id: "uuid",
  subject_id: "uuid",
  chapter_name: "Quadratic Equations",
  chapter_date: "2025-12-15",
  max_marks: 50
}
```

### Save Marks (Auto-Upsert)

```javascript
POST /api/exam-results
Body: {
  student_id: "uuid",
  chapter_id: "uuid",
  class_id: "uuid",
  marks: 42.5
}
```

### Get Results

```javascript
GET /api/exam-results?chapterId=uuid
```

### Delete Result

```javascript
DELETE /api/exam-results?id=uuid
```

---

## 💡 Tips & Tricks

✅ **Auto-save**: Just click away from marks field, saves automatically  
✅ **Tab navigation**: Use tabs to switch between Results, Chapters, Exams  
✅ **Edit chapter**: Click the edit icon to select chapter for results entry  
✅ **Delete confirmation**: All deletes require confirmation  
✅ **Error messages**: Check toasts (notifications) at top for feedback

---

## ⚠️ Common Issues & Solutions

### "Select a chapter" message appears

**Solution:** Click on a chapter in the Chapters tab first

### Marks not saving

**Solution:**

- Make sure chapter is selected
- Verify student exists in class
- Check marks are valid numbers

### No chapters showing

**Solution:**

- Create an exam first
- Make sure subject is selected
- Verify exam has chapters

### Can't access page

**Solution:**

- Verify you're logged in as teacher
- Check teacher is assigned to class
- Clear browser cache

---

## 📱 Responsive Features

✅ Mobile-friendly layout  
✅ Touch-friendly buttons  
✅ Scrollable tables on small screens  
✅ Adaptive column layouts  
✅ Works on all devices

---

## 🔐 Security

✅ Teacher authentication required  
✅ Database RLS policies enabled  
✅ Cascade deletion for data integrity  
✅ Input validation on all forms

---

## 📁 Files Created/Modified

### New Files

```
✨ app/teacher/exam-management/page.tsx
✨ app/api/chapters/route.ts
✨ app/api/exam-results/route.ts
✨ app/api/classes/[id]/subjects/route.ts
✨ scripts/008_exam_management.sql
```

### Modified Files

```
📝 lib/types.ts (added ExamChapter, ExamResult types)
```

### Documentation

```
📚 EXAM_MANAGEMENT_COMPLETE.md (full documentation)
📚 EXAM_MANAGEMENT_QUICK_START.md (this file)
```

---

## 🎓 Learning Resources

### Understanding the Code Flow

1. Read **page.tsx** comments for step-by-step flow
2. Each function is documented with purpose
3. State management clearly organized
4. Effects show data loading sequence

### API Documentation

See **EXAM_MANAGEMENT_COMPLETE.md** for:

- Full endpoint specifications
- Request/response formats
- Parameter descriptions
- Example calls

---

## 🚨 Debugging Tips

### Check Console

Open browser DevTools (F12) → Console for error messages

### Check Network Tab

See actual API requests and responses

### Check Supabase Logs

Supabase Dashboard → Logs to see database errors

### Enable Debug Logging

Results show detailed error information in toasts

---

## 📞 Support Resources

1. **Full Documentation**: EXAM_MANAGEMENT_COMPLETE.md
2. **Setup Guide**: EXAM_MANAGEMENT_SETUP.md (removed, use COMPLETE instead)
3. **Code Comments**: Read inline comments in page.tsx
4. **TypeScript Types**: Check lib/types.ts for interfaces

---

## ✅ Verification Checklist

- [ ] Database migration ran successfully
- [ ] Environment variables are set
- [ ] Page loads without errors
- [ ] Can create exam
- [ ] Can create chapter
- [ ] Can enter marks
- [ ] Can delete results
- [ ] Responsive on mobile

---

## 🎉 You're Ready!

Your exam management system is now set up and ready to use. Teachers can:

- Create exams and chapters
- Enter and manage student marks
- Get automatic saves
- Enjoy a responsive, professional UI

**Happy teaching!** 📚

---

**Created:** December 8, 2025  
**Version:** 1.0.0

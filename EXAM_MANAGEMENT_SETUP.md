# Series Exam Management System - Setup Guide

## Overview
A comprehensive exam management system that allows teachers to:
- Create series exams with multiple chapters
- Assign chapters to subjects with dates and maximum marks
- Enter and manage student results for each chapter
- Edit and delete results
- View results in an organized table format

## File Structure

```
/app
  /api
    /chapters
      route.ts                          # Chapter CRUD endpoints
    /exam-results
      route.ts                          # Results CRUD endpoints
    /series-exams
      route.ts                          # Exam management (existing)
    /classes
      /[id]
        /subjects
          route.ts                      # Get subjects for a class
  /teacher
    /exam-management
      page.tsx                          # Main exam management page

/scripts
  008_exam_management.sql              # Database migrations

/lib
  types.ts                             # Updated with exam types
```

## Database Schema

### exam_chapters Table
Stores chapters within series exams:
- `id` (UUID, Primary Key)
- `exam_id` (Foreign Key → series_exams)
- `subject_id` (Foreign Key → subjects)
- `chapter_name` (Text)
- `chapter_date` (Date)
- `max_marks` (Decimal)
- `created_at`, `updated_at` (Timestamps)

### exam_results Table
Stores student marks for chapters:
- `id` (UUID, Primary Key)
- `student_id` (Foreign Key → students)
- `chapter_id` (Foreign Key → exam_chapters)
- `class_id` (Foreign Key → classes)
- `marks` (Decimal, nullable)
- `created_at`, `updated_at` (Timestamps)
- Unique constraint on (student_id, chapter_id, class_id)

## Setup Instructions

### 1. Run Database Migrations

Execute the SQL migration file in your Supabase dashboard:

```bash
# File: scripts/008_exam_management.sql
```

This creates:
- `exam_chapters` table with indexes
- `exam_results` table with indexes
- RLS policies for authenticated access

### 2. Configure Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Features Implemented

#### Dashboard & Selection
- **Class Dropdown**: Filter by assigned class
- **Subject Dropdown**: Auto-filtered by selected class
- **Exam Dropdown**: View available series exams
- **Chapter Dropdown**: Filter chapters by exam and subject

#### Results Management
- **Marks Entry Table**: 
  - Shows all students in the class
  - Editable marks input for each student
  - Auto-saves on blur
  - Shows max marks and total
  - Delete individual results

#### Chapter Management
- **Create Chapters**:
  - Chapter name input
  - Chapter date picker
  - Max marks field
  - Auto-linked to selected exam and subject
  
- **View Chapters**:
  - List all chapters for selected subject
  - Shows date and max marks
  - Edit (select) and delete options

#### Exam Management
- **Create Exams**:
  - Exam name input
  - Start and end date pickers
  - Auto-linked to class and teacher
  
- **View Exams**:
  - List all exams for the class
  - Click to select exam

## API Endpoints

### Chapters
```
GET    /api/chapters?examId=<id>&subjectId=<id>
POST   /api/chapters
PUT    /api/chapters
DELETE /api/chapters?id=<id>
```

### Exam Results
```
GET    /api/exam-results?chapterId=<id>&classId=<id>
POST   /api/exam-results
DELETE /api/exam-results?id=<id>
```

### Subjects
```
GET    /api/classes/[id]/subjects
POST   /api/classes/[id]/subjects
```

## Usage Flow

1. **Teacher Login**: Access `/teacher/exam-management`

2. **Select Class**: Choose class from dropdown

3. **Create Exam** (if needed):
   - Go to "Exams" tab
   - Fill exam details
   - Click "Create Exam"

4. **Create Chapters**:
   - Go to "Chapters" tab
   - Select subject and exam
   - Fill chapter details
   - Click "Create Chapter"

5. **Enter Results**:
   - Go to "Results" tab
   - Select chapter
   - Enter marks for each student
   - Auto-saves on blur
   - Can delete individual results

## Key Features

### Loading States
- Spinner shown while fetching data
- Disable buttons during saves
- Toast notifications for success/error

### Responsive Design
- Mobile-friendly layout
- Grid adjusts from 1 to 4 columns
- Table scrolls horizontally on mobile
- Touch-friendly buttons

### Data Validation
- Required field checks
- Numeric validation for marks
- Max marks constraint
- Confirmation dialogs for deletions

### Error Handling
- Try-catch blocks for all API calls
- User-friendly error messages
- Toast notifications
- Console logging for debugging

## Component Structure

```
Page (Exam Management)
├── State Management
│   ├── User & Auth
│   ├── Selections (Class, Subject, Exam, Chapter)
│   ├── Data (Exams, Chapters, Results, Students)
│   └── Forms (Create Exam, Create Chapter, Editing)
├── Effects
│   ├── Load classes on mount
│   ├── Load data on selection changes
│   └── Load results on chapter change
└── Render
    ├── Header
    ├── Selection Controls (4-column grid)
    └── Tabs
        ├── Results Tab
        ├── Chapters Tab
        └── Exams Tab
```

## Types (TypeScript)

```typescript
interface ExamChapter {
  id: string;
  exam_id: string;
  subject_id: string;
  chapter_name: string;
  chapter_date: string;
  max_marks: number;
  created_at?: string;
  updated_at?: string;
}

interface ExamResult {
  id: string;
  student_id: string;
  chapter_id: string;
  class_id: string;
  marks: number | null;
  student?: { id: string; name: string };
  chapter?: { id: string; chapter_name: string; max_marks: number };
  created_at?: string;
  updated_at?: string;
}
```

## Code Organization

Each section is clearly commented:
- **State Management**: All useState declarations
- **Initialization**: useEffect for auth and initial loads
- **Data Loading**: Functions to fetch data from APIs
- **Exam Creation**: Functions for creating exams
- **Chapter Management**: Create, delete chapters
- **Results Management**: Save, delete results
- **Render**: UI components and layout

## Security

- ✅ User authentication check (must be teacher)
- ✅ Row-level security in database
- ✅ Teacher can only access their own data
- ✅ Authenticated access only

## Performance

- ✅ Efficient queries with indexes
- ✅ Lazy loading data on selection
- ✅ Memoized calculations
- ✅ Optimized re-renders

## Browser Support

- Chrome, Firefox, Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design works on all screen sizes

## Troubleshooting

### Data not loading
- Check Supabase connection
- Verify RLS policies are enabled
- Check browser console for errors

### Marks not saving
- Verify student exists in class
- Check that chapter is selected
- Ensure marks are valid numbers

### Chapters not appearing
- Select an exam first
- Verify chapters exist in database
- Check that exam has chapters for selected subject

## Future Enhancements

- [ ] Bulk upload marks via CSV
- [ ] Generate result reports
- [ ] Attendance-based marks calculation
- [ ] Grade assignment based on marks
- [ ] Parent notifications
- [ ] Analytics dashboard
- [ ] Export to PDF

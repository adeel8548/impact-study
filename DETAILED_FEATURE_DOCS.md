# Detailed Feature Documentation - Attendance Management

## Feature 1: Teacher's Own Attendance View Modal

### Component Location

`components/modals/teacher-own-attendance-view-modal.tsx`

### Integration Point

`app/teacher/my-attendance/page.tsx` - "View Records" button

### Description

Provides teachers with a comprehensive read-only view of their attendance history with month-by-month navigation and date range filtering.

### UI/UX Elements

#### Header

- Title: "My Attendance Records"
- Location: Modal header

#### Statistics Cards

- **Present**: Shows count of present days in selected month
- **Absent**: Shows count of absent days in selected month
- Color-coded: Green for present, Red for absent
- Location: Top of modal

#### Month Navigation

- Previous button (left arrow)
- Month/Year display (e.g., "December 2024")
- Next button (right arrow)
- Purpose: Navigate between months

#### Date Range Filter

- Dropdown menu with 7 options:
  - Last 7 days
  - Last 15 days
  - Last month
  - Current month
  - Last 3 months
  - Last 6 months
  - Last year
- "Load" button to fetch data for selected range
- Loading state with spinner

#### Legend

- Green square: Present
- Red square: Absent
- Gray square: Off/No Record

#### Calendar Grid

- 7-column layout (Sun-Sat)
- Day headers showing day names
- Each day is a card showing:
  - Day number (1-31)
  - Status symbol (✓ for present, ✗ for absent, — for off/no record)
  - If present: "In: HH:MM AM/PM" and "Out: HH:MM AM/PM"
- Color-coded backgrounds based on status
- Minimum height for time display

### Data Flow

```
User clicks "View Records"
         ↓
Modal opens, initial fetch triggered
         ↓
GET /api/teacher-attendance?teacherId={id}&month=YYYY-MM
         ↓
Component normalizes dates to YYYY-MM-DD format
         ↓
Calendar renders with attendance data
         ↓
User can:
├─ Click prev/next to change month (refetches data)
├─ Select date range in dropdown
└─ Click "Load" to fetch that range (refetches data)
```

### API Usage

```
GET /api/teacher-attendance?teacherId={teacherId}&month={YYYY-MM}
GET /api/teacher-attendance?teacherId={teacherId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

### Props

```tsx
interface TeacherOwnAttendanceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
}
```

### State Management

- `isLoading`: Initial load state
- `currentDate`: Current month being viewed
- `attendance`: Array of attendance records
- `rangeOption`: Selected date range filter
- `isFetching`: Loading state for range fetch

### Features

✅ Month navigation with automatic data refresh
✅ Multiple date range filters (7 options)
✅ Calendar grid layout (7 columns)
✅ Responsive design (scrollable on small screens)
✅ Time display (In Time and Out Time)
✅ Statistics (Present/Absent counts)
✅ Dark mode support
✅ Error handling with toasts
✅ Loading states

### Styling

- Uses ShadcN UI Dialog component
- Tailwind CSS for styling
- Responsive grid layout
- Dark mode classes (dark:bg-gray-700, dark:text-gray-300, etc.)
- Color coding: Green (#22c55e), Red (#ef4444), Gray (#a1a1a1)

---

## Feature 2: Admin Attendance Marking Modal

### Component Location

`components/modals/admin-attendance-marking-modal.tsx`

### Integration Points

1. `app/admin/attendance/page.tsx` - Students section
2. `app/admin/attendance/page.tsx` - Teachers section

### Description

Allows administrators to mark attendance for any person (teacher or student) for any date in the past or future. Not restricted to the current day.

### UI/UX Elements

#### Modal Header

- Title: "Mark Attendance"
- Description: "For {Type}: {Name}"
  - Example: "For Teacher: John Smith"

#### Date Picker

- HTML date input field
- Can select any date (past, present, future)
- Defaults to today's date
- Icon: Calendar icon beside input

#### Status Selection

- Three radio button options:
  1. Present (Green dot)
  2. Absent (Red dot)
  3. Leave (Gray dot)
- Each option on its own card/row
- Hover effect for better UX
- Defaults to "Present"

#### Summary Card

- Blue background (light mode) / Dark blue (dark mode)
- Shows what will be marked:
  - "Summary: Mark {Name} as {Status} on {FormattedDate}"
  - Example: "Summary: Mark John Smith as Absent on Wednesday, December 18, 2024"
- Helps confirm action before saving

#### Action Buttons

- Cancel button (outline style)
- Mark Attendance button (primary style)
- Disabled state during saving
- Loading state with spinner and "Marking..." text

### Data Flow

```
Admin clicks "Mark Any Date" on student/teacher
         ↓
Modal opens with:
├─ Type: "teacher" or "student"
├─ Target ID: teacher_id or student_id
└─ Target Name: Person's name
         ↓
Admin:
├─ Picks date from calendar
├─ Selects status (Present/Absent/Leave)
└─ Reviews summary
         ↓
Admin clicks "Mark Attendance"
         ↓
POST to appropriate endpoint:
├─ /api/teacher-attendance (for teachers)
└─ /api/attendance (for students)
         ↓
Success response received
         ↓
Toast: "Success: {Name}'s attendance marked as {Status} for {Date}"
         ↓
Callback onMarked() triggered
         ↓
Admin page attendance data refreshes
         ↓
Modal closes
```

### API Usage

For Teachers:

```
POST /api/teacher-attendance
Body: {
  teacher_id: string,
  date: "YYYY-MM-DD",
  status: "present" | "absent" | "leave",
  school_id: string
}
```

For Students:

```
POST /api/attendance
Body: {
  records: [{
    student_id: string,
    date: "YYYY-MM-DD",
    status: "present" | "absent" | "leave",
    school_id: string
  }]
}
```

### Props

```tsx
interface AdminAttendanceMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "teacher" | "student";
  targetId: string;
  targetName: string;
  onMarked?: (date: string, status: "present" | "absent" | "leave") => void;
}
```

### State Management

- `isSaving`: Tracks API request state
- `selectedDate`: Selected date in YYYY-MM-DD format
- `selectedStatus`: Selected attendance status

### Features

✅ Date picker (any date, not restricted)
✅ Status selection (Present/Absent/Leave)
✅ Works for both teachers and students
✅ Summary review before marking
✅ Error handling with detailed messages
✅ Loading states with spinner
✅ Auto-close on success
✅ Toast notifications
✅ Callback for parent to refresh data
✅ Responsive design
✅ Dark mode support

### Styling

- Uses ShadcN UI Dialog component
- Tailwind CSS styling
- Color-coded status options
- Blue summary card (#eff6ff background)
- Responsive buttons with hover states

### Error Handling

- Validates date and status selection
- Shows error toast if API fails
- Includes error details from API response
- Graceful handling of network errors

---

## Feature 3: "View Records" Button on Teacher My-Attendance Page

### Location

`app/teacher/my-attendance/page.tsx`

### Button Placement

Top right of page, next to the page title

### Button Styling

- Blue primary background
- White text
- Calendar icon on left
- Hover effect (darker blue)
- Responsive (stacks on mobile)

### Implementation Details

```tsx
<button
  onClick={() => setViewModalOpen(true)}
  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
>
  <Calendar className="w-4 h-4" />
  View Records
</button>
```

### Functionality

- Clicking opens `TeacherOwnAttendanceViewModal`
- Modal receives current teacher's ID and name
- Modal persists on same page (doesn't navigate)

### State Added

```tsx
const [viewModalOpen, setViewModalOpen] = useState(false);
```

### Imports Added

```tsx
import { TeacherOwnAttendanceViewModal } from "@/components/modals/teacher-own-attendance-view-modal";
import { Calendar } from "lucide-react";
```

---

## Feature 4: "Mark Any Date" Buttons on Admin Attendance Page

### Locations

#### Student Section

- Appears next to each student name (right side)
- Within the student's attendance card
- One button per student

#### Teacher Section

- Appears next to each teacher name (right side)
- Within the teacher's attendance card
- One button per teacher

### Button Styling

- Blue primary background
- White text
- Small size (consistent with interface)
- Hover effect (darker blue)
- `whitespace-nowrap` to prevent wrapping

### Implementation Details

```tsx
<button
  onClick={() => openMarkingModal("student", student.id, student.name)}
  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
>
  Mark Any Date
</button>
```

### Functionality

Clicking button for a student:

1. Opens `AdminAttendanceMarkingModal`
2. Sets type to "student"
3. Sets targetId to student.id
4. Sets targetName to student.name

Clicking button for a teacher:

1. Opens `AdminAttendanceMarkingModal`
2. Sets type to "teacher"
3. Sets targetId to teacher.id
4. Sets targetName to teacher.name

### Helper Functions

```tsx
const openMarkingModal = (
  type: "teacher" | "student",
  id: string,
  name: string,
) => {
  setMarkingType(type);
  setMarkingTargetId(id);
  setMarkingTargetName(name);
  setMarkingModalOpen(true);
};

const handleMarked = (date: string, status: "present" | "absent" | "leave") => {
  // Refresh attendance after marking
  if (markingType === "teacher") {
    fetchTeacherAttendance(teacherRange);
  } else {
    fetchStudentAttendance(studentRange);
  }
};
```

### State Added

```tsx
const [markingModalOpen, setMarkingModalOpen] = useState(false);
const [markingType, setMarkingType] = useState<"teacher" | "student">(
  "teacher",
);
const [markingTargetId, setMarkingTargetId] = useState("");
const [markingTargetName, setMarkingTargetName] = useState("");
```

### Modal Integration

```tsx
<AdminAttendanceMarkingModal
  open={markingModalOpen}
  onOpenChange={setMarkingModalOpen}
  type={markingType}
  targetId={markingTargetId}
  targetName={markingTargetName}
  onMarked={handleMarked}
/>
```

---

## Overall Architecture

### Component Hierarchy

```
AdminAttendancePage (/admin/attendance)
├── Students Tab
│   ├── Class Selection
│   ├── Student List
│   │   ├── Student Card
│   │   │   ├── Student Info
│   │   │   └── [Mark Any Date Button]
│   │   └── AttendanceGrid
│   └── AdminAttendanceMarkingModal (modal)
│
├── Teachers Tab
│   ├── Teacher List
│   │   ├── Teacher Card
│   │   │   ├── Teacher Info
│   │   │   └── [Mark Any Date Button]
│   │   └── AttendanceGrid
│   └── AdminAttendanceMarkingModal (modal)
│
└── AdminAttendanceMarkingModal
    ├── Date Picker
    ├── Status Radio Buttons
    ├── Summary Card
    └── Action Buttons

TeacherMyAttendancePage (/teacher/my-attendance)
├── Page Header
│   ├── Title & Description
│   └── [View Records Button]
├── Statistics Cards
├── Calendar Grid
├── Calendar Navigation
├── Instructions
│
└── TeacherOwnAttendanceViewModal (modal)
    ├── Statistics Cards
    ├── Month Navigation
    ├── Date Range Filter
    ├── Legend
    └── Calendar Grid
```

### Data Flow Architecture

```
Admin Page
│
├─ fetchStudentAttendance(range)
│  └─ GET /api/attendance
│     └─ Returns: student_attendance[] for class
│
├─ fetchTeacherAttendance(range)
│  └─ GET /api/teacher-attendance
│     └─ Returns: teacher_attendance[] for range
│
├─ handleStudentAttendanceChange()
│  └─ POST /api/attendance (or PUT for update)
│
├─ handleTeacherAttendanceChange()
│  └─ POST /api/teacher-attendance (or PUT for update)
│
└─ AdminAttendanceMarkingModal
   └─ onClick "Mark Attendance"
      ├─ POST /api/attendance (students)
      └─ POST /api/teacher-attendance (teachers)
         ├─ onMarked callback triggers
         └─ handleMarked() refreshes data

Teacher Page
│
├─ fetchAttendance(month)
│  └─ GET /api/teacher-attendance?teacherId={id}&month={YYYY-MM}
│     └─ Returns: teacher_attendance[] for month
│
├─ handleAttendanceToggle(date) [Current day only]
│  └─ POST /api/teacher-attendance
│     └─ Updates attendance state
│
└─ TeacherOwnAttendanceViewModal
   ├─ fetchAttendance(month) [on open and month change]
   └─ fetchAttendanceRange(option) [on "Load" click]
      └─ GET /api/teacher-attendance with date range
         └─ Updates modal attendance state
```

---

## Validation & Error Handling

### Client-Side Validation

1. Date selection required
2. Status selection required
3. Cannot mark without both fields

### Server-Side Validation

- Handled by Supabase RLS policies
- API endpoint validation

### Error Messages

- Toast notifications for all errors
- User-friendly messages:
  - "Please select a date and status"
  - "Failed to mark attendance"
  - "{Name}'s attendance marked as {Status} for {Date}"

### Loading States

- Spinner during API calls
- Disabled buttons during saving
- Loading text in buttons

---

## Performance Considerations

1. **Lazy Loading**: Data fetched only when needed
2. **Date Normalization**: All dates normalized to YYYY-MM-DD format
3. **Efficient Queries**: Filters applied at API level
4. **UI Responsiveness**: Loading states prevent double-clicks
5. **Memory**: Modals unmounted/remounted cleanly

---

## Browser & Device Support

- ✅ Desktop Chrome/Firefox/Safari/Edge
- ✅ Tablet (responsive design)
- ✅ Mobile (scrollable modals, stacked buttons)
- ✅ Dark mode (tested)
- ✅ Touch-friendly date picker
- ✅ Accessible form inputs

---

## Security Considerations

1. **Authentication**: Handled by middleware
2. **Authorization**: Teachers can only view own attendance
3. **Data Isolation**: Filters by school_id
4. **Input Validation**: All inputs validated
5. **API Endpoints**: Secured with RLS policies

---

## Future Enhancements

Possible improvements not included in this release:

- [ ] Bulk mark attendance (multiple people, one date)
- [ ] Attendance history/audit log
- [ ] Export attendance to CSV
- [ ] Late/Early checkout notifications
- [ ] SMS notifications for absent marks
- [ ] Attendance patterns analysis
- [ ] Sync with biometric system

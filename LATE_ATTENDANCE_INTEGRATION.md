# Late Attendance System - Integration Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Teacher Management Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teacher Modal (teacher-modal.tsx)                               │
│  └─ Input: expected_time (HH:mm)                                │
│     └─ Save: createTeacher() / updateTeacher()                  │
│        └─ Store: profiles.expected_time                          │
│           └─ Display: TeacherSalaryCard (teacher-salary-card.tsx)│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Attendance Marking Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  AdminAttendanceMarkingModal (admin-attendance-marking-modal.tsx)│
│  └─ Input: teacher_id, date, status                              │
│     └─ Fetch: teacher.expected_time                              │
│        └─ Check: isAttendanceLate()                              │
│           ├─ NO  → Mark as present (green)                       │
│           └─ YES → Show LateReasonModal                          │
│              └─ Input: late_reason                                │
│                 └─ Save: updateLateReason()                      │
│                    └─ Store: teacher_attendance                   │
│                       is_late = true                              │
│                       late_reason = "..."                         │
│                       ↓                                           │
│              Display: AttendanceGrid (orange "⏱ Late")           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌────────────────────────┐
│   Teacher Profile      │
│  - name                │
│  - email               │
│  - expected_time ◄─────┼─── Set in Teacher Modal
└────────────────────────┘

         ↓

┌────────────────────────────────────────────┐
│   Attendance Record (teacher_attendance)   │
│  - date                                    │
│  - status (present/absent/leave)          │
│  - created_at                             │
│  - expected_time ◄─── Copied from profile  │
│  - is_late ◄────────── Calculated          │
│  - late_reason ◄────── From modal          │
└────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────┐
│   Attendance Grid Display                │
│  - Green: Present (on time)              │
│  - Orange: Late (is_late = true)         │
│  - Red: Absent                           │
│  - Blue: Leave                           │
└─────────────────────────────────────────┘
```

## Component Integration Map

```
app/admin/teachers/page.tsx
│
├─ TeacherModal
│  ├─ Input: expected_time
│  ├─ Action: createTeacher()
│  ├─ Action: updateTeacher()
│  └─ Stores: profiles.expected_time
│
└─ TeacherSalaryCard
   └─ Display: expected_time
   

app/admin/attendance/page.tsx
│
├─ AdminAttendanceMarkingModal
│  ├─ Fetch: teacher.expected_time
│  ├─ Check: isAttendanceLate()
│  ├─ If late → Open: LateReasonModal
│  │  └─ Action: updateLateReason()
│  └─ Display: Warning (orange)
│
└─ AttendanceGrid
   └─ Display: is_late (orange "⏱ Late")
```

## Function Call Chain

### Creating/Updating Teacher with Expected Time

```
User Input: expected_time = "08:30"
         ↓
TeacherModal.handleSubmit()
         ↓
updateTeacher(teacherId, {
  expected_time: "08:30"  ← New parameter
})
         ↓
adminClient.from("profiles").update({
  expected_time: "08:30"
})
         ↓
profiles.expected_time = "08:30"
         ↓
Display on TeacherSalaryCard
```

### Marking Attendance with Late Detection

```
User Click: "Mark Attendance"
         ↓
AdminAttendanceMarkingModal.handleMark()
         ↓
Fetch: /api/teachers/{teacherId}
         ↓
Get: teacher.expected_time
         ↓
Check: isAttendanceLate(
  createdAt: NOW,
  expectedTime: "08:30",
  date: "2025-12-17"
)
         ↓
Is NOW > (08:30 + 15 min)?
│
├─ NO (within 15 min)
│  └─ Mark Present (green)
│     └─ Display: "✓ Present"
│
└─ YES (> 15 min late)
   └─ Open: LateReasonModal
      └─ Input: late_reason = "Traffic jam"
         └─ Submit: handleLateReasonSubmit()
            └─ Call: updateLateReason(recordId, reason)
               └─ Update: teacher_attendance.late_reason
               └─ Set: is_late = true
               └─ Display: "⏱ Late" (orange)
```

## Type Dependencies

```
Teacher (types.ts)
├─ id: string
├─ name: string
├─ email: string
├─ expected_time?: string ◄─── NEW
└─ ...

TeacherAttendance (types.ts)
├─ id: string
├─ teacherId: string
├─ date: Date
├─ status: "present" | "absent" | "leave"
├─ expected_time?: string ◄─── NEW
├─ is_late?: boolean ◄─── NEW
├─ late_reason?: string ◄─── NEW
└─ ...
```

## State Management Flow

```
AdminAttendanceMarkingModal Component State:
├─ selectedDate: string
├─ selectedStatus: "present" | "absent" | "leave"
├─ teacherExpectedTime: string | null ◄─── Fetched
├─ lateReasonModalOpen: boolean ◄─── Opened if late
├─ pendingAttendanceId: string | null ◄─── Saved for late reason
└─ isCheckingLate: boolean

↓

When late detected:
├─ Open LateReasonModal
├─ Collect: late_reason (from user input)
└─ Call: updateLateReason(
   recordId: string,
   lateReason: string
)

↓

Result:
├─ teacher_attendance record updated
├─ is_late = true
├─ late_reason = "User input"
└─ AttendanceGrid displays orange "⏱ Late"
```

## Database Schema Relationships

```
profiles (teachers)
├─ id (UUID)
├─ name (TEXT)
├─ email (TEXT)
├─ expected_time (TIME) ◄─── NEW
└─ role = "teacher"

teacher_attendance
├─ id (UUID)
├─ teacher_id (UUID) ─┐
├─ date (DATE)        │ References profiles(id)
├─ status (TEXT)      │
├─ expected_time (TIME) ◄─── NEW (may differ per day)
├─ is_late (BOOLEAN) ◄─── NEW
├─ late_reason (TEXT) ◄─── NEW
└─ created_at (TIMESTAMP)
```

## API Endpoint Integrations

### Endpoint: GET /api/teachers/{teacherId}
```
Response:
{
  id: "uuid",
  name: "Ahmed Ali",
  email: "ahmed@school.com",
  expected_time: "08:30",  ◄─── Used by AdminAttendanceMarkingModal
  ...
}
```

### Endpoint: POST /api/teacher-attendance
```
Request:
{
  teacher_id: "uuid",
  date: "2025-12-17",
  status: "present",
  school_id: "uuid"
}

Response:
{
  id: "attendance_record_id",  ◄─── Used for updateLateReason
  ...
}
```

### Server Action: updateLateReason
```
Call: updateLateReason(
  recordId: "attendance_record_id",
  lateReason: "Traffic jam on way"
)

Effect:
- Updates teacher_attendance.late_reason
- Revalidates attendance pages
```

## Error Handling Chain

```
Try to mark attendance
│
├─ Missing date/status
│  └─ Error: "Please select a date and status"
│
├─ API fails
│  └─ Error: "Failed to mark attendance"
│
├─ Late reason modal opens
│  │
│  └─ Empty reason submitted
│     └─ Error: "Please provide a reason"
│
└─ Late reason update fails
   └─ Error: "Failed to save late reason"
```

## Color & UI States

```
Button State Table:

Late Detection Result | Button Color | Text | Description
─────────────────────┼──────────────┼──────┼──────────────────
is_late = true       | Orange       | ⏱ Late | Marked after 15min
status = "present"   | Green        | ✓ Present | On time
status = "absent"    | Red          | ✗ Absent | Absent
status = "leave"     | Blue         | 🏥 Leave | On leave
No record            | Gray         | — | Not marked
```

## Validation Rules

```
Expected Time Format: "HH:mm" (24-hour)
├─ Valid: "08:30", "09:00", "23:59"
└─ Invalid: "8:30", "08-30", "08:30 AM"

Late Threshold: 15 minutes
├─ Marked at: 08:44 (14 min) → GREEN (not late)
└─ Marked at: 08:46 (16 min) → ORANGE (late)

Late Reason: Required
├─ If is_late = true → Must provide reason
└─ If is_late = false → Reason optional
```

## Testing Checklist

- [ ] Create teacher with expected_time = "08:30"
- [ ] Verify expected_time shows on teacher card
- [ ] Mark attendance at 08:44 (14 min) → Green present
- [ ] Mark attendance at 08:46 (16 min) → Orange late + modal
- [ ] Submit late reason → Saves and displays orange
- [ ] Verify late_reason stored in DB
- [ ] Check attendance grid legend includes "Late (> 15 min)"
- [ ] Edit teacher to change expected_time
- [ ] Verify late detection uses new expected_time
- [ ] Test with no expected_time set → No late detection

---

**Last Updated:** December 17, 2025  
**Status:** ✅ Integration Complete

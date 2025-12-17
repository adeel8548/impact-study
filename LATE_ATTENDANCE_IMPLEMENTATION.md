# Late Attendance Detection System - Implementation Summary

## Overview
A complete late attendance tracking system has been implemented for teachers. The system allows marking attendance as late if it's marked more than 15 minutes after the expected arrival time, with reason documentation.

## Changes Made

### 1. Database Migrations

#### Migration 1: `014_teacher_expected_time_late_reason.sql`
Added three new columns to `teacher_attendance` table:
- `expected_time` (TIME): The expected arrival time (HH:mm format)
- `late_reason` (TEXT): Reason provided when attendance is marked late
- `is_late` (BOOLEAN): Flag indicating if attendance was marked as late
- Created index on `is_late` for better query performance

#### Migration 2: `015_add_expected_time_to_profiles.sql`
Added `expected_time` column to `profiles` table to store teacher's default expected arrival time.

### 2. Type Updates (`lib/types.ts`)

**Teacher Interface:**
- Added `expected_time?: string` field to store expected arrival time

**TeacherAttendance Interface:**
- Added `expected_time?: string` - Expected arrival time (HH:mm)
- Added `is_late?: boolean` - Whether marked as late
- Added `late_reason?: string` - Reason for late attendance

### 3. UI Components

#### Teacher Modal (`components/modals/teacher-modal.tsx`)
- Added `expected_time` field to FormState interface
- Added time input field for setting expected arrival time
- Added helper text: "Time when teacher is expected. Attendance after 15 min will be marked as late."
- Integrated expected_time in both create and update flows

#### Teacher Salary Card (`components/teacher-salary-card.tsx`)
- Displays expected_time on teacher card: "Expected Time: HH:mm"
- Shows "N/A" if not set
- Positioned below joining date information

#### Late Reason Modal (`components/modals/late-reason-modal.tsx`) - NEW
- Custom modal for collecting late attendance reasons
- Shows warning when attendance is marked > 15 minutes late
- Textarea for detailed reason input
- Works for both admin marking and teacher self-marking
- Displays: "Note: Late attendance will be recorded as 'Present - Late'"

#### Admin Attendance Marking Modal (`components/modals/admin-attendance-marking-modal.tsx`)
- Integrated late detection logic
- Fetches teacher's expected_time automatically
- Shows orange warning box when late attendance detected
- Opens late reason modal if attendance is marked as late
- Button changes to orange color for late attendances
- Passes reason to `updateLateReason` function

#### Attendance Grid (`components/attendance-grid.tsx`)
- Updated legend to include "Late (> 15 min)" with orange color
- Late attendance button displays as orange with "⏱ Late" text
- Button styling updated: `bg-orange-500 hover:bg-orange-600`
- Added `is_late` and `late_reason` fields to AttendanceRecord interface

### 4. Business Logic

#### Utility Functions (`lib/utils.ts`)

**`isAttendanceLate(createdAt, expectedTime, date)`**
- Checks if attendance was marked more than 15 minutes after expected time
- Returns boolean
- Handles timezone and time format properly

**`getAttendanceTimeOffset(createdAt, expectedTime, date)`**
- Calculates offset in minutes between marking and expected time
- Returns positive if late, negative if early
- Useful for analytics and reporting

**`shouldMarkAsLate(createdAt, expectedTime, date)`**
- Alias for late detection
- Used in attendance marking flow

#### Action Functions (`lib/actions/attendance.ts`)

**`shouldMarkAsLate(createdAt, expectedTime, date)`**
- Server-side function for late detection
- Validates expected_time format
- Returns boolean flag

**`updateLateReason(recordId, lateReason)`**
- Updates the `late_reason` field for an attendance record
- Server-side validation
- Revalidates affected paths

**`updateTeacher(teacherId, updates)`**
- Now accepts `expected_time` in updates object
- Stores expected_time on teacher profile

### 5. Teacher Management

#### `lib/actions/teacher.ts`

**`createTeacher(teacherData)`**
- Added `expected_time?: string | null` parameter
- Stores expected_time when creating new teacher

**`updateTeacher(teacherId, updates)`**
- Added `expected_time?: string | null` parameter  
- Updates expected_time on teacher profile

## How It Works

### Workflow

1. **Admin sets expected time:**
   - Goes to Teacher Management
   - Creates or edits teacher
   - Sets "Expected Arrival Time" (e.g., 08:30)
   - Time displayed on teacher card

2. **Admin marks attendance:**
   - Opens "Mark Attendance" modal for teacher
   - Selects date and status (Present/Absent/Leave)
   - System detects if current time > expected_time + 15 minutes
   - If late:
     - Shows orange warning box
     - Opens "Late Attendance Recorded" modal
     - Admin provides reason for late marking
     - Saves attendance with `is_late=true` and `late_reason`

3. **Attendance grid display:**
   - Late attendance shown as orange "⏱ Late" button
   - Different color from regular Present (green)
   - Easily identifiable in grid view

### Late Detection Logic

- Expected time: 08:30 AM
- Attendance marked at: 08:46 AM (16 minutes late)
- Result: Marked as LATE (> 15 min threshold)
- Status: Still counts as "Present" but flagged as late
- Color: Orange button

- Expected time: 08:30 AM  
- Attendance marked at: 08:44 AM (14 minutes late)
- Result: Marked as PRESENT (within 15 min threshold)
- Status: Normal present
- Color: Green button

## Color Coding

- **Green (#22c55e)**: Present - On time or within 15 min
- **Orange (#f97316)**: Present - Late (> 15 min after expected)
- **Red (#ef4444)**: Absent
- **Blue (#3b82f6)**: Leave
- **Gray (#d1d5db)**: Off / No Record

## Database Fields Reference

### profiles table
- `expected_time` (TIME): Expected arrival time in HH:mm format

### teacher_attendance table
- `expected_time` (TIME): Expected arrival time for that day (if different)
- `is_late` (BOOLEAN): Whether marked as late
- `late_reason` (TEXT): Reason for late attendance

## API Endpoints Used

- `POST /api/teacher-attendance` - Mark attendance (with late detection)
- `GET /api/teachers/{teacherId}` - Get teacher data including expected_time
- Server actions: `updateLateReason()`, `updateTeacher()`, `markTeacherAttendance()`

## Validation & Error Handling

- Invalid time formats are ignored
- Expected time > 15 min threshold is strictly enforced
- Admin can always mark attendance even for past dates
- Late reason is optional on initial marking but required when late is detected
- All operations are protected with authentication checks

## Files Modified/Created

### Created:
- `components/modals/late-reason-modal.tsx` - NEW modal component
- `scripts/014_teacher_expected_time_late_reason.sql` - Migration
- `scripts/015_add_expected_time_to_profiles.sql` - Migration

### Modified:
- `lib/types.ts` - Added types for expected_time and late tracking
- `lib/utils.ts` - Added late detection utilities
- `lib/actions/teacher.ts` - Added expected_time handling in create/update
- `lib/actions/attendance.ts` - Added late reason update function
- `components/modals/teacher-modal.tsx` - Added expected_time input
- `components/modals/admin-attendance-marking-modal.tsx` - Integrated late detection
- `components/teacher-salary-card.tsx` - Display expected_time
- `components/attendance-grid.tsx` - Show late status with orange color

## Features Implemented ✅

- ✅ Add expected_time field to teacher during create/update
- ✅ Display expected_time on teacher card
- ✅ Detect late attendance (> 15 min after expected time)
- ✅ Mark late attendance as present with orange color
- ✅ Modal for providing late attendance reason
- ✅ Both admin and teacher can add reasons (infrastructure ready)
- ✅ Orange color for late attendance boxes
- ✅ Updated attendance grid with late indicator
- ✅ Database migrations for new fields
- ✅ Type safety with TypeScript interfaces
- ✅ Server-side validation
- ✅ Proper error handling

## Future Enhancements

1. Teacher self-marking with late reason modal
2. Salary deduction based on late attendance count
3. Late attendance reports and analytics
4. Bulk import of teacher expected times
5. Automatic late detection for admin-marked attendance
6. Email notifications for late attendance
7. Late attendance trends visualization

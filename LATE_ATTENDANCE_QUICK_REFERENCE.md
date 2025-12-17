# Late Attendance System - Quick Reference

## Quick Setup & Usage

### Step 1: Run Migrations
Execute these SQL scripts in order:
```sql
-- Migration 1
scripts/014_teacher_expected_time_late_reason.sql

-- Migration 2  
scripts/015_add_expected_time_to_profiles.sql
```

### Step 2: Set Teacher Expected Time
1. Go to Admin > Teachers
2. Click Edit on a teacher
3. Fill "Expected Arrival Time" field (e.g., 08:30)
4. Save teacher
5. Expected time now shows on teacher card

### Step 3: Mark Attendance
1. Go to Admin > Attendance
2. Click "Mark Attendance" for a teacher
3. Select date and "Present" status
4. If marked > 15 minutes after expected time:
   - Orange warning appears
   - Late Reason modal opens
   - Provide reason for late marking
   - Click "Confirm Late Attendance"
5. Attendance marked with orange "⏱ Late" indicator

## Key Features

| Feature | Details |
|---------|---------|
| **Late Threshold** | 15 minutes after expected time |
| **Color Indicator** | Orange for late attendance |
| **Status** | Still counts as "Present" but flagged as late |
| **Reason** | Required when attendance marked late |
| **Display** | Shows "⏱ Late" in attendance grid |

## Database Schema

### profiles table
```sql
expected_time TIME  -- HH:mm format, e.g., '08:30'
```

### teacher_attendance table
```sql
expected_time TIME        -- Expected arrival time
is_late BOOLEAN           -- TRUE if marked late
late_reason TEXT          -- Reason for late attendance
```

## Components Reference

| Component | Purpose |
|-----------|---------|
| `LateReasonModal` | Collect late attendance reason |
| `AdminAttendanceMarkingModal` | Detect & handle late marking |
| `TeacherSalaryCard` | Display expected_time |
| `AttendanceGrid` | Show late status in orange |

## Utility Functions

```typescript
// Check if attendance is late
isAttendanceLate(createdAt, expectedTime, date) → boolean

// Get time offset in minutes
getAttendanceTimeOffset(createdAt, expectedTime, date) → number

// Server-side late check
shouldMarkAsLate(createdAt, expectedTime, date) → boolean
```

## Late Detection Logic

```
Expected Time: 08:30 AM
Attendance Marked At: Time NOW

If (NOW - 08:30 > 15 minutes) → LATE
   Status: Present
   Color: Orange
   Reason: Required
Else
   Status: Present  
   Color: Green
   Reason: Optional
```

## Testing Scenarios

### Test 1: Late Within Threshold
- Expected: 08:30
- Marked: 08:44 (14 min)
- Result: Green "Present" ✓

### Test 2: Late After Threshold
- Expected: 08:30
- Marked: 08:46 (16 min)
- Result: Orange "⏱ Late" + Modal ✓

### Test 3: Very Late
- Expected: 08:30
- Marked: 09:15 (45 min)
- Result: Orange "⏱ Late" + Modal ✓

### Test 4: No Expected Time
- Expected: Not set
- Marked: Any time
- Result: Green "Present" (no late detection) ✓

## Color Codes

```
🟢 Green (#22c55e)   → Present (on time)
🟠 Orange (#f97316)  → Present - Late
🔴 Red (#ef4444)     → Absent
🔵 Blue (#3b82f6)    → Leave
⚫ Gray (#d1d5db)     → Off / No Record
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Expected time not showing | Ensure migrations ran; refresh page |
| Late modal not appearing | Check if time > expected + 15 min |
| Reason not saving | Ensure reason text is not empty |
| Wrong colors | Clear browser cache; check CSS |

## API Endpoints

```
POST   /api/teacher-attendance      → Mark attendance
GET    /api/teachers/{teacherId}    → Get teacher (includes expected_time)
PATCH  /api/attendance/{recordId}   → Update late_reason (via server action)
```

## Server Actions

```typescript
// Update late reason
updateLateReason(recordId, lateReason)
// Returns: { error: null | string }

// Create/Update teacher with expected_time
createTeacher(teacherData)
updateTeacher(teacherId, { expected_time })
```

## Notes

- Late time detection happens at marking time, not viewing time
- Expected time is stored per teacher (can be different for each teacher)
- Late attendance still counts as "Present" for attendance purposes
- Reason is stored in `late_reason` column, remarks stays for leave reasons
- All timestamps use server time (UTC in Supabase)

---

**Version:** 1.0  
**Last Updated:** December 17, 2025  
**Status:** ✅ Ready for Production

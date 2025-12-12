# Quiz Results - Quick Reference Guide

## Access the Feature

### Admin

- URL: `/admin/quiz-results`
- Sidebar: Click "Quiz Results" menu item

### Teacher

- URL: `/teacher/quiz-results`
- Header: Click "Quiz Results" button in navigation

## Step-by-Step Usage

### Step 1: Select Class

```
1. Open Quiz Results page
2. Click "Class" dropdown
3. Select your class
4. Wait for data to load
```

### Step 2: Select Quiz

```
1. Click "Quiz" dropdown
2. See quizzes with dates: "Topic (YYYY-MM-DD)"
3. Select a quiz
4. See quiz info: subject and duration
```

### Step 3: Enter Marks

```
For each student:
1. Find student name in grid
2. Find quiz column
3. Click input field
4. Enter marks (0-100, decimals OK)
5. See % and status update
```

### Step 4: Save All

```
1. Review all marks
2. Click "Save All Results"
3. Wait for save to complete
4. See toast: "Saved results for X student(s)"
5. Marks automatically reload
```

## Interface Guide

### Top Section

```
┌─────────────────────────────────────┐
│ Select Quiz                         │
├─────────────────────────────────────┤
│ Class: [Dropdown] Subject:... Date  │
│ Quiz:  [Dropdown] Max: 100          │
└─────────────────────────────────────┘
```

### Marks Grid

```
┌──────────────┬──────────┬──────────┬──────┬────────┐
│ Student Name │ Roll No. │ Marks    │ %    │ Status │
├──────────────┼──────────┼──────────┼──────┼────────┤
│ Ali Ahmed    │ 01       │ [45]     │ 45%  │ Pass   │
│ Sara Khan    │ 02       │ [25]     │ 25%  │ Fail   │
│ ...          │ ...      │ ...      │ ...  │ ...    │
└──────────────┴──────────┴──────────┴──────┴────────┘
```

### Summary Box

```
Overall:
- Total Obtained: 450 / 1000
- Percent: 45.0%

Per Student:
- Max per student: 100
- Students: 10
```

### Buttons

```
[Save All Results] ← Click to save all marks at once
```

## Common Tasks

### Add Marks for New Quiz

1. Select Class
2. Select Quiz (shows "Select Quiz")
3. Enter marks for each student
4. Click "Save All Results"

### Update Existing Marks

1. Select Class
2. Select same Quiz
3. Marks pre-fill automatically
4. Change marks as needed
5. Click "Save All Results"

### Check Student Performance

- Look at % column (higher is better)
- Look at Status column (Pass/Fail)
- Red = Fail (<40%), Green = Pass (≥40%)

### See Class Statistics

- Overall section shows class-wide stats
- Average percentage
- Total marks across all students

## Tips & Tricks

💡 **Decimal Marks**: You can enter 45.5 for decimal marks

💡 **Auto-Calculate**: % calculates automatically as you type

💡 **Pre-filled Marks**: If marks exist, they auto-load when you select a quiz

💡 **Fast Entry**: Use Tab key to move between student mark inputs

💡 **Batch Save**: All students save with one button click

💡 **No Limits**: You can save multiple times - each save updates the marks

## Keyboard Shortcuts

| Key       | Action                              |
| --------- | ----------------------------------- |
| Tab       | Move to next student mark input     |
| Shift+Tab | Move to previous student mark input |
| Enter     | Submit form (if implemented)        |

## Validation Rules

✓ Marks must be 0 or higher
✓ Marks must be a number (can be decimal)
✗ Cannot enter negative numbers
✗ Cannot enter text

## Error Messages

| Message                                          | Solution                   |
| ------------------------------------------------ | -------------------------- |
| "Please select a quiz and ensure students exist" | Select both class and quiz |
| "Failed to save..."                              | Check internet, retry      |
| "Marks must be a non-negative number"            | Enter 0 or positive number |

## Important Notes

📌 **Max Marks**: Based on quiz duration (usually 100)

📌 **Pass/Fail**: < 40% = Fail (red), ≥ 40% = Pass (green)

📌 **Filters**: Teachers only see their classes; Admins see all

📌 **Save Count**: Shows how many students successfully saved

## Data That Displays

### From Quiz

- Quiz topic name
- Subject
- Quiz date
- Duration (used as max marks)

### From Students

- Student name
- Roll number (if available)

### Calculated

- Percentage: (marks / max) \* 100
- Status: Pass or Fail based on percentage

## Troubleshooting

**Q: Quiz dropdown is empty**
A: Select a class first, wait for data to load

**Q: Can't see all students**
A: Check that class is selected and has students

**Q: Marks didn't save**
A: Check toast message for errors, check internet

**Q: Existing marks don't show**
A: If not loading, try selecting quiz again

**Q: Status doesn't update**
A: Refresh page or click different quiz then back

## Contact for Help

If you encounter issues:

1. Check error toast messages
2. Verify class and quiz are selected
3. Check internet connection
4. Try refreshing page
5. Contact admin if problem persists

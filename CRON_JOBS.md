# Cron Jobs Configuration

This project uses Vercel Cron for scheduling automatic tasks that run on specific dates/times.

## Scheduled Jobs

### 1. Monthly Billing (Combined)

- **Schedule:** `0 0 1 * *` (1st of every month at 00:00 UTC)
- **Endpoint:** `/api/cron/monthly-billing`
- **Function:** Creates monthly student fees and teacher salary rows (if missing), resets teacher salaries to unpaid, and checks student fee expiration.

### 2. Auto Teacher Out + Auto Absent (Daily)

- **Schedule:** `0 14 * * *` (14:00 UTC = 19:00 PKT / 7:00 PM)
- **Endpoint:** `/api/cron/auto-teacher-out`
- **Function:**
  - Sets `out_time` to 7:00 PM for teachers marked `present`/`late` without an out_time
  - Auto-marks `absent` for teachers with no attendance record for the day

## Configuration

The cron schedules are defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/monthly-billing", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/auto-teacher-out", "schedule": "0 14 * * *" }
  ]
}
```

## How It Works

### On the 1st of Each Month:

1. **Teacher Salaries:** All salaries marked as "paid" are reset to "unpaid" via cron job
2. **Student Fees:**
   - Fees that were paid in the previous month (past end-of-month) are automatically marked as "unpaid"
   - The button becomes enabled again once the month expires

## Local Testing

To test cron endpoints locally, you can manually call them:

```bash
# Reset teacher salaries
curl -X POST http://localhost:3000/api/cron/reset-teacher-salary

# Reset student fees
curl -X POST http://localhost:3000/api/cron/reset-student-fees
```

## Button Behavior

### Teacher Salary Card

- **When Unpaid:** Button shows "Mark Paid" (enabled)
- **When Paid:** Button shows "Mark Unpaid" but is DISABLED
- **On 1st of Month:** Cron job resets to "unpaid", button becomes enabled again

### Student Fee Status Button

- **When Unpaid:** Button shows "Unpaid" in red (enabled)
- **When Paid:** Button shows "Paid" in green (DISABLED)
- **After Month Expires:** Button automatically enables, can be marked unpaid again
- **On 1st of Month:** Cron job can reset expired fees back to unpaid

## Verification

After deployment to Vercel, verify cron jobs are active:

1. Go to Vercel Dashboard → Project Settings → Crons
2. You should see both `/api/cron/reset-teacher-salary` and `/api/cron/reset-student-fees` listed
3. Check the "Last Runs" tab to verify they executed successfully

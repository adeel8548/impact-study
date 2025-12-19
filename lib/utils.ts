import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_DATE_KEYS = [
  "created_at",
  "createdAt",
  "created_on",
  "createdOn",
  "date",
  "timestamp",
];

export function sortByNewest<T extends Record<string, any>>(
  items: T[] = [],
  keys: string[] = DEFAULT_DATE_KEYS,
) {
  const resolveTimestamp = (item: T) => {
    for (const key of keys) {
      const value = item?.[key as keyof T];
      if (!value) continue;
      if (typeof value === "number") return value;
      const date = new Date(value as any).getTime();
      if (!Number.isNaN(date)) return date;
    }
    return 0;
  };

  return [...items].sort((a, b) => resolveTimestamp(b) - resolveTimestamp(a));
}

// Month and year utilities
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || "";
}

export function getMonthNameShort(month: number): string {
  return MONTHS_SHORT[month - 1] || "";
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function generateYearOptions(yearsBack: number = 5): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = yearsBack; i >= 0; i--) {
    years.push(currentYear - i);
  }
  return years;
}

export function isCurrentMonth(month: number, year: number): boolean {
  const now = new Date();
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Check if attendance is marked as late once the allowed grace period has passed.
 * Default grace period is 15 minutes; override via thresholdMinutes when needed.
 */
const parseExpectedTime = (expectedTime: string | null | undefined): { hours: number; minutes: number } | null => {
  if (!expectedTime) return null;

  const trimmed = expectedTime.trim();

  // Handle formats like "3:45 PM" or "03:45 pm"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3].toLowerCase();
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  // Handle HH:mm (24h). If hour is in 1-7 range, assume PM for afternoon-evening schools.
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    const hoursRaw = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hoursRaw) || Number.isNaN(minutes)) return null;
    const hours = hoursRaw >= 1 && hoursRaw <= 7 ? hoursRaw + 12 : hoursRaw; // assume PM for 1-7
    return { hours, minutes };
  }

  return null;
};

export function isAttendanceLate(
  createdAt: Date | string,
  expectedTime: string | null | undefined,
  date: string | Date,
  thresholdMinutes: number = 15
): boolean {
  const parsed = parseExpectedTime(expectedTime);
  if (!parsed) return false;

  const created = new Date(createdAt);
  const attendanceDate = new Date(date);

  // Create expected datetime (same date as attendance, but with expected time)
  const expectedDateTime = new Date(attendanceDate);
  expectedDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);

  // Add grace period to expected time
  const lateThresholdTime = new Date(
    expectedDateTime.getTime() + thresholdMinutes * 60 * 1000,
  );

  // If created_at is after the late threshold, it's marked as late
  return created > lateThresholdTime;
}

/**
 * Get time difference between attendance marking and expected time
 * @returns difference in minutes (negative if before expected, positive if after)
 */
export function getAttendanceTimeOffset(
  createdAt: Date | string,
  expectedTime: string | null | undefined,
  date: string | Date
): number {
  const parsed = parseExpectedTime(expectedTime);
  if (!parsed) return 0;

  const created = new Date(createdAt);
  const attendanceDate = new Date(date);

  const expectedDateTime = new Date(attendanceDate);
  expectedDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);

  const diffMs = created.getTime() - expectedDateTime.getTime();
  return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
}

/**
 * Check if teacher attendance should be marked as late and return the is_late flag
 * (Alias for isAttendanceLate for clarity in different contexts)
 */
export function shouldMarkAsLate(
  createdAt: Date | string,
  expectedTime: string | null | undefined,
  date: string | Date,
  thresholdMinutes: number = 15
): boolean {
  return isAttendanceLate(createdAt, expectedTime, date, thresholdMinutes);
}

/**
 * Format time from HH:mm format to 12-hour format (e.g., "09:30" → "09:30 AM")
 */
export function formatTo12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return "N/A";

  try {
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      return timeStr;
    }

    const hour = hours % 12 || 12; // Convert 0 to 12
    const ampm = hours >= 12 ? "PM" : "AM";

    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}
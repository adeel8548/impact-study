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

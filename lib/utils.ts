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

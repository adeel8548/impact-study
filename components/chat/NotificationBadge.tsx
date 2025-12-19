"use client";

import { Bell } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
  onClick: () => void;
}

export function NotificationBadge({ count, onClick }: NotificationBadgeProps) {
  return (
    <button onClick={onClick} className="relative p-2 rounded-full hover:bg-muted" aria-label="Notifications">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

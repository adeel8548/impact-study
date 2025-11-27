import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceRecord {
  id?: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  status: "present" | "absent";
  // optional timestamps from server (e.g. when record was created/updated)
  created_at?: string;
  updated_at?: string;
  out_time?: string;
}

interface AttendanceGridProps {
  records: AttendanceRecord[];
  title: string;
  onStatusChange: (date: string, status: "present" | "absent") => void;
  daysToShow?: number;
  // When true the grid will show a small timestamp under each day's cell
  // useful for admin views to see when attendance was marked.
  showTimestamps?: boolean;
}

interface HolidayDate {
  date: string;
  name: string;
}

export function AttendanceGrid({
  records,
  title,
  onStatusChange,
  daysToShow = 7,
  showTimestamps = false,
}: AttendanceGridProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(date.getDate() - daysToShow + 1);
    return date;
  });

  // Track current time so the component can react when the day rolls over at midnight.
  const [now, setNow] = useState<Date>(() => new Date());
  const midnightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Schedule an update at next local midnight so the grid automatically shifts.
    function scheduleNextMidnight() {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
        0,
        0,
        1,
        0
      );
      const ms = nextMidnight.getTime() - current.getTime();

      // Use window.setTimeout so we can clear by id properly
      midnightTimerRef.current = window.setTimeout(() => {
        setNow(new Date());
        // advance the visible window by one day so the next day's box appears automatically
        setStartDate((prev) => {
          const d = new Date(prev);
          d.setDate(d.getDate() + 1);
          return d;
        });
        // schedule the next midnight update
        scheduleNextMidnight();
      }, ms);
    }

    scheduleNextMidnight();

    return () => {
      if (midnightTimerRef.current) {
        clearTimeout(midnightTimerRef.current);
      }
    };
  }, [daysToShow]);

  const holidays: HolidayDate[] = [
    // Add holidays as needed (format: YYYY-MM-DD)
  ];

  const isHoliday = (date: Date): boolean => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return holidays.some((h) => h.date === dateStr);
  };

  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0;
  };

  const isOffDay = (date: Date): boolean => {
    return isSunday(date) || isHoliday(date);
  };

  const generateDateRange = () => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getRecord = (date: string): AttendanceRecord | undefined => {
    return records.find((r) => r.date === date);
  };

  const getStatus = (date: string): "present" | "absent" | null => {
    const record = getRecord(date);
    return record?.status || null;
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      // Use 24-hour format (no AM/PM)
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  };

  const isToday = (date: Date): boolean => {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handlePrevWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - daysToShow);
    setStartDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + daysToShow);
    setStartDate(newDate);
  };

  const dates = generateDateRange();
  const today = now;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-6 mb-2 md:mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Off / No Record</span>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-2">
          {dates.map((date) => {
            const dateStr = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const isOff = isOffDay(date);
            const isPast = isPastDate(date);
            const isCurrent = isToday(date);
            const status = getStatus(dateStr);
            const record = getRecord(dateStr);

            return (
              <div
                key={dateStr}
                className="flex flex-col items-center gap-2 min-w-[80px]"
              >
                {/* Date Header */}
                <div className="text-center text-xs font-semibold">
                  <div className="text-foreground">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-sm ${
                      isCurrent
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>

                {/* Attendance Box */}
                {isOff ? (
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Off
                    </span>
                  </div>
                ) : (
                  <Button
                    variant={
                      status === "present"
                        ? "default"
                        : status === "absent"
                        ? "destructive"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      const newStatus =
                        status === "present" ? "absent" : "present";
                      onStatusChange(dateStr, newStatus);
                    }}
                    disabled={isPast && !isCurrent}
                    className={`w-full h-10 text-xs ${
                      status === "present"
                        ? "bg-green-500 hover:bg-green-600"
                        : status === "absent"
                        ? "bg-red-500 hover:bg-red-600"
                        : ""
                    }`}
                  >
                    {status === "present"
                      ? "✓ Present"
                      : status === "absent"
                      ? "✗ Absent"
                      : "—"}
                  </Button>
                )}
                {/* Show timestamp for admin if requested and we have a record */}
                {showTimestamps && record && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {/* Time IN */}
                    <span>
                      IN:{" "}
                      {record.created_at
                        ? formatTime(record.created_at)
                        : " -- "}{" "}
                      {/* Agar created_at null ho to placeholder dikhaye */}
                    </span>
                    <br />
                    {/* Time OUT */}
                    <span>
                      OUT:{" "}
                      {record.out_time ? formatTime(record.out_time) : " -- "}{" "}
                      {/* Agar out_time null ho to placeholder dikhaye */}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

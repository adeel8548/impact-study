"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  teacher_id: string;
  date: string;
  status: "present" | "absent" | "leave";
  school_id?: string;
  created_at?: string;
  updated_at?: string;
  out_time?: string;
}

interface TeacherOwnAttendanceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
}

export function TeacherOwnAttendanceViewModal({
  open,
  onOpenChange,
  teacherId,
  teacherName,
}: TeacherOwnAttendanceViewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rangeOption, setRangeOption] = useState<string>("currentMonth");
  const [isFetching, setIsFetching] = useState(false);

  // Helper to produce local YYYY-MM-DD strings
  const toLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Date range helper
  const computeRange = (option: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (option) {
      case "last7": {
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        break;
      }
      case "last15": {
        start = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      }
      case "lastMonth": {
        const firstOfThisMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        end = new Date(firstOfThisMonth.getTime() - 1 * 24 * 60 * 60 * 1000);
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      }
      case "currentMonth": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      }
      case "last3Months": {
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 3,
          today.getDate(),
        );
        break;
      }
      case "last6Months": {
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 6,
          today.getDate(),
        );
        break;
      }
      case "lastYear": {
        start = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate(),
        );
        break;
      }
      default: {
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      }
    }

    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return {
      start: toLocalDate(s),
      end: toLocalDate(e),
    };
  };

  // Fetch attendance data when modal opens
  useEffect(() => {
    if (open) {
      fetchAttendance(currentDate);
    }
  }, [open, currentDate, teacherId]);

  const fetchAttendance = async (date: Date) => {
    try {
      setIsLoading(true);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const monthStr = `${year}-${month}`;

      const params = new URLSearchParams({
        teacherId,
        month: monthStr,
      });

      const response = await fetch(`/api/teacher-attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");

      const result = await response.json();
      const attendanceData = result.attendance || result;

      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        try {
          const d = new Date(a.date);
          const localDate = `${d.getFullYear()}-${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return { ...a, date: localDate };
        } catch (e) {
          return a;
        }
      });

      setAttendance(normalized);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceRange = async (option: string) => {
    try {
      setIsFetching(true);
      const { start, end } = computeRange(option);
      const params = new URLSearchParams({
        teacherId,
        startDate: start,
        endDate: end,
      });
      const response = await fetch(`/api/teacher-attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const result = await response.json();
      const attendanceData = result.attendance || result;

      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        try {
          const d = new Date(a.date);
          const localDate = `${d.getFullYear()}-${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return { ...a, date: localDate };
        } catch (e) {
          return a;
        }
      });

      setAttendance(normalized);
      toast.success(`Loaded ${normalized.length} records`);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
    } finally {
      setIsFetching(false);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create array of days to display
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Calculate stats - only for current selected month
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  attendance.forEach((record) => {
    try {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();

      if (recordYear === year && recordMonth === month) {
        if (record.status === "present") presentCount++;
        if (record.status === "absent") absentCount++;
        if (record.status === "leave") leaveCount++;
      }
    } catch (e) {
      // ignore
    }
  });

  const getAttendanceRecord = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    return attendance.find((a) => a.date === dateStr);
  };

  const isSunday = (day: number) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0;
  };

  const getStatusText = (day: number) => {
    if (isSunday(day)) return "Off";
    const record = getAttendanceRecord(day);
    if (!record) return "—";
    if (record.status === "present") return "✓";
    if (record.status === "absent") return "✗";
    if (record.status === "leave") return "🏥";
    return "—";
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Attendance Records</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-green-500">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Present
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {presentCount}
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Absent
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {absentCount}
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Leave
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {leaveCount}
                </p>
              </Card>
            </div>

            {/* Month Navigation and Range Filter */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleMonthChange("prev")}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold text-foreground">
                  {currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => handleMonthChange("next")}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Range Filter */}
              {/* <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={rangeOption}
                  onChange={(e) => setRangeOption(e.target.value)}
                  className="px-3 py-1 border border-border rounded text-sm bg-background text-foreground"
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last15">Last 15 days</option>
                  <option value="lastMonth">Last month</option>
                  <option value="currentMonth">Current month</option>
                  <option value="last3Months">Last 3 months</option>
                  <option value="last6Months">Last 6 months</option>
                  <option value="lastYear">Last year</option>
                </select>
                <button
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    isFetching
                      ? "bg-secondary text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                  onClick={() => fetchAttendanceRange(rangeOption)}
                  disabled={isFetching}
                >
                  {isFetching ? "Loading..." : "Load"}
                </button>
              </div> */}
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500"></div>
                <span className="text-sm text-foreground">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-500"></div>
                <span className="text-sm text-foreground">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500"></div>
                <span className="text-sm text-foreground">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-400 dark:bg-gray-600"></div>
                <span className="text-sm text-foreground">Off / No Record</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center font-semibold text-xs text-muted-foreground"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    if (day === null) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="aspect-square"
                        ></div>
                      );
                    }

                    const record = getAttendanceRecord(day);
                    const sunday = isSunday(day);

                    return (
                      <div
                        key={day}
                        className={`rounded-lg font-semibold text-sm flex flex-col justify-between transition-all min-h-28 p-2 ${
                          !record
                            ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            : record.status === "present"
                              ? "bg-green-500 text-white"
                              : record.status === "absent"
                                ? "bg-red-500 text-white"
                                : record.status === "leave"
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-400 text-white dark:bg-gray-600"
                        }`}
                      >
                        {/* Top: Day number and Status */}
                        <div className="text-center">
                          <div className="text-xs opacity-70">{day}</div>
                          <div className="text-base">{getStatusText(day)}</div>
                        </div>

                        {/* Bottom: Time In / Out */}
                        {record && record.status === "present" && (
                          <div className="text-xs text-center mt-2 pt-1 border-t border-current/30 w-full">
                            <div>In: {formatTime(record.created_at)}</div>
                            <div>Out: {formatTime(record.out_time)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

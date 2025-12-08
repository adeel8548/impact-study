"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: "present" | "absent" | "leave";
  created_at?: string;
  updated_at?: string;
}

interface Class {
  id: string;
  name: string;
}

interface StudentAttendanceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentClass?: Class;
}

const normalizeClassName = (value?: string) => value?.trim().toLowerCase() ?? "";

export function StudentAttendanceViewModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  studentClass,
}: StudentAttendanceViewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rangeOption, setRangeOption] = useState<string>("currentMonth");
  const [isFetching, setIsFetching] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedReasonRecord, setSelectedReasonRecord] = useState<{
    id: string;
    date: string;
    remarks?: string | null;
  } | null>(null);

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
          1
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
          today.getDate()
        );
        break;
      }
      case "last6Months": {
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 6,
          today.getDate()
        );
        break;
      }
      case "lastYear": {
        start = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate()
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
  }, [open, currentDate, studentId]);

  const fetchAttendance = async (date: Date) => {
    try {
      setIsLoading(true);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const monthStr = `${year}-${month}`;

      const params = new URLSearchParams({
        studentId,
        month: monthStr,
      });

      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");

      const result = await response.json();
      const attendanceData = result.attendance || result;

      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        try {
          const d = new Date(a.date);
          const localDate = `${d.getFullYear()}-${String(
            d.getMonth() + 1
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
        studentId,
        startDate: start,
        endDate: end,
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const result = await response.json();
      const attendanceData = result.attendance || result;

      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        try {
          const d = new Date(a.date);
          const localDate = `${d.getFullYear()}-${String(
            d.getMonth() + 1
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
  
  attendance.forEach((record) => {
    // Filter records to only current month
    try {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();
      
      if (recordYear === year && recordMonth === month) {
        if (record.status === "present") presentCount++;
        if (record.status === "absent") absentCount++;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-start gap-2">
            <span className="font-semibold text-gray-800 flex gap-2 items-center">
              Student Name: <span className="text-blue-800">{studentName}</span>
            </span>
            {studentClass && (
              <span className="font-semibold text-gray-800 flex gap-2 items-center">
                Class: <span className="text-blue-800">({studentClass.name})</span>
              </span>
            )}
          </DialogTitle>
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
                  {attendance.filter(a => a.status === "present").length}
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Absent
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {attendance.filter(a => a.status === "absent").length}
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  Leave
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {attendance.filter(a => a.status === "leave").length}
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
              <div className="flex gap-2 items-center flex-wrap">
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
              </div>
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

            {/* Note - This is Read-Only */}
            <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
              <p className="text-sm text-foreground">
                <strong>Note:</strong> This is a read-only view of your attendance history. To mark attendance, ask your admin or teacher.
              </p>
            </Card>

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
                        className={`aspect-square rounded-lg font-semibold text-sm flex items-center justify-center transition-all ${
                          !record
                            ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            : record.status === "present"
                              ? "bg-green-500 text-white"
                              : record.status === "absent"
                                ? "bg-red-500 text-white"
                                : record.status === "leave"
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-400 text-white dark:bg-gray-600"
                        } relative`}
                      >
                        <div className="text-center">
                          <div className="text-xs opacity-70">{day}</div>
                          <div className="text-base">{getStatusText(day)}</div>
                        </div>

                        {record && record.status === "leave" && (
                          <button
                            onClick={() => {
                              setSelectedReasonRecord({
                                id: record.id,
                                date: record.date,
                                remarks: (record as any).remarks || null,
                              });
                              setReasonModalOpen(true);
                            }}
                            title={(record as any).remarks || "View / add leave reason"}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs"
                          >
                            🛈
                          </button>
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

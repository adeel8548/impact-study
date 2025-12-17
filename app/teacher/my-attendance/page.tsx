"use client";

import { useEffect, useState, useRef } from "react";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { TeacherOwnAttendanceViewModal } from "@/components/modals/teacher-own-attendance-view-modal";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";
import { LateReasonModal } from "@/components/modals/late-reason-modal";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import { isAttendanceLate } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  teacher_id: string;
  date: string;
  status: "present" | "absent" | "leave" | "late";
  school_id?: string;
  created_at?: string;
  updated_at?: string;
  out_time?: string;
  remarks?: string;
  late_reason?: string;
}

export default function TeacherMyAttendancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveRecord, setSelectedLeaveRecord] =
    useState<AttendanceRecord | null>(null);
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [pendingLateAttendanceId, setPendingLateAttendanceId] = useState<string | null>(null);
  const [teacherExpectedTime, setTeacherExpectedTime] = useState<string | null>(null);

  // OUT button state: disabled until midnight after marking out
  const [outDisabled, setOutDisabled] = useState(false);
  const midnightTimerRef = useRef<any>(null);
  // Store today's attendance row UUID so we can update it when marking OUT
  const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(
    null,
  );

  // Range filter for this view
  const [rangeOption, setRangeOption] = useState<string>("currentMonth");

  const computeRangeLocal = (option: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (option) {
      case "last7":
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        break;
      case "last15":
        start = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
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
      case "currentMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case "last3Months":
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 3,
          today.getDate(),
        );
        break;
      case "last6Months":
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 6,
          today.getDate(),
        );
        break;
      case "lastYear":
        start = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate(),
        );
        break;
      default:
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    }

    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return {
      start: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(s.getDate()).padStart(2, "0")}`,
      end: `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(e.getDate()).padStart(2, "0")}`,
    };
  };

  // Explicit setter for today's status (present, absent, or leave)
  const handleSetStatus = async (status: "present" | "absent" | "leave" | "late") => {
    if (!teacher) return;

    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    // Auto-detect late if marking as present
    let finalStatus = status;
    if (status === "present" && teacherExpectedTime) {
      const isLate = isAttendanceLate(new Date(), teacherExpectedTime, date);
      if (isLate) {
        finalStatus = "late";
      }
    }

    try {
      setIsFetching(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const payload = {
        teacher_id: teacher.id,
        date,
        status: finalStatus,
        school_id: user.school_id,
      } as any;

      const res = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update attendance");

      const body = await res.json();
      const returned = body.attendance || body;
      const updated = Array.isArray(returned) ? returned[0] : returned;

      if (updated && updated.date) {
        try {
          const d = new Date(updated.date);
          updated.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate(),
          ).padStart(2, "0")}`;
        } catch (e) {}
      }

      setAttendance((prev) => {
        const filtered = (prev || []).filter((a) => a.date !== date);
        return [...filtered, updated];
      });

      // If marked as late, show late reason modal
      if (finalStatus === "late" && updated && updated.id) {
        setPendingLateAttendanceId(updated.id);
        setLateModalOpen(true);
      } else {
        toast.success("Attendance updated");
      }
    } catch (err) {
      console.error("Error setting status:", err);
      toast.error("Failed to set status");
    } finally {
      setIsFetching(false);
    }
  };

  // Handle grid box click with status cycling
  const handleGridBoxClick = async (day: number, record: AttendanceRecord | undefined) => {
    if (!teacher || isFetching) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    // Only allow marking today
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr !== todayStr) {
      toast.error("You can only mark attendance for today");
      return;
    }

    const isSunday = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 0;
    if (isSunday) {
      return;
    }

    // Status cycle: no status → (auto-detect) → absent → leave → late → present
    let nextStatus: "present" | "absent" | "leave" | "late";
    
    if (!record || !record.status) {
      // Auto-detect on first click
      if (teacherExpectedTime) {
        const isLate = isAttendanceLate(new Date(), teacherExpectedTime, dateStr);
        nextStatus = isLate ? "late" : "present";
      } else {
        nextStatus = "present";
      }
    } else if (record.status === "present") {
      nextStatus = "absent";
    } else if (record.status === "absent") {
      nextStatus = "leave";
    } else if (record.status === "leave") {
      nextStatus = "late";
    } else if (record.status === "late") {
      nextStatus = "present";
    } else {
      nextStatus = "present";
    }

    await handleSetStatus(nextStatus);
  };

  // compute ms until next local midnight and schedule enabling the OUT button
  const scheduleEnableAtMidnight = () => {
    try {
      if (midnightTimerRef.current) {
        clearTimeout(midnightTimerRef.current);
      }
    } catch (e) {}

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    const ms = nextMidnight.getTime() - now.getTime();
    midnightTimerRef.current = setTimeout(() => {
      setOutDisabled(false);
      midnightTimerRef.current = null;
      if (teacher) fetchAttendance(teacher.id, new Date());
    }, ms + 50);
  };

  // Watch attendance changes to determine OUT button state for today
  useEffect(() => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayRecord = attendance.find((a) => a.date === todayStr);
      if (todayRecord) {
        // Store the UUID of today's attendance row for PUT update
        setTodayAttendanceId((todayRecord as any).id || null);
        if ((todayRecord as any).out_time) {
          setOutDisabled(true);
          scheduleEnableAtMidnight();
        } else {
          setOutDisabled(false);
        }
      } else {
        setTodayAttendanceId(null);
        setOutDisabled(false);
      }
    } catch (e) {
      // ignore
    }
  }, [attendance, teacher]);

  const handleMarkOut = async () => {
    if (!teacher) return;
    if (outDisabled) return;

    // Validate that we have today's attendance record UUID
    if (!todayAttendanceId) {
      toast.error("No attendance record found. Mark IN first.");
      return;
    }

    try {
      setIsFetching(true);
      const outIso = new Date().toISOString();

      // Use PUT to update the existing attendance row with out_time
      const response = await fetch("/api/teacher-attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: todayAttendanceId,
          out_time: outIso,
        }),
      });

      if (!response.ok) throw new Error("Failed to mark OUT time");

      const updatedRecord = await response.json();

      // Update attendance state with the returned record
      setAttendance((prev) => {
        const dateStr = `${new Date().getFullYear()}-${String(
          new Date().getMonth() + 1,
        ).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
        const filtered = (prev || []).filter((a) => a.date !== dateStr);

        // Normalize date on returned record
        if (updatedRecord && updatedRecord.date) {
          try {
            const d = new Date(updatedRecord.date);
            updatedRecord.date = `${d.getFullYear()}-${String(
              d.getMonth() + 1,
            ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          } catch (e) {}
        }

        return [...filtered, updatedRecord];
      });

      toast.success("OUT time recorded");
      setOutDisabled(true);
      scheduleEnableAtMidnight();
      window.location.reload();
    } catch (error) {
      console.error("Error marking OUT:", error);
      toast.error("Failed to record OUT time");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchAttendanceRange = async (teacherId: string, option: string) => {
    try {
      setIsFetching(true);
      const { start, end } = computeRangeLocal(option);
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

  // Auth check and load teacher (using localStorage only)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      return;
    }

    setTeacher({ id: user.id, name: user.name || "Teacher" });
    setIsLoading(false);
    fetchAttendance(user.id, new Date());
    
    // Fetch teacher's expected time
    const fetchExpectedTime = async () => {
      try {
        const res = await fetch(`/api/teachers/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setTeacherExpectedTime(data.expected_time || null);
        }
      } catch (error) {
        console.error("Error fetching expected time:", error);
      }
    };
    fetchExpectedTime();
  }, []);

  const fetchAttendance = async (teacherId: string, date: Date) => {
    try {
      setIsFetching(true);
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

      // Normalize dates to local YYYY-MM-DD so comparisons with calendar work
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
    if (teacher) {
      fetchAttendance(teacher.id, newDate);
    }
  };

  const handleAttendanceToggle = async (
    date: string,
    currentStatus: "present" | "absent" | null,
  ) => {
    if (!teacher) return;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Only allow marking attendance for today
    if (date !== todayStr) {
      toast.error("You can only mark attendance for today");
      return;
    }

    try {
      const newStatus = currentStatus === "present" ? "absent" : "present";

      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      const response = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacher.id,
          date,
          status: newStatus,
          school_id: user.school_id,
        }),
      });

      if (!response.ok) throw new Error("Failed to update attendance");

      const body = await response.json();
      const raw = body.attendance || body;
      // Support both single object and array responses
      const updatedRecord = Array.isArray(raw) ? raw[0] : raw;

      // Normalize date on the returned record
      if (updatedRecord && updatedRecord.date) {
        try {
          const d = new Date(updatedRecord.date);
          updatedRecord.date = `${d.getFullYear()}-${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        } catch (e) {
          // ignore
        }
      }

      setAttendance((prev) => {
        const filtered = (prev || []).filter((a) => a.date !== date);
        return [...filtered, updatedRecord];
      });
      toast.success("Attendance updated");
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

  if (isLoading) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  // Create array of days to display
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Calculate stats
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  attendance.forEach((record) => {
    if (record.status === "present") presentCount++;
    if (record.status === "absent") absentCount++;
    if (record.status === "late") lateCount++;
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

  const isToday = (day: number) => {
    return isCurrentMonth && day === today.getDate();
  };

  const isPastDay = (day: number) => {
    if (!isCurrentMonth) return false;
    return day < today.getDate();
  };

  const getStatusColor = (record: AttendanceRecord | undefined) => {
    if (!record) return "bg-gray-200 text-gray-700"; // No record default
    if (record.status === "present") return "bg-green-500 text-white";
    if (record.status === "absent") return "bg-red-500 text-white";
    if (record.status === "leave") return "bg-gray-400 text-white";
    if (record.status === "late") return "bg-orange-500 text-white";
    return "bg-gray-200 text-gray-700";
  };

  const getStatusText = (day: number) => {
    if (isSunday(day)) return "Off";
    const record = getAttendanceRecord(day);
    if (!record) return "—";
    if (record.status === "present") return "✓";
    if (record.status === "absent") return "✗";
    if (record.status === "late") return "⏰";
    return "—";
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4 md:p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              My Attendance
            </h1>
            <p className="text-muted-foreground">
              Track your daily attendance records for the current month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              View Records
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-l-green-500">
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Present (This Month)
            </p>
            <p className="text-3xl font-bold text-foreground">{presentCount}</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500">
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Absent (This Month)
            </p>
            <p className="text-3xl font-bold text-foreground">{absentCount}</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-orange-500">
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Late (This Month)
            </p>
            <p className="text-3xl font-bold text-foreground">{lateCount}</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-blue-500">
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Working Days
            </p>
            <p className="text-3xl font-bold text-foreground">
              {daysInMonth - Math.ceil(daysInMonth / 7)}
            </p>
          </Card>
        </div>

        {/* Today's quick controls (only current date is editable) */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                — {String(new Date().getDate()).padStart(2, "0")}
              </h2>
              <p className="text-sm text-muted-foreground">
                Only today's attendance can be marked here.
              </p>
            </div>

            {/* <button
              onClick={() => {
                const leaveRecords = attendance.filter((a) => a.status === "leave");
                if (leaveRecords.length === 0) {
                  toast.info("No leave records found");
                } else {
                  // Just show a toast with count, or you can implement a dedicated view
                  toast.info(`You have ${leaveRecords.length} leave record(s)`);
                }
              }}
              disabled={!teacher || isFetching}
              className="px-3 py-2 rounded bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50 text-sm whitespace-nowrap"
            >
              📋 View Leave Reasons
            </button> */}
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Click on today's date in the calendar below</strong> to mark attendance. Each click cycles through:
              <br />✓ Present → ✗ Absent → 🏥 Leave → ⏰ Late → ✓ Present
            </p>
          </div>
        </Card>

        {/* Calendar view - show all month but only today is editable */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Monthly View
            </h3>
            <div className="flex items-center gap-4">
              <button
                disabled
                className="p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                title="Previous month (disabled)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-foreground min-w-40 text-center">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                disabled
                className="p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                title="Next month (disabled)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-xs text-foreground">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-foreground">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-xs text-foreground">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-xs text-foreground">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300"></div>
              <span className="text-xs text-foreground">Off / No Record</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div>
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
                  const today_ = isToday(day);
                  const past = isPastDay(day);

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg font-semibold text-sm flex items-center justify-center transition-all relative ${
                        !record
                          ? "bg-gray-200 text-gray-700"
                          : record.status === "present"
                            ? "bg-green-500 text-white"
                            : record.status === "absent"
                              ? "bg-red-500 text-white"
                              : record.status === "leave"
                                ? "bg-blue-500 text-white"
                                : record.status === "late"
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-200 text-gray-700"
                      } ${
                        sunday || !today_
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:shadow-md"
                      }`}
                      onClick={() => !sunday && today_ && handleGridBoxClick(day, record)}
                    >
                      <div
                        className="text-center w-full pointer-events-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (record?.status === "leave" && !sunday && today_) {
                            setSelectedLeaveRecord(record);
                            setLeaveModalOpen(true);
                          } else if (record?.status === "late" && !sunday && today_) {
                            setPendingLateAttendanceId(record.id || null);
                            setLateModalOpen(true);
                          }
                        }}
                      >
                        <div className="text-xs opacity-70">{day}</div>
                        <div className="text-base">
                          {sunday
                            ? "Off"
                            : record?.status === "present"
                              ? "✓"
                              : record?.status === "absent"
                                ? "✗"
                                : record?.status === "leave"
                                  ? "🏥"
                                  : record?.status === "late"
                                    ? "⏰"
                                    : "—"}
                        </div>
                        {/* Show approval status to teacher if set */}
                        {record && (record as any).approval_status && (
                          <div
                            className={`mt-1 text-[10px] font-semibold ${
                              (record as any).approval_status === "approved"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {(record as any).approval_status === "approved"
                              ? "Approved"
                              : "Rejected"}
                          </div>
                        )}
                      </div>

                      {record && record.status === "leave" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeaveRecord(record);
                            setLeaveModalOpen(true);
                          }}
                          title={
                            (record as any).remarks ||
                            "View / edit leave reason"
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs"
                        >
                          🛈
                        </button>
                      )}
                      
                      {record && record.status === "late" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingLateAttendanceId(record.id || null);
                            setLateModalOpen(true);
                          }}
                          title={
                            record.late_reason ||
                            "View late reason"
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs"
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
        </Card>

        {/* OUT time (today) */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's OUT</p>
              <p className="text-lg font-medium text-foreground">
                {(() => {
                  const today = new Date();
                  const dateStr = `${today.getFullYear()}-${String(
                    today.getMonth() + 1,
                  ).padStart(2, "0")}-${String(today.getDate()).padStart(
                    2,
                    "0",
                  )}`;
                  const rec = attendance.find((a) => a.date === dateStr);
                  return rec && (rec as any).out_time
                    ? formatTime((rec as any).out_time)
                    : "Not marked";
                })()}
              </p>
            </div>
            <div>
              <button
                onClick={handleMarkOut}
                disabled={outDisabled || isFetching}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  outDisabled || isFetching
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {outDisabled
                  ? "OUT Marked"
                  : isFetching
                    ? "Saving..."
                    : "Mark OUT"}
              </button>
            </div>
          </div>
        </Card>

        {selectedLeaveRecord && teacher && (
          <LeaveReasonModal
            open={leaveModalOpen}
            onOpenChange={(open) => {
              setLeaveModalOpen(open);
              if (!open) {
                setSelectedLeaveRecord(null);
              }
            }}
            recordId={selectedLeaveRecord!.id}
            table="teacher_attendance"
            type="teacher"
            name={teacher!.name}
            date={selectedLeaveRecord!.date}
            currentReason={selectedLeaveRecord!.remarks}
            approvedBy={
              (selectedLeaveRecord as any).approved_by ||
              (selectedLeaveRecord as any).rejected_by
            }
            approvalStatus={(selectedLeaveRecord as any).approval_status}
            canEdit={true}
            onReasonSaved={(recordId, reason) => {
              setAttendance((prev) =>
                prev.map((r) =>
                  r.id === recordId ? { ...r, remarks: reason } : r,
                ),
              );
            }}
          />
        )}

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
          <h3 className="font-semibold text-foreground mb-2">How to use</h3>
          <ul className="text-sm text-foreground space-y-1">
            <li>
              ✓ <strong>Today's box only:</strong> Click to toggle between
              Present and Absent (only for today)
            </li>
            <li>
              ✓ <strong>Past days:</strong> Display your recorded attendance
              (read-only, cannot modify)
            </li>
            <li>
              ✓ <strong>Future days:</strong> Cannot mark attendance for future
              dates
            </li>
            <li>
              ✓ <strong>Sundays:</strong> Marked as "Off" and cannot be changed
            </li>
            <li>
              ✓ <strong>Automatic saving:</strong> All changes are instantly
              saved to the database
            </li>
            <li>
              ✓ <strong>Month navigation:</strong> Use arrows to view previous
              or future months
            </li>
          </ul>
        </Card>

        {/* View Attendance Modal */}
        {teacher && (
          <TeacherOwnAttendanceViewModal
            open={viewModalOpen}
            onOpenChange={setViewModalOpen}
            teacherId={teacher.id}
            teacherName={teacher.name}
          />
        )}

        {/* Late Reason Modal */}
        {teacher && (() => {
          const existingRecord = attendance.find(r => r.id === pendingLateAttendanceId);
          const hasExistingReason = !!existingRecord?.late_reason;
          
          return (
            <LateReasonModal
              open={lateModalOpen}
              onOpenChange={(open) => {
                setLateModalOpen(open);
                if (!open) {
                  setPendingLateAttendanceId(null);
                }
              }}
              teacherName={teacher.name}
              attendanceDate={new Date().toLocaleDateString()}
              isAdmin={false}
              currentReason={existingRecord?.late_reason || ""}
              readOnly={hasExistingReason}
              forceClose={!hasExistingReason}
              onConfirm={async (reason) => {
                if (!pendingLateAttendanceId) return;
                
                try {
                  const response = await fetch("/api/late-reason", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      recordId: pendingLateAttendanceId,
                      table: "teacher_attendance",
                      reason,
                    }),
                  });

                  if (!response.ok) throw new Error("Failed to save late reason");

                  // Update local state
                  setAttendance((prev) =>
                    prev.map((r) =>
                      r.id === pendingLateAttendanceId
                        ? { ...r, late_reason: reason }
                        : r
                    )
                  );

                  toast.success("Late attendance recorded with reason");
                } catch (error) {
                  console.error("Error saving late reason:", error);
                  throw error;
                }
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}

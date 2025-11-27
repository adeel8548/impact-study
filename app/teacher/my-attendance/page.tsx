"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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

export default function TeacherMyAttendancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(
    null,
  );

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

  // Auth check and load teacher
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      router.push("/");
      return;
    }

    setTeacher({ id: user.id, name: user.name || "Teacher" });
    setIsLoading(false);
    fetchAttendance(user.id, new Date());
  }, [router]);

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
  attendance.forEach((record) => {
    if (record.status === "present") presentCount++;
    if (record.status === "absent") absentCount++;
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
    return "bg-gray-200 text-gray-700";
  };

  const getStatusText = (day: number) => {
    if (isSunday(day)) return "Off";
    const record = getAttendanceRecord(day);
    if (!record) return "—";
    if (record.status === "present") return "✓";
    if (record.status === "absent") return "✗";
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Attendance
          </h1>
          <p className="text-muted-foreground">
            Track your daily attendance records for the current month
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

          <Card className="p-6 border-l-4 border-l-blue-500">
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Working Days
            </p>
            <p className="text-3xl font-bold text-foreground">
              {daysInMonth - Math.ceil(daysInMonth / 7)}
            </p>
          </Card>
        </div>

        {/* Month Navigation */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col w-full  justify-between mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex flex-col md:flex-row gap-2 h-10">
                <div className="flex  items-center gap-4">
                  <button
                    onClick={() => handleMonthChange("prev")}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-foreground min-w-48">
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <button
                    onClick={() => handleMonthChange("next")}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex ml-10 md:ml-0 items-center gap-2">
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
                    onClick={() =>
                      teacher && fetchAttendanceRange(teacher.id, rangeOption)
                    }
                    disabled={isFetching}
                  >
                    {isFetching ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      "Load"
                    )}
                  </button>
                </div>
              </div>
              {/* Legend */}
              <div className="flex mt-10 md:mt-0 gap-4 mb-6 pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500"></div>
                  <span className="text-sm text-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-500"></div>
                  <span className="text-sm text-foreground">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-400 dark:bg-gray-600"></div>
                  <span className="text-sm text-foreground">
                    Off / No Record
                  </span>
                </div>
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
                        className="text-center font-semibold text-sm text-muted-foreground"
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
                      <button
                        key={day}
                        onClick={() => {
                          if (!sunday) {
                            const record = getAttendanceRecord(day);

                            // 🟦 STATUS normal mapping
                            let currentStatus: "present" | "absent" | "leave" =
                              "leave";
                            if (record?.status === "present")
                              currentStatus = "present";
                            else if (record?.status === "absent")
                              currentStatus = "absent";
                            else if (record?.status === "leave")
                              currentStatus = "leave";

                            // ✅ Ab jo bhi button click ho ga, ye 3 me se hi string jayegi
                            handleAttendanceToggle(
                              `${year}-${String(month + 1).padStart(
                                2,
                                "0",
                              )}-${String(day).padStart(2, "0")}`,
                              currentStatus,
                            );

                            window.location.reload(); // optional ✅
                          }
                        }}
                        disabled={sunday}
                        className={`aspect-square rounded-lg font-semibold text-sm flex items-center justify-center transition-all ${
                          !record
                            ? "bg-gray-200 text-gray-700"
                            : record.status === "present"
                              ? "bg-green-500 text-white"
                              : record.status === "absent"
                                ? "bg-red-500 text-white"
                                : record.status === "leave"
                                  ? "bg-gray-400 text-white"
                                  : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xs opacity-70">{day}</div>
                          <div className="text-base">
                            {sunday
                              ? "Off"
                              : record?.status === "present"
                                ? "✓"
                                : record?.status === "absent"
                                  ? "✗"
                                  : "—"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
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

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
          <h3 className="font-semibold text-foreground mb-2">How to use</h3>
          <ul className="text-sm text-foreground space-y-1">
            <li>
              ✓ <strong>Today's box:</strong> Click to toggle between Present
              and Absent
            </li>
            <li>
              ✓ <strong>Past days:</strong> Display your recorded attendance
              (read-only display, but click to update)
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
      </div>
    </div>
  );
}

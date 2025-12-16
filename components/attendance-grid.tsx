import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { LeaveReasonModal } from "./modals/leave-reason-modal";

interface AttendanceRecord {
  id?: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  status: "present" | "absent" | "leave";
  remarks?: string; // Leave reason
  // optional timestamps from server (e.g. when record was created/updated)
  created_at?: string;
  updated_at?: string;
  out_time?: string;
  approved_by?: string; // Admin who approved
  approved_at?: string; // When approval happened
  rejected_by?: string; // Admin who rejected
  rejected_at?: string; // When rejection happened
  approval_status?: "approved" | "rejected"; // approval state
}

interface AttendanceGridProps {
  records: AttendanceRecord[];
  title: string;
  onStatusChange: (
    date: string,
    status: "present" | "absent" | "leave",
  ) => void;
  daysToShow?: number;
  // If provided, the grid will start from this ISO date (YYYY-MM-DD)
  startDateIso?: string;
  // Optional min/max bounds (ISO). Prev/Next buttons disable at bounds.
  minDateIso?: string;
  maxDateIso?: string;
  // Notify parent when navigation happens so it can fetch more data if needed
  onNavigate?: (startIso: string, endIso: string) => void;
  // When true the grid will show a small timestamp under each day's cell
  // useful for admin views to see when attendance was marked.
  showTimestamps?: boolean;
  // Allow marking past dates (for admin)
  isAdmin?: boolean;
  // Type of attendance grid (student or teacher)
  type?: "student" | "teacher";
  // Name of person (for leave modal)
  personName?: string;
  // Whether user can edit leave reasons
  canEditReasons?: boolean;
  // Callback when leave icon is clicked (for admin to open leave modal)
  onLeaveIconClick?: (
    record: AttendanceRecord,
    type: "student" | "teacher",
    personName: string,
  ) => void;
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
  startDateIso,
  minDateIso,
  maxDateIso,
  onNavigate,
  showTimestamps = false,
  isAdmin = false,
  type = "student",
  personName = "Person",
  canEditReasons = true,
  onLeaveIconClick,
}: AttendanceGridProps) {
  const [startDate, setStartDate] = useState(() => {
    if (startDateIso) {
      const [y, m, d] = startDateIso.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const today = new Date();
    const date = new Date(today);
    date.setDate(date.getDate() - daysToShow + 1);
    return date;
  });

  // Leave reason modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveRecord, setSelectedLeaveRecord] =
    useState<AttendanceRecord | null>(null);

  // When props change, update startDate accordingly
  useEffect(() => {
    if (startDateIso) {
      const [y, m, d] = startDateIso.split("-").map(Number);
      setStartDate(new Date(y, m - 1, d));
      return;
    }
    const today = new Date();
    const date = new Date(today);
    date.setDate(date.getDate() - daysToShow + 1);
    setStartDate(date);
  }, [startDateIso, daysToShow]);

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
        0,
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
      date.getMonth() + 1,
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
    if (disablePrev) return;
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - daysToShow);
    // Clamp to minDate if provided
    if (minDateIso) {
      const [y, m, d] = minDateIso.split("-").map(Number);
      const minDate = new Date(y, m - 1, d);
      if (newDate < minDate) {
        setStartDate(minDate);
        return;
      }
    }
    setStartDate(newDate);

    if (onNavigate) {
      const startIso = `${newDate.getFullYear()}-${String(
        newDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
      const end = new Date(newDate);
      end.setDate(end.getDate() + daysToShow - 1);
      const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      onNavigate(startIso, endIso);
    }
  };

  const handleNextWeek = () => {
    if (disableNext) return;
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + daysToShow);
    // Clamp to maxDate if provided
    if (maxDateIso) {
      const [y, m, d] = maxDateIso.split("-").map(Number);
      const maxDate = new Date(y, m - 1, d);
      if (newDate > maxDate) {
        setStartDate(maxDate);
        return;
      }
    }
    setStartDate(newDate);

    if (onNavigate) {
      const startIso = `${newDate.getFullYear()}-${String(
        newDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
      const end = new Date(newDate);
      end.setDate(end.getDate() + daysToShow - 1);
      const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      onNavigate(startIso, endIso);
    }
  };

  const dates = generateDateRange();
  const today = now;

  // Disable nav when hitting bounds
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysToShow - 1);

  let disablePrev = false;
  if (minDateIso) {
    const [y, m, d] = minDateIso.split("-").map(Number);
    const minDate = new Date(y, m - 1, d);
    disablePrev = startDate <= minDate;
  }

  let disableNext = false;
  if (maxDateIso) {
    const [y, m, d] = maxDateIso.split("-").map(Number);
    const maxDate = new Date(y, m - 1, d);
    disableNext = endDate >= maxDate;
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            disabled={disablePrev}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            disabled={disableNext}
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
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Leave</span>
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
              date.getMonth() + 1,
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const isOff = isOffDay(date);
            const isPast = isPastDate(date);
            const isCurrent = isToday(date);
            const status = getStatus(dateStr);
            const record = getRecord(dateStr);

            return (
              <div
                key={dateStr}
                className="flex flex-col items-center gap-2 min-w-20"
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
                  <div className="w-full flex flex-col gap-1">
                    <Button
                      variant={
                        status === "present"
                          ? "default"
                          : status === "absent"
                            ? "destructive"
                            : status === "leave"
                              ? "secondary"
                              : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        let newStatus: "present" | "absent" | "leave";
                        if (status === "present") {
                          newStatus = "absent";
                        } else if (status === "absent") {
                          newStatus = "leave";
                        } else {
                          newStatus = "present";
                        }
                        onStatusChange(dateStr, newStatus);
                      }}
                      disabled={!isAdmin && isPast && !isCurrent}
                      className={`w-full h-10 text-xs ${
                        status === "present"
                          ? "bg-green-500 hover:bg-green-600"
                          : status === "absent"
                            ? "bg-red-500 hover:bg-red-600"
                            : status === "leave"
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : ""
                      }`}
                    >
                      {status === "present"
                        ? "✓ Present"
                        : status === "absent"
                          ? "✗ Absent"
                          : status === "leave"
                            ? "🏥 Leave"
                            : "—"}
                    </Button>
                    {/* Leave reason icon or approval status - show when leave is marked */}
                    {status === "leave" && record && (
                      <>
                        {record.approval_status ? (
                          // Show approved/rejected status - clickable for admin to edit
                          <button
                            onClick={() => {
                              if (onLeaveIconClick) {
                                onLeaveIconClick(record, type, personName);
                              } else {
                                setSelectedLeaveRecord(record);
                                setLeaveModalOpen(true);
                              }
                            }}
                            className={`w-full h-6 rounded text-xs font-semibold flex items-center justify-center cursor-pointer transition-all ${
                              record.approval_status === "approved"
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            title={
                              record.approval_status === "approved"
                                ? "Approved - Click to edit reason"
                                : "Rejected - Click to edit reason"
                            }
                          >
                            {record.approval_status === "approved"
                              ? "✅ Approved"
                              : "❌ Rejected"}
                          </button>
                        ) : (
                          // Show info icon for pending leave
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (onLeaveIconClick) {
                                onLeaveIconClick(record, type, personName);
                              } else {
                                setSelectedLeaveRecord(record);
                                setLeaveModalOpen(true);
                              }
                            }}
                            className="w-full h-6 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 p-0"
                            title={
                              record.remarks
                                ? "View/Edit leave reason"
                                : "Add leave reason"
                            }
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
                {/* Show timestamp for admin if requested and we have a record */}
                {showTimestamps && record && record.status !== "leave" && (
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

      {/* Leave Reason Modal */}
      {selectedLeaveRecord && (
        <LeaveReasonModal
          open={leaveModalOpen}
          onOpenChange={setLeaveModalOpen}
          recordId={selectedLeaveRecord.id || ""}
          table={
            type === "student" ? "student_attendance" : "teacher_attendance"
          }
          type={type}
          name={personName}
          date={selectedLeaveRecord.date}
          currentReason={selectedLeaveRecord.remarks}
          canEdit={canEditReasons}
        />
      )}
    </Card>
  );
}

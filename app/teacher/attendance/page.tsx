"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, Save, Loader2, Info } from "lucide-react";
import { markStudentAttendance } from "@/lib/actions/attendance";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";

interface CurrentUser {
  id: string;
  role: string;
  name?: string;
}

export default function TeacherAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const toLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()));
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, "present" | "absent" | "leave">
  >({});
  const [leaveReasons, setLeaveReasons] = useState<Record<string, string>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, { id?: string; remarks?: string }>
  >({});
  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const classesFetchedRef = useRef(false);
  const attendanceFetchKeyRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Leave reason modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedStudentForReason, setSelectedStudentForReason] = useState<{
    id: string;
    name: string;
    recordId?: string;
  } | null>(null);

  // Range filter for history
  const [historyRange, setHistoryRange] = useState<string>("last7");
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

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
      start: toLocalDate(s),
      end: toLocalDate(e),
    };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const user = JSON.parse(raw) as CurrentUser;
        setCurrentUser(user);
        if (user.id && user.role === "teacher") {
          setTeacherId(user.id);
          setTeacherName(user.name || "Teacher");
          if (!classesFetchedRef.current) {
            classesFetchedRef.current = true;
            loadTeacherClasses(user.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse currentUser from localStorage", err);
      setLoading(false);
    }
  }, []);

  const loadTeacherClasses = async (userId: string) => {
    try {
      // Fetch incharge classes via permissions
      const permsResp = await fetch(`/api/teachers/${userId}/permissions`);
      const permsData = await permsResp.json();

      // Normalize incharge ids from permissions
      const inchargeIds: string[] = Array.isArray(permsData?.incharge_class_ids)
        ? permsData.incharge_class_ids
        : permsData?.incharge_class_id
          ? [String(permsData.incharge_class_id)]
          : [];

      // ONLY show incharge classes for attendance marking
      const classesToShow = inchargeIds.filter(Boolean);

      if (classesToShow.length === 0) {
        setClasses([]);
        setSelectedClass("");
        setLoading(false);
        return;
      }

      // Fetch full class details
      const classesResp = await fetch(
        `/api/teachers/classes?teacherId=${userId}`,
      );
      const classesData = await classesResp.json();
      const allClasses: any[] = classesData?.classes || [];

      // Filter to show ONLY incharge classes
      const selectedSet = new Set(classesToShow);
      const filtered = allClasses.filter((c) => selectedSet.has(c.id));

      setClasses(filtered);
      if (filtered && filtered.length > 0) {
        setSelectedClass(filtered[0].id);
      } else {
        setSelectedClass("");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClass || !teacherId) return;
    const fetchKey = `${selectedClass}-${selectedDate}-${teacherId}`;
    if (attendanceFetchKeyRef.current === fetchKey) return;
    attendanceFetchKeyRef.current = fetchKey;
    loadClassStudents();
    loadAttendance();
  }, [selectedClass, selectedDate, teacherId]);

  const loadClassStudents = async () => {
    try {
      const response = await fetch(`/api/classes/${selectedClass}/students`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadHistoryRange = async () => {
    if (!selectedClass || !teacherId) return;
    try {
      setIsFetching(true);
      const { start, end } = computeRangeLocal(historyRange);
      const params = new URLSearchParams({
        classId: selectedClass,
        teacherId,
        startDate: start,
        endDate: end,
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to load history");
      const data = await response.json();
      const attendanceData = data.attendance || data;

      // Normalize dates
      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        try {
          const d = new Date(a.date);
          const localDate = toLocalDate(
            new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          );
          return { ...a, date: localDate };
        } catch (e) {
          return a;
        }
      });

      setHistoryRecords(normalized);
      toast.success(`Loaded ${normalized.length} records`);
    } catch (error) {
      console.error("Error loading history range:", error);
      toast.error("Failed to load history");
    } finally {
      setIsFetching(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await fetch(
        `/api/attendance?classId=${selectedClass}&teacherId=${teacherId}`,
      );
      const data = await response.json();
      const attendanceMap: Record<string, "present" | "absent" | "leave"> = {};
      const leaveMap: Record<string, string> = {};
      const meta: Record<string, { id?: string; remarks?: string }> = {};
      if (data.attendance) {
        // Normalize incoming record dates to local YYYY-MM-DD and only apply records for the selected date
        data.attendance.forEach((record: any) => {
          const rDate = new Date(record.date);
          const localDate = toLocalDate(
            new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()),
          );
          if (localDate === selectedDate) {
            attendanceMap[record.student_id] = record.status;
            meta[record.student_id] = {
              id: record.id,
              remarks: record.remarks || "",
            };
            if (record.status === "leave" && record.remarks) {
              leaveMap[record.student_id] = record.remarks;
            }
          }
        });
      }
      setAttendance(attendanceMap);
      setLeaveReasons(leaveMap);
      setAttendanceRecords(meta);
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  };

  // Display a student (rows) × date (columns) grid for loaded range
  const HistorySummary = () => {
    if (!historyRecords || historyRecords.length === 0) return null;

    // Unique dates in the range
    const uniqueDates = Array.from(
      new Set(historyRecords.map((r: any) => r.date)),
    ).sort();

    // Build map: studentId -> { name, dateStatus: Record<date, 'P'|'A'|'L'|'-'> }
    const perStudent: Record<
      string,
      { name: string; dateStatus: Record<string, 'P' | 'A' | 'L' | '-'> }
    > = {};

    // Initialize from current class students so all students appear even if no records
    students.forEach((s) => {
      perStudent[s.id] = {
        name: s.name,
        dateStatus: {},
      };
    });

    // Fill from history records
    historyRecords.forEach((r: any) => {
      const sid = r.student_id;
      if (!perStudent[sid]) {
        perStudent[sid] = { name: r.student_name || `Student ${sid}` , dateStatus: {} };
      }
      const status =
        r.status === 'present' ? 'P' : r.status === 'absent' ? 'A' : r.status === 'leave' ? 'L' : '-';
      perStudent[sid].dateStatus[r.date] = status;
    });

    // Aggregate totals for the range
    const totals = historyRecords.reduce(
      (acc, r: any) => {
        if (r.status === 'present') acc.present += 1;
        else if (r.status === 'absent') acc.absent += 1;
        else if (r.status === 'leave') acc.leaves += 1;
        return acc;
      },
      { present: 0, absent: 0, leaves: 0 },
    );

    const studentEntries = Object.entries(perStudent).sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    );

    return (
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-base">
            Attendance ({studentEntries.length} students × {uniqueDates.length} days)
          </h4>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">P</span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">A</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">L</span>
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">-</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="sticky left-0 z-10 bg-secondary text-left p-3 font-semibold">Student</th>
                {uniqueDates.map((d) => {
                  const day = d.split('-')[2];
                  return (
                    <th key={d} className="text-center p-2 font-semibold text-foreground" title={d}>
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {studentEntries.map(([sid, info]) => (
                <tr key={sid} className="border-b border-border hover:bg-secondary/40">
                  <td className="sticky left-0 bg-background p-3 font-medium text-foreground whitespace-nowrap">
                    {info.name}
                  </td>
                  {uniqueDates.map((d) => {
                    const status = info.dateStatus[d] || '-';
                    const cls =
                      status === 'P'
                        ? 'bg-green-100 text-green-700'
                        : status === 'A'
                        ? 'bg-red-100 text-red-700'
                        : status === 'L'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700';
                    return (
                      <td key={d} className="p-1 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-7 rounded font-semibold ${cls}`}>
                          {status}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Range Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-muted-foreground">Total Days</p>
            <p className="text-lg font-bold text-gray-700">{uniqueDates.length}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-muted-foreground">Total Present</p>
            <p className="text-lg font-bold text-green-600">{totals.present}</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-xs text-muted-foreground">Total Absent</p>
            <p className="text-lg font-bold text-red-600">{totals.absent}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xs text-muted-foreground">Total Leaves</p>
            <p className="text-lg font-bold text-blue-600">{totals.leaves}</p>
          </div>
        </div>
      </Card>
    );
  };

  const handleAttendanceChange = (
    studentId: string,
    status: "present" | "absent" | "leave",
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    if (status !== "leave") {
      setLeaveReasons((prev) => {
        const { [studentId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    if (Object.keys(attendance).length === 0) {
      toast.error("Please mark attendance for at least one student");
      return;
    }

    setSaving(true);
    try {
      // Only process students that were explicitly marked
      const markedStudentIds = Object.keys(attendance);

      // Save each attendance record using server action
      for (const studentId of markedStudentIds) {
        const status = attendance[studentId];
        const reason = leaveReasons[studentId] || undefined;

        const result = await markStudentAttendance(
          studentId,
          selectedClass,
          selectedDate,
          status,
          reason,
        );

        if (result.error) {
          console.error(
            `Error marking attendance for student ${studentId}:`,
            result.error,
          );
        }

        if (status === "leave") {
          setAttendanceRecords((prev) => ({
            ...prev,
            [studentId]: {
              id: prev[studentId]?.id,
              remarks: reason,
            },
          }));
        }
      }

      toast.success("Attendance saved successfully");
      // Refresh state so colors/reasons reflect saved values
      await loadAttendance();
      await loadClassStudents();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4  md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Mark Attendance
          </h1>
          <p className="text-muted-foreground">
            Mark student attendance for your assigned classes
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Select Class
              </Label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="">Choose a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Select Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                History Range
              </Label>
              <div className="flex gap-2">
                <select
                  value={historyRange}
                  onChange={(e) => setHistoryRange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last15">Last 15 days</option>
                  <option value="lastMonth">Last month</option>
                  <option value="currentMonth">Current month</option>
                  <option value="last3Months">Last 3 months</option>
                  <option value="last6Months">Last 6 months</option>
                  <option value="lastYear">Last year</option>
                </select>
                <Button
                  onClick={() => loadHistoryRange()}
                  disabled={isFetching}
                  className="min-w-fit"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHistoryRecords([]);
                    toast.success("Filter cleared");
                  }}
                  disabled={isFetching || historyRecords.length === 0}
                  className="min-w-fit"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Attendance Table + History Summary */}
        {selectedClass && (
          <>
            <HistorySummary />

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary border-b border-border">
                    <tr>
                      <th className="text-left p-4 font-semibold text-foreground">
                        Student Name
                      </th>
                      <th className="text-left p-4 font-semibold text-foreground">
                        Father Name
                      </th>
                      <th className="text-left p-4 font-semibold text-foreground">
                        Roll Number
                      </th>
                      <th className="text-left p-4 font-semibold text-foreground">
                        Class Name
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground">
                        Present
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground">
                        Absent
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground">
                        Leave
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground">
                        Leave Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-border hover:bg-secondary/50 transition-colors"
                      >
                        <td className="p-4 font-medium text-foreground">
                          {student.name}
                        </td>
                        <td className="p-4 font-medium text-foreground">
                          {student.guardian_name}
                        </td>
                        <td className="p-4 text-foreground">
                          {student.roll_number}
                        </td>

                        <td className="p-4 text-foreground text-sm font-mono bg-secondary/30 rounded px-2 py-1">
                          {classes.find((cls) => cls.id === selectedClass)
                            ?.name || "N/A"}
                        </td>

                        <td className="p-4 text-center">
                          <button
                            onClick={() =>
                              handleAttendanceChange(student.id, "present")
                            }
                            className={`w-full px-3 py-2 rounded font-semibold text-sm transition-colors ${
                              attendance[student.id] === "present"
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            ✓ Present
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() =>
                              handleAttendanceChange(student.id, "absent")
                            }
                            className={`w-full px-3 py-2 rounded font-semibold text-sm transition-colors ${
                              attendance[student.id] === "absent"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            ✗ Absent
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              handleAttendanceChange(student.id, "leave");
                              // Open leave reason modal
                              setSelectedStudentForReason({
                                id: student.id,
                                name: student.name,
                                recordId: attendanceRecords[student.id]?.id,
                              });
                              setLeaveModalOpen(true);
                            }}
                            className={`w-full px-3 py-2 rounded font-semibold text-sm transition-colors ${
                              attendance[student.id] === "leave"
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            🏥 Leave
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (attendance[student.id] !== "leave") return;
                              setSelectedStudentForReason({
                                id: student.id,
                                name: student.name,
                                recordId:
                                  attendanceRecords[student.id]?.id ||
                                  undefined,
                              });
                              setLeaveModalOpen(true);
                            }}
                            disabled={attendance[student.id] !== "leave"}
                            className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm border border-border transition-colors w-full ${
                              attendance[student.id] === "leave"
                                ? "hover:bg-secondary cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <Info className="w-4 h-4" />
                            {leaveReasons[student.id]?.length
                              ? "View / Edit"
                              : "Add Reason"}
                          </button>
                          {attendance[student.id] === "leave" &&
                            leaveReasons[student.id] && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2"></p>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {students.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No students in this class
                  </p>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Save Button */}
        {selectedClass && students.length > 0 && (
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => loadAttendance()}>
              Reset
            </Button>
            <Button
              className="gap-2 bg-primary text-primary-foreground"
              onClick={handleSaveAttendance}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Attendance
            </Button>
          </div>
        )}

        {/* Leave Reason Modal */}
        {selectedStudentForReason && (
          <LeaveReasonModal
            open={leaveModalOpen}
            onOpenChange={(open) => {
              setLeaveModalOpen(open);
              if (!open) {
                setSelectedStudentForReason(null);
              }
            }}
            recordId={
              selectedStudentForReason.recordId ||
              attendanceRecords[selectedStudentForReason.id]?.id ||
              `temp-${selectedStudentForReason.id}`
            }
            table="student_attendance"
            type="student"
            name={selectedStudentForReason.name}
            date={selectedDate}
            currentReason={leaveReasons[selectedStudentForReason.id]}
            canEdit={true}
            onReasonSaved={(recordId, reason) => {
              // Store the reason in state for temporary records
              const studentId = selectedStudentForReason.id;
              setLeaveReasons((prev) => ({
                ...prev,
                [studentId]: reason,
              }));
              setAttendanceRecords((prev) => ({
                ...prev,
                [studentId]: {
                  id: recordId.startsWith("temp-")
                    ? prev[studentId]?.id
                    : recordId,
                  remarks: reason,
                },
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}

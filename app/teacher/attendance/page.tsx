"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, Save, Loader2 } from "lucide-react";

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
  const [teacherId, setTeacherId] = useState<string>("");

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
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      router.push("/");
    } else {
      setTeacherId(user.id);
      loadTeacherClasses(user.id);
    }
  }, [router]);

  const loadTeacherClasses = async (userId: string) => {
    try {
      const response = await fetch(`/api/teachers/classes?teacherId=${userId}`);
      const data = await response.json();
      setClasses(data.classes || []);
      if (data.classes && data.classes.length > 0) {
        setSelectedClass(data.classes[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
      loadAttendance();
    }
  }, [selectedClass, selectedDate]);

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
      if (data.attendance) {
        // Normalize incoming record dates to local YYYY-MM-DD and only apply records for the selected date
        data.attendance.forEach((record: any) => {
          const rDate = new Date(record.date);
          const localDate = toLocalDate(
            new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()),
          );
          if (localDate === selectedDate) {
            attendanceMap[record.student_id] = record.status;
          }
        });
      }
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  };

  // Display a compact summary of any loaded history range
  const HistorySummary = () => {
    if (!historyRecords || historyRecords.length === 0) return null;

    // Group by date
    const byDate: Record<string, any[]> = {};
    historyRecords.forEach((r) => {
      byDate[r.date] = byDate[r.date] || [];
      byDate[r.date].push(r);
    });

    const rows = Object.keys(byDate)
      .sort((a, b) => (a < b ? -1 : 1))
      .map((date) => {
        const recs = byDate[date];
        const present = recs.filter((x: any) => x.status === "present").length;
        const absent = recs.filter((x: any) => x.status === "absent").length;
        const notMarked = recs.filter(
          (x: any) => !x.status || x.status === "notmarked",
        ).length;
        const total = recs.length;

        return (
          <div
            key={date}
            className="flex justify-between items-center py-2 px-3 border-b border-border hover:bg-secondary/30 rounded"
          >
            <div className="text-sm font-medium">{date}</div>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600 font-semibold">P: {present}</span>
              <span className="text-red-600 font-semibold">A: {absent}</span>
              <span className="text-gray-500 font-semibold">
                N: {notMarked}
              </span>
              <span className="text-muted-foreground">({total})</span>
            </div>
          </div>
        );
      });

    return (
      <Card className="p-4 mb-4">
        <h4 className="font-semibold mb-3 text-base">
          History Summary ({historyRecords.length} records)
        </h4>
        <div className="max-h-96 overflow-y-auto">{rows}</div>
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
      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        class_id: selectedClass,
        date: selectedDate,
        status: attendance[student.id] || "absent",
        teacher_id: teacherId,
        school_id: "00000000-0000-0000-0000-000000000000", // Default school ID
      }));

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: attendanceRecords }),
      });

      if (!response.ok) {
        throw new Error("Failed to save attendance");
      }

      toast.success("Attendance saved successfully");
      loadAttendance();
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
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="present"
                            checked={attendance[student.id] === "present"}
                            onChange={() =>
                              handleAttendanceChange(student.id, "present")
                            }
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="absent"
                            checked={attendance[student.id] === "absent"}
                            onChange={() =>
                              handleAttendanceChange(student.id, "absent")
                            }
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="leave"
                            checked={attendance[student.id] === "leave"}
                            onChange={() =>
                              handleAttendanceChange(student.id, "leave")
                            }
                            className="w-4 h-4 cursor-pointer"
                          />
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
      </div>
    </div>
  );
}

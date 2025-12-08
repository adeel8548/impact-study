"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AttendanceGrid } from "@/components/attendance-grid";
import { AdminAttendanceMarkingModal } from "@/components/modals/admin-attendance-marking-modal";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Calendar } from "lucide-react";
import { sortByNewest } from "@/lib/utils";
import { AttendanceRangeModal } from "@/components/modals/attendance-range-modal";

interface Class {
  id: string;
  name: string;
  teacher_id?: string;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_id: string;
  email?: string;
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
}

interface AttendanceRecord {
  id: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  status: "present" | "absent" | "leave";
  remarks?: string;
}

export default function AttendanceManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState("students");

  // Classes and Students state
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<
    AttendanceRecord[]
  >([]);
  const [studentsPastLoaded, setStudentsPastLoaded] = useState(false);

  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<
    AttendanceRecord[]
  >([]);
  const [teachersPastLoaded, setTeachersPastLoaded] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalData, setLeaveModalData] = useState<{
    recordId: string;
    type: "student" | "teacher";
    name: string;
    date: string;
    currentReason?: string;
  } | null>(null);

  // Marking modal state
  const [markingModalOpen, setMarkingModalOpen] = useState(false);
  const [markingType, setMarkingType] = useState<"teacher" | "student">(
    "teacher"
  );
  const [markingTargetId, setMarkingTargetId] = useState("");
  const [markingTargetName, setMarkingTargetName] = useState("");

  // Helper to produce local YYYY-MM-DD strings
  const toLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Date range helper: accepts option keys and optional custom dates, returns local start/end strings, day count and label
  const computeRange = (
    option: string,
    custom?: { start?: string; end?: string }
  ) => {
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (option) {
      case "last7": {
        // include today + previous 6 days (total 7 days)
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        start = new Date(end.getTime() - (7 - 1) * 24 * 60 * 60 * 1000);
        break;
      }
      case "last15": {
        // include today + previous 14 days (total 15 days)
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        start = new Date(end.getTime() - (15 - 1) * 24 * 60 * 60 * 1000);
        break;
      }
      case "lastMonth": {
        // previous calendar month
        const firstOfThisMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        end = new Date(firstOfThisMonth.getTime() - 1 * 24 * 60 * 60 * 1000); // last day of previous month
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      }
      case "currentMonth": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      }
      case "last3Months": {
        // previous three full calendar months (exclude current month)
        end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
        start = new Date(today.getFullYear(), today.getMonth() - 3, 1); // first day three months ago
        break;
      }
      case "last6Months": {
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        break;
      }
      case "lastYear": {
        // previous 12 full months excluding current month
        end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
        // start at first day 11 months before end (to include 12 months total)
        start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
        break;
      }
      case "custom": {
        if (custom && custom.start && custom.end) {
          // parse ISO date strings
          const [sy, sm, sd] = custom.start.split("-").map(Number);
          const [ey, em, ed] = custom.end.split("-").map(Number);
          start = new Date(sy, sm - 1, sd);
          end = new Date(ey, em - 1, ed);
        }
        break;
      }
      default: {
        // default to last7
        end = yesterday;
        start = new Date(end.getTime() - (7 - 1) * 24 * 60 * 60 * 1000);
      }
    }

    if (!start || !end) {
      // fallback to last7 previous days
      const e = yesterday;
      const s = new Date(e.getTime() - (7 - 1) * 24 * 60 * 60 * 1000);
      start = s;
      end = e;
    }

    // Normalize midday boundaries
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const startStr = toLocalDate(s);
    const endStr = toLocalDate(e);

    const diffMs = e.getTime() - s.getTime();
    const days = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1);

    // Label: prefer human friendly for month ranges
    let label = `${startStr} — ${endStr}`;
    if (option === "lastMonth") {
      const monthName = s.toLocaleString(undefined, { month: "long" });
      label = `${monthName} ${s.getFullYear()}`;
    } else if (option === "last3Months" || option === "last6Months") {
      const startLabel = s.toLocaleString(undefined, { month: "short" });
      const endLabel = e.toLocaleString(undefined, { month: "short" });
      label = `${startLabel} ${s.getFullYear()} — ${endLabel} ${e.getFullYear()}`;
    }

    return { start: startStr, end: endStr, days, label };
  };

  // Auth check and initial load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      router.push("/");
    } else {
      setIsLoading(false);
      loadInitialData();
    }
  }, [router]);

  // Load classes
  useEffect(() => {
    if (!isLoading) {
      fetchClasses();
    }
  }, [isLoading]);

  // Range selection for admin filters
  const [studentRange, setStudentRange] = useState<string>("last7");
  const [teacherRange, setTeacherRange] = useState<string>("last7");
  // Custom date range state (ISO YYYY-MM-DD)
  const [studentCustomStart, setStudentCustomStart] = useState<string>("");
  const [studentCustomEnd, setStudentCustomEnd] = useState<string>("");
  const [teacherCustomStart, setTeacherCustomStart] = useState<string>("");
  const [teacherCustomEnd, setTeacherCustomEnd] = useState<string>("");
  const [studentRangeModalOpen, setStudentRangeModalOpen] = useState(false);
  const [teacherRangeModalOpen, setTeacherRangeModalOpen] = useState(false);

  // Load students when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      // Load using selected student range
      fetchStudentAttendance(studentRange);
    }
  }, [selectedClass, studentRange]);

  // Load teachers attendance
  useEffect(() => {
    if (activeTab === "teachers") {
      fetchTeachers();
      // Load using selected teacher range
      fetchTeacherAttendance(teacherRange);
    }
  }, [activeTab, teacherRange]);

  const loadInitialData = async () => {
    await fetchClasses();
    await fetchTeachers();
  };

  const openLeaveReason = (
    record: AttendanceRecord | null | undefined,
    type: "student" | "teacher",
    name: string,
  ) => {
    if (!record || !record.id) return;
    setLeaveModalData({
      recordId: record.id,
      type,
      name,
      date: record.date,
      currentReason: record.remarks || "",
    });
    setLeaveModalOpen(true);
  };

  const updateLocalRemarks = (
    recordId: string,
    reason: string,
    type: "student" | "teacher",
  ) => {
    if (type === "student") {
      setStudentAttendance((prev) =>
        (prev || []).map((r) =>
          r.id === recordId ? { ...r, remarks: reason } : r,
        ),
      );
    } else {
      setTeacherAttendance((prev) =>
        (prev || []).map((r) =>
          r.id === recordId ? { ...r, remarks: reason } : r,
        ),
      );
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes");
      if (!response.ok) throw new Error("Failed to fetch classes");
      const result = await response.json();
      const classesData = result.classes || result;
      const normalized = Array.isArray(classesData)
        ? sortByNewest(classesData)
        : [];
      setClasses(normalized);
      if (normalized.length > 0 && !selectedClass) {
        setSelectedClass(normalized[0].id);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes");
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      setIsFetching(true);
      const response = await fetch(`/api/classes/${selectedClass}/students`);
      if (!response.ok) throw new Error("Failed to fetch students");
      const result = await response.json();
      const studentsData = result.students || result;
      const normalized = Array.isArray(studentsData)
        ? sortByNewest(studentsData)
        : [];
      setStudents(normalized);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch attendance for students for a computed range option or explicit custom dates
  const fetchStudentAttendance = async (
    rangeOption = "last7",
    customDates?: { start?: string; end?: string }
  ) => {
    if (!selectedClass) return;
    try {
      setIsFetching(true);
      const { start, end } =
        rangeOption === "custom" && customDates
          ? computeRange("custom", customDates)
          : computeRange(rangeOption, customDates);

      const params = new URLSearchParams({
        classId: selectedClass,
        startDate: start,
        endDate: end,
      });

      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const result = await response.json();
      const attendanceData = result.attendance || result;

      // Normalize dates to local YYYY-MM-DD and set state
      const normalized = (
        Array.isArray(attendanceData) ? attendanceData : []
      ).map((a: any) => {
        const d = new Date(a.date);
        const localDate = toLocalDate(
          new Date(d.getFullYear(), d.getMonth(), d.getDate())
        );
        return { ...a, date: localDate };
      });

      setStudentAttendance(normalized);
      setStudentsPastLoaded(true);
      toast.success(`Loaded ${normalized.length} student records`);
    } catch (error) {
      console.error("Error fetching student attendance:", error);
      toast.error("Failed to load student attendance");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers");
      if (!response.ok) throw new Error("Failed to fetch teachers");
      const result = await response.json();
      const teachersData = result.teachers || result;
      const normalized = Array.isArray(teachersData)
        ? sortByNewest(teachersData)
        : [];
      setTeachers(normalized);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    }
  };

  const fetchTeacherAttendance = async (
    rangeOption = "last7",
    customDates?: { start?: string; end?: string }
  ) => {
    try {
      setIsFetching(true);
      const { start, end } =
        rangeOption === "custom" && customDates
          ? computeRange("custom", customDates)
          : computeRange(rangeOption, customDates);

      const params = new URLSearchParams({
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
        const d = new Date(a.date);
        const localDate = toLocalDate(
          new Date(d.getFullYear(), d.getMonth(), d.getDate())
        );
        return { ...a, date: localDate };
      });

      setTeacherAttendance(normalized);
      setTeachersPastLoaded(true);
      toast.success(`Loaded ${normalized.length} teacher records`);
    } catch (error) {
      console.error("Error fetching teacher attendance:", error);
      toast.error("Failed to load teacher attendance");
    } finally {
      setIsFetching(false);
    }
  };

  const handleStudentAttendanceChange = async (
    studentId: string,
    date: string,
    status: "present" | "absent" | "leave" | null
  ) => {
    try {
      if (!status) {
        // Delete attendance locally for now
        const recordToDelete = studentAttendance.find(
          (a) => a.student_id === studentId && a.date === date
        );
        if (recordToDelete) {
          setStudentAttendance((prev) =>
            (prev || []).filter(
              (a) => !(a.student_id === studentId && a.date === date)
            )
          );
        }
        return;
      }

      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      // Check if we already have a record for this student & date
      const existing = (studentAttendance || []).find(
        (a) => a.student_id === studentId && a.date === date
      );

      let response: Response | null = null;

      if (existing && existing.id) {
        // Update existing record
        response = await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existing.id,
            status,
            remarks: status === "leave" ? existing.remarks || null : null,
          }),
        });
      } else {
        // Create a new attendance record (POST accepts batch)
        const record = {
          student_id: studentId,
          class_id: selectedClass,
          date,
          status,
          school_id: user.school_id,
        };
        response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: [record] }),
        });
      }

      if (!response || !response.ok)
        throw new Error("Failed to update attendance");

      const body = await response.json();
      const returned = body.attendance || body;

      setStudentAttendance((prev) => {
        const filtered = (prev || []).filter(
          (a) => !(a.student_id === studentId && a.date === date)
        );
        if (Array.isArray(returned)) return [...filtered, ...returned];
        return [...filtered, returned];
      });

      toast.success("Attendance updated");

      if (status === "leave") {
        const studentName =
          students.find((s) => s.id === studentId)?.name || "Student";
        const savedRecord = Array.isArray(returned)
          ? returned.find(
              (a: AttendanceRecord) =>
                a.student_id === studentId && a.date === date,
            )
          : returned;
        openLeaveReason(savedRecord, "student", studentName);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

  const handleTeacherAttendanceChange = async (
    teacherId: string,
    date: string,
    status: "present" | "absent" | "leave" | null
  ) => {
    try {
      if (!status) {
        setTeacherAttendance((prev) =>
          Array.isArray(prev)
            ? prev.filter(
                (a) => !(a.teacher_id === teacherId && a.date === date)
              )
            : []
        );
        return;
      }

      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      // POST upsert is supported server-side; send single object
      const payload = {
        teacher_id: teacherId,
        date,
        status,
        school_id: user.school_id,
      };
      const response = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update attendance");

      const body = await response.json();
      const returned = body.attendance || body;

      setTeacherAttendance((prev) => {
        const filtered = (prev || []).filter(
          (a) => !(a.teacher_id === teacherId && a.date === date)
        );
        if (Array.isArray(returned)) return [...filtered, ...returned];
        return [...filtered, returned];
      });

      toast.success("Attendance updated");

      if (status === "leave") {
        const teacherName =
          teachers.find((t) => t.id === teacherId)?.name || "Teacher";
        const savedRecord = Array.isArray(returned)
          ? returned.find(
              (a: AttendanceRecord) =>
                a.teacher_id === teacherId && a.date === date,
            )
          : returned;
        openLeaveReason(savedRecord, "teacher", teacherName);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

  const openMarkingModal = (
    type: "teacher" | "student",
    id: string,
    name: string
  ) => {
    setMarkingType(type);
    setMarkingTargetId(id);
    setMarkingTargetName(name);
    setMarkingModalOpen(true);
  };

  const handleMarked = (
    date: string,
    status: "present" | "absent" | "leave"
  ) => {
    // Refresh attendance after marking
    if (markingType === "teacher") {
      fetchTeacherAttendance(teacherRange);
    } else {
      fetchStudentAttendance(studentRange);
    }
  };

  if (isLoading) return null;

  const selectedClassObj = classes.find((c) => c.id === selectedClass);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Attendance Management
            </h1>
            <p className="text-muted-foreground">
              Mark and track daily attendance for students and teachers
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <Card className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-4 py-2 border border-border rounded-lg bg-background text-foreground w-full max-w-xs"
                  >
                    {classes?.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    className="px-2 py-1 flex items-center gap-2 border border-border rounded text-sm bg-background text-foreground"
                    onClick={() => setStudentRangeModalOpen(true)}
                    title="Open custom range picker"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <select
                    value={studentRange}
                    onChange={(e) => setStudentRange(e.target.value)}
                    className="px-3 py-1 border border-border rounded text-sm bg-background text-foreground"
                  >
                    <option value="last7">Last 7 days</option>
                    <option value="last15">Last 15 days</option>
                    <option value="lastMonth">Last month (calendar)</option>
                    <option value="currentMonth">Current month</option>
                    <option value="last3Months">Last 3 months</option>
                    <option value="last6Months">Last 6 months</option>
                    <option value="lastYear">Last year</option>
                    {/* <option value="custom">Custom range</option> */}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        isFetching
                          ? "bg-secondary text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                      onClick={() =>
                        fetchStudentAttendance(
                          studentRange,
                          studentRange === "custom"
                            ? {
                                start: studentCustomStart,
                                end: studentCustomEnd,
                              }
                            : undefined
                        )
                      }
                      disabled={
                        isFetching ||
                        (studentRange === "custom" &&
                          (!studentCustomStart || !studentCustomEnd))
                      }
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

                    {/* <div className="text-sm text-muted-foreground ml-2">
                            {(() => computeRange(studentRange, studentRange === "custom" ? { start: studentCustomStart, end: studentCustomEnd } : undefined).label)()}
                          </div> */}
                  </div>

                  {studentsPastLoaded && (
                    <button
                      className="px-3 py-1 border border-border rounded text-sm"
                      onClick={() => {
                        setStudentAttendance((prev) =>
                          prev.filter((a) => a.date === toLocalDate(new Date()))
                        );
                        setStudentsPastLoaded(false);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Card>

              {selectedClassObj && (
                <Card className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedClassObj.name} - Student Attendance
                    </h3>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex  items-center gap-3">
                        {/* Student counts for today */}
                        {(() => {
                          const today = toLocalDate(new Date());
                          const todayRecords = (
                            Array.isArray(studentAttendance)
                              ? studentAttendance
                              : []
                          ).filter((a) => a.date === today);
                          const presentCount = todayRecords.filter(
                            (r) => r.status === "present"
                          ).length;
                          const absentCount = todayRecords.filter(
                            (r) => r.status === "absent"
                          ).length;
                          const notMarked = Math.max(
                            0,
                            students.length - (presentCount + absentCount)
                          );

                          return (
                            <div className="flex gap-2 items-center">
                              <div className="text-sm">
                                <div className="text-xs text-muted-foreground">
                                  Students — Today
                                </div>
                                <div className="text-sm font-semibold">
                                  P: {presentCount} • A: {absentCount} • N:{" "}
                                  {notMarked}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {isFetching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : students.length === 0 ? (
                    <p className="text-muted-foreground">
                      No students in this class
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {students?.map((student) => {
                        const studentRecords = studentAttendance.filter(
                          (a) => a.student_id === student.id
                        );
                        return (
                          <div
                            key={student.id}
                            className="border border-border rounded-lg p-4"
                          >
                            <div className="mb-3 flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {student.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Roll #: {student.roll_number}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  openMarkingModal(
                                    "student",
                                    student.id,
                                    student.name
                                  )
                                }
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                              >
                                Mark Any Date
                              </button>
                            </div>
                            <AttendanceGrid
                              records={studentRecords}
                              title=""
                              onStatusChange={(date, status) =>
                                handleStudentAttendanceChange(
                                  student.id,
                                  date,
                                  status
                                )
                              }
                              isAdmin={true}
                              daysToShow={
                                computeRange(
                                  studentRange,
                                  studentRange === "custom"
                                    ? {
                                        start: studentCustomStart,
                                        end: studentCustomEnd,
                                      }
                                    : undefined
                                ).days
                              }
                                startDateIso={
                                  computeRange(
                                    studentRange,
                                    studentRange === "custom"
                                      ? {
                                          start: studentCustomStart,
                                          end: studentCustomEnd,
                                        }
                                      : undefined
                                  ).start
                                }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">
                    Teacher Attendance
                  </h3>

                  <div className="flex flex-col md:flex-row items-center gap-4">
                    {(() => {
                      const today = toLocalDate(new Date());
                      const todayRecords = (
                        Array.isArray(teacherAttendance)
                          ? teacherAttendance
                          : []
                      ).filter((a) => a.date === today);
                      const presentCount = todayRecords.filter(
                        (r) => r.status === "present"
                      ).length;
                      const absentCount = todayRecords.filter(
                        (r) => r.status === "absent"
                      ).length;
                      const notMarked = Math.max(
                        0,
                        teachers.length - (presentCount + absentCount)
                      );

                      return (
                        <div className="text-sm text-right">
                          <div className="text-xs text-muted-foreground">
                            Teachers — Today
                          </div>
                          <div className="text-sm font-semibold">
                            P: {presentCount} • A: {absentCount} • N:{" "}
                            {notMarked}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 flex items-center gap-2 border border-border rounded text-sm bg-background text-foreground"
                        onClick={() => setTeacherRangeModalOpen(true)}
                        title="Open custom range picker"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <select
                        value={teacherRange}
                        onChange={(e) => setTeacherRange(e.target.value)}
                        className="px-3 py-1 border border-border rounded text-sm bg-background text-foreground"
                      >
                        <option value="last7">Last 7 days</option>
                        <option value="last15">Last 15 days</option>
                        <option value="lastMonth">Last month (calendar)</option>
                        <option value="currentMonth">Current month</option>
                        <option value="last3Months">Last 3 months</option>
                        <option value="last6Months">Last 6 months</option>
                        <option value="lastYear">Last year</option>
                        {/* <option value="custom">Custom range</option> */}
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            isFetching
                              ? "bg-secondary text-muted-foreground cursor-not-allowed"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                          onClick={() =>
                            fetchTeacherAttendance(
                              teacherRange,
                              teacherRange === "custom"
                                ? {
                                    start: teacherCustomStart,
                                    end: teacherCustomEnd,
                                  }
                                : undefined
                            )
                          }
                          disabled={
                            isFetching ||
                            (teacherRange === "custom" &&
                              (!teacherCustomStart || !teacherCustomEnd))
                          }
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

                        {/* <div className="text-sm text-muted-foreground ml-2">
                          {(() =>
                            computeRange(
                              teacherRange,
                              teacherRange === "custom"
                                ? {
                                    start: teacherCustomStart,
                                    end: teacherCustomEnd,
                                  }
                                : undefined
                            ).label)()}
                        </div> */}
                      </div>

                      {teachersPastLoaded && (
                        <button
                          className="px-3 py-1 border border-border rounded text-sm"
                          onClick={() => {
                            setTeacherAttendance((prev) =>
                              prev.filter(
                                (a) => a.date === toLocalDate(new Date())
                              )
                            );
                            setTeachersPastLoaded(false);
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {teachers.length === 0 ? (
                  <p className="text-muted-foreground">No teachers found</p>
                ) : (
                  <div className="space-y-4">
                    {teachers?.map((teacher) => {
                      const teacherRecords = (
                        Array.isArray(teacherAttendance)
                          ? teacherAttendance
                          : []
                      ).filter((a) => a.teacher_id === teacher.id);
                      return (
                        <div
                          key={teacher.id}
                          className="border border-border rounded-lg p-4"
                        >
                          <div className="mb-3 flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-foreground">
                                {teacher.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {teacher.email}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                openMarkingModal(
                                  "teacher",
                                  teacher.id,
                                  teacher.name
                                )
                              }
                              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                              Mark Any Date
                            </button>
                          </div>
                          <AttendanceGrid
                            records={teacherRecords}
                            title=""
                            onStatusChange={(date, status) =>
                              handleTeacherAttendanceChange(
                                teacher.id,
                                date,
                                status
                              )
                            }
                            isAdmin={true}
                            daysToShow={
                              computeRange(
                                teacherRange,
                                teacherRange === "custom"
                                  ? {
                                      start: teacherCustomStart,
                                      end: teacherCustomEnd,
                                    }
                                  : undefined
                              ).days
                            }
                            startDateIso={
                              computeRange(
                                teacherRange,
                                teacherRange === "custom"
                                  ? {
                                      start: teacherCustomStart,
                                      end: teacherCustomEnd,
                                    }
                                  : undefined
                              ).start
                            }
                            showTimestamps={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Attendance Range Modals */}
          <AttendanceRangeModal
            open={studentRangeModalOpen}
            onOpenChange={setStudentRangeModalOpen}
            initialStart={studentCustomStart}
            initialEnd={studentCustomEnd}
            title="Student: Custom Range"
            onApply={(s, e) => {
              setStudentCustomStart(s);
              setStudentCustomEnd(e);
              setStudentRange("custom");
              fetchStudentAttendance("custom", { start: s, end: e });
            }}
          />

          <AttendanceRangeModal
            open={teacherRangeModalOpen}
            onOpenChange={setTeacherRangeModalOpen}
            initialStart={teacherCustomStart}
            initialEnd={teacherCustomEnd}
            title="Teacher: Custom Range"
            onApply={(s, e) => {
              setTeacherCustomStart(s);
              setTeacherCustomEnd(e);
              setTeacherRange("custom");
              fetchTeacherAttendance("custom", { start: s, end: e });
            }}
          />

          {/* Marking Modal */}
          <AdminAttendanceMarkingModal
            open={markingModalOpen}
            onOpenChange={setMarkingModalOpen}
            type={markingType}
            targetId={markingTargetId}
            targetName={markingTargetName}
            onMarked={handleMarked}
          />

          {leaveModalData && (
            <LeaveReasonModal
              open={leaveModalOpen}
              onOpenChange={setLeaveModalOpen}
              recordId={leaveModalData.recordId}
              table={
                leaveModalData.type === "student"
                  ? "student_attendance"
                  : "teacher_attendance"
              }
              type={leaveModalData.type}
              name={leaveModalData.name}
              date={leaveModalData.date}
              currentReason={leaveModalData.currentReason}
              canEdit={true}
              onReasonSaved={(recordId, reason) => {
                if (leaveModalData) {
                  updateLocalRemarks(recordId, reason, leaveModalData.type);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

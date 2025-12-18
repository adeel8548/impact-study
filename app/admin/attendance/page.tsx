"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AttendanceGrid } from "@/components/attendance-grid";
import { AdminAttendanceMarkingModal } from "@/components/modals/admin-attendance-marking-modal";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";
import { LateReasonModal } from "@/components/modals/late-reason-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Calendar, History } from "lucide-react";
import { sortByNewest } from "@/lib/utils";
import { AttendanceRangeModal } from "@/components/modals/attendance-range-modal";
import { AttendanceSummaryModal } from "@/components/modals/attendance-summary-modal";

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
  status: "present" | "absent" | "leave" | "late";
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  out_time?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  approval_status?: "approved" | "rejected";
  is_late?: boolean;
  late_reason?: string;
}

export default function AdminAttendancePage() {

  const [markingTargetId, setMarkingTargetId] = useState("");
  const [markingTargetName, setMarkingTargetName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<AttendanceRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<"students" | "teachers">("students");
  const [studentsPastLoaded, setStudentsPastLoaded] = useState(false);
  const [teachersPastLoaded, setTeachersPastLoaded] = useState(false);
  const [markingModalOpen, setMarkingModalOpen] = useState(false);
  const [markingType, setMarkingType] = useState<"teacher" | "student">("student");
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalData, setLeaveModalData] = useState<{
    recordId: string;
    type: "student" | "teacher";
    name: string;
    date: string;
    currentReason?: string;
    approvedBy?: string;
    approvalStatus?: "approved" | "rejected";
  } | null>(null);
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateModalData, setLateModalData] = useState<{
    recordId: string;
    type: "student" | "teacher";
    name: string;
    date: string;
    currentReason?: string;
  } | null>(null);
  const [approvedRejectReason, setApprovedRejectReason] = useState<{
    recordId: string;
    status: "approved" | "rejected";
  } | null>(null);
  const [studentExpectedTime, setStudentExpectedTime] = useState<string>("15:00");
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
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        start = new Date(end.getTime() - (7 - 1) * 24 * 60 * 60 * 1000);
      }
    }

    if (!start || !end) {
      // fallback to last7 previous days
      const e = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
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

  // Simple localStorage-based check; no AuthGuard
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      return;
    }
    setCurrentUser(user);
    setIsLoading(false);
    loadInitialData();
    fetchSchoolSettings();
  }, []);

  const fetchSchoolSettings = async () => {
    try {
      const res = await fetch(`/api/school-settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.school_start_time) {
          setStudentExpectedTime(data.settings.school_start_time);
        }
      }
    } catch (err) {
      console.error("Failed to fetch school settings:", err);
    }
  };

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
  const [studentSummaryOpen, setStudentSummaryOpen] = useState(false);
  const [teacherSummaryOpen, setTeacherSummaryOpen] = useState(false);
  const [openStudentSummaryAfterLoad, setOpenStudentSummaryAfterLoad] =
    useState(false);
  const [openTeacherSummaryAfterLoad, setOpenTeacherSummaryAfterLoad] =
    useState(false);

  // State for upcoming teacher leaves card
  const [isLoadingUpcomingLeaves, setIsLoadingUpcomingLeaves] = useState(false);
  const [upcomingTeacherLeaves, setUpcomingTeacherLeaves] = useState<AttendanceRecord[]>([]);

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) return;

    fetchStudents();

    // When using custom range, only fetch if both dates are set; otherwise default ranges apply.
    if (studentRange === "custom") {
      if (studentCustomStart && studentCustomEnd) {
        fetchStudentAttendance("custom", {
          start: studentCustomStart,
          end: studentCustomEnd,
        });
      }
      return;
    }

    fetchStudentAttendance(studentRange);
  }, [selectedClass, studentRange, studentCustomStart, studentCustomEnd]);

  // Load teachers attendance
  useEffect(() => {
    if (activeTab !== "teachers") return;

    fetchTeachers();

    if (teacherRange === "custom") {
      if (teacherCustomStart && teacherCustomEnd) {
        fetchTeacherAttendance("custom", {
          start: teacherCustomStart,
          end: teacherCustomEnd,
        });
      }
      return;
    }

    fetchTeacherAttendance(teacherRange);
  }, [activeTab, teacherRange, teacherCustomStart, teacherCustomEnd]);

  const loadInitialData = async () => {
    await fetchClasses();
    await fetchTeachers();
  };

  const openLeaveReason = (
    record: AttendanceRecord | null | undefined,
    type: "student" | "teacher",
    name: string
  ) => {
    if (!record || !record.id) return;
    setLeaveModalData({
      recordId: record.id,
      type,
      name,
      date: record.date,
      currentReason: record.remarks || "",
      // approvedBy should indicate either approved or rejected actor so teacher editing is locked
      approvedBy: (record as any).approved_by || (record as any).rejected_by,
      approvalStatus: (record as any).approval_status,
    });
    setLeaveModalOpen(true);
  };

  const updateLocalRemarks = (
    recordId: string,
    reason: string,
    type: "student" | "teacher"
  ) => {
    if (type === "student") {
      setStudentAttendance((prev) =>
        (prev || []).map((r) =>
          r.id === recordId ? { ...r, remarks: reason } : r
        )
      );
    } else {
      setTeacherAttendance((prev) =>
        (prev || []).map((r) =>
          r.id === recordId ? { ...r, remarks: reason } : r
        )
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
      if (openStudentSummaryAfterLoad) {
        setStudentSummaryOpen(true);
        setOpenStudentSummaryAfterLoad(false);
      }
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
      if (openTeacherSummaryAfterLoad) {
        setTeacherSummaryOpen(true);
        setOpenTeacherSummaryAfterLoad(false);
      }
    } catch (error) {
      console.error("Error fetching teacher attendance:", error);
      toast.error("Failed to load teacher attendance");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchUpcomingTeacherLeaves = async () => {
    try {
      setIsLoadingUpcomingLeaves(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      const params = new URLSearchParams({
        startDate: toLocalDate(startDate),
        endDate: toLocalDate(endDate),
      });

      const response = await fetch(`/api/teacher-attendance?${params}`);
      if (!response.ok) throw new Error("Failed to load upcoming leaves");
      const result = await response.json();
      const attendanceData = result.attendance || result;

      const upcoming = (Array.isArray(attendanceData) ? attendanceData : [])
        .filter((record) => record.status === "leave")
        .map((record: any) => {
          const d = new Date(record.date);
          const localDate = toLocalDate(
            new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          );
          return { ...record, date: localDate };
        })
        .sort((a: AttendanceRecord, b: AttendanceRecord) =>
          a.date.localeCompare(b.date),
        );

      setUpcomingTeacherLeaves(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming teacher leaves:", error);
      toast.error("Failed to load upcoming leave requests");
    } finally {
      setIsLoadingUpcomingLeaves(false);
    }
  };

  const handleStudentAttendanceChange = async (
    studentId: string,
    date: string,
    status: "present" | "absent" | "leave" | "late" | null
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
          school_id: currentUser?.school_id,
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
                a.student_id === studentId && a.date === date
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
    status: "present" | "absent" | "leave" | "late" | null
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

      // POST upsert is supported server-side; send single object
      const payload = {
        teacher_id: teacherId,
        date,
        status,
        school_id: currentUser?.school_id,
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
                a.teacher_id === teacherId && a.date === date
            )
          : returned;
        openLeaveReason(savedRecord, "teacher", teacherName);
        fetchUpcomingTeacherLeaves();
      } else if (status === "late") {
        const teacherName =
          teachers.find((t) => t.id === teacherId)?.name || "Teacher";
        const savedRecord = Array.isArray(returned)
          ? returned.find(
              (a: AttendanceRecord) =>
                a.teacher_id === teacherId && a.date === date
            )
          : returned;
        openLateReason(savedRecord, "teacher", teacherName);
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
    status: "present" | "absent" | "leave" | "late"
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
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                  <div className="flex gap-1">
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
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:fmt-0">
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        isFetching
                          ? "bg-secondary text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                      onClick={() => {
                        setOpenStudentSummaryAfterLoad(true);
                        fetchStudentAttendance(
                          studentRange,
                          studentRange === "custom"
                            ? {
                                start: studentCustomStart,
                                end: studentCustomEnd,
                              }
                            : undefined
                        );
                      }}
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
                        "Load "
                      )}
                    </button>

                    {/* <div className="text-sm text-muted-foreground ml-2">
                            {(() => computeRange(studentRange, studentRange === "custom" ? { start: studentCustomStart, end: studentCustomEnd } : undefined).label)()}
                          </div> */}
                    {studentsPastLoaded && (
                      <button
                        className="px-3 py-1 border border-border rounded text-sm"
                        onClick={() => {
                          setStudentAttendance((prev) =>
                            prev.filter(
                              (a) => a.date === toLocalDate(new Date())
                            )
                          );
                          setStudentsPastLoaded(false);
                        }}
                      >
                        Clear
                      </button>
                    )}
                    {studentAttendance.length > 0 && (
                      <button
                        className="px-3 py-1 border border-border rounded text-sm"
                        onClick={() => setStudentSummaryOpen(true)}
                      >
                        <History className="w-4 h-4 mr-1 inline-block" />
                      </button>
                    )}
                  </div>
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
                            (r) =>
                              r.status === "absent" ||
                              (r as any).approval_status === "rejected"
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
                              expectedTime={studentExpectedTime}
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
                              maxDateIso={toLocalDate(new Date())}
                                  onNavigate={(startIso, endIso) => {
                                    setStudentCustomStart(startIso);
                                    setStudentCustomEnd(endIso);
                                    setStudentRange("custom");
                                    setOpenStudentSummaryAfterLoad(false);
                                    fetchStudentAttendance("custom", {
                                      start: startIso,
                                      end: endIso,
                                    });
                                  }}
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
                        (r) =>
                          r.status === "absent" ||
                          (r as any).approval_status === "rejected"
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
                          onClick={() => {
                            setOpenTeacherSummaryAfterLoad(true);
                            fetchTeacherAttendance(
                              teacherRange,
                              teacherRange === "custom"
                                ? {
                                    start: teacherCustomStart,
                                    end: teacherCustomEnd,
                                  }
                                : undefined
                            );
                          }}
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
                      {teacherAttendance.length > 0 && (
                        <button
                          className="px-3 py-1 border border-border rounded text-sm"
                          onClick={() => setTeacherSummaryOpen(true)}
                        >
                         <History className="w-4 h-4 mr-1 inline-block" />
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
                            type="teacher"
                            personName={teacher.name}
                            expectedTime={teacher.expected_time}
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
                            maxDateIso={toLocalDate(new Date())}
                            showTimestamps={true}
                            onNavigate={(startIso, endIso) => {
                              setTeacherCustomStart(startIso);
                              setTeacherCustomEnd(endIso);
                              setTeacherRange("custom");
                              setOpenTeacherSummaryAfterLoad(false);
                              fetchTeacherAttendance("custom", {
                                start: startIso,
                                end: endIso,
                              });
                            }}
                            onLeaveIconClick={(record, type, personName) => {
                              if (record.id) {
                                openLeaveReason(
                                  record as AttendanceRecord,
                                  type,
                                  personName
                                );
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-4 space-y-3 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Upcoming Teacher Leave Requests
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Future leaves submitted by teachers are listed here for admin review.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchUpcomingTeacherLeaves}
                    disabled={isLoadingUpcomingLeaves}
                  >
                    Refresh
                  </Button>
                </div>

                {isLoadingUpcomingLeaves ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading leave requests...
                  </div>
                ) : upcomingTeacherLeaves.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No pending leave applications for upcoming dates.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {upcomingTeacherLeaves.map((record) => {
                      const recordTeacher =
                        teachers.find((t) => t.id === record.teacher_id);
                      const teacherName = recordTeacher?.name || "Teacher";
                      const statusLabel = record.approval_status || "pending";
                      const statusText =
                        statusLabel === "approved"
                          ? "Approved"
                          : statusLabel === "rejected"
                            ? "Rejected"
                            : "Pending admin review";
                      const statusClass =
                        statusLabel === "approved"
                          ? "text-green-600"
                          : statusLabel === "rejected"
                            ? "text-red-600"
                            : "text-orange-600";
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-foreground">
                              {teacherName}
                            </p>
                            <p className="text-xs text-muted-foreground">{record.date}</p>
                            <p className="text-xs text-foreground max-w-[240px] truncate">
                              {record.remarks || "No reason provided"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold ${statusClass}`}>
                              {statusText}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openLeaveReason(record, "teacher", teacherName)
                              }
                            >
                              Review
                            </Button>
                          </div>
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
              setOpenStudentSummaryAfterLoad(true);
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
              setOpenTeacherSummaryAfterLoad(true);
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
              approvedBy={leaveModalData.approvedBy}
              approvalStatus={leaveModalData.approvalStatus}
              canEdit={true}
              onReasonSaved={(recordId, reason) => {
                if (leaveModalData) {
                  updateLocalRemarks(recordId, reason, leaveModalData.type);
                }
              }}
              onApprovalStatusChanged={(recordId, status) => {
                setApprovedRejectReason({ recordId, status });
                // Immediately update local state to reflect approval status
                if (leaveModalData.type === "teacher") {
                  setTeacherAttendance((prev) =>
                    prev.map((record) =>
                      record.id === recordId
                        ? { ...record, approval_status: status }
                        : record
                    )
                  );
                  // Also refresh upcoming leaves card
                  fetchUpcomingTeacherLeaves();
                } else if (leaveModalData.type === "student") {
                  setStudentAttendance((prev) =>
                    prev.map((record) =>
                      record.id === recordId
                        ? { ...record, approval_status: status }
                        : record
                    )
                  );
                }
              }}
            />
          )}
          {lateModalData && (
            <LateReasonModal
              open={lateModalOpen}
              onOpenChange={setLateModalOpen}
              teacherName={lateModalData.name}
              attendanceDate={lateModalData.date}
              isAdmin={true}
              currentReason={lateModalData.currentReason}
              onConfirm={async (reason) => {
                try {
                  // Update the late_reason in the database
                  const table =
                    lateModalData.type === "student"
                      ? "student_attendance"
                      : "teacher_attendance";

                  const response = await fetch("/api/late-reason", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      recordId: lateModalData.recordId,
                      table,
                      reason,
                    }),
                  });

                  if (!response.ok) throw new Error("Failed to save late reason");

                  // Update local state
                  if (lateModalData.type === "student") {
                    setStudentAttendance((prev) =>
                      (prev || []).map((r) =>
                        r.id === lateModalData.recordId
                          ? { ...r, late_reason: reason }
                          : r
                      )
                    );
                  } else {
                    setTeacherAttendance((prev) =>
                      (prev || []).map((r) =>
                        r.id === lateModalData.recordId
                          ? { ...r, late_reason: reason }
                          : r
                      )
                    );
                  }
                } catch (error) {
                  console.error("Error saving late reason:", error);
                  throw error;
                }
              }}
            />
          )}
        </div>
      </div>
      {/* Summary Modals */}
      <AttendanceSummaryModal
        open={studentSummaryOpen}
        onOpenChange={setStudentSummaryOpen}
        type="student"
        title="Student Attendance Summary"
        records={studentAttendance}
        people={students}
        label={(() => {
          // Compose simple label from current range selection
          const r =
            studentRange === "custom"
              ? computeRange("custom", {
                  start: studentCustomStart,
                  end: studentCustomEnd,
                })
              : computeRange(studentRange);
          return r.label;
        })()}
      />
      <AttendanceSummaryModal
        open={teacherSummaryOpen}
        onOpenChange={setTeacherSummaryOpen}
        type="teacher"
        title="Teacher Attendance Summary"
        records={teacherAttendance}
        people={teachers}
        label={(() => {
          const r =
            teacherRange === "custom"
              ? computeRange("custom", {
                  start: teacherCustomStart,
                  end: teacherCustomEnd,
                })
              : computeRange(teacherRange);
          return r.label;
        })()}
      />
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface StudyScheduleEntry {
  id: string;
  day: number;
  class_id?: string;
  class_name?: string;
  subject_id?: string;
  subject: string;
  chapter: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
  teacher_id?: string;
  teacher_name?: string;
  max_marks?: number;
  series_name: string;
  schedule_date?: string;
  start_time?: string;
  end_time?: string;
}

interface TeacherRow {
  id: string;
  name: string;
  email?: string;
}

interface ClassRow {
  id: string;
  name: string;
}

interface SubjectRow {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];

function parseDateTime(date?: string, time?: string) {
  if (!date || !time) return null;
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const dt = new Date(`${date}T${normalizedTime}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function nextDate(date: string) {
  const dt = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return date;
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split("T")[0] || date;
}

function computeStatusByTiming(entry: {
  status: "Pending" | "In Progress" | "Completed";
  schedule_date?: string;
  start_time?: string;
  end_time?: string;
}) {
  const now = Date.now();
  const startAt = parseDateTime(entry.schedule_date, entry.start_time);
  const endAt = parseDateTime(entry.schedule_date, entry.end_time);
  if (!startAt || !endAt) return entry.status;
  if (now < startAt.getTime()) return "Pending" as const;
  if (now >= startAt.getTime() && now < endAt.getTime()) return "In Progress" as const;
  return "Completed" as const;
}


export default function StudySchedulePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [entries, setEntries] = useState<StudyScheduleEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("none");
  const [selectedSeriesOption, setSelectedSeriesOption] = useState<string>("new");
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [newChapter, setNewChapter] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newSeriesName, setNewSeriesName] = useState<string>("");
  const [newMaxMarks, setNewMaxMarks] = useState<string>("100");
  const [newScheduleDate, setNewScheduleDate] = useState<string>(
    new Date().toISOString().split("T")[0] || "",
  );
  const [newStartTime, setNewStartTime] = useState<string>("15:00");
  const [newEndTime, setNewEndTime] = useState<string>("16:00");

  const seriesOptions = useMemo(() => {
    return Array.from(
      new Set(
        entries
          .filter((e) => {
            if (!selectedClassFilter || selectedClassFilter === "all") return true;
            return e.class_id === selectedClassFilter;
          })
          .map((e) => e.series_name),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [entries, selectedClassFilter]);

  const selectedSubjectName = useMemo(() => {
    return subjects.find((s) => s.id === newSubjectId)?.name || "";
  }, [subjects, newSubjectId]);

  const classNameLookup = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes],
  );

  const filteredEntries = useMemo(() => {
    if (!selectedClassFilter || selectedClassFilter === "all") return entries;
    return entries.filter((e) => e.class_id === selectedClassFilter);
  }, [entries, selectedClassFilter]);

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoadingClasses(true);
        const res = await fetch("/api/classes", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load classes");
        const body = await res.json();
        const list = Array.isArray(body.classes)
          ? body.classes
          : Array.isArray(body.data)
          ? body.data
          : [];
        setClasses(list);
        if (list.length > 0) {
          const class10 = list.find((c: ClassRow) => {
            const name = c.name.toLowerCase();
            return name.includes("class 10") || name.includes("10");
          });
          const defaultClassId = (class10 || list[0]).id;
          setSelectedClass(defaultClassId);
          setSelectedClassFilter(defaultClassId);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load classes");
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // Load subjects based on selected class
  useEffect(() => {
    if (!selectedClass) {
      setSubjects([]);
      setNewSubjectId("");
      return;
    }

    const loadSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        const res = await fetch(`/api/classes/${selectedClass}/subjects`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load subjects");
        const body = await res.json();
        const list = Array.isArray(body.subjects) ? body.subjects : [];
        setSubjects(list);
        if (list.length > 0) {
          setNewSubjectId(list[0].id);
        } else {
          setNewSubjectId("");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load subjects");
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClass]);

  // Load teachers on mount
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        setIsLoadingTeachers(true);
        const res = await fetch("/api/teachers", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load teachers");
        const body = await res.json();
        const list = Array.isArray(body.teachers) ? body.teachers : body;
        setTeachers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load teachers");
      } finally {
        setIsLoadingTeachers(false);
      }
    };

    loadTeachers();
  }, []);

  // Load study schedule entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoadingEntries(true);
        const res = await fetch("/api/study-schedule", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load entries");
        const body = await res.json();
        const list = Array.isArray(body.data) ? body.data : [];
        setEntries(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load study schedule");
      } finally {
        setIsLoadingEntries(false);
      }
    };

    loadEntries();
  }, []);

  const autoRefreshStatuses = useCallback(async () => {
    const changed = entries
      .map((entry) => ({
        entry,
        nextStatus: computeStatusByTiming(entry),
      }))
      .filter(({ entry, nextStatus }) => entry.status !== nextStatus);

    if (changed.length === 0) return;

    const changedMap = new Map(changed.map(({ entry, nextStatus }) => [entry.id, nextStatus]));
    setEntries((prev) =>
      prev.map((entry) =>
        changedMap.has(entry.id)
          ? { ...entry, status: changedMap.get(entry.id)! }
          : entry,
      ),
    );

    await Promise.all(
      changed.map(({ entry, nextStatus }) =>
        fetch("/api/study-schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entry.id, status: nextStatus }),
        }).catch((err) => {
          console.error("Status auto-refresh failed:", err);
        }),
      ),
    );
  }, [entries]);

  useEffect(() => {
    void autoRefreshStatuses();
    const interval = window.setInterval(() => {
      void autoRefreshStatuses();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoRefreshStatuses]);

  // Add new entry
  const handleAddEntry = useCallback(async () => {
    const resolvedSeriesName =
      selectedSeriesOption === "new"
        ? newSeriesName.trim()
        : selectedSeriesOption;

    if (
      !selectedClass ||
      !newSubjectId ||
      !newChapter.trim() ||
      !resolvedSeriesName ||
      !newScheduleDate ||
      !newStartTime ||
      !newEndTime
    ) {
      toast.error("Please fill class, series, subject, chapter, date and time");
      return;
    }

    const parsedMax = Number(newMaxMarks);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      toast.error("Please enter valid total marks");
      return;
    }

    if (newStartTime >= newEndTime) {
      toast.error("End time must be after start time");
      return;
    }

    const startAt = parseDateTime(newScheduleDate, newStartTime);
    const endAt = parseDateTime(newScheduleDate, newEndTime);
    if (!startAt || !endAt || endAt <= startAt) {
      toast.error("Invalid date/time. End time must be after start time");
      return;
    }

    const seriesKey = resolvedSeriesName.toLowerCase();
    const seriesEntries = entries.filter(
      (e) =>
        e.class_id === selectedClass &&
        e.series_name.trim().toLowerCase() === seriesKey,
    );
    const nextDay =
      seriesEntries.length > 0
        ? Math.max(...seriesEntries.map((e) => e.day)) + 1
        : 1;

    const payload = {
      day: nextDay,
      class_id: selectedClass,
      subject_id: newSubjectId,
      subject: selectedSubjectName,
      chapter: newChapter,
      description: newDescription,
      teacher_id: selectedTeacher !== "none" ? selectedTeacher : null,
      max_marks: parsedMax,
      series_name: resolvedSeriesName,
      schedule_date: newScheduleDate,
      start_time: newStartTime,
      end_time: newEndTime,
    };

    try {
      setIsAddingEntry(true);
      const res = await fetch("/api/study-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to add entry");
      }

      const created = body.data as StudyScheduleEntry;
      setEntries((prev) => [
        {
          ...created,
          class_name: classNameLookup[created.class_id || ""],
        },
        ...prev,
      ]);
      setSelectedTeacher("none");
      setNewScheduleDate(nextDate(newScheduleDate));
      setNewStartTime("15:00");
      setNewEndTime("16:00");
      setNewMaxMarks("100");
      setNewChapter("");
      setNewDescription("");
      if (selectedSeriesOption === "new") {
        setSelectedSeriesOption(resolvedSeriesName);
      }
      toast.success("Entry added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add entry");
    } finally {
      setIsAddingEntry(false);
    }
  }, [
    entries,
    selectedSeriesOption,
    selectedClass,
    newSubjectId,
    selectedSubjectName,
    newChapter,
    newDescription,
    newMaxMarks,
    newSeriesName,
    newScheduleDate,
    newStartTime,
    newEndTime,
    selectedTeacher,
    classNameLookup,
  ]);

  // Delete entry
  const handleDeleteEntry = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/study-schedule?id=${id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to delete entry");
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete entry");
    }
  }, []);

  // Update status
  const handleUpdateStatus = useCallback(
    (id: string, newStatus: "Pending" | "In Progress" | "Completed") => {
      const existing = entries.find((e) => e.id === id);
      if (!existing) return;

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)),
      );

      fetch("/api/study-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body?.success) {
          throw new Error(body?.error || "Failed to update status");
        }
      }).catch((err) => {
        console.error(err);
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: existing.status } : e)),
        );
        toast.error("Failed to update status");
      });
    },
    [entries]
  );

  // Update teacher for entry
  const handleUpdateTeacher = useCallback((id: string, teacherId?: string) => {
    const teacherName = teacherId
      ? teachers.find((t) => t.id === teacherId)?.name
      : undefined;

    const existing = entries.find((e) => e.id === id);
    if (!existing) return;

    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              teacher_id: teacherId,
              teacher_name: teacherName,
            }
          : e,
      ),
    );

    fetch("/api/study-schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, teacher_id: teacherId || null }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to update teacher");
      }
    }).catch((err) => {
      console.error(err);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? existing : e)),
      );
      toast.error("Failed to update teacher");
    });
  }, [teachers]);

  const handleLocalEntryChange = useCallback(
    (id: string, key: "schedule_date" | "start_time" | "end_time", value: string) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                [key]: value,
              }
            : entry,
        ),
      );
    },
    [],
  );

  const handlePersistScheduleTiming = useCallback(async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    if (!entry.schedule_date || !entry.start_time || !entry.end_time) {
      return;
    }

    if (entry.start_time >= entry.end_time) {
      toast.error("End time must be after start time");
      return;
    }

    const startAt = parseDateTime(entry.schedule_date, entry.start_time);
    const endAt = parseDateTime(entry.schedule_date, entry.end_time);
    if (!startAt || !endAt || endAt <= startAt) {
      toast.error("Invalid date/time. End time must be after start time");
      return;
    }

    const computedStatus = computeStatusByTiming(entry);

    try {
      const res = await fetch("/api/study-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          schedule_date: entry.schedule_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          status: computedStatus,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to update schedule");
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: computedStatus,
              }
            : e,
        ),
      );
      toast.success("Schedule updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update schedule");
    }
  }, [entries]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headers = [
      "Day",
      "Class",
      "Series",
      "Date",
      "Start Time",
      "End Time",
      "Subject",
      "Chapter",
      "Total Marks",
      "Description",
      "Status",
      "Teacher",
    ];
    const rows = filteredEntries.map((e) => [
      e.day,
      e.class_name || classNameLookup[e.class_id || ""] || "",
      e.series_name,
      e.schedule_date || "",
      e.start_time || "",
      e.end_time || "",
      e.subject,
      e.chapter,
      e.max_marks ?? "",
      e.description || "",
      e.status,
      e.teacher_name || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `study-schedule-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Schedule exported as CSV");
  }, [filteredEntries, classNameLookup, selectedClass]);

  // Get summary stats
  const stats = useMemo(() => {
    return {
      total: filteredEntries.length,
      completed: filteredEntries.filter((e) => e.status === "Completed").length,
      inProgress: filteredEntries.filter((e) => e.status === "In Progress").length,
      pending: filteredEntries.filter((e) => e.status === "Pending").length,
    };
  }, [filteredEntries]);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-semibold">Study Schedule</h1>
              <p className="text-sm text-muted-foreground">
                Create and manage your academy's study plan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsAddModalOpen(true);
                if (seriesOptions.length > 0) {
                  setSelectedSeriesOption(seriesOptions[0]);
                  setNewSeriesName(seriesOptions[0]);
                } else {
                  setSelectedSeriesOption("new");
                }
                if (classes.length > 0 && !selectedClass) {
                  setSelectedClass(classes[0].id);
                }
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Class Filter</label>
            <div className="w-full max-w-xs">
              <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Entries", value: stats.total, color: "bg-blue-50" },
            { label: "Completed", value: stats.completed, color: "bg-green-50" },
            { label: "In Progress", value: stats.inProgress, color: "bg-yellow-50" },
            { label: "Pending", value: stats.pending, color: "bg-red-50" },
          ].map((stat) => (
            <Card key={stat.label} className={`p-4 ${stat.color}`}>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Add Entry Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <h2 className="font-semibold text-lg">Add New Entry</h2>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class *</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Series *</label>
                  <Select
                    value={selectedSeriesOption}
                    onValueChange={(value) => {
                      setSelectedSeriesOption(value);
                      if (value !== "new") {
                        setNewSeriesName(value);
                      } else {
                        setNewSeriesName("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing series or create new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Create New Series</SelectItem>
                      {seriesOptions.map((series) => (
                        <SelectItem key={series} value={series}>
                          {series}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Series Name *</label>
                  <Input
                    placeholder="e.g., Series One"
                    value={newSeriesName}
                    onChange={(e) => {
                      setNewSeriesName(e.target.value);
                      setSelectedSeriesOption("new");
                    }}
                    disabled={selectedSeriesOption !== "new"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject *</label>
                  <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Chapter Name *</label>
                  <Input
                    placeholder="e.g., Algebra Basics"
                    value={newChapter}
                    onChange={(e) => setNewChapter(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Marks *</label>
                  <Input
                    type="number"
                    min="1"
                    value={newMaxMarks}
                    onChange={(e) => setNewMaxMarks(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time *</label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time *</label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teacher (Optional)</label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Input
                    placeholder="Add any notes or details..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEntry}
                  disabled={
                    isAddingEntry ||
                    isLoadingTeachers ||
                    isLoadingClasses ||
                    isLoadingSubjects
                  }
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingEntry ? "Adding..." : "Add Entry"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Schedule Table */}
        <Card className="p-6 overflow-x-auto">
          <h2 className="font-semibold text-lg mb-4">Study Schedule</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Day</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEntries ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Loading schedule...
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No entries for selected class.
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const sortedEntries = [...filteredEntries].sort((a, b) => {
                    const classA = classNameLookup[a.class_id || ""] || a.class_name || "";
                    const classB = classNameLookup[b.class_id || ""] || b.class_name || "";
                    if (classA !== classB) return classA.localeCompare(classB);
                    if (a.series_name !== b.series_name) {
                      return a.series_name.localeCompare(b.series_name);
                    }
                    if ((a.schedule_date || "") !== (b.schedule_date || "")) {
                      return (a.schedule_date || "").localeCompare(b.schedule_date || "");
                    }
                    return a.day - b.day;
                  });

                  let lastClassName = "";

                  return sortedEntries.map((entry) => {
                    const className =
                      entry.class_name || classNameLookup[entry.class_id || ""] || "Unknown Class";
                    const showClassHeader = className !== lastClassName;
                    lastClassName = className;

                    return (
                      <React.Fragment key={entry.id}>
                        {showClassHeader && (
                          <TableRow className="bg-blue-50/70">
                            <TableCell colSpan={12} className="font-semibold text-blue-800">
                              {className}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="hover:bg-muted/50">
                          <TableCell className="font-semibold text-blue-600">
                            {entry.day}
                          </TableCell>
                          <TableCell>{className}</TableCell>
                          <TableCell className="font-medium text-sm text-purple-600">
                            {entry.series_name}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              className="h-8 text-xs w-36"
                              value={entry.schedule_date || ""}
                              onChange={(e) =>
                                handleLocalEntryChange(entry.id, "schedule_date", e.target.value)
                              }
                              onBlur={() => handlePersistScheduleTiming(entry.id)}
                            />
                          </TableCell>
                          <TableCell className="space-y-2">
                            <Input
                              type="time"
                              className="h-8 text-xs w-28"
                              value={entry.start_time || ""}
                              onChange={(e) =>
                                handleLocalEntryChange(entry.id, "start_time", e.target.value)
                              }
                              onBlur={() => handlePersistScheduleTiming(entry.id)}
                            />
                            <Input
                              type="time"
                              className="h-8 text-xs w-28"
                              value={entry.end_time || ""}
                              onChange={(e) =>
                                handleLocalEntryChange(entry.id, "end_time", e.target.value)
                              }
                              onBlur={() => handlePersistScheduleTiming(entry.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{entry.subject}</TableCell>
                          <TableCell>{entry.chapter}</TableCell>
                          <TableCell>{entry.max_marks ?? "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {entry.description || "—"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.teacher_id || "none"}
                              onValueChange={(value) =>
                                handleUpdateTeacher(entry.id, value === "none" ? undefined : value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-32">
                                <SelectValue placeholder="No teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Teacher</SelectItem>
                                {teachers.map((teacher) => (
                                  <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.status}
                              onValueChange={(value) =>
                                handleUpdateStatus(entry.id, value as any)
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-xs w-32 ${
                                  entry.status === "Completed"
                                    ? "bg-green-50 border-green-200"
                                    : entry.status === "In Progress"
                                    ? "bg-yellow-50 border-yellow-200"
                                    : "bg-red-50 border-red-200"
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-500 hover:text-red-700 transition"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Export Instructions */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-sm mb-2">💡 Export & Share</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Click "Export CSV" to download schedule for Excel, Notion, or ClickUp</li>
            <li>• Day numbers auto-increment within each series</li>
            <li>• Date and time are editable for rescheduling</li>
            <li>• If end time passes, status auto-updates to Completed</li>
            <li>• Change status (Pending/In Progress/Completed) from dropdown</li>
            <li>• Assign teachers from dropdown menu</li>
            <li>• Delete entries using the trash icon</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}

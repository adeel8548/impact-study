"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, Calendar } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface TimetableEntry {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  subjects?: string[];
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  teacher_name?: string;
  class_name?: string;
  subject_name?: string;
}

const DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];
const TIME_SLOTS = [
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00", "18:30",
  "19:00"
];

const formatTo12Hour = (time: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  if (Number.isNaN(hour) || !minuteStr) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = ((hour + 11) % 12) + 1;
  return `${adjustedHour.toString().padStart(2, "0")}:${minuteStr} ${period}`;
};

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [pageErrors, setPageErrors] = useState<string[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("15:30");
  const [roomNumber, setRoomNumber] = useState("");

  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<number | "all">("all");
  const [filterTime, setFilterTime] = useState<string>("all");

  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkRoomNumber, setBulkRoomNumber] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("");
  const [bulkEndTime, setBulkEndTime] = useState("");
  const [bulkTimeFilter, setBulkTimeFilter] = useState<string>("all");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const resolveTeacherName = (entry: TimetableEntry) =>
    entry.teacher_name || teachers.find((t) => t.id === entry.teacher_id)?.name || "Teacher";

  const resolveClassName = (entry: TimetableEntry) =>
    entry.class_name || classes.find((c) => c.id === entry.class_id)?.name || "Class";

  const resolveSubjectName = (entry: TimetableEntry) =>
    entry.subject_name || subjects.find((s) => s.id === entry.subject_id)?.name || "Subject";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const requests = [
        { key: "teachers", promise: fetch(`/api/teachers`) },
        { key: "classes", promise: fetch(`/api/classes`) },
        { key: "subjects", promise: fetch(`/api/subjects`) },
        { key: "timetable", promise: fetch(`/api/timetable`) },
      ];

      const settled = await Promise.allSettled(requests.map(r => r.promise));
      const errs: string[] = [];

      const getBody = async (res: Response) => {
        try {
          const txt = await res.text();
          try {
            return JSON.parse(txt);
          } catch {
            return { error: txt || "Unexpected error" };
          }
        } catch {
          return { error: "Unexpected error" };
        }
      };

      let teachersData: any = { teachers: [] };
      let classesData: any = { classes: [] };
      let subjectsData: any = { subjects: [] };
      let timetableData: any = { timetable: [] };

      for (let i = 0; i < settled.length; i++) {
        const reqKey = requests[i].key;
        const result = settled[i];
        if (result.status === "fulfilled") {
          const res = result.value as Response;
          if (!res.ok) {
            const body = await getBody(res);
            const msg = body?.error || body?.message || `Failed to load ${reqKey}`;
            toast.error(`${reqKey.toUpperCase()} error: ${msg}`);
            errs.push(`${reqKey.toUpperCase()} error: ${msg}`);
          } else {
            const body = await getBody(res);
            if (reqKey === "teachers") teachersData = body;
            if (reqKey === "classes") classesData = body;
            if (reqKey === "subjects") subjectsData = body;
            if (reqKey === "timetable") timetableData = body;
          }
        } else {
          const msg = `${reqKey.toUpperCase()} error: ${result.reason?.message || "Request failed"}`;
          toast.error(msg);
          errs.push(msg);
        }
      }

      setTeachers(teachersData.teachers || []);
      setClasses(classesData.classes || []);
      setSubjects(subjectsData.subjects || []);
      const normalized = (timetableData.timetable || []).map((t: any) => ({
        ...t,
        start_time: (t.start_time || "").slice(0, 5),
        end_time: (t.end_time || "").slice(0, 5),
      }));
      setTimetable(normalized);
      setPageErrors(errs);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load timetable data");
      setPageErrors(["Failed to load timetable data"]);
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects for selected class (supports class_id or class_ids array)
  const getSubjectsForClass = () => {
    if (!selectedClass) return subjects;
    return subjects.filter((s: any) => {
      if ((s as any).class_id && (s as any).class_id === selectedClass) return true;
      if (Array.isArray((s as any).class_ids) && (s as any).class_ids.includes(selectedClass)) return true;
      return false;
    });
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setSelectedTeacher("");
    setSelectedClass("");
    setSelectedSubject("");
    setSelectedSubjects([]);
    setSelectedDay(1);
    setSelectedDays([]);
    setStartTime("15:00");
    setEndTime("15:30");
    setRoomNumber("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setSelectedTeacher(entry.teacher_id);
    setSelectedClass(entry.class_id);
    setSelectedSubject("");
    setSelectedSubjects(entry.subjects && entry.subjects.length > 0 ? entry.subjects : (entry.subject_id ? [entry.subject_id] : []));
    setSelectedDay(entry.day_of_week);
    setStartTime(entry.start_time);
    setEndTime(entry.end_time);
    setRoomNumber(entry.room_number || "");
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTeacher || !selectedClass) {
      toast.error("Please select teacher and class");
      setFormError("Please select teacher and class");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      setFormError("End time must be after start time");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      if (editingEntry) {
        // Update flow: allow multiple subjects on a single slot
        const subjectsToUse = selectedSubjects.length > 0 ? selectedSubjects : (selectedSubject ? [selectedSubject] : []);
        if (subjectsToUse.length === 0) {
          toast.error("Please select at least one subject");
          setFormError("Please select at least one subject");
          setSaving(false);
          return;
        }
        const payload = {
          id: editingEntry.id,
          teacher_id: selectedTeacher,
          class_id: selectedClass,
          subjects: subjectsToUse,
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          room_number: roomNumber || null,
        };
        const response = await fetch("/api/timetable", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const txt = await response.text();
          let serverMsg = "Failed to save lecture";
          try {
            const json = JSON.parse(txt || "{}");
            serverMsg = json.error || json.message || serverMsg;
          } catch {
            serverMsg = txt || serverMsg;
          }
          if (serverMsg === "Failed to save lecture") {
            serverMsg = "Could not save lecture. Possible conflict with another lecture.";
          }
          throw new Error(serverMsg);
        }
        toast.success("Lecture updated successfully");
      } else {
        // Create flow: one slot per selected day, with multiple subjects in array
        const subjectsToUse = selectedSubjects.length > 0 ? selectedSubjects : (selectedSubject ? [selectedSubject] : []);
        const daysToUse = selectedDays.length > 0 ? selectedDays : (selectedDay ? [selectedDay] : []);
        if (subjectsToUse.length === 0) {
          toast.error("Please select at least one subject");
          setFormError("Please select at least one subject");
          setSaving(false);
          return;
        }
        if (daysToUse.length === 0) {
          toast.error("Please select at least one day");
          setFormError("Please select at least one day");
          setSaving(false);
          return;
        }
        let created = 0;
        let failed = 0;
        for (const day of daysToUse) {
          const payload = {
            teacher_id: selectedTeacher,
            class_id: selectedClass,
            subjects: subjectsToUse,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            room_number: roomNumber || null,
          };
          const response = await fetch("/api/timetable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            failed++;
            const txt = await response.text();
            let serverMsg = "Failed to save lecture";
            try {
              const json = JSON.parse(txt || "{}");
              serverMsg = json.error || json.message || serverMsg;
            } catch {
              serverMsg = txt || serverMsg;
            }
            toast.error(serverMsg);
          } else {
            created++;
          }
        }
        if (created > 0 && failed === 0) toast.success("Lectures added successfully");
        else if (created > 0 && failed > 0) toast.success(`Added ${created} lecture(s), ${failed} failed`);
        else toast.error("Failed to add lectures");
      }
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving lecture:", error);
      toast.error(error.message || "Failed to save lecture");
      setFormError(error.message || "Failed to save lecture");
    } finally {
      setSaving(false);
    }
  };

  // Reset subject when class changes to avoid stale selection
  useEffect(() => {
    const available = getSubjectsForClass();
    if (selectedSubject && !available.find((s) => s.id === selectedSubject)) {
      setSelectedSubject("");
    }
  }, [selectedClass]);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/timetable?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const txt = await response.text();
        let serverMsg = "Failed to delete lecture";
        try {
          const json = JSON.parse(txt || "{}");
          serverMsg = json.error || json.message || serverMsg;
        } catch {
          serverMsg = txt || serverMsg;
        }
        throw new Error(serverMsg);
      }

      toast.success("Lecture deleted successfully");
      setDeleteOpen(false);
      setDeleteEntry(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting lecture:", error);
      toast.error(error.message || "Failed to delete lecture");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkRoomNumber && !bulkStartTime && !bulkEndTime) {
      toast.error("Please enter at least one field to update");
      return;
    }

    if (bulkStartTime && bulkEndTime && bulkStartTime >= bulkEndTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setBulkUpdating(true);

      // Find all entries matching the selected teacher and class
      let entriesToUpdate = timetable.filter(
        (entry) =>
          entry.teacher_id === filterTeacher && entry.class_id === filterClass
      );

      // If time filter is selected, only update that specific time slot
      if (bulkTimeFilter !== "all") {
        entriesToUpdate = entriesToUpdate.filter(
          (entry) => entry.start_time === bulkTimeFilter
        );
      }

      if (entriesToUpdate.length === 0) {
        toast.error("No lectures found for the selected filters");
        setBulkUpdating(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Update each entry
      for (const entry of entriesToUpdate) {
        const payload: any = {
          id: entry.id,
          teacher_id: entry.teacher_id,
          class_id: entry.class_id,
          subjects: entry.subjects || (entry.subject_id ? [entry.subject_id] : []),
          day_of_week: entry.day_of_week,
          start_time: bulkStartTime || entry.start_time,
          end_time: bulkEndTime || entry.end_time,
          room_number: bulkRoomNumber || entry.room_number || null,
        };

        const response = await fetch("/api/timetable", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} lecture(s) successfully`);
      }
      if (failCount > 0) {
        toast.error(`Failed to update ${failCount} lecture(s)`);
      }

      setBulkEditOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error bulk updating:", error);
      toast.error(error.message || "Failed to update lectures");
    } finally {
      setBulkUpdating(false);
    }
  };

  const getFilteredTimetable = () => {
    return timetable.filter(entry => {
      if (filterTeacher !== "all" && entry.teacher_id !== filterTeacher) return false;
      if (filterClass !== "all" && entry.class_id !== filterClass) return false;
      if (filterDay !== "all" && entry.day_of_week !== filterDay) return false;
      if (filterTime !== "all" && entry.start_time !== filterTime) return false;
      return true;
    });
  };

  const getTimetableGrid = () => {
    const filtered = getFilteredTimetable();
    const grid: { [key: string]: TimetableEntry[] } = {};

    DAYS.forEach(({ value }) => {
      TIME_SLOTS.forEach(time => {
        const key = `${value}-${time}`;
        grid[key] = filtered.filter(
          entry => entry.day_of_week === value && entry.start_time === time
        );
      });
    });

    return grid;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const timetableGrid = getTimetableGrid();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 p-8 md:pl-72 overflow-x-scroll ">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Teacher Timetable</h1>
              <p className="text-muted-foreground mt-2">
                Manage lecture schedules for all teachers
              </p>
            </div>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lecture
            </Button>
          </div>

          {pageErrors.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 p-4">
              <div className="font-semibold mb-2">There were some errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {pageErrors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-2">
                <Label>Filter by Teacher</Label>
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Class</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Day</Label>
                <Select 
                  value={filterDay.toString()} 
                  onValueChange={(val) => setFilterDay(val === "all" ? "all" : parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Time</Label>
                <Select value={filterTime} onValueChange={setFilterTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Times</SelectItem>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>
                        {formatTo12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {filterTeacher !== "all" && filterClass !== "all" && (
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => {
                    setBulkRoomNumber("");
                    setBulkStartTime("");
                    setBulkEndTime("");
                    setBulkTimeFilter("all");
                    setBulkEditOpen(true);
                  }}
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Room/Time for All Lectures
                </Button>
              </div>
            )}
          </Card>

          {/* Timetable Grid */}
          <Card className="p-6 overflow-x-auto">
            <div className="min-w-[1200px]">
              <table className="w-full border-black overflow-x-auto ">
                <thead>
                  <tr>
                    <th className="border border-border bg-secondary p-2 text-sm font-semibold">
                      Time
                    </th>
                    {DAYS.map((day) => (
                      <th key={day.value} className="border border-border bg-secondary p-2 text-sm font-semibold">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(time => (
                    <tr key={time}>
                      <td className="border border-border bg-secondary p-2 text-sm font-medium">
                        {formatTo12Hour(time)}
                      </td>
                      {DAYS.map((day) => {
                        const key = `${day.value}-${time}`;
                        const entries = timetableGrid[key] || [];
                        
                        return (
                          <td key={day.value} className="border-blue-800 border-3 p-1 align-top min-h-[60px]">
                            {entries.map(entry => (
                              <div
                                key={entry.id}
                                className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded p-2 mb-1 text-xs"
                              >
                                <div className="font-semibold text-blue-900 dark:text-blue-100">
                                  {resolveTeacherName(entry)}
                                </div>
                                <div className="text-blue-700 dark:text-blue-300">
                                  {resolveClassName(entry)}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400">
                                  {entry.subjects && entry.subjects.length > 0
                                    ? entry.subjects
                                        .map((sid) => subjects.find((s) => s.id === sid)?.name || "Subject")
                                        .join(", ")
                                    : resolveSubjectName(entry)}
                                </div>
                                <div className="text-blue-500 dark:text-blue-500 mt-1">
                                  {formatTo12Hour(entry.start_time)} - {formatTo12Hour(entry.end_time)}
                                </div>
                                {entry.room_number && (
                                  <div className="text-blue-500 dark:text-blue-500">
                                    Room: {entry.room_number}
                                  </div>
                                )}
                                <div className="flex gap-1 mt-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditModal(entry)}
                                    className="h-6 px-2"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setDeleteEntry(entry); setDeleteOpen(true); }}
                                    className="h-6 px-2 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Lecture" : "Add New Lecture"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 p-3 text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Teacher *</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingEntry ? (
              <>
                <div className="space-y-2">
                  <Label>Subjects (select one or more) *</Label>
                  {!selectedClass ? (
                    <div className="text-sm text-muted-foreground border rounded p-2 bg-secondary/30">
                      Select a class first to view subjects.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border rounded p-2">
                      {getSubjectsForClass().map(subject => {
                        const checked = selectedSubjects.includes(subject.id);
                        return (
                          <label key={subject.id} className="flex items-center gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedSubject("");
                                setSelectedSubjects(prev => e.target.checked ? [...prev, subject.id] : prev.filter(id => id !== subject.id));
                              }}
                            />
                            <span>{subject.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Day *</Label>
                  <Select value={selectedDay.toString()} onValueChange={(val) => setSelectedDay(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Subjects (select one or more) *</Label>
                  {!selectedClass ? (
                    <div className="text-sm text-muted-foreground border rounded p-2 bg-secondary/30">
                      Select a class first to view subjects.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border rounded p-2">
                      {getSubjectsForClass().map(subject => {
                        const checked = selectedSubjects.includes(subject.id);
                        return (
                          <label key={subject.id} className="flex items-center gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedSubject("");
                                setSelectedSubjects(prev => e.target.checked ? [...prev, subject.id] : prev.filter(id => id !== subject.id));
                              }}
                            />
                            <span>{subject.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Days (select one or more) *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map(day => {
                      const checked = selectedDays.includes(day.value);
                      return (
                        <label key={day.value} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedDay(1);
                              setSelectedDays(prev => e.target.checked ? [...prev, day.value] : prev.filter(v => v !== day.value));
                            }}
                          />
                          <span>{day.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room Number (Optional)</Label>
              <Input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., Room 101"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          {/* Delete Confirmation Modal */}
          <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteEntry(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Lecture</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>Are you sure you want to delete this lecture?</p>
                {deleteEntry && (
                  <div className="rounded-md border bg-secondary/50 p-3">
                    <div><span className="font-semibold">Teacher:</span> {resolveTeacherName(deleteEntry)}</div>
                    <div><span className="font-semibold">Class:</span> {resolveClassName(deleteEntry)}</div>
                    <div><span className="font-semibold">Subject:</span> {deleteEntry.subjects && deleteEntry.subjects.length > 0 ? deleteEntry.subjects.map((sid) => subjects.find((s) => s.id === sid)?.name || "Subject").join(", ") : resolveSubjectName(deleteEntry)}</div>
                    <div><span className="font-semibold">Time:</span> {formatTo12Hour(deleteEntry.start_time)} - {formatTo12Hour(deleteEntry.end_time)}</div>
                    {deleteEntry.room_number && (
                      <div><span className="font-semibold">Room:</span> {deleteEntry.room_number}</div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button onClick={() => deleteEntry && handleDelete(deleteEntry.id)} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Edit Room/Time Modal */}
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Room/Time for All Lectures</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Update room number and/or time for all lectures of{" "}
                  <span className="font-semibold">
                    {teachers.find(t => t.id === filterTeacher)?.name}
                  </span>{" "}
                  teaching{" "}
                  <span className="font-semibold">
                    {classes.find(c => c.id === filterClass)?.name}
                  </span>
                  {bulkTimeFilter !== "all" 
                    ? ` at ${formatTo12Hour(bulkTimeFilter)}.`
                    : " for the entire week."}
                </p>

                <div className="space-y-2">
                  <Label>Filter by Time Slot (Optional)</Label>
                  <Select value={bulkTimeFilter} onValueChange={setBulkTimeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time Slots</SelectItem>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>
                          {formatTo12Hour(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a specific time to update only that slot, or keep "All Time Slots" to update entire week.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Room Number (Optional)</Label>
                  <Input
                    value={bulkRoomNumber}
                    onChange={(e) => setBulkRoomNumber(e.target.value)}
                    placeholder="e.g., Room 101"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time (Optional)</Label>
                    <Input
                      type="time"
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time (Optional)</Label>
                    <Input
                      type="time"
                      value={bulkEndTime}
                      onChange={(e) => setBulkEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Leave fields empty to keep current values. Only non-empty fields will be updated.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkUpdate} disabled={bulkUpdating}>
                  {bulkUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update All"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </div>
  );
}

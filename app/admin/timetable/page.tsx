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
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("15:30");
  const [roomNumber, setRoomNumber] = useState("");

  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<number | "all">("all");

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
      const [teachersRes, classesRes, subjectsRes, timetableRes] = await Promise.all([
        fetch(`/api/teachers`),
        fetch(`/api/classes`),
        fetch(`/api/subjects`),
        fetch(`/api/timetable`),
      ]);

      const [teachersData, classesData, subjectsData, timetableData] = await Promise.all([
        teachersRes.json(),
        classesRes.json(),
        subjectsRes.json(),
        timetableRes.json(),
      ]);

      setTeachers(teachersData.teachers || []);
      setClasses(classesData.classes || []);
      setSubjects(subjectsData.subjects || []);
      const normalized = (timetableData.timetable || []).map((t: any) => ({
        ...t,
        start_time: (t.start_time || "").slice(0, 5),
        end_time: (t.end_time || "").slice(0, 5),
      }));
      setTimetable(normalized);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load timetable data");
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
    setSelectedDay(1);
    setStartTime("15:00");
    setEndTime("15:30");
    setRoomNumber("");
    setModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setSelectedTeacher(entry.teacher_id);
    setSelectedClass(entry.class_id);
    setSelectedSubject(entry.subject_id);
    setSelectedDay(entry.day_of_week);
    setStartTime(entry.start_time);
    setEndTime(entry.end_time);
    setRoomNumber(entry.room_number || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTeacher || !selectedClass || !selectedSubject) {
      toast.error("Please select teacher, class, and subject");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setSaving(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      const payload = {
        id: editingEntry?.id,
        teacher_id: selectedTeacher,
        class_id: selectedClass,
        subject_id: selectedSubject,
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
        room_number: roomNumber || null,
      };

      const response = await fetch("/api/timetable", {
        method: editingEntry ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save lecture");
      }

      toast.success(editingEntry ? "Lecture updated successfully" : "Lecture added successfully");
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving lecture:", error);
      toast.error(error.message || "Failed to save lecture");
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
    if (!confirm("Are you sure you want to delete this lecture?")) return;

    try {
      const response = await fetch(`/api/timetable?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete lecture");
      }

      toast.success("Lecture deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting lecture:", error);
      toast.error("Failed to delete lecture");
    }
  };

  const getFilteredTimetable = () => {
    return timetable.filter(entry => {
      if (filterTeacher !== "all" && entry.teacher_id !== filterTeacher) return false;
      if (filterDay !== "all" && entry.day_of_week !== filterDay) return false;
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
      <div className="flex-1 p-8 md:pl-72 ">
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

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </Card>

          {/* Timetable Grid */}
          <Card className="p-6 overflow-x-auto">
            <div className="min-w-[1200px]">
              <table className="w-full border-collapse">
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
                          <td key={day.value} className="border border-border p-1 align-top min-h-[60px]">
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
                                  {resolveSubjectName(entry)}
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
                                    onClick={() => handleDelete(entry.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Lecture" : "Add New Lecture"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {getSubjectsForClass().map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}

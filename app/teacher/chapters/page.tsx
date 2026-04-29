"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ClassOption = { id: string; name: string };
type Assignment = {
  class_id: string;
  subject_id: string;
  subject_name?: string | null;
};

type StudyScheduleEntry = {
  id: string;
  day: number;
  class_id?: string;
  subject_id?: string;
  subject: string;
  chapter: string;
  max_marks?: number;
  description?: string | null;
  status: "Pending" | "In Progress" | "Completed" | string;
  teacher_id?: string | null;
  series_name: string;
  schedule_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export default function TeacherChaptersPage() {
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [entries, setEntries] = useState<StudyScheduleEntry[]>([]);
  const [selectedSeriesName, setSelectedSeriesName] = useState<string>("all");

  const subjectsForSelectedClass = useMemo(
    () => assignments.filter((item) => item.class_id === selectedClass),
    [assignments, selectedClass],
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      setLoading(false);
      return;
    }

    setTeacherId(user.id);
    void loadClasses(user.id);
    void loadAssignments(user.id);
  }, []);

  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (subjectsForSelectedClass.length === 0) {
      setSelectedSubjectId("");
      setEntries([]);
      setSelectedSeriesName("all");
      return;
    }

    const subjectStillValid = subjectsForSelectedClass.some(
      (item) => item.subject_id === selectedSubjectId,
    );
    if (!subjectStillValid) {
      setSelectedSubjectId(subjectsForSelectedClass[0].subject_id);
    }
  }, [selectedSubjectId, subjectsForSelectedClass]);

  useEffect(() => {
    if (!teacherId || !selectedClass || !selectedSubjectId) {
      if (!selectedSubjectId) setEntries([]);
      return;
    }

    void loadStudySchedule();
  }, [teacherId, selectedClass, selectedSubjectId]);

  const loadClasses = async (userId: string) => {
    try {
      const response = await fetch(`/api/teachers/classes?teacherId=${userId}`);
      const data = await response.json();
      const classList = Array.isArray(data.classes) ? data.classes : [];
      setClasses(classList);
      setSelectedClass(classList[0]?.id || "");
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
    }
  };

  const loadAssignments = async (userId: string) => {
    try {
      const response = await fetch(`/api/teachers/${userId}/assignments`);
      const data = await response.json();
      const list: Assignment[] = Array.isArray(data.assignments)
        ? data.assignments.map((item: Assignment) => ({
            class_id: item.class_id,
            subject_id: item.subject_id,
            subject_name: item.subject_name,
          }))
        : [];
      setAssignments(list);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const loadStudySchedule = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        classId: selectedClass,
        subjectId: selectedSubjectId,
      });

      if (teacherId) {
        params.set("teacherId", teacherId);
      }

      const res = await fetch(`/api/study-schedule?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data.data) ? (data.data as StudyScheduleEntry[]) : [];

      setEntries(list);
      setSelectedSeriesName("all");
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };

  const seriesNames = useMemo(() => {
    const uniq = Array.from(
      new Set(entries.map((e) => e.series_name).filter((v) => v && v.trim())),
    );
    return uniq.sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredRows = useMemo(() => {
    const list =
      selectedSeriesName === "all"
        ? entries
        : entries.filter((row) => row.series_name === selectedSeriesName);

    // Sort by schedule date if available, otherwise by day
    return [...list].sort((a, b) => {
      const da = a.schedule_date || "";
      const db = b.schedule_date || "";
      if (da !== db) return da.localeCompare(db);
      return a.day - b.day;
    });
  }, [entries, selectedSeriesName]);

  const chapterCountBySeries = useMemo(() => {
    return seriesNames.map((series) => {
      const rows = entries.filter((r) => r.series_name === series);
      const count = rows.length;
      const startDay = rows.reduce((min, r) => Math.min(min, r.day), Number.POSITIVE_INFINITY);
      const endDay = rows.reduce((max, r) => Math.max(max, r.day), Number.NEGATIVE_INFINITY);
      return {
        id: series,
        label: series,
        count,
        start: Number.isFinite(startDay) ? String(startDay) : "",
        end: Number.isFinite(endDay) ? String(endDay) : "",
      };
    });
  }, [entries, seriesNames]);

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Series Chapters</h1>
          <p className="text-muted-foreground">
            Class aur subject select karein, phir series ke chapters table mein dekhein.
          </p>
        </div>

        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Class</Label>
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2"
              >
                {classes.map((classOption) => (
                  <option key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <select
                value={selectedSubjectId}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2"
              >
                {subjectsForSelectedClass.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name || subject.subject_id}
                  </option>
                ))}
                {subjectsForSelectedClass.length === 0 && (
                  <option value="">No subject assigned</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Series</Label>
              <select
                value={selectedSeriesName}
                onChange={(event) => setSelectedSeriesName(event.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2"
              >
                <option value="all">All Series</option>
                {chapterCountBySeries.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {chapterCountBySeries.map((series) => (
                <Card
                  key={series.id}
                  className="cursor-pointer p-4 transition hover:border-primary"
                  onClick={() => setSelectedSeriesName(series.id)}
                >
                  <p className="text-sm text-muted-foreground">{series.label}</p>
                  <p className="mt-1 text-2xl font-bold">{series.count}</p>
                  <p className="text-xs text-muted-foreground">chapters</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Day {series.start} to {series.end}
                  </p>
                </Card>
              ))}
              {chapterCountBySeries.length === 0 && (
                <Card className="p-4 md:col-span-2 xl:col-span-4">
                  <p className="text-sm text-muted-foreground">Is subject ki koi series available nahi.</p>
                </Card>
              )}
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-sm">
                      <th className="px-4 py-3 font-medium">Chapter</th>
                      <th className="px-4 py-3 font-medium">Series</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b text-sm">
                        <td className="px-4 py-3">{row.chapter}</td>
                        <td className="px-4 py-3">{row.series_name}</td>
                        <td className="px-4 py-3">{row.schedule_date || "-"}</td>
                        <td className="px-4 py-3">{row.max_marks ?? "-"}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                          Selected filters ke liye chapters nahi mile.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

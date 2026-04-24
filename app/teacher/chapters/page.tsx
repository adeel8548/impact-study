"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExamChapter, SeriesExam } from "@/lib/types";

type ClassOption = { id: string; name: string };
type Assignment = {
  class_id: string;
  subject_id: string;
  subject_name?: string | null;
};

type ChapterRow = ExamChapter & {
  series_id: string;
  series_label: string;
};

type SeriesExamWithSubjectId = SeriesExam & {
  subject_id?: string | null;
};

const normalizeSubject = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export default function TeacherChaptersPage() {
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [seriesExams, setSeriesExams] = useState<SeriesExam[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("all");
  const [chapterRows, setChapterRows] = useState<ChapterRow[]>([]);

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
      setSeriesExams([]);
      setChapterRows([]);
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
      if (!selectedSubjectId) {
        setSeriesExams([]);
        setChapterRows([]);
      }
      return;
    }

    void loadSeriesAndChapters();
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

  const loadSeriesAndChapters = async () => {
    try {
      setLoading(true);

      const selectedAssignment = subjectsForSelectedClass.find(
        (item) => item.subject_id === selectedSubjectId,
      );
      const subjectName = selectedAssignment?.subject_name?.trim() || "";
      const normalizedSubjectName = subjectName
        ? normalizeSubject(subjectName)
        : "";

      const strictParams = new URLSearchParams({
        classId: selectedClass,
        subjectId: selectedSubjectId,
      });

      let exams: SeriesExam[] = [];

      const strictResponse = await fetch(`/api/series-exams?${strictParams.toString()}`);
      const strictJson = await strictResponse.json();
      exams = Array.isArray(strictJson.data) ? strictJson.data : [];

      if (exams.length === 0 && subjectName) {
        const classSubjectParams = new URLSearchParams({
          classId: selectedClass,
          subjectLike: subjectName,
        });
        const classSubjectResponse = await fetch(
          `/api/series-exams?${classSubjectParams.toString()}`,
        );
        const classSubjectJson = await classSubjectResponse.json();
        const classSubjectExams: SeriesExamWithSubjectId[] = Array.isArray(
          classSubjectJson.data,
        )
          ? classSubjectJson.data
          : [];
        exams = classSubjectExams.filter((exam) => {
          if (exam.subject_id && exam.subject_id === selectedSubjectId) return true;
          return normalizeSubject(exam.subject) === normalizedSubjectName;
        });
      }

      if (exams.length === 0) {
        const classOnlyParams = new URLSearchParams({ classId: selectedClass });
        const classOnlyResponse = await fetch(
          `/api/series-exams?${classOnlyParams.toString()}`,
        );
        const classOnlyJson = await classOnlyResponse.json();
        const classOnlyExams: SeriesExamWithSubjectId[] = Array.isArray(classOnlyJson.data)
          ? classOnlyJson.data
          : [];

        exams = classOnlyExams.filter((exam) => {
          if (exam.subject_id && exam.subject_id === selectedSubjectId) return true;
          if (!normalizedSubjectName) return false;
          return normalizeSubject(exam.subject) === normalizedSubjectName;
        });
      }

      // Final fallback: derive subject<->series relation from chapters table.
      // This handles legacy rows where series_exams.subject/subject_id is missing or inconsistent.
      if (exams.length === 0) {
        const classOnlyParams = new URLSearchParams({ classId: selectedClass });
        const classOnlyResponse = await fetch(
          `/api/series-exams?${classOnlyParams.toString()}`,
        );
        const classOnlyJson = await classOnlyResponse.json();
        const classOnlyExams: SeriesExamWithSubjectId[] = Array.isArray(classOnlyJson.data)
          ? classOnlyJson.data
          : [];

        const examWithChapters = await Promise.all(
          classOnlyExams.map(async (exam) => {
            const chapterResponse = await fetch(`/api/chapters?examId=${exam.id}`);
            const chapterJson = await chapterResponse.json();
            const rows: ExamChapter[] = Array.isArray(chapterJson.data) ? chapterJson.data : [];
            return { exam, rows };
          }),
        );

        exams = examWithChapters
          .filter(({ rows }) => rows.some((row) => row.subject_id === selectedSubjectId))
          .map(({ exam }) => exam);
      }

      setSeriesExams(exams);

      const chapterListNested = await Promise.all(
        exams.map(async (exam, index) => {
          const chapterResponse = await fetch(`/api/chapters?examId=${exam.id}`);
          const chapterJson = await chapterResponse.json();
          const rows: ExamChapter[] = Array.isArray(chapterJson.data) ? chapterJson.data : [];

          const label = exam.notes?.trim() || `Series ${index + 1}`;
          return rows.map((chapter) => ({
            ...chapter,
            series_id: exam.id,
            series_label: label,
          }));
        }),
      );

      setChapterRows(chapterListNested.flat());
      setSelectedSeriesId("all");
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const list =
      selectedSeriesId === "all"
        ? chapterRows
        : chapterRows.filter((row) => row.series_id === selectedSeriesId);

    return [...list].sort((first, second) =>
      (first.chapter_date || "").localeCompare(second.chapter_date || ""),
    );
  }, [chapterRows, selectedSeriesId]);

  const chapterCountBySeries = useMemo(() => {
    return seriesExams.map((exam, index) => {
      const label = exam.notes?.trim() || `Series ${index + 1}`;
      const count = chapterRows.filter((row) => row.series_id === exam.id).length;
      return {
        id: exam.id,
        label,
        count,
        start: exam.start_date,
        end: exam.end_date,
      };
    });
  }, [chapterRows, seriesExams]);

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
                value={selectedSeriesId}
                onChange={(event) => setSelectedSeriesId(event.target.value)}
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
                  onClick={() => setSelectedSeriesId(series.id)}
                >
                  <p className="text-sm text-muted-foreground">{series.label}</p>
                  <p className="mt-1 text-2xl font-bold">{series.count}</p>
                  <p className="text-xs text-muted-foreground">chapters</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {series.start} to {series.end}
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
                        <td className="px-4 py-3">{row.chapter_name}</td>
                        <td className="px-4 py-3">{row.series_label}</td>
                        <td className="px-4 py-3">{row.chapter_date || "-"}</td>
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

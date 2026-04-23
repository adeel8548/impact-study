"use client";

import { useEffect, useRef, useState } from "react";
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
import { Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Class = { id: string; name: string };
type Subject = { id: string; subject: string };
type SeriesOption = {
  key: string;
  series_name: string;
  start_date?: string;
  end_date?: string;
};
type StudyScheduleRow = {
  id: string;
  day: number;
  class_id?: string | null;
  subject_id?: string | null;
  subject: string;
  chapter: string;
  series_name: string;
  max_marks?: number | null;
  schedule_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  teacher_id?: string | null;
};
type ExamChapter = { id: string; chapter_name: string; max_marks: number };
type Student = { id: string; name: string; roll_number?: string };

interface MarkInput {
  [key: string]: number | ""; // student_id_chapter_id -> marks
}

type StudentResultsClientProps = {
  prefetchedClasses?: Class[];
  defaultClassId?: string;
  defaultSubjectId?: string;
  classEndpoint?: string;
  teacherId?: string;
  role?: "admin" | "teacher";
};

export function StudentResultsClient(props: StudentResultsClientProps = {}) {
  const {
    prefetchedClasses,
    defaultClassId,
    defaultSubjectId,
    classEndpoint = "/api/classes",
    teacherId,
    role = "admin",
  } = props;
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<SeriesOption[]>([]);
  const [studyScheduleRows, setStudyScheduleRows] = useState<StudyScheduleRow[]>([]);
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [marks, setMarks] = useState<MarkInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExamDetails, setSelectedExamDetails] =
    useState<StudyScheduleRow | null>(null);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [chapterMaxDraft, setChapterMaxDraft] = useState<
    Record<string, number | "">
  >({});
  const classesLoadedRef = useRef(false);

  const makeSeriesKey = (classId: string, subjectId: string, seriesName: string) =>
    `${classId}::${subjectId}::${seriesName.trim().toLowerCase()}`;

  const normalizeChapterName = (value: string) =>
    value
      .toLowerCase()
      .replace(/chapter/gi, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isVirtualChapterId = (id: string) => id.startsWith("schedule:");

  const getSeriesLabel = (series: SeriesOption) => series.series_name;

  const totalMaxMarks = chapters.reduce(
    (sum, ch) => sum + (ch.max_marks || 0),
    0,
  );

  const getStudentTotal = (studentId: string) => {
    return chapters.reduce((sum, ch) => {
      const val = marks[`${studentId}_${ch.id}`];
      const numeric = typeof val === "number" ? val : parseFloat(String(val));
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
  };

  const getStudentPercent = (studentId: string) => {
    if (totalMaxMarks === 0) return 0;
    return Math.min(100, (getStudentTotal(studentId) / totalMaxMarks) * 100);
  };

  const getCellPercent = (studentId: string, chapter: ExamChapter) => {
    const val = marks[`${studentId}_${chapter.id}`];
    const numeric = typeof val === "number" ? val : parseFloat(String(val));
    if (!chapter.max_marks || !Number.isFinite(numeric)) return 0;
    return Math.min(100, (numeric / chapter.max_marks) * 100);
  };

  const getCellStatus = (studentId: string, chapter: ExamChapter) => {
    const pct = getCellPercent(studentId, chapter);
    if (!Number.isFinite(pct)) return "—";
    return pct < 40 ? "Fail" : "Pass";
  };

  const overallTotals = (() => {
    const totalObtained = students.reduce(
      (sum, stu) => sum + getStudentTotal(stu.id),
      0,
    );
    const maxOverall = totalMaxMarks * (students.length || 1);
    const overallPercent =
      maxOverall === 0 ? 0 : (totalObtained / maxOverall) * 100;
    return { totalObtained, maxOverall, overallPercent };
  })();

  // Load classes
  useEffect(() => {
    if (classesLoadedRef.current) return;
    classesLoadedRef.current = true;

    const loadClasses = async () => {
      setLoading(true);
      try {
        let classList: Class[] =
          prefetchedClasses && prefetchedClasses.length > 0
            ? prefetchedClasses
            : [];

        // Always fetch teacher-scoped classes to reflect latest assignments from profiles.class_ids
        const res = await fetch(classEndpoint);
        const data = await res.json();
        const fetched = data.classes || data.data || [];
        if (Array.isArray(fetched) && fetched.length > 0) {
          classList = fetched;
        }

        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(defaultClassId || classList[0].id);
        }
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Failed to load classes");
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, [classEndpoint, defaultClassId, prefetchedClasses]);

  // Load subjects when class changes
  useEffect(() => {
    if (!selectedClass) return;

    const loadSubjects = async () => {
      try {
        let subjectsArray: Subject[] = [];

        if (role === "teacher" && teacherId) {
          const assignmentRes = await fetch(`/api/teachers/${teacherId}/assignments`);
          const assignmentJson = await assignmentRes.json();
          const assignments = Array.isArray(assignmentJson.assignments)
            ? assignmentJson.assignments
            : [];

          subjectsArray = assignments
            .filter((item: any) => item.class_id === selectedClass)
            .map((item: any) => ({
              id: item.subject_id,
              subject: item.subject_name || "Unknown Subject",
            }));
        } else {
          // Admin: subjects come from selected class subjects list.
          const res = await fetch(`/api/classes/${selectedClass}/subjects`);
          const data = await res.json();
          const classSubjects = Array.isArray(data.subjects) ? data.subjects : [];
          subjectsArray = classSubjects.map((subject: any) => ({
            id: subject.id,
            subject: subject.name,
          }));
        }

        subjectsArray = Array.from(
          new Map(subjectsArray.map((s) => [s.id, s])).values(),
        );

        setSubjects(subjectsArray);

        const preferredSubject =
          defaultSubjectId &&
          subjectsArray.some((s) => s.id === defaultSubjectId)
            ? defaultSubjectId
            : subjectsArray[0]?.id || "";

        setSelectedSubject(preferredSubject || "");
        setSelectedExam("");
        setStudyScheduleRows([]);
        setChapters([]);
        setStudents([]);
        setMarks({});
      } catch (error) {
        console.error("Error loading subjects:", error);
        toast.error("Failed to load subjects");
      }
    };

    loadSubjects();
  }, [selectedClass, defaultSubjectId, role, teacherId]);

  // Load series from study schedule when subject changes
  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;

    const loadSeries = async () => {
      try {
        const selectedSubjectDetails = subjects.find(
          (s) => s.id === selectedSubject,
        );

        const params = new URLSearchParams({
          classId: selectedClass,
          subjectId: selectedSubject,
        });

        if (teacherId) {
          params.set("teacherId", teacherId);
        }

        const res = await fetch(`/api/study-schedule?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const allRows: StudyScheduleRow[] = Array.isArray(data.data)
          ? data.data
          : [];
        const relevantRows = allRows.filter((row) => {
          const byClass = row.class_id === selectedClass;
          const bySubject = row.subject_id === selectedSubject;
          const bySubjectName =
            !row.subject_id &&
            selectedSubjectDetails?.subject &&
            row.subject?.trim().toLowerCase() ===
              selectedSubjectDetails.subject.trim().toLowerCase();
          const byTeacher = !teacherId || row.teacher_id === teacherId;
          return byClass && (bySubject || bySubjectName) && byTeacher;
        });

        const grouped = new Map<string, StudyScheduleRow[]>();
        relevantRows.forEach((row) => {
          const key = makeSeriesKey(selectedClass, selectedSubject, row.series_name);
          const list = grouped.get(key) || [];
          list.push(row);
          grouped.set(key, list);
        });

        const seriesList: SeriesOption[] = Array.from(grouped.entries()).map(
          ([key, rows]) => {
            const orderedRows = [...rows].sort((a, b) => {
              if ((a.schedule_date || "") !== (b.schedule_date || "")) {
                return (a.schedule_date || "").localeCompare(b.schedule_date || "");
              }
              return a.day - b.day;
            });

            return {
              key,
              series_name: orderedRows[0]?.series_name || "Series",
              start_date: orderedRows[0]?.schedule_date || undefined,
              end_date: orderedRows[orderedRows.length - 1]?.schedule_date || undefined,
            };
          },
        );

        seriesList.sort((a, b) => a.series_name.localeCompare(b.series_name));

        setStudyScheduleRows(relevantRows);
        setExams(seriesList);
        setSelectedExam((prev) => {
          if (prev && seriesList.some((series) => series.key === prev)) {
            return prev;
          }
          return seriesList[0]?.key || "";
        });
        setChapters([]);
        setStudents([]);
        setMarks({});
      } catch (error) {
        console.error("Error loading series:", error);
        toast.error("Failed to load series");
      }
    };

    loadSeries();
  }, [selectedClass, selectedSubject, role, teacherId, subjects]);

  // Load chapters and students when series changes
  useEffect(() => {
    if (!selectedExam) return;

    const loadData = async () => {
      try {
        setPrefillLoaded(false);
        const selectedSeriesRows = studyScheduleRows.filter(
          (row) => makeSeriesKey(selectedClass, selectedSubject, row.series_name) === selectedExam,
        );

        const chapterNames = Array.from(
          new Set(selectedSeriesRows.map((row) => row.chapter).filter(Boolean)),
        );

        const chaptersRes = await fetch(
          `/api/chapters?subjectId=${selectedSubject}`,
        );
        const chaptersData = await chaptersRes.json();
        const allChapters: ExamChapter[] = Array.isArray(chaptersData.data)
          ? chaptersData.data
          : [];

        const chaptersArray: ExamChapter[] = chapterNames
          .map((chapterName) => {
            const normalizedTarget = normalizeChapterName(chapterName);

            const exact = allChapters.find(
              (chapter) =>
                normalizeChapterName(chapter.chapter_name) === normalizedTarget,
            );
            if (exact) return exact;

            const partial = allChapters.find((chapter) => {
              const normalizedCandidate = normalizeChapterName(
                chapter.chapter_name,
              );
              return (
                normalizedCandidate.includes(normalizedTarget) ||
                normalizedTarget.includes(normalizedCandidate)
              );
            });
            if (partial) return partial;

            // Fallback: show schedule chapter even when it is not yet mapped in exam_chapters.
            const sourceRow = selectedSeriesRows.find(
              (row) =>
                normalizeChapterName(row.chapter || "") === normalizedTarget,
            );

            return {
              id: `schedule:${sourceRow?.id || normalizedTarget}`,
              chapter_name: chapterName,
              max_marks: Number(sourceRow?.max_marks || 100),
            } as ExamChapter;
          })
          .filter(Boolean);

        setChapters(chaptersArray);
        setChapterMaxDraft(
          chaptersArray.reduce<Record<string, number | "">>(
            (acc: Record<string, number | "">, ch: ExamChapter) => {
              acc[ch.id] = ch.max_marks ?? "";
              return acc;
            },
            {},
          ),
        );

        // Load students for the class
        const studentsRes = await fetch(
          `/api/students?classId=${selectedClass}`,
        );
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);

        // Default marks to 0 for all student/chapter combos
        const zeroed: MarkInput = {};
        (studentsData.students || []).forEach((stu: Student) => {
          chaptersArray.forEach((ch: ExamChapter) => {
            zeroed[`${stu.id}_${ch.id}`] = 0;
          });
        });
        setMarks(zeroed);

        // Get exam details
        const selectedSeriesData = [...selectedSeriesRows].sort((a, b) => {
          if ((a.schedule_date || "") !== (b.schedule_date || "")) {
            return (a.schedule_date || "").localeCompare(b.schedule_date || "");
          }
          return a.day - b.day;
        })[0];
        setSelectedExamDetails(
          selectedSeriesData
            ? selectedSeriesData
            : null,
        );

        // Prefill marks for existing results
        const resultsRes = await fetch(
          `/api/student-results?seriesExamId=${encodeURIComponent(selectedSeriesData?.id || selectedExam)}&classId=${selectedClass}${teacherId ? `&teacherId=${teacherId}` : ""}`,
        );
        const resultsJson = await resultsRes.json();
        const existingResults = resultsJson.data || [];

        if (Array.isArray(existingResults) && existingResults.length > 0) {
          setMarks((prev) => {
            const next = { ...prev };
            existingResults.forEach((result: any) => {
              if (!result.student_id || !result.chapter_id) return;
              const value = Number(result.marks);
              next[`${result.student_id}_${result.chapter_id}`] =
                Number.isFinite(value) ? value : 0;
            });
            return next;
          });
        }
        setPrefillLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load chapters or students");
      }
    };

    loadData();
  }, [selectedExam, selectedClass, studyScheduleRows, selectedSubject]);

  const handleMarkChange = (
    studentId: string,
    chapterId: string,
    value: string,
  ) => {
    if (value === "") {
      setMarks({
        ...marks,
        [`${studentId}_${chapterId}`]: "",
      });
      return;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Marks must be a non-negative number");
      return;
    }

    const chapter = chapters.find((c) => c.id === chapterId);
    let safeValue = parsed;
    if (
      chapter &&
      chapter.max_marks !== undefined &&
      parsed > chapter.max_marks
    ) {
      toast.error(
        `Marks cannot exceed max (${chapter.max_marks}) for this chapter`,
      );
      safeValue = chapter.max_marks;
    }

    const key = `${studentId}_${chapterId}`;
    setMarks({
      ...marks,
      [key]: safeValue,
    });
  };

  const handleChapterMaxChange = (chapterId: string, value: string) => {
    if (value === "") {
      setChapterMaxDraft({ ...chapterMaxDraft, [chapterId]: "" });
      return;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Max marks must be a non-negative number");
      return;
    }
    setChapterMaxDraft({ ...chapterMaxDraft, [chapterId]: parsed });
    debouncedSaveMaxMarks(chapterId, parsed);
  };

  const saveMaxMarks = async (chapterId: string, maxMarks: number) => {
    try {
      const isVirtual = isVirtualChapterId(chapterId);
      const realId = isVirtual ? chapterId.replace("schedule:", "") : chapterId;

      const res = await fetch(isVirtual ? "/api/study-schedule" : "/api/chapters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: realId, max_marks: maxMarks }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId ? { ...c, max_marks: maxMarks } : c,
        ),
      );
      toast.success("Max marks updated");
    } catch (error) {
      console.error("Error updating max marks:", error);
      toast.error("Failed to update max marks");
    }
  };

  const debouncedSaveMaxMarks = ((
    fn: (id: string, val: number) => void,
    delay = 500,
  ) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (id: string, val: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(id, val), delay);
    };
  })(saveMaxMarks);

  const handleSaveAll = async () => {
    console.log("=== SAVE BUTTON CLICKED ===");
    console.log("selectedExam:", selectedExam);
    console.log("students count:", students.length);
    console.log("chapters count:", chapters.length);

    if (!selectedExam || students.length === 0 || chapters.length === 0) {
      console.log("Validation failed - missing selection");
      toast.error("Please select class, subject, and exam");
      return;
    }

    console.log("Current marks state:", marks);
    const persistedSeriesId = selectedExamDetails?.id || selectedExam;

    // Prepare all results to save
    const allResults: Array<{
      student_id: string;
      series_exam_id: string;
      class_id: string;
      chapter_results: Array<{ chapter_id: string; marks: number }>;
    }> = [];

    students.forEach((student) => {
      const chapterResults: Array<{ chapter_id: string; marks: number }> = [];

      chapters.forEach((chapter) => {
        if (isVirtualChapterId(chapter.id)) {
          return;
        }
        const key = `${student.id}_${chapter.id}`;
        const markValue = marks[key];

        // Convert to number - treat empty/undefined as 0
        let markNum = 0;
        if (markValue !== "" && markValue !== undefined && markValue !== null) {
          const parsed =
            typeof markValue === "number"
              ? markValue
              : parseFloat(String(markValue));
          if (Number.isFinite(parsed)) {
            markNum = parsed;
          }
        }

        chapterResults.push({
          chapter_id: chapter.id,
          marks: markNum,
        });
      });

      if (chapterResults.length > 0) {
        allResults.push({
          student_id: student.id,
          series_exam_id: persistedSeriesId,
          class_id: selectedClass,
          chapter_results: chapterResults,
        });
      }
    });

    console.log("Prepared results to save:", allResults);

    if (allResults.length === 0) {
      toast.error("No mappable chapters found for saving. Create chapters in Chapters page first.");
      return;
    }

    const hasVirtualChapters = chapters.some((ch) => isVirtualChapterId(ch.id));
    if (hasVirtualChapters) {
      toast.info("Some chapters are shown from study schedule only and will not be saved until mapped in Chapters.");
    }

    setSaving(true);
    try {
      const failedSaves = [];
      const successfulSaves = [];

      // Save each student's results
      for (const result of allResults) {
        console.log(`Saving results for student ${result.student_id}...`);
        try {
          const response = await fetch("/api/student-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });

          console.log(
            `Response status: ${response.status}, ok: ${response.ok}`,
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              `Error saving student ${result.student_id}:`,
              errorData,
            );
            failedSaves.push(result.student_id);
            continue;
          }

          const responseData = await response.json();
          console.log(
            `Successfully saved for student ${result.student_id}:`,
            responseData,
          );
          successfulSaves.push(result.student_id);
        } catch (err) {
          console.error(`Error saving student ${result.student_id}:`, err);
          failedSaves.push(result.student_id);
        }
      }

      console.log(
        `Save complete: ${successfulSaves.length} successful, ${failedSaves.length} failed`,
      );

      if (successfulSaves.length > 0) {
        toast.success(
          `Saved results for ${successfulSaves.length} student(s)${
            failedSaves.length > 0 ? ` (${failedSaves.length} failed)` : ""
          }`,
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Select Series</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="class-select" className="text-sm font-medium mb-2 block">
              Class
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger id="class-select">
                <SelectValue placeholder="Select Class" />
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

          <div>
            <Label htmlFor="subject-select" className="text-sm font-medium mb-2 block">
              Subject
            </Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject-select" disabled={!selectedClass || subjects.length === 0}>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exam-select" className="text-sm font-medium mb-2 block">
              Series
            </Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger id="exam-select" disabled={!selectedSubject || exams.length === 0}>
                <SelectValue placeholder="Select Series" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((series) => (
                  <SelectItem key={series.key} value={series.key}>
                    {getSeriesLabel(series)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && exams.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                No series found for this class and subject yet. This page reads series from study schedule.
              </p>
            )}
          </div>

          {selectedExamDetails && (
            <div className="flex flex-col justify-end">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Series Details:</p>
                <p>{selectedExamDetails.series_name}</p>
                <p>{selectedExamDetails.subject}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedExam && (
        <Card className="p-6 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">Student Results</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {chapters.length} chapter(s) | {students.length} student(s)
              </p>
              {role === "teacher" && (
                <p className="text-xs text-muted-foreground">
                  You can manage results only for your assigned classes.
                </p>
              )}
              {prefillLoaded && Object.keys(marks).length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Existing marks loaded. You can update and save again.
                </p>
              )}
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="p-8 text-center bg-muted/50 rounded-lg flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
              <p className="text-muted-foreground">
                No chapters found for the selected series. Please create chapters first.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center bg-muted/50 rounded-lg flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
              <p className="text-muted-foreground">
                No students found in the selected class.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[150px]">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[100px]">
                        Roll No.
                      </th>
                      {chapters.map((chapter) => (
                        <th key={chapter.id} className="px-4 py-3 text-left text-sm font-semibold min-w-[120px]">
                          <div className="flex flex-col gap-1">
                            <span className="truncate">{chapter.chapter_name}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Max:</span>
                              <Input
                                type="number"
                                min="0"
                                value={chapterMaxDraft[chapter.id] ?? ""}
                                disabled={role === "teacher"}
                                onChange={(e) => handleChapterMaxChange(chapter.id, e.target.value)}
                                className="h-8 text-xs w-20"
                              />
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[140px]">
                        Subject Total
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[110px]">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student.id} className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                        <td className="px-4 py-3 text-sm font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{student.roll_number || "-"}</td>
                        {chapters.map((chapter) => (
                          <td key={`${student.id}-${chapter.id}`} className="px-4 py-3">
                            <Input
                              type="number"
                              placeholder="0"
                              min="0"
                              max={chapter.max_marks}
                              value={marks[`${student.id}_${chapter.id}`] ?? 0}
                              onChange={(e) => handleMarkChange(student.id, chapter.id, e.target.value)}
                              className="w-full h-9 text-sm"
                            />
                            <div className="text-[11px] text-muted-foreground mt-1">
                              of {chapter.max_marks ?? 0} ({getCellPercent(student.id, chapter).toFixed(1)}%) {" · "}
                              <span className={getCellStatus(student.id, chapter) === "Fail" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                {getCellStatus(student.id, chapter)}
                              </span>
                            </div>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm font-semibold">
                          {getStudentTotal(student.id)} / {totalMaxMarks}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {getStudentPercent(student.id).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="px-4 py-3 rounded border bg-muted/50">
                    <div className="font-semibold text-foreground">Overall</div>
                    <div className="text-muted-foreground">
                      Total Obtained: {overallTotals.totalObtained} / {overallTotals.maxOverall}
                    </div>
                    <div className="text-muted-foreground">
                      Percent: {overallTotals.overallPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded border bg-muted/50">
                    <div className="font-semibold text-foreground">Per Student</div>
                    <div className="text-muted-foreground">Max per student: {totalMaxMarks}</div>
                    <div className="text-muted-foreground">Students: {students.length}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || chapters.length === 0 || students.length === 0}
                    className="gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save All Results
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

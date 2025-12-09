"use client";

import { useEffect, useState } from "react";
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
type SeriesExam = {
  id: string;
  subject: string;
  start_date: string;
  end_date: string;
};
type ExamChapter = { id: string; chapter_name: string; max_marks: number };
type Student = { id: string; name: string; roll_number?: string };

interface MarkInput {
  [key: string]: number | ""; // student_id_chapter_id -> marks
}

type StudentResultsClientProps = {
  prefetchedClasses?: Class[];
  defaultClassId?: string;
  classEndpoint?: string;
  teacherId?: string;
  role?: "admin" | "teacher";
};

export function StudentResultsClient(props: StudentResultsClientProps = {}) {
  const {
    prefetchedClasses,
    defaultClassId,
    classEndpoint = "/api/classes",
    teacherId,
    role = "admin",
  } = props;
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [marks, setMarks] = useState<MarkInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExamDetails, setSelectedExamDetails] =
    useState<SeriesExam | null>(null);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [chapterMaxDraft, setChapterMaxDraft] = useState<
    Record<string, number | "">
  >({});

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
    // If classes were passed from the server (e.g., teacher limited classes), use them
    if (prefetchedClasses && prefetchedClasses.length > 0) {
      setClasses(prefetchedClasses);
      setSelectedClass(defaultClassId || prefetchedClasses[0].id);
      setLoading(false);
      return;
    }

    const loadClasses = async () => {
      setLoading(true);
      try {
        const res = await fetch(classEndpoint);
        const data = await res.json();
        const classList = data.classes || data.data || [];
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(classList[0].id);
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
        // Get unique subjects from series exams for this class
        const res = await fetch(`/api/series-exams?classId=${selectedClass}`);
        const data = await res.json();
        const examsData: SeriesExam[] = data.data || [];

        // Extract unique subjects
        const uniqueSubjects = Array.from(
          new Map<string, SeriesExam>(
            examsData.map((e) => [e.subject, e]),
          ).values(),
        );

        const subjectsArray = uniqueSubjects.map((exam) => ({
          id: exam.subject,
          subject: exam.subject,
        }));

        setSubjects(subjectsArray);
        setSelectedSubject("");
        setSelectedExam("");
        setChapters([]);
        setStudents([]);
        setMarks({});
      } catch (error) {
        console.error("Error loading subjects:", error);
        toast.error("Failed to load subjects");
      }
    };

    loadSubjects();
  }, [selectedClass]);

  // Load exams when subject changes
  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;

    const loadExams = async () => {
      try {
        const teacherParam = teacherId ? `&teacherId=${teacherId}` : "";
        const res = await fetch(
          `/api/series-exams?classId=${selectedClass}${teacherParam}`,
        );
        const data = await res.json();
        const examsData = data.data || [];

        // Filter by subject
        const filteredExams = examsData.filter(
          (e: SeriesExam) => e.subject === selectedSubject,
        );

        setExams(filteredExams);
        setSelectedExam("");
        setChapters([]);
        setStudents([]);
        setMarks({});
      } catch (error) {
        console.error("Error loading exams:", error);
        toast.error("Failed to load exams");
      }
    };

    loadExams();
  }, [selectedClass, selectedSubject]);

  // Load chapters and students when exam changes
  useEffect(() => {
    if (!selectedExam) return;

    const loadData = async () => {
      try {
        setPrefillLoaded(false);
        // Load chapters
        const chaptersRes = await fetch(`/api/chapters?examId=${selectedExam}`);
        const chaptersData = await chaptersRes.json();
        const chaptersArray: ExamChapter[] = chaptersData.data || [];
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
        const selectedExamData = exams.find((e) => e.id === selectedExam);
        setSelectedExamDetails(selectedExamData || null);

        // Prefill marks for existing results
        const resultsRes = await fetch(
          `/api/student-results?seriesExamId=${selectedExam}&classId=${selectedClass}`,
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
  }, [selectedExam, selectedClass, exams]);

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
      const res = await fetch("/api/chapters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chapterId, max_marks: maxMarks }),
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
    if (!selectedExam || students.length === 0 || chapters.length === 0) {
      toast.error("Please select class, subject, and exam");
      return;
    }

    // Group marks by student
    const studentResultsMap = new Map<
      string,
      Array<{ chapter_id: string; marks: number }>
    >();
    const chapterMaxMap = chapters.reduce<Record<string, number | undefined>>(
      (acc: Record<string, number | undefined>, chapter: ExamChapter) => {
        acc[chapter.id] = chapter.max_marks;
        return acc;
      },
      {},
    );
    const invalidMarks: string[] = [];

    students.forEach((student) => {
      const studentMarks: Array<{ chapter_id: string; marks: number }> = [];

      chapters.forEach((chapter) => {
        const key = `${student.id}_${chapter.id}`;
        const markValue = marks[key];

        if (markValue !== "" && markValue !== undefined) {
          const numeric =
            typeof markValue === "number"
              ? markValue
              : parseFloat(String(markValue));
          const max = chapterMaxMap[chapter.id];
          if (
            isNaN(numeric) ||
            numeric < 0 ||
            (max !== undefined && numeric > max)
          ) {
            invalidMarks.push(`${student.name} - ${chapter.chapter_name}`);
            return;
          }
          studentMarks.push({
            chapter_id: chapter.id,
            marks: numeric,
          });
        }
      });

      if (studentMarks.length > 0) {
        studentResultsMap.set(student.id, studentMarks);
      }
    });

    if (invalidMarks.length > 0) {
      toast.error(
        `Invalid marks for: ${invalidMarks.slice(0, 3).join(", ")}${
          invalidMarks.length > 3
            ? " +" + (invalidMarks.length - 3) + " more"
            : ""
        }`,
      );
      return;
    }

    if (studentResultsMap.size === 0) {
      toast.error("No marks entered to save");
      return;
    }

    setSaving(true);
    try {
      // Save results for each student
      const promises = Array.from(studentResultsMap.entries()).map(
        ([studentId, chapterResults]) =>
          fetch("/api/student-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: studentId,
              series_exam_id: selectedExam,
              class_id: selectedClass,
              chapter_results: chapterResults,
            }),
          }),
      );

      const responses = await Promise.all(promises);
      const allSuccess = responses.every((res) => res.ok);

      if (!allSuccess) {
        throw new Error("Some results failed to save");
      }

      toast.success("All results saved successfully!");
      setMarks({});
    } catch (error) {
      console.error("Error saving results:", error);
      toast.error("Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dropdowns Section */}
      <Card className="p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Select Exam</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Class Dropdown */}
          <div>
            <Label
              htmlFor="class-select"
              className="text-sm font-medium mb-2 block"
            >
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

          {/* Subject Dropdown */}
          <div>
            <Label
              htmlFor="subject-select"
              className="text-sm font-medium mb-2 block"
            >
              Subject
            </Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger
                id="subject-select"
                disabled={!selectedClass || subjects.length === 0}
              >
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

          {/* Exam Dropdown */}
          <div>
            <Label
              htmlFor="exam-select"
              className="text-sm font-medium mb-2 block"
            >
              Series Exam
            </Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger
                id="exam-select"
                disabled={!selectedSubject || exams.length === 0}
              >
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.subject} ({exam.start_date} to {exam.end_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam Date Info */}
          {selectedExamDetails && (
            <div className="flex flex-col justify-end">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Exam Period:</p>
                <p>
                  {selectedExamDetails.start_date} →{" "}
                  {selectedExamDetails.end_date}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Chapters and Students Info */}
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
                No chapters found for the selected exam. Please create chapters
                first.
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
              {/* Table */}
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
                        <th
                          key={chapter.id}
                          className="px-4 py-3 text-left text-sm font-semibold min-w-[120px]"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="truncate">
                              {chapter.chapter_name}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                Max:
                              </span>
                              <Input
                                type="number"
                                min="0"
                                value={chapterMaxDraft[chapter.id] ?? ""}
                                onChange={(e) =>
                                  handleChapterMaxChange(
                                    chapter.id,
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs w-20"
                              />
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[110px]">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[110px]">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr
                        key={student.id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {student.roll_number || "-"}
                        </td>
                        {chapters.map((chapter) => (
                          <td
                            key={`${student.id}-${chapter.id}`}
                            className="px-4 py-3"
                          >
                            <Input
                              type="number"
                              placeholder="0"
                              min="0"
                              max={chapter.max_marks}
                              value={marks[`${student.id}_${chapter.id}`] ?? 0}
                              onChange={(e) =>
                                handleMarkChange(
                                  student.id,
                                  chapter.id,
                                  e.target.value,
                                )
                              }
                              className="w-full h-9 text-sm"
                            />
                            <div className="text-[11px] text-muted-foreground mt-1">
                              of {chapter.max_marks ?? 0} (
                              {getCellPercent(student.id, chapter).toFixed(1)}%)
                              {" · "}
                              <span
                                className={
                                  getCellStatus(student.id, chapter) === "Fail"
                                    ? "text-red-600 font-semibold"
                                    : "text-green-600 font-semibold"
                                }
                              >
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

              {/* Summary + Save */}
              <div className="flex flex-col gap-4 mt-6">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="px-4 py-3 rounded border bg-muted/50">
                    <div className="font-semibold text-foreground">Overall</div>
                    <div className="text-muted-foreground">
                      Total Obtained: {overallTotals.totalObtained} /{" "}
                      {overallTotals.maxOverall}
                    </div>
                    <div className="text-muted-foreground">
                      Percent: {overallTotals.overallPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded border bg-muted/50">
                    <div className="font-semibold text-foreground">
                      Per Student
                    </div>
                    <div className="text-muted-foreground">
                      Max per student: {totalMaxMarks}
                    </div>
                    <div className="text-muted-foreground">
                      Students: {students.length}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || Object.keys(marks).length === 0}
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

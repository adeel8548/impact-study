"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import type { ExamChapter, ExamResult, SeriesExam } from "@/lib/types";

// Type definitions for our component state
type ClassOption = { id: string; name: string };
type StudentOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };

/**
 * Exam Management Page
 *
 * Features:
 * - Teachers can select a class and view associated subjects
 * - Create new series exams with multiple chapters
 * - Each chapter has a date and maximum marks
 * - Teachers can enter results for all students in a chapter
 * - Results are editable and deletable
 * - Full loading states and error handling
 * - Responsive design with Tailwind CSS
 */
export default function ExamManagementPage() {
  const router = useRouter();

  // ============================================
  // State Management
  // ============================================

  // User and basic data
  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dropdowns and selections
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  // Series exams and chapters
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>("");

  // Results data
  const [results, setResults] = useState<ExamResult[]>([]);

  // Create exam form state
  const [newExamName, setNewExamName] = useState("");
  const [newExamStartDate, setNewExamStartDate] = useState("");
  const [newExamEndDate, setNewExamEndDate] = useState("");

  // Create chapter form state
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterDate, setNewChapterDate] = useState("");
  const [newChapterMaxMarks, setNewChapterMaxMarks] = useState("100");

  // Results editing state
  const [editingResults, setEditingResults] = useState<Record<string, number>>(
    {},
  );

  // ============================================
  // Initialization and Authentication
  // ============================================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      router.push("/");
      return;
    }
    setTeacherId(user.id);
    setTeacherName(user.name || "Teacher");
    loadClasses(user.id);
  }, [router]);

  // ============================================
  // Data Loading Functions
  // ============================================

  /**
   * Load classes assigned to the teacher
   */
  const loadClasses = async (userId: string) => {
    try {
      const res = await fetch(`/api/teachers/classes?teacherId=${userId}`);
      const data = await res.json();
      const cls = data.classes || [];
      setClasses(cls);
      if (cls.length > 0) {
        setSelectedClass(cls[0].id);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load subjects for the selected class
   */
  useEffect(() => {
    if (selectedClass) {
      loadSubjects();
      loadExams();
      loadStudents();
    }
  }, [selectedClass]);

  // reload exams whenever selectedSubject or teacherId changes (so teacher sees only exams
  // for the selected subject assigned to them)
  useEffect(() => {
    if (selectedClass) {
      loadExams();
    }
  }, [selectedSubject, teacherId]);

  const loadSubjects = async () => {
    try {
      const res = await fetch(`/api/classes/${selectedClass}/subjects`);
      const data = await res.json();
      setSubjects(data.subjects || []);
      if (data.subjects && data.subjects.length > 0) {
        setSelectedSubject(data.subjects[0].id);
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
      toast.error("Failed to load subjects");
    }
  };

  /**
   * Load all students in the class
   */
  const loadStudents = async () => {
    try {
      const res = await fetch(`/api/students?classId=${selectedClass}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    }
  };

  /**
   * Load series exams for the class
   */
  const loadExams = async () => {
    try {
      // include teacherId and subject text filter so teachers only see relevant series exams
      const subjectName = subjects.find((s) => s.id === selectedSubject)?.name;
      const params = new URLSearchParams({ classId: selectedClass });
      if (teacherId) params.set("teacherId", teacherId);
      if (subjectName) params.set("subject", subjectName);
      const res = await fetch(`/api/series-exams?${params.toString()}`);
      const data = await res.json();
      const examList = data.data || [];
      setExams(examList);
      if (examList.length > 0) {
        setSelectedExam(examList[0].id);
      }
    } catch (error) {
      console.error("Error loading exams:", error);
      toast.error("Failed to load exams");
    }
  };

  /**
   * Load chapters for selected exam and subject
   */
  useEffect(() => {
    if (selectedExam && selectedSubject) {
      loadChapters();
    }
  }, [selectedExam, selectedSubject]);

  const loadChapters = async () => {
    try {
      const res = await fetch(
        `/api/chapters?examId=${selectedExam}&subjectId=${selectedSubject}`,
      );
      const data = await res.json();
      const chapterList = data.data || [];
      setChapters(chapterList);
      if (chapterList.length > 0) {
        setSelectedChapter(chapterList[0].id);
      }
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Failed to load chapters");
    }
  };

  /**
   * Load results for selected chapter
   */
  useEffect(() => {
    if (selectedChapter) {
      loadResults();
    }
  }, [selectedChapter]);

  const loadResults = async () => {
    try {
      const res = await fetch(`/api/exam-results?chapterId=${selectedChapter}`);
      const data = await res.json();
      setResults(data.data || []);
      // Initialize editing state with current marks
      const initialEdits: Record<string, number> = {};
      (data.data || []).forEach((result: ExamResult) => {
        if (result.marks !== null) {
          initialEdits[result.id] = result.marks;
        }
      });
      setEditingResults(initialEdits);
    } catch (error) {
      console.error("Error loading results:", error);
      toast.error("Failed to load results");
    }
  };

  // ============================================
  // Exam Creation
  // ============================================

  /**
   * Create a new series exam
   */
  const handleCreateExam = async () => {
    if (!newExamName || !newExamStartDate || !newExamEndDate) {
      toast.error("Please fill all exam fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/series-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExamName,
          class_id: selectedClass,
          subject: selectedSubject,
          start_date: newExamStartDate,
          end_date: newExamEndDate,
          teacher_id: teacherId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Series exam created successfully");
      setNewExamName("");
      setNewExamStartDate("");
      setNewExamEndDate("");
      loadExams();
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create exam",
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Chapter Management
  // ============================================

  /**
   * Create a new chapter for the selected exam
   */
  const handleCreateChapter = async () => {
    if (!newChapterName || !newChapterDate) {
      toast.error("Please fill chapter details");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: selectedExam,
          subject_id: selectedSubject,
          chapter_name: newChapterName,
          chapter_date: newChapterDate,
          max_marks: parseFloat(newChapterMaxMarks),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Chapter created successfully");
      setNewChapterName("");
      setNewChapterDate("");
      setNewChapterMaxMarks("100");
      setShowCreateChapter(false);
      loadChapters();
    } catch (error) {
      console.error("Error creating chapter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create chapter",
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete a chapter
   */
  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/chapters?id=${chapterId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Chapter deleted successfully");
      loadChapters();
      if (selectedChapter === chapterId) {
        setSelectedChapter("");
        setResults([]);
      }
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete chapter",
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Results Management
  // ============================================

  /**
   * Save a student's marks for a chapter
   */
  const handleSaveMarks = async (
    studentId: string,
    resultId: string | undefined,
    marks: number,
  ) => {
    try {
      const res = await fetch("/api/exam-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          chapter_id: selectedChapter,
          class_id: selectedClass,
          marks,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Marks saved successfully");
      loadResults();
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save marks",
      );
    }
  };

  /**
   * Delete a student's result
   */
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;

    try {
      const res = await fetch(`/api/exam-results?id=${resultId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Result deleted successfully");
      loadResults();
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete result",
      );
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedChapterData = chapters.find((c) => c.id === selectedChapter);
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />
      <div className="p-4 md:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Exam Management
            </h1>
            <p className="text-muted-foreground">
              Create exams with chapters and manage student results
            </p>
          </div>
        </div>

        {/* Selection Controls */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Class Selection */}
            <div>
              <Label className="text-sm font-medium">Class</Label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Selection */}
            <div>
              <Label className="text-sm font-medium">Series Exam</Label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                <option value="">Select Exam</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Selection */}
            <div>
              <Label className="text-sm font-medium">Chapter</Label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                <option value="">Select Chapter</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.chapter_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
          </TabsList>

          {/* ============================================
              Results Tab - Entry and Management
              ============================================ */}
          <TabsContent value="results" className="space-y-4">
            {selectedChapter ? (
              <>
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Enter Marks for {selectedChapterData?.chapter_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Max Marks: {selectedChapterData?.max_marks} | Date:{" "}
                    {selectedChapterData?.chapter_date}
                  </p>

                  {/* Results Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => {
                      const result = results.find(
                        (r) => r.student_id === student.id,
                      );
                      const resultId = result?.id || `new_${student.id}`;
                      const currentMarks =
                        editingResults[resultId] ?? result?.marks ?? "";

                      return (
                        <Card
                          key={student.id}
                          className="p-4 border border-border hover:shadow-md transition-shadow"
                        >
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Student Name
                              </p>
                              <p className="font-semibold text-lg">
                                {student.name}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">
                                Marks
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={selectedChapterData?.max_marks}
                                value={
                                  typeof currentMarks === "number"
                                    ? currentMarks
                                    : ""
                                }
                                onChange={(e) => {
                                  const newValue = e.target.value
                                    ? parseFloat(e.target.value)
                                    : "";
                                  setEditingResults({
                                    ...editingResults,
                                    [resultId]: newValue as number,
                                  });
                                }}
                                onBlur={() => {
                                  const marksValue = editingResults[resultId];
                                  if (
                                    typeof marksValue === "number" &&
                                    marksValue !== result?.marks
                                  ) {
                                    handleSaveMarks(
                                      student.id,
                                      result?.id,
                                      marksValue,
                                    );
                                  }
                                }}
                                placeholder="0"
                                className="w-full"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Total Marks
                                </p>
                                <p className="font-semibold text-base">
                                  {selectedChapterData?.max_marks}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Percentage
                                </p>
                                <p className="font-semibold text-base">
                                  {typeof currentMarks === "number" &&
                                  selectedChapterData?.max_marks
                                    ? (
                                        (currentMarks /
                                          selectedChapterData.max_marks) *
                                        100
                                      ).toFixed(1)
                                    : "-"}
                                  %
                                </p>
                              </div>
                            </div>

                            {result && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteResult(result.id)}
                                className="w-full gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Result
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-4">
                <p className="text-muted-foreground">
                  Please select a chapter to enter marks
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ============================================
              Chapters Tab - Create and Manage
              ============================================ */}
          <TabsContent value="chapters" className="space-y-4">
            {selectedExam ? (
              <>
                {/* Create Chapter Form */}
                {!showCreateChapter ? (
                  <Button
                    onClick={() => setShowCreateChapter(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Chapter
                  </Button>
                ) : (
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold">New Chapter</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Subject</Label>
                        <select
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Chapter Name</Label>
                        <Input
                          value={newChapterName}
                          onChange={(e) => setNewChapterName(e.target.value)}
                          placeholder="e.g., Quadratic Equations"
                        />
                      </div>
                      <div>
                        <Label>Chapter Date</Label>
                        <Input
                          type="date"
                          value={newChapterDate}
                          onChange={(e) => setNewChapterDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Max Marks</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newChapterMaxMarks}
                          onChange={(e) =>
                            setNewChapterMaxMarks(e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateChapter(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateChapter}
                        disabled={saving}
                        className="gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Chapters List */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">
                    Chapters for {selectedSubjectData?.name}
                  </h3>
                  <div className="space-y-2">
                    {chapters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No chapters yet
                      </p>
                    ) : (
                      chapters.map((chapter) => {
                        const subjectName =
                          subjects.find((s) => s.id === (chapter as any).subject_id)?.name ||
                          selectedSubjectData?.name ||
                          "—";
                        return (
                          <div
                            key={chapter.id}
                            className="p-3 border border-border rounded bg-white"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-lg">
                                  {chapter.chapter_name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Subject: <span className="font-medium">{subjectName}</span>
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Date: {chapter.chapter_date}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Max Marks: {chapter.max_marks}
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedChapter(chapter.id)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteChapter(chapter.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-4">
                <p className="text-muted-foreground">
                  Please select an exam first
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ============================================
              Exams Tab - Create and View
              ============================================ */}
          <TabsContent value="exams" className="space-y-4">
            {/* Create Exam Form */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Create Series Exam</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Exam Name</Label>
                  <Input
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    placeholder="e.g., Mid-Term Exams"
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newExamStartDate}
                    onChange={(e) => setNewExamStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newExamEndDate}
                    onChange={(e) => setNewExamEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateExam}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" />
                  Create Exam
                </Button>
              </div>
            </Card>

            {/* Exams List */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Series Exams</h3>
              <div className="space-y-2">
                {exams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exams yet</p>
                ) : (
                  exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-3 border border-border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedExam(exam.id)}
                    >
                      <p className="font-medium">{exam.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {exam.start_date} to {exam.end_date}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

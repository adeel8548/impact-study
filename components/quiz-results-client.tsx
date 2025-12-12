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
import type { QuizResult } from "@/lib/types";

type Class = { id: string; name: string };
type Student = { id: string; name: string; roll_number?: string };
type Quiz = { 
  id: string; 
  subject: string; 
  topic: string; 
  quiz_date: string;
  duration_minutes?: number;
};

interface MarkInput {
  [key: string]: number | ""; // student_id -> marks
}

type QuizResultsClientProps = {
  teacherId?: string;
  role?: "admin" | "teacher";
  prefetchedClasses?: Class[];
};

export function QuizResultsClient(props: QuizResultsClientProps = {}) {
  const { teacherId, role = "admin", prefetchedClasses } = props;

  // ============================================
  // State Management
  // ============================================
  const [classes, setClasses] = useState<Class[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");

  const [marks, setMarks] = useState<MarkInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [selectedQuizDetails, setSelectedQuizDetails] = useState<Quiz | null>(null);

  // ============================================
  // Calculate totals
  // ============================================
  const totalMaxMarks = selectedQuizDetails?.duration_minutes || 100;

  const getStudentPercent = (studentId: string) => {
    const val = marks[studentId];
    const numeric = typeof val === "number" ? val : parseFloat(String(val));
    if (!totalMaxMarks || !Number.isFinite(numeric)) return 0;
    return Math.min(100, (numeric / totalMaxMarks) * 100);
  };

  const getStudentStatus = (studentId: string) => {
    const pct = getStudentPercent(studentId);
    if (!Number.isFinite(pct)) return "—";
    return pct < 40 ? "Fail" : "Pass";
  };

  const overallTotals = (() => {
    const totalObtained = students.reduce((sum, stu) => {
      const val = marks[stu.id];
      const numeric = typeof val === "number" ? val : parseFloat(String(val));
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
    const maxOverall = totalMaxMarks * (students.length || 1);
    const overallPercent =
      maxOverall === 0 ? 0 : (totalObtained / maxOverall) * 100;
    return { totalObtained, maxOverall, overallPercent };
  })();

  // ============================================
  // Initialization
  // ============================================
  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadQuizzes();
      loadStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedQuiz && students.length > 0) {
      loadQuizResultsForQuiz();
    }
  }, [selectedQuiz, students]);

  // ============================================
  // Data Loading Functions
  // ============================================
  const loadClasses = async () => {
    try {
      setLoading(true);
      
      // Use prefetched classes if available (from server-side)
      if (prefetchedClasses && prefetchedClasses.length > 0) {
        setClasses(prefetchedClasses);
        setSelectedClass(prefetchedClasses[0].id);
        setLoading(false);
        return;
      }

      const url = teacherId
        ? `/api/teachers/classes?teacherId=${teacherId}`
        : "/api/classes";

      const res = await fetch(url);
      const data = await res.json();
      const classList = data.classes || data.data || [];

      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClass(classList[0].id);
      } else {
        setSelectedClass("");
        setSelectedQuiz("");
        setMarks({});
        toast.info("No classes assigned yet");
      }
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      const params = new URLSearchParams();
      params.append("classId", selectedClass);
      if (teacherId) {
        params.append("teacherId", teacherId);
      }

      const res = await fetch(`/api/daily-quizzes?${params.toString()}`);
      const data = await res.json();
      const quizzesList = data.data || [];
      setQuizzes(quizzesList);
      setSelectedQuiz("");
      setMarks({});
    } catch (error) {
      console.error("Error loading quizzes:", error);
      toast.error("Failed to load quizzes");
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch(`/api/students?classId=${selectedClass}`);
      const data = await res.json();
      const studentsList = data.students || data.data || [];
      setStudents(studentsList);

      // Initialize marks to blank
      const blanked: MarkInput = {};
      studentsList.forEach((stu: Student) => {
        blanked[stu.id] = "";
      });
      setMarks(blanked);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    }
  };

  const loadQuizResultsForQuiz = async () => {
    try {
      setPrefillLoaded(false);

      // Get quiz details
      const selectedQuizData = quizzes.find((q) => q.id === selectedQuiz);
      setSelectedQuizDetails(selectedQuizData || null);

      // Reset all marks to blank for all students (fresh slate for new quiz)
      const blanked: MarkInput = {};
      students.forEach((stu: Student) => {
        blanked[stu.id] = "";
      });
      setMarks(blanked);

      // Fetch quiz results with classId and quizId filter
      const params = new URLSearchParams();
      params.append("classId", selectedClass);
      if (selectedQuiz) params.append("quizId", selectedQuiz);
      const res = await fetch(`/api/quiz-results?${params.toString()}`);
      const data = await res.json();
      const allResults = data.data || [];
        
      // Server should return results scoped to the provided quizId and classId (student.class_id).
      // Map returned results to marks for students in the selected class.
      if (Array.isArray(allResults) && allResults.length > 0) {
        setMarks((prev) => {
          const next = { ...prev };
          allResults.forEach((result: QuizResult) => {
            if (result.student_id) next[result.student_id] = result.obtained_marks;
          });
          return next;
        });
      }

      setPrefillLoaded(true);
    } catch (error) {
      console.error("Error loading quiz results:", error);
      toast.error("Failed to load quiz results");
    }
  };

  // ============================================
  // Mark Change Handler
  // ============================================
  const handleMarkChange = (studentId: string, value: string) => {
    if (value === "") {
      setMarks({
        ...marks,
        [studentId]: "",
      });
      return;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Marks must be a non-negative number");
      return;
    }

    setMarks({
      ...marks,
      [studentId]: parsed,
    });
  };

  // ============================================
  // Save Handler
  // ============================================
  const handleSaveAll = async () => {
    if (!selectedQuiz || students.length === 0) {
      toast.error("Please select a quiz and ensure students exist");
      return;
    }

    const quizDetails = quizzes.find((q) => q.id === selectedQuiz);
    if (!quizDetails) {
      toast.error("Quiz details not found");
      return;
    }

    // Only save students whose marks have changed (not blank)
    const changedResults: Array<{
      studentId: string;
      teacherId: string;
      quizId?: string;
      quizName: string;
      obtainedMarks: number;
      totalMarks: number;
      quizDate: string;
      quizDuration: number;
    }> = [];

    students.forEach((student) => {
      const markValue = marks[student.id];
      if (markValue === "" || markValue === undefined || markValue === null) {
        return; // skip blank
      }
      const parsed = typeof markValue === "number" ? markValue : parseFloat(String(markValue));
      if (!Number.isFinite(parsed)) {
        return;
      }
      changedResults.push({
        studentId: student.id,
        teacherId: teacherId || "",
        quizId: quizDetails.id,
        quizName: quizDetails.topic,
        obtainedMarks: parsed,
        totalMarks: totalMaxMarks,
        quizDate: quizDetails.quiz_date,
        quizDuration: quizDetails.duration_minutes || 0,
      });
    });

    if (changedResults.length === 0) {
      toast.error("No changed marks to save");
      return;
    }

    setSaving(true);
    try {
      const failedSaves = [];
      const successfulSaves = [];

      // Save only changed student's quiz result
      for (const result of changedResults) {
        try {
          const response = await fetch("/api/quiz-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error saving student ${result.studentId}:`, errorData);
            failedSaves.push(result.studentId);
            continue;
          }

          const responseData = await response.json();
          successfulSaves.push(result.studentId);
        } catch (err) {
          console.error(`Error saving student ${result.studentId}:`, err);
          failedSaves.push(result.studentId);
        }
      }

      if (successfulSaves.length > 0) {
        toast.success(
          `Saved results for ${successfulSaves.length} student(s)` +
            (failedSaves.length > 0 ? ` (${failedSaves.length} failed)` : "")
        );
      }

      if (failedSaves.length > 0) {
        toast.error(`Failed to save ${failedSaves.length} student(s)`);
      }

      if (successfulSaves.length > 0) {
        loadQuizResultsForQuiz();
      }
    } catch (error) {
      console.error("Unexpected error during save:", error);
      toast.error("An unexpected error occurred while saving");
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
      {/* Selection Section */}
      <Card className="p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Select Quiz</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Quiz Dropdown */}
          <div>
            <Label
              htmlFor="quiz-select"
              className="text-sm font-medium mb-2 block"
            >
              Quiz
            </Label>
            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
              <SelectTrigger
                id="quiz-select"
                disabled={!selectedClass || quizzes.length === 0}
              >
                <SelectValue placeholder="Select Quiz" />
              </SelectTrigger>
              <SelectContent>
                {quizzes.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.topic} ({quiz.quiz_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quiz Info */}
          {selectedQuizDetails && (
            <div className="flex flex-col justify-end">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Quiz Info:</p>
                <p>Subject: {selectedQuizDetails.subject}</p>
                <p>Duration: {selectedQuizDetails.duration_minutes} min</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quiz Results Table */}
      {selectedQuiz && (
        <Card className="p-6 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">Quiz Results</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {students.length} student(s)
              </p>
              {prefillLoaded && Object.keys(marks).length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Existing marks loaded. You can update and save again.
                </p>
              )}
            </div>
          </div>

          {students.length === 0 ? (
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
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[120px]">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">
                            {selectedQuizDetails?.topic || "Quiz"}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              Max: {totalMaxMarks}
                            </span>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-[100px]">
                        %
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold min-w-20">
                        Status
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
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            placeholder="—"
                            min="0"
                            max={totalMaxMarks}
                            value={marks[student.id] === "" ? "" : marks[student.id]}
                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                            className="w-full h-9 text-sm"
                          />
                          <div className="text-[11px] text-muted-foreground mt-1">
                            of {totalMaxMarks}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {getStudentPercent(student.id).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span
                            className={
                              getStudentStatus(student.id) === "Fail"
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {getStudentStatus(student.id)}
                          </span>
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
                      Total Obtained: {overallTotals.totalObtained.toFixed(2)} /{" "}
                      {overallTotals.maxOverall.toFixed(2)}
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
                    disabled={saving || students.length === 0}
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

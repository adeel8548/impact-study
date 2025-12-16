"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Edit2, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { QuizResult } from "@/lib/types";
import { Sidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";

type Student = { id: string; name: string; classId?: string };
type Teacher = { id: string; name: string };

export default function QuizMarksPage() {
  const router = useRouter();

  // ============================================
  // State Management
  // ============================================

  // User and basic data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Students and teachers
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState<string>("");
  const [quizName, setQuizName] = useState<string>("");
  const [obtainedMarks, setObtainedMarks] = useState<string>("");
  const [totalMarks, setTotalMarks] = useState<string>("");
  const [quizDate, setQuizDate] = useState<string>("");
  const [quizDuration, setQuizDuration] = useState<string>(""); // in minutes

  // Results data
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ============================================
  // Initialization and Authentication
  // ============================================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user) {
      router.push("/");
      return;
    }

    // Only admin and teacher can access this page
    if (!["admin", "teacher"].includes(user.role)) {
      router.push("/");
      return;
    }

    setCurrentUser(user);
    loadStudents(user.role, user.id);
    loadTeachers();
    loadQuizResults();
  }, [router]);

  // ============================================
  // Data Loading Functions
  // ============================================

  const loadStudents = async (role: string, userId: string) => {
    try {
      let url = "/api/students";

      // For teachers, load only their assigned students
      if (role === "teacher") {
        const classRes = await fetch(
          `/api/teachers/classes?teacherId=${userId}`,
        );
        const classData = await classRes.json();
        const classIds = classData.classes?.map((c: any) => c.id) || [];

        if (classIds.length > 0) {
          url = `/api/students?classIds=${classIds.join(",")}`;
        }
      }

      const res = await fetch(url);
      const data = await res.json();
      setStudents(data.data || data.students || []);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      setTeachers(data.data || data.teachers || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    }
  };

  const loadQuizResults = async () => {
    try {
      const res = await fetch("/api/quiz-results");
      const data = await res.json();

      if (data.success) {
        setQuizResults(data.data || []);
      }
    } catch (error) {
      console.error("Error loading quiz results:", error);
      toast.error("Failed to load quiz results");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Form Handlers
  // ============================================

  const handleSubmitMarks = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !selectedStudent || !quizName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!obtainedMarks || !totalMarks || !quizDate) {
      toast.error("Please fill in marks, total marks, and quiz date");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        studentId: selectedStudent,
        teacherId: currentUser.id,
        quizName,
        obtainedMarks: parseFloat(obtainedMarks),
        totalMarks: parseFloat(totalMarks),
        quizDate,
        quizDuration: quizDuration ? parseInt(quizDuration) : 0,
      };

      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...payload } : payload;

      const res = await fetch("/api/quiz-results", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      toast.success(
        editingId
          ? "Quiz result updated successfully"
          : "Quiz result saved successfully",
      );

      // Reset form
      resetForm();
      loadQuizResults();
    } catch (error) {
      console.error("Error saving quiz result:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save quiz result",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this quiz result?")) return;

    try {
      const res = await fetch(`/api/quiz-results?id=${resultId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Quiz result deleted successfully");
      loadQuizResults();
    } catch (error) {
      console.error("Error deleting quiz result:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete quiz result",
      );
    }
  };

  const handleEditResult = (result: QuizResult) => {
    setSelectedStudent(result.student_id);
    setQuizName(result.quiz_name);
    setObtainedMarks(result.obtained_marks.toString());
    setTotalMarks(result.total_marks.toString());
    setQuizDate(result.quiz_date);
    setQuizDuration(result.quiz_duration.toString());
    setEditingId(result.id);

    // Scroll to form
    const formElement = document.getElementById("quiz-form");
    formElement?.scrollIntoView({ behavior: "smooth" });
  };

  const resetForm = () => {
    setSelectedStudent("");
    setQuizName("");
    setObtainedMarks("");
    setTotalMarks("");
    setQuizDate("");
    setQuizDuration("");
    setEditingId(null);
    setSearchStudent("");
  };

  // ============================================
  // Computed Values
  // ============================================

  const filteredStudents = useMemo(() => {
    if (!searchStudent) return students;
    return students.filter((s) =>
      s.name.toLowerCase().includes(searchStudent.toLowerCase()),
    );
  }, [students, searchStudent]);

  const studentResultStats = useMemo(() => {
    const stats: Record<
      string,
      { totalObtained: number; totalMarks: number; count: number }
    > = {};

    quizResults.forEach((result) => {
      if (!stats[result.student_id]) {
        stats[result.student_id] = {
          totalObtained: 0,
          totalMarks: 0,
          count: 0,
        };
      }
      stats[result.student_id].totalObtained += result.obtained_marks;
      stats[result.student_id].totalMarks += result.total_marks;
      stats[result.student_id].count += 1;
    });

    return stats;
  }, [quizResults]);

  const getStudentName = (studentId: string) => {
    return students.find((s) => s.id === studentId)?.name || "Unknown";
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find((t) => t.id === teacherId)?.name || "Unknown";
  };

  // ============================================
  // Render
  // ============================================

  const selectedStudentName = students.find(
    (s) => s.id === selectedStudent,
  )?.name;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="pl-64  space-y-6">
        <div className="p-4 md:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Quiz Marks Management
              </h1>
              <p className="text-muted-foreground">
                {currentUser?.role === "admin"
                  ? "Manage quiz marks for all students"
                  : "Manage quiz marks for your students"}
              </p>
            </div>
          </div>

          {loading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Loading quiz data...</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Tabs for different sections */}
              <Tabs defaultValue="entry" className="space-y-4">
            <TabsList>
              <TabsTrigger value="entry">Entry</TabsTrigger>
              <TabsTrigger value="results">
                Results ({quizResults.length})
              </TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            {/* ============================================
              Entry Tab
              ============================================ */}
            <TabsContent value="entry" className="space-y-4"></TabsContent>

            {/* ============================================
              Results Tab
              ============================================ */}
            <TabsContent value="results" className="space-y-4">
              {quizResults.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">
                    No quiz results found
                  </p>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quizResults.map((result) => (
                        <Card
                          key={result.id}
                          className="p-4 border border-border hover:shadow-md transition-shadow"
                        >
                          <div className="space-y-3">
                            {/* Student and Quiz Name */}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Student Name
                              </p>
                              <p className="font-semibold text-lg">
                                {getStudentName(result.student_id)}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Quiz Name
                              </p>
                              <p className="font-semibold">
                                {result.quiz_name}
                              </p>
                            </div>

                            {/* Marks Information */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Obtained Marks
                                </p>
                                <p className="font-semibold text-base">
                                  {result.obtained_marks}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-semibold text-base">
                                  {result.total_marks}
                                </p>
                              </div>
                            </div>

                            {/* Percentage */}
                            <div className="bg-muted rounded p-2">
                              <p className="text-xs text-muted-foreground">
                                Percentage
                              </p>
                              <p className="font-semibold text-lg">
                                {(
                                  (result.obtained_marks / result.total_marks) *
                                  100
                                ).toFixed(1)}
                                %
                              </p>
                            </div>

                            {/* Date and Duration */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Date</p>
                                <p className="font-medium text-xs">
                                  {new Date(
                                    result.quiz_date,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Duration
                                </p>
                                <p className="font-medium text-xs">
                                  {result.quiz_duration > 0
                                    ? `${result.quiz_duration} min`
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            {/* Teacher Name */}
                            <div className="text-xs text-muted-foreground border-t pt-2">
                              Teacher: {getTeacherName(result.teacher_id)}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              {currentUser?.role === "admin" ||
                              currentUser?.id === result.teacher_id ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditResult(result)}
                                    className="flex-1 gap-1"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteResult(result.id)
                                    }
                                    className="gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ============================================
              Statistics Tab
              ============================================ */}
            <TabsContent value="statistics" className="space-y-4">
              {Object.keys(studentResultStats).length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">
                    No statistics available yet
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(studentResultStats).map(
                    ([studentId, stats]) => (
                      <Card key={studentId} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Student
                              </p>
                              <p className="font-semibold text-lg">
                                {getStudentName(studentId)}
                              </p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted rounded p-3">
                              <p className="text-xs text-muted-foreground">
                                Total Quizzes
                              </p>
                              <p className="text-2xl font-bold">
                                {stats.count}
                              </p>
                            </div>

                            <div className="bg-muted rounded p-3">
                              <p className="text-xs text-muted-foreground">
                                Average %
                              </p>
                              <p className="text-2xl font-bold">
                                {(
                                  (stats.totalObtained / stats.totalMarks) *
                                  100
                                ).toFixed(1)}
                                %
                              </p>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Total Marks Obtained:
                              </span>
                              <span className="font-semibold">
                                {stats.totalObtained.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Total Marks:
                              </span>
                              <span className="font-semibold">
                                {stats.totalMarks.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

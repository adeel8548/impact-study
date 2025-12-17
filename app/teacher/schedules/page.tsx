"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { ExamCard } from "@/components/exam-card";
import { QuizCard } from "@/components/quiz-card";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import type { DailyQuiz, RevisionSchedule, SeriesExam } from "@/lib/types";

type ClassOption = { id: string; name: string };
type Assignment = {
  class_id: string;
  subject_id: string;
  subject_name?: string | null;
};

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function TeacherSchedulesPage() {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("revisions");

  const today = useMemo(() => toLocalDate(new Date()), []);

  const [revisions, setRevisions] = useState<RevisionSchedule[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);
  const [deleteQuizModalOpen, setDeleteQuizModalOpen] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState<string | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState(false);

  // Form state
  // Quizzes editable by teacher
  const [saving, setSaving] = useState(false);
  const [quizSubject, setQuizSubject] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDate, setQuizDate] = useState(today);
  const [quizDuration, setQuizDuration] = useState("");
  const [quizTotalMarks, setQuizTotalMarks] = useState("");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      return;
    }
    setTeacherId(user.id);
    setTeacherName(user.name || "Teacher");
    loadClasses(user.id);
    loadAssignments(user.id);
  }, []);

  // Sync tab with query param ?tab=revisions|exams|quizzes
  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "revisions" || t === "exams" || t === "quizzes") {
      setTab(t);
    }
  }, [searchParams]);

  const loadClasses = async (userId: string) => {
    try {
      // Get assigned subjects to determine which classes to show
      const assignRes = await fetch(`/api/teachers/${userId}/assignments`);
      const assignJson = await assignRes.json();
      const assignments = Array.isArray(assignJson.assignments)
        ? assignJson.assignments
        : [];

      // Extract unique class IDs from assignments
      const uniqueClassIds = Array.from(
        new Set(assignments.map((a: any) => a.class_id).filter(Boolean)),
      );

      if (uniqueClassIds.length === 0) {
        setClasses([]);
        setSelectedClass("");
        setLoading(false);
        return;
      }

      // Fetch class details
      const classIds = (uniqueClassIds as string[]).join(",");
      const res = await fetch(
        `/api/classes?ids=${encodeURIComponent(classIds)}`,
      );
      const data = await res.json();
      const cls = Array.isArray(data.classes) ? data.classes : data.data || [];

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

  const loadAssignments = async (userId: string) => {
    try {
      const res = await fetch(`/api/teachers/${userId}/assignments`);
      const json = await res.json();
      const list: Assignment[] = Array.isArray(json.assignments)
        ? json.assignments.map((a: any) => ({
            class_id: a.class_id,
            subject_id: a.subject_id,
            subject_name: a.subject_name,
          }))
        : [];
      setAssignments(list);
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadRevisions();
      loadExams();
      loadQuizzes();
      const subjectsForClass = assignments.filter(
        (a) => a.class_id === selectedClass,
          <DeleteConfirmationModal
            open={deleteQuizModalOpen}
            onOpenChange={(open) => {
              setDeleteQuizModalOpen(open);
              if (!open) setQuizToDeleteId(null);
            }}
            title="Delete Quiz"
            description="Are you sure you want to delete this quiz? This action cannot be undone."
            onConfirm={async () => {
              if (quizToDeleteId) await deleteQuiz(quizToDeleteId);
            }}
            isLoading={deletingQuiz}
          />
      );
      if (subjectsForClass.length > 0) {
        setQuizSubject(
          subjectsForClass[0].subject_name || subjectsForClass[0].subject_id,
        );
      } else {
        setQuizSubject("");
      }
    }
  }, [selectedClass, assignments]);

  const loadRevisions = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass, teacherId });
      const res = await fetch(`/api/revision-schedule?${params}`);
      const json = await res.json();
      setRevisions(json.data || []);
    } catch (e) {
      toast.error("Failed to load revisions");
    }
  };

  const loadExams = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass, teacherId });
      const res = await fetch(`/api/series-exams?${params}`);
      const json = await res.json();
      setExams(json.data || []);
    } catch (e) {
      toast.error("Failed to load exams");
    }
  };

  const loadQuizzes = async () => {
    try {
      // Just load quizzes for the selected class, no subject filtering needed
      // (API will return all quizzes for the class regardless of subject)
      const params = new URLSearchParams({
        classId: selectedClass,
        teacherId,
      });
      const res = await fetch(`/api/daily-quizzes?${params}`);
      const json = await res.json();
      setQuizzes(json.data || []);
    } catch (e) {
      toast.error("Failed to load quizzes");
    }
  };

  const createOrUpdateQuiz = async () => {
    if (!quizSubject || !quizTopic || !quizDate) {
      toast.error("Fill subject, topic, date");
      return;
    }
    setSaving(true);
    try {
      // Find subject_id from assignments
      const assignment = assignments.find(
        (a) =>
          a.class_id === selectedClass &&
          (a.subject_name === quizSubject || a.subject_id === quizSubject),
      );

      const payload = {
        id: quizEditingId || undefined,
        class_id: selectedClass,
        subject: quizSubject,
        subject_id: assignment?.subject_id || undefined,
        topic: quizTopic,
        quiz_date: quizDate,
        duration_minutes: quizDuration ? Number(quizDuration) : null,
        total_marks: quizTotalMarks ? Number(quizTotalMarks) : null,
        teacher_id: teacherId,
      };
      const method = quizEditingId ? "PUT" : "POST";
      const res = await fetch("/api/daily-quizzes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save quiz");
      toast.success(quizEditingId ? "Quiz updated" : "Quiz saved");
      setQuizEditingId(null);
      setQuizSubject("");
      setQuizTopic("");
      setQuizDate(today);
      setQuizDuration("");
      setQuizTotalMarks("");
      loadQuizzes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (id: string) => {
    setDeletingQuiz(true);
    try {
      const res = await fetch(`/api/daily-quizzes?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Quiz deleted");
      setDeleteQuizModalOpen(false);
      setQuizToDeleteId(null);
      loadQuizzes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete quiz");
    } finally {
      setDeletingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <div className="min-h-screen bg-background">
        <TeacherHeader />
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Schedules</h1>
              <p className="text-muted-foreground">
                Manage revisions, series exams, and daily/weekly quizzes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Class</Label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="revisions">Revisions</TabsTrigger>
              <TabsTrigger value="exams">Series Exams</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            </TabsList>

            <TabsContent value="revisions" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Upcoming Revisions</h3>
                <div className="space-y-2">
                  {revisions.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No revisions yet.
                    </p>
                  )}
                  {revisions.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border border-border rounded p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {r.subject} — {r.topic}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Date: {r.revision_date} • Teacher: {teacherName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="exams" className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Upcoming Exams
                </h3>
                {exams.length === 0 && (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      No exams yet.
                    </p>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map((e) => (
                    <ExamCard
                      key={e.id}
                      exam={e}
                      teacherName={teacherName}
                      className={
                        classes.find((c) => c.id === selectedClass)?.name || "—"
                      }
                      onEdit={undefined}
                      onDelete={undefined}
                      showChaptersLink={true}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <select
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      {(
                        assignments
                          .filter((a) => a.class_id === selectedClass)
                          .map((a) => ({
                            id: a.subject_id,
                            name: a.subject_name || a.subject_id,
                          }))
                          .filter(
                            (v, idx, arr) =>
                              arr.findIndex((x) => x.id === v.id) === idx,
                          ) || []
                      ).map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      {assignments.filter((a) => a.class_id === selectedClass)
                        .length === 0 && (
                        <option value="">
                          No subjects assigned to this class
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <Label>Topic</Label>
                    <Input
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={quizDate}
                      onChange={(e) => setQuizDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={quizDuration}
                      onChange={(e) => setQuizDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      min={0}
                      value={quizTotalMarks}
                      onChange={(e) => setQuizTotalMarks(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {quizEditingId && (
                    <Button
                      variant="outline"
                      onClick={() => setQuizEditingId(null)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={createOrUpdateQuiz}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Plus className="w-4 h-4" />
                    {quizEditingId ? "Update Quiz" : "Add Quiz"}
                  </Button>
                </div>
              </Card>

              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Upcoming Quizzes
                </h3>
                {quizzes.length === 0 && (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      No quizzes yet.
                    </p>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((q) => (
                    <QuizCard
                      key={q.id}
                      quiz={q}
                      teacherName={teacherName}
                      className={
                        classes.find((c) => c.id === selectedClass)?.name || "—"
                      }
                      onEdit={(quiz) => {
                        setQuizEditingId(quiz.id);
                        setQuizSubject(quiz.subject);
                        setQuizTopic(quiz.topic);
                        setQuizDate(quiz.quiz_date);
                        setQuizDuration(
                          quiz.duration_minutes?.toString() || "",
                        );
                      }}
                      onDelete={(id) => {
                        setQuizToDeleteId(id);
                        setDeleteQuizModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Suspense>
  );
}

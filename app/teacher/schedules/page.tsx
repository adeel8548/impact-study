"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DailyQuiz, RevisionSchedule } from "@/lib/types";

type ClassOption = { id: string; name: string };
type Assignment = {
  class_id: string;
  subject_id: string;
  subject_name?: string | null;
};

export default function TeacherSchedulesPage() {
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("Teacher");
  const [tab, setTab] = useState("revisions");

  const [revisions, setRevisions] = useState<RevisionSchedule[]>([]);
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);
  const [quizSubjectId, setQuizSubjectId] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDate, setQuizDate] = useState("");
  const [quizDuration, setQuizDuration] = useState("");
  const [quizTotalMarks, setQuizTotalMarks] = useState("");
  const [savingQuiz, setSavingQuiz] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      return;
    }

    setTeacherId(user.id);
    setTeacherName(user.name || "Teacher");
    void loadClasses(user.id);
    void loadAssignments(user.id);
  }, []);

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "revisions" || tabParam === "quizzes") {
      setTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedClass && teacherId) {
      void loadRevisions();
      void loadQuizzes();
    }
  }, [selectedClass, teacherId]);

  useEffect(() => {
    const subjects = assignments.filter((item) => item.class_id === selectedClass);
    const stillValid = subjects.some((item) => item.subject_id === quizSubjectId);
    if (!stillValid) {
      setQuizSubjectId(subjects[0]?.subject_id || "");
    }
  }, [assignments, selectedClass, quizSubjectId]);

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

  const loadRevisions = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass, teacherId });
      const response = await fetch(`/api/revision-schedule?${params.toString()}`);
      const data = await response.json();
      setRevisions(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Error loading revisions:", error);
      toast.error("Failed to load revisions");
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

  const loadQuizzes = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass, teacherId });
      const response = await fetch(`/api/daily-quizzes?${params.toString()}`);
      const data = await response.json();
      setQuizzes(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Error loading quizzes:", error);
      toast.error("Failed to load quizzes");
    }
  };

  const createQuiz = async () => {
    if (!selectedClass || !teacherId || !quizSubjectId || !quizTopic || !quizDate) {
      toast.error("Subject, topic aur date required hain");
      return;
    }

    const selectedSubject = assignments.find(
      (item) => item.class_id === selectedClass && item.subject_id === quizSubjectId,
    );

    setSavingQuiz(true);
    try {
      const payload = {
        class_id: selectedClass,
        subject_id: quizSubjectId,
        subject: selectedSubject?.subject_name || quizSubjectId,
        topic: quizTopic,
        quiz_date: quizDate,
        duration_minutes: quizDuration ? Number(quizDuration) : null,
        total_marks: quizTotalMarks ? Number(quizTotalMarks) : null,
        teacher_id: teacherId,
      };

      const response = await fetch("/api/daily-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to add quiz");
      }

      toast.success("Quiz added successfully");
      setQuizTopic("");
      setQuizDate("");
      setQuizDuration("");
      setQuizTotalMarks("");
      void loadQuizzes();
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Failed to add quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  const subjectsForClass = assignments.filter((item) => item.class_id === selectedClass);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <div className="min-h-screen bg-background">
        <TeacherHeader />

        <div className="space-y-6 p-4 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Schedules</h1>
              <p className="text-muted-foreground">Revisions aur quizzes ka schedule.</p>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm">Class</Label>
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-foreground"
              >
                {classes.map((classOption) => (
                  <option key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="revisions">Revisions</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            </TabsList>

            <TabsContent value="revisions" className="space-y-4">
              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Upcoming Revisions</h3>
                <div className="space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No revisions yet.</p>
                  ) : (
                    revisions.map((revision) => (
                      <div
                        key={revision.id}
                        className="flex items-center justify-between rounded border border-border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {revision.subject} - {revision.topic}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Date: {revision.revision_date} - Teacher: {teacherName}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold">Add Quiz</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <select
                      value={quizSubjectId}
                      onChange={(event) => setQuizSubjectId(event.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                    >
                      {subjectsForClass.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_name || subject.subject_id}
                        </option>
                      ))}
                      {subjectsForClass.length === 0 && (
                        <option value="">No subject assigned</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1 lg:col-span-2">
                    <Label>Topic</Label>
                    <Input
                      value={quizTopic}
                      onChange={(event) => setQuizTopic(event.target.value)}
                      placeholder="Topic name"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={quizDate}
                      onChange={(event) => setQuizDate(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={quizDuration}
                      onChange={(event) => setQuizDuration(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      min="0"
                      value={quizTotalMarks}
                      onChange={(event) => setQuizTotalMarks(event.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={createQuiz} disabled={savingQuiz}>
                  {savingQuiz ? "Saving..." : "Add Quiz"}
                </Button>
              </Card>

              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Upcoming Quizzes</h3>
                <div className="space-y-2">
                  {quizzes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quizzes yet.</p>
                  ) : (
                    quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between rounded border border-border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {quiz.subject} - {quiz.topic}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Date: {quiz.quiz_date} - Teacher: {teacherName}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Suspense>
  );
}

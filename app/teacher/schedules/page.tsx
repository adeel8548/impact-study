"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil ,Trash} from "lucide-react";
import { toast } from "sonner";
import type { DailyQuiz, RevisionSchedule, SeriesExam } from "@/lib/types";

type ClassOption = { id: string; name: string };

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function TeacherSchedulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>("revisions");

  const today = useMemo(() => toLocalDate(new Date()), []);

  const [revisions, setRevisions] = useState<RevisionSchedule[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);

  // Form state
  const [revSubject, setRevSubject] = useState("");
  const [revTopic, setRevTopic] = useState("");
  const [revDate, setRevDate] = useState(today);

  const [examSubject, setExamSubject] = useState("");
  const [examStart, setExamStart] = useState(today);
  const [examEnd, setExamEnd] = useState(today);
  const [examDuration, setExamDuration] = useState("");
  const [examPaperDate, setExamPaperDate] = useState("");
  const [examNotes, setExamNotes] = useState("");

  const [quizSubject, setQuizSubject] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDate, setQuizDate] = useState(today);
  const [quizDuration, setQuizDuration] = useState("");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);

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

  // Sync tab with query param ?tab=revisions|exams|quizzes
  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "revisions" || t === "exams" || t === "quizzes") {
      setTab(t);
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (selectedClass) {
      loadRevisions();
      loadExams();
      loadQuizzes();
    }
  }, [selectedClass]);

  const loadRevisions = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass });
      const res = await fetch(`/api/revision-schedule?${params}`);
      const json = await res.json();
      setRevisions(json.data || []);
    } catch (e) {
      toast.error("Failed to load revisions");
    }
  };

  const loadExams = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass });
      const res = await fetch(`/api/series-exams?${params}`);
      const json = await res.json();
      setExams(json.data || []);
    } catch (e) {
      toast.error("Failed to load exams");
    }
  };

  const loadQuizzes = async () => {
    try {
      const params = new URLSearchParams({ classId: selectedClass });
      const res = await fetch(`/api/daily-quizzes?${params}`);
      const json = await res.json();
      setQuizzes(json.data || []);
    } catch (e) {
      toast.error("Failed to load quizzes");
    }
  };

  const createRevision = async () => {
    if (!revSubject || !revTopic || !revDate) {
      toast.error("Fill subject, topic, date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        class_id: selectedClass,
        subject: revSubject,
        topic: revTopic,
        revision_date: revDate,
        teacher_id: teacherId,
      };
      const res = await fetch("/api/revision-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save revision");
      toast.success("Revision saved");
      setRevSubject("");
      setRevTopic("");
      setRevDate(today);
      loadRevisions();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save revision");
    } finally {
      setSaving(false);
    }
  };

  const createExam = async () => {
    if (!examSubject || !examStart || !examEnd) {
      toast.error("Fill subject and dates");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        class_id: selectedClass,
        subject: examSubject,
        start_date: examStart,
        end_date: examEnd,
        duration_minutes: examDuration ? Number(examDuration) : null,
        paper_given_date: examPaperDate || null,
        notes: examNotes || null,
        teacher_id: teacherId,
      };
      const res = await fetch("/api/series-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save exam");
      toast.success("Exam saved");
      setExamSubject("");
      setExamStart(today);
      setExamEnd(today);
      setExamDuration("");
      setExamPaperDate("");
      setExamNotes("");
      loadExams();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const createQuiz = async () => {
    if (!quizSubject || !quizTopic || !quizDate) {
      toast.error("Fill subject, topic, date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: quizEditingId || undefined,
        class_id: selectedClass,
        subject: quizSubject,
        topic: quizTopic,
        quiz_date: quizDate,
        duration_minutes: quizDuration ? Number(quizDuration) : null,
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
      setQuizSubject("");
      setQuizTopic("");
      setQuizDate(today);
      setQuizDuration("");
      setQuizEditingId(null);
      loadQuizzes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (table: "revision" | "exam" | "quiz", id: string) => {
    try {
      const url =
        table === "revision"
          ? `/api/revision-schedule?id=${id}`
          : table === "exam"
            ? `/api/series-exams?id=${id}`
            : `/api/daily-quizzes?id=${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
      if (table === "revision") loadRevisions();
      else if (table === "exam") loadExams();
      else loadQuizzes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
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
            <Card className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Revisions are read-only for teachers. Contact admin to add or modify revisions.</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Upcoming Revisions</h3>
              <div className="space-y-2">
                {revisions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No revisions yet.</p>
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
            <Card className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Series exams are read-only for teachers. Contact admin to add or modify exams.</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Upcoming Exams</h3>
              <div className="space-y-2">
                {exams.length === 0 && (
                  <p className="text-sm text-muted-foreground">No exams yet.</p>
                )}
                {exams.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border border-border rounded p-3"
                  >
                    <div>
                      <p className="font-medium">{e.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.start_date} → {e.end_date} • Duration:{" "}
                        {e.duration_minutes ? `${e.duration_minutes} min` : "—"}
                      </p>
                      {e.notes && <p className="text-xs text-muted-foreground">Notes: {e.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={quizSubject} onChange={(e) => setQuizSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={quizDate} onChange={(e) => setQuizDate(e.target.value)} />
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
              </div>
              <div className="flex justify-end">
                <Button onClick={createQuiz} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" />
                  Add Quiz
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Upcoming Quizzes</h3>
              <div className="space-y-2">
                {quizzes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No quizzes yet.</p>
                )}
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between border border-border rounded p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {q.subject} — {q.topic}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {q.quiz_date} • Duration: {q.duration_minutes ? `${q.duration_minutes} min` : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setQuizEditingId(q.id);
                          setQuizSubject(q.subject);
                          setQuizTopic(q.topic);
                          setQuizDate(q.quiz_date);
                          setQuizDuration(q.duration_minutes?.toString() || "");
                        }}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem("quiz", q.id)}
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </Suspense>
  );
}


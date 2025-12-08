"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { DailyQuiz, RevisionSchedule, SeriesExam } from "@/lib/types";

type ClassOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function AdminSchedulesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [tab, setTab] = useState<string>("revisions");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => toLocalDate(new Date()), []);

  const [revisions, setRevisions] = useState<RevisionSchedule[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);

  // Form state + edit tracking
  const [revSubject, setRevSubject] = useState("");
  const [revTopic, setRevTopic] = useState("");
  const [revDate, setRevDate] = useState(today);
  const [revTeacher, setRevTeacher] = useState("");
  const [revEditingId, setRevEditingId] = useState<string | null>(null);

  const [examSubject, setExamSubject] = useState("");
  const [examStart, setExamStart] = useState(today);
  const [examEnd, setExamEnd] = useState(today);
  const [examDuration, setExamDuration] = useState("");
  const [examPaperDate, setExamPaperDate] = useState("");
  const [examNotes, setExamNotes] = useState("");
  const [examTeacher, setExamTeacher] = useState("");
  const [examEditingId, setExamEditingId] = useState<string | null>(null);

  const [quizSubject, setQuizSubject] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDate, setQuizDate] = useState(today);
  const [quizDuration, setQuizDuration] = useState("");
  const [quizTeacher, setQuizTeacher] = useState("");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }
    loadClasses();
    loadTeachers();
  }, [router]);

  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "revisions" || t === "exams" || t === "quizzes") {
      setTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedClass) {
      loadRevisions();
      loadExams();
      loadQuizzes();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      const cls = json.classes || json || [];
      setClasses(cls);
      if (cls.length > 0) setSelectedClass(cls[0].id);
    } catch (e) {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      const json = await res.json();
      const t = json.teachers || json || [];
      setTeachers(t);
    } catch (e) {
      toast.error("Failed to load teachers");
    }
  };

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

  const resetRevForm = () => {
    setRevSubject("");
    setRevTopic("");
    setRevDate(today);
    setRevTeacher("");
    setRevEditingId(null);
  };
  const resetExamForm = () => {
    setExamSubject("");
    setExamStart(today);
    setExamEnd(today);
    setExamDuration("");
    setExamPaperDate("");
    setExamNotes("");
    setExamTeacher("");
    setExamEditingId(null);
  };
  const resetQuizForm = () => {
    setQuizSubject("");
    setQuizTopic("");
    setQuizDate(today);
    setQuizDuration("");
    setQuizTeacher("");
    setQuizEditingId(null);
  };

  const upsertRevision = async () => {
    if (!revSubject || !revTopic || !revDate) {
      toast.error("Fill subject, topic, date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: revEditingId || undefined,
        class_id: selectedClass,
        subject: revSubject,
        topic: revTopic,
        revision_date: revDate,
        teacher_id: revTeacher || null,
      };
      const method = revEditingId ? "PUT" : "POST";
      const body = revEditingId ? payload : { ...payload };
      const res = await fetch("/api/revision-schedule", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved");
      resetRevForm();
      loadRevisions();
    } catch (e) {
      toast.error("Failed to save revision");
    } finally {
      setSaving(false);
    }
  };

  const upsertExam = async () => {
    if (!examSubject || !examStart || !examEnd) {
      toast.error("Fill subject and dates");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: examEditingId || undefined,
        class_id: selectedClass,
        subject: examSubject,
        start_date: examStart,
        end_date: examEnd,
        duration_minutes: examDuration ? Number(examDuration) : null,
        paper_given_date: examPaperDate || null,
        notes: examNotes || null,
        teacher_id: examTeacher || null,
      };
      const method = examEditingId ? "PUT" : "POST";
      const body = examEditingId ? payload : { ...payload };
      const res = await fetch("/api/series-exams", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved");
      resetExamForm();
      loadExams();
    } catch (e) {
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const upsertQuiz = async () => {
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
        teacher_id: quizTeacher || null,
      };
      const method = quizEditingId ? "PUT" : "POST";
      const body = quizEditingId ? payload : { ...payload };
      const res = await fetch("/api/daily-quizzes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved");
      resetQuizForm();
      loadQuizzes();
    } catch (e) {
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
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="md:pl-64">
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Schedules</h1>
              <p className="text-muted-foreground">
                Manage revisions, series exams, and quizzes for all classes.
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
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Input value={revSubject} onChange={(e) => setRevSubject(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Topic</Label>
                    <Input value={revTopic} onChange={(e) => setRevTopic(e.target.value)} />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Teacher</Label>
                    <select
                      value={revTeacher}
                      onChange={(e) => setRevTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {revEditingId && (
                    <Button variant="outline" onClick={resetRevForm}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={upsertRevision} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Plus className="w-4 h-4" />
                    {revEditingId ? "Update Revision" : "Add Revision"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Revisions</h3>
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
                          {r.revision_date} • Teacher:{" "}
                          {teachers.find((t) => t.id === r.teacher_id)?.name || "—"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRevEditingId(r.id);
                            setRevSubject(r.subject);
                            setRevTopic(r.topic);
                            setRevDate(r.revision_date);
                            setRevTeacher(r.teacher_id || "");
                          }}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem("revision", r.id)}
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

            <TabsContent value="exams" className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Input value={examSubject} onChange={(e) => setExamSubject(e.target.value)} />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={examStart} onChange={(e) => setExamStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={examEnd} onChange={(e) => setExamEnd(e.target.value)} />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={examDuration}
                      onChange={(e) => setExamDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Paper Given Date</Label>
                    <Input
                      type="date"
                      value={examPaperDate}
                      onChange={(e) => setExamPaperDate(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Notes</Label>
                    <Textarea
                      rows={2}
                      value={examNotes}
                      onChange={(e) => setExamNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Teacher</Label>
                    <select
                      value={examTeacher}
                      onChange={(e) => setExamTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {examEditingId && (
                    <Button variant="outline" onClick={resetExamForm}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={upsertExam} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Plus className="w-4 h-4" />
                    {examEditingId ? "Update Exam" : "Add Exam"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Series Exams</h3>
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
                          {e.duration_minutes ? `${e.duration_minutes} min` : "—"} • Teacher:{" "}
                          {teachers.find((t) => t.id === e.teacher_id)?.name || "—"}
                        </p>
                        {e.notes && <p className="text-xs text-muted-foreground">Notes: {e.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setExamEditingId(e.id);
                            setExamSubject(e.subject);
                            setExamStart(e.start_date);
                            setExamEnd(e.end_date);
                            setExamDuration(
                              e.duration_minutes !== null && e.duration_minutes !== undefined
                                ? String(e.duration_minutes)
                                : "",
                            );
                            setExamPaperDate(e.paper_given_date || "");
                            setExamNotes(e.notes || "");
                            setExamTeacher(e.teacher_id || "");
                          }}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem("exam", e.id)}
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
                  <div>
                    <Label>Teacher</Label>
                    <select
                      value={quizTeacher}
                      onChange={(e) => setQuizTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {quizEditingId && (
                    <Button variant="outline" onClick={resetQuizForm}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={upsertQuiz} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Plus className="w-4 h-4" />
                    {quizEditingId ? "Update Quiz" : "Add Quiz"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Quizzes</h3>
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
                          {q.quiz_date} • Duration: {q.duration_minutes ? `${q.duration_minutes} min` : "—"} •
                          Teacher: {teachers.find((t) => t.id === q.teacher_id)?.name || "—"}
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
                            setQuizDuration(
                              q.duration_minutes !== null && q.duration_minutes !== undefined
                                ? String(q.duration_minutes)
                                : "",
                            );
                            setQuizTeacher(q.teacher_id || "");
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
    </div>
  );
}

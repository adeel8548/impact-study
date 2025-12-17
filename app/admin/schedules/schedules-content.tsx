"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ExamCard } from "@/components/exam-card";
import { QuizCard } from "@/components/quiz-card";
import type { DailyQuiz, RevisionSchedule, SeriesExam } from "@/lib/types";

type ClassOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };
type Assignment = {
  subject_id: string;
  subject_name?: string | null;
  teacher_id: string;
  teacher_name?: string | null;
};

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function AdminSchedulesContent() {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [tab, setTab] = useState<string>("revisions");
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
  const [quizTotalMarks, setQuizTotalMarks] = useState("");
  const [quizTeacher, setQuizTeacher] = useState("");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      return;
    }
    loadClasses();
    loadTeachers();
  }, []);

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
      loadSubjects();
      loadAssignments();
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

  const loadSubjects = async () => {
    try {
      const res = await fetch(`/api/classes/${selectedClass}/subjects`);
      const json = await res.json();
      const list: SubjectOption[] = (json.subjects || []).map((s: any) => ({
        id: s.id,
        name: s.name,
      }));
      setSubjects(list);
      if (list.length > 0 && !examSubject) {
        setExamSubject(list[0].name);
      }
    } catch (e) {
      toast.error("Failed to load subjects");
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await fetch(`/api/classes/${selectedClass}/assignments`);
      const json = await res.json();
      const list: Assignment[] = Array.isArray(json.assignments)
        ? json.assignments
        : [];
      setAssignments(list);
    } catch (e) {
      console.error("Failed to load assignments", e);
      setAssignments([]);
    }
  };

  const teachersForSubject = (subjectName: string) => {
    const matches = assignments.filter(
      (a) =>
        a.subject_name === subjectName ||
        (!a.subject_name && a.subject_id === subjectName),
    );
    // unique by teacher_id
    const unique = matches.filter(
      (v, idx, arr) =>
        arr.findIndex((x) => x.teacher_id === v.teacher_id) === idx,
    );
    return unique;
  };

  // Auto-select first subject when list loads
  useEffect(() => {
    if (subjects.length > 0) {
      if (!revSubject) setRevSubject(subjects[0].name);
      if (!examSubject) setExamSubject(subjects[0].name);
      if (!quizSubject) setQuizSubject(subjects[0].name);
    } else {
      setRevSubject("");
      setExamSubject("");
      setQuizSubject("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  // Auto-select teacher filtered by subject
  useEffect(() => {
    const list = teachersForSubject(revSubject);
    if (list.length === 0) {
      setRevTeacher("");
      return;
    }
    if (!list.find((t) => t.teacher_id === revTeacher)) {
      setRevTeacher(list[0].teacher_id);
    }
  }, [revSubject, assignments]);

  useEffect(() => {
    const list = teachersForSubject(examSubject);
    if (list.length === 0) {
      setExamTeacher("");
      return;
    }
    if (!list.find((t) => t.teacher_id === examTeacher)) {
      setExamTeacher(list[0].teacher_id);
    }
  }, [examSubject, assignments]);

  useEffect(() => {
    const list = teachersForSubject(quizSubject);
    if (list.length === 0) {
      setQuizTeacher("");
      return;
    }
    if (!list.find((t) => t.teacher_id === quizTeacher)) {
      setQuizTeacher(list[0].teacher_id);
    }
  }, [quizSubject, assignments]);

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
    setRevSubject(subjects[0]?.name || "");
    setRevTopic("");
    setRevDate(today);
    setRevTeacher("");
    setRevEditingId(null);
  };
  const resetExamForm = () => {
    setExamSubject(subjects[0]?.name || "");
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
    setQuizTotalMarks("");
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
      // Find subject_id from class subjects
      let subjectId: string | undefined = undefined;
      try {
        const subRes = await fetch(`/api/classes/${selectedClass}/subjects`);
        const subData = await subRes.json();
        const subjects = Array.isArray(subData.subjects)
          ? subData.subjects
          : [];
        const matching = subjects.find(
          (s: any) => s.name === revSubject || s.id === revSubject,
        );
        if (matching?.id) {
          subjectId = matching.id;
        }
      } catch (err) {
        console.warn("Failed to lookup subject_id:", err);
      }

      const payload = {
        id: revEditingId || undefined,
        class_id: selectedClass,
        subject: revSubject,
        subject_id: subjectId,
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
      // Find subject_id from class subjects
      let subjectId: string | undefined = undefined;
      try {
        const subRes = await fetch(`/api/classes/${selectedClass}/subjects`);
        const subData = await subRes.json();
        const subjects = Array.isArray(subData.subjects)
          ? subData.subjects
          : [];
        const matching = subjects.find(
          (s: any) => s.name === examSubject || s.id === examSubject,
        );
        if (matching?.id) {
          subjectId = matching.id;
        }
      } catch (err) {
        console.warn("Failed to lookup subject_id:", err);
      }

      const payload = {
        id: examEditingId || undefined,
        class_id: selectedClass,
        subject: examSubject,
        subject_id: subjectId,
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
      // Find subject_id from class subjects
      let subjectId: string | undefined = undefined;
      try {
        const subRes = await fetch(`/api/classes/${selectedClass}/subjects`);
        const subData = await subRes.json();
        const subjects = Array.isArray(subData.subjects)
          ? subData.subjects
          : [];
        const matching = subjects.find(
          (s: any) => s.name === quizSubject || s.id === quizSubject,
        );
        if (matching?.id) {
          subjectId = matching.id;
        }
      } catch (err) {
        console.warn("Failed to lookup subject_id:", err);
      }

      const payload = {
        id: quizEditingId || undefined,
        class_id: selectedClass,
        subject: quizSubject,
        subject_id: subjectId,
        topic: quizTopic,
        quiz_date: quizDate,
        duration_minutes: quizDuration ? Number(quizDuration) : null,
        total_marks: quizTotalMarks ? Number(quizTotalMarks) : null,
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

  const deleteItem = async (
    table: "revision" | "exam" | "quiz",
    id: string,
  ) => {
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
                    <select
                      value={revSubject}
                      onChange={(e) => setRevSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      {subjects.length === 0 && (
                        <option value="">No subjects</option>
                      )}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Topic</Label>
                    <Input
                      value={revTopic}
                      onChange={(e) => setRevTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={revDate}
                      onChange={(e) => setRevDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Teacher</Label>
                    <select
                      value={revTeacher}
                      onChange={(e) => setRevTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select</option>
                      {teachersForSubject(revSubject).map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.teacher_name || "Teacher"}
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
                  <Button
                    onClick={upsertRevision}
                    disabled={saving}
                    className="gap-2"
                  >
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
                          {r.revision_date} • Teacher:{" "}
                          {teachers.find((t) => t.id === r.teacher_id)?.name ||
                            "—"}
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
                    <select
                      value={examSubject}
                      onChange={(e) => setExamSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                      disabled={subjects.length === 0}
                    >
                      {subjects.length === 0 && (
                        <option value="">No subjects</option>
                      )}
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={examStart}
                      onChange={(e) => setExamStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={examEnd}
                      onChange={(e) => setExamEnd(e.target.value)}
                    />
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
                      {teachersForSubject(examSubject).map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.teacher_name || "Teacher"}
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
                  <Button
                    onClick={upsertExam}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Plus className="w-4 h-4" />
                    {examEditingId ? "Update Exam" : "Add Exam"}
                  </Button>
                </div>
              </Card>

              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Series Exams
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
                      teacherName={
                        teachers.find((t) => t.id === e.teacher_id)?.name
                      }
                      className={classes.find((c) => c.id === e.class_id)?.name}
                      onEdit={(exam) => {
                        setExamEditingId(exam.id);
                        setExamSubject(exam.subject);
                        setExamStart(exam.start_date);
                        setExamEnd(exam.end_date);
                        setExamDuration(
                          exam.duration_minutes !== null &&
                            exam.duration_minutes !== undefined
                            ? String(exam.duration_minutes)
                            : "",
                        );
                        setExamPaperDate(exam.paper_given_date || "");
                        setExamNotes(exam.notes || "");
                        setExamTeacher(exam.teacher_id || "");
                      }}
                      onDelete={(id) => deleteItem("exam", id)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="grid md:grid-cols-5 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <select
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
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
                  <div>
                    <Label>Teacher</Label>
                    <select
                      value={quizTeacher}
                      onChange={(e) => setQuizTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select</option>
                      {teachersForSubject(quizSubject).map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.teacher_name || "Teacher"}
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
                  <Button
                    onClick={upsertQuiz}
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
                  Quizzes
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
                      teacherName={
                        teachers.find((t) => t.id === q.teacher_id)?.name
                      }
                      className={classes.find((c) => c.id === q.class_id)?.name}
                      onEdit={(quiz) => {
                        setQuizEditingId(quiz.id);
                        setQuizSubject(quiz.subject);
                        setQuizTopic(quiz.topic);
                        setQuizDate(quiz.quiz_date);
                        setQuizDuration(
                          quiz.duration_minutes !== null &&
                            quiz.duration_minutes !== undefined
                            ? String(quiz.duration_minutes)
                            : "",
                        );
                        setQuizTotalMarks(
                          quiz.total_marks !== null &&
                            quiz.total_marks !== undefined
                            ? String(quiz.total_marks)
                            : "",
                        );
                        setQuizTeacher(quiz.teacher_id || "");
                      }}
                      onDelete={(id) => deleteItem("quiz", id)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

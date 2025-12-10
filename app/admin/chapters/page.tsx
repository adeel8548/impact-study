"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

type ExamChapter = {
  id: string;
  exam_id: string;
  subject_id: string;
  chapter_name: string;
  chapter_date: string;
  max_marks: number;
};

type ClassOption = { id: string; name: string };
type SeriesExam = {
  id: string;
  subject: string;
  start_date: string;
  end_date: string;
};
type SubjectOption = { id: string; name: string };

export default function ChaptersPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [chapterName, setChapterName] = useState("");
  const [chapterDate, setChapterDate] = useState("");
  const [maxMarks, setMaxMarks] = useState<string>("100");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }
    loadClasses();
  }, [router]);

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      const classList = data.classes || [];
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

  // Load exams and subjects for selected class
  useEffect(() => {
    if (selectedClass) {
      loadExamsAndSubjects();
    }
  }, [selectedClass]);

  const loadExamsAndSubjects = async () => {
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        fetch(`/api/series-exams?classId=${selectedClass}`),
        fetch(`/api/classes/${selectedClass}/subjects`),
      ]);
      const examsJson = await examsRes.json();
      const subjectsJson = await subjectsRes.json();

      const examsData = examsJson.data || [];
      setExams(examsData);

      const subjectOptions = (subjectsJson.subjects || []).map((s: any) => ({
        id: s.id,
        name: s.name,
      }));
      setSubjects(subjectOptions);

      setSelectedSubject(subjectOptions[0]?.id || "");
      setSelectedExam("");
      setChapters([]);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast.error("Failed to load series exams");
    }
  };

  // Filter exams based on selected subject
  const selectedSubjectName =
    subjects.find((s) => s.id === selectedSubject)?.name || "";
  const filteredExams = selectedSubjectName
    ? exams.filter((e) => e.subject === selectedSubjectName)
    : [];

  // Load chapters for selected exam
  useEffect(() => {
    if (selectedExam) {
      loadChapters();
    }
  }, [selectedExam]);

  const loadChapters = async () => {
    try {
      const res = await fetch(`/api/chapters?examId=${selectedExam}`);
      const data = await res.json();
      setChapters(data.data || []);
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Failed to load chapters");
    }
  };

  // Save chapter
  const handleSaveChapter = async () => {
    if (!chapterName.trim() || !chapterDate || !maxMarks.trim()) {
      toast.error("Please enter chapter name, date, and max marks");
      return;
    }

    if (!selectedExam) {
      toast.error("Please select an exam");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? {
            id: editingId,
            chapter_name: chapterName,
            chapter_date: chapterDate,
            max_marks: Number(maxMarks),
          }
        : {
            exam_id: selectedExam,
            subject_id: selectedSubject,
            chapter_name: chapterName,
            chapter_date: chapterDate,
            max_marks: Number(maxMarks),
          };

      const res = await fetch("/api/chapters", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(editingId ? "Chapter updated" : "Chapter added");
      resetForm();
      loadChapters();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error("Failed to save chapter");
    } finally {
      setSaving(false);
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    try {
      const res = await fetch(`/api/chapters?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Chapter deleted");
      loadChapters();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error("Failed to delete chapter");
    }
  };

  // Edit chapter
  const handleEditChapter = (chapter: ExamChapter) => {
    setEditingId(chapter.id);
    setChapterName(chapter.chapter_name);
    setChapterDate(chapter.chapter_date);
    setMaxMarks(chapter.max_marks.toString());
  };

  const resetForm = () => {
    setEditingId(null);
    setChapterName("");
    setChapterDate("");
    setMaxMarks("100");
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="md:pl-64">
        <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chapters</h1>
            <p className="text-muted-foreground">
              Manage chapters for series exams
            </p>
          </div>

          {/* Selection Section */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold mb-4">Select Exam</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class Selection */}
              <div>
                <Label
                  htmlFor="class-select"
                  className="text-sm font-medium mb-2 block"
                >
                  Class
                </Label>
                <select
                  id="class-select"
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
                <Label
                  htmlFor="subject-select"
                  className="text-sm font-medium mb-2 block"
                >
                  Subject
                </Label>
                <select
                  id="subject-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={subjects.length === 0}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Selection */}
              <div>
                <Label
                  htmlFor="exam-select"
                  className="text-sm font-medium mb-2 block"
                >
                  Series Exam
                </Label>
                <select
                  id="exam-select"
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  disabled={filteredExams.length === 0}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select</option>
                  {filteredExams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.subject} ({e.start_date} → {e.end_date})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Add/Edit Form */}
          {selectedExam && (
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? "Edit Chapter" : "Add New Chapter"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="chapter-name">Chapter Name</Label>
                  <Input
                    id="chapter-name"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="e.g., Chapter 1: Motion"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-date">Date</Label>
                  <Input
                    id="chapter-date"
                    type="date"
                    value={chapterDate}
                    onChange={(e) => setChapterDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="max-marks">Max Marks</Label>
                  <Input
                    id="max-marks"
                    type="number"
                    min="1"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    placeholder="e.g., 100"
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    منسوخ کریں
                  </Button>
                )}
                <Button
                  onClick={handleSaveChapter}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" />
                  {editingId ? "Update" : "Add"}
                </Button>
              </div>
            </Card>
          )}

          {/* Chapters List */}
          {selectedExam && (
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold mb-4">Chapters List</h3>
              {chapters.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No chapters
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold">
                          Chapter Name
                        </th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-center p-3 font-semibold">
                          Max Marks
                        </th>
                        <th className="text-center p-3 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.map((chapter, idx) => (
                        <tr
                          key={chapter.id}
                          className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                        >
                          <td className="p-3">{chapter.chapter_name}</td>
                          <td className="p-3">
                            {new Date(chapter.chapter_date).toLocaleDateString(
                              "en-US",
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {chapter.max_marks}
                          </td>
                          <td className="p-3 flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditChapter(chapter)}
                              className="h-8 w-8"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteChapter(chapter.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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
type Subject = { id: string; name: string; class_id: string };
type SeriesExam = { id: string; name: string; class_id: string };

export default function ChaptersPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [chapterName, setChapterName] = useState("");
  const [chapterDate, setChapterDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
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
      toast.error("کلاسز لوڈ نہیں ہو سکیں");
    } finally {
      setLoading(false);
    }
  };

  // Load subjects for selected class
  useEffect(() => {
    if (selectedClass) {
      loadSubjects();
    }
  }, [selectedClass]);

  const loadSubjects = async () => {
    try {
      const res = await fetch(`/api/classes/${selectedClass}/subjects`);
      const data = await res.json();
      setSubjects(data.subjects || []);
      setSelectedSubject("");
      setSelectedExam("");
      setChapters([]);
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  // Load exams for selected class
  useEffect(() => {
    if (selectedClass) {
      loadExams();
    }
  }, [selectedClass]);

  const loadExams = async () => {
    try {
      const res = await fetch(`/api/series-exams?classId=${selectedClass}`);
      const data = await res.json();
      setExams(data.data || []);
    } catch (error) {
      console.error("Error loading exams:", error);
    }
  };

  // Load chapters for selected exam and subject
  useEffect(() => {
    if (selectedExam && selectedSubject) {
      loadChapters();
    }
  }, [selectedExam, selectedSubject]);

  const loadChapters = async () => {
    try {
      const res = await fetch(
        `/api/chapters?examId=${selectedExam}&subjectId=${selectedSubject}`
      );
      const data = await res.json();
      setChapters(data.data || []);
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("ابواب لوڈ نہیں ہو سکے");
    }
  };

  // Save chapter
  const handleSaveChapter = async () => {
    if (!chapterName.trim() || !chapterDate || !maxMarks) {
      toast.error("تمام فیلڈز درج کریں");
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
            max_marks: parseInt(maxMarks),
          }
        : {
            exam_id: selectedExam,
            subject_id: selectedSubject,
            chapter_name: chapterName,
            chapter_date: chapterDate,
            max_marks: parseInt(maxMarks),
          };

      const res = await fetch("/api/chapters", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(editingId ? "ابواب اپڈیٹ ہو گیا" : "ابواب شامل ہو گیا");
      resetForm();
      loadChapters();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error("ابواب محفوظ نہیں ہو سکا");
    } finally {
      setSaving(false);
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (id: string) => {
    if (!confirm("کیا آپ یہ ابواب حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/chapters?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("ابواب حذف ہو گیا");
      loadChapters();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error("ابواب حذف نہیں ہو سکا");
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
    setMaxMarks("");
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
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">ابواب</h1>
            <p className="text-muted-foreground">
              امتحانات کے لیے ابواب کو منظم کریں
            </p>
          </div>

          {/* Selection Section */}
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class Selection */}
              <div>
                <Label className="text-sm">کلاس منتخب کریں</Label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground mt-2"
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
                <Label className="text-sm">مضمون منتخب کریں</Label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground mt-2"
                >
                  <option value="">منتخب کریں</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Selection */}
              <div>
                <Label className="text-sm">امتحان منتخب کریں</Label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground mt-2"
                >
                  <option value="">منتخب کریں</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Add/Edit Form */}
          {selectedExam && selectedSubject && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">
                {editingId ? "ابواب میں ترمیم کریں" : "نیا ابواب شامل کریں"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>ابواب کا نام</Label>
                  <Input
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="مثال: باب 1، حرکیات"
                  />
                </div>
                <div>
                  <Label>تاریخ</Label>
                  <Input
                    type="date"
                    value={chapterDate}
                    onChange={(e) => setChapterDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>کل نمبر</Label>
                  <Input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    placeholder="50"
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
                  {editingId ? "اپڈیٹ کریں" : "شامل کریں"}
                </Button>
              </div>
            </Card>
          )}

          {/* Chapters List */}
          {selectedExam && selectedSubject && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">ابواب کی فہرست</h3>
              {chapters.length === 0 ? (
                <p className="text-muted-foreground">کوئی ابواب نہیں</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="text-right p-2">نام</th>
                        <th className="text-right p-2">تاریخ</th>
                        <th className="text-right p-2">کل نمبر</th>
                        <th className="text-right p-2">عمل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.map((chapter) => (
                        <tr
                          key={chapter.id}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="p-2">{chapter.chapter_name}</td>
                          <td className="p-2">
                            {new Date(chapter.chapter_date).toLocaleDateString(
                              "ur-PK"
                            )}
                          </td>
                          <td className="p-2">{chapter.max_marks}</td>
                          <td className="p-2 flex gap-2">
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

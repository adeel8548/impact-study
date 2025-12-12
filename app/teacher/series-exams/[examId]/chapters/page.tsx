"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type ExamChapter = {
  id: string;
  exam_id: string;
  chapter_name: string;
  chapter_date: string;
  max_marks: number;
};

type SeriesExam = {
  id: string;
  subject: string;
  start_date: string;
  end_date: string;
  class_id: string;
};

export default function TeacherChaptersPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [exam, setExam] = useState<SeriesExam | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [chapterName, setChapterName] = useState("");
  const [chapterDate, setChapterDate] = useState("");
  const [maxMarks, setMaxMarks] = useState<string>("100");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load exam details and chapters
  useEffect(() => {
    if (examId) {
      loadExamAndChapters();
    }
  }, [examId]);

  const loadExamAndChapters = async () => {
    setLoading(true);
    try {
      // Fetch exam details
      const examRes = await fetch(`/api/series-exams/${examId}`);
      if (!examRes.ok) {
        throw new Error("Failed to load exam details");
      }
      const examData = await examRes.json();
      setExam(examData.data);

      // Fetch subjects for the exam's class so we can resolve subject_id
      if (examData?.data?.class_id) {
        try {
          const subjRes = await fetch(
            `/api/subjects?classId=${examData.data.class_id}`,
          );
          if (subjRes.ok) {
            const subjJson = await subjRes.json();
            setSubjects(subjJson.subjects || []);
          }
        } catch (e) {
          console.warn("Failed to load subjects for class", e);
        }
      }

      // Fetch chapters for this exam
      const chaptersRes = await fetch(`/api/chapters?examId=${examId}`);
      if (!chaptersRes.ok) {
        throw new Error("Failed to load chapters");
      }
      const chaptersData = await chaptersRes.json();
      setChapters(chaptersData.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load exam or chapters");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChapter = async () => {
    if (!chapterName.trim() || !chapterDate) {
      toast.error("Please enter chapter name and date");
      return;
    }

    const maxMarksNum = parseFloat(maxMarks);
    if (isNaN(maxMarksNum) || maxMarksNum <= 0) {
      toast.error("Max marks must be a positive number");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      // Resolve subject_id from loaded subjects by matching exam.subject (text)
      const matchedSubject = subjects.find((s) => s.name === exam?.subject);

      if (!editingId && !matchedSubject) {
        toast.error(
          "Could not determine subject id for this exam. Please contact admin.",
        );
        setSaving(false);
        return;
      }

      const body = editingId
        ? {
            id: editingId,
            chapter_name: chapterName,
            chapter_date: chapterDate,
            max_marks: maxMarksNum,
          }
        : {
            exam_id: examId,
            subject_id: matchedSubject?.id,
            chapter_name: chapterName,
            chapter_date: chapterDate,
            max_marks: maxMarksNum,
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
      loadExamAndChapters();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error("Failed to save chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    try {
      const res = await fetch(`/api/chapters?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Chapter deleted");
      loadExamAndChapters();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error("Failed to delete chapter");
    }
  };

  const handleEdit = (chapter: ExamChapter) => {
    setChapterName(chapter.chapter_name);
    setChapterDate(chapter.chapter_date);
    setMaxMarks(chapter.max_marks.toString());
    setEditingId(chapter.id);
  };

  const resetForm = () => {
    setChapterName("");
    setChapterDate("");
    setMaxMarks("100");
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TeacherHeader />
        <div className="flex items-center justify-center p-8 min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Series Exam Chapters
            </h1>
            {exam && (
              <p className="text-muted-foreground mt-1">
                {exam.subject} ({exam.start_date} to {exam.end_date})
              </p>
            )}
          </div>
        </div>

        {/* Add/Edit Chapter Form */}
        <Card className="p-6 bg-white">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Chapter" : "Add New Chapter"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="chapter-name"
                className="text-sm font-medium mb-2 block"
              >
                Chapter Name
              </Label>
              <Input
                id="chapter-name"
                placeholder="e.g., Introduction to Biology"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
              />
            </div>

            <div>
              <Label
                htmlFor="chapter-date"
                className="text-sm font-medium mb-2 block"
              >
                Chapter Date
              </Label>
              <Input
                id="chapter-date"
                type="date"
                value={chapterDate}
                onChange={(e) => setChapterDate(e.target.value)}
              />
            </div>

            <div>
              <Label
                htmlFor="max-marks"
                className="text-sm font-medium mb-2 block"
              >
                Max Marks
              </Label>
              <Input
                id="max-marks"
                type="number"
                min="0"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSaveChapter}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {editingId ? "Update Chapter" : "Add Chapter"}
                </>
              )}
            </Button>

            {editingId && (
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </Card>

        {/* Chapters List */}
        <Card className="p-6 bg-white">
          <h2 className="text-lg font-semibold mb-4">
            Chapters ({chapters.length})
          </h2>

          {chapters.length === 0 ? (
            <div className="p-8 text-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">
                No chapters found. Add a new chapter to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.map((chapter) => {
                const subjectName =
                  subjects.find((s) => s.id === (chapter as any).subject_id)
                    ?.name ||
                  exam?.subject ||
                  "—";
                return (
                  <div
                    key={chapter.id}
                    className="p-4 border border-border rounded bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          {chapter.chapter_name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Subject:{" "}
                          <span className="font-medium">{subjectName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Date: {chapter.chapter_date}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Max Marks: {chapter.max_marks}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(chapter)}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

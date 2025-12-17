"use client";

import { useEffect, useState } from "react";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ExamChapter = {
  id: string;
  exam_id: string;
  subject_id: string;
  chapter_name: string;
  chapter_date: string;
  max_marks: number;
};

type SeriesExam = {
  id: string;
  subject: string;
  start_date: string;
  end_date: string;
};

export default function TeacherChaptersPage() {
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  // Simple localStorage check for teacher role
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "teacher") {
      return;
    }
    setTeacherId(user.id);
    loadClasses(user.id);
  }, []);

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
    }
  };

  // Load exams for selected class
  useEffect(() => {
    if (selectedClass && teacherId) {
      loadExams();
    }
  }, [selectedClass, teacherId]);

  const loadExams = async () => {
    try {
      const params = new URLSearchParams({
        classId: selectedClass,
        teacherId,
      });
      const res = await fetch(`/api/series-exams?${params}`);
      const data = await res.json();
      setExams(data.data || []);
      loadChapters(data.data || []);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  // Load chapters from the exams
  const loadChapters = async (examsList: SeriesExam[]) => {
    try {
      const allChapters: ExamChapter[] = [];

      for (const exam of examsList) {
        const res = await fetch(`/api/chapters?examId=${exam.id}`);
        const data = await res.json();
        const examChapters = (data.data || []).map((chapter: ExamChapter) => ({
          ...chapter,
          subject: exam.subject,
          start_date: exam.start_date,
          end_date: exam.end_date,
        }));
        allChapters.push(...examChapters);
      }

      setChapters(allChapters);
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Failed to load chapters");
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
      <TeacherHeader />

      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chapters</h1>
          <p className="text-muted-foreground">
            View chapters for your assigned subjects
          </p>
        </div>

        {/* Class Selection */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Class</label>
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

        {/* Chapters List */}
        {chapters.length === 0 ? (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">
              No chapters found for your subjects
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Chapters for{" "}
              {exams.length > 0 ? "Your Subjects" : "Selected Class"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapters.map((chapter) => (
                <Card
                  key={chapter.id}
                  className="p-4 border border-border hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Chapter Name
                      </p>
                      <p className="text-lg font-semibold">
                        {chapter.chapter_name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Subject</p>
                        <p className="font-medium">
                          {(chapter as any).subject || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Max Marks
                        </p>
                        <p className="font-medium text-base">
                          {chapter.max_marks}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {new Date(chapter.chapter_date).toLocaleDateString(
                          "en-US",
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

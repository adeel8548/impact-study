"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Edit2, Calendar } from "lucide-react";
import { toast } from "sonner";

type SeriesExam = {
  id: string;
  name: string;
  class_id: string;
  start_date: string;
  end_date: string;
  created_at?: string;
};

type ClassOption = { id: string; name: string };

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<SeriesExam[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [examName, setExamName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      toast.error("امتحانات لوڈ نہیں ہو سکے");
    }
  };

  // Save exam
  const handleSaveExam = async () => {
    if (!examName.trim() || !startDate || !endDate) {
      toast.error("تمام فیلڈز درج کریں");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("شروعاتی تاریخ اختتام سے پہلے ہونی چاہیے");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? {
            id: editingId,
            name: examName,
            start_date: startDate,
            end_date: endDate,
          }
        : {
            name: examName,
            class_id: selectedClass,
            start_date: startDate,
            end_date: endDate,
          };

      const res = await fetch("/api/series-exams", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(
        editingId ? "امتحان اپڈیٹ ہو گیا" : "امتحان شامل ہو گیا"
      );
      resetForm();
      loadExams();
    } catch (error) {
      console.error("Error saving exam:", error);
      toast.error("امتحان محفوظ نہیں ہو سکا");
    } finally {
      setSaving(false);
    }
  };

  // Delete exam
  const handleDeleteExam = async (id: string) => {
    if (!confirm("کیا آپ اس امتحان کو حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/series-exams?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("امتحان حذف ہو گیا");
      loadExams();
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("امتحان حذف نہیں ہو سکا");
    }
  };

  // Edit exam
  const handleEditExam = (exam: SeriesExam) => {
    setEditingId(exam.id);
    setExamName(exam.name);
    setStartDate(exam.start_date);
    setEndDate(exam.end_date);
  };

  const resetForm = () => {
    setEditingId(null);
    setExamName("");
    setStartDate("");
    setEndDate("");
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
            <h1 className="text-3xl font-bold text-foreground">امتحانات</h1>
            <p className="text-muted-foreground">
              سلسلہ وار امتحانات کو منظم کریں
            </p>
          </div>

          {/* Class Selection */}
          <Card className="p-4">
            <Label className="text-sm">کلاس منتخب کریں</Label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-border rounded bg-background text-foreground mt-2"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Card>

          {/* Add/Edit Form */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">
              {editingId ? "امتحان میں ترمیم کریں" : "نیا امتحان شامل کریں"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>امتحان کا نام</Label>
                <Input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="مثال: نصف سالانہ، سالانہ"
                />
              </div>
              <div>
                <Label>شروعاتی تاریخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>اختتام تاریخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                onClick={handleSaveExam}
                disabled={saving}
                className="gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                {editingId ? "اپڈیٹ کریں" : "شامل کریں"}
              </Button>
            </div>
          </Card>

          {/* Exams List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              {classes.find((c) => c.id === selectedClass)?.name} کے امتحانات
            </h3>
            {exams.length === 0 ? (
              <p className="text-muted-foreground">کوئی امتحان نہیں</p>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-border rounded hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{exam.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(exam.start_date).toLocaleDateString(
                              "ur-PK"
                            )}
                          </span>
                        </div>
                        <span>سے</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(exam.end_date).toLocaleDateString(
                              "ur-PK"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditExam(exam)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExam(exam.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

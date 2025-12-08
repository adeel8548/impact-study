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

type Subject = {
  id: string;
  name: string;
  class_id: string;
  created_at?: string;
};

type ClassOption = { id: string; name: string };

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjectName, setSubjectName] = useState("");
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

  // Load classes
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
    } catch (error) {
      console.error("Error loading subjects:", error);
      toast.error("مضامین لوڈ نہیں ہو سکے");
    }
  };

  // Create or update subject
  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      toast.error("مضمون کا نام درج کریں");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, name: subjectName }
        : { name: subjectName, class_id: selectedClass };

      const res = await fetch(`/api/classes/${selectedClass}/subjects`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(editingId ? "مضمون اپڈیٹ ہو گیا" : "مضمون شامل ہو گیا");
      setSubjectName("");
      setEditingId(null);
      loadSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("مضمون محفوظ نہیں ہو سکا");
    } finally {
      setSaving(false);
    }
  };

  // Delete subject
  const handleDeleteSubject = async (id: string) => {
    if (!confirm("کیا آپ اس مضمون کو حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/classes/${selectedClass}/subjects?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("مضمون حذف ہو گیا");
      loadSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("مضمون حذف نہیں ہو سکا");
    }
  };

  // Edit subject
  const handleEditSubject = (subject: Subject) => {
    setEditingId(subject.id);
    setSubjectName(subject.name);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setSubjectName("");
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
            <h1 className="text-3xl font-bold text-foreground">مضامین</h1>
            <p className="text-muted-foreground">
              کلاسز کے لیے مضامین کو منظم کریں
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
              {editingId ? "مضمون میں ترمیم کریں" : "نیا مضمون شامل کریں"}
            </h3>
            <div>
              <Label>مضمون کا نام</Label>
              <Input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="مثال: ریاضی، انگریزی"
              />
            </div>
            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button variant="outline" onClick={handleCancel}>
                  منسوخ کریں
                </Button>
              )}
              <Button
                onClick={handleSaveSubject}
                disabled={saving}
                className="gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                {editingId ? "اپڈیٹ کریں" : "شامل کریں"}
              </Button>
            </div>
          </Card>

          {/* Subjects List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              {classes.find((c) => c.id === selectedClass)?.name} کے مضامین
            </h3>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground">کوئی مضمون نہیں</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/50"
                  >
                    <span className="font-medium">{subject.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSubject(subject)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSubject(subject.id)}
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

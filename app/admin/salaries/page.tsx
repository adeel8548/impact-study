"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Card } from "@/components/ui/card";
import { adminCardClass } from "@/lib/admin-ui";
import { TeacherSalaryClient } from "@/components/teacher-salary-client";
import { Loader2, AlertCircle } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function SalaryManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/teachers");
      if (!response.ok) throw new Error("Failed to fetch teachers");
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teachers");
      console.error("[Salaries] Error fetching teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Teacher Salary Management"
        description="Track, manage, and process teacher salary payments by month"
      />

      {error && (
        <div className="flex gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {teachers.length === 0 ? (
        <Card className={adminCardClass("p-8 text-center")}>
          <p className="text-muted-foreground">
            No teachers found in the system
          </p>
        </Card>
      ) : (
        <TeacherSalaryClient teachers={teachers} />
      )}
    </>
  );
}

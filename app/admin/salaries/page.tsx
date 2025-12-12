"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
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
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="md:pl-64 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Teacher Salary Management
            </h1>
            <p className="text-muted-foreground">
              Track, manage, and process teacher salary payments by month
            </p>
          </div>

          {error && (
            <div className="flex gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {teachers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No teachers found in the system
              </p>
            </Card>
          ) : (
            <TeacherSalaryClient teachers={teachers} />
          )}
        </div>
      </div>
    </div>
  );
}

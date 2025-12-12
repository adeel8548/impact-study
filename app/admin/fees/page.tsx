"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentFeesClient } from "@/components/student-fees-client";
import { Loader2, AlertCircle } from "lucide-react";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_id: string;
}

export default function FeesManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data.students || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
      console.error("[Fees] Error fetching students:", err);
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
              Student Fees Management
            </h1>
            <p className="text-muted-foreground">
              Track, manage, and process student fee payments by month
            </p>
          </div>

          {error && (
            <div className="flex gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {students.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No students found in the system
              </p>
            </Card>
          ) : (
            <StudentFeesClient students={students} />
          )}
        </div>
      </div>
    </div>
  );
}

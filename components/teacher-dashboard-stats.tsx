"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  CalendarDays,
} from "lucide-react";

interface TeacherDashboardStatsProps {
  inchargeClassesCount: number;
  assignedSubjectsCount: number;
  todayPresentCount: number;
  showInchargeClasses: boolean;
  showAssignedSubjects: boolean;
}

export function TeacherDashboardStats({
  inchargeClassesCount,
  assignedSubjectsCount,
  todayPresentCount,
  showInchargeClasses,
  showAssignedSubjects,
}: TeacherDashboardStatsProps) {
  const [showValues, setShowValues] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Incharge Classes (only if teacher is incharge of classes) */}
      {showInchargeClasses && (
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">
                My Classes (Incharge)
              </p>
              <p className="text-3xl font-bold text-foreground">
                {showValues ? inchargeClassesCount : "*****"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? (
                  <EyeOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Assigned Subjects (only if teacher has assigned subjects) */}
      {showAssignedSubjects && (
        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Assigned Subjects
              </p>
              <p className="text-3xl font-bold text-foreground">
                {showValues ? assignedSubjectsCount : "*****"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? (
                  <EyeOff className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                )}
              </button>
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Today's Present (only show if incharge of classes) */}
      {showInchargeClasses && (
        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Today's Present
              </p>
              <p className="text-3xl font-bold text-foreground">
                {showValues ? todayPresentCount : "*****"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? (
                  <EyeOff className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </button>
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { DailyQuiz } from "@/lib/types";

interface QuizCardProps {
  quiz: DailyQuiz;
  teacherName?: string;
  className?: string;
  onEdit: (quiz: DailyQuiz) => void;
  onDelete: (id: string) => void;
}

export function QuizCard({
  quiz,
  teacherName = "—",
  className = "—",
  onEdit,
  onDelete,
}: QuizCardProps) {
  return (
    <Card className="p-4 border border-border hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Subject heading - Bold and prominent */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1">
            {quiz.subject}
          </h3>
        </div>

        {/* Topic/Chapter - Secondary heading */}
        <div className="pl-2 border-l-4 border-primary">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Topic / Chapter
          </span>
          <p className="text-lg font-semibold text-foreground">{quiz.topic}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {/* Class */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Class
            </span>
            <span className="text-foreground font-medium">{className}</span>
          </div>

          {/* Quiz Date */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Date
            </span>
            <span className="text-foreground font-medium">
              {quiz.quiz_date}
            </span>
          </div>

          {/* Duration */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Duration
            </span>
            <span className="text-foreground font-medium">
              {quiz.duration_minutes ? `${quiz.duration_minutes} min` : "—"}
            </span>
          </div>

          {/* Total Marks */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Marks
            </span>
            <span className="text-foreground font-medium">
              {quiz.total_marks ? `${quiz.total_marks}` : "—"}
            </span>
          </div>

          {/* Teacher */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Teacher
            </span>
            <span className="text-foreground font-medium">{teacherName}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(quiz)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(quiz.id)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

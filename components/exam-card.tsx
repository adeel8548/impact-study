"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { NotesDetailModal } from "@/components/modals/notes-detail-modal";
import type { SeriesExam } from "@/lib/types";

interface ExamCardProps {
  exam: SeriesExam;
  teacherName?: string;
  className?: string;
  onEdit: (exam: SeriesExam) => void;
  onDelete: (id: string) => void;
}

export function ExamCard({
  exam,
  teacherName = "—",
  className = "—",
  onEdit,
  onDelete,
}: ExamCardProps) {
  const [showNotesModal, setShowNotesModal] = useState(false);

  const truncateNotes = (text: string | null | undefined) => {
    if (!text) return null;
    return text.length > 20 ? text.substring(0, 20) + "..." : text;
  };

  const hasLongNotes = exam.notes && exam.notes.length > 20;

  return (
    <>
      <Card className="p-4 border border-border hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* Subject heading - Bold and prominent */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {exam.subject}
            </h3>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {/* Start Date */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Start Date
              </span>
              <span className="text-foreground font-medium">
                {exam.start_date}
              </span>
            </div>

            {/* End Date */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                End Date
              </span>
              <span className="text-foreground font-medium">
                {exam.end_date}
              </span>
            </div>

            {/* Class */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Class
              </span>
              <span className="text-foreground font-medium">{className}</span>
            </div>

            {/* Duration */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </span>
              <span className="text-foreground font-medium">
                {exam.duration_minutes ? `${exam.duration_minutes} min` : "—"}
              </span>
            </div>

            {/* Teacher */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teacher
              </span>
              <span className="text-foreground font-medium">{teacherName}</span>
            </div>

            {/* Paper Given Date */}
            {exam.paper_given_date && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Paper Given
                </span>
                <span className="text-foreground font-medium">
                  {exam.paper_given_date}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {exam.notes && (
            <div className="border-t border-border pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Notes
              </span>
              {hasLongNotes ? (
                <button
                  onClick={() => setShowNotesModal(true)}
                  className="text-primary hover:underline cursor-pointer text-sm break-words"
                >
                  {truncateNotes(exam.notes)}
                </button>
              ) : (
                <p className="text-sm text-foreground break-words">
                  {exam.notes}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(exam)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(exam.id)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <NotesDetailModal
        open={showNotesModal}
        onOpenChange={setShowNotesModal}
        title={exam.subject}
        notes={exam.notes}
      />
    </>
  );
}

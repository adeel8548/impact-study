"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { updateAttendanceRemarks } from "@/lib/actions/attendance";

interface LeaveReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  table: "student_attendance" | "teacher_attendance";
  type: "student" | "teacher"; // Type of person on leave
  name: string; // Student or teacher name
  date: string; // Date of leave (YYYY-MM-DD)
  currentReason?: string; // Existing reason
  canEdit?: boolean; // Whether user can edit (admin, teacher marking own leave, teacher marking student)
  onReasonSaved?: (recordId: string, reason: string) => void; // Callback when reason is saved (for temporary records)
}

export function LeaveReasonModal({
  open,
  onOpenChange,
  recordId,
  table,
  type,
  name,
  date,
  currentReason,
  canEdit = true,
  onReasonSaved,
}: LeaveReasonModalProps) {
  const [reason, setReason] = useState(currentReason || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setReason(currentReason || "");
  }, [currentReason, open]);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a leave reason");
      return;
    }

    try {
      setIsLoading(true);

      // If recordId starts with "temp-", it's a temporary record not yet saved to DB
      // Just call the callback to store in component state
      if (recordId.startsWith("temp-")) {
        if (onReasonSaved) {
          onReasonSaved(recordId, reason);
        }
        toast.success("Leave reason saved");
      } else {
        // Otherwise update the record in database
        const result = await updateAttendanceRemarks(recordId, table, reason);

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Leave reason saved successfully");
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save leave reason");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-blue-600">🏥</span> Leave Reason
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Leave Details */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">{name}</span>
                <span className="text-xs text-muted-foreground">
                  ({type === "student" ? "Student" : "Teacher"})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{formatDate(date)}</span>
              </div>
            </div>
          </Card>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Leave Reason
              <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Enter the reason for leave (e.g., medical appointment, family emergency, personal work, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canEdit}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/200 characters
            </p>
          </div>

          {!canEdit && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
              You can only view this leave reason. Contact admin or teacher to edit.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Saving..." : "Save Reason"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

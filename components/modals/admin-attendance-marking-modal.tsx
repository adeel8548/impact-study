"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface AdminAttendanceMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "teacher" | "student"; // Whether marking for teacher or student
  targetId: string; // teacher_id or student_id
  targetName: string; // name of teacher or student
  onMarked?: (date: string, status: "present" | "absent" | "leave") => void;
}

export function AdminAttendanceMarkingModal({
  open,
  onOpenChange,
  type,
  targetId,
  targetName,
  onMarked,
}: AdminAttendanceMarkingModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  // Date picker allows any date (past, present, or future)
  // Admins can mark attendance for any previous day for both teachers and students
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStatus, setSelectedStatus] = useState<
    "present" | "absent" | "leave"
  >("present");

  const handleMark = async () => {
    if (!selectedDate || !selectedStatus) {
      toast.error("Please select a date and status");
      return;
    }

    try {
      setIsSaving(true);

      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      let response: Response | null = null;

      if (type === "teacher") {
        // Mark teacher attendance using POST (upsert)
        const payload = {
          teacher_id: targetId,
          date: selectedDate,
          status: selectedStatus,
          school_id: user.school_id,
        };

        response = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (type === "student") {
        // Mark student attendance using upsert approach
        // For student attendance, we need to be careful about how we handle marking
        // We'll use the POST endpoint which supports batch operations
        const payload = {
          student_id: targetId,
          date: selectedDate,
          status: selectedStatus,
          school_id: user.school_id,
          // Note: class_id might be required by the API
          // For now, we'll send just these fields and let the API handle it
        };

        response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: [payload] }),
        });
      }

      if (!response || !response.ok) {
        const errorBody = await response?.json();
        throw new Error(
          errorBody?.error || "Failed to mark attendance"
        );
      }

      toast.success(
        `${targetName}'s attendance marked as ${selectedStatus} for ${selectedDate}`
      );
      onMarked?.(selectedDate, selectedStatus);
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mark attendance"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            For {type === "teacher" ? "Teacher" : "Student"}: {targetName}
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Mark attendance for any previous day
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Date</label>
              <span className="text-xs text-muted-foreground">Select any date to mark attendance</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground flex-1"
              />
            </div>
          </div>

          {/* Status Radio Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <div className="space-y-2">
              {(
                ["present", "absent", "leave"] as const
              ).map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={selectedStatus === status}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as typeof status)
                    }
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        status === "present"
                          ? "bg-green-500"
                          : status === "absent"
                          ? "bg-red-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-foreground capitalize">
                      {status}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
            <p className="text-sm text-foreground">
              <strong>Summary:</strong> Mark {targetName} as{" "}
              <strong className="capitalize">{selectedStatus}</strong> on{" "}
              <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
            </p>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMark}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking...
                </span>
              ) : (
                "Mark Attendance"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

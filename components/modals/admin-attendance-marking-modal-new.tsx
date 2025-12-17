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
import { LateReasonModal } from "@/components/modals/late-reason-modal";
import { LeaveReasonModal } from "@/components/modals/leave-reason-modal";

interface AdminAttendanceMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "teacher" | "student";
  targetId: string;
  targetName: string;
  onMarked?: (date: string, status: "present" | "absent" | "leave" | "late") => void;
}

export function AdminAttendanceMarkingModal({
  open,
  onOpenChange,
  type,
  targetId,
  targetName,
  onMarked,
}: AdminAttendanceMarkingModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStatus, setSelectedStatus] = useState<"present" | "absent" | "leave" | "late" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [leaveReasonModalOpen, setLeaveReasonModalOpen] = useState(false);
  const [lateReasonModalOpen, setLateReasonModalOpen] = useState(false);

  // Handle status selection
  const handleStatusSelect = async (status: "present" | "absent" | "leave" | "late") => {
    setSelectedStatus(status);

    // If Present or Absent, submit directly
    if (status === "present" || status === "absent") {
      await submitMark(status);
    }
    // If Leave, open leave reason modal
    else if (status === "leave") {
      setLeaveReasonModalOpen(true);
    }
    // If Late, open late reason modal
    else if (status === "late") {
      setLateReasonModalOpen(true);
    }
  };

  const submitMark = async (status: "present" | "absent" | "leave", remarks?: string) => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      setIsSaving(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      let response: Response | null = null;

      if (type === "teacher") {
        const payload: any = {
          teacher_id: targetId,
          date: selectedDate,
          status,
          school_id: user.school_id,
        };
        if (remarks) payload.remarks = remarks;

        response = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const payload: any = {
          student_id: targetId,
          date: selectedDate,
          status,
          school_id: user.school_id,
        };
        if (remarks) payload.remarks = remarks;

        response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response?.ok) throw new Error("Failed to mark attendance");

      toast.success("Attendance marked");
      onMarked?.(selectedDate, status);
      setSelectedStatus(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveReasonSubmit = async (recordId: string, reason: string) => {
    try {
      // Mark as leave first
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      
      const payload: any = {
        date: selectedDate,
        status: "leave",
        remarks: reason,
        school_id: user.school_id,
      };

      if (type === "teacher") {
        payload.teacher_id = targetId;
      } else {
        payload.student_id = targetId;
      }

      await submitMark("leave", reason);

      toast.success("Leave attendance recorded");
      setLeaveReasonModalOpen(false);
      setSelectedStatus(null);
    } catch (error) {
      console.error("Error saving leave reason:", error);
      toast.error("Failed to save leave reason");
    }
  };

  const handleLateReasonSubmit = async (reason: string) => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      setIsSaving(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      // Mark as late with reason
      const payload: any = {
        date: selectedDate,
        status: "late",
        school_id: user.school_id,
      };

      if (type === "teacher") {
        payload.teacher_id = targetId;
      } else {
        payload.student_id = targetId;
      }

      const markResponse = await fetch(
        type === "teacher" ? "/api/teacher-attendance" : "/api/attendance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!markResponse?.ok) throw new Error("Failed to mark attendance");

      const markData = await markResponse.json();
      const attendanceId = markData.id || markData.attendance?.[0]?.id;

      // Save the reason
      if (attendanceId) {
        await fetch("/api/late-reason", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: attendanceId,
            table: type === "student" ? "student_attendance" : "teacher_attendance",
            reason,
          }),
        });
      }

      toast.success("Late attendance recorded with reason");
      onMarked?.(selectedDate, "late");
      setSelectedStatus(null);
      setLateReasonModalOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking late attendance:", error);
      toast.error("Failed to mark late attendance");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
                <label className="text-sm font-medium text-foreground">
                  Date
                </label>
                <span className="text-xs text-muted-foreground">
                  Select any date to mark attendance
                </span>
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

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedStatus === "present" ? "default" : "outline"}
                  onClick={() => handleStatusSelect("present")}
                  disabled={isSaving}
                  className={selectedStatus === "present" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  ✓ Present
                </Button>
                <Button
                  variant={selectedStatus === "absent" ? "default" : "outline"}
                  onClick={() => handleStatusSelect("absent")}
                  disabled={isSaving}
                  className={selectedStatus === "absent" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                >
                  ✗ Absent
                </Button>
                <Button
                  variant={selectedStatus === "leave" ? "default" : "outline"}
                  onClick={() => handleStatusSelect("leave")}
                  disabled={isSaving}
                  className={selectedStatus === "leave" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                >
                  🏥 Leave
                </Button>
                <Button
                  variant={selectedStatus === "late" ? "default" : "outline"}
                  onClick={() => handleStatusSelect("late")}
                  disabled={isSaving}
                  className={selectedStatus === "late" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
                >
                  ⏰ Late
                </Button>
              </div>
            </div>

            {/* Selected Status Display */}
            {selectedStatus && (selectedStatus === "present" || selectedStatus === "absent") && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
                <p className="text-sm text-foreground">
                  <strong>Selected:</strong> {targetName} will be marked as{" "}
                  <strong className="capitalize text-blue-600 dark:text-blue-400">
                    {selectedStatus}
                  </strong>{" "}
                  on <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
                </p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStatus(null);
                  onOpenChange(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Reason Modal */}
      {selectedStatus === "leave" && (
        <LeaveReasonModal
          open={leaveReasonModalOpen}
          onOpenChange={(open) => {
            setLeaveReasonModalOpen(open);
            if (!open) setSelectedStatus(null);
          }}
          recordId=""
          table={type === "student" ? "student_attendance" : "teacher_attendance"}
          type={type}
          name={targetName}
          date={selectedDate}
          canEdit={true}
          onReasonSaved={handleLeaveReasonSubmit}
        />
      )}

      {/* Late Reason Modal */}
      {selectedStatus === "late" && (
        <LateReasonModal
          open={lateReasonModalOpen}
          onOpenChange={(open) => {
            setLateReasonModalOpen(open);
            if (!open) setSelectedStatus(null);
          }}
          teacherName={targetName}
          attendanceDate={selectedDate}
          isAdmin={true}
          onConfirm={handleLateReasonSubmit}
        />
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LateReasonModal } from "@/components/modals/late-reason-modal";
import { isAttendanceLate } from "@/lib/utils";
import { updateLateReason } from "@/lib/actions/attendance";

interface AdminAttendanceMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "teacher" | "student"; // Whether marking for teacher or student
  targetId: string; // teacher_id or student_id
  targetName: string; // name of teacher or student
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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lateReasonModalOpen, setLateReasonModalOpen] = useState(false);
  const [pendingAttendanceId, setPendingAttendanceId] = useState<string | null>(null);
  const [teacherExpectedTime, setTeacherExpectedTime] = useState<string | null>(null);
  const [isCheckingLate, setIsCheckingLate] = useState(false);

  // Fetch teacher's expected time if this is a teacher
  useEffect(() => {
    if (type === "teacher" && open) {
      const fetchExpectedTime = async () => {
        try {
          const res = await fetch(`/api/teachers/${targetId}`);
          if (res.ok) {
            const data = await res.json();
            setTeacherExpectedTime(data.expected_time || null);
          }
        } catch (error) {
          console.error("Error fetching teacher expected time:", error);
        }
      };
      fetchExpectedTime();
    }
  }, [type, targetId, open]);

  const shouldShowLateReasonModal = (): boolean => {
    if (type !== "teacher" || selectedStatus !== "present" || !teacherExpectedTime) {
      return false;
    }
    return isAttendanceLate(new Date(), teacherExpectedTime, selectedDate);
  };

  const handleMark = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      setIsSaving(true);
      setIsCheckingLate(true);

      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      // Auto-determine status based on current time
      let finalStatus: "present" | "late" = "present";
      if (type === "teacher" && teacherExpectedTime) {
        const isLate = isAttendanceLate(new Date(), teacherExpectedTime, selectedDate);
        finalStatus = isLate ? "late" : "present";
      }

      let response: Response | null = null;
      let attendanceId: string | null = null;

      if (type === "teacher") {
        // Mark teacher attendance using POST (upsert)
        const payload = {
          teacher_id: targetId,
          date: selectedDate,
          status: finalStatus,
          school_id: user.school_id,
        };

        response = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response?.ok) {
          const responseData = await response.json();
          attendanceId = responseData.id || responseData.attendance?.[0]?.id;
        }
      } else if (type === "student") {
        // For students, default to present unless late detection is enabled
        const payload = {
          student_id: targetId,
          date: selectedDate,
          status: finalStatus,
          school_id: user.school_id,
        };

        response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: [payload] }),
        });

        if (response?.ok) {
          const responseData = await response.json();
          attendanceId = responseData.attendance?.[0]?.id;
        }
      }

      if (!response || !response.ok) {
        const errorBody = await response?.json();
        throw new Error(errorBody?.error || "Failed to mark attendance");
      }

      // If marked as late, show the late reason modal
      if (finalStatus === "late" && attendanceId) {
        setPendingAttendanceId(attendanceId);
        setLateReasonModalOpen(true);
        setIsSaving(false);
        return;
      }

      toast.success(
        `${targetName}'s attendance marked as ${finalStatus} for ${selectedDate}`,
      );
      onMarked?.(selectedDate, finalStatus);
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mark attendance",
      );
    } finally {
      setIsCheckingLate(false);
      setIsSaving(false);
    }
  };

  const handleLateReasonSubmit = async (reason: string) => {
    if (!pendingAttendanceId) return;

    try {
      const { error } = await updateLateReason(pendingAttendanceId, reason);
      if (error) {
        toast.error(error);
        return;
      }

      toast.success(
        `${targetName}'s attendance marked as late with reason recorded`,
      );
      onMarked?.(selectedDate, "late");
      onOpenChange(false);
      setLateReasonModalOpen(false);
      setPendingAttendanceId(null);
    } catch (error) {
      console.error("Error updating late reason:", error);
      toast.error("Failed to save late reason");
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

            {/* Time Status Info - Auto-determined based on current time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Attendance Status
              </label>
              <div className="p-4 rounded-lg bg-linear-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {teacherExpectedTime ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-2">
                            Expected Time: <strong>{teacherExpectedTime}</strong>
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">
                            Current Time: <strong>{new Date().toLocaleTimeString()}</strong>
                          </p>
                          {isAttendanceLate(new Date(), teacherExpectedTime, selectedDate) ? (
                            <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                ⏱ Late (more than 15 minutes after expected time)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded">
                              <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                                ✓ On Time (within 15 minutes)
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Loading expected time...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Status will be automatically determined based on current time when you mark attendance.
              </p>
            </div>

            {/* Late Warning */}
            {isAttendanceLate(new Date(), teacherExpectedTime || "", selectedDate) && (
              <Card className="p-3 bg-orange-50 dark:bg-orange-950 border-l-4 border-l-orange-500">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      Late Attendance Will Be Recorded
                    </p>
                    <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                      Current time is more than 15 minutes after the expected time. After clicking "Mark Attendance", you'll be asked to provide a reason.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Summary */}
            <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
              <p className="text-sm text-foreground">
                <strong>Summary:</strong> Mark {targetName} as{" "}
                <strong className={
                  isAttendanceLate(new Date(), teacherExpectedTime || "", selectedDate)
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-600 dark:text-green-400"
                }>
                  {isAttendanceLate(new Date(), teacherExpectedTime || "", selectedDate) ? "Late" : "Present"}
                </strong>{" "}
                on <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
              </p>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isCheckingLate}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMark}
                disabled={isSaving || isCheckingLate}
                className={
                  teacherExpectedTime && isAttendanceLate(new Date(), teacherExpectedTime, selectedDate)
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }
              >
                {isSaving || isCheckingLate ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isCheckingLate ? "Checking..." : "Marking..."}
                  </span>
                ) : (
                  "Mark Attendance"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Late Reason Modal */}
      <LateReasonModal
        open={lateReasonModalOpen}
        onOpenChange={setLateReasonModalOpen}
        teacherName={targetName}
        attendanceDate={selectedDate}
        isAdmin={true}
        onConfirm={handleLateReasonSubmit}
      />
    </>
  );
}

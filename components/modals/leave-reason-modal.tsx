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
  approvedBy?: string; // Admin ID who approved/rejected (if set, reason is locked for teachers)
  approvalStatus?: "approved" | "rejected"; // Current approval status
  onReasonSaved?: (recordId: string, reason: string) => void; // Callback when reason is saved (for temporary records)
  onApprovalStatusChanged?: (
    recordId: string,
    status: "approved" | "rejected",
  ) => void; // Callback when approval status changes
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
  approvedBy,
  approvalStatus,
  onReasonSaved,
  onApprovalStatusChanged,
}: LeaveReasonModalProps) {
  const [reason, setReason] = useState(currentReason || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [isEditingReason, setIsEditingReason] = useState(false);

  useEffect(() => {
    setReason(currentReason || "");
    setIsEditingReason(false);
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

  const isAdmin =
    typeof window !== "undefined" &&
    JSON.parse(localStorage.getItem("currentUser") || "{}")?.role === "admin";

  // Determine if textarea should be disabled
  // Teachers cannot edit after approval/rejection (approvedBy is set)
  // Admins can always edit if they click "Edit Reason"
  const isReasonLocked = approvedBy && !isAdmin;
  const isTextareaDisabled =
    !canEdit || isReasonLocked || (isAdmin && !isEditingReason);

  const handleApprove = async () => {
    if (!recordId) return;
    try {
      setIsProcessingApproval(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      // Mark approval and lock the reason (store approval_status and approved_by/at)
      const res = await fetch("/api/teacher-attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          reason_locked: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to approve leave");

      toast.success("Leave approved");
      onOpenChange(false);
      if (onApprovalStatusChanged) {
        onApprovalStatusChanged(recordId, "approved");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve leave");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!recordId) return;
    try {
      setIsProcessingApproval(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      // Mark rejection: keep status as 'leave' but set approval_status to 'rejected'
      // This allows the record to remain visible as a rejected leave while
      // allowing counts to treat it as absent when needed.
      const res = await fetch("/api/teacher-attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          approval_status: "rejected",
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          reason_locked: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject leave");

      toast.success("Leave rejected");
      onOpenChange(false);
      if (onApprovalStatusChanged) {
        onApprovalStatusChanged(recordId, "rejected");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject leave");
    } finally {
      setIsProcessingApproval(false);
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
              disabled={isTextareaDisabled}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/200 characters
            </p>
          </div>

          {!canEdit && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
              You can only view this leave reason. Contact admin or teacher to
              edit.
            </p>
          )}

          {isReasonLocked && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
              ✓ This leave has been{" "}
              {approvalStatus === "approved" ? "approved" : "rejected"}. You
              cannot edit the reason anymore.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={() => {
              if (isEditingReason) {
                setIsEditingReason(false);
                setReason(currentReason || "");
              } else {
                onOpenChange(false);
              }
            }}
            disabled={isLoading || isProcessingApproval}
          >
            {isEditingReason ? "Cancel" : "Close"}
          </Button>

          {/* Edit button for admin when not in edit mode and has teacher attendance */}
          {isAdmin && table === "teacher_attendance" && !isEditingReason && (
            <Button variant="outline" onClick={() => setIsEditingReason(true)}>
              ✏️ Edit Reason
            </Button>
          )}

          {/* Save button when editing reason */}
          {isEditingReason && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          )}

          {/* Reject button for teacher attendance when NOT editing reason */}
          {isAdmin && table === "teacher_attendance" && !isEditingReason && (
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessingApproval}
            >
              {isProcessingApproval ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                "Reject"
              )}
            </Button>
          )}

          {/* Approve button for teacher attendance when NOT editing reason */}
          {isAdmin && table === "teacher_attendance" && !isEditingReason && (
            <Button
              onClick={handleApprove}
              disabled={isProcessingApproval}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingApproval ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                "Approve"
              )}
            </Button>
          )}

          {/* Save button for non-admin canEdit users */}
          {canEdit && !isAdmin && !isEditingReason && !isReasonLocked && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

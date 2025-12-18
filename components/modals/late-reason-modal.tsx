"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LateReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherName: string;
  attendanceDate: string;
  isAdmin?: boolean;
  currentReason?: string;
  readOnly?: boolean;
  forceClose?: boolean; // If true, prevent closing without proper reason (teacher side)
  onConfirm: (reason: string) => Promise<void>;
  requireReason?: boolean;
}

export function LateReasonModal({
  open,
  onOpenChange,
  teacherName,
  attendanceDate,
  isAdmin = false,
  currentReason = "",
  readOnly = false,
  forceClose = false,
  onConfirm,
  requireReason,
}: LateReasonModalProps) {
  const [reason, setReason] = useState(currentReason);
  const [isSaving, setIsSaving] = useState(false);

  // Minimum characters required for teacher (not for admin)
  const MIN_CHARS = forceClose ? 10 : 0;
  const canClose = !forceClose || reason.length >= MIN_CHARS;
  const shouldRequireReason = requireReason ?? true;
  const canSubmit = shouldRequireReason
    ? reason.trim().length >= MIN_CHARS
    : reason.length >= MIN_CHARS;

  // Update reason when currentReason changes or modal opens
  useEffect(() => {
    if (open) {
      setReason(currentReason || "");
    }
  }, [open, currentReason]);

  const handleSubmit = async () => {
    if (!canSubmit && shouldRequireReason) {
      toast.error(`Please provide at least ${MIN_CHARS} characters for the reason`);
      return;
    }

    try {
      setIsSaving(true);
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
      toast.success("Late attendance recorded with reason");
    } catch (error) {
      console.error("Error submitting late reason:", error);
      toast.error("Failed to save late reason");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing if forceClose is true and not enough characters
    if (forceClose && newOpen === false && reason.length < MIN_CHARS) {
      toast.error(`Please provide at least ${MIN_CHARS} characters for the reason before closing`);
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {currentReason ? "View/Edit Late Reason" : "Late Attendance Recorded"}
          </DialogTitle>
          <DialogDescription>
            {currentReason ? (
              <>
                {isAdmin ? `${teacherName}'s` : "Your"} late attendance reason for {attendanceDate}.
                You can view or update the reason below.
              </>
            ) : isAdmin ? (
              <>
                {teacherName}'s attendance on {attendanceDate} was marked more than 15
                minutes after the expected time. Please provide a reason for this late marking.
              </>
            ) : (
              <>
                Your attendance on {attendanceDate} was marked late (more than 15 minutes
                after expected time). Please provide a reason for your late attendance.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Late Attendance *</Label>
            <Textarea
              id="reason"
              placeholder={readOnly ? "No reason provided" : "Explain why the attendance was marked late..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSaving || readOnly}
              className="min-h-[120px] resize-none"
              readOnly={readOnly}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {reason.length > 0 && `${reason.length} characters`}
              </p>
              {forceClose && (
                <p className={`text-xs font-semibold ${reason.length >= MIN_CHARS ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {reason.length < MIN_CHARS ? `Minimum ${MIN_CHARS} characters required` : "✓ Ready to submit"}
                </p>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Note:</strong> Late attendance (marked after 15 minutes of expected
                time) will be recorded as "Present - Late"{shouldRequireReason ? " with the reason you provide." : "."}
                {!shouldRequireReason && " You can close the dialog without entering a reason."}
                {forceClose && !isAdmin && <> You must provide at least {MIN_CHARS} characters before submitting.</>}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving || !canClose}
              className={!canClose ? "opacity-50 cursor-not-allowed" : ""}
              title={!canClose ? `Please add at least ${MIN_CHARS} characters to the reason` : ""}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !canSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : currentReason ? (
                  "Update Reason"
                ) : (
                  "Confirm Late Attendance"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

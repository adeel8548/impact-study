"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateFeeStatus, getStudentFeeStatus } from "@/lib/actions/fees";

interface FeeStatusButtonProps {
  feeId: string;
  studentId: string;
  initialStatus: "paid" | "unpaid";
  onStatusChange?: () => void;
}

export function FeeStatusButton({
  feeId,
  studentId,
  initialStatus,
  onStatusChange,
}: FeeStatusButtonProps) {
  const [status, setStatus] = useState<"paid" | "unpaid">(initialStatus);
  const [loading, setLoading] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isPaidExpired, setIsPaidExpired] = useState(false);

  useEffect(() => {
    checkExpiration();
  }, [feeId]);

  const checkExpiration = async () => {
    const { fee, isPaidExpired: expired } = await getStudentFeeStatus(feeId);

    if (fee) {
      setStatus(fee.status);
      setIsPaidExpired(expired);

      if (fee.status === "paid" && fee.paid_date) {
        const paidDate = new Date(fee.paid_date);
        // Last moment of the paid month
        const lastOfMonth = new Date(
          paidDate.getFullYear(),
          paidDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        const now = new Date();
        const remaining = Math.ceil(
          (lastOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        setDaysRemaining(Math.max(0, remaining));
      }
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = status === "paid" ? "unpaid" : "paid";
      const now = new Date().toISOString();

      // Use API endpoint to update fee status
      const response = await fetch(`/api/fees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: feeId,
          status: newStatus,
          paid_date: newStatus === "paid" ? now : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update fee status");
        return;
      }

      setStatus(newStatus);
      if (newStatus === "paid") {
        setDaysRemaining(30);
        setIsPaidExpired(false);
      } else {
        setDaysRemaining(null);
      }

      toast.success(`Fee marked as ${newStatus}`);
      onStatusChange?.();
    } catch (err) {
      toast.error("Failed to update fee status");
    } finally {
      setLoading(false);
    }
  };

  const isPaidDisabled = status === "paid" && !isPaidExpired;

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant={status === "paid" ? "default" : "outline"}
        onClick={handleToggleStatus}
        disabled={loading || isPaidDisabled}
        className={`gap-2 ${status === "paid" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700 text-white"}`}
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === "paid" ? "Paid" : "Unpaid"}
      </Button>
      {status === "paid" && daysRemaining !== null && daysRemaining > 0 && (
        <span className="text-xs text-muted-foreground text-center">
          {daysRemaining} days remaining
        </span>
      )}
    </div>
  );
}

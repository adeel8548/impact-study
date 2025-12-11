"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Wallet } from "lucide-react";
import { toast } from "sonner";
import { updateFeeStatus, getStudentFeeStatus } from "@/lib/actions/fees";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeeRow = {
  id: string;
  student_id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date?: string | null;
};

interface FeeStatusButtonProps {
  feeId: string;
  studentId: string;
  initialStatus: "paid" | "unpaid";
  initialPaidDate?: string | null;
  onStatusChange?: () => void;
}

export function FeeStatusButton({
  feeId,
  studentId,
  initialStatus,
  initialPaidDate = null,
  onStatusChange,
}: FeeStatusButtonProps) {
  const [status, setStatus] = useState<"paid" | "unpaid">(initialStatus);
  const [loading, setLoading] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isPaidExpired, setIsPaidExpired] = useState(false);
  const hasInitializedRef = useRef(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Initialize once from props to avoid repeated API hits
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    if (initialStatus === "paid" && initialPaidDate) {
      setStatus("paid");
      const paidDate = new Date(initialPaidDate);
      const lastOfMonth = new Date(
        paidDate.getFullYear(),
        paidDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const now = new Date();
      const remaining = Math.ceil(
        (lastOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysRemaining(Math.max(0, remaining));
      setIsPaidExpired(remaining <= 0);
    } else {
      setStatus(initialStatus);
      setDaysRemaining(null);
      setIsPaidExpired(false);
    }
  }, [initialStatus, initialPaidDate]);

  const loadStudentFees = async () => {
    setLoadingFees(true);
    try {
      const res = await fetch(
        `/api/students/fees?studentId=${studentId}&status=unpaid`
      );
      const data = await res.json();
      const fetched: FeeRow[] = Array.isArray(data.fees) ? data.fees : [];
      setFees(fetched);

      // Year defaults to current if available, otherwise latest year from data
      const years = Array.from(
        new Set(fetched.map((f) => Number(f.year)))
      ).sort((a, b) => b - a);
      if (years.length > 0) {
        setSelectedYear((current) =>
          years.includes(current) ? current : Number(years[0])
        );
      }
    } catch (error) {
      console.error("Failed to load student fees", error);
      toast.error("Fees could not be loaded");
    } finally {
      setLoadingFees(false);
    }
  };

  useEffect(() => {
    if (!paymentModalOpen) return;
    loadStudentFees();
  }, [paymentModalOpen]);

  // Update default month whenever year or fees change
  useEffect(() => {
    if (fees.length === 0) {
      setSelectedMonth(null);
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const unpaidForYear = fees.filter(
      (fee) =>
        Number(fee.year) === Number(selectedYear) && fee.status === "unpaid"
    );

    if (unpaidForYear.length === 0) {
      setSelectedMonth(null);
      return;
    }

    const hasCurrentMonth = unpaidForYear.find(
      (fee) => Number(fee.month) === currentMonth
    );
    if (hasCurrentMonth) {
      setSelectedMonth(Number(hasCurrentMonth.month));
      return;
    }

    // Default to the earliest unpaid month for that year
    const earliest = unpaidForYear
      .slice()
      .sort((a, b) => Number(a.month) - Number(b.month))[0];
    setSelectedMonth(Number(earliest.month));
  }, [fees, selectedYear]);

  const unpaidOptions = useMemo(() => {
    return fees
      .filter(
        (fee) =>
          fee.status === "unpaid" && Number(fee.year) === Number(selectedYear)
      )
      .sort((a, b) => Number(a.month) - Number(b.month));
  }, [fees, selectedYear]);

  const selectedFee = useMemo(
    () =>
      unpaidOptions.find(
        (fee) => Number(fee.month) === Number(selectedMonth ?? -1)
      ),
    [unpaidOptions, selectedMonth]
  );

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
          999
        );

        const now = new Date();
        const remaining = Math.ceil(
          (lastOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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

  const handlePaySelectedMonth = async () => {
    if (!selectedFee) {
      toast.error("Please choose a pending month");
      return;
    }

    setPaying(true);
    try {
      const paidDate = new Date().toISOString();
      const response = await fetch("/api/fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFee.id,
          status: "paid",
          paid_date: paidDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update fee status");
        return;
      }

      // Refresh button state
      setStatus("paid");
      setDaysRemaining(30);
      setIsPaidExpired(false);
      onStatusChange?.();
      toast.success("Fee marked as paid");
      setPaymentModalOpen(false);
    } catch (error) {
      console.error("Failed to mark fee as paid:", error);
      toast.error("Could not mark fee as paid");
    } finally {
      setPaying(false);
    }
  };

  const isPaidDisabled = status === "paid" && !isPaidExpired;

  const handleOpen = () => {
    if (status === "unpaid") {
      setPaymentModalOpen(true);
      return;
    }
    handleToggleStatus();
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline" // ya "default" agar paid dikhaana hai
        onClick={() => setPaymentModalOpen(true)} // Always open modal
        disabled={loading} // Remove any other disable logic
        className="gap-2 bg-blue-800 hover:bg-blue-900 text-white"
      >
        pay Now
      </Button>

      {/* {status === "paid" && daysRemaining !== null && daysRemaining > 0 && (
        <span className="text-xs text-muted-foreground text-center">
          {daysRemaining} days remaining
        </span>
      )} */}

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Pay Pending Fees
            </DialogTitle>
            <DialogDescription>
              Select the pending month to mark as paid. Date will be saved as
              today.
            </DialogDescription>
          </DialogHeader>

          {loadingFees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : fees.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              No pending fees found.
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(val) => setSelectedYear(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(fees.map((f) => Number(f.year))))
                        .sort((a, b) => b - a)
                        .map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pending Month</Label>
                  <Select
                    value={selectedMonth ? String(selectedMonth) : ""}
                    onValueChange={(val) => setSelectedMonth(Number(val))}
                    disabled={unpaidOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {unpaidOptions.map((fee) => (
                        <SelectItem key={fee.id} value={String(fee.month)}>
                          {new Date(0, Number(fee.month) - 1).toLocaleString(
                            "en-US",
                            { month: "long" }
                          )}{" "}
                          {fee.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {selectedFee
                      ? `Paying ${new Date(
                          0,
                          Number(selectedFee.month) - 1
                        ).toLocaleString("en-US", { month: "long" })} ${
                          selectedFee.year
                        }`
                      : "Select a pending month"}
                  </span>
                </div>
                {selectedFee && (
                  <div className="text-2xl font-semibold">
                    PKR {Number(selectedFee.amount || 0).toLocaleString()}
                  </div>
                )}
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handlePaySelectedMonth}
                  disabled={!selectedFee || paying}
                  className="gap-2"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Mark Paid"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

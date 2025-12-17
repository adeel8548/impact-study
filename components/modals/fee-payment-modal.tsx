"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import {
  MONTHS,
  getCurrentMonth,
  getCurrentYear,
  formatCurrency,
} from "@/lib/utils";

interface FeePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName?: string;
  studentClassName?: string;
  onPaymentSuccess?: () => void;
}

interface FeeRecord {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date: string | null;
}

export function FeePaymentModal({
  open,
  onOpenChange,
  studentId,
  studentName = "Student",
  studentClassName,
  onPaymentSuccess,
}: FeePaymentModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [fee, setFee] = useState<FeeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Get current and future years
  const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - 2 + i);

  useEffect(() => {
    if (open) {
      // Auto-select current month if all previous months are paid
      checkAllPreviousMonthsPaid();
    }
  }, [open, studentId]);

  useEffect(() => {
    if (open) {
      fetchFee();
    }
  }, [selectedMonth, selectedYear, studentId, open]);

  const checkAllPreviousMonthsPaid = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Check all previous months of current year
      const previousMonths = [];
      for (let m = 1; m < currentMonth; m++) {
        previousMonths.push({
          month: m,
          year: currentYear,
        });
      }

      // Also check last 3 months of previous year
      for (let m = 10; m <= 12; m++) {
        previousMonths.push({
          month: m,
          year: currentYear - 1,
        });
      }

      let allPaid = true;
      for (const { month, year } of previousMonths) {
        const response = await fetch(
          `/api/fees/monthly?studentId=${studentId}&month=${month}&year=${year}`,
        );
        const data = await response.json();

        if (data.success && data.fee && data.fee.status === "unpaid") {
          allPaid = false;
          break;
        }
      }

      // If all previous months are paid, default to current month
      if (allPaid) {
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      }
    } catch (err) {
      console.error("Error checking previous months:", err);
    }
  };

  const fetchFee = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `/api/fees/monthly?studentId=${studentId}&month=${selectedMonth}&year=${selectedYear}`,
      );

      if (!response.ok) throw new Error("Failed to fetch fee");

      const data = await response.json();
      setFee(data.fee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fee");
      setFee(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!fee) return;

    try {
      setPaying(true);
      setError("");

      const response = await fetch("/api/fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fee.id,
          status: "paid",
          paid_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to process payment");

      const data = await response.json();
      setFee(data.fee);
      onPaymentSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const isPaid = fee?.status === "paid";
  const isCurrentMonth =
    selectedMonth === getCurrentMonth() && selectedYear === getCurrentYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fee Payment - {studentName}</DialogTitle>
          <DialogDescription>
            {studentClassName ? (
              <span className="block">Class: {studentClassName}</span>
            ) : null}
            <span>Select a month to view and manage fee payment</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month/Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={String(selectedMonth)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem
                      key={month}
                      value={String(idx + 1)}
                      onClick={() => setSelectedMonth(idx + 1)}
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={String(selectedYear)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={String(year)}
                      onClick={() => setSelectedYear(year)}
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fee Status */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : fee ? (
            <div className="space-y-4 rounded-lg border p-4 bg-slate-50">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge
                  variant={isPaid ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {isPaid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Paid
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Unpaid
                    </>
                  )}
                </Badge>
              </div>

              {/* Amount */}
              {fee.amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Amount</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(fee.amount)}
                  </span>
                </div>
              )}

              {/* Payment Date - Only show for current month if paid */}
              {isPaid && isCurrentMonth && fee.paid_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Paid On</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(fee.paid_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded bg-red-50 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Payment Button - Always Enabled */}
              {!isPaid && (
                <Button
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Mark as Paid"
                  )}
                </Button>
              )}

              {isPaid && (
                <div className="rounded bg-green-50 p-2 text-sm text-green-700 font-medium">
                  ✓ Fee paid
                </div>
              )}
            </div>
          ) : (
            <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
              No fee record for this month
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

interface SalaryPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName?: string;
  onPaymentSuccess?: () => void;
}

interface SalaryRecord {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date: string | null;
}

export function SalaryPaymentModal({
  open,
  onOpenChange,
  teacherId,
  teacherName = "Teacher",
  onPaymentSuccess,
}: SalaryPaymentModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [salary, setSalary] = useState<SalaryRecord | null>(null);
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
  }, [open, teacherId]);

  useEffect(() => {
    if (open) {
      fetchSalary();
    }
  }, [selectedMonth, selectedYear, teacherId, open]);

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
          `/api/salaries/monthly?teacherId=${teacherId}&month=${month}&year=${year}`
        );
        const data = await response.json();

        if (data.success && data.salary && data.salary.status === "unpaid") {
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

  const fetchSalary = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `/api/salaries/monthly?teacherId=${teacherId}&month=${selectedMonth}&year=${selectedYear}`
      );

      if (!response.ok) throw new Error("Failed to fetch salary");

      const data = await response.json();
      setSalary(data.salary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load salary");
      setSalary(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!salary) return;

    try {
      setPaying(true);
      setError("");

      const response = await fetch("/api/salaries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: salary.id,
          status: "paid",
          paid_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to process payment");

      const data = await response.json();
      setSalary(data.salary);
      onPaymentSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const isPaid = salary?.status === "paid";
  const isCurrentMonth =
    selectedMonth === getCurrentMonth() &&
    selectedYear === getCurrentYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salary Payment - {teacherName}</DialogTitle>
          <DialogDescription>
            Select a month to view and manage salary payment
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

          {/* Salary Status */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : salary ? (
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
              {salary.amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Amount</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(salary.amount)}
                  </span>
                </div>
              )}

              {/* Payment Date - Only show for current month if paid */}
              {isPaid && isCurrentMonth && salary.paid_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Paid On</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(salary.paid_date).toLocaleDateString()}
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
                  ✓ Salary paid
                </div>
              )}
            </div>
          ) : (
            <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
              No salary record for this month
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
